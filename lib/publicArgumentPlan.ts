import type { AnswerResult } from "@/lib/answerGovernor";
import { canonicalJson, sha256Hex } from "@/lib/cbaCitationIntegrity";
import {
  PUBLIC_SOURCE_APPLICABILITY_WARNING,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_PROMPT_VERSION,
  PUBLIC_SOURCE_PROVIDER,
  type PublicSourceCache,
} from "@/lib/publicSource";
import { citationForPublicParagraph } from "@/lib/publicSourceAnswer";
import { verifyPublicCitation } from "@/lib/publicCitationIntegrity";
import type { Citation } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export const PUBLIC_ARGUMENT_BUILDER_PHASE = "KIA-Stick-public-Weingarten-cited-argument-builder-pilot" as const;
export const PUBLIC_ARGUMENT_PLAN_TYPE = "weingarten_investigatory_interview" as const;
export const PUBLIC_ARGUMENT_PLAN_SAVED_TYPE = "public_argument_plan" as const;
export const PUBLIC_ARGUMENT_PLAN_PRIVATE_WARNING = "Do not enter private case details in this public pilot." as const;

export interface CitedArgumentPlanItem {
  text: string;
  citationIds: string[];
}

export const PUBLIC_ARGUMENT_PLAN_PREPARATION_WARNING = "Generic preparation prompts only. Citations explain relevance to the interview framework; they do not establish a right to obtain records, a request deadline, or a disclosure duty. Private data and formal case-specific RFI generation remain blocked." as const;

export interface PublicArgumentPlan {
  id: string;
  contentIdentity: string;
  savedType: typeof PUBLIC_ARGUMENT_PLAN_SAVED_TYPE;
  type: typeof PUBLIC_ARGUMENT_PLAN_TYPE;
  topic: "Weingarten rights";
  title: string;
  issueSummary: string;
  sourceRule: CitedArgumentPlanItem;
  thresholdElements: CitedArgumentPlanItem[];
  factsToConfirm: string[];
  memberActions: CitedArgumentPlanItem[];
  stewardActions: CitedArgumentPlanItem[];
  employerQuestions: string[];
  // Optional so historical saved plans remain readable without inventing new content.
  evidenceRequestPreparation?: CitedArgumentPlanItem[];
  postInterviewFollowUp?: CitedArgumentPlanItem[];
  argumentSteps: CitedArgumentPlanItem[];
  escalationTriggers: CitedArgumentPlanItem[];
  limitations: CitedArgumentPlanItem[];
  citations: Citation[];
  privateCaseWarning: typeof PUBLIC_ARGUMENT_PLAN_PRIVATE_WARNING;
  createdAt: string;
  provider: typeof PUBLIC_SOURCE_PROVIDER;
  promptVersion: typeof PUBLIC_SOURCE_PROMPT_VERSION;
  buildIdentity: string;
  version: RuntimeVersion;
  sourceInstanceIds: string[];
}

export type PublicArgumentPlanEligibility =
  | { eligible: true; citations: Citation[] }
  | {
      eligible: false;
      reason:
        | "not_public_weingarten"
        | "no_answer"
        | "provider_mismatch"
        | "cache_unavailable"
        | "missing_verified_answer_citation"
        | "missing_verified_plan_source";
    };

function isWeingartenArgumentIntent(question: string): boolean {
  const normalized = question.toLowerCase();
  if (/\bweingarten\b/.test(normalized)) return true;
  if (/\b(?:investigatory|investigative)\s+interview\b/.test(normalized)) return true;
  return /\b(steward|union representative|union representation)\b/.test(normalized) &&
    /\b(request|question|interview|investigat|disciplin|role|assist)\b/.test(normalized);
}

function findCitation(source: PublicSourceCache, patterns: RegExp[]): Citation | null {
  for (const pattern of patterns) {
    for (const section of source.normalized.sections) {
      const paragraph = section.paragraphs.find((candidate) => pattern.test(candidate.text));
      if (paragraph) return citationForPublicParagraph(source, section, paragraph);
    }
  }
  return null;
}

interface RequiredPlanCitationSet {
  represented: Citation;
  questioning: Citation;
  investigativePurpose: Citation;
  reasonableBelief: Citation;
  employeeRequest: Citation;
  representativeRoleSummary: Citation;
  representativeActions: Citation;
  representativeConduct: Citation;
  representativeFalseAnswers: Citation;
}

