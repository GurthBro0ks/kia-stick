import type { AnswerResult } from "@/lib/answerGovernor";
import {
  CBA_DOCUMENT_STATUS,
  CBA_EFFECTIVE_END,
  CBA_EFFECTIVE_START,
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SCOPE_WARNING,
  CBA_SOURCE_CLASS,
  CBA_SOURCE_ID,
  CBA_SOURCE_OWNER,
  CBA_SOURCE_PAGE_URL,
  CBA_SOURCE_PDF_URL,
  CBA_SOURCE_TITLE,
  searchCba,
  type CbaParagraph,
  type CbaSourceCache,
} from "@/lib/cbaSource";
import {
  PUBLIC_SOURCE_APPLICABILITY_WARNING,
  PUBLIC_SOURCE_ID,
  type PublicSourceCache,
} from "@/lib/publicSource";
import { citationForPublicParagraph } from "@/lib/publicSourceAnswer";
import type { Citation, Detail, Mode, Scope } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export type CbaQuestionIntent = "grievance_deadline" | "article_17" | "article_16" | "cross_source" | "case_outcome" | "unsupported";

export const genericCbaRetrievalSuggestions = [
  "What does Article 15 say?",
  "What does Article 16 say about discipline?",
  "What does Article 17 say about steward representation?",
];

export function detectCbaIntent(question: string): CbaQuestionIntent {
  const normalized = question.toLowerCase();
  if (/\b(nlrb|weingarten)\b/.test(normalized) && /\b(cba|collective bargaining agreement|contract)\b/.test(normalized)) return "cross_source";
  if (/\b(article\s*15|grievance)\b/.test(normalized) && /\b(days?|deadline|file|filing|timely|time limit)\b/.test(normalized)) return "grievance_deadline";
  if (/\barticle\s*17\b/.test(normalized) || (/\b(representation|steward)\b/.test(normalized) && /\b(cba|contract|article)\b/.test(normalized))) return "article_17";
  if (/\barticle\s*16\b/.test(normalized) || /\bjust[ -]?cause\b/.test(normalized) || (/\bdisciplin(?:e|ary)\b/.test(normalized) && /\b(protection|contract|cause)\b/.test(normalized))) return "article_16";
  if (/\b(my|specific|this)\s+(case|situation)\b/.test(normalized) || /\bdid management violate\b/.test(normalized)) return "case_outcome";
  if (/\barticle\s*(?:[1-9]|[1-3][0-9]|4[0-3])\b/.test(normalized)) return "unsupported";
  return "unsupported";
}

function cbaCitation(source: CbaSourceCache, paragraph: CbaParagraph): Citation {
  const sectionId = paragraph.sectionNumber ? `section-${paragraph.sectionNumber}` : "section-unknown";
  return {
    id: `${CBA_SOURCE_ID}@${paragraph.id}`,
    title: CBA_SOURCE_TITLE,
    class: CBA_SOURCE_CLASS,
    scope: "Official-Like",
    status: "official_final_public_read_only",
    page: `PDF ${paragraph.pdfPageNumber}${paragraph.printedPageLabel ? ` / printed ${paragraph.printedPageLabel}` : " / printed unknown"}`,
    article: paragraph.articleNumber ? `Article ${paragraph.articleNumber}` : paragraph.structuralType,
    section: paragraph.sectionNumber ? `Section ${paragraph.sectionNumber}` : "Section unknown",
    file: CBA_SOURCE_PDF_URL,
    hash: source.normalized.sha256,
    citable: true,
    sourceKind: "public",
    sourceId: CBA_SOURCE_ID,
    sectionId,
    paragraphId: paragraph.id,
    retrievedAt: source.retrievedAt,
    contentHash: source.normalized.sha256,
    officialUrl: CBA_SOURCE_PDF_URL,
    publicSourceType: "cba_contract",
    sourcePageUrl: CBA_SOURCE_PAGE_URL,
    officialPdfUrl: CBA_SOURCE_PDF_URL,
    responseHash: source.response.sha256,
    effectiveStart: CBA_EFFECTIVE_START,
    effectiveEnd: CBA_EFFECTIVE_END,
    pdfPageIndex: paragraph.pdfPageIndex,
    pdfPageNumber: paragraph.pdfPageNumber,
    printedPageLabel: paragraph.printedPageLabel,
    structuralType: paragraph.structuralType,
    articleNumber: paragraph.articleNumber,
    articleTitle: paragraph.articleTitle,
    subsection: paragraph.subsection,
    provider: CBA_PROVIDER,
    promptVersion: CBA_PROMPT_VERSION,
  };
}

