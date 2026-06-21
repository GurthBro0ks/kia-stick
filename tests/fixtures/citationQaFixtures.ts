import type { AnswerIntent } from "@/lib/answerGovernor";
import type { SourceHierarchy } from "@/lib/sourceModel";

export interface CitationQaCase {
  id: string;
  prompt: string;
  intent: AnswerIntent;
  expectedCitationIds: string[];
  expectedRelatedIds?: string[];
  excludedCitationIds?: string[];
  expectedConflictText?: string[];
  noAnswer: boolean;
}

export const expectedSourceHierarchy: SourceHierarchy[] = [
  "local",
  "state_area",
  "national",
  "manuals_handbooks",
  "arbitration_settlements",
  "steward_notes_evidence",
  "unknown",
];

export const citationQaCases: CitationQaCase[] = [
  {
    id: "annual-leave-hierarchy-order",
    prompt: "Can annual leave be denied after I submitted inside the fake window?",
    intent: "annual_leave",
    expectedCitationIds: [
      "fake-local-annual-leave-window",
      "fake-past-practice-vacation-board",
      "fake-official-annual-leave",
    ],
    expectedConflictText: ["fake local window can control timing details"],
    noAnswer: false,
  },
  {
    id: "lunch-no-answer-uncited-rumor",
    prompt: "Can I grieve a one-click lunch scanner issue?",
    intent: "one_click_lunch",
    expectedCitationIds: ["fake-settlement-lunch-click"],
    expectedRelatedIds: ["fake-settlement-lunch-click", "fake-unknown-unverified-lunch-rumor"],
    excludedCitationIds: ["fake-unknown-unverified-lunch-rumor"],
    expectedConflictText: ["No controlling fake source", "unverified lunch note is not citable", "Unknown or unverified fake material"],
    noAnswer: true,
  },
  {
    id: "step-one-no-answer-citable-support",
    prompt: "What evidence belongs in a Step 1 fake file?",
    intent: "step_one_evidence",
    expectedCitationIds: ["fake-manual-step-one-evidence", "fake-evidence-step-one-packet"],
    expectedConflictText: ["No controlling fake source"],
    noAnswer: true,
  },
];
