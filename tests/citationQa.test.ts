import { describe, expect, it } from "vitest";
import { answerToMarkdown, buildAnswer } from "@/lib/answerGovernor";
import {
  buildSourceHierarchyGroups,
  citationForDoc,
  corpus,
  dedupeCitations,
  hierarchyForClass,
  orderFakeDocumentsForCitation,
  sourceHierarchyLabels,
  sourceHierarchyOrder,
} from "@/lib/sourceModel";
import { citationQaCases, expectedSourceHierarchy } from "@/tests/fixtures/citationQaFixtures";

const baseOptions = {
  mode: "Strict Research" as const,
  scope: "All Fake" as const,
  detail: "Detailed" as const,
};

function doc(id: string) {
  const found = corpus.docs.find((candidate) => candidate.id === id);
  expect(found, `missing fake fixture ${id}`).toBeDefined();
  return found!;
}

describe("citation QA fixtures", () => {
  it("covers the full fake authority hierarchy in deterministic order", () => {
    const groups = buildSourceHierarchyGroups(corpus.docs);

    expect(sourceHierarchyOrder).toEqual(expectedSourceHierarchy);
    expect(groups.map((group) => group.hierarchy)).toEqual(expectedSourceHierarchy);
    expect(groups.map((group) => group.label)).toEqual(expectedSourceHierarchy.map((hierarchy) => sourceHierarchyLabels[hierarchy]));
    expect(groups.every((group) => group.docs.length > 0)).toBe(true);
    expect(groups.flatMap((group) => group.docs.map((groupDoc) => groupDoc.id)).sort()).toEqual(
      corpus.docs.map((corpusDoc) => corpusDoc.id).sort()
    );
  });

  it("keeps answer citations ordered by authority and deduped", () => {
    for (const qaCase of citationQaCases) {
      const answer = buildAnswer(qaCase.prompt, baseOptions);
      const citationIds = answer.citations.map((citation) => citation.id);

      expect(answer.intent).toBe(qaCase.intent);
      expect(answer.noAnswer).toBe(qaCase.noAnswer);
      expect(citationIds).toEqual(qaCase.expectedCitationIds);
      expect(new Set(citationIds).size).toBe(citationIds.length);
      expect(citationIds.map((id) => hierarchyForClass(doc(id).class))).toEqual(
        qaCase.expectedCitationIds.map((id) => hierarchyForClass(doc(id).class))
      );
    }
  });

  it("keeps unverified and missing-source paths out of authoritative citations", () => {
    for (const qaCase of citationQaCases) {
      const answer = buildAnswer(qaCase.prompt, baseOptions);
      const citationIds = answer.citations.map((citation) => citation.id);
      const relatedIds = answer.relatedFakeSections.map((citation) => citation.id);

      expect(answer.citations.every((citation) => citation.citable)).toBe(true);
      expect(answer.citations.every((citation) => citation.hash.length > 0 && citation.page.length > 0)).toBe(true);

      for (const expectedRelatedId of qaCase.expectedRelatedIds ?? qaCase.expectedCitationIds) {
        expect(relatedIds).toContain(expectedRelatedId);
      }
      for (const excludedCitationId of qaCase.excludedCitationIds ?? []) {
        expect(citationIds).not.toContain(excludedCitationId);
      }
    }

    const unresolved = buildAnswer("What evidence should I get?", baseOptions);
    expect(unresolved.noAnswer).toBe(true);
    expect(unresolved.clarificationNeeded).toBe(true);
    expect(unresolved.citations).toHaveLength(0);
    expect(answerToMarkdown(unresolved)).toContain("No citable fake sources.");
  });

  it("surfaces conflict notes without promoting uncited material to proof", () => {
    for (const qaCase of citationQaCases) {
      const answer = buildAnswer(qaCase.prompt, baseOptions);
      const conflicts = answer.conflicts.join(" ");
      const markdown = answerToMarkdown(answer);

      for (const expectedText of qaCase.expectedConflictText ?? []) {
        expect(conflicts).toContain(expectedText);
      }
      for (const excludedCitationId of qaCase.excludedCitationIds ?? []) {
        expect(markdown).not.toContain(doc(excludedCitationId).title);
      }
    }
  });

  it("dedupes duplicate fake docs and citations by stable id", () => {
    const duplicatedDocs = [
      doc("fake-official-annual-leave"),
      doc("fake-local-annual-leave-window"),
      doc("fake-local-annual-leave-window"),
      doc("fake-past-practice-vacation-board"),
      doc("fake-official-annual-leave"),
    ];
    const orderedDocs = orderFakeDocumentsForCitation(duplicatedDocs);
    const citations = dedupeCitations([...orderedDocs, orderedDocs[0]].map(citationForDoc));

    expect(orderedDocs.map((orderedDoc) => orderedDoc.id)).toEqual([
      "fake-local-annual-leave-window",
      "fake-past-practice-vacation-board",
      "fake-official-annual-leave",
    ]);
    expect(citations.map((citation) => citation.id)).toEqual(orderedDocs.map((orderedDoc) => orderedDoc.id));
  });
});