function paragraphsForArticle(source: CbaSourceCache, articleNumber: string): CbaParagraph[] {
  return source.normalized.pages.flatMap((page) => page.paragraphs).filter((paragraph) => paragraph.articleNumber === articleNumber);
}

function distinctParagraphs(paragraphs: Array<CbaParagraph | undefined>): CbaParagraph[] {
  const seen = new Set<string>();
  return paragraphs.filter((paragraph): paragraph is CbaParagraph => {
    if (!paragraph || seen.has(paragraph.id)) return false;
    seen.add(paragraph.id);
    return true;
  });
}

function findNlrBCitation(source: PublicSourceCache | null): Citation[] {
  if (!source) return [];
  for (const section of source.normalized.sections) {
    const paragraph = section.paragraphs.find((candidate) => /right to request.*union representative|union-represented employees/i.test(candidate.text));
    if (paragraph) return [{ ...citationForPublicParagraph(source, section, paragraph), publicSourceType: "nlrb_guidance" }];
  }
  const section = source.normalized.sections[0];
  const paragraph = section?.paragraphs[0];
  return section && paragraph ? [{ ...citationForPublicParagraph(source, section, paragraph), publicSourceType: "nlrb_guidance" }] : [];
}

function baseAnswer(input: {
  question: string;
  runtimeVersion: RuntimeVersion;
  mode: Mode;
  scope: Scope;
  source: CbaSourceCache | null;
  shortAnswer: string;
  citations: Citation[];
  noAnswer: boolean;
  role?: AnswerResult["publicSourceRole"];
  conflicts?: string[];
  evidenceChecklist?: string[];
  missingFacts?: string[];
  followUps?: string[];
  suggestedQuestions?: string[];
}): AnswerResult {
  return {
    answerKind: "public",
    publicSourceRole: input.role ?? "cba_contract",
    sourceOwner: CBA_SOURCE_OWNER,
    sourceTitle: CBA_SOURCE_TITLE,
    sourceStatus: CBA_DOCUMENT_STATUS,
    effectiveStart: CBA_EFFECTIVE_START,
    effectiveEnd: CBA_EFFECTIVE_END,
    pdfSha256: input.source?.response.sha256,
    scopeWarning: CBA_SCOPE_WARNING,
    authorityClassification: CBA_SOURCE_CLASS,
    question: input.question,
    intent: "source_hierarchy",
    shortAnswer: input.shortAnswer,
    modeNote: `${CBA_SCOPE_WARNING} This deterministic citation-first summary is not legal advice and does not decide disputed facts.`,
    noAnswer: input.noAnswer,
    bestGuessDisabled: input.noAnswer,
    sourceGroups: [],
    citations: input.citations,
    conflicts: input.conflicts ?? ["Application depends on coverage, craft, employee status, local agreements, memoranda, and case facts."],
    evidenceChecklist: input.evidenceChecklist ?? ["Read the exact cited contract passage.", "Confirm the applicable craft, status, trigger date, and procedural posture."],
    missingFacts: input.missingFacts ?? ["Employee coverage and the facts that trigger the cited provision."],
    followUps: input.followUps ?? ["Open the cited CBA paragraph in Sources and verify the rule against the actual facts."],
    suggestedQuestions: input.suggestedQuestions,
    relatedFakeSections: [],
    footer: `PUBLIC DATA PILOT | Lane:public_cba | Source:${CBA_SOURCE_ID} | Content:${input.source?.normalized.sha256 ?? "unavailable"} | Scope:${input.scope} | SelectedMode:${input.mode}`,
    version: { ...input.runtimeVersion, promptVersion: CBA_PROMPT_VERSION, provider: CBA_PROVIDER },
    generatedAt: new Date().toISOString(),
  };
}

function unavailableAnswer(input: { question: string; source: CbaSourceCache | null; runtimeVersion: RuntimeVersion; mode: Mode; scope: Scope }): AnswerResult {
  return baseAnswer({
    ...input,
    shortAnswer: input.source
      ? "No exact CBA passage was retrieved for this search. Refine the query with an article, section, or contract phrase. That result does not establish that the CBA lacks a rule on the topic."
      : "The exact allowlisted CBA cache is unavailable. No other source, path, or fake answer lane was substituted.",
    citations: [],
    noAnswer: true,
    conflicts: [input.source ? "No exact passage was retrieved from the allowlisted CBA for this query." : "The exact validated CBA cache is unavailable."],
    missingFacts: [input.source ? "An exact article, section, or contract phrase to retrieve." : "The validated local CBA PDF and normalized cache."],
    followUps: [input.source ? "Refine the query with an article, section, or exact contract phrase." : `Run node scripts/public-source-sync.mjs ${CBA_SOURCE_ID}.`],
    suggestedQuestions: input.source ? genericCbaRetrievalSuggestions : undefined,
  });
}

