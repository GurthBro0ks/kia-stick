import {
  CBA_SOURCE_ID,
  type CbaParagraph,
} from "@/lib/cbaSource";

export const PUBLIC_STEWARD_WORKFLOW_PHASE =
  "KIA-Stick-public-steward-workflow-platform-bundle-1" as const;

export type PublicStewardWorkflowTopicId =
  | "annual_leave"
  | "overtime"
  | "holiday_scheduling"
  | "safety_health"
  | "discipline_just_cause";

export interface PublicStewardWorkflowCitationSpec {
  key: string;
  articleNumber: string;
  description: string;
  matches: (paragraph: CbaParagraph) => boolean;
}

export interface PublicStewardWorkflowTopic {
  id: PublicStewardWorkflowTopicId;
  templateId: `public-grievance-outline.${PublicStewardWorkflowTopicId}.v1`;
  displayName: string;
  shortDescription: string;
  exampleQuestion: string;
  requiredSourceId: typeof CBA_SOURCE_ID;
  requiredArticles: string[];
  supportedScope: string;
  unsupportedScope: string;
  localVerification: string;
  sourceSufficiency: {
    status: "supported";
    primaryArticle: string;
    supportingArticles: string[];
    minimumTopicParagraphs: number;
  };
  positive: RegExp[];
  negative: RegExp[];
  citationSpecs: PublicStewardWorkflowCitationSpec[];
  outlineLabels: {
    title: string;
    issueNoun: string;
    evidenceCategory: string;
  };
}

const annualLeave: PublicStewardWorkflowTopic = {
  id: "annual_leave",
  templateId: "public-grievance-outline.annual_leave.v1",
  displayName: "Annual leave",
  shortDescription: "Article 10 scheduling, choice-period planning, and advance commitments.",
  exampleQuestion: "How does the CBA govern an annual leave denial or scheduling decision?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["10", "15"],
  supportedScope: "Bounded annual-leave denial, scheduling, choice-period, and advance-commitment outline.",
  unsupportedScope: "Sick leave, FMLA, OWCP, medical facts, leave calculations, and case outcomes.",
  localVerification: "LMOU provisions, local leave calendars, local request procedures, and past practice.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "10",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 4,
  },
  positive: [
    /\bannual leave\b.*\b(request|den(?:y|ied|ial)|schedul(?:e|ed|ing)?|approv(?:al|e|ed)?|choice|vacation|administration)\b/,
    /\b(request|den(?:y|ied|ial)|schedul(?:e|ed|ing)?|approv(?:al|e|ed)?|choice|administration)\b.*\bannual leave\b/,
    /\bvacation\b.*\b(request|period|schedul(?:e|ed|ing)?|choice|den(?:y|ied|ial))\b/,
    /\bprime[ -]?time\b.*\b(leave|vacation|request|schedul(?:e|ed|ing)?)\b/,
    /\bleave\b.*\b(supervisor|tomorrow|time off)\b.*\b(request|submit|den(?:y|ied|ial)|schedul|approv|deadline|time off)\b/,
    /\b(submit|request|den(?:y|ied|ial)|schedul|approv|deadline)\b.*\bleave\b.*\b(supervisor|tomorrow|time off)\b/,
  ],
  negative: [/\b(sick leave|fmla|lwop|military leave|owcp|medical|attendance discipline)\b/],
  citationSpecs: [
    {
      key: "scheduling_preference",
      articleNumber: "10",
      description: "annual-leave scheduling preference",
      matches: (paragraph) =>
        paragraph.sectionNumber === "2" && /scheduling annual leave/i.test(paragraph.text),
    },
    {
      key: "choice_period",
      articleNumber: "10",
      description: "choice-period vacation planning",
      matches: (paragraph) =>
        paragraph.sectionNumber === "3" &&
        /choice vacation period/i.test(paragraph.text) &&
        /annual leave shall be granted/i.test(paragraph.text),
    },
    {
      key: "vacation_planning",
      articleNumber: "10",
      description: "vacation planning and notice",
      matches: (paragraph) =>
        paragraph.sectionNumber === "4" &&
        /submission of applications for annual leave/i.test(paragraph.text),
    },
    {
      key: "advance_commitments",
      articleNumber: "10",
      description: "advance annual-leave commitments",
      matches: (paragraph) =>
        paragraph.sectionNumber === "4" &&
        /advance commitments for granting annual leave/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public annual-leave cited grievance outline",
    issueNoun: "annual-leave denial or scheduling decision",
    evidenceCategory: "leave request, disposition, schedule, and verified local procedure",
  },
};

