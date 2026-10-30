import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SourcesPanel } from "@/components/KiaStickApp";
import { clientVersion } from "@/lib/version";

// KIA-sources-sync-message-1: a client load_failed on Sources must not show the operator sync command.
// A route unavailable reason such as cache_missing keeps today's command. Synthetic states only.

const SYNC = "public-source-sync";
const COMMAND = "Operator restore command";
const CBA_LABEL = "official CBA source unavailable";
const NLRB_LABEL = "public source unavailable";

function renderSources(cbaReason: "load_failed" | "cache_missing", nlrbReason: "load_failed" | "cache_missing") {
  return renderToStaticMarkup(React.createElement(SourcesPanel, {
    sourceHierarchyGroups: [],
    runtimeVersion: clientVersion,
    cbaSourceState: { status: "unavailable", reason: cbaReason },
    publicSourceState: { status: "unavailable", reason: nlrbReason },
  }));
}

function card(html: string, label: string) {
  const marker = `aria-label="${label}"`;
  const start = html.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const from = html.lastIndexOf("<article", start);
  const end = html.indexOf("</article>", start);
  return html.slice(from, end + "</article>".length);
}

describe("Sources load_failed hides the operator sync command", () => {
  it("CBA load_failed hides the command; NLRB cache_missing keeps it", () => {
    const html = renderSources("load_failed", "cache_missing");
    const cba = card(html, CBA_LABEL);
    const nlrb = card(html, NLRB_LABEL);
    expect(cba).not.toContain(SYNC);
    expect(cba).not.toContain(COMMAND);
    expect(cba).toContain("This page could not load the local CBA cache. Reload the page.");
    expect(nlrb).toContain("public-source-sync.mjs");
    expect(nlrb).toContain(COMMAND);
  });

  it("NLRB load_failed hides the command; CBA cache_missing keeps it", () => {
    const html = renderSources("cache_missing", "load_failed");
    const cba = card(html, CBA_LABEL);
    const nlrb = card(html, NLRB_LABEL);
    expect(nlrb).not.toContain(SYNC);
    expect(nlrb).not.toContain(COMMAND);
    expect(nlrb).toContain("This page could not load the local NLRB cache. Reload the page.");
    expect(cba).toContain("public-source-sync.mjs");
    expect(cba).toContain(COMMAND);
  });

  it("both load_failed hides both commands", () => {
    const html = renderSources("load_failed", "load_failed");
    expect(html).not.toContain(SYNC);
    expect(html).not.toContain(COMMAND);
  });

  it("both cache_missing keeps both commands", () => {
    const html = renderSources("cache_missing", "cache_missing");
    const cba = card(html, CBA_LABEL);
    const nlrb = card(html, NLRB_LABEL);
    expect(cba).toContain("public-source-sync.mjs");
    expect(cba).toContain(COMMAND);
    expect(nlrb).toContain("public-source-sync.mjs");
    expect(nlrb).toContain(COMMAND);
  });

  it("default SourcesPanel props stay cache_missing and still show both commands", () => {
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      sourceHierarchyGroups: [],
      runtimeVersion: clientVersion,
    }));
    const cba = card(html, CBA_LABEL);
    const nlrb = card(html, NLRB_LABEL);
    expect(cba).toContain("cache_missing");
    expect(nlrb).toContain("cache_missing");
    expect(cba).toContain("public-source-sync.mjs");
    expect(nlrb).toContain("public-source-sync.mjs");
    expect(cba).toContain(COMMAND);
    expect(nlrb).toContain(COMMAND);
  });
});
