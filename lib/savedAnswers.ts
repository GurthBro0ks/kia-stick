import { answerToMarkdown, buildAnswer, detectIntent, type AnswerResult } from "@/lib/answerGovernor";
import type { Detail, Mode, Scope } from "@/lib/sourceModel";
import { clientVersion } from "@/lib/version";

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
  timestamp: string;
  footer: string;
}

export type SaveAnswerStatus = "created" | "replaced" | "duplicate";

export interface SaveAnswerResult {
  status: SaveAnswerStatus;
  saved: SavedAnswer[];
  record: SavedAnswer;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stableHash(value: string): string {
  let hash = 5381;
  for (const char of value) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
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

function citationIdentity(citations: AnswerResult["citations"]): string {
  return citations.map((citation) => citation.id).sort().join(",");
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
    answer.conflicts.join("|"),
    answer.evidenceChecklist.join("|"),
    answer.missingFacts.join("|"),
    answer.followUps.join("|"),
    answer.version.corpusVersion,
    answer.version.indexVersion,
    answer.version.promptVersion,
    answer.version.provider,
  ].join("|");
}

function legacyAnswerIdentity(item: Pick<SavedAnswer, "question" | "answer" | "mode" | "scope" | "citations">): string {
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
    .replace(/0\.3\.0-dev\.\d{8}\+[a-z0-9]+/gi, "displayVersion:<ignored>");
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
  existingId?: string;
}): SavedAnswer {
  const saveKey = savedAnswerKey(input.answer, input.mode, input.scope);
  const dataFingerprint = savedAnswerFingerprint(input.answer, input.mode, input.scope, input.detail);

  return {
    id: input.existingId ?? `saved-${stableHash(saveKey)}`,
    saveKey,
    dataFingerprint,
    question: input.answer.question,
    answer: answerToMarkdown(input.answer),
    mode: input.mode,
    scope: input.scope,
    detail: input.detail,
    citations: input.answer.citations,
    version: input.answer.version,
    provider: input.answer.version.provider,
    timestamp: input.timestamp,
    footer: input.answer.footer,
  };
}

export function migrateSavedAnswers(input: unknown): SavedAnswer[] {
  if (!Array.isArray(input)) return [];

  return input.reduce<SavedAnswer[]>((saved, item, index) => {
    if (!item || typeof item !== "object") return saved;
    const source = item as Partial<SavedAnswer>;
    const question = typeof source.question === "string" ? source.question.trim() : "";
    const answer = typeof source.answer === "string" ? source.answer : "";
    if (!question || !answer) return saved;

    const mode = validMode(source.mode);
    const scope = validScope(source.scope);
    const detail = validDetail(source.detail);
    const citations = Array.isArray(source.citations) ? source.citations : [];
    const normalized: SavedAnswer = {
      id: typeof source.id === "string" ? source.id : `saved-${index}`,
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
      timestamp: typeof source.timestamp === "string" ? source.timestamp : new Date(0).toISOString(),
      footer: typeof source.footer === "string" ? source.footer : "",
    };

    try {
      const rebuiltAnswer = buildAnswer(question, {
        mode,
        scope,
        detail,
        runtimeVersion: normalized.version,
      });
      normalized.saveKey = savedAnswerKey(rebuiltAnswer, mode, scope);
      normalized.dataFingerprint = savedAnswerFingerprint(rebuiltAnswer, mode, scope, detail);
    } catch {
      normalized.saveKey = legacyAnswerIdentity(normalized);
      normalized.dataFingerprint = legacyFingerprint(normalized);
    }

    return upsertSavedAnswer(saved, normalized).saved;
  }, []);
}

export function upsertSavedAnswer(current: SavedAnswer[], next: SavedAnswer): SaveAnswerResult {
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
