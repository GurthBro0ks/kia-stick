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
  Save,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { buildAnswer, cannedQuestions, type AnswerResult } from "@/lib/answerGovernor";
import {
  createSavedAnswerRecord,
  upsertSavedAnswer,
  type SaveAnswerStatus,
  type SavedAnswer,
} from "@/lib/savedAnswers";
import {
  bucketForClass,
  citationLabel,
  corpus,
  sourceClassLabels,
  type Detail,
  type Mode,
  type Scope,
} from "@/lib/sourceModel";
import {
  applyVaultAction,
  createInitialVaultState,
  exportVaultAuditJson,
  exportVaultAuditMarkdown,
  laneCounts,
  laneLabels,
  lifecycleLabels,
  lifecycleSteps,
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

type Tab = "chat" | "sources" | "saved" | "upload" | "vault" | "settings";
type VaultView = "vault" | "quarantine" | "redaction" | "metadata" | "index" | "audit";

interface QuarantineItem {
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
const quarantineKey = "kia-stick.quarantine.v0.1";
const vaultKey = "kia-stick.vault-state.v0.4";

const vaultViews: { id: VaultView; label: string; meta: string }[] = [
  { id: "vault", label: "Vault", meta: "fake lane overview" },
  { id: "quarantine", label: "Quarantine", meta: "quarantine-only" },
  { id: "redaction", label: "Redaction Review", meta: "required before metadata" },
  { id: "metadata", label: "Metadata Review", meta: "required before eligibility" },
  { id: "index", label: "Index Eligibility", meta: "eligible fake only" },
  { id: "audit", label: "Audit Log", meta: "safe fake export" },
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

function saveStatusText(status: SaveAnswerStatus): string {
  if (status === "created") return "Saved this answer.";
  if (status === "replaced") return "Updated the saved answer with newer details.";
  return "Already saved. No new data.";
}

export function KiaStickApp({ runtimeVersion = clientVersion }: { runtimeVersion?: RuntimeVersion }) {
  const [tab, setTab] = useState<Tab>("chat");
  const [mode, setMode] = useState<Mode>("Strict Research");
  const [scope, setScope] = useState<Scope>("All Fake");
  const [detail, setDetail] = useState<Detail>("Detailed");
  const [question, setQuestion] = useState(cannedQuestions[0]);
  const [answer, setAnswer] = useState<AnswerResult>(() =>
    buildAnswer(cannedQuestions[0], {
      mode: "Strict Research",
      scope: "All Fake",
      detail: "Detailed",
      runtimeVersion,
    })
  );
  const [saved, setSaved] = useState<SavedAnswer[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineItem[]>([]);
  const [vaultView, setVaultView] = useState<VaultView>("vault");
  const [vaultState, setVaultState] = useState<VaultState>(() => createInitialVaultState());
  const [fakeOnlyConfirmed, setFakeOnlyConfirmed] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ status: SaveAnswerStatus; text: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSaved(loadJson<SavedAnswer[]>(savedKey, []));
    setQuarantine(loadJson<QuarantineItem[]>(quarantineKey, []));
    setVaultState(loadJson<VaultState>(vaultKey, createInitialVaultState()));
    setHydrated(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(savedKey, JSON.stringify(saved));
  }, [hydrated, saved]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(quarantineKey, JSON.stringify(quarantine));
  }, [hydrated, quarantine]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(vaultKey, JSON.stringify(vaultState));
  }, [hydrated, vaultState]);

  const sourceBuckets = useMemo(() => {
    return corpus.sourceClasses.map((sourceClass) => ({
      sourceClass,
      docs: corpus.docs.filter((doc) => doc.class === sourceClass),
    }));
  }, []);

  const vaultCounts = useMemo(() => laneCounts(vaultState.records), [vaultState.records]);
  const workflowCounts = useMemo(() => workflowStateCounts(vaultState.records), [vaultState.records]);

  function runAnswer(nextQuestion = question) {
    const nextAnswer = buildAnswer(nextQuestion, { mode, scope, detail, runtimeVersion });
    setQuestion(nextQuestion);
    setAnswer(nextAnswer);
    setSaveNotice(null);
    setTab("chat");
  }

  function saveAnswer() {
    const record = createSavedAnswerRecord({
      answer,
      mode,
      scope,
      detail,
      timestamp: new Date().toISOString(),
    });
    const result = upsertSavedAnswer(saved, record);
    setSaved(result.saved);
    setSaveNotice({ status: result.status, text: saveStatusText(result.status) });
  }

  function queueUpload(fileList: FileList | null) {
    if (!fakeOnlyConfirmed || !fileList) return;
    const items: QuarantineItem[] = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      review: "queued_fake_review",
      privacy: "local_browser_only",
      timestamp: new Date().toISOString(),
    }));
    setQuarantine((current) => [...items, ...current].slice(0, 30));
  }

  function runVaultAction(action: VaultAction) {
    setVaultState((current) => applyVaultAction(current, { ...action, now: new Date().toISOString() }));
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
        <span>Fake sample mode only. Real APWU/USPS/member/local docs stay out of this app.</span>
      </div>

      <main className={tab === "chat" ? "mainArea chatMain" : "mainArea"}>
        {tab === "chat" && (
          <>
            <section className="chatComposer" aria-label="Ask KIA Stick">
              <div className="composerHeader">
                <div>
                  <span className="sectionKicker">Research mode</span>
                  <h2>Ask with citations first</h2>
                </div>
                <span className={answer.noAnswer ? "statusPill warning" : "statusPill ok"}>
                  {answer.noAnswer ? "No controlling hit" : "Cited answer"}
                </span>
              </div>

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

              <div className="promptRail" aria-label="fake test prompts">
                {cannedQuestions.map((prompt) => (
                  <button className="promptChip" key={prompt} type="button" onClick={() => runAnswer(prompt)}>
                    {prompt}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>

              <div className="askBox">
                <textarea
                  aria-label="Question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <div className="chatActions">
                  <button className="button primary" type="button" onClick={() => runAnswer()}>
                    <MessageSquareText size={17} />
                    Answer
                  </button>
                  <button className="button iconOnly" type="button" onClick={saveAnswer} title="Save answer" aria-label="Save answer">
                    <Save size={17} />
                  </button>
                </div>
                {saveNotice && (
                  <div className={`saveNotice ${saveNotice.status === "duplicate" ? "warning" : "ok"}`} role="status">
                    {saveNotice.text}
                  </div>
                )}
              </div>
            </section>

            <AnswerPanel answer={answer} />
          </>
        )}

        {tab === "sources" && (
          <section className="tabPanel">
            <PanelHeader title="Sources" meta={`${corpus.docs.length} fake docs`} />
            <div className="sourceCards">
              {sourceBuckets.map(({ sourceClass, docs }) => (
                <article className="sourceCard" key={sourceClass}>
                  <div>
                    <h3>{sourceClassLabels[sourceClass]}</h3>
                    <p>{docs.length} source{docs.length === 1 ? "" : "s"} · bucket {bucketForClass(sourceClass)}</p>
                  </div>
                  <div className="sourceMeta">
                    {docs.map((doc) => (
                      <span className={doc.citable ? "badge green" : "badge red"} key={doc.id}>
                        {doc.citable ? "citable" : "not citable"} · {doc.page}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "saved" && (
          <section className="tabPanel">
            <PanelHeader title="Saved" meta={`${saved.length} stored locally`} />
            <div className="sourceCards">
              {saved.length === 0 && <p className="emptyState">No saved answers yet.</p>}
              {saved.map((item) => (
                <article className="savedCard" key={item.id}>
                  <div className="savedHeader">
                    <h3>{item.question}</h3>
                    <button
                      className="button iconOnly subtle"
                      type="button"
                      title="Delete saved answer"
                      aria-label="Delete saved answer"
                      onClick={() => setSaved((current) => current.filter((savedItem) => savedItem.id !== item.id))}
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                  <p>{item.answer.split("\n\n")[0]}</p>
                  <div className="sourceMeta">
                    <span className="badge">{item.mode}</span>
                    <span className="badge">{item.scope}</span>
                    <span className="badge">{item.detail}</span>
                    <span className="badge">{item.provider}</span>
                    <span className="badge">{savedBuildLabel(item)}</span>
                    <span className="badge">{item.citations.length} citations</span>
                    <span className="badge">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "upload" && (
          <section className="tabPanel">
            <PanelHeader title="Upload" meta="fake metadata quarantine only" />
            <div className="uploadPanel">
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={fakeOnlyConfirmed}
                  onChange={(event) => setFakeOnlyConfirmed(event.target.checked)}
                />
                Fake sample only
              </label>
              <label className="fieldLabel">
                Fake sample metadata, never content
                <input
                  className="fileInput"
                  type="file"
                  multiple
                  accept=".md,.txt,.json"
                  disabled={!fakeOnlyConfirmed}
                  onChange={(event) => queueUpload(event.target.files)}
                />
              </label>
              <div className="sourceCards">
                {quarantine.length === 0 && <p className="emptyState">No queued fake samples.</p>}
                {quarantine.map((item) => (
                  <article className="uploadRow" key={item.id}>
                    <p>
                      <strong>{item.name}</strong> · {item.size} bytes
                    </p>
                    <div className="sourceMeta">
                      <span className="badge">{item.review}</span>
                      <span className="badge red">not_indexable</span>
                      <span className="badge">{item.privacy}</span>
                      <span className="badge">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
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

        {tab === "settings" && (
          <section className="tabPanel settingsPanel">
            <PanelHeader title="Settings" meta={<a href="/version">Version page</a>} />
            <dl className="settingsGrid">
              <dt>Display</dt>
              <dd>{runtimeVersion.displayVersion}</dd>
              <dt>Product</dt>
              <dd>{runtimeVersion.productVersion}</dd>
              <dt>Channel</dt>
              <dd>{runtimeVersion.channel}</dd>
              <dt>Build Date</dt>
              <dd>{runtimeVersion.buildDate}</dd>
              <dt>Git SHA</dt>
              <dd>{runtimeVersion.gitSha}</dd>
              <dt>Corpus</dt>
              <dd>{runtimeVersion.corpusVersion}</dd>
              <dt>Index</dt>
              <dd>{runtimeVersion.indexVersion}</dd>
              <dt>Prompt</dt>
              <dd>{runtimeVersion.promptVersion}</dd>
              <dt>Provider</dt>
              <dd>{runtimeVersion.provider}</dd>
              <dt>Cloud</dt>
              <dd>disabled</dd>
              <dt>Real DB</dt>
              <dd>not touched</dd>
            </dl>
          </section>
        )}
      </main>

      <nav className="bottomNav" aria-label="KIA Stick navigation">
        <NavButton active={tab === "chat"} label="Chat" onClick={() => setTab("chat")} icon={<MessageSquareText size={20} />} />
        <NavButton active={tab === "sources"} label="Sources" onClick={() => setTab("sources")} icon={<BookOpen size={20} />} />
        <NavButton active={tab === "saved"} label="Saved" onClick={() => setTab("saved")} icon={<Heart size={20} />} />
        <NavButton active={tab === "upload"} label="Upload" onClick={() => setTab("upload")} icon={<Upload size={20} />} />
        <NavButton active={tab === "vault"} label="Vault" onClick={() => setTab("vault")} icon={<Database size={20} />} />
        <NavButton active={tab === "settings"} label="Settings" onClick={() => setTab("settings")} icon={<Settings size={20} />} />
      </nav>
    </div>
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
            Real documents, private paths, uploads, OCR, source text, and indexing are blocked in this MVP.
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

      <div className="boundaryGrid" aria-label="private vault boundaries">
        <NoticeBox tone="warning" title="Fake metadata only">
          This scaffold uses synthetic metadata fixtures. It does not read, copy, OCR, summarize, index, upload, or transform files.
        </NoticeBox>
        <NoticeBox tone="danger" title="Private boundary">
          `/media/mint/SHARED/APWU` and `~/kia-stick-private-vault` stay outside this UI and outside tracked GitHub content.
        </NoticeBox>
        <NoticeBox tone="neutral" title="Index warning">
          Quarantine, redaction review, and metadata review are separate gates. They never imply index approval.
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
              <span>{props.workflowCounts.eligible_fake_only} fake-only eligible</span>
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
              <p>Exports include fake metadata, audit events, and build identity only. Private paths and file content are excluded.</p>
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
        <VaultField label="Safe?" value={record.githubSafe ? "safe fake metadata" : "blocked"} />
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

function friendlyWorkflowLabel(state: VaultWorkflowState): string {
  if (state === "eligible_fake_only") return "Fake-only eligible";
  if (state === "review_rejected") return "Rejected or blocked";
  if (state === "metadata_required") return "Needs metadata review";
  if (state === "redaction_required") return "Needs redaction review";
  if (state === "quarantine_only") return "Quarantine only";
  return "Not indexable";
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

function AnswerPanel({ answer }: { answer: AnswerResult }) {
  const [citationsOpen, setCitationsOpen] = useState(false);

  return (
    <section className="chatThread" aria-label="Current answer">
      <div className="messageRow userMessage">
        <div className="messageBubble userBubble">
          <span className="messageLabel">You</span>
          <p>{answer.question}</p>
        </div>
      </div>

      <div className="messageRow assistantMessage">
        <div className="messageBubble assistantBubble">
          <div className="answerHeader">
            <div>
              <span className="messageLabel">KIA Stick</span>
              <h2>{intentLabels[answer.intent]}</h2>
            </div>
            <span className={answer.noAnswer ? "statusPill warning" : "statusPill ok"}>
              {answer.noAnswer ? "Best guess disabled" : `${answer.citations.length} citations`}
            </span>
          </div>

          <p className="shortAnswer">{answer.shortAnswer}</p>
          <p className="modeNote">{answer.modeNote}</p>

          <div className="answerSection">
            <h3 className="sectionTitle">
              <ShieldCheck size={14} />
              Authority Stack
            </h3>
            {answer.sourceGroups.length === 0 && <p className="emptyState">No fake sources matched.</p>}
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
          </div>

          <div className="answerGrid">
            <ListBlock title="Conflicts" items={answer.conflicts.length > 0 ? answer.conflicts : ["No visible fake-source conflicts."]} icon="conflict" />
            <ListBlock title="Evidence Checklist" items={answer.evidenceChecklist} icon="checklist" />
            <ListBlock title="Missing Facts" items={answer.missingFacts} icon="facts" />
            <ListBlock title="Follow-Ups" items={answer.followUps} icon="followups" />
          </div>

          <div className="answerSection">
            <h3 className="sectionTitle">
              <Database size={14} />
              Citations
            </h3>
            {answer.citations.length === 0 ? (
              <p className="emptyState">No citable fake sources.</p>
            ) : (
              <>
                <button
                  aria-expanded={citationsOpen}
                  className="button subtle citationToggle"
                  type="button"
                  onClick={() => setCitationsOpen((open) => !open)}
                >
                  {citationsOpen ? "Hide citations" : `Show citations (${answer.citations.length})`}
                </button>
                {citationsOpen && (
                  <ol className="citationCards">
                    {answer.citations.map((citation) => (
                      <li key={citation.id}>{citationLabel(citation)}</li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>

          <div className="footerLine">
            {answer.footer} | Prompt:{answer.version.promptVersion} | Provider:{answer.version.provider}
          </div>
        </div>
      </div>
    </section>
  );
}

function ListBlock({ title, items, icon }: { title: string; items: string[]; icon: "conflict" | "checklist" | "facts" | "followups" }) {
  const Icon = icon === "checklist" ? CheckCircle2 : icon === "facts" ? FileSearch : ClipboardList;
  return (
    <section className="infoCard">
      <h3 className="sectionTitle">
        <Icon size={14} /> {title}
      </h3>
      <ul className="plainList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
