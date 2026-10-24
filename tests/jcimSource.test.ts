import { createJcimLiveIdentityFetcher } from "@/tests/fixtures/jcimLiveIdentityFixture";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import { verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { enrichCbaAnswerWithJcim } from "@/lib/jcimAnswer";
import { buildPublicStewardPacket, publicStewardPacketExportEligibility, publicStewardPacketToMarkdown, publicStewardPacketToText } from "@/lib/publicStewardPacket";
import { createSavedStewardPacketRecord, migrateSavedAnswers } from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache, createSyntheticJcimPdfBytes, syntheticJcimStableJson } from "@/tests/fixtures/jcimSourceFixture";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SourcesPanel, PublicStewardPacketView, SavedAnswersPanel } from "@/components/KiaStickApp";
import {
  JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL, JCIM_BYTES, JCIM_EDITION, JCIM_LANDING_URL,
  JCIM_LAST_MODIFIED, JCIM_PDF_URL, JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, JCIM_TITLE,
  jcimCitation, jcimPacketSourceVerifier, jcimTopicCitation, verifyJcimCitation,
} from "@/lib/jcimSource";
import {
  JCIM_PDF_IDENTITY_PINS, matchesJcimPdfIdentity, readJcimCache, validateJcimCache, verifyJcimLiveIdentity,
} from "@/lib/jcimSourceServer";

const cache = createJcimSourceFixtureCache();
const pdf = createSyntheticJcimPdfBytes();
const cba = createCbaSourceFixtureCache();
const fixtureCba = createCbaSourceFixtureCacheWithArticle19();
const version = createRuntimeVersion({ buildDate: "20261003", gitSha: "jcimqa01" });

function routeWithFixtureCaches(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research",
    scope: "Official-Like", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null,
    cbaSource: fixtureCba, jcimSource: cache, runtimeVersion: version }) };
}

