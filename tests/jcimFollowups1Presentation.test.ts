import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GET } from "@/app/health/route";
import { PublicGrievanceOutlineView, PublicStewardArgumentPlanView, PublicStewardPacketView } from "@/components/KiaStickApp";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import { jcimPacketSourceVerifier, jcimTopicCitation } from "@/lib/jcimSource";
import { buildPublicGrievanceOutline, publicGrievanceOutlineToMarkdown, publicGrievanceOutlineToText } from "@/lib/publicGrievanceOutline";
import { buildPublicStewardArgumentPlan, publicStewardArgumentPlanToMarkdown, publicStewardArgumentPlanToText } from "@/lib/publicStewardArgumentPlan";
import { buildPublicStewardPacket, publicStewardPacketDisplayLimitations, publicStewardPacketLimitationText } from "@/lib/publicStewardPacket";
import { PUBLIC_STEWARD_WORKFLOW_TOPICS, publicStewardWorkflowTopic, type PublicStewardWorkflowTopicId } from "@/lib/publicStewardWorkflowRegistry";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-followups-1: presentation-only follow-ups from the PR #7 review (F6, F7, F1).
// Synthetic fixtures only; every outline, plan, and packet is built at runtime.
// Stored limitations, serialization, ids, and contentIdentity must not change.
const NEW =
  "This public pilot verifies only the admitted public sources and citations cited here. It does not determine whether a JCIM interpretation, LMOU, handbook rule, arbitration precedent, management policy, or local practice applies to a particular case.";
const OLD = "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice.";
const OVERTIME_OLD_PREFIX = "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, local practice, or worked-off-assignment theory";
const isLegacy = (text: string) => text === OLD || text.startsWith(OVERTIME_OLD_PREFIX);

const source = createCbaSourceFixtureCacheWithArticle19();
const version = createRuntimeVersion({ buildDate: "20261021", gitSha: "jcfprobe" });
const createdAt = "2026-10-21T13:00:00.000Z";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const between = (value: string, start: string, end: string) => {
  const tail = value.split(start)[1];
  expect(tail, start).toBeDefined();
  return tail.split(end)[0];
};
const noop = () => undefined;

