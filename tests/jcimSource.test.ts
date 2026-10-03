import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
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

const cache = JSON.parse(readFileSync(`.kia-public-data/${JCIM_SOURCE_ID}.json`, "utf8")) as JcimCache;
const pdf = readFileSync(`.kia-public-data/${JCIM_SOURCE_ID}.pdf`);
const cba = createCbaSourceFixtureCache();
const version = createRuntimeVersion({ buildDate: "20261003", gitSha: "jcimqa01" });

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
    expect(readJcimCache().status).toBe("available");
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
    const article19 = enrichCbaAnswerWithJcim(buildCbaAnswer({ question: article19Question, source: cba,
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