describe("Article 19 fixture-cache Chat routing regression", () => {
  it.each([
    "What does Article 19 let KIA Stick tell me about USPS handbooks and manuals?",
    "What does Article 19 say about handbooks and manuals?",
  ])("keeps verified CBA first and bounded JCIM second for %s", (question) => {
    const { snapshot, answer } = routeWithFixtureCaches(question);
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
      expect(verifyCbaCitation(citation, fixtureCba).state).toBe("verified_current");
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
    const { answer } = routeWithFixtureCaches(question);
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
  it("pins exact public source identity and thirteen authorized sections", () => {
    expect([JCIM_SOURCE_ID, JCIM_LANDING_URL, JCIM_PDF_URL, JCIM_SHA256, JCIM_BYTES, JCIM_LAST_MODIFIED,
      JCIM_EDITION, JCIM_TITLE, JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL]).toEqual([
      "apwu-usps-jcim-2025", "https://apwu.org/contracts/jcim-2025-joint-contract-intepretation-manual-jcim/",
      "https://apwu.org/wp-content/uploads/2026/03/JCIM-2025-Web_BOOKMARKED_v4.pdf",
      "6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7", 3111811,
      "Wed, 04 Mar 2026 20:17:59 GMT", "November 2025", "USPS-APWU Joint Contract Interpretation Manual",
      "joint_national_interpretation", "Joint interpretation (JCIM)"]);
    expect(cache.normalized.sections.map((section) => section.id)).toEqual(JCIM_SECTION_IDS);
    expect(cache.normalized.sections.some((section) => section.id === "article-18")).toBe(false);
    expect(cache.normalized.sections.some((section) => section.id === "article-20")).toBe(false);
    for (const id of ["article-8", "article-10", "article-11", "article-26"]) {
      expect(cache.normalized.sections.some((section) => section.id === id)).toBe(true);
    }
    for (const id of ["article-9", "article-12", "article-13", "article-24", "article-28"]) {
      expect(cache.normalized.sections.some((section) => section.id === id)).toBe(false);
    }
  });

  it("rejects synthetic binary identity even with matching headers and ignores landing dateModified", async () => {
    const mock = async (url: string) => url === JCIM_LANDING_URL
      ? new Response(`<a href="${JCIM_PDF_URL}">PDF</a><meta name="dateModified" content="tomorrow">`, { status: 200 })
      : new Response(pdf, { status: 200, headers: { "content-length": String(JCIM_BYTES),
        "last-modified": JCIM_LAST_MODIFIED, "content-type": "application/pdf" } });
    const fetcher = (async (url: string) => { const response = await mock(url); Object.defineProperty(response, "url", { value: url }); return response; }) as typeof fetch;
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
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
    // Deliberate KIA-jcim-more-articles-2 change: annual_leave was [] and now cites JCIM Article 10.
    expect(jcimTopicCitation(cache, "annual_leave").map((citation) => citation.articleNumber)).toEqual(["10"]);
    expect(jcimTopicCitation(cache, "overtime").map((citation) => citation.articleNumber)).toEqual(["8"]);
    expect(jcimTopicCitation(cache, "sick_leave").map((citation) => citation.articleNumber)).toEqual(["10"]);
    expect(jcimTopicCitation(cache, "holiday_scheduling").map((citation) => citation.articleNumber)).toEqual(["11"]);
    expect(jcimTopicCitation(cache, "uniforms_work_clothes").map((citation) => citation.articleNumber)).toEqual(["26"]);
    expect(jcimTopicCitation(cache, "article_19_new_topic")).toEqual([]);
    const safety = jcimTopicCitation(cache, "safety_health");
    const higherLevel = jcimTopicCitation(cache, "higher_level_assignments");
    const claims = jcimTopicCitation(cache, "employee_claims");
    expect(safety.map((citation) => citation.articleNumber)).toEqual(["14"]);
    expect(higherLevel.map((citation) => citation.articleNumber)).toEqual(["25"]);
    expect(claims.map((citation) => citation.articleNumber)).toEqual(["27"]);
    for (const added of [...safety, ...higherLevel, ...claims]) expect(verifyJcimCitation(added, cache)).toBe("verified_current");
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
    const annualLeave = enrichCbaAnswerWithJcim(buildCbaAnswer({ question: "How does annual leave scheduling work?",
      source: cba, nlrbSource: null, runtimeVersion: version, mode: "Strict Research", scope: "Official-Like", detail: "Detailed" }),
      "How does annual leave scheduling work?", cache);
    // Deliberate KIA-jcim-more-articles-2 change: annual leave previously received no JCIM; it now gets
    // JCIM Article 10 strictly after the controlling CBA citations.
    expect(annualLeave.citations.filter((citation) => citation.sourceId === JCIM_SOURCE_ID).map((citation) => citation.articleNumber)).toEqual(["10"]);
    expect(annualLeave.citations[0].publicSourceType).toBe("cba_contract");
    const article19Question = "What does Article 19 say about handbooks and manuals?";
    const article19 = enrichCbaAnswerWithJcim(buildCbaAnswer({ question: article19Question, source: fixtureCba,
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
      "preface", "introduction", "article-8", "article-10", "article-11", "article-14", "article-15", "article-16",
      "article-17", "article-19", "article-25", "article-26", "article-27",
    ]);
  });

  it("R1-R2 R4-R8 R10 R12-R17 preserves saved Article 15/17 provenance and currentness", () => {
    const citations = jcimTopicCitation(cache, "steward_grievance_handling");
    expect(citations.map((item) => item.articleNumber)).toEqual(["15", "17"]);
    const verifier = jcimPacketSourceVerifier(cache);
    const packet = buildPublicStewardPacket({ source: fixtureCba, topicIds: ["steward_grievance_handling"],
      runtimeVersion: version, createdAt: "2026-10-03T17:00:00.000Z", supplementalCitations: citations,
      supplementalSourceVerifiers: [verifier] })!;
    expect(packet).not.toBeNull();
    // Deserialize the existing record shape directly: no migration or resave.
    const saved = JSON.parse(JSON.stringify(createSavedStewardPacketRecord({ packet, timestamp: "2026-10-03T17:01:00.000Z" })));
    const reopened = saved.stewardPacket;
    const stored = JSON.stringify(saved);
    const identity = reopened.contentIdentity;
    const render = (sources = [verifier]) => renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
      packet: reopened, source: fixtureCba, supplementalSourceVerifiers: sources, onCitationNavigate: () => undefined,
      onSave: () => undefined,
    }));
    expect(publicStewardPacketExportEligibility(reopened, fixtureCba, [verifier])).toEqual({ eligible: true });
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
    expect(publicStewardPacketExportEligibility(reopened, fixtureCba, [driftVerifier]).eligible).toBe(false);
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
    const packet = buildPublicStewardPacket({ source: fixtureCba, topicIds: ["steward_grievance_handling"],
      runtimeVersion: version, supplementalCitations: citations, supplementalSourceVerifiers: [verifier] })!;
    packet.supplementalSourceAppendix![1].sourceInstanceId += "-distinct";
    const view = renderToStaticMarkup(React.createElement(PublicStewardPacketView, { packet, source: fixtureCba,
      supplementalSourceVerifiers: [verifier], onCitationNavigate: () => undefined }));
    const summary = view.split("<strong>Sources:</strong>")[1].split("</p>")[0];
    expect(summary.match(/apwu-usps-jcim-2025/g)).toHaveLength(2);
    expect(publicStewardPacketExportEligibility(packet, fixtureCba, [verifier]).eligible).toBe(false);
  });
});

