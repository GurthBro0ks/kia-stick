import { answerToMarkdown, buildAnswer, detectIntent, type AnswerResult } from "@/lib/answerGovernor";
import {
  PUBLIC_SOURCE_APPLICABILITY_WARNING,
  PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
  PUBLIC_SOURCE_OWNER,
  PUBLIC_SOURCE_POSTAL_APPLICABILITY,
} from "@/lib/publicSource";
import { CBA_SCOPE_WARNING, CBA_SOURCE_OWNER } from "@/lib/cbaSource";
import { sha256Hex, type CitationVerificationState } from "@/lib/cbaCitationIntegrity";
import type { Detail, Mode, Scope } from "@/lib/sourceModel";
import { clientVersion } from "@/lib/version";
import {
  PUBLIC_ARGUMENT_PLAN_SAVED_TYPE,
  publicArgumentPlanToText,
  type PublicArgumentPlan,
} from "@/lib/publicArgumentPlan";
import {
  PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
  publicGrievanceOutlineToText,
  type PublicGrievanceOutline,
} from "@/lib/publicGrievanceOutline";

export interface SavedAnswer {
  id: string;
  saveKey: string;
  dataFingerprint: string;
  question: string;
  answer: string;
  mode: Mode;
  scope: Scope;
  detail: Detail;
  citations: AnswerResult["citations"];
  version: AnswerResult["version"];
  provider: string;
  answerLane: "fake" | "public" | "public_cba";
  sourceId?: string;
  sourceTitle?: string;
  sourceOwner?: string;
  sourceStatus?: string;
  effectiveStart?: string;
  effectiveEnd?: string;
  pdfSha256?: string;
  scopeWarning?: string;
  authorityClassification?: string;
  sourceRetrievedAt?: string;
  normalizedSourceHash?: string;
  sourceInstanceId?: string;
  sourceInstanceAlgorithmVersion?: string;
  paragraphContentSha256?: string;
  paragraphHashAlgorithmVersion?: string;
  citationAnchorSha256?: string;
  citationAnchorAlgorithmVersion?: string;
  citationVerificationStateAtSave?: CitationVerificationState;
  postalApplicability?: string;
  controllingForUsps?: string;
  timestamp: string;
  footer: string;
  savedType:
    | "answer"
    | typeof PUBLIC_ARGUMENT_PLAN_SAVED_TYPE
    | typeof PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE;
  argumentPlan?: PublicArgumentPlan;
  grievanceOutline?: PublicGrievanceOutline;
}

export type SavedRecordType = SavedAnswer["savedType"];

export type SaveAnswerStatus = "created" | "replaced" | "duplicate";

