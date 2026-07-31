import { buildCbaAnswer } from "@/lib/cbaAnswer";
import {
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SOURCE_ID,
  type CbaSourceCache,
} from "@/lib/cbaSource";
import { canonicalJson, sha256Hex, verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import {
  buildPublicGrievanceOutline,
  PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING,
  publicGrievanceOutlineExportEligibility,
  type CitedGrievanceOutlineItem,
  type EvidenceRequestItem,
} from "@/lib/publicGrievanceOutline";
import {
  publicStewardWorkflowTopic,
  type PublicStewardWorkflowTopicId,
} from "@/lib/publicStewardWorkflowRegistry";
import type { Citation } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export const PUBLIC_STEWARD_ARGUMENT_PLAN_PHASE =
  "KIA-Stick-public-steward-workflow-platform-bundle-3-topic-argument-plans-and-evidence-checklists" as const;
export const PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE = "public_steward_argument_plan" as const;
export const PUBLIC_STEWARD_ARGUMENT_PLAN_PRIVATE_WARNING =
  "Case-neutral public-source argument plan only. Do not enter names, dates, case facts, medical information, personnel data, financial facts, or grievance documents." as const;

export interface PublicStewardArgumentPlan {
  id: string;
  contentIdentity: string;
  savedType: typeof PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE;
  topicId: PublicStewardWorkflowTopicId;
  topic: string;
  title: string;
  issueSummary: string;
  governingContractLanguage: CitedGrievanceOutlineItem[];
  factsToConfirm: string[];
  evidenceRequests: EvidenceRequestItem[];
  managementQuestions: string[];
  argumentSteps: CitedGrievanceOutlineItem[];
  procedureCaveats: CitedGrievanceOutlineItem[];
  escalationReadiness: CitedGrievanceOutlineItem[];
  limitations: CitedGrievanceOutlineItem[];
  citations: Citation[];
  provider: typeof CBA_PROVIDER;
  promptVersion: typeof CBA_PROMPT_VERSION;
  publicSourceIds: [typeof CBA_SOURCE_ID];
  sourceInstanceIds: string[];
  buildIdentity: string;
  version: RuntimeVersion;
  privateCaseWarning: typeof PUBLIC_STEWARD_ARGUMENT_PLAN_PRIVATE_WARNING;
  createdAt: string;
}

function uniqueCitationIds(items: CitedGrievanceOutlineItem[]): string[] {
  return [...new Set(items.flatMap((entry) => entry.citationIds))].sort();
}

function step(text: string, items: CitedGrievanceOutlineItem[]): CitedGrievanceOutlineItem {
  return { text, citationIds: uniqueCitationIds(items) };
}

export function buildPublicStewardArgumentPlan(input: {
  source: CbaSourceCache | null;
  topicId: PublicStewardWorkflowTopicId;
  runtimeVersion: RuntimeVersion;
  createdAt?: string;
}): PublicStewardArgumentPlan | null {
  if (!input.source) return null;
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
  const outline = buildPublicGrievanceOutline({
    answer,
    source: input.source,
    createdAt: input.createdAt,
  });
  if (!outline || !publicGrievanceOutlineExportEligibility(outline, input.source).eligible) return null;

  const allTopicRules = outline.governingContractLanguage;
  const allProcedureRules = [
    ...outline.timelinessAndProcedureLimits,
    ...outline.escalationReadiness,
  ];
  const core = {
    savedType: PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE,
    topicId: topic.id,
    topic: topic.displayName,
    title: `Public ${topic.displayName.toLowerCase()} cited argument plan`,
    issueSummary: outline.issue,
    governingContractLanguage: outline.governingContractLanguage,
    factsToConfirm: outline.factsToConfirm,
    evidenceRequests: outline.evidenceRequests,
    managementQuestions: outline.questionsForManagement,
    argumentSteps: [
      step(
        `Confirm that the employee, event, and requested analysis fall within the bounded ${topic.displayName.toLowerCase()} scope before applying Article ${topic.sourceSufficiency.primaryArticle}.`,
        allTopicRules
      ),
      step(
        "Identify the exact verified contract language that may govern, while keeping local authority and unknown facts separately labeled.",
        allTopicRules
      ),
      step(
        "Confirm the neutral fact categories and obtain the relevant records through the proper union process without assuming a record exists or who possesses it.",
        [...outline.elementsToEstablish, ...outline.evidenceToRequest]
      ),
      step(
        "Ask management the prepared case-neutral questions and compare the response with the verified contract language.",
        [...allTopicRules, ...outline.stepOneArgument]
      ),
      step(
        "Frame the Step 1 position conditionally: state the confirmed facts, the particular verified provisions, disputed points, and a supported remedy category without declaring a predetermined violation or outcome.",
        outline.stepOneArgument
      ),
      step(
        "Confirm the applicable timing trigger, procedure, and any topic-specific route through the proper local union process before filing or escalating.",
        allProcedureRules
      ),
      step(
        "Escalate only when facts, contentions, contract provisions, evidence categories, and a conditional remedy are ready; do not use unverified contact information.",
        outline.escalationReadiness
      ),
    ],
    procedureCaveats: outline.timelinessAndProcedureLimits,
    escalationReadiness: outline.escalationReadiness,
    limitations: [
      ...outline.limitations,
      {
        text: PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING,
        citationIds: uniqueCitationIds(outline.escalationReadiness),
      },
    ],
    citations: outline.citations,
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
    publicSourceIds: [CBA_SOURCE_ID] as [typeof CBA_SOURCE_ID],
    sourceInstanceIds: outline.sourceInstanceIds,
    buildIdentity: input.runtimeVersion.displayVersion,
    version: input.runtimeVersion,
    privateCaseWarning: PUBLIC_STEWARD_ARGUMENT_PLAN_PRIVATE_WARNING,
  };
  const stableIdentity = sha256Hex(canonicalJson({
    savedType: core.savedType,
    topicId: core.topicId,
    publicSourceIds: core.publicSourceIds,
    sourceInstanceIds: core.sourceInstanceIds,
  }));
  const contentIdentity = sha256Hex(JSON.stringify({
    ...core,
    citations: core.citations.map((citation) => ({
      id: citation.id,
      sourceInstanceId: citation.sourceInstanceId ?? "",
      paragraphContentSha256: citation.paragraphContentSha256 ?? "",
      citationAnchorSha256: citation.citationAnchorSha256 ?? "",
      citationVerificationState: citation.citationVerificationState ?? "",
    })),
  }));
  return {
    ...core,
    id: `public-steward-argument-plan-${stableIdentity.slice(0, 20)}`,
    contentIdentity,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function publicStewardArgumentPlanExportEligibility(
  plan: PublicStewardArgumentPlan,
  source: CbaSourceCache | null
): { eligible: true } | { eligible: false; reason: string } {
  if (!source) return { eligible: false, reason: "Argument plan blocked because the current CBA cache is unavailable." };
  if (
    plan.citations.length === 0 ||
    plan.citations.some(
      (citation) =>
        citation.citationVerificationState !== "verified_current" ||
        verifyCbaCitation(citation, source).state !== "verified_current"
    )
  ) {
    return { eligible: false, reason: "Argument plan blocked because a CBA citation is stale or unverifiable." };
  }
  const rebuilt = buildPublicStewardArgumentPlan({
    source,
    topicId: plan.topicId,
    runtimeVersion: plan.version,
    createdAt: plan.createdAt,
  });
  if (!rebuilt || rebuilt.id !== plan.id || rebuilt.contentIdentity !== plan.contentIdentity) {
    return { eligible: false, reason: "Argument plan blocked because its topic, source, or citation identity is no longer current." };
  }
  return { eligible: true };
}

function numbered(title: string, values: string[]): string {
  return [title, ...values.map((value, index) => `${index + 1}. ${value}`)].join("\n");
}

export function publicStewardArgumentPlanToText(plan: PublicStewardArgumentPlan): string {
  return [
    plan.title,
    `Topic: ${plan.topic}`,
    `Provider: ${plan.provider}`,
    `Prompt: ${plan.promptVersion}`,
    `Build: ${plan.buildIdentity}`,
    `Source instance: ${plan.sourceInstanceIds.join(", ")}`,
    plan.privateCaseWarning,
    `1. Issue\n${plan.issueSummary}`,
    numbered("2. Governing contract language", plan.governingContractLanguage.map((entry) => entry.text)),
    numbered("3. Facts to confirm", plan.factsToConfirm),
    numbered("4. Structured evidence or record requests", plan.evidenceRequests.map(
      (entry) => `${entry.document} Request from: ${entry.requestFrom} Why it matters: ${entry.whyItMatters}`
    )),
    numbered("5. Questions for management", plan.managementQuestions),
    numbered("6. Step-by-step argument", plan.argumentSteps.map((entry) => entry.text)),
    numbered("7. Procedure and timing cautions", plan.procedureCaveats.map((entry) => entry.text)),
    numbered("8. Escalation readiness", plan.escalationReadiness.map((entry) => entry.text)),
    numbered("9. Limitations and unsupported scope", plan.limitations.map((entry) => entry.text)),
  ].join("\n\n");
}

export function publicStewardArgumentPlanToMarkdown(plan: PublicStewardArgumentPlan): string {
  const section = (title: string, values: string[]) =>
    `## ${title}\n\n${values.map((value) => `- ${value}`).join("\n")}`;
  return [
    `# ${plan.title}`,
    `- Topic: ${plan.topic}`,
    `- Provider: ${plan.provider}`,
    `- Prompt: ${plan.promptVersion}`,
    `- Build: ${plan.buildIdentity}`,
    `- Source instance: ${plan.sourceInstanceIds.join(", ")}`,
    `> ${plan.privateCaseWarning}`,
    `## 1. Issue\n\n${plan.issueSummary}`,
    section("2. Governing contract language", plan.governingContractLanguage.map((entry) => entry.text)),
    section("3. Facts to confirm", plan.factsToConfirm),
    section("4. Structured evidence or record requests", plan.evidenceRequests.map(
      (entry) => `**Document or record:** ${entry.document}  \n**Request from:** ${entry.requestFrom}  \n**Why it matters:** ${entry.whyItMatters}`
    )),
    section("5. Questions for management", plan.managementQuestions),
    section("6. Step-by-step argument", plan.argumentSteps.map((entry) => entry.text)),
    section("7. Procedure and timing cautions", plan.procedureCaveats.map((entry) => entry.text)),
    section("8. Escalation readiness", plan.escalationReadiness.map((entry) => entry.text)),
    section("9. Limitations and unsupported scope", plan.limitations.map((entry) => entry.text)),
  ].join("\n\n");
}
