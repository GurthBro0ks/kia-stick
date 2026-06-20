# KIA Stick v0.3

Laptop-only fake-doc PWA for testing citation-first governance, source hierarchy, and private-vault review workflow scaffolding.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Validate

```bash
npm run qa
```

This MVP uses only fictional source documents under `content/fake-docs/`. Every fake source starts with:

`FAKE SAMPLE DOCUMENT — NOT REAL CONTRACT LANGUAGE — FOR KIA STICK TESTING ONLY`

`/media/mint/SHARED/APWU` is treated as real-document storage and is intentionally not read, copied, indexed, or scanned by this repo.

## v0.3 Vault Scaffold

The Vault tab uses fake metadata fixtures only. It adds local mock surfaces for:

- Vault lane overview.
- Quarantine.
- Redaction Review.
- Metadata Review.
- Index Eligibility.
- Audit Log.

The scaffold models `selected -> quarantine -> hash/provenance -> redaction detection -> admin review -> approved redacted copy -> metadata -> index decision -> audit` without reading file bytes, inspecting private paths, OCR, uploads, real ingestion, or indexing.

Quarantine, redaction review, and admin review are not index approval. Index eligibility stays an explicit yes/no gate.