export interface SaveAnswerResult {
  status: SaveAnswerStatus;
  saved: SavedAnswer[];
  record: SavedAnswer;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function savedRecordId(savedType: SavedRecordType, saveKey: string): string {
  const namespace = savedType === PUBLIC_ARGUMENT_PLAN_SAVED_TYPE
    ? "public-argument-plan"
    : savedType === PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE
      ? "public-grievance-outline"
    : "answer";
  return `saved-${namespace}-${sha256Hex(saveKey)}`;
}

const modes = ["Strict Research", "Calm Neutral", "Aggressive Grievance", "Steward-to-Supervisor"] as const;
const scopes = ["All Fake", "Official-Like", "Local-Like", "Notes+Evidence"] as const;
const details = ["Simple", "Detailed", "Checklist"] as const;

function validMode(value: unknown): Mode {
  return typeof value === "string" && (modes as readonly string[]).includes(value) ? (value as Mode) : "Strict Research";
}

function validScope(value: unknown): Scope {
  return typeof value === "string" && (scopes as readonly string[]).includes(value) ? (value as Scope) : "All Fake";
}

function validDetail(value: unknown): Detail {
  return typeof value === "string" && (details as readonly string[]).includes(value) ? (value as Detail) : "Detailed";
}

type CitationLike = Partial<AnswerResult["citations"][number]>;

function normalizedCitationLocator(citation: CitationLike): string {
  const locator = [
    citation.id,
    citation.title,
    citation.article,
    citation.section,
    citation.page,
    citation.file,
    citation.hash,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeText)
    .join("@");

  return locator || "unknown-citation";
}

function citationIdentity(citations: CitationLike[]): string {
  return [...new Set(citations.map(normalizedCitationLocator))].sort().join(",");
}

function normalizedListIdentity(items: string[]): string {
  return [...new Set(items.map(normalizeText).filter(Boolean))].sort().join("|");
}

function stableAnswerIdentity(answer: AnswerResult): string {
  return [
    normalizeText(answer.shortAnswer),
    answer.intent,
    citationIdentity(answer.citations),
  ].join("|");
}

function stableAnswerFingerprint(answer: AnswerResult, mode: Mode, scope: Scope, detail: Detail): string {
  return [
    savedAnswerKey(answer, mode, scope),
    detail,
    normalizeText(answer.modeNote),
    normalizedListIdentity(answer.conflicts),
    normalizedListIdentity(answer.evidenceChecklist),
    normalizedListIdentity(answer.missingFacts),
    normalizedListIdentity(answer.followUps),
    answer.version.corpusVersion,
    answer.version.indexVersion,
    answer.version.promptVersion,
    answer.version.provider,
    answer.sourceOwner ?? "",
    answer.postalApplicability ?? "",
    answer.controllingForUsps ?? "",
    answer.sourceTitle ?? "",
    answer.sourceStatus ?? "",
    answer.effectiveStart ?? "",
    answer.effectiveEnd ?? "",
    answer.pdfSha256 ?? "",
    answer.scopeWarning ?? "",
    answer.authorityClassification ?? "",
  ].join("|");
}

function savedAnswerRecordContentKey(item: Pick<SavedAnswer, "question" | "answer" | "mode" | "scope" | "citations">): string {
  const shortAnswerLine = item.answer
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("short answer:"))
    ?.replace(/^short answer:\s*/i, "") ?? item.answer.split("\n")[0] ?? "";
  return [
    normalizeText(item.question),
    item.mode,
    item.scope,
    normalizeText(shortAnswerLine),
    detectIntent(item.question),
    citationIdentity(item.citations),
  ].join("|");
}

function legacyFingerprint(item: Pick<SavedAnswer, "saveKey" | "answer" | "detail" | "citations">): string {
  const answerWithoutBuild = item.answer
    .replace(/Build:[^\n|]+/g, "Build:<ignored>")
    .replace(/0\.4\.0-dev\.\d{8}\+[a-z0-9]+/gi, "displayVersion:<ignored>")
    .replace(/0\.3\.0-dev\.\d{8}\+[a-z0-9]+/gi, "displayVersion:<ignored>")
    .replace(/gitSha:[^\n|]+/gi, "gitSha:<ignored>")
    .replace(/(createdAt|savedAt|timestamp):[^\n|]+/gi, "$1:<ignored>");
  return [
    item.saveKey,
    item.detail,
    normalizeText(answerWithoutBuild),
    citationIdentity(item.citations),
  ].join("|");
}

export function savedAnswerKey(answer: AnswerResult, mode: Mode, scope: Scope): string {
  return [
    normalizeText(answer.question),
    mode,
    scope,
    stableAnswerIdentity(answer),
  ].join("|");
}

export function savedAnswerFingerprint(answer: AnswerResult, mode: Mode, scope: Scope, detail: Detail): string {
  return stableAnswerFingerprint(answer, mode, scope, detail);
}

