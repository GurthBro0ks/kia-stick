import type { AnswerResult } from "@/lib/answerGovernor";
import type { Citation, Detail, Mode, Scope } from "@/lib/sourceModel";
import {
  PUBLIC_SOURCE_APPLICABILITY_WARNING,
  PUBLIC_SOURCE_CLASS,
  PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_OWNER,
  PUBLIC_SOURCE_POSTAL_APPLICABILITY,
  PUBLIC_SOURCE_PROMPT_VERSION,
  PUBLIC_SOURCE_PROVIDER,
  PUBLIC_SOURCE_URL,
  type PublicSourceCache,
  type PublicSourceParagraph,
  type PublicSourceSection,
} from "@/lib/publicSource";
import type { RuntimeVersion } from "@/lib/version";

type PublicQuestionIntent = "request" | "representative_role" | "postal_applicability" | "unsupported";

interface ParagraphMatch {
  section: PublicSourceSection;
  paragraph: PublicSourceParagraph;
}

function detectPublicIntent(question: string): PublicQuestionIntent {
  const normalized = question.toLowerCase();
  if (/\b(usps|postal|post office|letter carrier|mail handler)\b/.test(normalized)) return "postal_applicability";
  if (/\b(role|representative play|representative do|may the representative|active assistance|advice)\b/.test(normalized)) {
    return "representative_role";
  }
  if (
    /\b(when|request|represented employee|investigatory interview|lead to discipline|union representative)\b/.test(normalized) &&
    /\b(represent|interview|investigat|disciplin|union)\b/.test(normalized)
  ) return "request";
  return "unsupported";
}

function allParagraphs(source: PublicSourceCache): ParagraphMatch[] {
  return source.normalized.sections.flatMap((section) => section.paragraphs.map((paragraph) => ({ section, paragraph })));
}

function findParagraphs(source: PublicSourceCache, patterns: RegExp[], limit: number): ParagraphMatch[] {
  const matches: ParagraphMatch[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    const match = allParagraphs(source).find((candidate) => pattern.test(candidate.paragraph.text) && !seen.has(candidate.paragraph.id));
    if (match) {
      matches.push(match);
      seen.add(match.paragraph.id);
    }
    if (matches.length >= limit) break;
  }
  return matches;
}

export function citationForPublicParagraph(
  source: PublicSourceCache,
  section: PublicSourceSection,
  paragraph: PublicSourceParagraph
): Citation {
  return {
    id: `${PUBLIC_SOURCE_ID}@${section.id}@${paragraph.id}`,
    title: source.source.title,
    class: "persuasive_authority",
    scope: "Official-Like",
    status: "public_non_sensitive_read_only",
    page: source.retrievedAt.slice(0, 10),
    article: PUBLIC_SOURCE_CLASS,
    section: section.id,
    file: PUBLIC_SOURCE_URL,
    hash: source.normalized.sha256,
    citable: true,
    sourceKind: "public",
    sourceId: PUBLIC_SOURCE_ID,
    sectionId: section.id,
    paragraphId: paragraph.id,
    retrievedAt: source.retrievedAt,
    contentHash: source.normalized.sha256,
    officialUrl: PUBLIC_SOURCE_URL,
  };
}

function unavailableAnswer(
  question: string,
  runtimeVersion: RuntimeVersion,
  mode: Mode,
  sourceUnavailable: boolean
): AnswerResult {
  return {
    answerKind: "public",
    publicSourceRole: "nlrb_guidance",
    sourceOwner: PUBLIC_SOURCE_OWNER,
    postalApplicability: PUBLIC_SOURCE_POSTAL_APPLICABILITY,
    controllingForUsps: PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
    question,
    intent: "source_hierarchy",
    shortAnswer: sourceUnavailable
      ? "The allowlisted public source is unavailable in the bounded local cache. Run the explicit operator sync command, then try again."
      : "The allowlisted NLRB Weingarten public source does not support the requested claim. No answer was generated.",
    modeNote: "Citation-first public mode blocks unsupported answers and never falls back to fake claims, another URL, or an external model.",
    noAnswer: true,
    bestGuessDisabled: true,
    sourceGroups: [],
    citations: [],
    conflicts: [sourceUnavailable ? "The exact local cache is unavailable." : "The question is outside the one-source Weingarten pilot."],
    evidenceChecklist: ["Use only the exact allowlisted NLRB source.", "Do not treat this source as USPS-controlling authority."],
    missingFacts: [sourceUnavailable ? "A validated local public-source cache." : "A supported Weingarten question."],
    followUps: [sourceUnavailable ? `Run node scripts/public-source-sync.mjs ${PUBLIC_SOURCE_ID}.` : "Ask a supported NLRB Weingarten public-pilot question."],
    relatedFakeSections: [],
    footer: `PUBLIC DATA PILOT | Lane:public | Sources:0 | Mode:${mode} | USPS applicability:${PUBLIC_SOURCE_POSTAL_APPLICABILITY} | ControllingForUsps:${PUBLIC_SOURCE_CONTROLLING_FOR_USPS}`,
    version: { ...runtimeVersion, promptVersion: PUBLIC_SOURCE_PROMPT_VERSION, provider: PUBLIC_SOURCE_PROVIDER },
    generatedAt: new Date().toISOString(),
  };
}

