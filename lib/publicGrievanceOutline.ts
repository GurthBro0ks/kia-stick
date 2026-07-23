import type { AnswerResult } from "@/lib/answerGovernor";
import { citationForCbaParagraph, detectCbaIntent } from "@/lib/cbaAnswer";
import {
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SOURCE_ID,
  type CbaParagraph,
  type CbaSourceCache,
} from "@/lib/cbaSource";
import { canonicalJson, sha256Hex, verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import type { Citation } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export const PUBLIC_GRIEVANCE_OUTLINE_PHASE =
  "KIA-Stick-public-CBA-annual-leave-cited-grievance-outline-pilot" as const;
export const PUBLIC_GRIEVANCE_OUTLINE_TYPE = "annual_leave_denial_or_scheduling" as const;
export const PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE = "public_grievance_outline" as const;
export const PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING =
  "Do not enter private case details in this public pilot." as const;

export interface CitedGrievanceOutlineItem {
  text: string;
  citationIds: string[];
}

export interface PublicGrievanceOutline {
  id: string;
  contentIdentity: string;
  savedType: typeof PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE;
  type: typeof PUBLIC_GRIEVANCE_OUTLINE_TYPE;
  topic: "Annual leave";
  title: string;
  issue: string;
  governingContractLanguage: CitedGrievanceOutlineItem[];
  elementsToEstablish: CitedGrievanceOutlineItem[];
  factsToConfirm: string[];
  evidenceToRequest: CitedGrievanceOutlineItem[];
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
  | { eligible: true; citations: Citation[] }
  | {
      eligible: false;
      reason:
        | "not_public_annual_leave"
        | "no_answer"
        | "provider_mismatch"
        | "cache_unavailable"
        | "missing_verified_answer_citation"
        | "missing_verified_outline_source";
    };

interface RequiredOutlineCitationSet {
  schedulingPreference: Citation;
  choicePeriod: Citation;
  vacationPlanning: Citation;
  advanceCommitments: Citation;
  grievanceDefinition: Citation;
  stepOneTiming: Citation;
  stepOneDecisionAndAppeal: Citation;
  stepTwoFactDevelopment: Citation;
}

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

function requiredOutlineCitationSet(source: CbaSourceCache): RequiredOutlineCitationSet | null {
  const article10 = articleParagraphs(source, "10");
  const article15 = articleParagraphs(source, "15");
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
  ) as unknown as RequiredOutlineCitationSet;
}

function requiredOutlineCitations(source: CbaSourceCache): Citation[] | null {
  const citationSet = requiredOutlineCitationSet(source);
  if (!citationSet) return null;
  return [...new Map(Object.values(citationSet).map((citation) => [citation.id, citation])).values()];
}

export function publicGrievanceOutlineEligibility(input: {
  answer: AnswerResult;
  source: CbaSourceCache | null;
}): PublicGrievanceOutlineEligibility {
  const { answer, source } = input;
  if (
    answer.answerKind !== "public" ||
    answer.publicSourceRole !== "cba_contract" ||
    detectCbaIntent(answer.question) !== "annual_leave"
  ) return { eligible: false, reason: "not_public_annual_leave" };
  if (answer.noAnswer) return { eligible: false, reason: "no_answer" };
  if (answer.version.provider !== CBA_PROVIDER || answer.version.promptVersion !== CBA_PROMPT_VERSION) {
    return { eligible: false, reason: "provider_mismatch" };
  }
  if (!source) return { eligible: false, reason: "cache_unavailable" };
  const answerCitations = answer.citations.filter(
    (citation) =>
      citation.sourceId === CBA_SOURCE_ID &&
      citation.publicSourceType === "cba_contract" &&
      citation.articleNumber === "10"
  );
  if (
    answerCitations.length === 0 ||
    answerCitations.some(
      (citation) =>
        citation.citationVerificationState !== "verified_current" ||
        verifyCbaCitation(citation, source).state !== "verified_current"
    )
  ) return { eligible: false, reason: "missing_verified_answer_citation" };
  const citations = requiredOutlineCitations(source);
  if (
    !citations ||
    citations.some(
      (citation) =>
        citation.citationVerificationState !== "verified_current" ||
        verifyCbaCitation(citation, source).state !== "verified_current"
    )
  ) return { eligible: false, reason: "missing_verified_outline_source" };
  return { eligible: true, citations };
}

function item(text: string, citations: Citation[]): CitedGrievanceOutlineItem {
  return { text, citationIds: [...new Set(citations.map((citation) => citation.id))] };
}

export function buildPublicGrievanceOutline(input: {
  answer: AnswerResult;
  source: CbaSourceCache | null;
  createdAt?: string;
}): PublicGrievanceOutline | null {
  const eligibility = publicGrievanceOutlineEligibility(input);
  if (!eligibility.eligible || !input.source) return null;
  const required = requiredOutlineCitationSet(input.source);
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

  const core = {
    savedType: PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
    type: PUBLIC_GRIEVANCE_OUTLINE_TYPE,
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

  const stableOutlineIdentity = sha256Hex(
    canonicalJson({
      sourceIds: citations.map((citation) => citation.sourceId ?? ""),
      topic: core.topic,
      type: core.type,
    })
  );
  const contentIdentity = sha256Hex(
    JSON.stringify({
      ...core,
      citations: citations.map((citation) => ({
        citationAnchorSha256: citation.citationAnchorSha256 ?? "",
        citationVerificationState: citation.citationVerificationState ?? "",
        id: citation.id,
        paragraphContentSha256: citation.paragraphContentSha256 ?? "",
        sourceInstanceId: citation.sourceInstanceId ?? "",
      })),
    })
  );
  return {
    ...core,
    id: `public-grievance-outline-${stableOutlineIdentity.slice(0, 16)}`,
    contentIdentity,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
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
    `1. Issue\n${outline.issue}`,
    render("2. Governing contract language", outline.governingContractLanguage),
    render("3. Elements that must be established", outline.elementsToEstablish),
    render("4. Facts still to confirm", outline.factsToConfirm),
    render("5. Evidence or records to request", outline.evidenceToRequest),
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
  ].join("\n\n");
}
