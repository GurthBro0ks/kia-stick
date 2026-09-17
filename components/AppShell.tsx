"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ClipboardList, Library, Menu, MessageSquareText, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import { applyAppearance, normalizeAppearance, readAppearance, type Appearance } from "@/lib/appearance";

export type ShellView = "chat" | "packets" | "sources" | "saved" | "upload" | "vault" | "import" | "settings";
const titles: Record<ShellView, string> = { chat: "Conversation", packets: "Packets", sources: "Sources", saved: "Library", upload: "Upload", vault: "Vault", import: "Import", settings: "Settings" };

export function AppShell({ view, onNavigate, onNewConversation, conversationTitle, displayVersion, children }: {
  view: ShellView;
  onNavigate: (view: ShellView) => void;
  onNewConversation: () => void;
  conversationTitle: string;
  displayVersion: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>("system");
  const drawer = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setAppearance(readAppearance());
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 900px)");
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function navigate(next: ShellView) {
    onNavigate(next);
    drawer.current?.close();
  }

  function navigation(mobile: boolean) {
    const compact = collapsed && !mobile;
    return <>
      <div className="sidebarBrand">
        <span className="sidebarWordmark">{compact ? "KIA" : "KIA Stick"}</span>
        <button type="button" className="shellIconButton" aria-label={mobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={mobile ? undefined : !collapsed}
          onClick={() => mobile ? drawer.current?.close() : setCollapsed(!collapsed)}>
          {mobile ? <X size={20} /> : collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      <nav className="sidebarNavigation" aria-label="KIA Stick navigation">
        <button className="sidebarItem newConversation" type="button" title="New conversation — replaces the current thread after confirmation" aria-label="New conversation"
          onClick={() => { onNewConversation(); drawer.current?.close(); }}><Plus size={19} /><span>New conversation</span></button>
        <div className="sidebarPrimary">
          {([{ view: "packets", icon: ClipboardList }, { view: "sources", icon: BookOpen }, { view: "saved", icon: Library }] as const).map(({ view: target, icon: Icon }) =>
            <button key={target} type="button" className="sidebarItem" aria-label={titles[target]} title={titles[target]} aria-current={view === target ? "page" : undefined} onClick={() => navigate(target)}><Icon size={19} /><span>{titles[target]}</span></button>)}
        </div>
        <section className="sidebarSection"><h2>Pinned</h2><p>Nothing pinned yet</p></section>
        <section className="sidebarSection"><h2>Projects</h2><p>No projects yet</p></section>
        <section className="sidebarSection chatSection"><h2>Chats</h2>
          <button type="button" className="sidebarItem" aria-label="Current conversation" title={conversationTitle} aria-current={view === "chat" ? "page" : undefined} onClick={() => navigate("chat")}><MessageSquareText size={19} /><span>{conversationTitle}</span></button>
          <p>Only the current conversation is stored. Starting a new one replaces it.</p>
        </section>
      </nav>
      <div className="sidebarFooter">
        <details className="sidebarMenu">
          <summary aria-label="Menu" title="Menu"><Menu size={19} /><span>Menu</span></summary>
          <div className="sidebarMenuContents">
            <label>Appearance<select aria-label="Appearance" value={appearance} onChange={(event) => { const next = normalizeAppearance(event.target.value); applyAppearance(next); setAppearance(next); }}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
            <button type="button" onClick={() => navigate("settings")}>Settings</button>
            <details><summary>Advanced / Tools</summary><div className="sidebarTools">{(["upload", "vault", "import"] as const).map((target) => <button key={target} type="button" aria-current={view === target ? "page" : undefined} onClick={() => navigate(target)}>{titles[target]}</button>)}</div></details>
            <a href="/version">Version / About</a><small>{displayVersion}</small>
          </div>
        </details>
      </div>
    </>;
  }

  return <div className={`appShell conversationShell${collapsed ? " sidebarCollapsed" : ""}`}>
    <aside className="desktopSidebar" aria-label="Sidebar">{navigation(false)}</aside>
    <dialog ref={drawer} className="mobileSidebarDrawer" aria-label="Navigation" onClose={() => opener.current?.focus()} onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
      <div className="mobileSidebarInterior">{navigation(true)}</div>
    </dialog>
    <div className="shellWorkspace">
      <header className="workspaceHeader"><button ref={opener} type="button" className="shellIconButton mobileMenuButton" aria-label="Open navigation" onClick={() => drawer.current?.showModal()}><Menu size={21} /></button><h1>{titles[view]}</h1><span>KIA Stick</span></header>
      {children}
    </div>
  </div>;
}