export function createSavedAnswerRecord(input: {
  answer: AnswerResult;
  mode: Mode;
  scope: Scope;
  detail: Detail;
  timestamp: string;
}): SavedAnswer {
  const renderedAnswer = answerToMarkdown(input.answer);
  const saveKey = savedAnswerRecordContentKey({
    question: input.answer.question,
    answer: renderedAnswer,
    mode: input.mode,
    scope: input.scope,
    citations: input.answer.citations,
  });
  const dataFingerprint = savedAnswerFingerprint(input.answer, input.mode, input.scope, input.detail);
  const publicCitation = input.answer.citations.find((citation) => citation.sourceKind === "public");
  const cbaCitation = input.answer.citations.find((citation) => citation.publicSourceType === "cba_contract");
  const answerLane = cbaCitation ? "public_cba" : input.answer.answerKind === "public" || publicCitation ? "public" : "fake";

  return {
    id: savedRecordId("answer", saveKey),
    saveKey,
    dataFingerprint,
    question: input.answer.question,
    answer: renderedAnswer,
    mode: input.mode,
    scope: input.scope,
    detail: input.detail,
    citations: input.answer.citations,
    version: input.answer.version,
    provider: input.answer.version.provider,
    answerLane,
    sourceId: cbaCitation?.sourceId ?? publicCitation?.sourceId,
    sourceTitle: input.answer.sourceTitle ?? cbaCitation?.title ?? publicCitation?.title,
    sourceOwner: answerLane === "public_cba"
      ? input.answer.sourceOwner ?? CBA_SOURCE_OWNER
      : answerLane === "public" ? input.answer.sourceOwner ?? PUBLIC_SOURCE_OWNER : undefined,
    sourceStatus: input.answer.sourceStatus,
    effectiveStart: input.answer.effectiveStart ?? cbaCitation?.effectiveStart,
    effectiveEnd: input.answer.effectiveEnd ?? cbaCitation?.effectiveEnd,
    pdfSha256: input.answer.pdfSha256 ?? cbaCitation?.responseHash,
    scopeWarning: input.answer.scopeWarning,
    authorityClassification: input.answer.authorityClassification,
    sourceRetrievedAt: cbaCitation?.retrievedAt ?? publicCitation?.retrievedAt,
    normalizedSourceHash: cbaCitation?.contentHash ?? publicCitation?.contentHash,
    sourceInstanceId: cbaCitation?.sourceInstanceId,
    sourceInstanceAlgorithmVersion: cbaCitation?.sourceInstanceAlgorithmVersion,
    paragraphContentSha256: cbaCitation?.paragraphContentSha256,
    paragraphHashAlgorithmVersion: cbaCitation?.paragraphHashAlgorithmVersion,
    citationAnchorSha256: cbaCitation?.citationAnchorSha256,
    citationAnchorAlgorithmVersion: cbaCitation?.citationAnchorAlgorithmVersion,
    citationVerificationStateAtSave: cbaCitation?.citationVerificationState,
    postalApplicability: answerLane === "public"
      ? input.answer.postalApplicability ?? PUBLIC_SOURCE_POSTAL_APPLICABILITY
      : undefined,
    controllingForUsps: answerLane === "public"
      ? input.answer.controllingForUsps ?? PUBLIC_SOURCE_CONTROLLING_FOR_USPS
      : undefined,
    timestamp: input.timestamp,
    footer: input.answer.footer,
    savedType: "answer",
  };
}

export function createSavedArgumentPlanRecord(input: {
  plan: PublicArgumentPlan;
  question: string;
  mode: Mode;
  scope: Scope;
  detail: Detail;
  timestamp: string;
}): SavedAnswer {
  const publicCitation = input.plan.citations[0];
  const saveKey = `${PUBLIC_ARGUMENT_PLAN_SAVED_TYPE}|${input.plan.id}`;
  return {
    id: savedRecordId(PUBLIC_ARGUMENT_PLAN_SAVED_TYPE, saveKey),
    saveKey,
    dataFingerprint: `${saveKey}|${input.plan.contentIdentity}`,
    question: input.question,
    answer: publicArgumentPlanToText(input.plan),
    mode: input.mode,
    scope: input.scope,
    detail: input.detail,
    citations: input.plan.citations,
    version: input.plan.version,
    provider: input.plan.provider,
    answerLane: "public",
    sourceId: publicCitation?.sourceId,
    sourceTitle: publicCitation?.title,
    sourceOwner: PUBLIC_SOURCE_OWNER,
    sourceStatus: publicCitation?.status,
    scopeWarning: PUBLIC_SOURCE_APPLICABILITY_WARNING,
    authorityClassification: publicCitation?.class,
    sourceRetrievedAt: publicCitation?.retrievedAt,
    normalizedSourceHash: publicCitation?.contentHash,
    sourceInstanceId: publicCitation?.sourceInstanceId,
    sourceInstanceAlgorithmVersion: publicCitation?.sourceInstanceAlgorithmVersion,
    paragraphContentSha256: publicCitation?.paragraphContentSha256,
    paragraphHashAlgorithmVersion: publicCitation?.paragraphHashAlgorithmVersion,
    citationAnchorSha256: publicCitation?.citationAnchorSha256,
    citationAnchorAlgorithmVersion: publicCitation?.citationAnchorAlgorithmVersion,
    citationVerificationStateAtSave: publicCitation?.citationVerificationState,
    postalApplicability: PUBLIC_SOURCE_POSTAL_APPLICABILITY,
    controllingForUsps: PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
    timestamp: input.timestamp,
    footer: `PUBLIC ARGUMENT PLAN | Type:${input.plan.type} | Build:${input.plan.buildIdentity}`,
    savedType: PUBLIC_ARGUMENT_PLAN_SAVED_TYPE,
    argumentPlan: input.plan,
  };
}

