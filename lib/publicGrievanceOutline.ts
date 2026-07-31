import type { AnswerResult } from "@/lib/answerGovernor";
import { citationForCbaParagraph } from "@/lib/cbaAnswer";
import {
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SOURCE_ID,
  CBA_SOURCE_PAGE_URL,
  CBA_SOURCE_PDF_URL,
  type CbaParagraph,
  type CbaSourceCache,
} from "@/lib/cbaSource";
import { canonicalJson, sha256Hex, verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import type { Citation } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";
import {
  PUBLIC_STEWARD_WORKFLOW_PHASE,
  detectPublicStewardWorkflowTopic,
  publicStewardWorkflowTopic,
  topicParagraphs,
  type PublicStewardWorkflowTopic,
  type PublicStewardWorkflowTopicId,
} from "@/lib/publicStewardWorkflowRegistry";

export const PUBLIC_GRIEVANCE_OUTLINE_PHASE =
  PUBLIC_STEWARD_WORKFLOW_PHASE;
export const PUBLIC_GRIEVANCE_OUTLINE_TYPES = {
  annual_leave: "annual_leave_denial_or_scheduling",
  overtime: "overtime_assignment_or_distribution",
  holiday_scheduling: "holiday_scheduling_or_assignment",
  safety_health: "unsafe_or_unhealthful_condition",
  discipline_just_cause: "discipline_or_just_cause",
  sick_leave: "sick_leave_administration",
  higher_level_assignments: "higher_level_assignment_or_detail",
  uniforms_work_clothes: "uniform_or_work_clothes_administration",
  employee_claims: "employee_property_claim",
  steward_grievance_handling: "steward_grievance_handling",
} as const;
export type PublicGrievanceOutlineTemplate = PublicStewardWorkflowTopicId;
export type PublicGrievanceOutlineType =
  (typeof PUBLIC_GRIEVANCE_OUTLINE_TYPES)[PublicGrievanceOutlineTemplate];
export const PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE = "public_grievance_outline" as const;
export const PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING =
  "Do not enter private case details in this public pilot." as const;

export interface CitedGrievanceOutlineItem {
  text: string;
  citationIds: string[];
}

export interface EvidenceRequestItem {
  document: string;
  requestFrom: string;
  whyItMatters: string;
  citationIds: string[];
}

export const PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING =
  "A verified national or official contact-directory source is not included. Use the proper local union process and do not rely on unverified contact information." as const;

export interface PublicGrievanceOutline {
  id: string;
  contentIdentity: string;
  savedType: typeof PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE;
  type: PublicGrievanceOutlineType;
  template: PublicGrievanceOutlineTemplate;
  templateId: `public-grievance-outline.${PublicStewardWorkflowTopicId}.v1`;
  topic: string;
  title: string;
  issue: string;
  governingContractLanguage: CitedGrievanceOutlineItem[];
  elementsToEstablish: CitedGrievanceOutlineItem[];
  factsToConfirm: string[];
  evidenceToRequest: CitedGrievanceOutlineItem[];
  evidenceRequests: EvidenceRequestItem[];
  questionsForManagement: string[];
  stepOneArgument: CitedGrievanceOutlineItem[];
  possibleRemedies: CitedGrievanceOutlineItem[];
  timelinessAndProcedureLimits: CitedGrievanceOutlineItem[];
  escalationReadiness: CitedGrievanceOutlineItem[];
  limitations: CitedGrievanceOutlineItem[];
  citations: Citation[];
  privateCaseWarning: typeof PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING;
  createdAt: string;
  provider: typeof CBA_PROVIDER;
  promptVersion: typeof CBA_PROMPT_VERSION;
  buildIdentity: string;
  version: RuntimeVersion;
  sourceInstanceIds: string[];
}

export type PublicGrievanceOutlineEligibility =
  | {
      eligible: true;
      citations: Citation[];
      template: PublicGrievanceOutlineTemplate;
    }
  | {
      eligible: false;
      reason:
        | "not_supported_public_grievance_topic"
        | "no_answer"
        | "provider_mismatch"
        | "cache_unavailable"
        | "missing_verified_answer_citation"
        | "missing_verified_outline_source";
    };

interface RequiredProcedureCitationSet {
  grievanceDefinition: Citation;
  stepOneTiming: Citation;
  stepOneDecisionAndAppeal: Citation;
  stepTwoFactDevelopment: Citation;
}

interface RequiredAnnualLeaveCitationSet extends RequiredProcedureCitationSet {
  schedulingPreference: Citation;
  choicePeriod: Citation;
  vacationPlanning: Citation;
  advanceCommitments: Citation;
}

interface RequiredOvertimeCitationSet extends RequiredProcedureCitationSet {
  assignmentAdministration: Citation;
  voluntarySelectionAndMandatoryRotation: Citation;
  overtimeDesiredListLimits: Citation;
}

type RequiredOutlineCitationSet = RequiredProcedureCitationSet & Record<string, Citation>;

function articleParagraphs(source: CbaSourceCache, articleNumber: string): CbaParagraph[] {
  return source.normalized.pages
    .flatMap((page) => page.paragraphs)
    .filter((paragraph) => paragraph.articleNumber === articleNumber);
}

function findParagraph(
  paragraphs: CbaParagraph[],
  predicate: (paragraph: CbaParagraph) => boolean
): CbaParagraph | null {
  return paragraphs.find(predicate) ?? null;
}

function requiredProcedureCitationSet(source: CbaSourceCache): RequiredProcedureCitationSet | null {
  const article15 = articleParagraphs(source, "15");
  const paragraphs = {
    grievanceDefinition: findParagraph(
      article15,
      (paragraph) =>
        /A grievance is defined as a dispute/i.test(paragraph.text) &&
        /Local Memorandum of Understanding/i.test(paragraph.text)
    ),
    stepOneTiming: findParagraph(
      article15,
      (paragraph) =>
        paragraph.sectionNumber === "2" &&
        paragraph.subsection === "Step 1(a)" &&
        /within fourteen \(14\) days/i.test(paragraph.text)
    ),
    stepOneDecisionAndAppeal: findParagraph(
      article15,
      (paragraph) =>
        paragraph.sectionNumber === "2" &&
        /appeal an adverse decision to Step 2/i.test(paragraph.text) &&
        /remedy sought/i.test(paragraph.text)
    ),
    stepTwoFactDevelopment: findParagraph(
      article15,
      (paragraph) =>
        paragraph.sectionNumber === "2" &&
        /develop all necessary facts/i.test(paragraph.text) &&
        /relevant papers or documents/i.test(paragraph.text)
    ),
  };
  if (Object.values(paragraphs).some((paragraph) => !paragraph)) return null;
  return Object.fromEntries(
    Object.entries(paragraphs).map(([key, paragraph]) => [
      key,
      citationForCbaParagraph(source, paragraph as CbaParagraph),
    ])
  ) as unknown as RequiredProcedureCitationSet;
}

function requiredAnnualLeaveCitationSet(source: CbaSourceCache): RequiredAnnualLeaveCitationSet | null {
  const procedure = requiredProcedureCitationSet(source);
  const article10 = articleParagraphs(source, "10");
  const paragraphs = {
    schedulingPreference: findParagraph(
      article10,
      (paragraph) => paragraph.sectionNumber === "2" && /scheduling annual leave/i.test(paragraph.text)
    ),
    choicePeriod: findParagraph(
      article10,
      (paragraph) =>
        paragraph.sectionNumber === "3" &&
        /choice vacation period/i.test(paragraph.text) &&
        /annual leave shall be granted/i.test(paragraph.text)
    ),
    vacationPlanning: findParagraph(
      article10,
      (paragraph) =>
        paragraph.sectionNumber === "4" &&
        /submission of applications for annual leave/i.test(paragraph.text) &&
        /official notice/i.test(paragraph.text)
    ),
    advanceCommitments: findParagraph(
      article10,
      (paragraph) =>
        paragraph.sectionNumber === "4" &&
        /advance commitments for granting annual leave/i.test(paragraph.text) &&
        /serious emergency/i.test(paragraph.text)
    ),
  };
  if (!procedure || Object.values(paragraphs).some((paragraph) => !paragraph)) return null;
  return {
    ...procedure,
    ...Object.fromEntries(
      Object.entries(paragraphs).map(([key, paragraph]) => [
        key,
        citationForCbaParagraph(source, paragraph as CbaParagraph),
      ])
    ) as Pick<
      RequiredAnnualLeaveCitationSet,
      "schedulingPreference" | "choicePeriod" | "vacationPlanning" | "advanceCommitments"
    >,
  };
}

function requiredOvertimeCitationSet(source: CbaSourceCache): RequiredOvertimeCitationSet | null {
  const procedure = requiredProcedureCitationSet(source);
  const article8 = articleParagraphs(source, "8");
  const paragraphs = {
    assignmentAdministration: findParagraph(
      article8,
      (paragraph) =>
        /scheduled among qualified employees doing similar work/i.test(paragraph.text) &&
        /Overtime Desired List/i.test(paragraph.text)
    ),
    voluntarySelectionAndMandatoryRotation: findParagraph(
      article8,
      (paragraph) =>
        /selected in order of their seniority on a rotating basis/i.test(paragraph.text) &&
        /not on the list may be required to work overtime on a rotating basis/i.test(paragraph.text)
    ),
    overtimeDesiredListLimits: findParagraph(
      article8,
      (paragraph) =>
        /no more than twelve \(12\) hours of work in a day/i.test(paragraph.text) &&
        /not required to utilize employees on the Overtime Desired List at the penalty overtime rate/i.test(paragraph.text)
    ),
  };
  if (!procedure || Object.values(paragraphs).some((paragraph) => !paragraph)) return null;
  return {
    ...procedure,
    ...Object.fromEntries(
      Object.entries(paragraphs).map(([key, paragraph]) => [
        key,
        citationForCbaParagraph(source, paragraph as CbaParagraph),
      ])
    ) as Pick<
      RequiredOvertimeCitationSet,
      "assignmentAdministration" | "voluntarySelectionAndMandatoryRotation" | "overtimeDesiredListLimits"
    >,
  };
}

function requiredOutlineCitationSet(
  source: CbaSourceCache,
  template: PublicGrievanceOutlineTemplate
): RequiredOutlineCitationSet | null {
  if (template === "overtime") {
    return requiredOvertimeCitationSet(source) as RequiredOutlineCitationSet | null;
  }
  if (template === "annual_leave") {
    return requiredAnnualLeaveCitationSet(source) as RequiredOutlineCitationSet | null;
  }
  const procedure = requiredProcedureCitationSet(source);
  const topic = publicStewardWorkflowTopic(template);
  const paragraphs = topicParagraphs(
    source.normalized.pages.flatMap((page) => page.paragraphs),
    topic
  );
  if (!procedure || !paragraphs) return null;
  return {
    ...procedure,
    ...Object.fromEntries(
      [...paragraphs].map(([key, paragraph]) => [
        key,
        citationForCbaParagraph(source, paragraph),
      ])
    ),
  };
}

function requiredOutlineCitations(
  source: CbaSourceCache,
  template: PublicGrievanceOutlineTemplate
): Citation[] | null {
  const citationSet = requiredOutlineCitationSet(source, template);
  if (!citationSet) return null;
  return [...new Map(Object.values(citationSet).map((citation) => [citation.id, citation])).values()];
}

function trustedCurrentCbaCitation(citation: Citation, source: CbaSourceCache): boolean {
  return citation.sourceKind === "public" &&
    citation.sourceId === CBA_SOURCE_ID &&
    citation.publicSourceType === "cba_contract" &&
    citation.file === CBA_SOURCE_PDF_URL &&
    citation.officialUrl === CBA_SOURCE_PDF_URL &&
    citation.officialPdfUrl === CBA_SOURCE_PDF_URL &&
    citation.sourcePageUrl === CBA_SOURCE_PAGE_URL &&
    citation.citationVerificationState === "verified_current" &&
    verifyCbaCitation(citation, source).state === "verified_current";
}

export function publicGrievanceOutlineEligibility(input: {
  answer: AnswerResult;
  source: CbaSourceCache | null;
}): PublicGrievanceOutlineEligibility {
  const { answer, source } = input;
  const template = detectPublicStewardWorkflowTopic(answer.question);
  if (
    answer.answerKind !== "public" ||
    answer.publicSourceRole !== "cba_contract" ||
    !template
  ) return { eligible: false, reason: "not_supported_public_grievance_topic" };
  if (answer.noAnswer) return { eligible: false, reason: "no_answer" };
  if (answer.version.provider !== CBA_PROVIDER || answer.version.promptVersion !== CBA_PROMPT_VERSION) {
    return { eligible: false, reason: "provider_mismatch" };
  }
  if (!source) return { eligible: false, reason: "cache_unavailable" };
  const topic = publicStewardWorkflowTopic(template);
  const answerCitations = answer.citations.filter(
    (citation) =>
      citation.sourceId === CBA_SOURCE_ID &&
      citation.publicSourceType === "cba_contract" &&
      citation.articleNumber === topic.sourceSufficiency.primaryArticle
  );
  if (
    answerCitations.length === 0 ||
    answerCitations.some((citation) => !trustedCurrentCbaCitation(citation, source))
  ) return { eligible: false, reason: "missing_verified_answer_citation" };
  const citations = requiredOutlineCitations(source, template);
  if (
    !citations ||
    citations.some((citation) => !trustedCurrentCbaCitation(citation, source))
  ) return { eligible: false, reason: "missing_verified_outline_source" };
  return { eligible: true, citations, template };
}

function item(text: string, citations: Citation[]): CitedGrievanceOutlineItem {
  return { text, citationIds: [...new Set(citations.map((citation) => citation.id))] };
}

export function evidenceRequestsFromCitedItems(
  items: CitedGrievanceOutlineItem[]
): EvidenceRequestItem[] {
  return items.map((entry) => ({
    document: entry.text,
    requestFrom: /LMOU|handbook|manual|local instruction|practice/i.test(entry.text)
      ? "The custodian of the asserted local authority, through the proper union process."
      : "Management or the appropriate records custodian, through the proper union process.",
    whyItMatters:
      "Use this case-neutral category to compare confirmed facts with the verified public contract language. Its existence, custody, and contents are not assumed.",
    citationIds: [...new Set(entry.citationIds)].sort(),
  }));
}

type PublicGrievanceOutlineCore = Omit<
  PublicGrievanceOutline,
  "id" | "contentIdentity" | "createdAt" | "evidenceRequests"
>;

function finalizePublicGrievanceOutline(
  core: PublicGrievanceOutlineCore,
  createdAt?: string
): PublicGrievanceOutline {
  const escalationCitationIds = [...new Set(
    core.escalationReadiness.flatMap((entry) => entry.citationIds)
  )].sort();
  const normalizedCore = {
    ...core,
    evidenceRequests: evidenceRequestsFromCitedItems(core.evidenceToRequest),
    escalationReadiness: [
      ...core.escalationReadiness,
      {
        text: PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING,
        citationIds: escalationCitationIds,
      },
    ],
  };
  const stableOutlineIdentity = sha256Hex(
    canonicalJson({
      sourceIds: normalizedCore.citations.map((citation) => citation.sourceId ?? ""),
      template: normalizedCore.template,
      topic: normalizedCore.topic,
      type: normalizedCore.type,
    })
  );
  const contentIdentity = sha256Hex(
    JSON.stringify({
      ...normalizedCore,
      citations: normalizedCore.citations.map((citation) => ({
        citationAnchorSha256: citation.citationAnchorSha256 ?? "",
        citationVerificationState: citation.citationVerificationState ?? "",
        id: citation.id,
        paragraphContentSha256: citation.paragraphContentSha256 ?? "",
        sourceInstanceId: citation.sourceInstanceId ?? "",
      })),
    })
  );
  return {
    ...normalizedCore,
    id: `public-grievance-outline-${stableOutlineIdentity.slice(0, 16)}`,
    contentIdentity,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

export function buildPublicGrievanceOutline(input: {
  answer: AnswerResult;
  source: CbaSourceCache | null;
  createdAt?: string;
}): PublicGrievanceOutline | null {
  const eligibility = publicGrievanceOutlineEligibility(input);
  if (!eligibility.eligible || !input.source) return null;
  if (
    eligibility.template !== "annual_leave" &&
    eligibility.template !== "overtime"
  ) {
    return buildRegistryGrievanceOutline(
      { answer: input.answer, source: input.source, createdAt: input.createdAt },
      publicStewardWorkflowTopic(eligibility.template),
      eligibility.citations
    );
  }
  if (eligibility.template === "overtime") {
    return buildOvertimeGrievanceOutline(
      { answer: input.answer, source: input.source, createdAt: input.createdAt },
      eligibility.citations
    );
  }
  const required = requiredAnnualLeaveCitationSet(input.source);
  if (!required) return null;

  const citations = eligibility.citations;
  const scheduling = [required.schedulingPreference];
  const choice = [required.choicePeriod];
  const planning = [required.vacationPlanning];
  const commitment = [required.advanceCommitments];
  const article10 = [required.schedulingPreference, required.choicePeriod, required.vacationPlanning, required.advanceCommitments];
  const grievanceDefinition = [required.grievanceDefinition];
  const stepOneTiming = [required.stepOneTiming];
  const stepOneDecisionAndAppeal = [required.stepOneDecisionAndAppeal];
  const stepTwoDevelopment = [required.stepTwoFactDevelopment];

  const core: PublicGrievanceOutlineCore = {
    savedType: PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
    type: PUBLIC_GRIEVANCE_OUTLINE_TYPES.annual_leave,
    template: "annual_leave",
    templateId: publicStewardWorkflowTopic("annual_leave").templateId,
    topic: "Annual leave" as const,
    title: "Public annual-leave cited grievance outline",
    issue:
      "Whether verified Article 10 language may support a grievance about an annual-leave denial or scheduling decision after the applicable employee status, request category, local procedure, and actual disposition are confirmed.",
    governingContractLanguage: [
      item(
        "Article 10 gives career employees a scheduling preference over noncareer employees, qualified by tour-by-tour scheduling and employee skills.",
        scheduling
      ),
      item(
        "Article 10 establishes choice-period vacation planning and specified annual-leave opportunities, while leaving identified parts of the program to local implementation procedures.",
        choice
      ),
      item(
        "Article 10 requires vacation-planning steps that include a submission deadline and official notice of the approved schedule, and permits locally established procedures for requests outside the choice period.",
        planning
      ),
      item(
        "Article 10 states that advance commitments for granting annual leave must be honored except in serious emergency situations.",
        commitment
      ),
    ],
    elementsToEstablish: [
      item(
        "Identify which Article 10 category could apply: scheduling preference, choice-period leave, a locally implemented request procedure, or an advance commitment.",
        article10
      ),
      item(
        "Confirm the applicable employee status, tour, skills, choice-period status, and leave-request procedure before applying the cited rule.",
        [...scheduling, ...choice, ...planning]
      ),
      item(
        "Confirm what schedule notice, approval, denial, or other disposition actually occurred; the verified source does not supply those case facts.",
        planning
      ),
      item(
        "If an advance commitment is the issue, confirm that a commitment existed and whether management relies on a serious emergency.",
        commitment
      ),
    ],
    factsToConfirm: [
      "The applicable employee category and whether the request concerns the choice period or another period.",
      "The applicable tour and any employee-skill consideration relied upon in scheduling.",
      "The separately verified local implementation procedure or LMOU provision, if any.",
      "The request category, recorded disposition, and schedule notice without entering private details in this pilot.",
      "Whether an advance commitment existed and whether a serious-emergency reason is asserted.",
      "When the employee or Union learned or reasonably should have learned of the grievance cause; keep actual dates outside this public pilot.",
    ],
    evidenceToRequest: [
      item(
        "The generic leave request and the written or recorded disposition, without entering or storing either document in this pilot.",
        planning
      ),
      item(
        "The applicable leave calendar, vacation schedule, or official schedule notice used to administer the request.",
        planning
      ),
      item(
        "Records showing how the request was administered and any relevant papers or documents exchanged through the grievance process.",
        stepTwoDevelopment
      ),
      item(
        "Relevant posted instructions or local agreements, treated as separate sources that still require verification.",
        [...planning, ...grievanceDefinition]
      ),
    ],
    questionsForManagement: [
      "Which verified Article 10 provision or separately verified local procedure governed the request?",
      "What request category and scheduling criteria were applied?",
      "What recorded disposition or official schedule notice reflects the decision?",
      "If an advance commitment changed, is management asserting a serious emergency?",
      "What records show how the same governing procedure was administered?",
      "Will management identify any local agreement or posted instruction it relies upon for separate verification?",
    ],
    stepOneArgument: [
      item(
        "Frame the matter conditionally as a dispute about the interpretation, application, or compliance with the Agreement or a non-conflicting LMOU, not as a predetermined violation.",
        grievanceDefinition
      ),
      item(
        "Identify only the Article 10 provisions that the confirmed request category and employee status make potentially relevant.",
        article10
      ),
      item(
        "Separate verified contract language from still-unknown facts, local procedures, and management's stated reason.",
        [...planning, ...commitment]
      ),
      item(
        "Confirm the qualified Step 1 timing trigger before proceeding; this pilot does not calculate a deadline from private dates.",
        stepOneTiming
      ),
      item(
        "State the facts, contentions, particular contract provisions, and a conditional remedy category only after local-union review.",
        stepOneDecisionAndAppeal
      ),
    ],
    possibleRemedies: [
      item(
        "Article 15 requires a remedy sought on a Step 2 appeal, but the cited national paragraphs do not prescribe a specific remedy for every annual-leave dispute.",
        stepOneDecisionAndAppeal
      ),
      item(
        "Depending on confirmed facts and local-union review, a remedy category might seek an appropriate schedule or leave correction, compliance with a verified procedure, or another make-whole form that is actually supported; no remedy is promised here.",
        [...article10, ...stepOneDecisionAndAppeal]
      ),
      item(
        "Any LMOU-specific or local-practice remedy must be verified outside this CBA-only pilot.",
        [...planning, ...grievanceDefinition]
      ),
    ],
    timelinessAndProcedureLimits: [
      item(
        "Article 15 Step 1 states a qualified fourteen-day period measured from when the employee or Union first learned or reasonably should have learned of the cause; actual timing requires fact-specific local-union review.",
        stepOneTiming
      ),
      item(
        "If Step 1 is unresolved, Article 15 addresses the supervisor's decision and a ten-day Union appeal period to Step 2 after receipt of that decision.",
        stepOneDecisionAndAppeal
      ),
      item(
        "This pilot does not accept incident dates, calculate deadlines, prepare a grievance form, or decide whether an extension or different procedure applies.",
        [...stepOneTiming, ...stepOneDecisionAndAppeal]
      ),
    ],
    escalationReadiness: [
      item(
        "A Step 2 appeal is not ready until the facts, contentions, particular contract provisions, and remedy sought can be stated through the proper union process.",
        stepOneDecisionAndAppeal
      ),
      item(
        "Step 2 development includes the parties' factual and contractual positions and exchange of relevant papers or documents under the cited procedure.",
        stepTwoDevelopment
      ),
      item(
        "Escalation decisions belong with the local or designated union representative after current facts, timing, and any local agreement are verified.",
        [...stepOneDecisionAndAppeal, ...stepTwoDevelopment]
      ),
    ],
    limitations: [
      item(
        "The verified CBA supplies conditional rules, but unknown facts do not establish that management violated the Agreement or that a grievance will succeed.",
        article10
      ),
      item(
        "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice.",
        [...planning, ...grievanceDefinition]
      ),
      item(
        "This public pilot does not replace local union advice or legal advice.",
        [...grievanceDefinition, ...stepOneTiming]
      ),
      item(
        "Private case details must remain outside this public pilot.",
        [...grievanceDefinition, ...stepOneTiming]
      ),
    ],
    citations,
    privateCaseWarning: PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING,
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
    buildIdentity: input.answer.version.displayVersion,
    version: input.answer.version,
    sourceInstanceIds: [
      ...new Set(
        citations
          .map((citation) => citation.sourceInstanceId)
          .filter((value): value is string => Boolean(value))
      ),
    ],
  };

  return finalizePublicGrievanceOutline(core, input.createdAt);
}

function buildOvertimeGrievanceOutline(
  input: {
    answer: AnswerResult;
    source: CbaSourceCache;
    createdAt?: string;
  },
  citations: Citation[]
): PublicGrievanceOutline | null {
  const required = requiredOvertimeCitationSet(input.source);
  if (!required) return null;

  const assignmentAdministration = [required.assignmentAdministration];
  const selectionAndRotation = [required.voluntarySelectionAndMandatoryRotation];
  const desiredListLimits = [required.overtimeDesiredListLimits];
  const article8 = [
    required.assignmentAdministration,
    required.voluntarySelectionAndMandatoryRotation,
    required.overtimeDesiredListLimits,
  ];
  const grievanceDefinition = [required.grievanceDefinition];
  const stepOneTiming = [required.stepOneTiming];
  const stepOneDecisionAndAppeal = [required.stepOneDecisionAndAppeal];
  const stepTwoDevelopment = [required.stepTwoFactDevelopment];

  const core: PublicGrievanceOutlineCore = {
    savedType: PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
    type: PUBLIC_GRIEVANCE_OUTLINE_TYPES.overtime,
    template: "overtime",
    templateId: publicStewardWorkflowTopic("overtime").templateId,
    topic: "Overtime",
    title: "Public overtime cited grievance outline",
    issue:
      "Whether verified Article 8 overtime-assignment language may support a grievance after the applicable craft, work location, employee qualifications and availability, Overtime Desired List status, assignment sequence, hours, and local implementation rules are separately confirmed.",
    governingContractLanguage: [
      item(
        "Article 8 states that overtime for regular full-time employees is scheduled among qualified employees doing similar work in the work location where they regularly work, using an Overtime Desired List established by craft, section, or tour under local implementation.",
        assignmentAdministration
      ),
      item(
        "Article 8 states that listed employees with the necessary skills are selected by seniority on a rotating basis, with employees absent or on leave passed over.",
        selectionAndRotation
      ),
      item(
        "Article 8 permits qualified full-time regular employees not on the list to be required to work overtime on a rotating basis when the voluntary list does not provide enough qualified people, subject to the cited conditions.",
        selectionAndRotation
      ),
      item(
        "Article 8 places stated limits and qualifications on Overtime Desired List utilization, including daily and weekly limits and a penalty-rate qualification.",
        desiredListLimits
      ),
    ],
    elementsToEstablish: [
      item(
        "Identify the potentially applicable Article 8 rule: list administration, qualified-employee selection, voluntary rotation, mandatory rotation, or the cited list-utilization limits.",
        article8
      ),
      item(
        "Confirm the employee category, craft, section or tour, work location, necessary skills, availability, list status, and assignment sequence before applying the cited rule.",
        [...assignmentAdministration, ...selectionAndRotation]
      ),
      item(
        "Confirm whether the voluntary list supplied enough qualified people and whether the cited preconditions for assigning non-list employees were met.",
        selectionAndRotation
      ),
      item(
        "Confirm the relevant hours and whether a cited daily, weekly, December, or penalty-rate qualification applies; this pilot does not calculate hours or pay.",
        desiredListLimits
      ),
    ],
    factsToConfirm: [
      "The separately verified craft, section or tour, work location, and applicable local implementation procedure.",
      "The employee category, necessary skills, availability, and Overtime Desired List status.",
      "The order in which overtime opportunities were offered or assigned, without entering employee names or private details here.",
      "Whether anyone was absent, on leave, unavailable, unqualified, or already subject to a cited hours limit.",
      "Whether the overtime was voluntary or mandatory and what management states was the reason for the sequence.",
      "When the employee or Union learned or reasonably should have learned of the grievance cause; keep actual dates outside this public pilot.",
    ],
    evidenceToRequest: [
      item(
        "The applicable Overtime Desired List and neutral assignment or opportunity sequence records, reviewed outside this pilot and only to the extent they exist and are properly available.",
        [...assignmentAdministration, ...selectionAndRotation]
      ),
      item(
        "Neutral records sufficient to check qualifications, availability, rotation, and the relevant daily or weekly hours, without entering private data here.",
        [...selectionAndRotation, ...desiredListLimits]
      ),
      item(
        "Any applicable local implementation provision, treated as a separate source that still requires verification.",
        assignmentAdministration
      ),
      item(
        "Relevant papers or documents exchanged through the grievance process under the cited Article 15 fact-development procedure.",
        stepTwoDevelopment
      ),
    ],
    questionsForManagement: [
      "Which Article 8 provision and separately verified local implementation rule governed the overtime assignment?",
      "What craft, section or tour, work location, qualifications, availability, and list criteria were applied?",
      "What was the neutral sequence of offers or assignments?",
      "Was the voluntary Overtime Desired List insufficient, and if so, what verified facts support that conclusion?",
      "Which cited daily, weekly, December, or penalty-rate qualification does management contend applies?",
      "What records or local provisions does management rely upon for separate verification?",
    ],
    stepOneArgument: [
      item(
        "Frame the matter conditionally as a dispute about interpretation, application, or compliance with the Agreement or a non-conflicting LMOU, not as a predetermined violation.",
        grievanceDefinition
      ),
      item(
        "Identify only the Article 8 provisions made potentially relevant by confirmed employee status, list status, qualifications, availability, work location, and assignment sequence.",
        article8
      ),
      item(
        "Compare the verified rotation and list-utilization rules with confirmed neutral records while keeping unverified local procedures and disputed facts separate.",
        [...assignmentAdministration, ...selectionAndRotation, ...desiredListLimits]
      ),
      item(
        "Confirm the qualified Step 1 timing trigger before proceeding; this pilot does not calculate a deadline from private dates.",
        stepOneTiming
      ),
      item(
        "State facts, contentions, particular contract provisions, and a conditional remedy category only after local-union review.",
        stepOneDecisionAndAppeal
      ),
    ],
    possibleRemedies: [
      item(
        "Article 15 requires a remedy sought on a Step 2 appeal, but the cited national paragraphs do not prescribe a specific remedy for every overtime dispute.",
        stepOneDecisionAndAppeal
      ),
      item(
        "Depending on confirmed facts and local-union review, a remedy category might seek compliance with a verified assignment procedure, correction of an established opportunity record, or another make-whole form that is actually supported; no entitlement, amount, or outcome is promised.",
        [...article8, ...stepOneDecisionAndAppeal]
      ),
      item(
        "Any monetary, LMOU-specific, or local-practice remedy requires separate verification and calculation outside this public pilot.",
        [...assignmentAdministration, ...grievanceDefinition]
      ),
    ],
    timelinessAndProcedureLimits: [
      item(
        "Article 15 Step 1 states a qualified fourteen-day period measured from when the employee or Union first learned or reasonably should have learned of the cause; actual timing requires fact-specific local-union review.",
        stepOneTiming
      ),
      item(
        "If Step 1 is unresolved, Article 15 addresses the supervisor's decision and a ten-day Union appeal period to Step 2 after receipt of that decision.",
        stepOneDecisionAndAppeal
      ),
      item(
        "This pilot does not accept incident dates, calculate deadlines, calculate hours or pay, prepare a grievance form, or decide whether an extension or different procedure applies.",
        [...stepOneTiming, ...stepOneDecisionAndAppeal]
      ),
    ],
    escalationReadiness: [
      item(
        "A Step 2 appeal is not ready until facts, contentions, particular contract provisions, and a conditional remedy sought can be stated through the proper union process.",
        stepOneDecisionAndAppeal
      ),
      item(
        "Step 2 development includes the parties' factual and contractual positions and exchange of relevant papers or documents under the cited procedure.",
        stepTwoDevelopment
      ),
      item(
        "Escalation decisions belong with the local or designated union representative after current facts, timing, and any local agreement are verified.",
        [...stepOneDecisionAndAppeal, ...stepTwoDevelopment]
      ),
    ],
    limitations: [
      item(
        "The verified CBA supplies conditional overtime rules, but unknown facts do not establish that management violated the Agreement or that a grievance will succeed.",
        article8
      ),
      item(
        "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, local practice, or worked-off-assignment theory beyond the cited Article 8 language.",
        [...assignmentAdministration, ...grievanceDefinition]
      ),
      item(
        "This public pilot does not determine a particular remedy, calculate damages or back pay, replace local union advice, or provide legal advice.",
        [...grievanceDefinition, ...stepOneDecisionAndAppeal]
      ),
      item(
        "Private case details must remain outside this public pilot.",
        [...grievanceDefinition, ...stepOneTiming]
      ),
    ],
    citations,
    privateCaseWarning: PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING,
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
    buildIdentity: input.answer.version.displayVersion,
    version: input.answer.version,
    sourceInstanceIds: [
      ...new Set(
        citations
          .map((citation) => citation.sourceInstanceId)
          .filter((value): value is string => Boolean(value))
      ),
    ],
  };

  return finalizePublicGrievanceOutline(core, input.createdAt);
}

function buildRegistryGrievanceOutline(
  input: {
    answer: AnswerResult;
    source: CbaSourceCache;
    createdAt?: string;
  },
  topic: PublicStewardWorkflowTopic,
  citations: Citation[]
): PublicGrievanceOutline | null {
  const required = requiredOutlineCitationSet(input.source, topic.id);
  if (!required) return null;

  const topicCitations = topic.citationSpecs
    .map((spec) => required[spec.key])
    .filter((citation): citation is Citation => Boolean(citation));
  if (topicCitations.length !== topic.citationSpecs.length) return null;

  const grievanceDefinition = [required.grievanceDefinition];
  const stepOneTiming = [required.stepOneTiming];
  const stepOneDecisionAndAppeal = [required.stepOneDecisionAndAppeal];
  const stepTwoDevelopment = [required.stepTwoFactDevelopment];
  const primaryArticle = topic.sourceSufficiency.primaryArticle;
  const localVerification = sentenceFragment(topic.localVerification);
  const localVerificationAlternatives = alternativeList(localVerification);

  const core: PublicGrievanceOutlineCore = {
    savedType: PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
    type: PUBLIC_GRIEVANCE_OUTLINE_TYPES[topic.id],
    template: topic.id,
    templateId: topic.templateId,
    topic: topic.displayName,
    title: topic.outlineLabels.title,
    issue:
      `Whether verified Article ${primaryArticle} language may support a grievance concerning ${topic.outlineLabels.issueDeterminer ?? "a"} ${topic.outlineLabels.issueNoun} after coverage, the actual event, management's stated basis, and separately verified local rules are confirmed.`,
    governingContractLanguage: topic.citationSpecs.map((spec, index) =>
      item(
        `Verified Article ${primaryArticle} language addresses ${spec.description}. Its application remains conditional on coverage and confirmed facts.`,
        [topicCitations[index]]
      )
    ),
    elementsToEstablish: [
      item(
        `Identify which verified Article ${primaryArticle} provision is potentially relevant and confirm that the employee and event fall within its scope.`,
        topicCitations
      ),
      item(
        "Confirm the neutral sequence of events, management's stated basis, and the records that support or contradict it; the CBA cache does not establish those facts.",
        topicCitations
      ),
      item(
        `Keep ${localVerification.toLowerCase()} separate and unverified until reviewed through the proper local process.`,
        [...topicCitations, ...grievanceDefinition]
      ),
    ],
    factsToConfirm: [
      "The covered employee category, craft or work context, and potentially applicable contract provision.",
      "What occurred and what management states was the basis, without entering names, dates, medical information, or other private details here.",
      `The separately verified ${localVerification.toLowerCase()}.`,
      "When the employee or Union learned or reasonably should have learned of the grievance cause; keep actual dates outside this public pilot.",
      "Whether another contractual procedure, incorporated authority, or local agreement changes the analysis.",
    ],
    evidenceToRequest: [
      item(
        `Neutral copies or summaries of the ${topic.outlineLabels.evidenceCategory}, obtained outside this pilot through the proper process.`,
        topicCitations
      ),
      item(
        "Management's stated basis and the neutral records it relied upon, without uploading or storing those records here.",
        topicCitations
      ),
      item(
        "Any asserted LMOU, handbook, manual, local instruction, or practice, treated as a separate source requiring verification.",
        [...topicCitations, ...grievanceDefinition]
      ),
      item(
        "Relevant papers or documents exchanged through the grievance process under the cited Article 15 fact-development procedure.",
        stepTwoDevelopment
      ),
    ],
    questionsForManagement: [
      `Which Article ${primaryArticle} provision does management contend governed the event?`,
      "What confirmed facts and neutral records support management's position?",
      "Which employee category, work context, qualification, sequence, or procedural condition was applied?",
      `Does management rely on ${localVerificationAlternatives.toLowerCase()}, and where can that authority be verified?`,
      "What corrective action, if any, was considered or taken?",
      "Will management identify all relevant papers or documents for the grievance record?",
    ],
    stepOneArgument: [
      item(
        "Frame the matter conditionally as a dispute about interpretation, application, or compliance with the Agreement or a non-conflicting LMOU, not as a predetermined violation.",
        grievanceDefinition
      ),
      item(
        `Identify only the verified Article ${primaryArticle} provisions made potentially relevant by confirmed coverage and facts.`,
        topicCitations
      ),
      item(
        "Compare the verified rules with neutral records while labeling disputed facts and unverified local authority explicitly.",
        topicCitations
      ),
      item(
        "Confirm the qualified Step 1 timing trigger before proceeding; this pilot does not calculate a deadline from private dates.",
        stepOneTiming
      ),
      item(
        "State facts, contentions, particular contract provisions, and a conditional remedy category only after local-union review.",
        stepOneDecisionAndAppeal
      ),
    ],
    possibleRemedies: [
      item(
        "Article 15 requires a remedy sought on a Step 2 appeal, but the verified national paragraphs do not prescribe a remedy for every dispute.",
        stepOneDecisionAndAppeal
      ),
      item(
        "Depending on confirmed facts and local-union review, a remedy category might seek compliance, correction of a verified record or procedure, or another supported make-whole form; no outcome is promised.",
        [...topicCitations, ...stepOneDecisionAndAppeal]
      ),
      item(
        "Any monetary, local-rule, or local-practice remedy requires separate verification and calculation outside this public pilot.",
        [...topicCitations, ...grievanceDefinition]
      ),
    ],
    timelinessAndProcedureLimits: [
      item(
        "Article 15 Step 1 states a qualified fourteen-day period measured from when the employee or Union first learned or reasonably should have learned of the cause; actual timing requires fact-specific local-union review.",
        stepOneTiming
      ),
      item(
        "If Step 1 is unresolved, Article 15 addresses the supervisor's decision and a ten-day Union appeal period to Step 2 after receipt of that decision.",
        stepOneDecisionAndAppeal
      ),
      item(
        `Article ${primaryArticle} may contain topic-specific procedure or escalation language. The proper route must be confirmed before relying on the general Article 15 sequence.`,
        topicCitations
      ),
      item(
        "This pilot does not accept incident dates, calculate deadlines or money, prepare a grievance form, or choose an appeal forum.",
        [...stepOneTiming, ...stepOneDecisionAndAppeal]
      ),
    ],
    escalationReadiness: [
      item(
        "Escalation is not ready until facts, contentions, particular contract provisions, and a conditional remedy can be stated through the proper union process.",
        stepOneDecisionAndAppeal
      ),
      item(
        "Article 15 fact development includes the parties' positions and exchange of relevant papers or documents.",
        stepTwoDevelopment
      ),
      item(
        `Confirm whether Article ${primaryArticle} supplies a special escalation path before using the ordinary sequence.`,
        topicCitations
      ),
    ],
    limitations: [
      item(
        `The verified CBA supports a bounded ${topic.displayName.toLowerCase()} workflow, but unknown facts do not establish a violation, a successful grievance, or a remedy.`,
        topicCitations
      ),
      item(
        `Unsupported scope remains excluded: ${topic.unsupportedScope}`,
        topicCitations
      ),
      item(
        "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice.",
        [...topicCitations, ...grievanceDefinition]
      ),
      item(
        "This public pilot is not legal advice, makes no monetary calculation, and does not replace local union review.",
        [...grievanceDefinition, ...stepOneDecisionAndAppeal]
      ),
      item(
        "Private case details must remain outside this public pilot.",
        [...grievanceDefinition, ...stepOneTiming]
      ),
    ],
    citations,
    privateCaseWarning: PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING,
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
    buildIdentity: input.answer.version.displayVersion,
    version: input.answer.version,
    sourceInstanceIds: [
      ...new Set(
        citations
          .map((citation) => citation.sourceInstanceId)
          .filter((value): value is string => Boolean(value))
      ),
    ],
  };

  return finalizePublicGrievanceOutline(core, input.createdAt);
}

function alternativeList(value: string): string {
  const finalConjunction = ", and ";
  const finalConjunctionIndex = value.lastIndexOf(finalConjunction);
  if (finalConjunctionIndex < 0) return value;
  return `${value.slice(0, finalConjunctionIndex)}, or ${value.slice(
    finalConjunctionIndex + finalConjunction.length
  )}`;
}

function sentenceFragment(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

export function publicGrievanceOutlineToText(outline: PublicGrievanceOutline): string {
  const render = (
    title: string,
    entries: Array<CitedGrievanceOutlineItem | string>
  ) => [
    title,
    ...entries.map((entry, index) => `${index + 1}. ${typeof entry === "string" ? entry : entry.text}`),
  ].join("\n");
  return [
    outline.title,
    `Topic: ${outline.topic}`,
    `Template: ${outline.templateId}`,
    `Generated build: ${outline.buildIdentity}`,
    `Source ID: ${CBA_SOURCE_ID}`,
    `Source instance: ${outline.sourceInstanceIds.join(", ")}`,
    `1. Issue\n${outline.issue}`,
    render("2. Governing contract language", outline.governingContractLanguage),
    render("3. Elements that must be established", outline.elementsToEstablish),
    render("4. Facts still to confirm", outline.factsToConfirm),
    render(
      "5. Evidence or records to request",
      outline.evidenceRequests.map(
        (entry) => `${entry.document} Request from: ${entry.requestFrom} Why it matters: ${entry.whyItMatters}`
      )
    ),
    render("6. Questions to ask management", outline.questionsForManagement),
    render("7. Step 1 argument outline", outline.stepOneArgument),
    render("8. Possible remedy categories", outline.possibleRemedies),
    render("9. Timeliness and procedural limits", outline.timelinessAndProcedureLimits),
    render("10. Step 2 or escalation readiness", outline.escalationReadiness),
    render("11. Limitations and uncertainty", outline.limitations),
    render(
      "12. Sources",
      outline.citations.map(
        (citation) =>
          `${citation.article ?? "CBA"} / ${citation.section ?? "section unknown"} / ${citation.paragraphId ?? "paragraph unknown"} / ${citation.citationVerificationState ?? "unverified"}`
      )
    ),
    outline.privateCaseWarning,
    "Unknown facts, local rules, and local practices require separate verification.",
    "Conditional steward outline only. No predetermined violation, remedy, monetary calculation, or legal advice.",
  ].join("\n\n");
}

export function publicGrievanceOutlineToMarkdown(
  outline: PublicGrievanceOutline
): string {
  const citationNumbers = new Map(
    outline.citations.map((citation, index) => [citation.id, index + 1])
  );
  const citedList = (entries: CitedGrievanceOutlineItem[]) =>
    entries
      .map(
        (entry) =>
          `- ${entry.text} ${entry.citationIds
            .map((id) => `[${citationNumbers.get(id) ?? "?"}]`)
            .join(" ")}`
      )
      .join("\n");
  const plainList = (entries: string[]) =>
    entries.map((entry) => `- ${entry}`).join("\n");
  const sources = outline.citations
    .map(
      (citation, index) =>
        `${index + 1}. ${citation.article ?? "CBA"} / ${citation.section ?? "section unknown"} / ${citation.paragraphId ?? "paragraph unknown"} / ${citation.citationVerificationState ?? "unverified"} / source instance ${citation.sourceInstanceId ?? "missing"}`
    )
    .join("\n");

  return [
    `# ${outline.title}`,
    `- Topic: ${outline.topic}`,
    `- Template: ${outline.templateId}`,
    `- Generated build: ${outline.buildIdentity}`,
    `- Source ID: ${CBA_SOURCE_ID}`,
    `- Source instance: ${outline.sourceInstanceIds.join(", ")}`,
    `> ${outline.privateCaseWarning}`,
    `## 1. Issue\n\n${outline.issue}`,
    `## 2. Governing contract language\n\n${citedList(outline.governingContractLanguage)}`,
    `## 3. Elements that must be established\n\n${citedList(outline.elementsToEstablish)}`,
    `## 4. Facts still to confirm\n\n${plainList(outline.factsToConfirm)}`,
    `## 5. Evidence or records to request\n\n${outline.evidenceRequests.map((entry) =>
      `- **Document or record:** ${entry.document}\n  - **Request from:** ${entry.requestFrom}\n  - **Why it matters:** ${entry.whyItMatters} ${entry.citationIds
        .map((id) => `[${citationNumbers.get(id) ?? "?"}]`)
        .join(" ")}`
    ).join("\n")}`,
    `## 6. Questions to ask management\n\n${plainList(outline.questionsForManagement)}`,
    `## 7. Step 1 argument outline\n\n${citedList(outline.stepOneArgument)}`,
    `## 8. Conditional remedy framework\n\n${citedList(outline.possibleRemedies)}`,
    `## 9. Timeliness and procedure cautions\n\n${citedList(outline.timelinessAndProcedureLimits)}`,
    `## 10. Step 2 or escalation readiness\n\n${citedList(outline.escalationReadiness)}`,
    `## 11. Limitations and uncertainty\n\n${citedList(outline.limitations)}`,
    `## 12. Sources\n\n${sources}`,
    "Unknown facts, local rules, and local practices require separate verification.",
    "Conditional steward outline only. No predetermined violation, remedy, monetary calculation, or legal advice.",
  ].join("\n\n");
}

export function publicGrievanceOutlineExportEligibility(
  outline: PublicGrievanceOutline,
  source: CbaSourceCache | null
): { eligible: true } | { eligible: false; reason: string } {
  if (!source) return { eligible: false, reason: "Current CBA cache is unavailable." };
  if (
    outline.citations.length === 0 ||
    outline.citations.some(
      (citation) => !trustedCurrentCbaCitation(citation, source)
    )
  ) {
    return {
      eligible: false,
      reason: "Export blocked because one or more CBA citations are stale or unverifiable.",
    };
  }
  const topic = publicStewardWorkflowTopic(outline.template);
  if (
    topic.sourceSufficiency.status !== "supported" ||
    !outline.sourceInstanceIds.includes(
      outline.citations[0]?.sourceInstanceId ?? ""
    )
  ) {
    return {
      eligible: false,
      reason: "Export blocked because topic or source-instance eligibility cannot be verified.",
    };
  }
  return { eligible: true };
}
