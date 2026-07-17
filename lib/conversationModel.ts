import type { AnswerResult } from "@/lib/answerGovernor";
import type { Detail, Mode, Scope } from "@/lib/sourceModel";

export type MessageRole = "user" | "assistant";
export type MessageId = string;
export type ThreadId = string;
export type TurnId = string;

export interface ModeScopeDetailSnapshot {
  mode: Mode;
  scope: Scope;
  detail: Detail;
  sourceMode?: "fake" | "public";
  sourceModePolicy?: "auto" | "fake" | "public";
}

export interface BaseChatMessage {
  messageId: MessageId;
  threadId: ThreadId;
  turnId: TurnId;
  parentMessageId?: MessageId;
  role: MessageRole;
  content: string;
  createdAt: string;
  modeScopeDetail: ModeScopeDetailSnapshot;
}

export interface UserMessage extends BaseChatMessage {
  role: "user";
}

export interface AssistantMessage extends BaseChatMessage {
  role: "assistant";
  answer: AnswerResult;
  citations: AnswerResult["citations"];
  status: "complete" | "loading" | "failed";
  error?: string;
}

export type ChatMessage = UserMessage | AssistantMessage;

export interface ConversationThread {
  threadId: ThreadId;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export function createStableId(prefix: string): string {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function createConversationThread(now = new Date().toISOString()): ConversationThread {
  const threadId = createStableId("thread");
  return {
    threadId,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function createUserMessage(input: {
  threadId: ThreadId;
  content: string;
  modeScopeDetail: ModeScopeDetailSnapshot;
  now?: string;
}): UserMessage {
  const now = input.now ?? new Date().toISOString();
  return {
    messageId: createStableId("msg"),
    threadId: input.threadId,
    turnId: createStableId("turn"),
    role: "user",
    content: input.content.trim(),
    createdAt: now,
    modeScopeDetail: input.modeScopeDetail,
  };
}

export function createAssistantMessage(input: {
  threadId: ThreadId;
  turnId: TurnId;
  parentMessageId: MessageId;
  answer: AnswerResult;
  modeScopeDetail: ModeScopeDetailSnapshot;
  now?: string;
}): AssistantMessage {
  const now = input.now ?? new Date().toISOString();
  return {
    messageId: createStableId("msg"),
    threadId: input.threadId,
    turnId: input.turnId,
    parentMessageId: input.parentMessageId,
    role: "assistant",
    content: input.answer.shortAnswer,
    createdAt: now,
    answer: input.answer,
    citations: input.answer.citations,
    status: "complete",
    modeScopeDetail: input.modeScopeDetail,
  };
}

export function createLoadingAssistantMessage(input: {
  threadId: ThreadId;
  turnId: TurnId;
  parentMessageId: MessageId;
  modeScopeDetail: ModeScopeDetailSnapshot;
  now?: string;
}): AssistantMessage {
  const now = input.now ?? new Date().toISOString();
  const publicMode = input.modeScopeDetail.sourceMode === "public";
  const placeholder = {
    answerKind: publicMode ? "public" : "fake",
    question: publicMode ? "Checking the public source..." : "Generating fake answer...",
    intent: "unknown",
    shortAnswer: publicMode ? "Checking the one allowlisted public source..." : "Checking the fake source trail...",
    modeNote: publicMode
      ? "Local deterministic public-source provider is preparing a citation-first response."
      : "Local deterministic fake provider is preparing the next response.",
    noAnswer: true,
    bestGuessDisabled: true,
    sourceGroups: [],
    citations: [],
    conflicts: [],
    evidenceChecklist: [],
    missingFacts: [],
    followUps: [],
    relatedFakeSections: [],
    footer: publicMode
      ? "PUBLIC DATA PILOT | Sources:0 | Provider:local-public-static-deterministic"
      : "Sources:0 | Provider:local-fake-deterministic",
    version: {
      productVersion: "0.7.0",
      channel: "dev",
      buildDate: "unknown",
      gitSha: "unknown",
      displayVersion: "0.7.0-dev.unknown+unknown",
      corpusVersion: "unknown",
      indexVersion: "unknown",
      promptVersion: publicMode ? "prompt.public-docs.v0.1-citation-first" : "unknown",
      provider: publicMode ? "local-public-static-deterministic" : "local-fake-deterministic",
    },
    generatedAt: now,
  } satisfies AnswerResult;

  return {
    messageId: createStableId("msg"),
    threadId: input.threadId,
    turnId: input.turnId,
    parentMessageId: input.parentMessageId,
    role: "assistant",
    content: placeholder.shortAnswer,
    createdAt: now,
    answer: placeholder,
    citations: [],
    status: "loading",
    modeScopeDetail: input.modeScopeDetail,
  };
}

export function appendTurn(thread: ConversationThread, userMessage: UserMessage, assistantMessage: AssistantMessage): ConversationThread {
  const updatedAt = assistantMessage.createdAt;
  const title = thread.messages.length === 0 ? userMessage.content.slice(0, 72) || "New chat" : thread.title;
  return {
    ...thread,
    title,
    updatedAt,
    messages: [...thread.messages, userMessage, assistantMessage],
  };
}

export function replaceAssistantMessage(
  thread: ConversationThread,
  messageId: MessageId,
  nextMessage: AssistantMessage
): ConversationThread {
  return {
    ...thread,
    updatedAt: nextMessage.createdAt,
    messages: thread.messages.map((message) => (message.messageId === messageId ? nextMessage : message)),
  };
}

function isSnapshot(value: unknown): value is ModeScopeDetailSnapshot {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<ModeScopeDetailSnapshot>;
  return typeof source.mode === "string" && typeof source.scope === "string" && typeof source.detail === "string";
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<ChatMessage>;
  if (typeof source.messageId !== "string" || typeof source.threadId !== "string" || typeof source.turnId !== "string") return false;
  if (typeof source.content !== "string" || typeof source.createdAt !== "string" || !isSnapshot(source.modeScopeDetail)) return false;
  if (source.role === "user") return true;
  if (source.role !== "assistant") return false;
  const assistant = source as Partial<AssistantMessage>;
  return !!assistant.answer && Array.isArray(assistant.citations) && typeof assistant.status === "string";
}

export function migrateConversationThread(input: unknown): ConversationThread | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Partial<ConversationThread>;
  if (typeof source.threadId !== "string" || typeof source.createdAt !== "string" || typeof source.updatedAt !== "string") return null;
  if (!Array.isArray(source.messages)) return null;
  const messages = source.messages.filter(isChatMessage);
  return {
    threadId: source.threadId,
    title: typeof source.title === "string" && source.title.trim() ? source.title : "Restored chat",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    messages,
  };
}

export function recentAnswerHistory(thread: ConversationThread, limit = 8) {
  return thread.messages
    .filter((message) => message.role === "user" || (message.role === "assistant" && message.status === "complete"))
    .slice(-limit)
    .map((message) => ({
      role: message.role,
      content: message.content,
      intent: message.role === "assistant" ? message.answer.intent : undefined,
      question: message.role === "assistant" ? message.answer.question : undefined,
      resolvedQuestion: message.role === "assistant" ? message.answer.resolvedQuestion : undefined,
    }));
}
