import { buildCbaAnswer } from "@/lib/cbaAnswer";
import {
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SOURCE_ID,
  type CbaSourceCache,
} from "@/lib/cbaSource";
import { canonicalJson, sha256Hex } from "@/lib/cbaCitationIntegrity";
import {
  buildPublicGrievanceOutline,
  publicGrievanceOutlineExportEligibility,
  type CitedGrievanceOutlineItem,
  type PublicGrievanceOutline,
} from "@/lib/publicGrievanceOutline";
import {
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
  publicStewardWorkflowTopic,
  type PublicStewardWorkflowTopicId,
} from "@/lib/publicStewardWorkflowRegistry";
import type { Citation } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export const PUBLIC_STEWARD_PACKET_SAVED_TYPE = "public_steward_packet_plan" as const;
export const PUBLIC_STEWARD_PACKET_PRIVATE_WARNING =
  "Case-neutral public-source workspace only. Do not enter names, dates, case facts, medical information, personnel data, financial facts, or grievance documents." as const;

export interface PublicStewardPacketTopicSummary {
  topicId: PublicStewardWorkflowTopicId;
  title: string;
  templateId: `public-grievance-outline.${PublicStewardWorkflowTopicId}.v1`;
  primaryArticle: string;
  supportedScope: string;
  separateVerification: string;
}

export interface PublicStewardPacketSourceAppendixItem {
  citationId: string;
  sourceId: typeof CBA_SOURCE_ID;
  sourceInstanceId: string;
  articleNumber: string;
  section: string;
  paragraphId: string;
  paragraphContentSha256: string;
  citationAnchorSha256: string;
  verificationState: "verified_current";
}