describe("Article 19 synthetic semantic case", () => {
  it("selects the heading and Section 1 before bounded JCIM interpretation", () => {
    const { answer } = routeWithFixtureCaches("What does Article 19 say about handbooks and manuals?");
    expect(answer.citations[0].publicSourceType).toBe("cba_contract");
    expect(answer.citations.slice(0, 2).map((c) => c.paragraphId)).toEqual(["cba-pdf-p127-p05", "cba-pdf-p127-p06"]);
    const paragraphs = fixtureCba.normalized.pages[126].paragraphs;
    expect(paragraphs.find((p) => p.id.endsWith("p05"))?.text).toBe("ARTICLE 19 HANDBOOKS AND MANUALS");
    expect(paragraphs.find((p) => p.id.endsWith("p06"))?.sectionNumber).toBe("1");
    expect(answer.citations.some((c) => c.paragraphId === "cba-pdf-p127-p01")).toBe(false);
    const jcim = answer.citations.find((c) => c.sourceId === JCIM_SOURCE_ID)!;
    expect(jcim.articleNumber).toBe("19");
    expect(verifyJcimCitation(jcim, cache)).toBe("verified_current");
    expect(jcim.status).toContain(JCIM_AUTHORITY_LABEL);
    expect(answer.shortAnswer).toContain("does not supply the underlying handbook rule");
    expect(answer.shortAnswer).not.toMatch(/ELM\s+\d|Step\s+4\s+(?:says|provides)/i);
    expect(routeWithFixtureCaches("What does the JCIM say in Article 18?").answer.citations
      .filter((c) => c.sourceId === JCIM_SOURCE_ID)).toEqual([]);
  });
});

