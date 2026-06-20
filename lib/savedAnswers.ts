import { answerToMarkdown, type AnswerResult } from "@/lib/answerGovernor";
import type { Detail, Mode, Scope } from "@/lib/sourceModel";

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

export function savedAnswerKey(answer: AnswerResult, mode: Mode, scope: Scope): string {
  const citationIdentity = answer.citations.map((citation) => citation.id).sort().join(",");
  return [
    normalizeText(answer.question),
    mode,
    scope,
    answer.intent,
    normalizeText(answer.shortAnswer),
    citationIdentity,
  ].join("|");
}

export function savedAnswerFingerprint(answer: AnswerResult, mode: Mode, scope: Scope, detail: Detail): string {
  return [
    savedAnswerKey(answer, mode, scope),
    detail,
    answerToMarkdown(answer),
    answer.footer,
    answer.version.displayVersion,
    answer.version.promptVersion,
  ].join("|");
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
