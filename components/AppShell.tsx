"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Library, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Pin, Plus, Search, X } from "lucide-react";
import { applyAppearance, normalizeAppearance, readAppearance, type Appearance } from "@/lib/appearance";

export type ShellView = "chat" | "packets" | "sources" | "saved" | "upload" | "vault" | "import" | "settings";
export type ShellMode = "chat" | "training" | "expert";
export type SourceStatusTone = "ok" | "pending" | "warn";

const titles: Record<ShellView, string> = { chat: "Conversation", packets: "Packets", sources: "Sources", saved: "Library", upload: "Upload", vault: "Vault", import: "Import", settings: "Settings" };

export const PINNED_PROMPTS = [
  { label: "Annual Leave Rights", question: "Can management deny my annual leave request?" },
  { label: "Investigative Interview Prep", question: "Help me prepare for an investigative interview." },
  { label: "Discipline Grievance", question: "What are my rights if I receive a Letter of Warning?" },
] as const;

const STUBS = {
  search: "Search is not ready.",
  help: "Help is not ready.",
  guides: "Guides are not ready.",
} as const;

const MODE_STUBS: Record<Exclude<ShellMode, "chat">, string> = {
  training: "Steward Training is not built yet. The Chat conversation is unchanged.",
  expert: "Expert is not built yet. The Chat conversation is unchanged.",
};