// Identity values recorded at base 18d0dfe9 (Phase A probe-base.json sha256 0622886d...):
// [outline id, outline contentIdentity, outline serialized sha256, plan id, plan contentIdentity, plan serialized sha256]
const BASE_IDENTITIES: Record<PublicStewardWorkflowTopicId, string[]> = {
  annual_leave: ["public-grievance-outline-6734e47a8b8f78e2", "48f6f70b0e9880292c98339020fdb6dba63ef98526aeafdf1a65f043e05e1519", "90ec8bab2b4057f4a55606a4271d020f4e356af7c19ab7324b5193a0fb2925d8", "public-steward-argument-plan-ee79f0e957cb644c0a45", "85a7ac7c7754bd489898aa166b9c34d4bb27fa110d68d4008dee7444ef0d9b19", "6c196c7353a6875f92673c462545c19a4f3ca1d3b056b01358de6992026ca8a7"],
  overtime: ["public-grievance-outline-a504570e7921f1c5", "67ad482e04379cf4925560cd6cf6b771589a24148fad6653bb0f3077c9fdcbbd", "cab1f2cb20263c30e5739203f834209ae7eb3dd380b0f43624b16dfbfc20236f", "public-steward-argument-plan-d836c0c4f248f0662de1", "45f42ea69a5d82d64e1fd5ee54e9f2095d31d2ec411c0ee140dff5a4829b41de", "2798ab0e862b310905673d15125d0ebd2e9e16a1471311178c63d7ce140b95ae"],
  holiday_scheduling: ["public-grievance-outline-270053c2eb76154b", "90a48de5818577123616088219b9f453caf1311edc0479e15fb8ab2e00c3994b", "c8f3a02138cf6de20e07c34ca96183e402ddba4a90bb022b79c61e3b8417a0ac", "public-steward-argument-plan-4d9ca988ac9d26f7178f", "750c3d6f413621829adc069169d98b2b7ec9fcefeb3750d00996e9d69c09885a", "644d86b9800464c473da558328eea5fc9664b97068bb65c68a82f87a07cbd868"],
  safety_health: ["public-grievance-outline-de6212ae9534262b", "29f2f8c4236339a6fa54ffc03e0102729ce8904d9b54ba866620a80a619b6592", "a8da46b8dd68911c24266c5c3543a5ad2ed35223fad19e37052f6126a2ccf83a", "public-steward-argument-plan-d6526097873b4af5a932", "6d9daa1338d4eab68d3f14b97ff77dbf3c5a33288f61d2b734b1fabeb84bd3be", "460a190ea32dbedf9b9ffd8e720dc3b9d61e8910b0965cacbb241865fc8b05d5"],
  discipline_just_cause: ["public-grievance-outline-f121ca673cd2711f", "bf733d784cf6af5e22b0c71cfe7215ad1213e7445855520616d40132acfc5d9a", "196d977f43370aba5f4c831eeb6b1f649ff0eca03a95ee5778d26891e9e39b34", "public-steward-argument-plan-eb32205cc6beb9a0f3ab", "0fe0785287a3dbe4cb23223ae8083540f57af1822d74fb99def0e7a0161b79ba", "47ad92f3d59173816670c691c934f4ffe92144eb373be4d4b0065aa9d97e3105"],
  sick_leave: ["public-grievance-outline-4afb3c727c323aaf", "cad1ca9cd24e10e5a553bbc24e6c4ca87a887a9ce515d4d54bd24257600e01f2", "29df201f50eb77ef8a70a735e8bcf46fac99b0f83053851bd6715f6c141525ae", "public-steward-argument-plan-3c42533c985991007ccc", "90de99162ff5ae18405be18c1a8f260368f8b25aa1880862de7962201ab65efb", "109cfa81d4c1e8409a55c3fa66e28309d231856e86c737ed9b09eba20417c110"],
  higher_level_assignments: ["public-grievance-outline-bf5a028d690dcca3", "992f080fe96e15f74eb279af61319e2f588216369f2f2a007e5bb0bb7a9094a9", "7adce33edf4f057bf6b6a08d74aaa9100a6b4657fc093d0376fd16de314701ee", "public-steward-argument-plan-a25eaef0d70df3662206", "ccb78e3020c38a119813fe7ac4d2be557447de4b7f89083ce6c330a644437315", "45e949d11beb35bb0c09b48a334f32ed82e7d36da62df1c2f462ab6bc0b95d98"],
  uniforms_work_clothes: ["public-grievance-outline-1d82bd9c40acdc3a", "b7f5e3c1873eacf56eb756aa90e2a4aee5d0fd4ddce86543c47aeb55ef9c3575", "d6e96dd99501db9fe7296aa49e0d18ace67f44d676ab04f4308332b24d01d537", "public-steward-argument-plan-2fbff614f526010f0c4c", "d79b93d55fc561e45054bf05faad2b01f5e8ce606d619e8e27b56382cf8b3db1", "abba73828415af906b96f77964718fea1e19362390cf3a92795aa4f060e2b847"],
  employee_claims: ["public-grievance-outline-18edfc8116c3b5af", "81cab7662cf6885cb3024593a5329a1de4483cfd1b9fb69245b748daa2605cbb", "6a3d2b335b546647d2921f58678d4ff09a857d6991e25393b4abd02901cc4d0f", "public-steward-argument-plan-90fe10df8d0f389984e2", "32af528d8c6f0e73fc13f389c218e162506f9dd31904d78510c06fdcd3a01cae", "6bc071e55e516966364f1e2dc139c214aabcfc0db47c8f6f5414cb6801f22ec5"],
  steward_grievance_handling: ["public-grievance-outline-0ce8ebc133eeabd1", "642d4cdf7776de789dd928a93a5a4381bf67cd5f0e61ad34c2c0ee50cc022482", "4bf95712f4cb4487eee75d11e400e67ac5fcbe72fc3fd56c39c4d02db2e93edf", "public-steward-argument-plan-23cf55a89e5fb8c36e29", "5cc7025e448361535ee20f3dff4a71990ffcf14e0ffa3e0db20697141a095ab4", "2bf5403cbe011505ba57c0fa74a7e6dfbc013d1b272f7c5e13f01b64dc4abd4d"],
};

function outlineFor(topicId: PublicStewardWorkflowTopicId) {
  const answer = buildCbaAnswer({
    question: publicStewardWorkflowTopic(topicId).exampleQuestion,
    source,
    nlrbSource: null,
    runtimeVersion: version,
    mode: "Strict Research",
    scope: "Official-Like",
    detail: "Detailed",
  });
  expect(answer.noAnswer, topicId).toBe(false);
  const outline = buildPublicGrievanceOutline({ answer, source, createdAt });
  expect(outline, topicId).not.toBeNull();
  return outline!;
}

function planFor(topicId: PublicStewardWorkflowTopicId) {
  const plan = buildPublicStewardArgumentPlan({ source, topicId, runtimeVersion: version, createdAt });
  expect(plan, topicId).not.toBeNull();
  return plan!;
}

function expectDisplayOnly(output: string, label: string) {
  expect(count(output, NEW), label).toBe(1);
  expect(output, label).not.toContain(OLD);
  expect(output, label).not.toContain(OVERTIME_OLD_PREFIX);
}

