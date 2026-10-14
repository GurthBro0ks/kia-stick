import { createHash } from "node:crypto";
import { createJcimLiveIdentityFetcher } from "@/tests/fixtures/jcimLiveIdentityFixture";
import path from "node:path";
import { realPublicDataAvailable, realPublicDataDirectory, realPublicDataMissingPrerequisite, realPublicDataSuppliedButUnusable, realPublicDataRequiredFiles } from "@/tests/fixtures/realPublicDataPrerequisite";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { lstatSync, readFileSync } from "node:fs";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import { CBA_SOURCE_ID, type CbaSourceCache } from "@/lib/cbaSource";
import { verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { enrichCbaAnswerWithJcim } from "@/lib/jcimAnswer";
import { buildPublicStewardPacket, publicStewardPacketExportEligibility, publicStewardPacketToMarkdown, publicStewardPacketToText } from "@/lib/publicStewardPacket";
import { createSavedStewardPacketRecord, migrateSavedAnswers } from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SourcesPanel, PublicStewardPacketView, SavedAnswersPanel } from "@/components/KiaStickApp";
import {
  JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL, JCIM_BYTES, JCIM_EDITION, JCIM_LANDING_URL,
  JCIM_LAST_MODIFIED, JCIM_PDF_URL, JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, JCIM_TITLE,
  jcimCitation, jcimPacketSourceVerifier, jcimTopicCitation, verifyJcimCitation, type JcimCache,
} from "@/lib/jcimSource";
import { readJcimCache, validateJcimCache, verifyJcimLiveIdentity } from "@/lib/jcimSourceServer";

if (realPublicDataSuppliedButUnusable) {
  it("opt-in prerequisite: KIA_REAL_PUBLIC_DATA_DIR supplied but unusable", () => {
    throw new Error(realPublicDataMissingPrerequisite);
  });
}

if (!realPublicDataDirectory) console.info(`NOT_RUN: JCIM/CBA real-cache integration: ${realPublicDataMissingPrerequisite}`);

let cache: JcimCache;
let pdf: Buffer<ArrayBuffer>;
const cba = createCbaSourceFixtureCache();
let realCba: CbaSourceCache;
const version = createRuntimeVersion({ buildDate: "20261003", gitSha: "jcimqa01" });

describe.runIf(realPublicDataAvailable)("JCIM/CBA real-cache integration (opt-in; requires KIA_REAL_PUBLIC_DATA_DIR)", () => {
  function assertSafePermissions() {
    const uid = process.getuid?.();
    if (uid === undefined) throw new Error("Cannot verify supplied cache ownership: current uid unavailable");
    for (const [target, mode, directory] of [
      [realPublicDataDirectory!, 0o700, true],
      ...realPublicDataRequiredFiles.map((name) => [path.join(realPublicDataDirectory!, name), 0o600, false] as const),
    ] as const) {
      const stat = lstatSync(target);
      if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) ||
          (stat.mode & 0o7777) !== mode || stat.uid !== uid) {
        throw new Error(`Unsafe supplied cache: ${target} must be a ${directory ? "directory" : "regular file"} with mode ${mode.toString(8)} owned by current uid ${uid}; symlinks are forbidden`);
      }
    }
  }

  it("supplied cache has safe permissions (dir 0700, files 0600, owned by current uid)", assertSafePermissions);

  beforeAll(() => {
    assertSafePermissions();
    cache = JSON.parse(readFileSync(path.join(realPublicDataDirectory!, `${JCIM_SOURCE_ID}.json`), "utf8")) as JcimCache;
    pdf = readFileSync(path.join(realPublicDataDirectory!, `${JCIM_SOURCE_ID}.pdf`));
    realCba = JSON.parse(readFileSync(path.join(realPublicDataDirectory!, `${CBA_SOURCE_ID}.json`), "utf8")) as CbaSourceCache;
  });