export function createSavedGrievanceOutlineRecord(input: {
  outline: PublicGrievanceOutline;
  question: string;
  mode: Mode;
  scope: Scope;
  detail: Detail;
  timestamp: string;
}): SavedAnswer {
  const cbaCitation = input.outline.citations[0];
  const saveKey = `${PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE}|${input.outline.id}`;
  return {
    id: savedRecordId(PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE, saveKey),
    saveKey,
    dataFingerprint: `${saveKey}|${input.outline.contentIdentity}`,
    question: input.question,
    answer: publicGrievanceOutlineToText(input.outline),
    mode: input.mode,
    scope: input.scope,
    detail: input.detail,
    citations: input.outline.citations,
    version: input.outline.version,
    provider: input.outline.provider,
    answerLane: "public_cba",
    sourceId: cbaCitation?.sourceId,
    sourceTitle: cbaCitation?.title,
    sourceOwner: CBA_SOURCE_OWNER,
    sourceStatus: cbaCitation?.status,
    effectiveStart: cbaCitation?.effectiveStart,
    effectiveEnd: cbaCitation?.effectiveEnd,
    pdfSha256: cbaCitation?.responseHash,
    scopeWarning: CBA_SCOPE_WARNING,
    authorityClassification: cbaCitation?.class,
    sourceRetrievedAt: cbaCitation?.retrievedAt,
    normalizedSourceHash: cbaCitation?.contentHash,
    sourceInstanceId: cbaCitation?.sourceInstanceId,
    sourceInstanceAlgorithmVersion: cbaCitation?.sourceInstanceAlgorithmVersion,
    paragraphContentSha256: cbaCitation?.paragraphContentSha256,
    paragraphHashAlgorithmVersion: cbaCitation?.paragraphHashAlgorithmVersion,
    citationAnchorSha256: cbaCitation?.citationAnchorSha256,
    citationAnchorAlgorithmVersion: cbaCitation?.citationAnchorAlgorithmVersion,
    citationVerificationStateAtSave: cbaCitation?.citationVerificationState,
    timestamp: input.timestamp,
    footer: `PUBLIC GRIEVANCE OUTLINE | Type:${input.outline.type} | Build:${input.outline.buildIdentity}`,
    savedType: PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
    grievanceOutline: input.outline,
  };
}

function validPublicArgumentPlan(value: unknown): value is PublicArgumentPlan {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<PublicArgumentPlan>;
  return source.savedType === PUBLIC_ARGUMENT_PLAN_SAVED_TYPE &&
    typeof source.id === "string" &&
    typeof source.contentIdentity === "string" &&
    typeof source.title === "string" &&
    Array.isArray(source.citations) &&
    Array.isArray(source.thresholdElements) &&
    Array.isArray(source.argumentSteps) &&
    Array.isArray(source.sourceInstanceIds);
}

function validPublicGrievanceOutline(value: unknown): value is PublicGrievanceOutline {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<PublicGrievanceOutline>;
  return source.savedType === PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE &&
    typeof source.id === "string" &&
    typeof source.contentIdentity === "string" &&
    typeof source.title === "string" &&
    Array.isArray(source.governingContractLanguage) &&
    Array.isArray(source.elementsToEstablish) &&
    Array.isArray(source.factsToConfirm) &&
    Array.isArray(source.evidenceToRequest) &&
    Array.isArray(source.questionsForManagement) &&
    Array.isArray(source.stepOneArgument) &&
    Array.isArray(source.possibleRemedies) &&
    Array.isArray(source.timelinessAndProcedureLimits) &&
    Array.isArray(source.escalationReadiness) &&
    Array.isArray(source.limitations) &&
    Array.isArray(source.citations) &&
    Array.isArray(source.sourceInstanceIds);
}