const overtime: PublicStewardWorkflowTopic = {
  id: "overtime",
  templateId: "public-grievance-outline.overtime.v1",
  displayName: "Overtime",
  shortDescription: "Article 8 ODL administration, rotation, mandatory assignment, and limits.",
  exampleQuestion: "How should overtime opportunities be distributed under the CBA?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["8", "15"],
  supportedScope: "Bounded ODL administration, selection, rotation, and assignment outline.",
  unsupportedScope: "Pay calculation, predetermined bypass findings, local practices, and individual outcomes.",
  localVerification: "LMOU implementation, craft or tour rules, qualifications, availability, and assignment records.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "8",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\bovertime\b/,
    /\bovertime[- ]desired[- ]list\b/,
    /\bodl\b/,
    /\bworked off assignment\b.*\b(bypass|forced|mandatory|rotation)\b/,
  ],
  negative: [/\b(annual leave|vacation|sick leave|fmla|lwop|owcp|medical)\b/],
  citationSpecs: [
    {
      key: "assignment_administration",
      articleNumber: "8",
      description: "ODL assignment administration",
      matches: (paragraph) =>
        /scheduled among qualified employees doing similar work/i.test(paragraph.text) &&
        /Overtime Desired List/i.test(paragraph.text),
    },
    {
      key: "selection_rotation",
      articleNumber: "8",
      description: "voluntary selection and mandatory rotation",
      matches: (paragraph) =>
        /selected in order of their seniority on a rotating basis/i.test(paragraph.text) &&
        /not on the list may be required to work overtime on a rotating basis/i.test(paragraph.text),
    },
    {
      key: "odl_limits",
      articleNumber: "8",
      description: "ODL daily, weekly, and penalty-rate limits",
      matches: (paragraph) =>
        /no more than twelve \(12\) hours of work in a day/i.test(paragraph.text) &&
        /not required to utilize employees on the Overtime Desired List at the penalty overtime rate/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public overtime cited grievance outline",
    issueNoun: "overtime assignment or distribution decision",
    evidenceCategory: "ODL, neutral assignment sequence, qualifications, availability, and hours records",
  },
};

const holidayScheduling: PublicStewardWorkflowTopic = {
  id: "holiday_scheduling",
  templateId: "public-grievance-outline.holiday_scheduling.v1",
  displayName: "Holiday scheduling",
  shortDescription: "Article 11 holiday eligibility, work, posting, and scheduling order.",
  exampleQuestion: "How does the CBA govern holiday scheduling and who may be required to work?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["11", "15"],
  supportedScope: "Bounded holiday-schedule posting, employee category, and assignment-order outline.",
  unsupportedScope: "Holiday pay computation, local schedule facts, and predetermined entitlement.",
  localVerification: "LMOU selection order, local holiday schedule, employee category, and actual posting.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "11",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\bholiday\b.*\b(schedule|scheduling|work|worked|required|posting|posted|excused)\b/,
    /\b(schedule|scheduling|posting|posted|required)\b.*\bholiday\b/,
    /\bdesignated holiday\b/,
  ],
  negative: [/\b(vacation|annual leave request|religious accommodation|holiday party)\b/],
  citationSpecs: [
    {
      key: "holiday_eligibility",
      articleNumber: "11",
      description: "holiday eligibility",
      matches: (paragraph) =>
        paragraph.sectionNumber === "1" && /days shall be considered holidays/i.test(paragraph.text),
    },
    {
      key: "holiday_posting",
      articleNumber: "11",
      description: "holiday schedule posting",
      matches: (paragraph) =>
        paragraph.sectionNumber === "6" &&
        /schedule shall be posted as of the Tuesday preceding the service week/i.test(paragraph.text),
    },
    {
      key: "holiday_assignment_order",
      articleNumber: "11",
      description: "holiday excusal and assignment sequence",
      matches: (paragraph) =>
        paragraph.sectionNumber === "6" &&
        /as many full-time and part-time regular schedule employees as can be spared/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public holiday-scheduling cited grievance outline",
    issueNoun: "holiday scheduling or assignment decision",
    evidenceCategory: "holiday schedule, posting date, employee category, assignment sequence, and verified LMOU",
  },
};

