"use client";

import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  FileSearch,
  Heart,
  MessageSquareText,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cannedQuestions, type AnswerResult } from "@/lib/answerGovernor";
import {
  createChatSubmitSnapshot,
  routeChatQuestion,
  type ChatSourcePolicy,
} from "@/lib/chatAnswerRouter";
import {
  appendTurn,
  createAssistantMessage,
  createConversationThread,
  createLoadingAssistantMessage,
  createUserMessage,
  migrateConversationThread,
  recentAnswerHistory,
  replaceAssistantMessage,
  type AssistantMessage,
  type ConversationThread,
  type ModeScopeDetailSnapshot,
  type UserMessage,
} from "@/lib/conversationModel";
import {
  applyImportWizardAction,
  createInitialImportWizardState,
  exportImportWizardAuditJson,
  exportImportWizardAuditMarkdown,
  importWizardNextAction,
  importWizardNextActionLabel,
  importWizardScreenCopy,
  importWizardStepLabels,
  importWizardSteps,
  type ImportWizardAction,
  type ImportWizardState,
} from "@/lib/importWizardModel";
import {
  createSavedAnswerRecord,
  migrateSavedAnswers,
  upsertSavedAnswer,
  type SaveAnswerStatus,
  type SavedAnswer,
} from "@/lib/savedAnswers";
import {
  buildSourceHierarchyGroups,
  citationLabel,
  sourceClassLabels,
  type Detail,
  type Citation,
  type Mode,
  type Scope,
} from "@/lib/sourceModel";
import {
  citationVerificationMessage,
  deriveCbaCitationIntegrity,
  deriveCbaSourceInstance,
  shortCbaDigest,
  verifyCbaCitation,
  type CitationVerificationState,
} from "@/lib/cbaCitationIntegrity";
import {
  applyVaultAction,
  createInitialVaultState,
  exportVaultAuditJson,
  exportVaultAuditMarkdown,
  laneCounts,
  laneLabels,
  lifecycleLabels,
  lifecycleSteps,
  migrateVaultState,
  workflowStateCounts,
  workflowStateLabels,
  type FakeVaultRecord,
  type LifecycleStep,
  type VaultAction,
  type VaultLane,
  type VaultState,
  type VaultWorkflowState,
} from "@/lib/vaultModel";
import { clientVersion, type RuntimeVersion } from "@/lib/version";
import { currentAcceptedPushedState, historicalAcceptedPushedShortCommits, localDataModeLabel } from "@/lib/acceptedState";
import {
  CBA_DOCUMENT_STATUS,
  CBA_EFFECTIVE_END,
  CBA_EFFECTIVE_START,
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SCOPE_WARNING,
  CBA_SOURCE_ID,
  CBA_SOURCE_PAGE_URL,
  CBA_SOURCE_PDF_URL,
  cbaParagraphAnchorId,
  cbaPilotQuestions,
  searchCba,
  type CbaParagraph,
  type CbaSourceRouteResponse,
} from "@/lib/cbaSource";
import {
  PUBLIC_SOURCE_APPLICABILITY_WARNING,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_PROMPT_VERSION,
  PUBLIC_SOURCE_PROVIDER,
  PUBLIC_SOURCE_URL,
  publicPilotQuestions,
  publicSourceParagraphAnchorId,
  type PublicSourceRouteResponse,
} from "@/lib/publicSource";

type Tab = "chat" | "sources" | "saved" | "upload" | "vault" | "import" | "settings";
type VaultView = "vault" | "quarantine" | "redaction" | "metadata" | "index" | "audit";
type PublicSourceLoadState = { status: "loading" } | PublicSourceRouteResponse;
type CbaSourceLoadState = { status: "loading" } | CbaSourceRouteResponse;
type CbaCitationNavigationNotice = { citation: Citation; state: CitationVerificationState };

export interface QuarantineItem {
  id: string;
  name: string;
  size: number;
  review: "queued_fake_review";
  privacy: "local_browser_only";
  timestamp: string;
}

const modes: Mode[] = ["Strict Research", "Calm Neutral", "Aggressive Grievance", "Steward-to-Supervisor"];
const scopes: Scope[] = ["All Fake", "Official-Like", "Local-Like", "Notes+Evidence"];
const details: Detail[] = ["Simple", "Detailed", "Checklist"];

const savedKey = "kia-stick.saved-answers.v0.1";
const threadKey = "kia-stick.current-thread.v0.4";
const quarantineKey = "kia-stick.quarantine.v0.1";
const vaultKey = "kia-stick.vault-state.v0.4";
const importWizardKey = "kia-stick.import-wizard-state.v0.5.1";
const operatorDiagnosticsRegionId = "settings-operator-diagnostics";
const operatorDiagnosticsToggleId = "settings-operator-diagnostics-toggle";
const repositoryRecordingShortCommit = currentAcceptedPushedState.repository_recording_short_commit
  ?? currentAcceptedPushedState.repository_recording_commit?.slice(0, 7)
  ?? "not recorded";

const vaultViews: { id: VaultView; label: string; meta: string }[] = [
  { id: "vault", label: "Vault", meta: "fake lane overview" },
  { id: "quarantine", label: "Quarantine", meta: "quarantine-only" },
  { id: "redaction", label: "Redaction Review", meta: "required before metadata" },
  { id: "metadata", label: "Metadata Review", meta: "required before eligibility" },
  { id: "index", label: "Index Eligibility", meta: "eligible fake only" },
  { id: "audit", label: "Audit Log", meta: "safe fake export" },
];

const acceptedOperatorCheckpoint = [
  {
    label: "Current accepted pushed checkpoint",
    value: `${currentAcceptedPushedState.checkpoint_label} (${currentAcceptedPushedState.accepted_pushed_commit})`,
  },
  { label: "Current accepted pushed proof", value: currentAcceptedPushedState.accepted_pushed_proof_dir },
  {
    label: "Current accepted pushed QA",
    value: `validation ${currentAcceptedPushedState.accepted_validation} / manual QA ${currentAcceptedPushedState.accepted_manual_qa} / pushed yes / repository equality verified at ${repositoryRecordingShortCommit}`,
  },
  {
    label: "Current accepted pushed bundle",
    value: `${currentAcceptedPushedState.accepted_pushed_phase}; accepted/pushed yes at ${currentAcceptedPushedState.accepted_pushed_short_commit}`,
  },
  ...currentAcceptedPushedState.historical_prior_checkpoints.map((checkpoint) => ({
    label: `Historical accepted pushed checkpoint ${checkpoint.checkpoint}`,
    value: `${checkpoint.checkpoint} at ${checkpoint.commit}; historical only, not current`,
  })),
  { label: "Accepted pushed WARN checkpoint visible", value: "Accepted pushed WARN checkpoint visible: 3b9fef5; historical accepted-WARN parked, not current" },
  { label: "Accepted pushed WARN commit", value: "3b9fef5282e84f78453402cb10a37398300ae9c1" },
  { label: "Accepted pushed WARN QA", value: "validation PASS / manual QA ACCEPTED_WARN / pushed yes" },
  { label: "Accepted pushed commit", value: "928c614d0fcafb64b6ad79770c8d55a3b662b153" },
  { label: "Accepted pushed QA", value: "manual QA PASS for v0.9.43-to-v0.9.47; pushed yes" },
  { label: "Accepted WARN commit", value: "beea159bb44ecc35ed8cb9b5a55aa1c0f3f217f6" },
  { label: "Accepted WARN QA", value: "validation PASS / manual QA ACCEPTED_WARN / pushed" },
  { label: "Prior PASS commit", value: "c5d12a004f4c9d270260ee860781b99421a938dd" },
  { label: "Prior PASS QA", value: "manual QA PASS for v0.9.23-to-v0.9.27" },
  { label: "Previous bundle QA", value: "manual QA PASS for v0.9.43-to-v0.9.47; pushed yes" },
  { label: "Historical local bundle", value: "v0.9.53-to-v0.9.57 local polish manual QA PASS" },
  { label: "Historical local bundle QA", value: "manual QA PASS; pushed no" },
  { label: "Historical accepted-WARN checkpoint", value: "3b9fef5282e84f78453402cb10a37398300ae9c1" },
  { label: "Historical accepted-WARN proof", value: "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_48_to_v0_9_52_operator_qa_acceptance_recording_20260630T183635Z/warn_closeout_push_20260630T185549Z" },
  { label: "Historical accepted-WARN meaning", value: "accepted-WARN parked, not fixed; historical only, not current; exact Next target still unproven" },
  { label: "Historical local repair", value: "v0.9.83-to-v0.9.87 operator-status runtime repair; validation PASS; manual QA PASS; later pushed by closeout" },
  { label: "This local bundle", value: currentAcceptedPushedState.local_bundle_status },
  { label: "Runtime status surface", value: "/health phase is refreshed for this bundle; /version identity semantics unchanged" },
  { label: "Real-doc gate", value: "queue-015 blocked; no real-doc capability beyond the exact approved public CBA source" },
  { label: "Next/PostCSS", value: "WARN_SAFE_NEXT_TARGET_UNCLEAR; parked, not fixed" },
  { label: "v0.9.12C", value: "blocked pending exact operator-approved Next target" },
  { label: "Package lock", value: "unchanged; no install/update/audit-fix/dedupe/prune" },
];

const intentLabels: Record<AnswerResult["intent"], string> = {
  annual_leave: "Annual leave",
  steward_request: "Steward request",
  step_one_evidence: "Step 1 evidence",
  attendance_sleeping_bathroom: "Attendance / bathroom",
  one_click_lunch: "One-click lunch",
  source_hierarchy: "Source hierarchy",
  unknown: "Unknown issue",
};

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function savedBuildLabel(item: SavedAnswer): string {
  return item.version?.displayVersion ?? item.provider ?? "unknown";
}

function publicCitationForSaved(item: SavedAnswer): Citation | undefined {
  return item.citations.find((citation) => citation.sourceKind === "public");
}