export function migrateSavedAnswers(input: unknown): SavedAnswer[] {
  if (!Array.isArray(input)) return [];

  return input.reduceRight<SavedAnswer[]>((saved, item) => {
    if (!item || typeof item !== "object") return saved;
    const source = item as Partial<SavedAnswer>;
    const question = typeof source.question === "string" ? source.question.trim() : "";
    const answer = typeof source.answer === "string" ? source.answer : "";
    if (!question || !answer) return saved;

    const mode = validMode(source.mode);
    const scope = validScope(source.scope);
    const detail = validDetail(source.detail);
    const citations = Array.isArray(source.citations) ? source.citations : [];
    const publicCitation = citations.find((citation) => citation?.sourceKind === "public");
    const cbaCitation = citations.find((citation) => citation?.publicSourceType === "cba_contract");
    const answerLane = source.answerLane === "public_cba" || cbaCitation
      ? "public_cba"
      : source.answerLane === "public" || publicCitation ? "public" : "fake";
    const argumentPlan = validPublicArgumentPlan(source.argumentPlan) ? source.argumentPlan : undefined;
    const grievanceOutline = validPublicGrievanceOutline(source.grievanceOutline)
      ? source.grievanceOutline
      : undefined;
    const savedType = source.savedType === PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE && grievanceOutline
      ? PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE
      : source.savedType === PUBLIC_ARGUMENT_PLAN_SAVED_TYPE && argumentPlan
        ? PUBLIC_ARGUMENT_PLAN_SAVED_TYPE
        : "answer";
    const normalized: SavedAnswer = {
      id: "",
      saveKey: "",
      dataFingerprint: "",
      question,
      answer,
      mode,
      scope,
      detail,
      citations,
      version: source.version ?? clientVersion,
      provider: typeof source.provider === "string" ? source.provider : source.version?.provider ?? clientVersion.provider,
      answerLane,
      sourceId: typeof source.sourceId === "string" ? source.sourceId : cbaCitation?.sourceId ?? publicCitation?.sourceId,
      sourceTitle: typeof source.sourceTitle === "string" ? source.sourceTitle : cbaCitation?.title ?? publicCitation?.title,
      sourceOwner: typeof source.sourceOwner === "string"
        ? source.sourceOwner
        : answerLane === "public_cba" ? CBA_SOURCE_OWNER : answerLane === "public" ? PUBLIC_SOURCE_OWNER : undefined,
      sourceStatus: typeof source.sourceStatus === "string" ? source.sourceStatus : undefined,
      effectiveStart: typeof source.effectiveStart === "string" ? source.effectiveStart : cbaCitation?.effectiveStart,
      effectiveEnd: typeof source.effectiveEnd === "string" ? source.effectiveEnd : cbaCitation?.effectiveEnd,
      pdfSha256: typeof source.pdfSha256 === "string" ? source.pdfSha256 : cbaCitation?.responseHash,
      scopeWarning: typeof source.scopeWarning === "string" ? source.scopeWarning : undefined,
      authorityClassification: typeof source.authorityClassification === "string" ? source.authorityClassification : undefined,
      sourceRetrievedAt: typeof source.sourceRetrievedAt === "string"
        ? source.sourceRetrievedAt
        : cbaCitation?.retrievedAt ?? publicCitation?.retrievedAt,
      normalizedSourceHash: typeof source.normalizedSourceHash === "string"
        ? source.normalizedSourceHash
        : cbaCitation?.contentHash ?? publicCitation?.contentHash,
      sourceInstanceId: typeof source.sourceInstanceId === "string" ? source.sourceInstanceId : undefined,
      sourceInstanceAlgorithmVersion: typeof source.sourceInstanceAlgorithmVersion === "string" ? source.sourceInstanceAlgorithmVersion : undefined,
      paragraphContentSha256: typeof source.paragraphContentSha256 === "string" ? source.paragraphContentSha256 : undefined,
      paragraphHashAlgorithmVersion: typeof source.paragraphHashAlgorithmVersion === "string" ? source.paragraphHashAlgorithmVersion : undefined,
      citationAnchorSha256: typeof source.citationAnchorSha256 === "string" ? source.citationAnchorSha256 : undefined,
      citationAnchorAlgorithmVersion: typeof source.citationAnchorAlgorithmVersion === "string" ? source.citationAnchorAlgorithmVersion : undefined,
      citationVerificationStateAtSave: isCitationVerificationState(source.citationVerificationStateAtSave)
        ? source.citationVerificationStateAtSave
        : undefined,
      postalApplicability: typeof source.postalApplicability === "string"
        ? source.postalApplicability
        : answerLane === "public" ? PUBLIC_SOURCE_POSTAL_APPLICABILITY : undefined,
      controllingForUsps: typeof source.controllingForUsps === "string"
        ? source.controllingForUsps
        : answerLane === "public" ? PUBLIC_SOURCE_CONTROLLING_FOR_USPS : undefined,
      timestamp: typeof source.timestamp === "string" ? source.timestamp : new Date(0).toISOString(),
      footer: typeof source.footer === "string" ? source.footer : "",
      savedType,
      argumentPlan,
      grievanceOutline,
    };

    const storedDataFingerprint = typeof source.dataFingerprint === "string" && source.dataFingerprint.length > 0
      ? source.dataFingerprint
      : null;

    try {
      if (savedType === PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE && grievanceOutline) {
        normalized.saveKey = `${PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE}|${grievanceOutline.id}`;
        normalized.dataFingerprint = `${normalized.saveKey}|${grievanceOutline.contentIdentity}`;
        normalized.id = savedRecordId(savedType, normalized.saveKey);
        return upsertSavedAnswer(saved, normalized, { preferNewerDuplicate: true }).saved;
      }
      if (savedType === PUBLIC_ARGUMENT_PLAN_SAVED_TYPE && argumentPlan) {
        normalized.saveKey = `${PUBLIC_ARGUMENT_PLAN_SAVED_TYPE}|${argumentPlan.id}`;
        normalized.dataFingerprint = `${normalized.saveKey}|${argumentPlan.contentIdentity}`;
        normalized.id = savedRecordId(savedType, normalized.saveKey);
        return upsertSavedAnswer(saved, normalized, { preferNewerDuplicate: true }).saved;
      }
      if (publicCitation) throw new Error("Preserve public-source citation identity without fake answer rebuilding.");
      const rebuiltAnswer = buildAnswer(question, {
        mode,
        scope,
        detail,
        runtimeVersion: normalized.version,
      });
      normalized.saveKey = savedAnswerKey(rebuiltAnswer, mode, scope);
      normalized.dataFingerprint = savedAnswerFingerprint(rebuiltAnswer, mode, scope, detail);
    } catch {
      normalized.saveKey = savedAnswerRecordContentKey(normalized);
      normalized.dataFingerprint = storedDataFingerprint ?? legacyFingerprint(normalized);
    }
    normalized.id = savedRecordId(savedType, normalized.saveKey);

    return upsertSavedAnswer(saved, normalized, { preferNewerDuplicate: true }).saved;
  }, []);
}

