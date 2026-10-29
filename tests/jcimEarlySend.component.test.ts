import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { answerChatTurn, jcimTabEffect } from "@/components/KiaStickApp";
import type { AnswerResult } from "@/lib/answerGovernor";
import { createChatSubmitSnapshot } from "@/lib/chatAnswerRouter";
import { createJcimSourceLoader, JCIM_SOURCE_ID, type JcimCache } from "@/lib/jcimSource";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-early-send-1, test 2: the chat send path used by KiaStickApp (answerChatTurn + the JCIM loader driven by the
// tab effect). The repo has no DOM test environment (vitest "node", no jsdom/testing-library) and adding one is a
// dependency change, so the component is exercised through the exported functions it calls, plus source wiring checks.
// Mocked fetch only; no network.
const cba = createCbaSourceFixtureCacheWithArticle19();
const jcim = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261029", gitSha: "e23ece0" });
const SICK = "How does sick leave work?";

function deferredJcimFetch() {
  let release!: (payload: unknown) => void;
  const calls: string[] = [];
  const fetcher = vi.fn((url: string | URL | Request) => {
    calls.push(String(url));
    return new Promise<Response>((resolve) => {
      release = (payload) => resolve(new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } }));
    });
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls, release: (payload: unknown) => release(payload) };
}

function send(loader: ReturnType<typeof createJcimSourceLoader>, jcimWaitMs?: number) {
  const snapshot = createChatSubmitSnapshot({ question: SICK, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
  return answerChatTurn({ question: SICK, snapshot, publicSource: null, cbaSource: cba, jcimLoader: loader, runtimeVersion, jcimWaitMs });
}

const jcimIds = (answer: AnswerResult) =>
  answer.citations.filter((citation) => citation.sourceId === JCIM_SOURCE_ID).map((citation) => citation.section);

afterEach(() => { vi.useRealTimers(); });

describe("KIA-jcim-early-send-1 test 2: early Send while JCIM is still loading", () => {
  it("an early Send waits for the delayed JCIM response and cites JCIM 10.5", async () => {
    const mock = deferredJcimFetch();
    const loader = createJcimSourceLoader({ fetcher: mock.fetcher, timeoutMs: 5_000 });
    jcimTabEffect(loader); // first render, tab "chat"
    const pending = send(loader, 5_000); // Send before JCIM arrives
    await new Promise((resolve) => setTimeout(resolve, 30));
    mock.release({ status: "available", source: jcim satisfies JcimCache });
    const answer = await pending;
    expect(answer.noAnswer).toBe(false);
    expect(jcimIds(answer)).toEqual(["Article 10.5"]);
    expect(answer.shortAnswer).not.toMatch(/JCIM not checked/);
  });

  it("an early Send whose JCIM never arrives in the wait discloses that JCIM was not checked", async () => {
    const mock = deferredJcimFetch();
    const loader = createJcimSourceLoader({ fetcher: mock.fetcher, timeoutMs: 60_000 });
    jcimTabEffect(loader);
    const answer = await send(loader, 20);
    expect(jcimIds(answer)).toEqual([]);
    expect(answer.noAnswer || /JCIM not checked/.test(answer.shortAnswer)).toBe(true);
    expect(answer.shortAnswer).toMatch(/still loading/);
  });

  it("Sources -> Chat switch then an early Send: one fetch, no reset to loading, JCIM 10.5 cited", async () => {
    const mock = deferredJcimFetch();
    const loader = createJcimSourceLoader({ fetcher: mock.fetcher, timeoutMs: 5_000 });
    const seen: string[] = [];
    loader.subscribe((state) => seen.push(state.status));
    jcimTabEffect(loader); // tab "sources"
    jcimTabEffect(loader); // switch to tab "chat" while the first fetch is still in flight
    const pending = send(loader, 5_000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    mock.release({ status: "available", source: jcim });
    const answer = await pending;
    expect(mock.calls).toEqual(["/api/public-jcim-source"]);
    expect(jcimIds(answer)).toEqual(["Article 10.5"]);
    jcimTabEffect(loader); // back to sources
    jcimTabEffect(loader); // and to chat again after the load
    expect(mock.calls).toHaveLength(1);
    expect(loader.getState().status).toBe("available");
    expect(seen).toEqual(["available"]);
    expect(jcimIds(await send(loader, 0))).toEqual(["Article 10.5"]);
  });

  it("KiaStickApp sends through answerChatTurn and its tab effect no longer resets JCIM to loading", () => {
    const source = readFileSync(path.join(process.cwd(), "components/KiaStickApp.tsx"), "utf8");
    const start = source.indexOf("function completeAssistantTurn(");
    expect(start).toBeGreaterThan(0);
    const turn = source.slice(start, start + 2500);
    expect(turn).toContain("await answerChatTurn(");
    expect(turn).not.toMatch(/jcimSource: jcimSourceState/);
    expect(source).not.toMatch(/setJcimSourceState\(\{ status: "loading" \}\)/);
    expect(source).toMatch(/jcimTabEffect\(jcimLoader\);\n\s*\}, \[jcimLoader, tab\]\);/);
  });
});
