import { describe, expect, it, vi } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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
import { createJcimSourceFixtureCache, createSyntheticJcimPdfBytes } from "@/tests/fixtures/jcimSourceFixture";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SourcesPanel, PublicStewardPacketView, SavedAnswersPanel } from "@/components/KiaStickApp";
import {
  JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL, JCIM_BYTES, JCIM_EDITION, JCIM_LANDING_URL,
  JCIM_LAST_MODIFIED, JCIM_PDF_URL, JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, JCIM_TITLE,
  jcimCitation, jcimPacketSourceVerifier, jcimTopicCitation, verifyJcimCitation,
} from "@/lib/jcimSource";
import { readJcimCache, validateJcimCache, verifyJcimLiveIdentity } from "@/lib/jcimSourceServer";

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  const fixture = await import("@/tests/fixtures/jcimSourceFixture");
  const identity = await import("@/lib/jcimSource");
  const syntheticPdf = fixture.createSyntheticJcimPdfBytes();
  const syntheticSections = Buffer.from(fixture.syntheticJcimStableJson(fixture.createJcimSourceFixtureCache().normalized.sections));
  return { ...original, createHash: (...args: Parameters<typeof original.createHash>) => {
    const hash = original.createHash(...args);
    const chunks: Buffer[] = [];
    const proxy: import("node:crypto").Hash = new Proxy(hash, {
      get(target, property) {
        if (property === "update") return (data: import("node:crypto").BinaryLike, encoding?: BufferEncoding) => {
          chunks.push(typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data as Uint8Array));
          if (typeof data === "string" && encoding) target.update(data, encoding); else target.update(data);
          return proxy;
        };
        if (property === "digest") return (encoding?: import("node:crypto").BinaryToTextEncoding) => {
          const result = encoding ? target.digest(encoding) : target.digest();
          // Only exact SYNTHETIC bytes/sections receive admission pins. Every other
          // input (zeroed PDF, changed text, citation anchors, CBA) uses real hashing.
          if (args[0] === "sha256" && encoding === "hex") {
            const input = Buffer.concat(chunks);
            if (input.equals(syntheticPdf)) return identity.JCIM_SHA256;
            if (input.equals(syntheticSections)) return identity.JCIM_NORMALIZED_SHA256;
          }
          return result;
        };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    return proxy;
  } };
});

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
  it("pins exact public source identity and six authorized sections", () => {
    expect([JCIM_SOURCE_ID, JCIM_LANDING_URL, JCIM_PDF_URL, JCIM_SHA256, JCIM_BYTES, JCIM_LAST_MODIFIED,
      JCIM_EDITION, JCIM_TITLE, JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL]).toEqual([
      "apwu-usps-jcim-2025", "https://apwu.org/contracts/jcim-2025-joint-contract-intepretation-manual-jcim/",
      "https://apwu.org/wp-content/uploads/2026/03/JCIM-2025-Web_BOOKMARKED_v4.pdf",
      "6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7", 3111811,
      "Wed, 04 Mar 2026 20:17:59 GMT", "November 2025", "USPS-APWU Joint Contract Interpretation Manual",
      "joint_national_interpretation", "Joint interpretation (JCIM)"]);
    expect(validateJcimCache(cache, pdf)).toBe(true);
    const temporaryRoot = mkdtempSync(path.join(realpathSync(tmpdir()), "kia-synthetic-jcim-"));
    try {
      const directory = path.join(temporaryRoot, ".kia-public-data");
      mkdirSync(directory, { mode: 0o700 });
      chmodSync(directory, 0o700);
      for (const [name, contents] of [
        [`${JCIM_SOURCE_ID}.json`, JSON.stringify(cache)],
        [`${JCIM_SOURCE_ID}.pdf`, pdf],
      ] as const) {
        const target = path.join(directory, name);
        writeFileSync(target, contents, { mode: 0o600 });
        chmodSync(target, 0o600);
      }
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(temporaryRoot);
      try {
        expect(readJcimCache().status).toBe("available");
      } finally {
        cwdSpy.mockRestore();
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
    expect(cache.normalized.sections.map((section) => section.id)).toEqual(JCIM_SECTION_IDS);
    expect(cache.normalized.sections.some((section) => section.id === "article-18")).toBe(false);
    expect(cache.normalized.sections.some((section) => section.id === "article-20")).toBe(false);
  });

  it("fails closed on local identity, content, or section drift", () => {
    expect(validateJcimCache({ ...cache, response: { ...cache.response, lastModified: "drift" } }, pdf)).toBe(false);
    expect(validateJcimCache(cache, new Uint8Array(pdf.length))).toBe(false);
    const contentDrift = structuredClone(cache);
    contentDrift.normalized.sections[0].paragraphs[0].text += " SYNTHETIC drift";
    expect(validateJcimCache(contentDrift, pdf)).toBe(false);
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
      "preface", "introduction", "article-15", "article-16", "article-17", "article-19",
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