describe("PDF byte guards on real bytes", () => {
  const realSha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  beforeAll(() => {
    expect(pdf.length).toBe(JCIM_BYTES);
    expect(realSha256(pdf)).toBe(JCIM_SHA256);
    // Establish that every structural and normalized guard passes unchanged.
    expect(validateJcimCache(cache, pdf)).toBe(true);
  });
  it("[real-bytes VALIDATE+LIVE hash guard, one-byte tamper] rejects exactly one flipped byte locally and live", async () => {
    const tampered = Buffer.from(pdf);
    tampered[0] ^= 1;
    expect(tampered.length).toBe(JCIM_BYTES);
    expect(tampered.reduce((count, byte, index) => count + Number(byte !== pdf[index]), 0)).toBe(1);
    expect(realSha256(tampered)).not.toBe(JCIM_SHA256);
    expect(validateJcimCache(cache, pdf)).toBe(true);
    expect(validateJcimCache(cache, tampered)).toBe(false);
    expect(await verifyJcimLiveIdentity(createJcimLiveIdentityFetcher(pdf).fetcher)).toBe(true);
    expect(await verifyJcimLiveIdentity(createJcimLiveIdentityFetcher(tampered).fetcher)).toBe(false);
  });
  it("[real-bytes VALIDATE hash guard] rejects reversed content at the pinned length", () => {
    const reversed = Buffer.from(pdf).reverse();
    expect(reversed.length).toBe(JCIM_BYTES);
    expect(reversed.equals(pdf)).toBe(false);
    expect(realSha256(reversed)).not.toBe(JCIM_SHA256);
    expect(validateJcimCache(cache, reversed)).toBe(false);
  });
  it("[real-bytes appended byte: VALIDATE rejects at hash guard, LIVE at length guard; length not isolated]", async () => {
    const extended = Buffer.concat([pdf, Buffer.from([0])]);
    expect(extended.length).toBe(JCIM_BYTES + 1);
    expect(extended.subarray(0, JCIM_BYTES).equals(pdf)).toBe(true);
    expect(realSha256(extended)).not.toBe(JCIM_SHA256);
    // Local hash-first validation rejects before length; the supplementary
    // mocked-hash tests isolate length guards. Live short-circuits at length,
    // but its hash would also reject, so this does not isolate live length.
    expect(validateJcimCache(cache, extended)).toBe(false);
    expect(await verifyJcimLiveIdentity(createJcimLiveIdentityFetcher(extended).fetcher)).toBe(false);
  });
});

function routeWithRealCaches(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research",
    scope: "Official-Like", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null,
    cbaSource: realCba, jcimSource: cache, runtimeVersion: version }) };
}

describe("Article 19 real-cache Chat routing regression", () => {
  it.each([
    "What does Article 19 let KIA Stick tell me about USPS handbooks and manuals?",
    "What does Article 19 say about handbooks and manuals?",
  ])("keeps verified CBA first and bounded JCIM second for %s", (question) => {
    const { snapshot, answer } = routeWithRealCaches(question);
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations.map((citation) => citation.publicSourceType)).toEqual([
      "cba_contract", "cba_contract", "jcim_joint_interpretation",
    ]);
    expect(answer.citations.slice(0, 2).map((citation) => citation.paragraphId)).toEqual([
      "cba-pdf-p127-p05", "cba-pdf-p127-p06",
    ]);
    for (const citation of answer.citations.slice(0, 2)) {
      expect(citation.citationVerificationState).toBe("verified_current");
      expect(verifyCbaCitation(citation, realCba).state).toBe("verified_current");
    }
    const jcim = answer.citations[2];
    expect(jcim.sourceId).toBe(JCIM_SOURCE_ID);
    expect(jcim.articleNumber).toBe("19");
    expect(jcim.status).toContain(JCIM_AUTHORITY_LABEL);
    expect(verifyJcimCitation(jcim, cache)).toBe("verified_current");
    expect(answer.citations.some((citation) => citation.paragraphId === "cba-pdf-p127-p01")).toBe(false);
    expect(answer.shortAnswer).toContain("does not supply the underlying handbook rule");
    expect(answer.shortAnswer).not.toMatch(/ELM\s+\d|Step\s+4\s+(?:says|provides)/i);
  });

  it.each([
    ["What does the JCIM say in Article 18?", []],
    ["What do the contract and JCIM say about just cause and discipline?", ["16"]],
    ["What do the contract and JCIM say about steward representation and grievance handling?", ["15", "17"]],
  ])("preserves the bounded route for %s", (question, expectedArticles) => {
    const { answer } = routeWithRealCaches(question);
    const jcimCitations = answer.citations.filter((citation) => citation.sourceId === JCIM_SOURCE_ID);
    expect(jcimCitations.map((citation) => citation.articleNumber)).toEqual(expect.arrayContaining(expectedArticles));
    expect(jcimCitations.every((citation) => citation.articleNumber !== "18")).toBe(true);
    if (expectedArticles.length) {
      expect(answer.noAnswer).toBe(false);
      expect(answer.citations[0].publicSourceType).toBe("cba_contract");
    }
  });
});

