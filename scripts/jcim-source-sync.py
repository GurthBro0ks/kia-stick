#!/usr/bin/env python3
"""One-source, fail-closed JCIM admission into the ignored local public cache."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request

SOURCE_ID = "apwu-usps-jcim-2025"
LANDING = "https://apwu.org/contracts/jcim-2025-joint-contract-intepretation-manual-jcim/"
PDF_URL = "https://apwu.org/wp-content/uploads/2026/03/JCIM-2025-Web_BOOKMARKED_v4.pdf"
SHA256 = "6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7"
BYTE_COUNT = 3111811
LAST_MODIFIED = "Wed, 04 Mar 2026 20:17:59 GMT"
EDITION = "November 2025"
TITLE = "USPS-APWU Joint Contract Interpretation Manual"
PAGES = [("preface", 3, 3), ("introduction", 29, 29), ("article-14", 134, 138), ("article-15", 139, 149),
         ("article-16", 150, 157), ("article-17", 158, 167), ("article-19", 169, 169),
         ("article-25", 177, 178), ("article-27", 182, 183)]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def request(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "KIA-Stick-JCIM-bounded-source-verifier/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.status != 200 or response.url != url:
            raise RuntimeError("JCIM source URL or status drift")
        return response.headers, response.read()

def verify_download():
    _, landing = request(LANDING)
    links = re.findall(rb'(?:href|src)="(https://apwu\.org/[^\"]+\.pdf)"', landing)
    if not links or any(link.decode() != PDF_URL for link in links):
        raise RuntimeError("JCIM landing linked PDF drift")
    headers, pdf = request(PDF_URL)
    if (headers.get("Content-Length") != str(BYTE_COUNT) or
        headers.get("Last-Modified") != LAST_MODIFIED or
        headers.get_content_type() != "application/pdf" or
        len(pdf) != BYTE_COUNT or digest(pdf) != SHA256 or not pdf.startswith(b"%PDF-")):
        raise RuntimeError("JCIM pinned identity drift")
    first = subprocess.run(["pdftotext", "-f", "1", "-l", "1", "-", "-"], input=pdf,
                           capture_output=True, check=True).stdout.decode("utf-8")
    if TITLE not in first or EDITION not in first or "JCIM 2025" not in first:
        raise RuntimeError("JCIM title or edition drift")
    return pdf

def split_units(text, section):
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    lines = [line for line in lines if line and not line.startswith(TITLE) and line != EDITION and
             not re.fullmatch(r"Page\s*\|?\s*\d+", line) and not re.fullmatch(r"Article \d+, page \d+", line)]
    units = []
    current = []
    for line in lines:
        if section.startswith("article-") and re.match(r"^(?:\d+\.\s+|QUESTIONS (?:AND|&) ANSWERS|Article \d+(?:\.\d+|\b))", line) and current:
            units.append(" ".join(current))
            current = []
        current.append(line)
    if current:
        units.append(" ".join(current))
    return [unit for unit in units if unit]

def normalize(pdf):
    sections = []
    with tempfile.NamedTemporaryFile(suffix=".pdf") as temp:
        temp.write(pdf)
        temp.flush()
        for section_id, first, last in PAGES:
            paragraphs = []
            for page in range(first, last + 1):
                extracted = subprocess.run(["pdftotext", "-layout", "-f", str(page), "-l", str(page),
                                            temp.name, "-"], capture_output=True, check=True).stdout.decode("utf-8")
                printed = str(page - 8) if page >= 29 else None
                article = section_id.removeprefix("article-") if section_id.startswith("article-") else None
                if article:
                    printed = f"{article}-{page-first+1}"
                for index, unit in enumerate(split_units(extracted, section_id), 1):
                    qa = re.match(r"^(\d+)\.\s", unit) if "QUESTIONS" in extracted else None
                    paragraphs.append({"id": f"{section_id}-pdf{page}-unit{index}", "text": unit,
                                       "pdfPageNumber": page, "printedPageLabel": printed,
                                       "articleNumber": article, "qaId": qa.group(1) if qa else None,
                                       "heading": unit[:100] if len(unit) < 100 else None})
            sections.append({"id": section_id, "title": section_id.replace("-", " ").title(), "paragraphs": paragraphs})
    encoded = json.dumps(sections, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return {"schema": "kia-jcim-cache.v1", "source": {"id": SOURCE_ID, "title": TITLE,
             "authorityClass": "joint_national_interpretation", "authorityLabel": "Joint interpretation (JCIM)",
             "landingUrl": LANDING, "pdfUrl": PDF_URL, "edition": EDITION, "readOnly": True},
             "response": {"sha256": SHA256, "byteCount": BYTE_COUNT, "lastModified": LAST_MODIFIED},
             "normalized": {"sha256": digest(encoded), "sectionCount": len(sections), "sections": sections}}

def main():
    repo = Path(__file__).resolve().parent.parent
    directory = repo / ".kia-public-data"
    pdf_path = directory / f"{SOURCE_ID}.pdf"
    json_path = directory / f"{SOURCE_ID}.json"
    if directory.is_symlink() or (directory.exists() and directory.stat().st_mode & 0o077):
        raise RuntimeError("unsafe cache directory")
    if pdf_path.exists() or json_path.exists():
        raise RuntimeError("JCIM cache exists; operator review required before replacement")
    pdf = verify_download()
    cache = normalize(pdf)
    directory.mkdir(mode=0o700, exist_ok=True)
    for target, data in ((pdf_path, pdf), (json_path, (json.dumps(cache, ensure_ascii=False, sort_keys=True, indent=2)+"\n").encode())):
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
    print(f"{SOURCE_ID} admitted locally: {SHA256}, {cache['normalized']['sha256']}, 9 sections")

if __name__ == "__main__":
    main()