function buildGenericCbaRetrievalAnswer(input: {
  question: string;
  source: CbaSourceCache;
  runtimeVersion: RuntimeVersion;
  mode: Mode;
  scope: Scope;
}): AnswerResult {
  const retrievalQuery = input.question
    .replace(/\b(what|does|the|a|an|cba|apwu|usps|collective|bargaining|agreement|contract|say|about|show|tell|me|please)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const matches = retrievalQuery ? searchCba(input.source, retrievalQuery, 3) : [];
  if (matches.length === 0) return unavailableAnswer({ ...input, source: input.source });
  const passages = matches.map((match, index) => `Passage ${index + 1}: “${match.paragraph.text}”`).join("\n\n");
  return baseAnswer({
    ...input,
    shortAnswer: `Exact CBA passages retrieved for “${input.question}”:\n\n${passages}`,
    citations: matches.map((match) => cbaCitation(input.source, match.paragraph)),
    noAnswer: false,
    conflicts: ["These are retrieved contract passages. They do not determine a case outcome or add an interpretation."],
    evidenceChecklist: ["Read each quoted passage and its exact citation anchor.", "Confirm whether the retrieved passage addresses the question you intend to ask."],
    missingFacts: ["No case-specific conclusion was generated from this retrieval."],
    followUps: ["Open a citation in Sources, or refine the query with an article, section, or exact contract phrase."],
  });
}

export function buildCbaAnswer(input: {
  question: string;
  source: CbaSourceCache | null;
  nlrbSource: PublicSourceCache | null;
  runtimeVersion: RuntimeVersion;
  mode: Mode;
  scope: Scope;
  detail: Detail;
}): AnswerResult {
  const question = input.question.trim();
  if (!input.source) return unavailableAnswer({ ...input, question });
  const intent = detectCbaIntent(question);

  if (intent === "grievance_deadline") {
    const article = paragraphsForArticle(input.source, "15");
    const matches = distinctParagraphs([
      article.find((paragraph) => paragraph.sectionNumber === "2" && paragraph.subsection === "Step 1(a)" && /within fourteen \(14\) days/i.test(paragraph.text)),
      article.find((paragraph) => /first learned or may reasonably have been expected to have learned/i.test(paragraph.text)),
    ]);
    if (matches.length === 0) return unavailableAnswer({ ...input, question });
    return baseAnswer({
      ...input,
      question,
      shortAnswer: "Article 15, Section 2, Step 1(a) states a fourteen-day period for an employee to discuss a grievance with the immediate supervisor, measured from when the employee or Union first learned or reasonably may have been expected to learn of its cause. The same passage also addresses a Union-initiated Step 1 grievance. Other grievance types or procedural postures may have different triggers, so this is not an unqualified deadline for every possible grievance.",
      citations: matches.map((paragraph) => cbaCitation(input.source!, paragraph)),
      noAnswer: false,
      missingFacts: ["The grievance type, when the employee or Union learned or reasonably should have learned of the cause, and whether another contractual procedure applies."],
    });
  }

  if (intent === "article_17") {
    const article = paragraphsForArticle(input.source, "17");
    const matches = distinctParagraphs([
      article.find((paragraph) => paragraph.sectionNumber === "1" && /investigating, presenting and adjusting grievances/i.test(paragraph.text)),
      article.find((paragraph) => /permission.*shall not be unreasonably denied/i.test(paragraph.text)),
      article.find((paragraph) => /time reasonably necessary to write a grievance/i.test(paragraph.text)),
    ]);
    if (matches.length === 0) return unavailableAnswer({ ...input, question });
    return baseAnswer({
      ...input,
      question,
      shortAnswer: "Article 17 is CBA representation language. It provides for stewards to investigate, present, and adjust grievances and includes contract rules governing steward designation, access, permission, and compensated grievance-handling time. These citations are contract provisions; they are distinct from the separate NLRB Weingarten general-guidance source.",
      citations: matches.map((paragraph) => cbaCitation(input.source!, paragraph)),
      noAnswer: false,
      conflicts: [`Article 17 contract language and ${PUBLIC_SOURCE_ID} general guidance have distinct source roles and are not silently blended.`],
    });
  }

  if (intent === "article_16") {
    const article = paragraphsForArticle(input.source, "16");
    const matches = distinctParagraphs([
      article.find((paragraph) => /discipline should be corrective in nature, rather than punitive/i.test(paragraph.text)),
      article.find((paragraph) => /no employee may be disciplined or discharged except for just cause/i.test(paragraph.text)),
      article.find((paragraph) => /subject to the grievance-arbitration procedure/i.test(paragraph.text)),
    ]);
    if (matches.length === 0) return unavailableAnswer({ ...input, question });
    return baseAnswer({
      ...input,
      question,
      shortAnswer: "Article 16 states that discipline should be corrective rather than punitive and that an employee may not be disciplined or discharged except for just cause. It also makes discipline or discharge subject to the grievance-arbitration procedure. Whether those protections establish an outcome in a particular matter depends on the facts and procedural posture.",
      citations: matches.map((paragraph) => cbaCitation(input.source!, paragraph)),
      noAnswer: false,
      missingFacts: ["The charge, evidence, prior record, notice, level of discipline, employee status, timing, and grievance posture."],
    });
  }

  if (intent === "cross_source") {
    const cbaParagraph = paragraphsForArticle(input.source, "17").find((paragraph) => paragraph.sectionNumber === "1" && /investigating, presenting and adjusting grievances/i.test(paragraph.text));
    const citations = [cbaParagraph ? cbaCitation(input.source, cbaParagraph) : undefined, ...findNlrBCitation(input.nlrbSource)].filter((citation): citation is Citation => Boolean(citation));
    return baseAnswer({
      ...input,
      question,
      role: "cross_source",
      shortAnswer: `No automatic override is established. The APWU-USPS CBA is controlling contract language for covered employees within its scope; the NLRB Weingarten page is official general statutory guidance, and ${PUBLIC_SOURCE_APPLICABILITY_WARNING.toLowerCase()} Conflicts or application questions may require additional authoritative interpretation. Each citation remains labeled by its own source and authority role.`,
      citations,
      noAnswer: false,
      conflicts: ["No source hierarchy rule in these two cached sources establishes that one automatically overrides the other for every issue."],
      missingFacts: ["The precise issue, employee coverage, statutory question, contract provision, and any authoritative interpretation governing the apparent conflict."],
    });
  }

  if (intent === "case_outcome") {
    const relevant = [
      ...searchCba(input.source, "Article 15 grievance", 1),
      ...searchCba(input.source, "Article 16 just cause discipline", 1),
    ].map((result) => result.paragraph);
    return baseAnswer({
      ...input,
      question,
      shortAnswer: "I cannot determine whether management violated the contract in a specific case from this question and the CBA alone. The contract supplies rules, but a violation finding requires the relevant facts, coverage, dates, actions, defenses, local or incorporated authority, and procedural posture.",
      citations: distinctParagraphs(relevant).map((paragraph) => cbaCitation(input.source!, paragraph)),
      noAnswer: true,
      conflicts: ["The CBA is authoritative contract language, but it does not establish the disputed facts of this case."],
      missingFacts: ["Who is covered, what occurred, when it occurred, notice and response, relevant craft or local provisions, documents, witnesses, and grievance status."],
      followUps: ["Use CBA search to identify potentially relevant articles, then gather the missing facts without entering private case data into this public pilot."],
    });
  }

  return buildGenericCbaRetrievalAnswer({ ...input, question, source: input.source });
}

export function buildSafeRouterNoAnswer(input: {
  question: string;
  runtimeVersion: RuntimeVersion;
  mode: Mode;
  scope: Scope;
}): AnswerResult {
  const safeRouterProvider = "local-source-router-deterministic";
  const safeRouterPrompt = "prompt.source-router.v0.1-safe-no-answer";
  return {
    ...baseAnswer({
      ...input,
      source: null,
      shortAnswer: "No approved deterministic source intent supports this question. The router did not substitute CBA, NLRB, or fake claims.",
      citations: [],
      noAnswer: true,
      role: "safe_no_answer",
      conflicts: ["No approved CBA intent, NLRB intent, or known fake-corpus prompt matched."],
      missingFacts: ["An approved source lane and a source-supported question."],
      followUps: ["Select CBA, NLRB Guidance, or Fake Sample explicitly and ask a source-bounded question."],
    }),
    sourceOwner: undefined,
    sourceTitle: undefined,
    sourceStatus: undefined,
    pdfSha256: undefined,
    scopeWarning: undefined,
    authorityClassification: "unsupported_router_question",
    footer: `PUBLIC DATA PILOT | Lane:safe_no_answer | Sources:0 | SelectedMode:${input.mode} | Provider:${safeRouterProvider}`,
    version: { ...input.runtimeVersion, promptVersion: safeRouterPrompt, provider: safeRouterProvider },
  };
}
