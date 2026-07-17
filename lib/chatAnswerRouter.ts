import {
  buildAnswer,
  type AnswerHistoryMessage,
  type AnswerResult,
} from "@/lib/answerGovernor";
import type { ModeScopeDetailSnapshot } from "@/lib/conversationModel";
import {
  publicPilotQuestions,
  type PublicSourceCache,
} from "@/lib/publicSource";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import type { Detail, Mode, Scope } from "@/lib/sourceModel";
import type { RuntimeVersion } from "@/lib/version";

export type ChatSourcePolicy = "auto" | "fake" | "public";
export type ChatAnswerLane = "fake" | "public";

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/[?!.]+$/g, "").replace(/\s+/g, " ");
}

const exactPublicPilotQuestions = new Set(publicPilotQuestions.map(normalizeQuestion));

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

export function resolveChatAnswerLane(question: string, policy: ChatSourcePolicy): ChatAnswerLane {
  if (policy === "public") return "public";
  if (policy === "fake") return "fake";
  return isAutoPublicPilotQuestion(question) ? "public" : "fake";
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
    scope: sourceMode === "public" ? "Official-Like" : input.scope,
    detail: input.detail,
    sourceMode,
    sourceModePolicy: input.sourcePolicy,
  };
}

export function routeChatQuestion(input: {
  question: string;
  snapshot: ModeScopeDetailSnapshot;
  publicSource: PublicSourceCache | null;
  runtimeVersion: RuntimeVersion;
  threadHistory?: AnswerHistoryMessage[];
}): AnswerResult {
  if (input.snapshot.sourceMode === "public") {
    return buildPublicSourceAnswer({
      question: input.question,
      source: input.publicSource,
      runtimeVersion: input.runtimeVersion,
      mode: input.snapshot.mode,
      scope: input.snapshot.scope,
      detail: input.snapshot.detail,
    });
  }

  return buildAnswer(input.question, {
    ...input.snapshot,
    runtimeVersion: input.runtimeVersion,
    threadHistory: input.threadHistory,
  });
}