function requiredPlanCitationSet(source: PublicSourceCache): RequiredPlanCitationSet | null {
  const citations = {
    represented: findCitation(source, [/union-represented employees/i, /protects represented employees/i, /represented employee/i]),
    questioning: findCitation(source, [/seeking to question an employee/i, /investigatory interview occurs when/i]),
    investigativePurpose: findCitation(source, [/questioning is part of an investigation/i, /investigatory interview occurs when/i]),
    reasonableBelief: findCitation(source, [/reasonably believes.*(?:discipline|discharge|adverse consequence)/i]),
    employeeRequest: findCitation(source, [/employee requests a union representative/i, /employees.*upon request.*representative present/i]),
    representativeRoleSummary: findCitation(source, [/serve as advisors and witnesses/i]),
    representativeActions: findCitation(source, [/clarify questions.*(?:limited advice|advice)/i, /may ask the employer to clarify questions/i]),
    representativeConduct: findCitation(source, [/must remain civil.*may not interfere/i, /remain civil.*legitimate.*investigation/i]),
    representativeFalseAnswers: findCitation(source, [/may not tell an employee what to say.*false answers/i, /may not advise false answers/i]),
  };
  if (Object.values(citations).some((citation) => !citation)) return null;
  return citations as RequiredPlanCitationSet;
}

function requiredPlanCitations(source: PublicSourceCache): Citation[] | null {
  const citationSet = requiredPlanCitationSet(source);
  if (!citationSet) return null;
  return [...new Map(Object.values(citationSet).map((citation) => [citation.id, citation])).values()];
}

export function publicArgumentPlanEligibility(input: {
  answer: AnswerResult;
  source: PublicSourceCache | null;
}): PublicArgumentPlanEligibility {
  const { answer, source } = input;
  if (
    answer.answerKind !== "public" ||
    answer.publicSourceRole !== "nlrb_guidance" ||
    !isWeingartenArgumentIntent(answer.question)
  ) return { eligible: false, reason: "not_public_weingarten" };
  if (answer.noAnswer) return { eligible: false, reason: "no_answer" };
  if (answer.version.provider !== PUBLIC_SOURCE_PROVIDER || answer.version.promptVersion !== PUBLIC_SOURCE_PROMPT_VERSION) {
    return { eligible: false, reason: "provider_mismatch" };
  }
  if (!source) return { eligible: false, reason: "cache_unavailable" };
  const answerCitations = answer.citations.filter(
    (citation) => citation.sourceId === PUBLIC_SOURCE_ID && citation.publicSourceType === "nlrb_guidance"
  );
  if (
    answerCitations.length === 0 ||
    answerCitations.some((citation) => (
      citation.citationVerificationState !== "verified_current" ||
      verifyPublicCitation(citation, source).state !== "verified_current"
    ))
  ) return { eligible: false, reason: "missing_verified_answer_citation" };
  const citations = requiredPlanCitations(source);
  if (!citations || citations.some((citation) => verifyPublicCitation(citation, source).state !== "verified_current")) {
    return { eligible: false, reason: "missing_verified_plan_source" };
  }
  return { eligible: true, citations };
}

function item(text: string, citations: Citation[]): CitedArgumentPlanItem {
  return { text, citationIds: [...new Set(citations.map((citation) => citation.id))] };
}

