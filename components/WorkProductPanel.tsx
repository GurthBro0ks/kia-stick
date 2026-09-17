"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Presentation only; the caller owns the existing packet and its actions. */
export function WorkProductPanel({ title, onClose, onFullView, children }: {
  title: string;
  onClose: () => void;
  onFullView: () => void;
  children: ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return <aside id="steward-work-product" className="workProductPanel" aria-labelledby="work-product-heading"
    onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className="workProductHeader">
      <div><span className="sectionKicker">Work product</span><h2 id="work-product-heading">Steward Packet</h2><p>{title || "Choose supported topics"}</p></div>
      <button ref={closeButton} className="shellIconButton" type="button" aria-label="Close Steward Packet" onClick={onClose}><X size={20} /></button>
      <div className="workProductHeaderActions">
        <button className="button subtle compactButton workProductBack" type="button" onClick={onClose}>Back to conversation</button>
        <button className="button subtle compactButton" type="button" onClick={onFullView}>Open full view</button>
      </div>
    </header>
    <div className="workProductBody">{children}</div>
  </aside>;
}