describe("synthetic cache rejection with real SHA256", () => {
  it("rejects synthetic bytes whose real hash differs from the admission pin", () => {
    expect(createHash("sha256").update(pdf).digest("hex")).not.toBe(JCIM_SHA256);
    expect(validateJcimCache(cache, pdf)).toBe(false);
  });
  it("rejects wrong-length bytes", () => {
    expect(pdf.subarray(1).length).not.toBe(JCIM_BYTES);
    expect(validateJcimCache(cache, pdf.subarray(1))).toBe(false);
  });
  it("rejects tampered response hash metadata", () => {
    expect(validateJcimCache({ ...cache, response: { ...cache.response, sha256: "0".repeat(64) } }, pdf)).toBe(false);
  });
  it("rejects normalized metadata that differs from the real stableJson section hash", () => {
    const actual = createHash("sha256").update(syntheticJcimStableJson(cache.normalized.sections)).digest("hex");
    const tampered = structuredClone(cache);
    tampered.normalized.sha256 = "0".repeat(64);
    expect(tampered.normalized.sha256).not.toBe(actual);
    expect(validateJcimCache(tampered, pdf)).toBe(false);
  });
  it("reports missing, drifted and unsafe temporary cache directories", () => {
    const root = mkdtempSync(path.join(realpathSync(tmpdir()), "kia-real-hash-rejection-"));
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(root);
    try {
      expect(readJcimCache()).toEqual({ status: "unavailable", reason: "cache_missing" });
      const directory = path.join(root, ".kia-public-data");
      mkdirSync(directory, { mode: 0o700 });
      chmodSync(directory, 0o700);
      for (const [name, contents] of [[`${JCIM_SOURCE_ID}.json`, JSON.stringify(cache)], [`${JCIM_SOURCE_ID}.pdf`, pdf]] as const) {
        const target = path.join(directory, name);
        writeFileSync(target, contents, { mode: 0o600 });
        chmodSync(target, 0o600);
      }
      expect(readJcimCache()).toEqual({ status: "unavailable", reason: "drift_detected" });
      chmodSync(directory, 0o755);
      expect(readJcimCache()).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    } finally {
      cwdSpy.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("PDF byte guards (real crypto)", () => {
  const realSha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  it("[real-crypto LIVE hash guard] rejects synthetic bytes at the pinned length (mutation-isolated: killed when live hash guard removed)", async () => {
    const bytes = createSyntheticJcimPdfBytes();
    expect(bytes.length).toBe(JCIM_BYTES);
    expect(realSha256(bytes)).not.toBe(JCIM_SHA256);
    const { fetcher, readBody } = createJcimLiveIdentityFetcher(bytes);
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
    expect(readBody).toHaveBeenCalledOnce();
  });
  it("[real-crypto LIVE length guard reached, not isolated] rejects a short body; hash guard would also reject", async () => {
    const bytes = Buffer.from(pdf.subarray(0, JCIM_BYTES - 1));
    expect(bytes.length).toBe(JCIM_BYTES - 1);
    // Live verification short-circuits on length; its hash check is skipped.
    // Removing the length guard still rejects because this hash differs.
    expect(realSha256(bytes)).not.toBe(JCIM_SHA256);
    const { fetcher, readBody } = createJcimLiveIdentityFetcher(bytes);
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
    expect(readBody).toHaveBeenCalledOnce();
  });
  it("[real-crypto LIVE hash guard, one-byte tamper; overlaps LIVE hash test] rejects a single flipped byte at the pinned length", async () => {
    // Duplicates LIVE hash guard coverage with a one-byte delta; kept as an
    // explicit tamper example, adds no extra guard isolation.
    const baseline = createSyntheticJcimPdfBytes();
    const bytes = Buffer.from(baseline);
    bytes[0] ^= 1;
    expect(baseline.length).toBe(JCIM_BYTES);
    expect(bytes.length).toBe(JCIM_BYTES);
    expect(bytes.reduce((count, byte, index) => count + Number(byte !== baseline[index]), 0)).toBe(1);
    expect(realSha256(baseline)).not.toBe(JCIM_SHA256);
    expect(realSha256(bytes)).not.toBe(JCIM_SHA256);
    const { fetcher, readBody } = createJcimLiveIdentityFetcher(bytes);
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
    expect(readBody).toHaveBeenCalledOnce();
  });
  it("[real-crypto LIVE header guard] [LIVE-CONTENT-TYPE sanity] rejects before reading bytes", async () => {
    // Real pinned bytes are unavailable here; the hash/tamper spies prove the valid
    // stub reaches byte guards, while this header sanity check stops earlier.
    const { fetcher, readBody } = createJcimLiveIdentityFetcher(pdf, "text/plain");
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
    expect(readBody).not.toHaveBeenCalled();
  });
});


describe("PDF identity seam (unmocked M1–M3 isolation + production hard gate)", () => {
  const realSha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

  it("production defaults always pin JCIM_SHA256 and JCIM_BYTES", () => {
    expect(JCIM_PDF_IDENTITY_PINS).toEqual({ sha256: JCIM_SHA256, byteCount: JCIM_BYTES });
    expect(matchesJcimPdfIdentity(pdf)).toBe(false); // synthetic hash ≠ production pin
    expect(validateJcimCache(cache, pdf)).toBe(false);
    expect(validateJcimCache(cache, pdf, JCIM_PDF_IDENTITY_PINS)).toBe(false);
  });

  it("hard gate: incomplete or empty pins fail closed (cannot skip hash/length)", () => {
    expect(matchesJcimPdfIdentity(pdf, { sha256: "", byteCount: pdf.length })).toBe(false);
    expect(matchesJcimPdfIdentity(pdf, { sha256: realSha256(pdf), byteCount: Number.NaN })).toBe(false);
    expect(matchesJcimPdfIdentity(pdf, { sha256: realSha256(pdf), byteCount: -1 })).toBe(false);
  });

  it("hard gate: no NODE_ENV/test bypass; production defaults still enforce both pins", async () => {
    const source = readFileSync("lib/jcimSourceServer.ts", "utf8");
    expect(source).not.toMatch(/NODE_ENV/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).toContain("JCIM_PDF_IDENTITY_PINS");
    expect(source).toContain("matchesJcimPdfIdentity");
    // Defaults reject synthetic bytes (wrong hash at production length).
    expect(matchesJcimPdfIdentity(pdf)).toBe(false);
    expect(validateJcimCache(cache, pdf)).toBe(false);
    const { fetcher, readBody } = createJcimLiveIdentityFetcher(pdf);
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
    expect(readBody).toHaveBeenCalledOnce();
  });

  it("[seam M1 VALIDATE_HASH isolated] rejects wrong hash at matching length; survives only if hash guard remains", () => {
    // Alternate pins = real identity of synthetic PDF. Tamper one byte at same length.
    const baseline = createSyntheticJcimPdfBytes();
    const pins = { sha256: realSha256(baseline), byteCount: baseline.length };
    expect(matchesJcimPdfIdentity(baseline, pins)).toBe(true);
    const tampered = Buffer.from(baseline);
    tampered[0] ^= 1;
    expect(tampered.length).toBe(pins.byteCount);
    expect(realSha256(tampered)).not.toBe(pins.sha256);
    // With hash guard: false. Mutant M1 (drop hash check) would return true on length alone.
    expect(matchesJcimPdfIdentity(tampered, pins)).toBe(false);
    expect(validateJcimCache(cache, tampered, pins)).toBe(false);
  });

  it("[seam M2 VALIDATE_LENGTH isolated] rejects wrong length when hash matches alternate pins", () => {
    // Short PDF; pins.sha256 = real hash of short PDF; pins.byteCount = full length (mismatch).
    const shortPdf = Buffer.from(createSyntheticJcimPdfBytes().subarray(0, JCIM_BYTES - 1));
    const pins = { sha256: realSha256(shortPdf), byteCount: JCIM_BYTES };
    expect(shortPdf.length).not.toBe(pins.byteCount);
    expect(realSha256(shortPdf)).toBe(pins.sha256);
    // With length guard: false. Mutant M2 (drop length check) would return true on hash alone.
    expect(matchesJcimPdfIdentity(shortPdf, pins)).toBe(false);
    expect(validateJcimCache(cache, shortPdf, pins)).toBe(false);
  });

  it("[seam M3 LIVE_LENGTH isolated] rejects wrong-length live body when hash matches alternate pins", async () => {
    const shortPdf = Buffer.from(createSyntheticJcimPdfBytes().subarray(0, JCIM_BYTES - 1));
    const pins = { sha256: realSha256(shortPdf), byteCount: JCIM_BYTES };
    expect(shortPdf.length).not.toBe(pins.byteCount);
    expect(realSha256(shortPdf)).toBe(pins.sha256);
    // Custom fetcher: content-length header matches expected pins.byteCount (so header passes)
    // while body is short — isolates the body length guard from header + hash shadows.
    const landing = new Response(`<a href="${JCIM_PDF_URL}">PDF</a>`);
    const response = new Response(Buffer.from(shortPdf), {
      headers: {
        "content-length": String(pins.byteCount),
        "last-modified": JCIM_LAST_MODIFIED,
        "content-type": "application/pdf",
      },
    });
    Object.defineProperty(landing, "url", { value: JCIM_LANDING_URL });
    Object.defineProperty(response, "url", { value: JCIM_PDF_URL });
    const readBody = vi.spyOn(response, "arrayBuffer");
    const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
      if (url === JCIM_LANDING_URL) return landing;
      return response;
    }) as unknown as typeof fetch;
    // With length guard: false. Mutant M3 (drop body length check) would accept on hash alone.
    expect(await verifyJcimLiveIdentity(fetcher, pins)).toBe(false);
    expect(readBody).toHaveBeenCalledOnce();
  });

  it("production live verify without override still requires both JCIM pins", async () => {
    const matchingLengthWrongHash = createSyntheticJcimPdfBytes();
    expect(matchingLengthWrongHash.length).toBe(JCIM_BYTES);
    expect(realSha256(matchingLengthWrongHash)).not.toBe(JCIM_SHA256);
    const { fetcher, readBody } = createJcimLiveIdentityFetcher(matchingLengthWrongHash);
    expect(await verifyJcimLiveIdentity(fetcher)).toBe(false);
    expect(readBody).toHaveBeenCalledOnce();
  });
});