export function buildPublicSourceAnswer(input: {
  question: string;
  source: PublicSourceCache | null;
  runtimeVersion: RuntimeVersion;
  mode: Mode;
  scope: Scope;
  detail: Detail;
}): AnswerResult {
  const question = input.question.trim();
  if (!input.source) return unavailableAnswer(question, input.runtimeVersion, input.mode, true);
  const intent = detectPublicIntent(question);
  if (intent === "unsupported") return unavailableAnswer(question, input.runtimeVersion, input.mode, false);

  let shortAnswer: string;
  let matches: ParagraphMatch[];
  if (intent === "request") {
    shortAnswer =
      "According to this NLRB guidance, a union-represented employee may request representation when management questions the employee as part of an investigation and the employee reasonably believes the interview could lead to discipline or another adverse job consequence. The employee must make the request.";
    matches = findParagraphs(
      input.source,
      [/seeking to question an employee/i, /reasonably believes.*(?:discipline|discharge|adverse consequence)/i, /employee requests a union representative/i],
      3
    );
  } else if (intent === "representative_role") {
    shortAnswer =
      "The guidance describes the representative as an advisor and witness who may confer with the employee, seek clarification, give limited advice on answering, add information after questioning, and object to badgering, intimidating, or offensive questions. The representative may not disrupt the investigation or direct false answers.";
    matches = findParagraphs(
      input.source,
      [/serve as advisors and witnesses/i, /clarify questions.*provide additional information/i, /may not tell an employee what to say/i],
      3
    );
  } else {
    shortAnswer = `No. ${PUBLIC_SOURCE_APPLICABILITY_WARNING} Postal applicability is unverified, and this pilot does not present the page as controlling USPS authority.`;
    matches = findParagraphs(input.source, [/not been reviewed or approved by the Board/i, /only union-represented employees have this right/i], 2);
  }
  if (matches.length === 0) return unavailableAnswer(question, input.runtimeVersion, input.mode, true);

  const citations = matches.map((match) => citationForPublicParagraph(input.source!, match.section, match.paragraph));
  return {
    answerKind: "public",
    publicSourceRole: "nlrb_guidance",
    sourceOwner: PUBLIC_SOURCE_OWNER,
    postalApplicability: PUBLIC_SOURCE_POSTAL_APPLICABILITY,
    controllingForUsps: PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
    question,
    intent: "source_hierarchy",
    shortAnswer,
    modeNote: `${PUBLIC_SOURCE_APPLICABILITY_WARNING} Public-source output is deterministic, citation-first, and not legal advice.`,
    noAnswer: false,
    bestGuessDisabled: false,
    sourceGroups: [],
    citations,
    conflicts: ["This is official general NLRB guidance, not an APWU source or controlling USPS-specific authority."],
    evidenceChecklist: ["Open each exact paragraph citation.", "Review the separate official-source link.", "Verify USPS-specific authority elsewhere before relying on a controlling claim."],
    missingFacts: ["USPS-specific controlling applicability remains unverified."],
    followUps: ["Review the cited source paragraphs and the official page qualification."],
    relatedFakeSections: [],
    footer: `PUBLIC DATA PILOT | Lane:public | Source:${PUBLIC_SOURCE_ID} | Content:${input.source.normalized.sha256} | Scope:${input.scope} | PostalApplicability:${PUBLIC_SOURCE_POSTAL_APPLICABILITY} | ControllingForUsps:${PUBLIC_SOURCE_CONTROLLING_FOR_USPS}`,
    version: { ...input.runtimeVersion, promptVersion: PUBLIC_SOURCE_PROMPT_VERSION, provider: PUBLIC_SOURCE_PROVIDER },
    generatedAt: new Date().toISOString(),
  };
}