export function buildPublicArgumentPlan(input: {
  answer: AnswerResult;
  source: PublicSourceCache | null;
  createdAt?: string;
}): PublicArgumentPlan | null {
  const eligibility = publicArgumentPlanEligibility(input);
  if (!eligibility.eligible) return null;
  const required = input.source ? requiredPlanCitationSet(input.source) : null;
  if (!required) return null;
  const citations = eligibility.citations;
  const represented = [required.represented];
  const questioning = [required.questioning];
  const investigativePurpose = [required.investigativePurpose];
  const reasonableBelief = [required.reasonableBelief];
  const employeeRequest = [required.employeeRequest];
  const representativeRole = [required.representativeRoleSummary, required.representativeActions];
  const representativeLimits = [required.representativeConduct, required.representativeFalseAnswers];
  const conditionCitations = [...new Set([...represented, ...questioning, ...investigativePurpose, ...reasonableBelief, ...employeeRequest])];
  const allRoleCitations = [...new Set([...representativeRole, ...representativeLimits])];

  const core = {
    savedType: PUBLIC_ARGUMENT_PLAN_SAVED_TYPE,
    type: PUBLIC_ARGUMENT_PLAN_TYPE,
    topic: "Weingarten rights" as const,
    title: "Public Weingarten cited argument plan",
    issueSummary: "Use this generic public-source framework to determine what still must be confirmed before making a fact-specific Weingarten argument.",
    sourceRule: item(
      "A union-represented employee may request representation during management questioning that is part of an investigation when the employee reasonably believes discipline or another adverse job consequence may result. The employee must make the request.",
      conditionCitations
    ),
    thresholdElements: [
      item("The employee is represented by a union.", represented),
      item("Management or a supervisor is seeking to question the employee as part of an investigation, not merely conducting every ordinary workplace conversation.", [...questioning, ...investigativePurpose]),
      item("The employee reasonably believes the questioning may result in discipline, discharge, or another adverse job consequence.", reasonableBelief),
      item("The employee makes the request for a union representative.", employeeRequest),
    ],
    factsToConfirm: [
      "Whether management is seeking answers or only communicating an instruction, policy, or already-made decision.",
      "Whether the questions concern the employee's performance or work conduct.",
      "Why the employee reasonably believes the answers could lead to discipline or another adverse job consequence.",
      "Whether the employee is union-represented and personally requested representation.",
      "How management responded to the request. Keep any private details outside this public pilot.",
    ],
    memberActions: [
      item("Clearly request a union representative; the employee must make the request.", employeeRequest),
      item("Confirm that the meeting involves investigative questioning and a reasonable concern about discipline before relying on this framework.", [...questioning, ...investigativePurpose, ...reasonableBelief]),
      item("Answer truthfully and do not rely on anyone to direct false answers.", representativeLimits),
    ],
    stewardActions: [
      item("Act as an advisor and witness, seek clarification, give limited advice about answering, and add relevant information after questioning.", representativeRole),
      item("Remain civil, do not obstruct legitimate investigation steps, and do not tell the employee what to say or advise false answers.", representativeLimits),
    ],
    employerQuestions: [
      "What is the purpose and subject of this meeting?",
      "Is management seeking answers as part of an investigation into performance or work conduct?",
      "Could the employee's answers be used as a basis for discipline or another adverse job consequence?",
      "Will management pause the questioning so the requested representative may be present?",
      "If representation is denied, will management end the interview or continue questioning?",
    ],
    evidenceRequestPreparation: [
      item("Meeting purpose and scope: identify categories such as meeting notices, stated subjects, and questions that would help distinguish investigative questioning from instructions or an already-made decision.", [...questioning, ...investigativePurpose]),
      item("Representation request and response: identify the request, its sequence relative to questioning, management's response, and whether a representative was present as categories to review outside this pilot.", employeeRequest),
      item("Basis for concern about discipline: identify categories of statements or notices relevant to the employee's reasonable belief, without assuming discipline occurred.", reasonableBelief),
      item("Representative participation: identify categories covering opportunities to clarify questions, offer limited advice, and add information, together with any participation limits described.", allRoleCitations),
      item("Unresolved information categories: distinguish what is known, disputed, and missing before discussing possible information requests with the designated union representative. Do not draft or submit a formal case-specific RFI in this pilot.", conditionCitations),
    ],
    postInterviewFollowUp: [
      item("Review the interview sequence outside this pilot: distinguish observed questioning, the representation request, management's response, and unresolved facts from assumptions. Do not enter notes or private records here.", [...questioning, ...employeeRequest]),
      item("Identify any clarification or additional information for discussion with the representative, consistent with the bounded advisor-and-witness role and truthful answers.", allRoleCitations),
      item("Revisit each threshold condition and mark uncertainties for union review; this framework does not determine whether a violation occurred.", conditionCitations),
      item("If denial, continued questioning, threatened discipline, or suspected retaliation remains a concern, seek follow-up through the local or designated union representative. Confirm any applicable procedure or deadline independently; this plan supplies neither a filing deadline nor a remedy determination.", conditionCitations),
    ],
    argumentSteps: [
      item("Identify the management questioning and explain why it appears investigatory rather than an ordinary workplace conversation.", [...questioning, ...investigativePurpose]),
      item("State the facts that support a reasonable belief that discipline or another adverse job consequence may result, without assuming the outcome.", reasonableBelief),
      item("Confirm that the employee personally requested union representation.", employeeRequest),
      item("Describe the representative's bounded advisor-and-witness role without claiming authority to disrupt the investigation or direct answers.", allRoleCitations),
      item("Keep the conclusion conditional: the verified public rule supplies a framework, but unknown case facts do not establish that management violated the law.", conditionCitations),
    ],
    escalationTriggers: [
      item("Stop relying on this generic pilot and escalate through the local or designated union representative if representation is denied, questioning continues, urgent discipline is threatened, or retaliation is suspected.", conditionCitations),
      item("A verified national contact-directory source is not included in this pilot.", conditionCitations),
    ],
    limitations: [
      item("Not every ordinary workplace conversation is an investigatory interview; the questioning, investigative purpose, and reasonable discipline concern still must be confirmed.", [...questioning, ...investigativePurpose, ...reasonableBelief]),
      item("This plan does not decide disputed facts or state that management definitely violated the law.", conditionCitations),
      item(PUBLIC_SOURCE_APPLICABILITY_WARNING, conditionCitations),
      item("No CBA article is asserted by this plan, and no national contact details are supplied.", conditionCitations),
      item("This public pilot does not replace local union advice or legal advice.", conditionCitations),
    ],
    citations,
    privateCaseWarning: PUBLIC_ARGUMENT_PLAN_PRIVATE_WARNING,
    provider: PUBLIC_SOURCE_PROVIDER,
    promptVersion: PUBLIC_SOURCE_PROMPT_VERSION,
    buildIdentity: input.answer.version.displayVersion,
    version: input.answer.version,
    sourceInstanceIds: [...new Set(citations.map((citation) => citation.sourceInstanceId).filter((value): value is string => Boolean(value)))],
  };
  const stablePlanIdentity = sha256Hex(canonicalJson({
    sourceIds: citations.map((citation) => citation.sourceId ?? ""),
    topic: core.topic,
    type: core.type,
  }));
  const contentIdentity = sha256Hex(JSON.stringify({
    ...core,
    citations: citations.map((citation) => ({
      citationAnchorSha256: citation.citationAnchorSha256 ?? "",
      citationVerificationState: citation.citationVerificationState ?? "",
      id: citation.id,
      paragraphContentSha256: citation.paragraphContentSha256 ?? "",
      sourceInstanceId: citation.sourceInstanceId ?? "",
    })),
  }));
  return {
    ...core,
    id: `public-argument-plan-${stablePlanIdentity.slice(0, 16)}`,
    contentIdentity,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function publicArgumentPlanToText(plan: PublicArgumentPlan): string {
  const render = (title: string, entries: Array<CitedArgumentPlanItem | string>) => [
    title,
    ...entries.map((entry, index) => `${index + 1}. ${typeof entry === "string" ? entry : entry.text}`),
  ].join("\n");
  return [
    plan.title,
    `Issue\n${plan.issueSummary}`,
    `Governing public rule\n${plan.sourceRule.text}`,
    render("Conditions that must be present", plan.thresholdElements),
    render("Facts to confirm", plan.factsToConfirm),
    render("Immediate member actions", plan.memberActions),
    render("Steward actions", plan.stewardActions),
    render("Questions to ask management", plan.employerQuestions),
    render("Step-by-step argument", plan.argumentSteps),
    ...(plan.evidenceRequestPreparation ? [PUBLIC_ARGUMENT_PLAN_PREPARATION_WARNING, render("Evidence / RFI-request preparation categories", plan.evidenceRequestPreparation)] : []),
    ...(plan.postInterviewFollowUp ? [render("Post-interview follow-up", plan.postInterviewFollowUp)] : []),
    render("Escalation triggers", plan.escalationTriggers),
    render("Limitations and uncertainty", plan.limitations),
    plan.privateCaseWarning,
  ].join("\n\n");
}