describe("bounded JCIM 2025 admission", () => {
  it("pins exact public source identity and six authorized sections", () => {
    expect([JCIM_SOURCE_ID, JCIM_LANDING_URL, JCIM_PDF_URL, JCIM_SHA256, JCIM_BYTES, JCIM_LAST_MODIFIED,
      JCIM_EDITION, JCIM_TITLE, JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL]).toEqual([
      "apwu-usps-jcim-2025", "https://apwu.org/contracts/jcim-2025-joint-contract-intepretation-manual-jcim/",
      "https://apwu.org/wp-content/uploads/2026/03/JCIM-2025-Web_BOOKMARKED_v4.pdf",
      "6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7", 3111811,
      "Wed, 04 Mar 2026 20:17:59 GMT", "November 2025", "USPS-APWU Joint Contract Interpretation Manual",
      "joint_national_interpretation", "Joint interpretation (JCIM)"]);
    expect(validateJcimCache(cache, pdf)).toBe(true);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(path.dirname(realPublicDataDirectory!));
    try {
      expect(readJcimCache().status).toBe("available");
    } finally {
      cwdSpy.mockRestore();
    }
    expect(cache.normalized.sections.map((section) => section.id)).toEqual(JCIM_SECTION_IDS);
    expect(cache.normalized.sections.some((section) => section.id === "article-18")).toBe(false);
    expect(cache.normalized.sections.some((section) => section.id === "article-20")).toBe(false);
  });

  it("fails closed on local identity, content, or section drift", () => {
    expect(validateJcimCache({ ...cache, response: { ...cache.response, lastModified: "drift" } }, pdf)).toBe(false);
    expect(validateJcimCache(cache, new Uint8Array(pdf.length))).toBe(false);
    expect(validateJcimCache({ ...cache, normalized: { ...cache.normalized, sections: [
      ...cache.normalized.sections, { id: "article-18", title: "forbidden", paragraphs: [] }] } }, pdf)).toBe(false);
  });

  it("ignores landing dateModified and rejects linked or binary drift", async () => {
    const mock = async (url: string) => url === JCIM_LANDING_URL
      ? new Response(`<a href="${JCIM_PDF_URL}">PDF</a><meta name="dateModified" content="tomorrow">`, { status: 200 })
      : new Response(pdf, { status: 200, headers: { "content-length": String(JCIM_BYTES),
        "last-modified": JCIM_LAST_MODIFIED, "content-type": "application/pdf" } });
    const fetcher = (async (url: string) => { const response = await mock(url); Object.defineProperty(response, "url", { value: url }); return response; }) as typeof fetch;
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(true);
    expect(await verifyJcimLiveIdentity((async (url: string) => {
      const response = await mock(url === JCIM_LANDING_URL ? url : JCIM_PDF_URL);
      Object.defineProperty(response, "url", { value: url });
      return url === JCIM_LANDING_URL ? new Response("different PDF link", { status: 200 }) : response;
    }) as typeof fetch)).toBe(false);
  });

  it("maps only existing topics and preserves citation locators and packet verification", () => {
    const discipline = jcimTopicCitation(cache, "discipline_just_cause");
    const steward = jcimTopicCitation(cache, "steward_grievance_handling");
    expect(discipline.map((citation) => citation.articleNumber)).toEqual(["16"]);
    expect(steward.map((citation) => citation.articleNumber)).toEqual(["15", "17"]);
    expect(jcimTopicCitation(cache, "annual_leave")).toEqual([]);
    expect(jcimTopicCitation(cache, "article_19_new_topic")).toEqual([]);
    const citation = discipline[0];
    expect(citation.page).toContain("PDF 150 / printed 16-1");
    expect(citation.status).toContain(JCIM_AUTHORITY_LABEL);
    expect(verifyJcimCitation(citation, cache)).toBe("verified_current");
    expect(jcimPacketSourceVerifier(cache).verify(citation)).toBe("verified_current");
    const changed = { ...cache, normalized: { ...cache.normalized, sha256: "0".repeat(64) } };
    expect(jcimPacketSourceVerifier(changed).verify(citation)).toBe("source_instance_changed");
    const section = cache.normalized.sections.find((item) => item.id === "article-19")!;
    const article19Citation = jcimCitation(cache, section, section.paragraphs[0]);
    expect(article19Citation.articleNumber).toBe("19");
  });

  it("keeps CBA first and describes JCIM as interpretation in supported answers", () => {
    const question = "What are the just-cause and discipline protections?";
    const answer = enrichCbaAnswerWithJcim(buildCbaAnswer({ question, source: cba, nlrbSource: null,
      runtimeVersion: version, mode: "Strict Research", scope: "Official-Like", detail: "Detailed" }), question, cache);
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations[0].publicSourceType).toBe("cba_contract");
    expect(answer.citations.some((citation) => citation.sourceId === JCIM_SOURCE_ID && citation.articleNumber === "16")).toBe(true);
    expect(answer.shortAnswer).toContain("The JCIM provides joint interpretation");
    const original = enrichCbaAnswerWithJcim(answer, "What does Article 18 say?", null);
    expect(original).toBe(answer);
    const unrelated = enrichCbaAnswerWithJcim(buildCbaAnswer({ question: "How does annual leave scheduling work?",
      source: cba, nlrbSource: null, runtimeVersion: version, mode: "Strict Research", scope: "Official-Like", detail: "Detailed" }),
      "How does annual leave scheduling work?", cache);
    expect(unrelated.citations.some((citation) => citation.sourceId === JCIM_SOURCE_ID)).toBe(false);
    const article19Question = "What does Article 19 say about handbooks and manuals?";
    const article19 = enrichCbaAnswerWithJcim(buildCbaAnswer({ question: article19Question, source: realCba,
      nlrbSource: null, runtimeVersion: version, mode: "Strict Research", scope: "Official-Like", detail: "Detailed" }),
      article19Question, cache);
    expect(article19.citations[0].publicSourceType).toBe("cba_contract");
    expect(article19.citations.some((citation) => citation.articleNumber === "19" && citation.sourceId === JCIM_SOURCE_ID)).toBe(true);
    expect(article19.shortAnswer).toContain("does not supply the underlying handbook rule");
    const forbiddenQuestion = "What does JCIM Article 18 say about strikes?";
    const forbidden = enrichCbaAnswerWithJcim(buildCbaAnswer({ question: forbiddenQuestion, source: cba,
      nlrbSource: null, runtimeVersion: version, mode: "Strict Research", scope: "Official-Like", detail: "Detailed" }),
      forbiddenQuestion, cache);
    expect(forbidden.citations.some((citation) => citation.sourceId === JCIM_SOURCE_ID)).toBe(false);
  });

  it("pins JCIM provenance in a packet, Library record and exports, then blocks drift", () => {
    const citations = jcimTopicCitation(cache, "discipline_just_cause");
    const verifier = jcimPacketSourceVerifier(cache);
    const packet = buildPublicStewardPacket({ source: cba, topicIds: ["discipline_just_cause"],
      runtimeVersion: version, createdAt: "2026-10-03T17:00:00.000Z", supplementalCitations: citations,
      supplementalSourceVerifiers: [verifier] })!;
    expect(packet).not.toBeNull();
    expect(packet.supplementalSourceAppendix?.[0].authorityClass).toBe("joint_interpretation");
    expect(publicStewardPacketExportEligibility(packet, cba, [verifier])).toEqual({ eligible: true });
    const reopened = migrateSavedAnswers([createSavedStewardPacketRecord({ packet, timestamp: "2026-10-03T17:01:00.000Z" })])[0].stewardPacket!;
    expect(reopened.supplementalCitations).toEqual(citations);
    const view = renderToStaticMarkup(React.createElement(PublicStewardPacketView, { packet: reopened, source: cba,
      supplementalSourceVerifiers: [verifier], onCitationNavigate: () => undefined }));
    expect(view).toContain(JCIM_SOURCE_ID);
    expect(view).toContain("Joint interpretation");
    for (const output of [publicStewardPacketToText(reopened), publicStewardPacketToMarkdown(reopened)]) {
      expect(output).toContain(JCIM_SOURCE_ID);
      expect(output).toContain("Joint interpretation");
    }
    const drifted = structuredClone(cache);
    drifted.normalized.sha256 = "0".repeat(64);
    expect(publicStewardPacketExportEligibility(reopened, cba, [jcimPacketSourceVerifier(drifted)])).toMatchObject({ eligible: false });
    expect(reopened.supplementalCitations).toEqual(citations);
    const driftView = renderToStaticMarkup(React.createElement(PublicStewardPacketView, { packet: reopened, source: cba,
      supplementalSourceVerifiers: [jcimPacketSourceVerifier(drifted)], onCitationNavigate: () => undefined,
      onSave: () => undefined }));
    expect(driftView.match(/<button[^>]*disabled=""/g)?.length).toBe(4);
    const saved = createSavedStewardPacketRecord({ packet, timestamp: "2026-10-03T17:01:00.000Z" });
    const library = renderToStaticMarkup(React.createElement(SavedAnswersPanel, { saved: [saved], onDelete: () => undefined,
      cbaSourceState: { status: "available", source: cba }, jcimSourceState: { status: "unavailable", reason: "drift_detected" } }));
    expect(library).toContain("Packet not current");
    expect(library).toContain(JCIM_SOURCE_ID);
    expect(buildPublicStewardPacket({ source: null, topicIds: ["discipline_just_cause"], runtimeVersion: version,
      supplementalCitations: citations, supplementalSourceVerifiers: [verifier] })).toBeNull();
  });

  it("shows JCIM as a bounded secondary source under Official public sources", () => {
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, { sourceHierarchyGroups: [],
      cbaSourceState: { status: "available", source: cba }, jcimSourceState: { status: "available", source: cache },
      runtimeVersion: version }));
    expect(html).toContain("Official public sources");
    expect(html).toContain(JCIM_AUTHORITY_LABEL);
    expect(html).toContain("The CBA remains the controlling contract");
    expect(html).toContain("<details");
  });
});


