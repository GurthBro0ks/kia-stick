import {
  bucketForClass,
  citationForDoc,
  citationLabel,
  dedupeCitations,
  docsForScope,
  orderFakeDocumentsForCitation,
  type Citation,
  type Detail,
  type FakeDocument,
  type Mode,
  type Scope,
  type SourceBucket,
} from "@/lib/sourceModel";
import { clientVersion, type RuntimeVersion } from "@/lib/version";

export type AnswerIntent =
  | "annual_leave"
  | "steward_request"
  | "step_one_evidence"
  | "attendance_sleeping_bathroom"
  | "one_click_lunch"
  | "source_hierarchy"
  | "unknown";

export interface AnswerOptions {
  mode: Mode;
  scope: Scope;
  detail: Detail;
  runtimeVersion?: RuntimeVersion;
  threadHistory?: AnswerHistoryMessage[];
}

export interface AnswerHistoryMessage {
  role: "user" | "assistant";
  content: string;
  intent?: AnswerIntent;
  question?: string;
  resolvedQuestion?: string;
}

export interface AnswerSourceGroup {
  bucket: SourceBucket;
  label: string;
  docs: FakeDocument[];
}

export interface AnswerResult {
  answerKind?: "fake" | "public";
  question: string;
  resolvedQuestion?: string;
  contextNote?: string;
  clarificationNeeded?: boolean;
  intent: AnswerIntent;
  shortAnswer: string;
  modeNote: string;
  noAnswer: boolean;
  bestGuessDisabled: boolean;
  sourceGroups: AnswerSourceGroup[];
  citations: Citation[];
  conflicts: string[];
  evidenceChecklist: string[];
  missingFacts: string[];
  followUps: string[];
  relatedFakeSections: Citation[];
  footer: string;
  version: RuntimeVersion;
  generatedAt: string;
}

const noAnswerText = "I could not find controlling language for that exact issue.";
const clarificationText = "I need the prior fake issue before I can answer that follow-up. Which topic are you asking about?";

const intentMatchers: Record<AnswerIntent, string[]> = {
  annual_leave: ["annual leave", "vacation", "leave request", "vacation board", "leave denial"],
  steward_request: ["steward request", "steward", "representation", "meeting", "supervisor"],
  step_one_evidence: ["step 1", "step one", "grievance file", "checklist"],
  attendance_sleeping_bathroom: ["attendance", "sleeping", "bathroom", "break location", "discipline"],
  one_click_lunch: ["one-click lunch", "one click lunch", "lunch click", "scanner", "lunch"],
  source_hierarchy: ["source hierarchy", "hierarchy", "citation", "governance", "conflict"],
  unknown: [],
};

const intentTags: Record<AnswerIntent, string[]> = {
  annual_leave: ["annual_leave", "vacation_board", "request_window", "local_window"],
  steward_request: ["steward_request", "representation", "meeting"],
  step_one_evidence: ["step_one", "evidence", "checklist"],
  attendance_sleeping_bathroom: ["attendance", "sleeping", "bathroom", "break_location"],
  one_click_lunch: ["one_click_lunch", "lunch", "scanner_prompt"],
  source_hierarchy: ["source_hierarchy", "governance", "conflict", "citation"],
  unknown: [],
};

const bucketOrder: SourceBucket[] = [
  "controlling",
  "local",
  "interpretive",
  "manual",
  "persuasive",
  "evidence",
  "notes",
  "background",
  "unverified",
];

const bucketLabels: Record<SourceBucket, string> = {
  controlling: "Controlling fake language",
  local: "Local fake control",
  interpretive: "Interpretive fake sources",
  manual: "Manual / process guide",
  persuasive: "Persuasive / local history",
  evidence: "Supporting fake evidence",
  notes: "Steward fake notes",
  background: "Historical background",
  unverified: "Unknown / unverified",
};

export const cannedQuestions = [
  "Can annual leave be denied after I submitted inside the fake window?",
  "What should a steward request include before talking to a supervisor?",
  "What evidence belongs in a Step 1 fake file?",
  "How should I frame attendance or sleeping in a bathroom allegation?",
  "Can I grieve a one-click lunch scanner issue?",
];

