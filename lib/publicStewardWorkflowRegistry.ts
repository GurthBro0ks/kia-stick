import {
  CBA_SOURCE_ID,
  type CbaParagraph,
} from "@/lib/cbaSource";

export const PUBLIC_STEWARD_WORKFLOW_PHASE =
  "KIA-Stick-public-steward-workflow-platform-bundle-2-topic-expansion-and-packet-workspace" as const;

export type PublicStewardWorkflowTopicId =
  | "annual_leave"
  | "overtime"
  | "holiday_scheduling"
  | "safety_health"
  | "discipline_just_cause"
  | "sick_leave"
  | "higher_level_assignments"
  | "uniforms_work_clothes"
  | "employee_claims"
  | "steward_grievance_handling";

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
  answerSubject?: string;
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
    issueDeterminer?: "a" | "an";
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

const sickLeave: PublicStewardWorkflowTopic = {
  id: "sick_leave",
  templateId: "public-grievance-outline.sick_leave.v1",
  displayName: "Sick leave administration",
  shortDescription: "Article 10 sick-leave charging, certification, and minimum-charge administration.",
  exampleQuestion: "How does the CBA govern sick leave certification and leave charging?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["10", "15"],
  supportedScope: "Bounded sick-leave certification, charging, and leave-administration outline.",
  unsupportedScope: "Medical facts, diagnoses, FMLA, OWCP, attendance discipline, ELM interpretation, and leave calculations.",
  localVerification: "ELM provisions, local call-in rules, protected-leave authority, leave records, and medical-documentation requirements.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "10",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\bsick leave\b.*\b(certif(?:y|ied|ication)|charg(?:e|ed|ing)|administration|request|absence|insufficient|minimum)\b/,
    /\b(certif(?:y|ied|ication)|charg(?:e|ed|ing)|administration|request|absence|minimum)\b.*\bsick leave\b/,
    /\barticle\s*10\b.*\bsick leave\b/,
  ],
  negative: [/\b(fmla|owcp|diagnosis|medical treatment|workers'? compensation|attendance discipline)\b/],
  citationSpecs: [
    {
      key: "sick_leave_program",
      articleNumber: "10",
      description: "sick-leave program administration and short-absence certification",
      matches: (paragraph) =>
        /continue the administration of the present sick leave program/i.test(paragraph.text) &&
        /supervisor may accept an employee's certification|supervisor may accept an employee’s certification/i.test(paragraph.text),
    },
    {
      key: "minimum_leave_charge",
      articleNumber: "10",
      description: "minimum unit charged for sick and annual leave",
      matches: (paragraph) =>
        /minimum unit charged for sick leave and annual leave/i.test(paragraph.text),
    },
    {
      key: "combined_leave_use",
      articleNumber: "10",
      description: "combined sick, annual, and leave-without-pay administration",
      matches: (paragraph) =>
        /utilize annual and sick leave in conjunction with leave without pay/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public sick-leave-administration cited grievance outline",
    issueNoun: "sick-leave certification or charging decision",
    evidenceCategory: "leave request, neutral charge record, certification request, disposition, and separately verified leave procedure",
  },
};

const higherLevelAssignments: PublicStewardWorkflowTopic = {
  id: "higher_level_assignments",
  templateId: "public-grievance-outline.higher_level_assignments.v1",
  displayName: "Higher-level assignments",
  shortDescription: "Article 25 definition, written-order, actual-work, and selection safeguards.",
  exampleQuestion: "What does the CBA require for a temporary higher-level assignment?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["25", "15"],
  supportedScope: "Bounded higher-level detail, written-order, actual-work, and selection outline.",
  unsupportedScope: "Pay calculation, position classification, predetermined entitlement, and cross-craft selection conclusions.",
  localVerification: "Craft eligibility, position level, qualifications, availability, actual duties, duration, selection records, and pay records.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "25",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\bhigher[ -]?level\b.*\b(assignment|detail|work|position|written order|pay|selection)\b/,
    /\b(assignment|detail|written order|selected|selection)\b.*\bhigher[ -]?level\b/,
    /\barticle\s*25\b/,
  ],
  negative: [/\b(permanent promotion|job posting|bid assignment|calculate|amount owed)\b/],
  citationSpecs: [
    {
      key: "higher_level_definition",
      articleNumber: "25",
      description: "definition of higher-level work",
      matches: (paragraph) =>
        /Higher-level work is defined as an assignment to a ranked higher- level position/i.test(paragraph.text),
    },
    {
      key: "written_order",
      articleNumber: "25",
      description: "written-order and directed-duty safeguards",
      matches: (paragraph) =>
        /detailed to higher-level work shall be given a written management order/i.test(paragraph.text) &&
        /failure of management to give a written order is not grounds for denial/i.test(paragraph.text),
    },
    {
      key: "detail_selection",
      articleNumber: "25",
      description: "eligible, qualified, and available detail selection",
      matches: (paragraph) =>
        /eligible, qualified and available employees in each craft/i.test(paragraph.text) &&
        /temporarily vacant higher-level position/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public higher-level-assignment cited grievance outline",
    issueNoun: "higher-level detail, order, or selection decision",
    evidenceCategory: "assignment order, neutral duty description, eligibility, qualifications, availability, duration, and selection record",
  },
};

const uniformsWorkClothes: PublicStewardWorkflowTopic = {
  id: "uniforms_work_clothes",
  templateId: "public-grievance-outline.uniforms_work_clothes.v1",
  displayName: "Uniforms and work clothes",
  shortDescription: "Article 26 program administration, eligibility categories, and allowance-record safeguards.",
  exampleQuestion: "How does the CBA govern uniform and work-clothes program administration?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["26", "15"],
  supportedScope: "Bounded uniform or work-clothes eligibility and program-administration outline.",
  unsupportedScope: "Allowance calculation, vendor disputes, ELM interpretation, personal purchase advice, and predetermined entitlement.",
  localVerification: "Employee eligibility, assignment category, anniversary year, ELM criteria, program records, vendor records, and actual allowance history.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "26",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\b(uniform|work clothes|work clothing)\b.*\b(allowance|eligib(?:le|ility)|program|administration|credit|vendor)\b/,
    /\b(allowance|eligib(?:le|ility)|program|administration|credit)\b.*\b(uniform|work clothes|work clothing)\b/,
    /\barticle\s*26\b/,
  ],
  negative: [/\b(costume|dress code|calculate|how much money|personal shopping)\b/],
  citationSpecs: [
    {
      key: "program_administration",
      articleNumber: "26",
      description: "uniform and work-clothes program administration",
      matches: (paragraph) =>
        /Uniform Control Committee/i.test(paragraph.text) &&
        /current administration of the Uniform and Work Clothes Program/i.test(paragraph.text),
    },
    {
      key: "regular_uniform_program",
      articleNumber: "26",
      description: "regular uniform-program eligibility and annual allowance framework",
      matches: (paragraph) =>
        /annual allowance for (?:all )?eligible employees/i.test(paragraph.text) &&
        /regular uniform program/i.test(paragraph.text),
    },
    {
      key: "work_clothing_program",
      articleNumber: "26",
      description: "work-clothing program categories and carryover framework",
      matches: (paragraph) =>
        /eligible employees in the Work Cloth(?:es|ing) Program/i.test(paragraph.text) &&
        /Unused portions of an eligible employee's annual allowance|Unused portions of an eligible employee’s annual allowance/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public uniform-and-work-clothes cited grievance outline",
    issueNoun: "uniform or work-clothes eligibility or administration decision",
    evidenceCategory: "eligibility category, assignment record, anniversary-year record, allowance ledger, and separately verified program criteria",
  },
};

const employeeClaims: PublicStewardWorkflowTopic = {
  id: "employee_claims",
  templateId: "public-grievance-outline.employee_claims.v1",
  displayName: "Employee property claims",
  answerSubject: "The employee property claims workflow",
  shortDescription: "Article 27 claim scope, documentation, local recommendations, determination, and appeal.",
  exampleQuestion: "What process does Article 27 provide for an employee property claim?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["27", "15"],
  supportedScope: "Bounded employee personal-property claim scope, documentation, recommendation, determination, and appeal outline.",
  unsupportedScope: "Motor-vehicle claims, monetary calculation, valuation, negligence findings, legal advice, and predetermined reimbursement.",
  localVerification: "Property and employment connection, possession circumstances, cause, documentation, claim handling, determination, and appeal posture.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "27",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\b(employee|personal property|property)\b.*\b(claim|loss|damage|reimburs|article\s*27)\b/,
    /\bclaim\b.*\b(personal property|loss|damage|article\s*27)\b/,
    /\barticle\s*27\b/,
  ],
  negative: [/\b(motor vehicle|car claim|vehicle contents|calculate|dollar amount|employer claim|salary overpayment)\b/],
  citationSpecs: [
    {
      key: "claim_scope",
      articleNumber: "27",
      description: "employee personal-property claim scope and exclusions",
      matches: (paragraph) =>
        /loss or damage to his\/her personal property/i.test(paragraph.text),
    },
    {
      key: "claim_documentation",
      articleNumber: "27",
      description: "claim documentation and local recommendation procedure",
      matches: (paragraph) =>
        /Claims should be documented, if possible/i.test(paragraph.text) &&
        /recommendations by the Union steward/i.test(paragraph.text),
    },
    {
      key: "claim_appeal",
      articleNumber: "27",
      description: "adverse-determination notice and appeal procedure",
      matches: (paragraph) =>
        /adverse determination on the claim may be appealed/i.test(paragraph.text) &&
        /right to appeal the decision to arbitration under Article 15/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public employee-property-claim cited grievance outline",
    issueDeterminer: "an",
    issueNoun: "employee’s personal-property claim, its handling, or its determination",
    evidenceCategory: "claim form, neutral property and incident documentation, steward recommendation, determination, notice, and appeal record",
  },
};

const stewardGrievanceHandling: PublicStewardWorkflowTopic = {
  id: "steward_grievance_handling",
  templateId: "public-grievance-outline.steward_grievance_handling.v1",
  displayName: "Steward grievance handling",
  shortDescription: "Article 17 designation, investigation access, permission, interviews, and grievance-writing time.",
  exampleQuestion: "What contractual rights apply when a steward investigates and adjusts a grievance?",
  requiredSourceId: CBA_SOURCE_ID,
  requiredArticles: ["17", "15"],
  supportedScope: "Bounded contractual steward designation, investigation, access, interview, permission, and grievance-writing-time outline.",
  unsupportedScope: "Weingarten merits, investigatory-interview conclusions, statutory advice, union-internal decisions, and predetermined access findings.",
  localVerification: "Steward certification, work location, representational purpose, request and response, records sought, time used, and local procedures.",
  sourceSufficiency: {
    status: "supported",
    primaryArticle: "17",
    supportingArticles: ["15"],
    minimumTopicParagraphs: 3,
  },
  positive: [
    /\bsteward\b.*\b(investigat(?:e|es|ing|ion)|adjust(?:s|ing)?|grievance handling|records|documents|permission|write a grievance)\b/,
    /\b(investigat(?:e|es|ing|ion)|adjust(?:s|ing)?|grievance handling|records|documents|permission)\b.*\bsteward\b/,
    /\bcontractual steward rights\b/,
  ],
  negative: [/\b(weingarten|investigatory interview|investigative interview|interrogation|disciplinary interview|request a union representative)\b/],
  citationSpecs: [
    {
      key: "steward_purpose",
      articleNumber: "17",
      description: "steward grievance-investigation and adjustment purpose",
      matches: (paragraph) =>
        /Stewards may be designated for the purpose of investigating, presenting and adjusting grievances/i.test(paragraph.text),
    },
    {
      key: "steward_access",
      articleNumber: "17",
      description: "permission, records access, and grievance-interview safeguards",
      matches: (paragraph) =>
        /request permission from the immediate supervisor/i.test(paragraph.text) &&
        /review the documents, files and other records necessary/i.test(paragraph.text) &&
        /right to interview the aggrieved employee/i.test(paragraph.text),
    },
    {
      key: "steward_time",
      articleNumber: "17",
      description: "grievance-handling and grievance-writing time",
      matches: (paragraph) =>
        /time actually spent in grievance handling/i.test(paragraph.text) &&
        /time reasonably necessary to write a grievance/i.test(paragraph.text),
    },
  ],
  outlineLabels: {
    title: "Public steward-grievance-handling cited grievance outline",
    issueNoun: "contractual steward investigation, access, permission, or grievance-handling decision",
    evidenceCategory: "steward certification, neutral request and response, records-access log, interview request, time record, and grievance-handling purpose",
  },
};

export const PUBLIC_STEWARD_WORKFLOW_TOPICS = [
  annualLeave,
  overtime,
  holidayScheduling,
  safetyHealth,
  disciplineJustCause,
  sickLeave,
  higherLevelAssignments,
  uniformsWorkClothes,
  employeeClaims,
  stewardGrievanceHandling,
] as const satisfies readonly PublicStewardWorkflowTopic[];

export interface PublicStewardResearchCandidate {
  id: string;
  displayName: string;
  primaryArticles: string[];
  result: "research_only" | "rejected";
  boundedScope: string;
  separateVerification: string;
  reason: string;
  routing: RegExp[];
}

export const PUBLIC_STEWARD_RESEARCH_CANDIDATES = [
  {
    id: "seniority_assignment_administration",
    displayName: "Seniority and assignment administration",
    primaryArticles: ["12", "37", "38", "39", "40", "41"],
    result: "research_only",
    boundedScope: "Exact source research by craft and assignment path.",
    separateVerification: "Craft, installation, assignment type, bid history, qualifications, LMOU, and craft-specific rules.",
    reason: "A single cross-craft workflow would blend materially different posting, bidding, and reassignment rules.",
    routing: [/\b(seniority|posting|bidding|bid assignment)\b.*\b(reassignment|selection|award|craft)\b/],
  },
  {
    id: "hours_work_scheduling",
    displayName: "Broad hours and work scheduling",
    primaryArticles: ["8"],
    result: "research_only",
    boundedScope: "Exact Article 8 research outside the supported overtime subset.",
    separateVerification: "Employee category, service day, schedule, guarantees, premiums, exceptions, and local implementation.",
    reason: "Broad scheduling rules differ by employee category and cannot be collapsed into one safe workflow.",
    routing: [/\b(work schedule|hours of work|service week|service day)\b.*\b(change|notice|administration|guarantee)\b/],
  },
  {
    id: "craft_jurisdiction",
    displayName: "Craft or occupational-group jurisdiction",
    primaryArticles: ["7", "37", "38", "39", "40", "41"],
    result: "research_only",
    boundedScope: "Exact Article 7 and craft-article source research.",
    separateVerification: "Actual duties, craft, occupational group, work location, assignment reason, and craft-specific language.",
    reason: "The national provisions require craft-specific and factual matching that this case-neutral workspace cannot perform.",
    routing: [/\b(craft jurisdiction|cross[ -]?craft|occupational group|different craft)\b/],
  },
  {
    id: "training_qualification",
    displayName: "Training and qualification administration",
    primaryArticles: ["37", "38", "39"],
    result: "research_only",
    boundedScope: "Exact craft-specific training and qualification source research.",
    separateVerification: "Craft, duty assignment, skill, training history, qualification standard, and posting path.",
    reason: "Training and qualification rules are assignment- and craft-specific and overlap posting procedures.",
    routing: [/\b(training|qualification|qualify)\b.*\b(bid|assignment|craft|position)\b/],
  },
  {
    id: "grievance_procedure_timeliness",
    displayName: "Standalone grievance timeliness",
    primaryArticles: ["15"],
    result: "rejected",
    boundedScope: "Shared procedural citations inside each supported topic.",
    separateVerification: "Actual dates, knowledge trigger, grievance type, extensions, special procedures, and local processing.",
    reason: "A standalone builder would require private dates and could be mistaken for a deadline calculator.",
    routing: [/\b(grievance|step\s*1|step\s*2)\b.*\b(deadline|timeliness|time limit|days to file)\b/],
  },
] as const satisfies readonly PublicStewardResearchCandidate[];

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
  const matches = PUBLIC_STEWARD_WORKFLOW_TOPICS.filter(
    (topic) =>
      !topic.negative.some((guard) => guard.test(normalized)) &&
      topic.positive.some((matcher) => matcher.test(normalized))
  );
  return matches.length === 1 ? matches[0].id : null;
}

export function publicStewardWorkflowMatch(question: string): {
  topicId: PublicStewardWorkflowTopicId | null;
  matchedTopicIds: PublicStewardWorkflowTopicId[];
  ambiguous: boolean;
  unsupportedCandidateId: string | null;
} {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized || /\b(fake|sample)\b/.test(normalized)) {
    return { topicId: null, matchedTopicIds: [], ambiguous: false, unsupportedCandidateId: null };
  }
  const matchedTopicIds = PUBLIC_STEWARD_WORKFLOW_TOPICS.filter(
    (topic) =>
      !topic.negative.some((guard) => guard.test(normalized)) &&
      topic.positive.some((matcher) => matcher.test(normalized))
  ).map((topic) => topic.id);
  const unsupportedCandidate = PUBLIC_STEWARD_RESEARCH_CANDIDATES.find(
    (candidate) => candidate.routing.some((matcher) => matcher.test(normalized))
  );
  return {
    topicId: matchedTopicIds.length === 1 ? matchedTopicIds[0] : null,
    matchedTopicIds,
    ambiguous: matchedTopicIds.length > 1,
    unsupportedCandidateId: unsupportedCandidate?.id ?? null,
  };
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
