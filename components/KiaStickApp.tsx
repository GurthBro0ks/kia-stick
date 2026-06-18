"use client";

import {
  Archive,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Heart,
  MessageSquareText,
  Save,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { answerToMarkdown, buildAnswer, cannedQuestions, type AnswerResult } from "@/lib/answerGovernor";
import {
  bucketForClass,
  citationLabel,
  corpus,
  sourceClassLabels,
  type Detail,
  type Mode,
  type Scope,
} from "@/lib/sourceModel";
import { clientVersion } from "@/lib/version";

type Tab = "chat" | "sources" | "saved" | "upload" | "settings";

interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  mode: Mode;
  citations: AnswerResult["citations"];
  version: AnswerResult["version"];
  provider: string;
  timestamp: string;
  footer: string;
}

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

export function KiaStickApp() {
  const [tab, setTab] = useState<Tab>("chat");
  const [mode, setMode] = useState<Mode>("Strict Research");
  const [scope, setScope] = useState<Scope>("All Fake");
  const [detail, setDetail] = useState<Detail>("Detailed");
  const [question, setQuestion] = useState(cannedQuestions[0]);
  const [answer, setAnswer] = useState<AnswerResult>(() =>
    buildAnswer(cannedQuestions[0], { mode: "Strict Research", scope: "All Fake", detail: "Detailed" })
  );
  const [saved, setSaved] = useState<SavedAnswer[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineItem[]>([]);
  const [fakeOnlyConfirmed, setFakeOnlyConfirmed] = useState(false);

  useEffect(() => {
    setSaved(loadJson<SavedAnswer[]>(savedKey, []));
    setQuarantine(loadJson<QuarantineItem[]>(quarantineKey, []));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(savedKey, JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    window.localStorage.setItem(quarantineKey, JSON.stringify(quarantine));
  }, [quarantine]);

  const sourceBuckets = useMemo(() => {
    return corpus.sourceClasses.map((sourceClass) => ({
      sourceClass,
      docs: corpus.docs.filter((doc) => doc.class === sourceClass),
    }));
  }, []);

  function runAnswer(nextQuestion = question) {
    const nextAnswer = buildAnswer(nextQuestion, { mode, scope, detail });
    setQuestion(nextQuestion);
    setAnswer(nextAnswer);
    setTab("chat");
  }

  function saveAnswer() {
    const record: SavedAnswer = {
      id: `${Date.now()}-${answer.intent}`,
      question: answer.question,
      answer: answerToMarkdown(answer),
      mode,
      citations: answer.citations,
      version: answer.version,
      provider: answer.version.provider,
      timestamp: new Date().toISOString(),
      footer: answer.footer,
    };
    setSaved((current) => [record, ...current].slice(0, 50));
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

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brandBlock">
          <h1 className="brand">KIA Stick</h1>
          <p className="subtitle">Know-It-All Stick · fake-doc laptop MVP</p>
        </div>
        <div className="topMeta">
          <span className="winBadge">v{clientVersion.appVersion}</span>
          <span>{clientVersion.provider}</span>
        </div>
      </header>

      <main className="mainArea">
        {tab === "chat" && (
          <>
            <section className="windowPanel">
              <div className="windowTitle">
                <span>Ask</span>
                <span>{answer.noAnswer ? "No controlling hit" : "Cited answer"}</span>
              </div>
              <div className="panelBody">
                <div className="selectorGrid">
                  <label className="fieldLabel">
                    Mode
                    <select className="select" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
                      {modes.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="fieldLabel">
                    Scope
                    <select className="select" value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
                      {scopes.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="fieldLabel">
                    Detail
                    <select className="select" value={detail} onChange={(event) => setDetail(event.target.value as Detail)}>
                      {details.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="chips" aria-label="test prompts">
                  {cannedQuestions.map((prompt) => (
                    <button className="chip" key={prompt} type="button" onClick={() => runAnswer(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>

                <label className="fieldLabel" style={{ marginTop: 10 }}>
                  Question
                  <textarea
                    className="questionInput"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                </label>

                <div className="chatActions">
                  <button className="button primary" type="button" onClick={() => runAnswer()}>
                    <MessageSquareText size={17} />
                    Answer
                  </button>
                  <button className="button iconOnly" type="button" onClick={saveAnswer} title="Save answer" aria-label="Save answer">
                    <Save size={17} />
                  </button>
                </div>
              </div>
            </section>

            <AnswerPanel answer={answer} />
          </>
        )}

        {tab === "sources" && (
          <section className="windowPanel">
            <div className="windowTitle">
              <span>Sources</span>
              <span>{corpus.docs.length} fake docs</span>
            </div>
            <div className="panelBody sourceCards">
              {sourceBuckets.map(({ sourceClass, docs }) => (
                <article className="sourceCard" key={sourceClass}>
                  <h3>{sourceClassLabels[sourceClass]}</h3>
                  <p>{docs.length} source{docs.length === 1 ? "" : "s"} · bucket {bucketForClass(sourceClass)}</p>
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
          <section className="windowPanel">
            <div className="windowTitle">
              <span>Saved</span>
              <span>{saved.length}</span>
            </div>
            <div className="panelBody sourceCards">
              {saved.length === 0 && <p className="emptyState">No saved answers yet.</p>}
              {saved.map((item) => (
                <article className="savedCard" key={item.id}>
                  <div className="savedHeader">
                    <h3>{item.question}</h3>
                    <button
                      className="button iconOnly"
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
                    <span className="badge">{item.provider}</span>
                    <span className="badge">{item.citations.length} citations</span>
                    <span className="badge">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "upload" && (
          <section className="windowPanel">
            <div className="windowTitle">
              <span>Upload</span>
              <span>Quarantine review</span>
            </div>
            <div className="panelBody">
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={fakeOnlyConfirmed}
                  onChange={(event) => setFakeOnlyConfirmed(event.target.checked)}
                />
                Fake sample only
              </label>
              <label className="fieldLabel" style={{ marginTop: 10 }}>
                Local file metadata
                <input
                  className="fileInput"
                  type="file"
                  multiple
                  accept=".md,.txt,.json"
                  disabled={!fakeOnlyConfirmed}
                  onChange={(event) => queueUpload(event.target.files)}
                />
              </label>
              <div className="sourceCards" style={{ marginTop: 10 }}>
                {quarantine.length === 0 && <p className="emptyState">No queued fake samples.</p>}
                {quarantine.map((item) => (
                  <article className="uploadRow" key={item.id}>
                    <p>
                      <strong>{item.name}</strong> · {item.size} bytes
                    </p>
                    <div className="sourceMeta">
                      <span className="badge">{item.review}</span>
                      <span className="badge">{item.privacy}</span>
                      <span className="badge">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="windowPanel">
            <div className="windowTitle">
              <span>Settings</span>
              <a href="/version" className="badge">Version page</a>
            </div>
            <dl className="settingsGrid">
              <dt>App</dt>
              <dd>{clientVersion.appVersion}</dd>
              <dt>Git</dt>
              <dd>{clientVersion.gitSha}</dd>
              <dt>Corpus</dt>
              <dd>{clientVersion.corpusVersion}</dd>
              <dt>Index</dt>
              <dd>{clientVersion.indexVersion}</dd>
              <dt>Prompt</dt>
              <dd>{clientVersion.promptVersion}</dd>
              <dt>Provider</dt>
              <dd>{clientVersion.provider}</dd>
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
        <NavButton active={tab === "settings"} label="Settings" onClick={() => setTab("settings")} icon={<Settings size={20} />} />
      </nav>
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

function AnswerPanel({ answer }: { answer: AnswerResult }) {
  return (
    <section className="windowPanel">
      <div className="windowTitle">
        <span>Answer</span>
        <span>{answer.intent}</span>
      </div>
      <div className="panelBody answerStack">
        <div>
          <p className="shortAnswer">{answer.shortAnswer}</p>
          <p className="modeNote">{answer.modeNote}</p>
        </div>

        <div>
          <h2 className="sectionTitle">Sources</h2>
          {answer.sourceGroups.length === 0 && <p className="emptyState">No fake sources matched.</p>}
          {answer.sourceGroups.map((group) => (
            <div className="sourceGroup" key={group.bucket}>
              <strong>{group.label}</strong>
              <ul className="sourceList">
                {group.docs.map((doc) => (
                  <li key={doc.id}>
                    {doc.title}
                    <div className="sourceMeta">
                      <span className="badge">{sourceClassLabels[doc.class]}</span>
                      <span className={doc.citable ? "badge green" : "badge red"}>{doc.citable ? "citable" : "not citable"}</span>
                      <span className="badge">{doc.article}</span>
                      <span className="badge">{doc.page}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <ListBlock title="Conflicts" items={answer.conflicts.length > 0 ? answer.conflicts : ["No visible fake-source conflicts."]} icon="conflict" />
        <ListBlock title="Evidence Checklist" items={answer.evidenceChecklist} icon="checklist" />
        <ListBlock title="Missing Facts" items={answer.missingFacts} icon="facts" />
        <ListBlock title="Follow-Ups" items={answer.followUps} icon="followups" />

        <div>
          <h2 className="sectionTitle">Citations</h2>
          {answer.citations.length === 0 ? (
            <p className="emptyState">No citable fake sources.</p>
          ) : (
            <ol className="citationList">
              {answer.citations.map((citation) => (
                <li key={citation.id}>{citationLabel(citation)}</li>
              ))}
            </ol>
          )}
        </div>

        <div className="footerLine">
          {answer.footer} | Prompt:{answer.version.promptVersion} | Provider:{answer.version.provider}
        </div>
      </div>
    </section>
  );
}

function ListBlock({ title, items, icon }: { title: string; items: string[]; icon: "conflict" | "checklist" | "facts" | "followups" }) {
  const Icon = icon === "checklist" ? CheckCircle2 : icon === "facts" ? FileSearch : ClipboardList;
  return (
    <div>
      <h2 className="sectionTitle">
        <Icon size={14} /> {title}
      </h2>
      <ul className="plainList">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