export function detectIntent(question: string): AnswerIntent {
  const normalized = question.toLowerCase();
  let best: { intent: AnswerIntent; score: number } = { intent: "unknown", score: 0 };

  for (const [intent, phrases] of Object.entries(intentMatchers) as [AnswerIntent, string[]][]) {
    if (intent === "unknown") continue;
    const score = phrases.reduce((total, phrase) => total + (normalized.includes(phrase) ? phrase.length : 0), 0);
    if (score > best.score) {
      best = { intent, score };
    }
  }

  return best.intent;
}

function docsForIntent(question: string, scope: Scope): { intent: AnswerIntent; docs: FakeDocument[] } {
  const intent = detectIntent(question);
  const scopedDocs = docsForScope(scope);
  const tags = intentTags[intent];

  if (intent === "unknown") {
    return {
      intent,
      docs: scopedDocs.filter((doc) => doc.class === "historical_background" || doc.class === "unknown_unverified"),
    };
  }

  const docs = scopedDocs.filter((doc) => doc.tags.some((tag) => tags.includes(tag)));
  return {
    intent,
    docs,
  };
}

type FollowUpKind = "evidence" | "verbal" | "supervisor_script" | "next_steps" | null;

interface ContextResolution {
  originalQuestion: string;
  governedQuestion: string;
  contextNote?: string;
  clarificationNeeded: boolean;
  followUpKind: FollowUpKind;
}

function lastResolvedTopic(history: AnswerHistoryMessage[] = []): AnswerIntent {
  for (const message of [...history].reverse()) {
    if (message.intent && message.intent !== "unknown") return message.intent;
    const text = [message.resolvedQuestion, message.question, message.content].filter(Boolean).join(" ");
    const intent = detectIntent(text);
    if (intent !== "unknown") return intent;
  }
  return "unknown";
}

function topicLabel(intent: AnswerIntent): string {
  if (intent === "annual_leave") return "annual leave denial";
  if (intent === "steward_request") return "steward request";
  if (intent === "step_one_evidence") return "Step 1 evidence packet";
  if (intent === "attendance_sleeping_bathroom") return "attendance or bathroom allegation";
  if (intent === "one_click_lunch") return "one-click lunch scanner issue";
  if (intent === "source_hierarchy") return "source hierarchy question";
  return "prior fake issue";
}

function topicQuestion(intent: AnswerIntent): string {
  if (intent === "annual_leave") return "Can annual leave be denied after I submitted inside the fake window?";
  if (intent === "steward_request") return "What should a steward request include before talking to a supervisor?";
  if (intent === "step_one_evidence") return "What evidence belongs in a Step 1 fake file?";
  if (intent === "attendance_sleeping_bathroom") return "How should I frame attendance or sleeping in a bathroom allegation?";
  if (intent === "one_click_lunch") return "Can I grieve a one-click lunch scanner issue?";
  if (intent === "source_hierarchy") return "How should fake source hierarchy and citation conflicts be handled?";
  return "";
}

function detectFollowUpKind(question: string): FollowUpKind {
  const normalized = question.toLowerCase();
  if (/\bevidence\b|\bproof\b|\brecords?\b/.test(normalized)) return "evidence";
  if (/\bverbal\b|\bspoken\b|\bsaid\b|\btold\b/.test(normalized)) return "verbal";
  if (/\bsay\b|\bsupervisor\b|\bscript\b|\bword\b/.test(normalized)) return "supervisor_script";
  if (/\bnext\b|\bdo now\b|\bdo next\b|\bnext step\b/.test(normalized)) return "next_steps";
  return null;
}