function isCitationVerificationState(value: unknown): value is CitationVerificationState {
  return typeof value === "string" && [
    "verified_current",
    "source_instance_changed",
    "paragraph_changed",
    "paragraph_missing",
    "locator_changed",
    "ambiguous_duplicate",
    "legacy_unverifiable",
    "cache_unavailable",
    "invalid_metadata",
  ].includes(value);
}

function timestampValue(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function upsertSavedAnswer(
  current: SavedAnswer[],
  next: SavedAnswer,
  options: { preferNewerDuplicate?: boolean } = {}
): SaveAnswerResult {
  const existingIndex = current.findIndex((item) => item.saveKey === next.saveKey);

  if (existingIndex === -1) {
    return {
      status: "created",
      saved: [next, ...current].slice(0, 50),
      record: next,
    };
  }

  const existing = current[existingIndex];
  if (existing.dataFingerprint === next.dataFingerprint) {
    if (options.preferNewerDuplicate && timestampValue(next.timestamp) >= timestampValue(existing.timestamp)) {
      const replacement = {
        ...next,
        id: existing.id,
      };
      return {
        status: "duplicate",
        saved: [replacement, ...current.filter((_, index) => index !== existingIndex)].slice(0, 50),
        record: replacement,
      };
    }

    return {
      status: "duplicate",
      saved: current,
      record: existing,
    };
  }

  const replacement = {
    ...next,
    id: existing.id,
  };
  const saved = [replacement, ...current.filter((_, index) => index !== existingIndex)].slice(0, 50);

  return {
    status: "replaced",
    saved,
    record: replacement,
  };
}