export interface PublicStewardPacket {
  id: string;
  contentIdentity: string;
  savedType: typeof PUBLIC_STEWARD_PACKET_SAVED_TYPE;
  selectedTopicIds: PublicStewardWorkflowTopicId[];
  templateVersions: string[];
  title: string;
  topicSummaries: PublicStewardPacketTopicSummary[];
  governingContractLanguage: CitedGrievanceOutlineItem[];
  overlapConflictNotes: string[];
  factsToConfirm: string[];
  evidenceChecklist: CitedGrievanceOutlineItem[];
  managementQuestions: string[];
  stepOnePreparation: CitedGrievanceOutlineItem[];
  procedureCaveats: CitedGrievanceOutlineItem[];
  escalationReadiness: CitedGrievanceOutlineItem[];
  limitations: CitedGrievanceOutlineItem[];
  citations: Citation[];
  sourceAppendix: PublicStewardPacketSourceAppendixItem[];
  outlines: PublicGrievanceOutline[];
  provider: typeof CBA_PROVIDER;
  promptVersion: typeof CBA_PROMPT_VERSION;
  publicSourceIds: [typeof CBA_SOURCE_ID];
  sourceInstanceIds: string[];
  buildIdentity: string;
  version: RuntimeVersion;
  privateCaseWarning: typeof PUBLIC_STEWARD_PACKET_PRIVATE_WARNING;
  createdAt: string;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueCitedItems(values: CitedGrievanceOutlineItem[]): CitedGrievanceOutlineItem[] {
  const byText = new Map<string, CitedGrievanceOutlineItem>();
  for (const value of values) {
    const existing = byText.get(value.text);
    byText.set(value.text, {
      text: value.text,
      citationIds: [...new Set([...(existing?.citationIds ?? []), ...value.citationIds])].sort(),
    });
  }
  return [...byText.values()];
}

function sortedTopicIds(
  topicIds: readonly PublicStewardWorkflowTopicId[]
): PublicStewardWorkflowTopicId[] | null {
  const unique = [...new Set(topicIds)].sort();
  if (unique.length < 1 || unique.length > 3) return null;
  if (unique.some((id) => !PUBLIC_STEWARD_WORKFLOW_TOPICS.some((topic) => topic.id === id))) {
    return null;
  }
  return unique;
}

function buildTopicOutline(input: {
  source: CbaSourceCache;
  topicId: PublicStewardWorkflowTopicId;
  runtimeVersion: RuntimeVersion;
  createdAt?: string;
}): PublicGrievanceOutline | null {
  const topic = publicStewardWorkflowTopic(input.topicId);
  const answer = buildCbaAnswer({
    question: topic.exampleQuestion,
    source: input.source,
    nlrbSource: null,
    runtimeVersion: input.runtimeVersion,
    mode: "Strict Research",
    scope: "Official-Like",
    detail: "Detailed",
  });
  if (answer.noAnswer) return null;
  return buildPublicGrievanceOutline({
    answer,
    source: input.source,
    createdAt: input.createdAt,
  });
}

function overlapNotes(outlines: PublicGrievanceOutline[]): string[] {
  const primaryArticles = outlines.map(
    (outline) => publicStewardWorkflowTopic(outline.template).sourceSufficiency.primaryArticle
  );
  const duplicatePrimaryArticles = [...new Set(
    primaryArticles.filter((article, index) => primaryArticles.indexOf(article) !== index)
  )];
  return [
    "Every selected topic shares the verified Article 15 procedure anchors, but each substantive issue must remain tied to its own controlling article and confirmed facts.",
    duplicatePrimaryArticles.length > 0
      ? `Selected topics overlap in Article ${duplicatePrimaryArticles.join(", ")}. Keep their distinct scope, elements, and local-verification requirements separate.`
      : "The selected topics use separate primary articles. No substantive conflict is inferred from combining them in one preparation packet.",
    "A shared evidence category or management question is an organizational overlap only; it does not establish that a record exists, that management possesses it, or that any violation occurred.",
  ];
}

export function buildPublicStewardPacket(input: {
  source: CbaSourceCache | null;
  topicIds: readonly PublicStewardWorkflowTopicId[];
  runtimeVersion: RuntimeVersion;
  createdAt?: string;
}): PublicStewardPacket | null {
  if (!input.source) return null;
  const selectedTopicIds = sortedTopicIds(input.topicIds);
  if (!selectedTopicIds) return null;
  const outlines = selectedTopicIds
    .map((topicId) => buildTopicOutline({
      source: input.source!,
      topicId,
      runtimeVersion: input.runtimeVersion,
      createdAt: input.createdAt,
    }));
  if (
    outlines.some((outline) => !outline) ||
    outlines.some(
      (outline) =>
        !publicGrievanceOutlineExportEligibility(outline!, input.source).eligible
    )
  ) return null;
  const currentOutlines = outlines as PublicGrievanceOutline[];
  const citations = [...new Map(
    currentOutlines
      .flatMap((outline) => outline.citations)
      .map((citation) => [citation.id, citation])
  ).values()].sort((left, right) => left.id.localeCompare(right.id));
  if (
    citations.length === 0 ||
    citations.some(
      (citation) =>
        citation.citationVerificationState !== "verified_current" ||
        !citation.sourceInstanceId ||
        !citation.paragraphContentSha256 ||
        !citation.citationAnchorSha256 ||
        !citation.paragraphId ||
        !citation.articleNumber
    )
  ) return null;

  const topicSummaries = selectedTopicIds.map((topicId) => {
    const topic = publicStewardWorkflowTopic(topicId);
    return {
      topicId,
      title: topic.displayName,
      templateId: topic.templateId,
      primaryArticle: topic.sourceSufficiency.primaryArticle,
      supportedScope: topic.supportedScope,
      separateVerification: topic.localVerification,
    };
  });
  const sourceInstanceIds = [...new Set(
    citations.map((citation) => citation.sourceInstanceId as string)
  )].sort();
  const identityInput = {
    savedType: PUBLIC_STEWARD_PACKET_SAVED_TYPE,
    selectedTopicIds,
    templateVersions: topicSummaries.map((topic) => topic.templateId).sort(),
    publicSourceIds: [CBA_SOURCE_ID],
    sourceInstanceIds,
    citations: citations.map((citation) => ({
      sourceId: citation.sourceId ?? "",
      sourceInstanceId: citation.sourceInstanceId ?? "",
      paragraphContentSha256: citation.paragraphContentSha256 ?? "",
      citationAnchorSha256: citation.citationAnchorSha256 ?? "",
    })),
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
  };
  const id = `public-steward-packet-${sha256Hex(canonicalJson(identityInput)).slice(0, 20)}`;

  const core = {
    savedType: PUBLIC_STEWARD_PACKET_SAVED_TYPE,
    selectedTopicIds,
    templateVersions: topicSummaries.map((topic) => topic.templateId).sort(),
    title: `Case-neutral steward packet: ${topicSummaries.map((topic) => topic.title).join(" + ")}`,
    topicSummaries,
    governingContractLanguage: uniqueCitedItems(
      currentOutlines.flatMap((outline) =>
        outline.governingContractLanguage.map((entry) => ({
          text: `${outline.topic}: ${entry.text}`,
          citationIds: entry.citationIds,
        }))
      )
    ),
    overlapConflictNotes: overlapNotes(currentOutlines),
    factsToConfirm: uniqueStrings(
      currentOutlines.flatMap((outline) =>
        outline.factsToConfirm.map((entry) => `${outline.topic}: ${entry}`)
      )
    ),
    evidenceChecklist: uniqueCitedItems(
      currentOutlines.flatMap((outline) =>
        outline.evidenceToRequest.map((entry) => ({
          text: `${outline.topic}: ${entry.text}`,
          citationIds: entry.citationIds,
        }))
      )
    ),
    managementQuestions: uniqueStrings(
      currentOutlines.flatMap((outline) =>
        outline.questionsForManagement.map((entry) => `${outline.topic}: ${entry}`)
      )
    ),
    stepOnePreparation: uniqueCitedItems(
      currentOutlines.flatMap((outline) =>
        outline.stepOneArgument.map((entry) => ({
          text: `${outline.topic}: ${entry.text}`,
          citationIds: entry.citationIds,
        }))
      )
    ),
    procedureCaveats: uniqueCitedItems(
      currentOutlines.flatMap((outline) => outline.timelinessAndProcedureLimits)
    ),
    escalationReadiness: uniqueCitedItems(
      currentOutlines.flatMap((outline) =>
        outline.escalationReadiness.map((entry) => ({
          text: `${outline.topic}: ${entry.text}`,
          citationIds: entry.citationIds,
        }))
      )
    ),
    limitations: uniqueCitedItems([
      ...currentOutlines.flatMap((outline) => outline.limitations),
      {
        text: "This packet accepts no private case input, calculates no deadline or money, completes no form, and makes no legal, merits, or outcome conclusion.",
        citationIds: citations.map((citation) => citation.id),
      },
    ]),
    citations,
    sourceAppendix: citations.map((citation) => ({
      citationId: citation.id,
      sourceId: CBA_SOURCE_ID,
      sourceInstanceId: citation.sourceInstanceId as string,
      articleNumber: citation.articleNumber as string,
      section: citation.section ?? "Section unknown",
      paragraphId: citation.paragraphId as string,
      paragraphContentSha256: citation.paragraphContentSha256 as string,
      citationAnchorSha256: citation.citationAnchorSha256 as string,
      verificationState: "verified_current" as const,
    })),
    outlines: currentOutlines,
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
    publicSourceIds: [CBA_SOURCE_ID] as [typeof CBA_SOURCE_ID],
    sourceInstanceIds,
    buildIdentity: input.runtimeVersion.displayVersion,
    version: input.runtimeVersion,
    privateCaseWarning: PUBLIC_STEWARD_PACKET_PRIVATE_WARNING,
  };
  return {
    ...core,
    id,
    contentIdentity: sha256Hex(JSON.stringify({
      ...core,
      outlines: currentOutlines.map((outline) => outline.contentIdentity),
      citations: identityInput.citations,
    })),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function publicStewardPacketExportEligibility(
  packet: PublicStewardPacket,
  source: CbaSourceCache | null
): { eligible: true } | { eligible: false; reason: string } {
  const selectedTopicIds = sortedTopicIds(packet.selectedTopicIds);
  if (!selectedTopicIds || selectedTopicIds.join("|") !== packet.selectedTopicIds.join("|")) {
    return { eligible: false, reason: "Packet blocked because its one-to-three sorted topic identity is invalid." };
  }
  if (!source) return { eligible: false, reason: "Packet blocked because the current CBA cache is unavailable." };
  if (
    packet.outlines.length !== selectedTopicIds.length ||
    packet.outlines.some(
      (outline) => !publicGrievanceOutlineExportEligibility(outline, source).eligible
    )
  ) {
    return { eligible: false, reason: "Packet blocked because an outline citation is stale or unverifiable." };
  }
  const rebuilt = buildPublicStewardPacket({
    source,
    topicIds: selectedTopicIds,
    runtimeVersion: packet.version,
    createdAt: packet.createdAt,
  });
  if (!rebuilt || rebuilt.id !== packet.id || rebuilt.contentIdentity !== packet.contentIdentity) {
    return { eligible: false, reason: "Packet blocked because its source, template, or citation identity is no longer current." };
  }
  return { eligible: true };
}

function numbered(title: string, values: string[]): string {
  return [title, ...values.map((value, index) => `${index + 1}. ${value}`)].join("\n");
}

export function publicStewardPacketTopicSummaryText(
  packet: PublicStewardPacket,
  topic: PublicStewardPacketTopicSummary
): string {
  const storedOutline = packet.outlines.find(
    (outline) => outline.template === topic.topicId
  );
  return `${topic.title} — Article ${topic.primaryArticle}; ${topic.supportedScope} Separate verification: ${topic.separateVerification}${storedOutline ? ` Issue: ${storedOutline.issue}` : ""}`;
}

export function publicStewardPacketToText(packet: PublicStewardPacket): string {
  return [
    packet.title,
    `Saved type: ${packet.savedType}`,
    `Topics: ${packet.selectedTopicIds.join(", ")}`,
    `Templates: ${packet.templateVersions.join(", ")}`,
    `Provider: ${packet.provider}`,
    `Prompt: ${packet.promptVersion}`,
    `Build: ${packet.buildIdentity}`,
    `Source instance: ${packet.sourceInstanceIds.join(", ")}`,
    packet.privateCaseWarning,
    numbered("1. Selected topic summary", packet.topicSummaries.map(
      (topic) => publicStewardPacketTopicSummaryText(packet, topic)
    )),
    numbered("2. Governing public articles and verified citations", packet.governingContractLanguage.map((entry) => entry.text)),
    numbered("3. Cross-topic overlap or conflict notes", packet.overlapConflictNotes),
    numbered("4. Combined facts-to-confirm checklist", packet.factsToConfirm),
    numbered("5. Combined evidence-category checklist", packet.evidenceChecklist.map((entry) => entry.text)),
    numbered("6. Combined management-question checklist", packet.managementQuestions),
    numbered("7. Conditional Step 1 preparation outline", packet.stepOnePreparation.map((entry) => entry.text)),
    numbered("8. Procedural and timeliness caveats", packet.procedureCaveats.map((entry) => entry.text)),
    numbered("9. Step 2 or escalation readiness checklist", packet.escalationReadiness.map((entry) => entry.text)),
    numbered("10. Limitations and unsupported scope", packet.limitations.map((entry) => entry.text)),
    numbered("11. Complete verified-current source appendix", packet.sourceAppendix.map(
      (source) => `Article ${source.articleNumber} / ${source.section} / ${source.paragraphId} / ${source.verificationState} / source instance ${source.sourceInstanceId} / paragraph ${source.paragraphContentSha256} / anchor ${source.citationAnchorSha256}`
    )),
  ].join("\n\n");
}

export function publicStewardPacketToMarkdown(packet: PublicStewardPacket): string {
  const section = (title: string, values: string[]) =>
    `## ${title}\n\n${values.map((value) => `- ${value}`).join("\n")}`;
  return [
    `# ${packet.title}`,
    `- Saved type: ${packet.savedType}`,
    `- Topics: ${packet.selectedTopicIds.join(", ")}`,
    `- Templates: ${packet.templateVersions.join(", ")}`,
    `- Provider: ${packet.provider}`,
    `- Prompt: ${packet.promptVersion}`,
    `- Build: ${packet.buildIdentity}`,
    `- Source instance: ${packet.sourceInstanceIds.join(", ")}`,
    `> ${packet.privateCaseWarning}`,
    section("1. Selected topic summary", packet.topicSummaries.map(
      (topic) => publicStewardPacketTopicSummaryText(packet, topic)
    )),
    section("2. Governing public articles and verified citations", packet.governingContractLanguage.map((entry) => entry.text)),
    section("3. Cross-topic overlap or conflict notes", packet.overlapConflictNotes),
    section("4. Combined facts-to-confirm checklist", packet.factsToConfirm),
    section("5. Combined evidence-category checklist", packet.evidenceChecklist.map((entry) => entry.text)),
    section("6. Combined management-question checklist", packet.managementQuestions),
    section("7. Conditional Step 1 preparation outline", packet.stepOnePreparation.map((entry) => entry.text)),
    section("8. Procedural and timeliness caveats", packet.procedureCaveats.map((entry) => entry.text)),
    section("9. Step 2 or escalation readiness checklist", packet.escalationReadiness.map((entry) => entry.text)),
    section("10. Limitations and unsupported scope", packet.limitations.map((entry) => entry.text)),
    section("11. Complete verified-current source appendix", packet.sourceAppendix.map(
      (source) => `Article ${source.articleNumber} / ${source.section} / ${source.paragraphId} / ${source.verificationState} / source instance ${source.sourceInstanceId} / paragraph ${source.paragraphContentSha256} / anchor ${source.citationAnchorSha256}`
    )),
  ].join("\n\n");
}