function resolveQuestionContext(question: string, history: AnswerHistoryMessage[] = []): ContextResolution {
  const originalQuestion = question.trim() || "What fake source controls this issue?";
  const explicitIntent = detectIntent(originalQuestion);
  if (explicitIntent !== "unknown") {
    return {
      originalQuestion,
      governedQuestion: originalQuestion,
      clarificationNeeded: false,
      followUpKind: detectFollowUpKind(originalQuestion),
    };
  }

  const followUpKind = detectFollowUpKind(originalQuestion);
  if (!followUpKind) {
    return {
      originalQuestion,
      governedQuestion: originalQuestion,
      clarificationNeeded: false,
      followUpKind,
    };
  }

  const topic = lastResolvedTopic(history);
  if (topic === "unknown") {
    return {
      originalQuestion,
      governedQuestion: originalQuestion,
      contextNote: "No prior fake topic was available for this follow-up.",
      clarificationNeeded: true,
      followUpKind,
    };
  }

  const topicText = topicLabel(topic);
  const baseQuestion = topicQuestion(topic);
  const governedQuestion =
    followUpKind === "verbal"
      ? `What if the ${topicText} was only verbal? ${baseQuestion}`
      : followUpKind === "evidence"
        ? `What evidence should I get for the ${topicText}? ${baseQuestion}`
        : followUpKind === "supervisor_script"
          ? `How would I say that to the supervisor about the ${topicText}? ${baseQuestion}`
          : `What should I do next about the ${topicText}? ${baseQuestion}`;

  return {
    originalQuestion,
    governedQuestion,
    contextNote: `Resolved follow-up against prior ${topicText} context.`,
    clarificationNeeded: false,
    followUpKind,
  };
}

function groupSources(docs: FakeDocument[]): AnswerSourceGroup[] {
  return bucketOrder
    .map((bucket) => ({
      bucket,
      label: bucketLabels[bucket],
      docs: docs.filter((doc) => bucketForClass(doc.class) === bucket),
    }))
    .filter((group) => group.docs.length > 0);
}

function hasControllingLanguage(docs: FakeDocument[]): boolean {
  return docs.some((doc) => doc.class === "controlling_contract_language" || doc.class === "local_controlling_source");
}

function modeNote(mode: Mode, noAnswer: boolean): string {
  if (mode === "Strict Research") {
    return noAnswer
      ? "Strict mode blocks a best-guess answer until controlling fake language is found."
      : "Strict mode limits the answer to the cited fake controlling and local sources.";
  }
  if (mode === "Aggressive Grievance") {
    return noAnswer
      ? "Aggressive mode can preserve objections, but it still cannot invent controlling language."
      : "Aggressive mode frames the issue around missing fake proof, bad reasons, and source conflicts.";
  }
  if (mode === "Steward-to-Supervisor") {
    return noAnswer
      ? "Supervisor-facing mode turns the gap into record requests and follow-up questions."
      : "Supervisor-facing mode keeps the answer tied to records, dates, and cited fake sections.";
  }
  return noAnswer
    ? "Calm mode keeps the response neutral and asks for the missing facts."
    : "Calm mode gives the practical answer first, then the source trail.";
}

function shortAnswerFor(intent: AnswerIntent, docs: FakeDocument[], mode: Mode, followUpKind: FollowUpKind): string {
  if (!hasControllingLanguage(docs)) return noAnswerText;

  if (intent === "annual_leave") {
    if (followUpKind === "verbal") {
      return "For the fake annual-leave thread, a verbal denial is not enough by itself. Ask for the denial reason in writing and preserve who said it, when, and what fake board record they relied on.";
    }
    if (followUpKind === "evidence") {
      return "For the fake annual-leave thread, collect the request timestamp, posted window, vacation board snapshot, written or verbal denial record, and any coverage/conflict record used for the decision.";
    }
    if (followUpKind === "supervisor_script") {
      return "Say it as a record request: identify the fake annual-leave request, ask for the specific denial reason, and ask which fake board snapshot or coverage record supports it.";
    }
    if (followUpKind === "next_steps") {
      return "Next, lock down the fake paper trail: request the written denial reason, save the board snapshot, and compare both against the cited fake annual-leave language.";
    }
    if (mode === "Steward-to-Supervisor") {
      return "Please identify the fake annual leave denial reason, the request timestamp, and the vacation board snapshot used for the decision.";
    }
    if (mode === "Aggressive Grievance") {
      return "Challenge the fake denial if it does not cite an allowed fake reason or if the local fake vacation board record does not support the decision.";
    }
    return "The fake controlling path is to compare the request timestamp, posted fake window, board snapshot, and listed denial reason.";
  }

  if (intent === "source_hierarchy") {
    return "Use fake controlling language first, then local fake control, interpretive fake sources, manuals, persuasive history, evidence, notes, and unverified items last.";
  }

  return "The fake controlling source set supports a limited answer, but the exact issue should still be checked against the cited fake sections.";
}