function saveStatusText(status: SaveAnswerStatus, answerKind: AnswerResult["answerKind"]): string {
  const kind = answerKind === "public" ? "public-source" : "fake";
  if (status === "created") return `Saved ${kind} answer with source and provider metadata.`;
  if (status === "replaced") return `Updated the saved ${kind} answer with newer metadata.`;
  return "Already saved. No duplicate Saved record was created.";
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function KiaStickApp({ runtimeVersion = clientVersion }: { runtimeVersion?: RuntimeVersion }) {
  const [tab, setTab] = useState<Tab>("chat");
  const [mode, setMode] = useState<Mode>("Strict Research");
  const [scope, setScope] = useState<Scope>("All Fake");
  const [detail, setDetail] = useState<Detail>("Detailed");
  const [chatSourceMode, setChatSourceMode] = useState<ChatSourcePolicy>("auto");
  const [publicSourceState, setPublicSourceState] = useState<PublicSourceLoadState>({ status: "loading" });
  const [cbaSourceState, setCbaSourceState] = useState<CbaSourceLoadState>({ status: "loading" });
  const [cbaCitationTargetId, setCbaCitationTargetId] = useState<string | null>(null);
  const [cbaCitationNavigationNotice, setCbaCitationNavigationNotice] = useState<CbaCitationNavigationNotice | null>(null);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<ConversationThread>(() => createConversationThread());
  const [isSending, setIsSending] = useState(false);
  const [saved, setSaved] = useState<SavedAnswer[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineItem[]>([]);
  const [vaultView, setVaultView] = useState<VaultView>("vault");
  const [vaultState, setVaultState] = useState<VaultState>(() => createInitialVaultState());
  const [importWizardState, setImportWizardState] = useState<ImportWizardState>(() => createInitialImportWizardState());
  const [fakeOnlyConfirmed, setFakeOnlyConfirmed] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ status: SaveAnswerStatus; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pendingScroll, setPendingScroll] = useState(false);
  const chatScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSaved(migrateSavedAnswers(loadJson<unknown[]>(savedKey, [])));
    setThread(migrateConversationThread(loadJson<unknown>(threadKey, null)) ?? createConversationThread());
    setQuarantine(loadJson<QuarantineItem[]>(quarantineKey, []));
    setVaultState(migrateVaultState(loadJson<unknown>(vaultKey, null)));
    setImportWizardState(loadJson<ImportWizardState>(importWizardKey, createInitialImportWizardState()));
    setHydrated(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-cba-source", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as CbaSourceRouteResponse;
        if (!cancelled && (payload.status === "available" || payload.status === "unavailable")) setCbaSourceState(payload);
      })
      .catch(() => {
        if (!cancelled) setCbaSourceState({ status: "unavailable", reason: "cache_unsafe" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-source", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as PublicSourceRouteResponse;
        if (!cancelled && (payload.status === "available" || payload.status === "unavailable")) setPublicSourceState(payload);
      })
      .catch(() => {
        if (!cancelled) setPublicSourceState({ status: "unavailable", reason: "cache_unsafe" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(savedKey, JSON.stringify(saved));
  }, [hydrated, saved]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(threadKey, JSON.stringify(thread));
  }, [hydrated, thread]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(quarantineKey, JSON.stringify(quarantine));
  }, [hydrated, quarantine]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(vaultKey, JSON.stringify(vaultState));
  }, [hydrated, vaultState]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(importWizardKey, JSON.stringify(importWizardState));
  }, [hydrated, importWizardState]);

  const sourceHierarchyGroups = useMemo(() => buildSourceHierarchyGroups(), []);

  const vaultCounts = useMemo(() => laneCounts(vaultState.records), [vaultState.records]);
  const workflowCounts = useMemo(() => workflowStateCounts(vaultState.records), [vaultState.records]);
  const latestAssistant = useMemo(
    () => [...thread.messages].reverse().find((message): message is AssistantMessage => message.role === "assistant" && message.status === "complete"),
    [thread.messages]
  );

  useEffect(() => {
    if (!pendingScroll || tab !== "chat") return;
    const frame = window.requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setPendingScroll(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingScroll, tab, thread.messages]);

  function completeAssistantTurn(input: {
    userMessage: UserMessage;
    loadingMessage: AssistantMessage;
    snapshot: ModeScopeDetailSnapshot;
    baseThread: ConversationThread;
  }) {
    window.setTimeout(() => {
      try {
        const answer = routeChatQuestion({
          question: input.userMessage.content,
          snapshot: input.snapshot,
          publicSource: publicSourceState.status === "available" ? publicSourceState.source : null,
          cbaSource: cbaSourceState.status === "available" ? cbaSourceState.source : null,
          runtimeVersion,
          threadHistory: recentAnswerHistory(input.baseThread),
        });
        const assistantMessage = createAssistantMessage({
          threadId: input.userMessage.threadId,
          turnId: input.userMessage.turnId,
          parentMessageId: input.userMessage.messageId,
          answer,
          modeScopeDetail: input.snapshot,
        });
        setThread((current) => replaceAssistantMessage(current, input.loadingMessage.messageId, assistantMessage));
      } catch (error) {
        const failedMessage: AssistantMessage = {
          ...input.loadingMessage,
          status: "failed",
          content: "KIA Stick could not generate this local deterministic response.",
          error: error instanceof Error ? error.message : "Unknown generation failure.",
          createdAt: new Date().toISOString(),
        };
        setThread((current) => replaceAssistantMessage(current, input.loadingMessage.messageId, failedMessage));
      } finally {
        setIsSending(false);
        setPendingScroll(true);
      }
    }, 90);
  }

  function sendMessage(messageText = draft, sourcePolicy = chatSourceMode) {
    const content = messageText.trim();
    if (!content || isSending) return;
    const snapshot = createChatSubmitSnapshot({
      question: content,
      sourcePolicy,
      mode,
      scope,
      detail,
    });
    const baseThread = thread;
    const userMessage = createUserMessage({
      threadId: thread.threadId,
      content,
      modeScopeDetail: snapshot,
    });
    const loadingMessage = createLoadingAssistantMessage({
      threadId: thread.threadId,
      turnId: userMessage.turnId,
      parentMessageId: userMessage.messageId,
      modeScopeDetail: snapshot,
    });

    setDraft("");
    setChatSourceMode(sourcePolicy);
    setSaveNotice(null);
    setIsSending(true);
    setPendingScroll(true);
    setTab("chat");
    setThread((current) => appendTurn(current, userMessage, loadingMessage));
    completeAssistantTurn({ userMessage, loadingMessage, snapshot, baseThread });
  }

  function retryAssistant(message: AssistantMessage) {
    if (isSending) return;
    const userMessage = thread.messages.find(
      (candidate): candidate is UserMessage => candidate.role === "user" && candidate.messageId === message.parentMessageId
    );
    if (!userMessage) return;
    const loadingMessage = createLoadingAssistantMessage({
      threadId: thread.threadId,
      turnId: userMessage.turnId,
      parentMessageId: userMessage.messageId,
      modeScopeDetail: message.modeScopeDetail,
    });
    const baseThread: ConversationThread = {
      ...thread,
      messages: thread.messages.filter((candidate) => candidate.messageId !== message.messageId),
    };

    setSaveNotice(null);
    setIsSending(true);
    setPendingScroll(true);
    setThread((current) => replaceAssistantMessage(current, message.messageId, loadingMessage));
    completeAssistantTurn({ userMessage, loadingMessage, snapshot: message.modeScopeDetail, baseThread });
  }

  function saveAssistantAnswer(message: AssistantMessage) {
    if (message.status !== "complete") return;
    if (message.answer.noAnswer) {
      setSaveNotice({
        status: "duplicate",
        text: message.answer.answerKind === "public"
          ? "No-answer responses stay out of Saved. Review the one-source public pilot instead."
          : "No-answer responses stay out of Saved. Review the context-only fake trail instead.",
      });
      return;
    }
    const cbaCitations = message.answer.citations.filter((citation) => citation.publicSourceType === "cba_contract");
    const cbaSaveEligible = cbaCitations.every(
      (citation) => verifyCbaCitation(citation, cbaSourceState.status === "available" ? cbaSourceState.source : null).state === "verified_current"
    );
    if (!cbaSaveEligible) {
      setSaveNotice({ status: "duplicate", text: "CBA citation verification is required before this answer can be Saved. Re-search the current CBA source." });
      return;
    }
    const record = createSavedAnswerRecord({
      answer: message.answer,
      mode: message.modeScopeDetail.mode,
      scope: message.modeScopeDetail.scope,
      detail: message.modeScopeDetail.detail,
      timestamp: new Date().toISOString(),
    });
    setSaved((current) => {
      const result = upsertSavedAnswer(current, record);
      setSaveNotice({ status: result.status, text: saveStatusText(result.status, message.answer.answerKind) });
      return result.saved;
    });
  }

  function startNewChat() {
    if (thread.messages.length > 0 && !window.confirm("Start a new chat and clear the current thread?")) return;
    setThread(createConversationThread());
    setDraft("");
    setSaveNotice(null);
    setIsSending(false);
    setPendingScroll(true);
    setTab("chat");
  }

  function navigateToCitation(citation: Citation) {
    if (citation.sourceKind !== "public" || !citation.paragraphId) return;
    const isCba = citation.publicSourceType === "cba_contract" || citation.sourceId === CBA_SOURCE_ID;
    if (isCba) {
      const verification = verifyCbaCitation(citation, cbaSourceState.status === "available" ? cbaSourceState.source : null);
      if (verification.state !== "verified_current") {
        setCbaCitationTargetId(null);
        setCbaCitationNavigationNotice({ citation, state: verification.state });
        setTab("sources");
        return;
      }
      setCbaCitationNavigationNotice(null);
    }
    const targetId = isCba ? cbaParagraphAnchorId(citation.paragraphId) : publicSourceParagraphAnchorId(citation.paragraphId);
    setCbaCitationTargetId(isCba ? citation.paragraphId : null);
    setTab("sources");
    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function queueFakeUpload(kind: "single" | "batch") {
    if (!fakeOnlyConfirmed) return;
    const timestamp = new Date().toISOString();
    const baseId = Date.now();
    const items: QuarantineItem[] =
      kind === "single"
        ? [
            {
              id: `${baseId}-fake-upload-single`,
              name: "fake-upload-sample-single.md",
              size: 1280,
              review: "queued_fake_review",
              privacy: "local_browser_only",
              timestamp,
            },
          ]
        : [
            {
              id: `${baseId}-fake-upload-batch-a`,
              name: "fake-upload-sample-batch-a.md",
              size: 2048,
              review: "queued_fake_review",
              privacy: "local_browser_only",
              timestamp,
            },
            {
              id: `${baseId}-fake-upload-batch-b`,
              name: "fake-upload-sample-batch-b.md",
              size: 1536,
              review: "queued_fake_review",
              privacy: "local_browser_only",
              timestamp,
            },
          ];
    setQuarantine((current) => [...items, ...current].slice(0, 30));
  }

  function runVaultAction(action: VaultAction) {
    setVaultState((current) => applyVaultAction(current, { ...action, now: new Date().toISOString() }));
  }

  function runImportWizardAction(action: ImportWizardAction) {
    setImportWizardState((current) => applyImportWizardAction(current, { ...action, now: new Date().toISOString() }));
  }

  function prepareCbaQuestion(nextQuestion: string) {
    setDraft(nextQuestion);
    setChatSourceMode("cba");
    setTab("chat");
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brandBlock">
          <span className="brandEyebrow">Know-It-All Stick</span>
          <h1 className="brand">KIA Stick</h1>
        </div>
        <div className="topMeta">
          <span className="winBadge">{runtimeVersion.displayVersion}</span>
          <span>{runtimeVersion.provider}</span>
        </div>
      </header>

      <div className="fakeNotice" role="status">
        <AlertTriangle size={16} />
        <span>Fake sample mode remains isolated. PUBLIC DATA PILOT: two exact allowlisted official sources, local read-only, no private data. No cloud keys, real uploads, or unrestricted real-doc gate are active.</span>
      </div>

      <main className={tab === "chat" ? "mainArea chatMain" : "mainArea"} ref={chatScrollRef}>
        {tab === "chat" && (
          <div className="chatScrollArea" aria-label="Chat messages">
            <section className="chatThread" aria-label="Current conversation">
              {thread.messages.length === 0 && (
                <div className="emptyChatState">
                  <span className="messageLabel">New fake chat / public pilot</span>
                  <p>Select the fake corpus or the one-source public pilot, then ask a cited question.</p>
                </div>
              )}
              {thread.messages.map((message, index) =>
                message.role === "user" ? (
                  <UserMessageBubble key={message.messageId} message={message} turnLabel={`Turn ${Math.floor(index / 2) + 1}`} />
                ) : (
                  <AssistantMessageCard
                    key={message.messageId}
                    message={message}
                    turnLabel={`Turn ${Math.floor(index / 2) + 1}`}
                    onRetry={() => retryAssistant(message)}
                    onSave={() => saveAssistantAnswer(message)}
                    onCitationNavigate={navigateToCitation}
                    onSubmitCbaSuggestion={(suggestion) => sendMessage(suggestion, "cba")}
                  />
                )
              )}
            </section>
          </div>
        )}

        {tab === "sources" && (
          <SourcesPanel
            cbaCitationTargetId={cbaCitationTargetId}
            cbaCitationNavigationNotice={cbaCitationNavigationNotice}
            cbaSourceState={cbaSourceState}
            publicSourceState={publicSourceState}
            sourceHierarchyGroups={sourceHierarchyGroups}
            onAskCbaQuestion={prepareCbaQuestion}
            runtimeVersion={runtimeVersion}
          />
        )}

        {tab === "saved" && (
          <SavedAnswersPanel
            saved={saved}
            onDelete={(id) => setSaved((current) => current.filter((savedItem) => savedItem.id !== id))}
            cbaSourceState={cbaSourceState}
            onResearchCba={(question) => sendMessage(question, "cba")}
          />
        )}

        {tab === "upload" && (
          <FakeUploadPanel
            fakeOnlyConfirmed={fakeOnlyConfirmed}
            onFakeOnlyConfirmedChange={setFakeOnlyConfirmed}
            onQueueFakeUpload={queueFakeUpload}
            quarantine={quarantine}
          />
        )}

        {tab === "vault" && (
          <VaultPanel
            counts={vaultCounts}
            onAction={runVaultAction}
            runtimeVersion={runtimeVersion}
            setView={setVaultView}
            state={vaultState}
            view={vaultView}
            workflowCounts={workflowCounts}
          />
        )}

        {tab === "import" && (
          <ImportWizardPanel
            onAction={runImportWizardAction}
            runtimeVersion={runtimeVersion}
            state={importWizardState}
          />
        )}

        {tab === "settings" && (
          <SettingsPanel
            cbaSourceState={cbaSourceState}
            publicSourceState={publicSourceState}
            runtimeVersion={runtimeVersion}
          />
        )}
      </main>

      {tab === "chat" && (
        <section className="chatComposer chatComposerDock" aria-label="Ask KIA Stick">
          <div className="composerHeader">
            <div>
              <span className="sectionKicker">Reply</span>
              <h2>Message KIA Stick</h2>
            </div>
            <div className="composerHeaderActions">
              <button className="button subtle compactButton" type="button" onClick={startNewChat} aria-label="New chat">
                <Plus size={16} />
                New chat
              </button>
              <span className={latestAssistant?.answer.noAnswer ? "statusPill warning" : "statusPill ok"}>
                {isSending
                  ? chatSourceMode === "cba" ? "Checking CBA cache" : chatSourceMode === "nlrb" || chatSourceMode === "public" ? "Checking NLRB cache" : chatSourceMode === "fake" ? "Checking fake sources" : "Routing automatically"
                  : latestAssistant?.answer.noAnswer ? "No-answer unsaved"
                  : latestAssistant ? latestAssistant.answer.answerKind === "public" ? "Public citation ready" : "Fake thread ready"
                  : "Ready"}
              </span>
            </div>
          </div>

          <div className="askBox">
            <div className="visibleLaneControl" aria-label="Chat answer lane policy">
              <label className="controlPill">
                <span>Answer lane</span>
                <select value={chatSourceMode} onChange={(event) => setChatSourceMode(event.target.value as ChatSourcePolicy)}>
                  <option value="auto">Automatic — official public intents first</option>
                  <option value="cba">CBA</option>
                  <option value="nlrb">NLRB Guidance</option>
                  <option value="fake">Fake sample corpus</option>
                </select>
              </label>
              <span className="emptyState">Automatic is the safe default: CBA intents first, then NLRB guidance, known fake prompts, and finally a no-answer lane.</span>
            </div>
            <textarea
              aria-label="Message KIA Stick"
              placeholder="Message KIA Stick..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="chatActions">
              <button className="button primary" type="button" disabled={!draft.trim() || isSending} onClick={() => sendMessage()}>
                <MessageSquareText size={17} />
                {isSending ? "Sending" : "Send"}
              </button>
            </div>
            {saveNotice && (
              <div className={`saveNotice ${saveNotice.status === "duplicate" ? "warning" : "ok"}`} role="status" aria-live="polite">
                {saveNotice.text}
              </div>
            )}
          </div>

          <details className="composerDisclosure">
            <summary>Response options</summary>
            <div className="controlStrip">
              <label className="controlPill">
                <span>Mode</span>
                <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
                  {modes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="controlPill">
                <span>Scope</span>
                <select value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
                  {scopes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="controlPill">
                <span>Detail</span>
                <select value={detail} onChange={(event) => setDetail(event.target.value as Detail)}>
                  {details.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <details className="promptDetails">
            <summary>Prompt shortcuts</summary>
            <div className="promptRail" aria-label={chatSourceMode === "cba" ? "CBA prompts" : chatSourceMode === "nlrb" || chatSourceMode === "public" ? "NLRB guidance prompts" : chatSourceMode === "fake" ? "fake test prompts" : "automatic public and fake prompts"}>
              {(chatSourceMode === "cba"
                ? cbaPilotQuestions
                : chatSourceMode === "nlrb" || chatSourceMode === "public"
                ? publicPilotQuestions
                : chatSourceMode === "fake"
                  ? cannedQuestions
                  : [...cbaPilotQuestions, ...publicPilotQuestions, ...cannedQuestions]
              ).map((prompt) => (
                <button className="promptChip" key={prompt} type="button" onClick={() => setDraft(prompt)}>
                  {prompt}
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </details>
        </section>
      )}

      <nav className="bottomNav" aria-label="KIA Stick navigation">
        <NavButton active={tab === "chat"} label="Chat" onClick={() => setTab("chat")} icon={<MessageSquareText size={20} />} />
        <NavButton active={tab === "sources"} label="Sources" onClick={() => setTab("sources")} icon={<BookOpen size={20} />} />
        <NavButton active={tab === "saved"} label="Saved" onClick={() => setTab("saved")} icon={<Heart size={20} />} />
        <NavButton active={tab === "upload"} label="Upload" onClick={() => setTab("upload")} icon={<Upload size={20} />} />
        <NavButton active={tab === "vault"} label="Vault" onClick={() => setTab("vault")} icon={<Database size={20} />} />
        <NavButton active={tab === "import"} label="Import" onClick={() => setTab("import")} icon={<FileSearch size={20} />} />
        <NavButton active={tab === "settings"} label="Settings" onClick={() => setTab("settings")} icon={<Settings size={20} />} />
      </nav>
    </div>
  );
}

export function SettingsPanel(props: {
  cbaSourceState: CbaSourceLoadState;
  publicSourceState: PublicSourceLoadState;
  runtimeVersion: RuntimeVersion;
}) {
  const [operatorDiagnosticsOpen, setOperatorDiagnosticsOpen] = useState(false);
  return (
    <SettingsContent
      {...props}
      operatorDiagnosticsOpen={operatorDiagnosticsOpen}
      onOperatorDiagnosticsToggle={() => setOperatorDiagnosticsOpen((open) => !open)}
    />
  );
}

export function SettingsContent(props: {
  cbaSourceState: CbaSourceLoadState;
  publicSourceState: PublicSourceLoadState;
  runtimeVersion: RuntimeVersion;
  operatorDiagnosticsOpen: boolean;
  onOperatorDiagnosticsToggle: () => void;
}) {
  const dataModes = currentAcceptedPushedState.data_modes;
  const cbaInstanceStatus = props.cbaSourceState.status === "available"
    ? `verified (${shortCbaDigest(deriveCbaSourceInstance(props.cbaSourceState.source).sourceInstanceId)})`
    : props.cbaSourceState.status === "loading" ? "checking local cache" : "local cache unavailable";
  const nlrbStatus = props.publicSourceState.status === "available"
    ? "available from verified local cache"
    : props.publicSourceState.status === "loading" ? "checking local cache" : "local cache unavailable";

  return (
    <section className="tabPanel settingsPanel">
      <PanelHeader title="Settings" meta={<a href="/version">Version page</a>} />
      <div className="settingsSummaryGrid" aria-label="Settings summary">
        <section className="settingsSummaryCard" aria-labelledby="settings-data-privacy">
          <span className="sectionKicker">Data and privacy mode</span>
          <h3 id="settings-data-privacy">{localDataModeLabel()}</h3>
          <ul className="settingsSummaryList">
            <li>Fake samples are isolated.</li>
            <li>Two exact official public sources are available locally in read-only mode.</li>
            <li>Private, member, and case data is {dataModes?.private_data ?? "blocked"}.</li>
            <li>External AI is {dataModes?.external_ai ?? "disabled"}.</li>
            <li>No real upload or import path exists.</li>
          </ul>
        </section>

        <section className="settingsSummaryCard" aria-labelledby="settings-accepted-capability">
          <span className="sectionKicker">Current accepted capability</span>
          <h3 id="settings-accepted-capability">{currentAcceptedPushedState.checkpoint}</h3>
          <dl className="compactSettingsGrid">
            <dt>Accepted checkpoint</dt>
            <dd>{currentAcceptedPushedState.checkpoint}</dd>
            <dt>Feature commit</dt>
            <dd>{currentAcceptedPushedState.accepted_pushed_short_commit}</dd>
            <dt>Validation</dt>
            <dd>{currentAcceptedPushedState.accepted_validation}</dd>
            <dt>Operator QA</dt>
            <dd>{currentAcceptedPushedState.accepted_manual_qa}</dd>
            <dt>Pushed</dt>
            <dd>{currentAcceptedPushedState.accepted_pushed ? "yes" : "no"}</dd>
          </dl>
          <p className="settingsNote">This accepted feature checkpoint is separate from the current application build.</p>
        </section>

        <section className="settingsSummaryCard" aria-labelledby="settings-current-build">
          <span className="sectionKicker">Current application build</span>
          <h3 id="settings-current-build">KIA Stick {props.runtimeVersion.productVersion}</h3>
          <dl className="compactSettingsGrid">
            <dt>Current build</dt>
            <dd>{props.runtimeVersion.gitSha}</dd>
            <dt>Channel</dt>
            <dd>{props.runtimeVersion.channel}</dd>
            <dt>Local bundle</dt>
            <dd>{currentAcceptedPushedState.local_bundle_status}</dd>
          </dl>
          <a className="settingsVersionLink" href="/version">View full build identity</a>
        </section>

        <section className="settingsSummaryCard" aria-labelledby="settings-source-status">
          <span className="sectionKicker">Source status</span>
          <h3 id="settings-source-status">Official sources and isolated samples</h3>
          <dl className="compactSettingsGrid">
            <dt>APWU-USPS CBA</dt>
            <dd>available; current source instance {cbaInstanceStatus}</dd>
            <dt>NLRB guidance</dt>
            <dd>{nlrbStatus}</dd>
            <dt>Fake samples</dt>
            <dd>isolated corpus available</dd>
          </dl>
        </section>

        <section className="settingsSummaryCard" aria-labelledby="settings-safety-boundaries">
          <span className="sectionKicker">Safety boundaries</span>
          <h3 id="settings-safety-boundaries">Blocked capabilities remain blocked</h3>
          <ul className="settingsSummaryList">
            <li>Private data blocked.</li>
            <li>queue-015 blocked.</li>
            <li>External AI disabled.</li>
            <li>Real upload and import disabled.</li>
          </ul>
        </section>
      </div>

      <div className="operatorDiagnosticsControls">
        <button
          aria-controls={operatorDiagnosticsRegionId}
          aria-expanded={props.operatorDiagnosticsOpen}
          className="button subtle operatorDiagnosticsToggle"
          id={operatorDiagnosticsToggleId}
          onClick={props.onOperatorDiagnosticsToggle}
          type="button"
        >
          {props.operatorDiagnosticsOpen ? "Hide operator diagnostics" : "Show operator diagnostics"}
        </button>
        <p>This is a local diagnostic view, not an authentication or authorization boundary.</p>
      </div>

      {props.operatorDiagnosticsOpen && (
        <section
          aria-labelledby={operatorDiagnosticsToggleId}
          className="aboutPanel operatorDiagnosticsRegion"
          id={operatorDiagnosticsRegionId}
          role="region"
        >
          <span className="sectionKicker">Operator and governance diagnostics</span>
          <h3>Fake-only operator status and exact local data-mode identity</h3>
          <p>
            KIA Stick keeps the bundled fake corpus under `local-fake-deterministic`. The public pilot separately reads `{CBA_SOURCE_ID}` under `{CBA_PROVIDER}` / `{CBA_PROMPT_VERSION}` and `{PUBLIC_SOURCE_ID}` under `{PUBLIC_SOURCE_PROVIDER}` / `{PUBLIC_SOURCE_PROMPT_VERSION}`. This build does not read private folders, real APWU/USPS/member/local/case documents, cloud services, or external AI APIs. The public pilot is non-sensitive and read-only; private-data and real-doc gates remain blocked.
          </p>
          <h3>Current accepted pushed checkpoint: {currentAcceptedPushedState.checkpoint_label}</h3>
          <p>
            Current accepted pushed state is {currentAcceptedPushedState.checkpoint} at {currentAcceptedPushedState.accepted_pushed_commit} with validation {currentAcceptedPushedState.accepted_validation}, manual QA {currentAcceptedPushedState.accepted_manual_qa}, and push yes. The accepted feature checkpoint is distinct from the repository/closeout recording point, where repository equality was verified at {repositoryRecordingShortCommit}. Older baselines, including {historicalAcceptedPushedShortCommits}, are historical only and not current. Historical accepted-WARN state is parked, not current. Next/PostCSS remains WARN_SAFE_NEXT_TARGET_UNCLEAR, v0.9.12C remains blocked, unrestricted queue-015 remains blocked, package lock is unchanged, and no private real-doc capability is approved.
          </p>
          <dl className="settingsGrid operatorDiagnosticsGrid">
            {acceptedOperatorCheckpoint.map((row) => (
              <React.Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </React.Fragment>
            ))}
            <dt>Display</dt>
            <dd>{props.runtimeVersion.displayVersion}</dd>
            <dt>Accepted-state recording baseline</dt>
            <dd>{currentAcceptedPushedState.repository_recording_commit ?? "not recorded"}</dd>
            <dt>Product</dt>
            <dd>{props.runtimeVersion.productVersion}</dd>
            <dt>Channel</dt>
            <dd>{props.runtimeVersion.channel}</dd>
            <dt>Build Date</dt>
            <dd>{props.runtimeVersion.buildDate}</dd>
            <dt>Git SHA</dt>
            <dd>{props.runtimeVersion.gitSha}</dd>
            <dt>Corpus</dt>
            <dd>{props.runtimeVersion.corpusVersion}</dd>
            <dt>Index</dt>
            <dd>{props.runtimeVersion.indexVersion}</dd>
            <dt>Prompt</dt>
            <dd>{props.runtimeVersion.promptVersion}</dd>
            <dt>Provider</dt>
            <dd>{props.runtimeVersion.provider}</dd>
            <dt>Cloud</dt>
            <dd>disabled</dd>
            <dt>Real DB</dt>
            <dd>not touched</dd>
          </dl>
        </section>
      )}
    </section>
  );
}

function PanelHeader(props: { title: string; meta: React.ReactNode }) {
  return (
    <div className="panelHeader">
      <h2>{props.title}</h2>
      <span>{props.meta}</span>
    </div>
  );
}

function NavButton(props: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button className={props.active ? "navButton active" : "navButton"} type="button" onClick={props.onClick}>
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

export function FakeUploadPanel(props: {
  fakeOnlyConfirmed: boolean;
  onFakeOnlyConfirmedChange: (checked: boolean) => void;
  onQueueFakeUpload: (kind: "single" | "batch") => void;
  quarantine: QuarantineItem[];
}) {
  return (
    <section className="tabPanel">
      <PanelHeader title="Upload" meta="fake metadata quarantine only" />
      <div className="uploadPanel">
        <div className="qaCueRail" aria-label="Upload fake-only checks">
          <span>metadata buttons only</span>
          <span>no file chooser</span>
          <span>review fixtures, not files</span>
          <span>{formatCount(props.quarantine.length, "queued fake row")}</span>
        </div>
        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={props.fakeOnlyConfirmed}
            onChange={(event) => props.onFakeOnlyConfirmedChange(event.target.checked)}
          />
          Confirm fake sample metadata only
        </label>
        <div className="fakeUploadActions" aria-label="fake upload metadata actions">
          <button className="button primary" type="button" disabled={!props.fakeOnlyConfirmed} onClick={() => props.onQueueFakeUpload("single")}>
            <Plus size={16} />
            Queue fake sample metadata
          </button>
          <button className="button subtle" type="button" disabled={!props.fakeOnlyConfirmed} onClick={() => props.onQueueFakeUpload("batch")}>
            <ClipboardList size={16} />
            Queue fake batch metadata
          </button>
        </div>
        <p className="emptyState">No file picker is present. No cloud/API key is required. Buttons queue synthetic names, sizes, and timestamps only; review labels are synthetic.</p>
        <div className="sourceCards">
          {props.quarantine.length === 0 && <p className="emptyState">No queued fake samples. Confirm fake sample metadata only, then queue a sample or batch.</p>}
          {props.quarantine.map((item) => (
            <article className="uploadRow" key={item.id}>
              <p>
                <strong>{item.name}</strong> · {item.size} bytes
              </p>
              <div className="sourceMeta">
                <span className="badge">{item.review}</span>
                <span className="badge">synthetic_metadata_only</span>
                <span className="badge red">not_indexable</span>
                <span className="badge">{item.privacy}</span>
                <span className="badge">{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CbaPassageCard({
  paragraph,
  source,
  relevance,
}: {
  paragraph: CbaParagraph;
  source: Extract<CbaSourceRouteResponse, { status: "available" }>["source"];
  relevance: string;
}) {
  const integrity = deriveCbaCitationIntegrity(source, paragraph);
  return (
    <article id={cbaParagraphAnchorId(paragraph.id)} className="hierarchyDoc cbaPassageCard">
      <strong>
        {paragraph.articleNumber ? `Article ${paragraph.articleNumber}` : paragraph.structuralType}
        {paragraph.sectionNumber ? ` · Section ${paragraph.sectionNumber}` : ""}
        {paragraph.subsection ? ` · ${paragraph.subsection}` : ""}
      </strong>
      <p>{paragraph.text.length > 520 ? `${paragraph.text.slice(0, 517)}…` : paragraph.text}</p>
      <div className="sourceMeta">
        <span className="badge">PDF {paragraph.pdfPageNumber}</span>
        <span className="badge">printed {paragraph.printedPageLabel ?? "unknown"}</span>
        <span className="badge">{paragraph.structuralType}</span>
        <span className="badge">{paragraph.id}</span>
      </div>
      <p className="emptyState">Relevance: {relevance}</p>
      <details className="packetDisclosure">
        <summary>Citation integrity details</summary>
        <div className="packetDisclosureBody">
          <p>Source instance {integrity.sourceInstanceId}</p>
          <p>Paragraph SHA-256 {integrity.paragraphContentSha256}</p>
          <p>Anchor SHA-256 {integrity.citationAnchorSha256}</p>
        </div>
      </details>
    </article>
  );
}

export function SourcesPanel({
  cbaCitationTargetId = null,
  cbaCitationNavigationNotice = null,
  cbaSourceState = { status: "unavailable", reason: "cache_missing" },
  publicSourceState = { status: "unavailable", reason: "cache_missing" },
  sourceHierarchyGroups,
  onAskCbaQuestion,
  runtimeVersion,
}: {
  cbaCitationTargetId?: string | null;
  cbaCitationNavigationNotice?: CbaCitationNavigationNotice | null;
  cbaSourceState?: CbaSourceLoadState;
  publicSourceState?: PublicSourceLoadState;
  sourceHierarchyGroups: ReturnType<typeof buildSourceHierarchyGroups>;
  onAskCbaQuestion?: (question: string) => void;
  runtimeVersion: RuntimeVersion;
}) {
  const [cbaSearchQuery, setCbaSearchQuery] = useState("Article 15");
  const cbaSearchResults = useMemo(
    () => cbaSourceState.status === "available" ? searchCba(cbaSourceState.source, cbaSearchQuery, 8) : [],
    [cbaSearchQuery, cbaSourceState]
  );
  const cbaCitationTarget = useMemo(() => {
    if (cbaSourceState.status !== "available" || !cbaCitationTargetId) return null;
    return cbaSourceState.source.normalized.pages
      .flatMap((page) => page.paragraphs)
      .find((paragraph) => paragraph.id === cbaCitationTargetId) ?? null;
  }, [cbaCitationTargetId, cbaSourceState]);
  const cbaSourceInstance = useMemo(
    () => cbaSourceState.status === "available" ? deriveCbaSourceInstance(cbaSourceState.source) : null,
    [cbaSourceState]
  );
  const totalSources = sourceHierarchyGroups.reduce((total, group) => total + group.docs.length, 0);
  const citableSources = sourceHierarchyGroups.flatMap((group) => group.docs).filter((doc) => doc.citable).length;
  const contextOnlySources = totalSources - citableSources;

  return (
    <section className="tabPanel">
      <PanelHeader title="Sources" meta="isolated fake and public lanes" />
      <div className="publicPilotStatus" aria-label="public data pilot status">
        <strong>PUBLIC DATA PILOT</strong>
        <span>TWO EXACT ALLOWLISTED SOURCES</span>
        <span>LOCAL READ-ONLY</span>
        <span>NO PRIVATE DATA</span>
      </div>

      {cbaSourceState.status === "loading" && (
        <article className="sourceCard publicSourceCard" aria-label="official CBA source loading">
          <h3>Loading bounded local official CBA cache</h3>
          <p>No external fetch occurs in the application. The server checks only the fixed PDF and normalized cache.</p>
        </article>
      )}

      {cbaSourceState.status === "unavailable" && (
        <article className="sourceCard publicSourceCard" aria-label="official CBA source unavailable">
          <h3>Official APWU-USPS CBA unavailable</h3>
          <p>The bounded CBA cache is safely unavailable ({cbaSourceState.reason}). No other path, URL, source, or fake lane was tried.</p>
          <p>Operator restore command: <code>node scripts/public-source-sync.mjs {CBA_SOURCE_ID}</code></p>
        </article>
      )}

      {cbaSourceState.status === "available" && (
        <article className="sourceCard publicSourceCard cbaSourceCard" aria-label="official final APWU USPS CBA source">
          <div className="publicSourceHeader">
            <div>
              <span className="sectionKicker">OFFICIAL FINAL CBA</span>
              <h3>{cbaSourceState.source.source.title}</h3>
              <p>{cbaSourceState.source.source.owner}</p>
            </div>
            <div className="compactActions">
              <a className="button subtle officialSourceLink" href={CBA_SOURCE_PAGE_URL} target="_blank" rel="noreferrer">Official source page</a>
              <a className="button subtle officialSourceLink" href={CBA_SOURCE_PDF_URL} target="_blank" rel="noreferrer">Official PDF</a>
            </div>
          </div>
          <div className="sourceMeta">
            <span className="badge green">OFFICIAL FINAL CBA</span>
            <span className="badge green">CONTROLLING CONTRACT LANGUAGE</span>
            <span className="badge green">PUBLIC / NON-SENSITIVE</span>
            <span className="badge">LOCAL READ-ONLY</span>
            <span className="badge">source id {CBA_SOURCE_ID}</span>
            <span className="badge">NO LEGAL ADVICE</span>
            <span className="badge green">CURRENT SOURCE INSTANCE VERIFIED</span>
            <span className="badge">instance {shortCbaDigest(cbaSourceInstance!.sourceInstanceId)} (short prefix only)</span>
          </div>
          <dl className="publicSourceMetadata">
            <dt>Status</dt><dd>{CBA_DOCUMENT_STATUS}</dd>
            <dt>Effective</dt><dd>{CBA_EFFECTIVE_START} through {CBA_EFFECTIVE_END}</dd>
            <dt>PDF pages</dt><dd>{cbaSourceState.source.extraction.pageCount}</dd>
            <dt>Retrieved</dt><dd>{cbaSourceState.source.retrievedAt}</dd>
            <dt>PDF SHA-256</dt><dd>{cbaSourceState.source.response.sha256}</dd>
            <dt>Normalized SHA-256</dt><dd>{cbaSourceState.source.normalized.sha256}</dd>
            <dt>Articles</dt><dd>{cbaSourceState.source.normalized.articleCount}</dd>
            <dt>Sections</dt><dd>{cbaSourceState.source.normalized.sectionCount}</dd>
            <dt>Paragraphs</dt><dd>{cbaSourceState.source.normalized.paragraphCount}</dd>
            <dt>Extraction</dt><dd>{cbaSourceState.source.extraction.toolVersion}</dd>
          </dl>
          <details className="packetDisclosure">
            <summary>Citation-integrity technical details</summary>
            <div className="packetDisclosureBody">
              <p>Full source instance: {cbaSourceInstance!.sourceInstanceId}</p>
              <p>Source-instance algorithm: {cbaSourceInstance!.sourceInstanceAlgorithmVersion}</p>
              <p>Extraction tool: {cbaSourceState.source.extraction.tool} {cbaSourceState.source.extraction.toolVersion}</p>
              <p>Parser/schema: {cbaSourceInstance!.parserSchemaVersion}</p>
              <p>Normalization algorithm: {cbaSourceInstance!.normalizationAlgorithmVersion}</p>
            </div>
          </details>
          <div className="applicabilityWarning" role="note">
            <AlertTriangle size={16} />
            <strong>{CBA_SCOPE_WARNING} Not legal advice.</strong>
          </div>

          {cbaCitationNavigationNotice && (
            <div className="applicabilityWarning" role="alert" aria-label="CBA citation verification warning">
              <AlertTriangle size={16} />
              <strong>{citationVerificationMessage(cbaCitationNavigationNotice.state)}</strong>
              <span>Internal navigation was blocked. Use the official PDF or re-search the current CBA source.</span>
              {onAskCbaQuestion && (
                <button className="button subtle" type="button" onClick={() => onAskCbaQuestion(cbaCitationNavigationNotice.citation.articleNumber ? `What does Article ${cbaCitationNavigationNotice.citation.articleNumber} say?` : "What does the contract say about overtime?")}>
                  Re-search current CBA
                </button>
              )}
            </div>
          )}

          <section className="cbaSearchPanel" aria-label="deterministic CBA lexical search">
            <span className="sectionKicker">Deterministic lexical search</span>
            <label className="controlPill">
              <span>Search exact CBA text</span>
              <input value={cbaSearchQuery} onChange={(event) => setCbaSearchQuery(event.target.value)} placeholder="Article 15 or quoted contract phrase" />
            </label>
            <p className="emptyState">No embeddings, fuzzy expansion, model call, or external API. Results use exact tokens, phrases, article/title boosts, and stable ordering.</p>
            {onAskCbaQuestion && (
              <button className="button subtle" type="button" onClick={() => onAskCbaQuestion(cbaSearchQuery)}>
                Ask Chat about this CBA search
              </button>
            )}
            <div className="sourceCards" aria-label="CBA lexical search results">
              {cbaSearchResults.length === 0 && <p className="emptyState">No CBA passage matched the exact lexical query.</p>}
              {cbaSearchResults.filter((result) => result.paragraph.id !== cbaCitationTargetId).map((result) => (
                <CbaPassageCard
                  key={result.paragraph.id}
                  paragraph={result.paragraph}
                  source={cbaSourceState.source}
                  relevance={result.relevance.join("; ")}
                />
              ))}
            </div>
          </section>

          {cbaCitationTarget && (
            <section className="cbaCitationTarget" aria-label="selected CBA citation passage">
              <span className="sectionKicker">Selected citation passage</span>
              <CbaPassageCard paragraph={cbaCitationTarget} source={cbaSourceState.source} relevance="exact internal citation anchor" />
            </section>
          )}

          <section className="cbaArticleIndex" aria-label="CBA structural article index">
            <h4>Article and document structure index</h4>
            <div className="sourceMeta">
              {cbaSourceState.source.normalized.structures.map((entry) => (
                <span className="badge" key={entry.id}>{entry.label} · PDF {entry.startPdfPage} · {entry.structuralType}</span>
              ))}
            </div>
          </section>
        </article>
      )}

      <h3 className="sourceLaneTitle">NLRB official general guidance — separate authority role</h3>

      {publicSourceState.status === "loading" && (
        <article className="sourceCard publicSourceCard">
          <h3>Loading bounded local public-source cache</h3>
          <p>No external fetch occurs in the application. The server is checking only the exact local cache file.</p>
        </article>
      )}

      {publicSourceState.status === "unavailable" && (
        <article className="sourceCard publicSourceCard" aria-label="public source unavailable">
          <h3>Weingarten Rights source unavailable</h3>
          <p>The bounded cache is safely unavailable ({publicSourceState.reason}). No other path or source was tried.</p>
          <p>Operator restore command: <code>node scripts/public-source-sync.mjs {PUBLIC_SOURCE_ID}</code></p>
        </article>
      )}

      {publicSourceState.status === "available" && (
        <article className="sourceCard publicSourceCard" aria-label="official NLRB public source">
          <div className="publicSourceHeader">
            <div>
              <span className="sectionKicker">OFFICIAL GENERAL GUIDANCE</span>
              <h3>{publicSourceState.source.source.title}</h3>
              <p>{publicSourceState.source.source.owner}</p>
            </div>
            <a className="button subtle officialSourceLink" href={PUBLIC_SOURCE_URL} target="_blank" rel="noreferrer">
              Official NLRB page
            </a>
          </div>
          <div className="sourceMeta">
            <span className="badge green">OFFICIAL SOURCE</span>
            <span className="badge green">PUBLIC / NON-SENSITIVE</span>
            <span className="badge">READ-ONLY</span>
            <span className="badge">source id {publicSourceState.source.source.id}</span>
            <span className="badge">class {publicSourceState.source.source.sourceClass}</span>
            <span className="badge">postal applicability {publicSourceState.source.source.postalApplicability}</span>
            <span className="badge red">controlling for USPS {publicSourceState.source.source.controllingForUsps}</span>
          </div>
          <dl className="publicSourceMetadata">
            <dt>Publisher</dt>
            <dd>{publicSourceState.source.source.owner}</dd>
            <dt>Retrieved</dt>
            <dd>{publicSourceState.source.retrievedAt}</dd>
            <dt>Approved URL</dt>
            <dd>{publicSourceState.source.source.url}</dd>
            <dt>Source SHA-256</dt>
            <dd>{publicSourceState.source.response.sha256}</dd>
            <dt>Normalized SHA-256</dt>
            <dd>{publicSourceState.source.normalized.sha256}</dd>
            <dt>Sections</dt>
            <dd>{publicSourceState.source.normalized.sectionCount}</dd>
            <dt>Access</dt>
            <dd>{publicSourceState.source.source.accessMode}</dd>
          </dl>
          <div className="applicabilityWarning" role="note">
            <AlertTriangle size={16} />
            <strong>{PUBLIC_SOURCE_APPLICABILITY_WARNING}</strong>
          </div>
          <div className="publicSourceSections" aria-label="normalized public source sections">
            {publicSourceState.source.normalized.sections.map((section) => (
              <section id={`public-source-${section.id}`} key={section.id} className="publicSourceSection">
                <h4>{section.title}</h4>
                <span className="sectionAnchor">{section.id}</span>
                {section.paragraphs.map((paragraph) => (
                  <p id={publicSourceParagraphAnchorId(paragraph.id)} key={paragraph.id}>
                    <span className="paragraphAnchor">{paragraph.id}</span>
                    {paragraph.text}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
      )}

      <h3 className="sourceLaneTitle">Fake sample corpus — separate from public claims</h3>
      <div className="traceSummary" aria-label="source traceability summary">
        <strong>{totalSources} fake sources</strong>
        <span>{citableSources} citable in answer citations</span>
        <span>{contextOnlySources} context-only guardrails</span>
        <span>source IDs visible on every row</span>
        <span>Prompt {runtimeVersion.promptVersion}</span>
        <span>Build {runtimeVersion.displayVersion}</span>
      </div>
      <div className="sourceCards">
        {sourceHierarchyGroups.map(({ hierarchy, label, docs }, index) => (
          <article className="sourceCard hierarchyCard" key={hierarchy}>
            <div>
              <h3>{label}</h3>
              <p>
                Rank {index + 1} in the fake citation hierarchy. Citation labels trace back to fake source IDs, page tags, and citable/context-only status.
              </p>
            </div>
            <div className="qaCueRail compact" aria-label={`${label} citation role counts`}>
              <span>{formatCount(docs.filter((doc) => doc.citable).length, "citable fake source")}</span>
              <span>{formatCount(docs.filter((doc) => !doc.citable).length, "context-only source")}</span>
            </div>
            <div className="hierarchyDocList">
              {docs.map((doc) => (
                <div className="hierarchyDoc" key={doc.id}>
                  <strong>{doc.title}</strong>
                  <div className="sourceMeta">
                    <span className="badge">{sourceClassLabels[doc.class]}</span>
                    <span className={doc.citable ? "badge green" : "badge red"}>{doc.citable ? "citable in Chat" : "context only"}</span>
                    <span className="badge">source id {doc.id}</span>
                    <span className="badge">{doc.page}</span>
                    <span className="badge">{doc.status.includes("fake") ? "fake sample" : "blocked"}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function savedCbaVerificationState(item: SavedAnswer, cbaSourceState: CbaSourceLoadState): CitationVerificationState | null {
  const citation = item.citations.find((candidate) => candidate.publicSourceType === "cba_contract");
  if (!citation) return null;
  return verifyCbaCitation(citation, cbaSourceState.status === "available" ? cbaSourceState.source : null).state;
}

export function SavedAnswersPanel(props: {
  saved: SavedAnswer[];
  onDelete: (id: string) => void;
  cbaSourceState?: CbaSourceLoadState;
  onResearchCba?: (question: string) => void;
}) {
  const cbaSourceState = props.cbaSourceState ?? { status: "unavailable", reason: "cache_missing" as const };
  return (
    <section className="tabPanel">
      <PanelHeader title="Saved" meta={`${props.saved.length} stored locally`} />
      <div className="sourceCards">
        {props.saved.length === 0 && (
          <p className="emptyState">
            No saved fake answers yet. Answer cards retain source/provider metadata, citation count, and fake build metadata. No-answer Chat cards are blocked from Saved. No saved public-pilot answers yet. Both lanes remain separately labeled and retain local provider, prompt, source, hash, and anchor metadata.
          </p>
        )}
        {props.saved.map((item) => {
          const cbaVerificationState = savedCbaVerificationState(item, cbaSourceState);
          const cbaCitation = item.citations.find((citation) => citation.publicSourceType === "cba_contract");
          return (
          <article className="savedCard" key={item.id}>
            <div className="savedHeader">
              <h3>{item.question}</h3>
              <button
                className="button iconOnly subtle"
                type="button"
                title="Delete saved answer"
                aria-label="Delete saved answer"
                onClick={() => props.onDelete(item.id)}
              >
                <Archive size={16} />
              </button>
            </div>
            <p>{item.answer.split("\n\n")[0]}</p>
            <dl className="savedDetailList" aria-label="Saved answer metadata">
              <dt>Product</dt>
              <dd>{item.version.productVersion}</dd>
              <dt>Prompt</dt>
              <dd>{item.version.promptVersion}</dd>
              <dt>Build</dt>
              <dd>{savedBuildLabel(item)}</dd>
              <dt>Provider</dt>
              <dd>{item.provider}</dd>
              <dt>Answer lane</dt>
              <dd>{item.answerLane}</dd>
              <dt>Source lane</dt>
              <dd>{item.answerLane === "public_cba" ? "PUBLIC DATA PILOT — CBA" : item.answerLane === "public" ? "PUBLIC DATA PILOT — NLRB" : "FAKE SAMPLE CORPUS"}</dd>
              {item.answerLane !== "fake" && (
                <>
                  <dt>Public source ID</dt>
                  <dd>{item.sourceId ?? publicCitationForSaved(item)?.sourceId}</dd>
                  <dt>Source owner</dt>
                  <dd>{item.sourceOwner}</dd>
                  <dt>Retrieved</dt>
                  <dd>{item.sourceRetrievedAt ?? publicCitationForSaved(item)?.retrievedAt}</dd>
                  <dt>Normalized source hash</dt>
                  <dd>{item.normalizedSourceHash ?? publicCitationForSaved(item)?.contentHash}</dd>
                  <dt>Citation anchors</dt>
                  <dd>{item.citations.map((citation) => `${citation.sectionId}/${citation.paragraphId}`).join(", ")}</dd>
                  <dt>Postal applicability</dt>
                  <dd>{item.postalApplicability}</dd>
                  <dt>Controlling for USPS</dt>
                  <dd>{item.answerLane === "public_cba" ? "yes_with_scope_caveats" : item.controllingForUsps}</dd>
                  {item.answerLane === "public_cba" && (
                    <>
                      <dt>Source title</dt><dd>{item.sourceTitle}</dd>
                      <dt>Document status</dt><dd>{item.sourceStatus}</dd>
                      <dt>Effective dates</dt><dd>{item.effectiveStart} through {item.effectiveEnd}</dd>
                      <dt>PDF SHA-256</dt><dd>{item.pdfSha256}</dd>
                      <dt>Authority</dt><dd>{item.authorityClassification}</dd>
                      <dt>Scope warning</dt><dd>{item.scopeWarning}</dd>
                      <dt>Citation integrity</dt><dd>{cbaVerificationState ?? item.citationVerificationStateAtSave ?? "legacy_unverifiable"}</dd>
                      <dt>Source instance</dt><dd>{item.sourceInstanceId ? `${shortCbaDigest(item.sourceInstanceId)} (short prefix only)` : "Legacy citation - re-verification required"}</dd>
                      <dt>CBA locations</dt>
                      <dd>{item.citations.filter((citation) => citation.publicSourceType === "cba_contract").map((citation) => `Article ${citation.articleNumber} / ${citation.sectionId} / PDF ${citation.pdfPageNumber} / printed ${citation.printedPageLabel ?? "unknown"} / ${citation.paragraphId}`).join(", ")}</dd>
                      {cbaVerificationState && cbaVerificationState !== "verified_current" && (
                        <dd className="applicabilityWarning" role="alert">
                          {citationVerificationMessage(cbaVerificationState)}
                          {props.onResearchCba && <button className="button subtle" type="button" onClick={() => props.onResearchCba?.(item.question)}>Re-search current CBA</button>}
                        </dd>
                      )}
                      {cbaCitation && (
                        <details className="packetDisclosure">
                          <summary>Citation-integrity technical details</summary>
                          <div className="packetDisclosureBody">
                            <p>Source instance {item.sourceInstanceId ?? cbaCitation.sourceInstanceId ?? "legacy missing"}</p>
                            <p>Paragraph SHA-256 {item.paragraphContentSha256 ?? cbaCitation.paragraphContentSha256 ?? "legacy missing"}</p>
                            <p>Anchor SHA-256 {item.citationAnchorSha256 ?? cbaCitation.citationAnchorSha256 ?? "legacy missing"}</p>
                            <p>Algorithms {item.sourceInstanceAlgorithmVersion ?? cbaCitation.sourceInstanceAlgorithmVersion ?? "legacy missing"} / {item.paragraphHashAlgorithmVersion ?? cbaCitation.paragraphHashAlgorithmVersion ?? "legacy missing"} / {item.citationAnchorAlgorithmVersion ?? cbaCitation.citationAnchorAlgorithmVersion ?? "legacy missing"}</p>
                          </div>
                        </details>
                      )}
                    </>
                  )}
                </>
              )}
            </dl>
            <div className="sourceMeta">
              <span className="badge">{item.mode}</span>
              <span className="badge">{item.scope}</span>
              <span className="badge">{item.detail}</span>
              <span className="badge">{item.citations.length} citations</span>
              <span className={item.answerLane !== "fake" ? "badge green" : "badge"}>
                {item.answerLane === "public_cba" ? "official controlling CBA" : item.answerLane === "public" ? "official public guidance" : "fake claims"}
              </span>
              <span className="badge">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

export function VaultPanel(props: {
  counts: Record<VaultLane, number>;
  workflowCounts: Record<VaultWorkflowState, number>;
  state: VaultState;
  view: VaultView;
  runtimeVersion: RuntimeVersion;
  setView: (view: VaultView) => void;
  onAction: (action: VaultAction) => void;
}) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const filteredRecords = useMemo(() => {
    if (props.view === "quarantine") {
      return props.state.records.filter((record) => record.lane === "quarantine" || record.lifecycleStep === "quarantine");
    }
    if (props.view === "redaction") {
      return props.state.records.filter(
        (record) =>
          record.redactionFlags.length > 0 ||
          record.lifecycleStep === "redaction_review" ||
          record.workflowState === "redaction_required" ||
          record.workflowState === "review_rejected"
      );
    }
    if (props.view === "metadata") {
      return props.state.records.filter(
        (record) =>
          record.metadataStatus !== "reviewed" ||
          record.lifecycleStep === "metadata_review" ||
          record.workflowState === "metadata_required"
      );
    }
    if (props.view === "index") {
      return props.state.records;
    }
    return props.state.records;
  }, [props.state.records, props.view]);

  const activeView = vaultViews.find((view) => view.id === props.view) ?? vaultViews[0];
  const jsonExport = useMemo(
    () => exportVaultAuditJson(props.state, props.runtimeVersion, new Date().toISOString()),
    [props.runtimeVersion, props.state]
  );
  const markdownExport = useMemo(
    () => exportVaultAuditMarkdown(props.state, props.runtimeVersion, new Date().toISOString()),
    [props.runtimeVersion, props.state]
  );

  return (
    <section className="tabPanel vaultPanel">
      <PanelHeader title={activeView.label} meta={activeView.meta} />

      <section className="guidePanel" aria-label="Vault guide mode">
        <div>
          <span className="guideEyebrow">Guide mode</span>
          <h3>Plain-English vault guide</h3>
        </div>
        <div className="guideGrid">
          <GuideItem title="What this screen means">
            You are looking at fake metadata rows that model a future private-vault review flow.
          </GuideItem>
          <GuideItem title="What is safe">
            Synthetic titles, fake hashes, fake review notes, and build identity are safe to display and export.
          </GuideItem>
          <GuideItem title="What is blocked">
            Real documents, private paths, uploads, OCR, source text, indexing, and any real-doc gate are blocked in this MVP.
          </GuideItem>
          <GuideItem title="What happens next">
            Review fake redaction, review fake metadata, then mark fake-only eligibility or reject the row.
          </GuideItem>
        </div>
        <button
          aria-expanded={technicalOpen}
          className="button subtle technicalToggle"
          type="button"
          onClick={() => setTechnicalOpen((open) => !open)}
        >
          <ClipboardList size={16} />
          {technicalOpen ? "Hide technical details" : "Show technical details"}
        </button>
      </section>

      <div className="qaCueRail" aria-label="Vault operator QA summary">
        <span>{formatCount(props.state.records.length, "fake metadata row")}</span>
        <span>{formatCount(props.workflowCounts.redaction_required, "redaction review")}</span>
        <span>{formatCount(props.workflowCounts.metadata_required, "metadata review")}</span>
        <span>index still gated</span>
      </div>

      <div className="boundaryGrid" aria-label="private vault boundaries">
        <NoticeBox tone="warning" title="Fake metadata only">
          This scaffold uses synthetic metadata fixtures. It does not read, copy, OCR, summarize, index, upload, or transform files.
        </NoticeBox>
        <NoticeBox tone="danger" title="Private boundary">
          Real-document source mounts and private vault folders stay outside this UI and outside tracked GitHub content.
        </NoticeBox>
        <NoticeBox tone="neutral" title="Index warning">
          Quarantine, redaction review, and metadata review are separate gates. They never imply index approval.
        </NoticeBox>
        <NoticeBox tone="warning" title="Fake redaction labels">
          Redaction categories, reviewer notes, confidence, and eligibility impact are synthetic labels only. They are not real redaction, approval, or indexing.
        </NoticeBox>
      </div>

      <div className="vaultTabs" role="tablist" aria-label="Vault governance surfaces">
        {vaultViews.map((view) => (
          <button
            className={props.view === view.id ? "vaultTab active" : "vaultTab"}
            key={view.id}
            type="button"
            onClick={() => props.setView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>

      {props.view === "vault" && (
        <>
          {technicalOpen ? (
            <>
              <div className="laneGrid" aria-label="vault lane counts">
                {(Object.entries(props.counts) as [VaultLane, number][]).map(([lane, count]) => (
                  <div className="laneTile" key={lane}>
                    <span className={`laneBadge lane-${lane}`}>{laneLabels[lane]}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>

              <div className="workflowGrid" aria-label="workflow state counts">
                {(Object.entries(props.workflowCounts) as [VaultWorkflowState, number][]).map(([state, count]) => (
                  <div className="workflowTile" key={state}>
                    <span>{workflowStateLabels[state]}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>

              <section className="lifecyclePanel" aria-label="lifecycle state machine">
                <h3 className="sectionTitle">
                  <ClipboardList size={14} />
                  Lifecycle State Machine
                </h3>
                <LifecycleRail current="audit" />
              </section>
            </>
          ) : (
            <div className="friendlyVaultSummary" aria-label="simple vault summary">
              <strong>{props.state.records.length} fake metadata rows</strong>
              <span>{props.workflowCounts.redaction_required} redaction review needed</span>
              <span>{props.workflowCounts.metadata_required} metadata review needed</span>
              <span>{props.workflowCounts.eligible_fake_only} fake-only eligible</span>
              <span>{props.workflowCounts.not_indexable} not indexable</span>
              <span>{props.workflowCounts.review_rejected} rejected or blocked</span>
              <span>{props.workflowCounts.quarantine_only} quarantine-only</span>
            </div>
          )}
        </>
      )}

      {props.view === "audit" ? (
        <div className="auditList">
          <section className="auditExportPanel">
            <div>
              <h3>Fake audit export</h3>
              <p>Exports include fake metadata, audit events, build identity, redaction labels, and guard flags only. Private paths, file content, source text, OCR, uploads, and vectors are excluded.</p>
            </div>
            <div className="vaultActions">
              <DownloadLink fileName="kia-stick-fake-vault-audit.json" label="JSON" mimeType="application/json" text={jsonExport} />
              <DownloadLink fileName="kia-stick-fake-vault-audit.md" label="Markdown" mimeType="text/markdown" text={markdownExport} />
            </div>
          </section>
          {props.state.auditLog.map((entry) => (
            <article className="auditEntry" key={entry.id}>
              <div>
                <strong>{entry.action}</strong>
                <p>{entry.note}</p>
              </div>
              <div className="sourceMeta">
                <span className="badge">{entry.recordId}</span>
                <span className="badge">{entry.actor}</span>
                <span className="badge">{new Date(entry.at).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="vaultRecordGrid">
          {filteredRecords.map((record) => (
            <VaultRecordCard key={record.id} onAction={props.onAction} record={record} showTechnical={technicalOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ImportWizardPanel(props: {
  state: ImportWizardState;
  runtimeVersion: RuntimeVersion;
  onAction: (action: ImportWizardAction) => void;
}) {
  const currentCopy = importWizardScreenCopy[props.state.currentStep];
  const currentIndex = importWizardSteps.indexOf(props.state.currentStep);
  const nextAction = importWizardNextAction(props.state.currentStep);
  const jsonExport = useMemo(
    () => exportImportWizardAuditJson(props.state, props.runtimeVersion, new Date().toISOString()),
    [props.runtimeVersion, props.state]
  );
  const markdownExport = useMemo(
    () => exportImportWizardAuditMarkdown(props.state, props.runtimeVersion, new Date().toISOString()),
    [props.runtimeVersion, props.state]
  );

  function runNextAction() {
    if (nextAction === "decide_fake_index") {
      props.onAction({ type: "decide_fake_index", decision: "eligible_fake_only" });
      return;
    }
    props.onAction({ type: nextAction });
  }

  return (
    <section className="tabPanel importWizardPanel">
      <PanelHeader title="Import Wizard" meta="fake UI scaffold only" />

      <section className="guidePanel" aria-label="Import wizard guide">
        <div>
          <span className="guideEyebrow">Fake import wizard</span>
          <h3>No real import path exists</h3>
        </div>
        <div className="guideGrid">
          <GuideItem title="Selection is not import">
            This tab has no file picker, no source-path reader, and no cloud/API key requirement. It uses one synthetic candidate only.
          </GuideItem>
          <GuideItem title="Quarantine is not indexable">
            The quarantine screen is a mock consent gate. It never creates, copies, or indexes files.
          </GuideItem>
          <GuideItem title="Redaction is not approval">
            Fake redaction review only unlocks metadata review. It does not approve indexing.
          </GuideItem>
          <GuideItem title="Approval is not indexing">
            Fake eligibility records a decision only. It does not build embeddings or a vector store.
          </GuideItem>
        </div>
      </section>

      <div className="qaCueRail" aria-label="Import wizard operator QA summary">
        <span>synthetic candidate only</span>
        <span>{props.state.currentStep.replaceAll("_", " ")}</span>
        <span>{props.state.record.indexDecision}</span>
        <span>real actions disabled</span>
      </div>

      <div className="boundaryGrid" aria-label="import wizard boundaries">
        <NoticeBox tone="warning" title="Fake fixtures only">
          Uses fake IDs, fake counts, fake hashes, and fake proof IDs. No real documents, paths, bytes, screenshots, OCR, or uploads.
        </NoticeBox>
        <NoticeBox tone="danger" title="Blocked-action matrix">
          File selection, private-vault inspection, copy-to-quarantine, OCR, indexing, uploads, and vector creation are blocked action checks only.
        </NoticeBox>
        <NoticeBox tone="neutral" title="Proof export safety">
          Audit export contains build identity, fake metadata, fake redaction labels, fake gates, blocked reasons, and guard flags only.
        </NoticeBox>
      </div>

      <ol className="wizardRail" aria-label="import wizard state machine">
        {importWizardSteps.map((step, index) => (
          <li
            className={step === props.state.currentStep ? "current" : index < currentIndex ? "complete" : ""}
            key={step}
          >
            <span>{index + 1}</span>
            {importWizardStepLabels[step]}
          </li>
        ))}
      </ol>

      <section className="wizardScreen" aria-label={currentCopy.title}>
        <div className="wizardScreenHeader">
          <div>
            <span className="sectionKicker">Current screen</span>
            <h3>{currentCopy.title}</h3>
          </div>
          <span className={props.state.record.indexDecision === "eligible_fake_only" ? "statusPill ok" : "statusPill warning"}>
            {props.state.record.indexDecision}
          </span>
        </div>

        <p className="wizardPlainCopy">{currentCopy.plain}</p>
        <p className="blockedReason">
          <AlertTriangle size={14} />
          {currentCopy.stopSign}
        </p>

        <div className="wizardFieldGrid">
          <WizardField label="Fake record" value={props.state.record.id} />
          <WizardField label="Display alias" value={props.state.record.displayName} />
          <WizardField label="Source alias" value={props.state.record.fakeSourceAlias} />
          <WizardField label="Scope" value={props.state.record.scopeMode} />
          <WizardField label="Item count" value={String(props.state.record.itemCount)} />
          <WizardField label="Fake hash" value={props.state.record.fakeHash} />
          <WizardField label="Proof ID" value={props.state.record.proofId} />
          <WizardField label="Redaction outcome" value={props.state.record.redactionReviewOutcome} />
          <WizardField label="Eligibility impact" value={props.state.record.redactionEligibilityImpact} />
          <WizardField label="Export safety" value="synthetic metadata only" />
          <WizardField label="Real actions" value={props.state.realActionsDisabled ? "disabled" : "enabled"} />
        </div>

        <p className="indexReason">Fake redaction metadata is advisory fixture data only; it is not real redaction, approval, or indexing.</p>
        <RedactionMetadataList metadata={props.state.record.redactionMetadata} />

        <ul className="flagList" aria-label="fake redaction categories">
          {props.state.record.redactionFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>

        {props.state.lastBlockedReason && (
          <p className="blockedReason">
            <AlertTriangle size={14} />
            {props.state.lastBlockedReason}
          </p>
        )}

        <div className="vaultActions">
          <button
            className="button primary"
            type="button"
            onClick={runNextAction}
          >
            <CheckCircle2 size={16} />
            {importWizardNextActionLabel(props.state.currentStep)}
          </button>
          <button
            className="button subtle"
            type="button"
            onClick={() =>
              props.onAction({
                type: "block_future_real_action",
                reason: "Future real file picker is blocked. This fake scaffold uses synthetic metadata only.",
              })
            }
          >
            <AlertTriangle size={16} />
            Verify file picker blocked
          </button>
          <button
            className="button subtle"
            type="button"
            onClick={() => props.onAction({ type: "jump_to_step", targetStep: "index_eligibility" })}
          >
            <AlertTriangle size={16} />
            Try skip to index
          </button>
          <button className="button subtle" type="button" onClick={() => props.onAction({ type: "reset_fake_wizard" })}>
            <RotateCcw size={16} />
            Reset fake wizard
          </button>
        </div>
      </section>

      <section className="auditExportPanel">
        <div>
          <h3>Fake import proof</h3>
          <p>Exports include fake wizard state, fake redaction metadata labels, fake audit events, and build identity only. They exclude private paths, snippets, OCR text, real identifiers, file content, uploads, embeddings, and indexes.</p>
        </div>
        <div className="vaultActions">
          <DownloadLink fileName="kia-stick-fake-import-wizard-audit.json" label="JSON" mimeType="application/json" text={jsonExport} />
          <DownloadLink fileName="kia-stick-fake-import-wizard-audit.md" label="Markdown" mimeType="text/markdown" text={markdownExport} />
        </div>
      </section>

      <div className="auditList" aria-label="fake import wizard audit log">
        {props.state.auditLog.slice(0, 6).map((entry) => (
          <article className="auditEntry" key={entry.id}>
            <div>
              <strong>{entry.action}</strong>
              <p>{entry.note}</p>
            </div>
            <div className="sourceMeta">
              <span className="badge">{entry.step}</span>
              <span className="badge">{entry.actor}</span>
              <span className="badge">{new Date(entry.at).toLocaleString()}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideItem(props: { title: string; children: React.ReactNode }) {
  return (
    <article className="guideItem">
      <strong>{props.title}</strong>
      <p>{props.children}</p>
    </article>
  );
}

function NoticeBox(props: { tone: "warning" | "danger" | "neutral"; title: string; children: React.ReactNode }) {
  return (
    <section className={`noticeBox ${props.tone}`}>
      <h3>{props.title}</h3>
      <p>{props.children}</p>
    </section>
  );
}

function LifecycleRail({ current }: { current: LifecycleStep }) {
  const currentIndex = lifecycleSteps.indexOf(current);
  return (
    <ol className="lifecycleRail">
      {lifecycleSteps.map((step, index) => (
        <li className={index <= currentIndex ? "complete" : ""} key={step}>
          {lifecycleLabels[step]}
        </li>
      ))}
    </ol>
  );
}

function VaultRecordCard({
  record,
  onAction,
  showTechnical,
}: {
  record: FakeVaultRecord;
  onAction: (action: VaultAction) => void;
  showTechnical: boolean;
}) {
  const canAdvance = record.lifecycleStep !== "audit";
  const nextStep = nextLifecycleStepLabel(record.lifecycleStep);
  const workflowTone = record.workflowState === "eligible_fake_only" ? "ok" : "warning";

  return (
    <article className="vaultRecordCard">
      <div className="vaultCardHeader">
        <div>
          <span className={`laneBadge lane-${record.lane}`}>{laneLabels[record.lane]}</span>
          <h3>{record.title}</h3>
        </div>
        <span className={`statusPill ${workflowTone}`}>
          {record.workflowState}
        </span>
      </div>

      <p>{record.fakeSummary}</p>

      <div className="friendlyStatusGrid">
        <VaultField label="Plain status" value={friendlyWorkflowLabel(record.workflowState)} />
        <VaultField label="Redaction" value={friendlyRedactionLabel(record)} />
        <VaultField label="Index gate" value={friendlyIndexGateLabel(record)} />
        <VaultField label="Safe?" value={record.githubSafe ? "safe fake metadata" : "blocked"} />
        <VaultField label="Audit export" value={record.githubSafe ? "metadata and guard flags only" : "export blocked"} />
        <VaultField label="Next step" value={friendlyNextStep(record)} />
      </div>

      {showTechnical && (
        <>
          <LifecycleRail current={record.lifecycleStep} />

          <div className="vaultFieldGrid">
            <VaultField label="Lifecycle" value={lifecycleLabels[record.lifecycleStep]} />
            <VaultField label="Authority" value={record.authorityLevel} />
            <VaultField label="Source status" value={record.sourceStatus} />
            <VaultField label="Sensitivity" value={record.sensitivity} />
            <VaultField label="Redaction" value={record.redactionStatus} />
            <VaultField label="Redaction outcome" value={record.redactionReviewOutcome} />
            <VaultField label="Eligibility impact" value={record.redactionEligibilityImpact} />
            <VaultField label="Metadata" value={record.metadataStatus} />
            <VaultField label="Workflow state" value={record.workflowState} />
            <VaultField label="Reviewer" value={record.reviewer} />
            <VaultField label="Fake hash" value={record.fakeHash} />
          </div>

          <div className="sourceMeta">
            <span className="badge green">GitHub-safe metadata</span>
            <span className="badge">ref: {record.fakeSourceRef}</span>
            <span className="badge">{record.fakeProvenance}</span>
          </div>

          {record.redactionFlags.length > 0 && (
            <ul className="flagList">
              {record.redactionFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          )}

          <RedactionMetadataList metadata={record.redactionMetadata} />
        </>
      )}

      <p className="indexReason">{record.indexReason}</p>

      {record.lastBlockedReason && (
        <p className="blockedReason">
          <AlertTriangle size={14} />
          {record.lastBlockedReason}
        </p>
      )}

      <div className="vaultActions">
        <button
          className="button primary"
          disabled={!canAdvance}
          type="button"
          onClick={() => onAction({ type: "advance", recordId: record.id })}
        >
          <CheckCircle2 size={16} />
          Advance to {nextStep}
        </button>
        <button
          className="button subtle"
          type="button"
          onClick={() => onAction({ type: "approve_redaction", recordId: record.id })}
        >
          <ShieldCheck size={16} />
          Redaction OK
        </button>
        <button
          className="button subtle"
          type="button"
          onClick={() => onAction({ type: "approve_metadata", recordId: record.id })}
        >
          <ClipboardList size={16} />
          Metadata OK
        </button>
        <button
          className="button subtle"
          type="button"
          onClick={() =>
            onAction({
              type: "reject_review",
              recordId: record.id,
              reason: "Manual fake review rejected this metadata row; it remains not indexable.",
            })
          }
        >
          <AlertTriangle size={16} />
          Reject review
        </button>
        <button
          className="button subtle"
          type="button"
          onClick={() =>
            onAction({
              type: "block_index",
              recordId: record.id,
              reason: "Manual fake review marked this item not indexable; quarantine, redaction, and metadata review do not approve indexing.",
            })
          }
        >
          <AlertTriangle size={16} />
          Not indexable
        </button>
      </div>
    </article>
  );
}

function RedactionMetadataList({ metadata }: { metadata: FakeVaultRecord["redactionMetadata"] }) {
  if (metadata.length === 0) return <p className="emptyState">No fake redaction metadata labels.</p>;
  return (
    <ul className="flagList" aria-label="fake redaction metadata details">
      {metadata.map((item) => (
        <li key={`${item.category}-${item.safeExampleLabel}`}>
          {item.safeExampleLabel}: {item.category}, {item.severity}, confidence {Math.round(item.confidence * 100)}%, impact {item.eligibilityImpact}
        </li>
      ))}
    </ul>
  );
}

function friendlyWorkflowLabel(state: VaultWorkflowState): string {
  if (state === "eligible_fake_only") return "Fake-only eligible";
  if (state === "review_rejected") return "Rejected or blocked";
  if (state === "metadata_required") return "Needs metadata review";
  if (state === "redaction_required") return "Needs redaction review";
  if (state === "quarantine_only") return "Quarantine only";
  return "Not indexable";
}

function friendlyRedactionLabel(record: FakeVaultRecord): string {
  if (record.redactionStatus === "approved_redacted") return `approved fake redaction (${record.redactionReviewOutcome})`;
  if (record.redactionStatus === "review_needed") return `review needed (${record.redactionReviewOutcome})`;
  if (record.redactionStatus === "detection_flagged") return "fake detection flagged";
  if (record.redactionStatus === "restricted") return "restricted fake metadata";
  if (record.redactionStatus === "rejected") return "redaction rejected";
  return "not started";
}

function friendlyIndexGateLabel(record: FakeVaultRecord): string {
  if (record.workflowState === "eligible_fake_only") return "eligible fake metadata only";
  if (record.workflowState === "not_indexable" || record.workflowState === "review_rejected") return "not indexable";
  if (record.workflowState === "metadata_required") return "metadata review before index";
  if (record.workflowState === "redaction_required") return "redaction review before index";
  return "quarantine is not index";
}

function friendlyNextStep(record: FakeVaultRecord): string {
  if (record.workflowState === "eligible_fake_only") return "Audit or export fake metadata.";
  if (record.workflowState === "review_rejected") return "Keep blocked unless a new fake review starts.";
  if (record.workflowState === "metadata_required") return "Approve metadata or reject review.";
  if (record.workflowState === "redaction_required") return "Approve redaction or reject review.";
  if (record.workflowState === "quarantine_only") return "Move through hash/provenance before review.";
  return "Keep out of index.";
}

function nextLifecycleStepLabel(step: LifecycleStep): string {
  const currentIndex = lifecycleSteps.indexOf(step);
  const nextStep = lifecycleSteps[Math.min(currentIndex + 1, lifecycleSteps.length - 1)];
  return lifecycleLabels[nextStep];
}

function DownloadLink(props: { fileName: string; label: string; mimeType: string; text: string }) {
  const href = useMemo(() => {
    if (typeof window === "undefined") return "";
    return URL.createObjectURL(new Blob([props.text], { type: props.mimeType }));
  }, [props.mimeType, props.text]);

  useEffect(() => {
    return () => {
      if (href) URL.revokeObjectURL(href);
    };
  }, [href]);

  return (
    <a className="button subtle" href={href} download={props.fileName}>
      <Download size={16} />
      {props.label}
    </a>
  );
}

function VaultField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WizardField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function UserMessageBubble({ message, turnLabel }: { message: UserMessage; turnLabel?: string }) {
  return (
    <div className="messageRow userMessage">
      <div className="messageBubble userBubble">
        <div className="messageMeta">
          <span className="messageLabel">You</span>
          {turnLabel && <span>{turnLabel}</span>}
        </div>
        <p>{message.content}</p>
      </div>
    </div>
  );
}

export function AssistantMessageCard({
  message,
  turnLabel,
  onRetry,
  onSave,
  onCitationNavigate = () => undefined,
  onSubmitCbaSuggestion,
}: {
  message: AssistantMessage;
  turnLabel?: string;
  onRetry: () => void;
  onSave: () => void;
  onCitationNavigate?: (citation: Citation) => void;
  onSubmitCbaSuggestion?: (question: string) => void;
}) {
  const [citationsOpen, setCitationsOpen] = useState(false);
  const [packetOpen, setPacketOpen] = useState(false);
  const answer = message.answer;
  const hasNonCurrentCbaCitation = answer.citations.some(
    (citation) => citation.publicSourceType === "cba_contract" && citation.citationVerificationState !== "verified_current"
  );
  const saveDisabled = answer.noAnswer || hasNonCurrentCbaCitation;

  if (message.status === "loading") {
    return (
      <div className="messageRow assistantMessage" aria-live="polite">
        <div className="messageBubble assistantBubble thinkingBubble">
          <div className="messageMeta">
            <span className="messageLabel">KIA Stick</span>
            {turnLabel && <span>{turnLabel}</span>}
          </div>
          <p>{message.modeScopeDetail.sourceMode === "cba" ? "Checking the exact official CBA cache..." : answer.answerKind === "public" ? "Checking the selected public source..." : "Checking the fake source trail..."}</p>
        </div>
      </div>
    );
  }

  if (message.status === "failed") {
    return (
      <div className="messageRow assistantMessage" aria-live="assertive">
        <div className="messageBubble assistantBubble">
          <div className="answerHeader">
            <div>
              <div className="messageMeta">
                <span className="messageLabel">KIA Stick</span>
                {turnLabel && <span>{turnLabel}</span>}
              </div>
              <h2>Generation failed</h2>
            </div>
            <span className="statusPill warning">Retry available</span>
          </div>
          <p>{message.error ?? "The local deterministic response was not generated."}</p>
          <div className="compactActions">
            <button className="button primary" type="button" onClick={onRetry} aria-label="Retry response">
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="messageRow assistantMessage">
        <div className="messageBubble assistantBubble">
          <div className="answerHeader">
            <div>
              <div className="messageMeta">
                <span className="messageLabel">KIA Stick</span>
                {turnLabel && <span>{turnLabel}</span>}
              </div>
              <h2>{answer.publicSourceRole === "cba_contract" ? "Official APWU-USPS CBA" : answer.publicSourceRole === "cross_source" ? "CBA and NLRB authority comparison" : answer.publicSourceRole === "safe_no_answer" ? "Safe source-router no-answer" : answer.answerKind === "public" ? "NLRB Weingarten public pilot" : intentLabels[answer.intent]}</h2>
            </div>
            <span className={answer.noAnswer ? "statusPill warning" : "statusPill ok"}>
              {answer.noAnswer
                ? answer.answerKind === "public" ? "Unsaved no-answer; public source unsupported" : "Unsaved no-answer; context-only trail"
                : `${answer.citations.length} citations`}
            </span>
          </div>

          <div className="sourceMeta" aria-label="Answer lane identity">
            <span className="badge">Selected lane: {message.modeScopeDetail.sourceModePolicy ?? "legacy"}</span>
            <span className={answer.answerKind === "public" ? "badge green" : "badge"}>
              Actual lane: {answer.publicSourceRole === "cba_contract" || answer.publicSourceRole === "cross_source" ? "public_cba" : answer.publicSourceRole === "nlrb_guidance" ? "public_nlrb" : answer.publicSourceRole === "safe_no_answer" ? "safe_no_answer" : answer.answerKind === "public" ? "public_nlrb" : "fake"}
            </span>
            <span className="badge">Provider: {answer.version.provider}</span>
            <span className="badge">Prompt: {answer.version.promptVersion}</span>
          </div>

          <div className="compactAnswer">
            <section>
              <span>Short answer</span>
              <p className="shortAnswer">{answer.shortAnswer}</p>
            </section>
            <section>
              <span>Confidence / authority</span>
              <strong>{authoritySummary(answer)}</strong>
              <p>{answer.modeNote}</p>
            </section>
            <section>
              <span>What to do next</span>
              <strong>{answer.followUps[0] ?? answer.evidenceChecklist[0] ?? "Review the selected source trail."}</strong>
              <p>{answer.missingFacts[0] ?? "Keep the cited source metadata attached to the answer."}</p>
            </section>
          </div>

          {answer.contextNote && <p className="contextNote">{answer.contextNote}</p>}

          {answer.suggestedQuestions && answer.suggestedQuestions.length > 0 && onSubmitCbaSuggestion && (
            <div className="compactActions" aria-label="CBA retrieval suggestions">
              {answer.suggestedQuestions.map((suggestion) => (
                <button className="button subtle" type="button" key={suggestion} onClick={() => onSubmitCbaSuggestion(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="compactActions">
            <button
              aria-expanded={packetOpen}
              className="button primary"
              type="button"
              onClick={() => setPacketOpen((open) => !open)}
            >
              <ClipboardList size={16} />
              {packetOpen ? "Hide full packet" : "Show full packet"}
            </button>
            <button
              className="button subtle"
              type="button"
              onClick={onSave}
              aria-label={saveDisabled ? "Citation-unverified or no-answer responses cannot be saved" : "Save this answer"}
              disabled={saveDisabled}
            >
              <Save size={16} />
              {answer.noAnswer ? "No answer to save" : hasNonCurrentCbaCitation ? "Citation verification required" : "Save to Saved"}
            </button>
            {hasNonCurrentCbaCitation && <p className="emptyState">CBA citations must verify against the current bounded source before saving.</p>}
            {answer.citations.length === 0 ? (
              <p className="emptyState">
                {answer.answerKind === "public"
                  ? "No Saved record is created for no-answer responses. Public source prompt, provider, and lane metadata remain visible."
                  : "No Saved record is created for no-answer responses. Context-only fake sources can still be reviewed in the full packet. Prompt and provider metadata remain visible there."}
              </p>
            ) : (
              <button
                aria-expanded={citationsOpen}
                className="button subtle citationToggle"
                type="button"
                onClick={() => setCitationsOpen((open) => !open)}
              >
                {citationsOpen ? "Hide citations" : `Show citations (${answer.citations.length})`}
              </button>
            )}
          </div>

          {citationsOpen && (
            <ol className="citationCards">
              {answer.citations.map((citation) => (
                <li key={citation.id}>
                  {citation.sourceKind === "public" ? (
                    <button className="citationAnchorButton" type="button" onClick={() => onCitationNavigate(citation)}>
                      {citationLabel(citation)}
                    </button>
                  ) : citationLabel(citation)}
                </li>
              ))}
              {answer.answerKind === "public" && (
                <li className="officialCitationLink">
                  <a href={answer.publicSourceRole === "cba_contract" || answer.publicSourceRole === "cross_source" ? CBA_SOURCE_PDF_URL : PUBLIC_SOURCE_URL} target="_blank" rel="noreferrer">
                    {answer.publicSourceRole === "cba_contract" || answer.publicSourceRole === "cross_source" ? "Open the separate official CBA PDF" : "Open the separate official NLRB source"}
                  </a>
                </li>
              )}
            </ol>
          )}

          {packetOpen && <FullPacket answer={answer} />}

          <div className="footerLine">
            {answer.footer} | AnswerLane:{answer.answerKind === "public" ? "public" : "fake"} | Prompt:{answer.version.promptVersion} | Provider:{answer.version.provider}
          </div>
        </div>
      </div>
  );
}

function authoritySummary(answer: AnswerResult): string {
  if (answer.answerKind === "public") {
    if (answer.publicSourceRole === "cba_contract") {
      return answer.noAnswer
        ? "No case outcome established; relevant CBA passages may be shown for review."
        : "Official final controlling contract language, with coverage and fact-specific scope caveats.";
    }
    if (answer.publicSourceRole === "cross_source") return "Separate CBA controlling-contract and NLRB general-guidance roles; no automatic override established.";
    if (answer.publicSourceRole === "safe_no_answer") return "No approved deterministic source lane supports this claim.";
    return answer.noAnswer
      ? "No supported answer from the one allowlisted public source."
      : "Official general NLRB guidance. USPS controlling applicability is unverified.";
  }
  if (answer.noAnswer) return "Low confidence. No controlling fake source found.";
  const controllingCount = answer.sourceGroups
    .flatMap((group) => group.docs)
    .filter((doc) => doc.class === "controlling_contract_language" || doc.class === "local_controlling_source").length;
  if (controllingCount > 0) {
    return `High fake-source confidence. ${controllingCount} controlling/local source${controllingCount === 1 ? "" : "s"} matched.`;
  }
  return `Medium fake-source confidence. ${answer.citations.length} citable source${answer.citations.length === 1 ? "" : "s"} matched.`;
}

export function FullPacket({ answer }: { answer: AnswerResult }) {
  const sourceCount = answer.sourceGroups.reduce((total, group) => total + group.docs.length, 0);
  const conflicts = answer.conflicts.length > 0 ? answer.conflicts : [answer.answerKind === "public" ? "No public-source conflict recorded." : "No visible fake-source conflicts."];

  return (
    <div className="fullPacket">
      <DetailDisclosure icon={<ShieldCheck size={14} />} title={`Show authority stack (${sourceCount})`}>
        {answer.sourceGroups.length === 0 && (
          <p className="emptyState">
            {answer.answerKind === "public"
              ? "Public citations are shown as exact source, section, and paragraph anchors; no fake claim is blended into this answer."
              : "No fake sources matched."}
          </p>
        )}
        {answer.sourceGroups.map((group) => (
          <section className="authorityGroup" key={group.bucket}>
            <h4>{group.label}</h4>
            <div className="authorityGrid">
              {group.docs.map((doc) => (
                <article className="authorityCard" key={doc.id}>
                  <strong>{doc.title}</strong>
                  <p>{doc.excerpt}</p>
                  <div className="sourceMeta">
                    <span className="badge">{sourceClassLabels[doc.class]}</span>
                    <span className={doc.citable ? "badge green" : "badge red"}>{doc.citable ? "citable" : "not citable"}</span>
                    <span className="badge">{doc.article}</span>
                    <span className="badge">{doc.page}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </DetailDisclosure>

      <div className="answerGrid">
        <ListBlock title={`Show conflicts (${conflicts.length})`} items={conflicts} icon="conflict" />
        <ListBlock title={`Show evidence checklist (${answer.evidenceChecklist.length})`} items={answer.evidenceChecklist} icon="checklist" />
        <ListBlock title={`Show missing facts (${answer.missingFacts.length})`} items={answer.missingFacts} icon="facts" />
        <ListBlock title={`Show follow-ups (${answer.followUps.length})`} items={answer.followUps} icon="followups" />
      </div>
    </div>
  );
}

function DetailDisclosure({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <details className="packetDisclosure">
      <summary>
        {icon}
        {title}
      </summary>
      <div className="packetDisclosureBody">{children}</div>
    </details>
  );
}

function ListBlock({ title, items, icon }: { title: string; items: string[]; icon: "conflict" | "checklist" | "facts" | "followups" }) {
  const Icon = icon === "checklist" ? CheckCircle2 : icon === "facts" ? FileSearch : icon === "conflict" ? AlertTriangle : ClipboardList;
  return (
    <DetailDisclosure icon={<Icon size={14} />} title={title}>
      <ul className="plainList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </DetailDisclosure>
  );
}