const safetyHealth: PublicStewardWorkflowTopic = {
  id: "safety_health",
  templateId: "public-grievance-outline.safety_health.v1",
  displayName: "Safety and health",
  shortDescription: "Article 14 safe conditions, reporting, correction, and special grievance procedure.",
  exampleQuestion: "What CBA process applies to an unsafe working condition?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["14", "15"],
  supportedScope: "Bounded unsafe-condition reporting, corrective-action, records, and escalation outline.",
  unsupportedScope: "Medical assessment, emergency instructions, OSHA advice, OWCP claims, and safety determinations.",
  localVerification: "Current hazard facts, emergency rules, local committee process, and non-CBA safety authority.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "14",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\b(unsafe|unhealthful|safety hazard|unsafe condition|safe working condition)\b/,
    /\b(safety|health)\b.*\b(condition|hazard|grievance|workplace|working)\b/,
    /\barticle\s*14\b/,
  ],
  negative: [/\b(medical diagnosis|owcp|workers'? compensation|treatment plan|fmla)\b/],
  citationSpecs: [
    {
      key: "safe_conditions",
      articleNumber: "14",
      description: "management responsibility for safe working conditions",
      matches: (paragraph) =>
        /responsibility of management to provide safe working conditions/i.test(paragraph.text),
    },
    {
      key: "report_and_correct",
      articleNumber: "14",
      description: "unsafe-condition reporting and correction",
      matches: (paragraph) =>
        /insist on correction of unsafe conditions/i.test(paragraph.text) &&
        /immediately investigate the condition and take corrective action if necessary/i.test(paragraph.text),
    },
    {
      key: "safety_appeal",
      articleNumber: "14",
      description: "Article 14 safety grievance appeal path",
      matches: (paragraph) =>
        /appealed directly to arbitration within 21 days/i.test(paragraph.text) &&
        /Safety and Health Committee/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public safety-and-health cited grievance outline",
    issueNoun: "reported unsafe or unhealthful working condition",
    evidenceCategory: "hazard report, supervisor notice, neutral inspection records, corrective response, and committee records",
  },
};

const disciplineJustCause: PublicStewardWorkflowTopic = {
  id: "discipline_just_cause",
  templateId: "public-grievance-outline.discipline_just_cause.v1",
  displayName: "Discipline and just cause",
  shortDescription: "Article 16 corrective discipline, just cause, notice, and review.",
  exampleQuestion: "What does the CBA require for discipline and just cause?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["16", "15"],
  supportedScope: "Bounded just-cause, corrective-discipline, notice, and concurrence outline.",
  unsupportedScope: "Merits findings, legal defenses, MSPB strategy, back-pay calculation, and case outcomes.",
  localVerification: "Charges, evidence, notice, prior record, employee status, defenses, and local handling.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "16",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\bjust[ -]?cause\b/,
    /\bdisciplin(?:e|ary|ed)\b.*\b(cba|contract|article|grievance|corrective|notice|suspension|discharge)\b/,
    /\b(cba|contract|article)\b.*\bdisciplin(?:e|ary|ed)\b/,
    /\b(article\s*16|letter of warning|discipline procedure)\b/,
  ],
  negative: [/\b(attendance policy only|medical diagnosis|criminal advice|legal representation)\b/],
  citationSpecs: [
    {
      key: "corrective_just_cause",
      articleNumber: "16",
      description: "corrective discipline and just cause",
      matches: (paragraph) =>
        /discipline should be corrective in nature, rather than punitive/i.test(paragraph.text) &&
        /no employee may be disciplined or discharged except for just cause/i.test(paragraph.text),
    },
    {
      key: "grievance_review",
      articleNumber: "16",
      description: "discipline subject to grievance-arbitration",
      matches: (paragraph) =>
        /discipline or discharge shall be subject to the grievance-arbitration procedure/i.test(paragraph.text),
    },
    {
      key: "discipline_concurrence",
      articleNumber: "16",
      description: "review and concurrence for suspension or discharge",
      matches: (paragraph) =>
        /reviewed and concurred in by the installation head or designee/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public discipline-and-just-cause cited grievance outline",
    issueNoun: "discipline or discharge action",
    evidenceCategory: "charge, notice, neutral evidence, prior record, response, and concurrence record",
  },
};

export const PUBLIC_STEWARD_WORKFLOW_TOPICS = [
  annualLeave,
  overtime,
  holidayScheduling,
  safetyHealth,
  disciplineJustCause,
] as const satisfies readonly PublicStewardWorkflowTopic[];

export function publicStewardWorkflowTopic(
  id: PublicStewardWorkflowTopicId
): PublicStewardWorkflowTopic {
  const topic = PUBLIC_STEWARD_WORKFLOW_TOPICS.find((candidate) => candidate.id === id);
  if (!topic) throw new Error(`Unsupported public steward workflow topic: ${id}`);
  return topic;
}

export function detectPublicStewardWorkflowTopic(
  question: string
): PublicStewardWorkflowTopicId | null {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized || /\b(fake|sample)\b/.test(normalized)) return null;
  for (const topic of PUBLIC_STEWARD_WORKFLOW_TOPICS) {
    if (topic.negative.some((guard) => guard.test(normalized))) continue;
    if (topic.positive.some((matcher) => matcher.test(normalized))) return topic.id;
  }
  return null;
}

export function topicParagraphs(
  sourceParagraphs: CbaParagraph[],
  topic: PublicStewardWorkflowTopic
): Map<string, CbaParagraph> | null {
  const matches = new Map<string, CbaParagraph>();
  for (const spec of topic.citationSpecs) {
    const paragraph = sourceParagraphs.find(
      (candidate) =>
        candidate.articleNumber === spec.articleNumber && spec.matches(candidate)
    );
    if (!paragraph) return null;
    matches.set(spec.key, paragraph);
  }
  return matches;
}