function conflictsFor(intent: AnswerIntent, docs: FakeDocument[], noAnswer: boolean): string[] {
  const conflicts: string[] = [];
  const hasLocal = docs.some((doc) => doc.class === "local_controlling_source" || doc.class === "local_settlement");
  const hasUnverified = docs.some((doc) => doc.class === "unknown_unverified");

  if (noAnswer) {
    conflicts.push("No controlling fake source was found for the exact issue, so best guess stays disabled.");
  }
  if (intent === "annual_leave" && hasLocal) {
    conflicts.push("The fake local window can control timing details, but it does not replace the fake official denial reasons.");
  }
  if (intent === "one_click_lunch") {
    conflicts.push("The fake local settlement is fact-bound; the unverified lunch note is not citable.");
  }
  if (hasUnverified) {
    conflicts.push("Unknown or unverified fake material can create follow-ups only, not proof.");
  }

  return conflicts;
}

function checklistFor(intent: AnswerIntent, detail: Detail): string[] {
  const base: Record<AnswerIntent, string[]> = {
    annual_leave: [
      "Fake request receipt with timestamp",
      "Posted fake vacation board snapshot",
      "Written fake denial reason",
      "Coverage or conflict record used for the decision",
    ],
    steward_request: [
      "Issue summary",
      "Requested meeting date/time",
      "Needed fake records list",
      "Delay reason if acknowledgement was not same-tour",
    ],
    step_one_evidence: [
      "Issue statement",
      "Timeline",
      "Requested remedy",
      "Witness list",
      "Direct records and disputed items separated",
    ],
    attendance_sleeping_bathroom: [
      "Exact time and location",
      "Break authorization record",
      "Direct witness identity",
      "Chance-to-respond note",
      "Separate attendance record from sleeping allegation",
    ],
    one_click_lunch: [
      "Device or scanner identifier placeholder",
      "Training notice",
      "Error report",
      "Adjustment request timing",
      "Verified source replacing the rumor note",
    ],
    source_hierarchy: [
      "Classify each source",
      "Mark citable status",
      "Show conflicts",
      "Keep unverified items out of proof",
    ],
    unknown: [
      "Exact issue",
      "Source type",
      "Date range",
      "Which fake rule is claimed to control",
    ],
  };

  const list = base[intent];
  if (detail === "Simple") return list.slice(0, 3);
  return list;
}

function missingFactsFor(intent: AnswerIntent, noAnswer: boolean): string[] {
  if (!noAnswer) {
    return ["Actual fake record packet still controls the outcome.", "Any missing date, reviewer, or decision record should be added before filing."];
  }

  const missing: Record<AnswerIntent, string[]> = {
    annual_leave: ["The exact fake denial reason", "The board snapshot used for the denial"],
    steward_request: ["Whether the request was acknowledged", "The requested issue and needed records"],
    step_one_evidence: ["Which fake controlling section is alleged", "Which records are verified versus disputed"],
    attendance_sleeping_bathroom: ["Direct observation details", "Break authorization status", "Chance-to-respond record"],
    one_click_lunch: ["Verified fake settlement scope", "Device record", "Training notice", "Adjustment form timing"],
    source_hierarchy: ["The disputed source class", "Whether the source is citable"],
    unknown: ["Exact issue", "Relevant fake source class", "Known facts"],
  };

  return missing[intent];
}

