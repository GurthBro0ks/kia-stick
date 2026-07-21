import {
  buildAnswer,
  detectIntent,
  type AnswerHistoryMessage,
  type AnswerResult,
} from "@/lib/answerGovernor";
import { buildCbaAnswer, buildSafeRouterNoAnswer, detectCbaIntent } from "@/lib/cbaAnswer";
import type { CbaSourceCache } from "@/lib/cbaSource";
import type { ModeScopeDetailSnapshot } from "@/lib/conversationModel";
import {
  publicPilotQuestions,
  type PublicSourceCache,
} from "@/lib/publicSource";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import type { Detail, Mode, Scope } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export type ChatSourcePolicy = "auto" | "fake" | "nlrb" | "cba" | "public";
export type ChatAnswerLane = "fake" | "nlrb" | "cba" | "safe_no_answer";

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/[?!.]+$/g, "").replace(/\s+/g, " ");
}

const exactPublicPilotQuestions = new Set(publicPilotQuestions.map(normalizeQuestion));

function hasExplicitCbaSourceCue(question: string): boolean {
  const normalized = normalizeQuestion(question);
  const hasContractContext = /\b(cba|apwu-usps cba|collective bargaining agreement|contract|agreement|apwu|usps)\b/.test(normalized);
  return /\b(?:apwu-usps\s+)?cba\b/.test(normalized)
    || /\bcollective bargaining agreement\b/.test(normalized)
    || /\bthe contract\b/.test(normalized)
    || /\bcontract\s+(?:say|says)\b/.test(normalized)
    || /\barticle\s*(?:[1-9]|[1-3][0-9]|4[0-3])\b/.test(normalized)
    || (/\bsection\s*\d+(?:\.[a-z0-9]+)?\b/.test(normalized) && hasContractContext);
}

export function isAutoPublicPilotQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  if (exactPublicPilotQuestions.has(normalized)) return true;
  if (/\bweingarten\b/.test(normalized)) return true;
  if (
    /\binvestigatory interview\b/.test(normalized) &&
    /\b(union representative|union representation|represented employee)\b/.test(normalized)
  ) return true;
  return (
    /\b(usps|postal)\b/.test(normalized) &&
    /\b(source|nlrb|weingarten)\b/.test(normalized) &&
    /\b(controlling|authority|applicability|rule)\b/.test(normalized)
  );
}

export function isAutoCbaQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  if (hasExplicitCbaSourceCue(question)) return true;
  if (detectCbaIntent(question) !== "unsupported") return true;
  if (/\barticle\s*(?:[1-9]|[1-3][0-9]|4[0-3])\b/.test(normalized)) return true;
  return /\b(apwu-usps cba|collective bargaining agreement|official cba)\b/.test(normalized)
    || (/\b(apwu|usps)\b/.test(normalized) && /\b(cba|contract|agreement)\b/.test(normalized));
}

export function resolveChatAnswerLane(question: string, policy: ChatSourcePolicy): ChatAnswerLane {
  if (policy === "cba") return "cba";
  if (policy === "nlrb" || policy === "public") return "nlrb";
  if (policy === "fake") return "fake";
  if (isAutoCbaQuestion(question)) return "cba";
  if (isAutoPublicPilotQuestion(question)) return "nlrb";
  if (detectIntent(question) !== "unknown") return "fake";
  return "safe_no_answer";
}

export function createChatSubmitSnapshot(input: {
  question: string;
  sourcePolicy: ChatSourcePolicy;
  mode: Mode;
  scope: Scope;
  detail: Detail;
}): ModeScopeDetailSnapshot {
  const sourceMode = resolveChatAnswerLane(input.question, input.sourcePolicy);
  return {
    mode: input.mode,
    scope: sourceMode === "cba" || sourceMode === "nlrb" || sourceMode === "safe_no_answer" ? "Official-Like" : input.scope,
    detail: input.detail,
    sourceMode,
    sourceModePolicy: input.sourcePolicy,
  };
}

export function routeChatQuestion(input: {
  question: string;
  snapshot: ModeScopeDetailSnapshot;
  publicSource: PublicSourceCache | null;
  cbaSource?: CbaSourceCache | null;
  runtimeVersion: RuntimeVersion;
  threadHistory?: AnswerHistoryMessage[];
}): AnswerResult {
  if (input.snapshot.sourceMode === "cba") {
    return buildCbaAnswer({
      question: input.question,
      source: input.cbaSource ?? null,
      nlrbSource: input.publicSource,
      runtimeVersion: input.runtimeVersion,
      mode: input.snapshot.mode,
      scope: input.snapshot.scope,
      detail: input.snapshot.detail,
    });
  }

  if (input.snapshot.sourceMode === "nlrb" || input.snapshot.sourceMode === "public") {
    return buildPublicSourceAnswer({
      question: input.question,
      source: input.publicSource,
      runtimeVersion: input.runtimeVersion,
      mode: input.snapshot.mode,
      scope: input.snapshot.scope,
      detail: input.snapshot.detail,
    });
  }


  if (input.snapshot.sourceMode === "safe_no_answer") {
    return buildSafeRouterNoAnswer({
      question: input.question,
      runtimeVersion: input.runtimeVersion,
      mode: input.snapshot.mode,
      scope: input.snapshot.scope,
    });
  }

  return buildAnswer(input.question, {
    ...input.snapshot,
    runtimeVersion: input.runtimeVersion,
    threadHistory: input.threadHistory,
  });
}