export function AppShell({ view, onNavigate, onNewConversation, onPinQuestion, conversationTitle, displayVersion, sourceStatus, children }: {
  view: ShellView;
  onNavigate: (view: ShellView) => void;
  onNewConversation: () => void;
  onPinQuestion?: (question: string) => void;
  conversationTitle: string;
  displayVersion: string;
  sourceStatus?: { label: string; tone: SourceStatusTone };
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [shellMode, setShellMode] = useState<ShellMode>("chat");
  const [stub, setStub] = useState<keyof typeof STUBS | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const stubDialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const status = sourceStatus ?? { label: "Checking sources", tone: "pending" as const };

  useEffect(() => {
    setAppearance(readAppearance());
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 900px)");
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n" && !event.altKey) {
        event.preventDefault();
        onNewConversation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNewConversation]);

  useEffect(() => {
    if (stub) stubDialog.current?.showModal();
    else stubDialog.current?.close();
  }, [stub]);

  function navigate(next: ShellView) {
    onNavigate(next);
    drawer.current?.close();
  }

  function navigation(mobile: boolean) {
    const compact = collapsed && !mobile;
    return <>
      <div className="sidebarBrand">
        <span className="sidebarMark" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28"><path fill="currentColor" d="M4 26 12 6h4L8 26H4zm8 0 8-20h4l-8 20h-4zm8 0 8-20h4l-8 20h-4z" /></svg></span>
        <span className="sidebarBrandText">
          <span className="sidebarWordmark">{compact ? "KIA" : "KIA Stick"}</span>
          {!compact && <span className="sidebarTagline">Contract Knowledge & Steward Assistant</span>}
        </span>
        <button type="button" className="shellIconButton" aria-label={mobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={mobile ? undefined : !collapsed}
          onClick={() => mobile ? drawer.current?.close() : setCollapsed(!collapsed)}>
          {mobile ? <X size={20} /> : collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      <label className="modeSelect">
        <MessageSquare size={16} aria-hidden="true" />
        <select aria-label="Mode" value={shellMode} onChange={(event) => setShellMode(event.target.value as ShellMode)}>
          <option value="chat">Chat</option>
          <option value="training">Steward Training</option>
          <option value="expert">Expert</option>
        </select>
      </label>
      <nav className="sidebarNavigation" aria-label="KIA Stick navigation">
        <button className="sidebarItem newConversation" type="button" title="New conversation — replaces the current thread after confirmation" aria-label="New conversation"
          onClick={() => { onNewConversation(); drawer.current?.close(); }}><Plus size={18} /><span>New chat <kbd className="newChatHint">⌘N</kbd></span></button>
        <button className="sidebarItem" type="button" onClick={() => setStub("search")}><Search size={18} /><span>Search</span></button>
        <button className="sidebarItem" type="button" aria-label="Library" aria-current={view === "saved" ? "page" : undefined} onClick={() => navigate("saved")}><Library size={18} /><span>Library</span></button>
        <button className="sidebarItem" type="button" aria-label="Sources" aria-current={view === "sources" ? "page" : undefined} onClick={() => navigate("sources")}><BookOpen size={18} /><span>Sources</span></button>
        <section className="sidebarSection pinnedSection">
          <div className="sidebarSectionLabel">Pinned</div>
          {PINNED_PROMPTS.map((item) => (
            <button key={item.label} className="sidebarItem pinnedItem" type="button" title={item.question} onClick={() => { onPinQuestion?.(item.question); drawer.current?.close(); }}>
              <Pin size={16} /><span>{item.label}</span>
            </button>
          ))}
        </section>
      </nav>
      <div className="sidebarFooter">
        <details className="sidebarMenu">
          <summary aria-label="Menu" title="Menu"><Menu size={19} /><span>Menu</span></summary>
          <div className="sidebarMenuContents">
            <label>Appearance<select aria-label="Appearance" value={appearance} onChange={(event) => { const next = normalizeAppearance(event.target.value); applyAppearance(next); setAppearance(next); }}><option value="hybrid">Hybrid</option><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
            <button type="button" onClick={() => navigate("settings")}>Settings</button>
            <button type="button" aria-current={view === "packets" ? "page" : undefined} onClick={() => navigate("packets")}>Packets</button>
            <p>Only the current conversation is stored. Starting a new one replaces it.</p>
            <p aria-current={view === "chat" ? "page" : undefined}>{conversationTitle}</p>
            <details><summary>Advanced / Tools</summary><div className="sidebarTools">{(["upload", "vault", "import"] as const).map((target) => <button key={target} type="button" aria-current={view === target ? "page" : undefined} onClick={() => navigate(target)}>{titles[target]}</button>)}</div></details>
            <a href="/version">Version / About</a><small>{displayVersion}</small>
          </div>
        </details>
      </div>
    </>;
  }

  return <div className={`appShell conversationShell${collapsed ? " sidebarCollapsed" : ""}`}>
    <a href="#main-content" className="skipLink">Skip to main content</a>
    <aside className="desktopSidebar" aria-label="Sidebar">{navigation(false)}</aside>
    <dialog ref={drawer} className="mobileSidebarDrawer" aria-label="Navigation" onClose={() => opener.current?.focus()} onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
      <div className="mobileSidebarInterior">{navigation(true)}</div>
    </dialog>
    <dialog ref={stubDialog} className="stubDialog" aria-label={stub ? STUBS[stub] : "Notice"} onClose={() => setStub(null)}>
      <p>{stub ? STUBS[stub] : ""}</p>
      <button type="button" onClick={() => setStub(null)}>Close</button>
    </dialog>
    <div className="shellWorkspace">
      <header className="workspaceHeader">
        <button ref={opener} type="button" className="shellIconButton mobileMenuButton" aria-label="Open navigation" onClick={() => drawer.current?.showModal()}><Menu size={21} /></button>
        <h1>{titles[view]}</h1>
        <div className="workspaceHeaderActions">
          <span className={`sourceStatus sourceStatus-${status.tone}`} role="status"><span className="sourceStatusDot" aria-hidden="true" />{status.label}</span>
          <button type="button" className="headerTextButton" onClick={() => setStub("help")}>Help</button>
          <button type="button" className="headerTextButton" onClick={() => setStub("guides")}>Guides</button>
        </div>
      </header>
      {shellMode !== "chat" && <p className="modeStub" role="status">{MODE_STUBS[shellMode]}</p>}
      {children}
    </div>
  </div>;
}