function followUpsFor(intent: AnswerIntent): string[] {
  const followUps: Record<AnswerIntent, string[]> = {
    annual_leave: [
      "Ask for the fake vacation board snapshot.",
      "Ask which listed fake denial reason was used.",
    ],
    steward_request: [
      "Ask for same-tour acknowledgement status.",
      "Split meeting request from document request.",
    ],
    step_one_evidence: [
      "Build a fake evidence packet with verified, disputed, missing, and not-requested labels.",
      "Do not cite steward notes as proof without supporting records.",
    ],
    attendance_sleeping_bathroom: [
      "Ask for direct observation details.",
      "Separate attendance proof from sleeping allegation proof.",
    ],
    one_click_lunch: [
      "Replace rumor with a reviewed fake record before making a claim.",
      "Ask whether the fictional settlement applies to the same sample site and device.",
    ],
    source_hierarchy: [
      "Classify each source before drafting.",
      "Treat conflicts as a visible answer section.",
    ],
    unknown: [
      "Name the exact fake issue.",
      "Add a reviewed fake source before requesting an answer.",
    ],
  };

  return followUps[intent];
}

export function buildAnswer(question: string, options: AnswerOptions): AnswerResult {
  const runtimeVersion = options.runtimeVersion ?? clientVersion;
  const resolution = resolveQuestionContext(question, options.threadHistory);
  const { intent, docs } = resolution.clarificationNeeded
    ? { intent: "unknown" as AnswerIntent, docs: [] as FakeDocument[] }
    : docsForIntent(resolution.governedQuestion, options.scope);
  const orderedDocs = orderFakeDocumentsForCitation(docs);
  const sourceGroups = groupSources(orderedDocs);
  const noAnswer = resolution.clarificationNeeded || !hasControllingLanguage(orderedDocs);
  const citations = dedupeCitations(orderedDocs.filter((doc) => doc.citable).map(citationForDoc));
  const relatedFakeSections = orderedDocs.map(citationForDoc);
  const shortAnswer = resolution.clarificationNeeded
    ? clarificationText
    : shortAnswerFor(intent, docs, options.mode, resolution.followUpKind);
  const footer = `Sources:${docs.length} | Corpus:${runtimeVersion.corpusVersion} | Index:${runtimeVersion.indexVersion} | Build:${runtimeVersion.displayVersion} | Mode:${options.mode}`;

  return {
    answerKind: "fake",
    question: resolution.originalQuestion,
    resolvedQuestion: resolution.governedQuestion !== resolution.originalQuestion ? resolution.governedQuestion : undefined,
    contextNote: resolution.contextNote,
    clarificationNeeded: resolution.clarificationNeeded,
    intent,
    shortAnswer,
    modeNote: resolution.clarificationNeeded ? "Context follow-up mode asks a clarifying question instead of inventing a fake source match." : modeNote(options.mode, noAnswer),
    noAnswer,
    bestGuessDisabled: noAnswer,
    sourceGroups,
    citations,
    conflicts: conflictsFor(intent, orderedDocs, noAnswer),
    evidenceChecklist: checklistFor(intent, options.detail),
    missingFacts: missingFactsFor(intent, noAnswer),
    followUps: followUpsFor(intent),
    relatedFakeSections,
    footer,
    version: runtimeVersion,
    generatedAt: new Date().toISOString(),
  };
}

export function answerToMarkdown(answer: AnswerResult): string {
  const citations = answer.citations.length > 0
    ? answer.citations.map((citation, index) => `${index + 1}. ${citationLabel(citation)}`).join("\n")
    : answer.answerKind === "public" ? "No supported public-source citation." : "No citable fake sources.";

  return [
    `Short answer: ${answer.shortAnswer}`,
    answer.contextNote ? `Context: ${answer.contextNote}` : null,
    `Mode note: ${answer.modeNote}`,
    `Conflicts: ${answer.conflicts.join(" | ") || "No visible fake-source conflicts."}`,
    `Evidence checklist: ${answer.evidenceChecklist.join(" | ")}`,
    `Missing facts: ${answer.missingFacts.join(" | ")}`,
    `Citations:\n${citations}`,
    answer.footer,
  ].filter((line): line is string => typeof line === "string").join("\n\n");
}