describe("JCIM packet presentation repair", () => {
  it("R16 keeps unadmitted sources and citation units outside the verification boundary", () => {
    const citation = jcimTopicCitation(cache, "steward_grievance_handling")[0];
    for (const sourceId of ["lmou", "handbook-manual", "arbitration-precedent", "management-policy", "local-practice", "step-4", "unadmitted-jcim"]) {
      expect(verifyJcimCitation({ ...citation, sourceId }, cache)).not.toBe("verified_current");
    }
    expect(verifyJcimCitation({ ...citation, sectionId: "article-18" }, cache)).not.toBe("verified_current");
    expect(verifyJcimCitation({ ...citation, paragraphId: "unadmitted-unit" }, cache)).not.toBe("verified_current");
    expect(verifyJcimCitation({ ...citation, citationAnchorSha256: "0".repeat(64) }, cache)).not.toBe("verified_current");
    expect(cache.normalized.sections.map((section) => section.id)).toEqual([
      "preface", "introduction", "article-15", "article-16", "article-17", "article-19",
    ]);
  });

  it("R1-R2 R4-R8 R10 R12-R17 preserves saved Article 15/17 provenance and currentness", () => {
    const citations = jcimTopicCitation(cache, "steward_grievance_handling");
    expect(citations.map((item) => item.articleNumber)).toEqual(["15", "17"]);
    const verifier = jcimPacketSourceVerifier(cache);
    const packet = buildPublicStewardPacket({ source: realCba, topicIds: ["steward_grievance_handling"],
      runtimeVersion: version, createdAt: "2026-10-03T17:00:00.000Z", supplementalCitations: citations,
      supplementalSourceVerifiers: [verifier] })!;
    expect(packet).not.toBeNull();
    // Deserialize the existing record shape directly: no migration or resave.
    const saved = JSON.parse(JSON.stringify(createSavedStewardPacketRecord({ packet, timestamp: "2026-10-03T17:01:00.000Z" })));
    const reopened = saved.stewardPacket;
    const stored = JSON.stringify(saved);
    const identity = reopened.contentIdentity;
    const render = (sources = [verifier]) => renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
      packet: reopened, source: realCba, supplementalSourceVerifiers: sources, onCitationNavigate: () => undefined,
      onSave: () => undefined,
    }));
    expect(publicStewardPacketExportEligibility(reopened, realCba, [verifier])).toEqual({ eligible: true });
    const view = render();
    const summary = view.split("<strong>Sources:</strong>")[1].split("</p>")[0];
    expect(summary.match(/Controlling contract \(CBA\)/g)).toHaveLength(1);
    expect(summary.match(/apwu-usps-jcim-2025/g)).toHaveLength(1);
    expect(summary).toContain("(Joint interpretation)");
    expect(summary.indexOf("Controlling contract")).toBeLessThan(summary.indexOf("Joint interpretation"));
    const section13 = view.split("13. Supplemental public-source provenance")[1];
    expect(section13.match(/<li /g)).toHaveLength(2);
    const newText = 'This public pilot verifies only the admitted public sources and citations cited here. It does not determine whether a JCIM interpretation, LMOU, handbook rule, arbitration precedent, management policy, or local practice applies to a particular case.';
    const oldText = 'This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice.';
    for (const output of [view, publicStewardPacketToText(reopened), publicStewardPacketToMarkdown(reopened)]) {
      expect(output).toContain(newText);
      expect(output).not.toContain(oldText);
      const appendix = output.split("13. Supplemental public-source provenance")[1];
      for (const item of citations) {
        expect(appendix).toContain(item.sectionId!);
        expect(appendix).toContain(item.paragraphId!);
        expect(appendix).toContain(item.sourceInstanceId!);
        expect(appendix).toContain(item.paragraphContentSha256!);
        expect(appendix).toContain(item.citationAnchorSha256!);
        expect(verifyJcimCitation(item, cache)).toBe("verified_current");
      }
    }
    for (const output of [publicStewardPacketToText(reopened), publicStewardPacketToMarkdown(reopened)]) {
      const summaryLine = output.split("\n").find((line) => line.includes("Sources: Controlling contract"))!;
      expect(summaryLine.match(/Controlling contract/g)).toHaveLength(1);
      expect(summaryLine.match(/Joint interpretation/g)).toHaveLength(1);
    }
    expect(reopened.limitations.some((item: {text: string}) => item.text === oldText)).toBe(true);
    expect(reopened.citations.every((item: {publicSourceType: string}) => item.publicSourceType === "cba_contract")).toBe(true);
    expect(reopened.supplementalCitations).toEqual(citations);
    expect(publicStewardPacketExportEligibility(reopened, null, [verifier]).eligible).toBe(false);
    const drifted = structuredClone(cache);
    drifted.normalized.sha256 = "0".repeat(64);
    const driftVerifier = jcimPacketSourceVerifier(drifted);
    expect(publicStewardPacketExportEligibility(reopened, realCba, [driftVerifier]).eligible).toBe(false);
    const driftView = render([driftVerifier]);
    expect(driftView.match(/<button[^>]*disabled=""/g)).toHaveLength(4);
    for (const label of ["Copy packet as plain text", "Download packet as Markdown", "Print verified packet", "Save steward packet"]) {
      const button = driftView.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)?.find((item) => item.includes(label));
      expect(button).toContain('disabled=""');
    }
    expect(driftView).toContain(JCIM_SOURCE_ID);
    expect(driftView).toContain("13. Supplemental public-source provenance");
    expect(reopened.contentIdentity).toBe(identity);
    expect(JSON.stringify(saved)).toBe(stored);
  });

  it("R3 never collapses different JCIM instances in the human summary", () => {
    const citations = jcimTopicCitation(cache, "steward_grievance_handling");
    const verifier = jcimPacketSourceVerifier(cache);
    const packet = buildPublicStewardPacket({ source: realCba, topicIds: ["steward_grievance_handling"],
      runtimeVersion: version, supplementalCitations: citations, supplementalSourceVerifiers: [verifier] })!;
    packet.supplementalSourceAppendix![1].sourceInstanceId += "-distinct";
    const view = renderToStaticMarkup(React.createElement(PublicStewardPacketView, { packet, source: realCba,
      supplementalSourceVerifiers: [verifier], onCitationNavigate: () => undefined }));
    const summary = view.split("<strong>Sources:</strong>")[1].split("</p>")[0];
    expect(summary.match(/apwu-usps-jcim-2025/g)).toHaveLength(2);
    expect(publicStewardPacketExportEligibility(packet, realCba, [verifier]).eligible).toBe(false);
  });
});

});