describe("KIA-jcim-followups-1 F6: grievance outline and steward argument plan limitation wording", () => {
  it("covers all ten supported steward topics", () => {
    expect(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => topic.id).sort()).toEqual(Object.keys(BASE_IDENTITIES).sort());
  });

  for (const topicId of Object.keys(BASE_IDENTITIES) as PublicStewardWorkflowTopicId[]) {
    it(`${topicId}: outline Section 11 text, Markdown, and UI show the display wording; stored data and identity stay verbatim`, () => {
      const outline = outlineFor(topicId);
      expect(outline.limitations.filter((item) => isLegacy(item.text))).toHaveLength(1);
      expectDisplayOnly(between(publicGrievanceOutlineToText(outline), "11. Limitations and uncertainty", "12. Sources"), `${topicId} outline text`);
      expectDisplayOnly(between(publicGrievanceOutlineToMarkdown(outline), "## 11. Limitations and uncertainty", "## 12. Sources"), `${topicId} outline markdown`);
      const view = renderToStaticMarkup(React.createElement(PublicGrievanceOutlineView, { outline, source, onCitationNavigate: noop, onSave: noop }));
      expectDisplayOnly(between(view, "11. Limitations and uncertainty", "</section>"), `${topicId} outline view`);
      const [id, contentIdentity, serialized] = BASE_IDENTITIES[topicId];
      expect({ id: outline.id, contentIdentity: outline.contentIdentity, serialized: sha(JSON.stringify(outline)) }).toEqual({ id, contentIdentity, serialized });
    });

    it(`${topicId}: steward argument plan Section 9 text, Markdown, and UI show the display wording; stored data and identity stay verbatim`, () => {
      const plan = planFor(topicId);
      expect(plan.limitations.filter((item) => isLegacy(item.text))).toHaveLength(1);
      expectDisplayOnly(between(publicStewardArgumentPlanToText(plan), "9. Limitations and unsupported scope", "10. Complete verified-current source appendix"), `${topicId} plan text`);
      expectDisplayOnly(between(publicStewardArgumentPlanToMarkdown(plan), "9. Limitations and unsupported scope", "10. Complete verified-current source appendix"), `${topicId} plan markdown`);
      const view = renderToStaticMarkup(React.createElement(PublicStewardArgumentPlanView, { plan, source, onCitationNavigate: noop, onSave: noop }));
      expectDisplayOnly(between(view, "9. Limitations and unsupported scope", "</section>"), `${topicId} plan view`);
      const [, , , id, contentIdentity, serialized] = BASE_IDENTITIES[topicId];
      expect({ id: plan.id, contentIdentity: plan.contentIdentity, serialized: sha(JSON.stringify(plan)) }).toEqual({ id, contentIdentity, serialized });
    });
  }
});

describe("KIA-jcim-followups-1 F7: /health public source count", () => {
  it("reports three bounded public sources", async () => {
    const payload = await GET().json();
    expect(payload.publicSources).toEqual({ count: 3, accessMode: "exact_allowlisted_read_only", available: true });
  });
});

describe("KIA-jcim-followups-1 F1: merged Section 11 citation ids are sorted", () => {
  const jcim = createJcimSourceFixtureCache();
  const packets = {
    goldenPair: buildPublicStewardPacket({
      source: createCbaSourceFixtureCache(),
      topicIds: ["annual_leave", "overtime"],
      runtimeVersion: createRuntimeVersion({ buildDate: "20260813", gitSha: "printqa1" }),
      createdAt: "2026-08-13T17:00:00.000Z",
    })!,
    threeTopic: buildPublicStewardPacket({
      source,
      topicIds: ["discipline_just_cause", "overtime", "steward_grievance_handling"],
      runtimeVersion: version,
      createdAt,
      supplementalCitations: [
        ...jcimTopicCitation(jcim, "discipline_just_cause"),
        ...jcimTopicCitation(jcim, "steward_grievance_handling"),
      ],
      supplementalSourceVerifiers: [jcimPacketSourceVerifier(jcim)],
    })!,
  };

  for (const [label, packet] of Object.entries(packets)) {
    it(`${label}: the merged display entry carries the sorted union; stored limitations are untouched`, () => {
      const storedBefore = JSON.stringify(packet.limitations);
      const collapsed = packet.limitations.filter((item) => publicStewardPacketLimitationText(item.text) === NEW);
      expect(collapsed.length).toBeGreaterThanOrEqual(2);
      const merged = publicStewardPacketDisplayLimitations(packet.limitations).filter((item) => item.text === NEW);
      expect(merged).toHaveLength(1);
      expect(merged[0].citationIds).toEqual([...new Set(collapsed.flatMap((item) => item.citationIds))].sort());
      for (const item of publicStewardPacketDisplayLimitations(packet.limitations)) {
        expect(item.citationIds).toEqual([...item.citationIds].sort());
      }
      expect(JSON.stringify(packet.limitations)).toBe(storedBefore);
    });
  }

  it("goldenPair: the packet view renders the merged entry's citation buttons in ascending order", () => {
    const packet = packets.goldenPair;
    const view = renderToStaticMarkup(React.createElement(PublicStewardPacketView, { packet, source: createCbaSourceFixtureCache(), onCitationNavigate: noop, onSave: noop }));
    const section = between(view, "11. Limitations and unsupported scope", "12. Complete verified-current source appendix");
    const entry = section.split("<li").find((li) => li.includes(NEW));
    expect(entry).toBeDefined();
    const labels = [...entry!.matchAll(/>\[(\d+)\]</g)].map((match) => Number(match[1]));
    expect(labels).toEqual([1, 6, 8]);
  });
});
