import { afterEach, describe, expect, it, vi } from "vitest";
import { answerChatTurn, createCbaSourceLoader, createPublicSourceLoader } from "@/components/KiaStickApp";
import type { AnswerResult } from "@/lib/answerGovernor";
import { createChatSubmitSnapshot } from "@/lib/chatAnswerRouter";
import { createJcimSourceLoader, JCIM_SOURCE_ID } from "@/lib/jcimSource";
import { SOURCE_LOAD_FAILED_FOLLOW_UP, SOURCE_STILL_LOADING_FOLLOW_UP } from "@/lib/sourceLoader";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

// KIA-source-early-send-1 (D1/D2/D3): an early question must never get a false "source unavailable / run sync" answer.
// The chat send path is exercised through answerChatTurn with the app's CBA/NLRB loaders (no DOM test environment).
// Deferred/mocked fetch and SYNTHETIC fixtures only; no network.
const cba = createCbaSourceFixtureCacheWithArticle19();
const nlrb = createPublicSourceFixtureCache();
const jcim = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261029", gitSha: "8da74ef" });
const SICK = "How does sick leave work?";
const WEINGARTEN = "What are my Weingarten rights?";
const SYNC = /public-source-sync|sync command|operator sync/i;

type Deferred = { fetcher: typeof fetch; calls: string[]; release: (payload: unknown) => void; fail: () => void };

function deferredFetch(): Deferred {
  const calls: string[] = [];
  let resolveFn: ((response: Response) => void) | null = null;
  let rejectFn: ((error: Error) => void) | null = null;
  const fetcher = vi.fn((url: string | URL | Request) => {
    calls.push(String(url));
    return new Promise<Response>((resolve, reject) => { resolveFn = resolve; rejectFn = reject; });
  });
  return {
    fetcher: fetcher as unknown as typeof fetch,
    calls,
    release: (payload) => resolveFn?.(new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } })),
    fail: () => rejectFn?.(new TypeError("Failed to fetch")),
  };
}

function settledFetch(payload: unknown): Deferred {
  const mock = deferredFetch();
  const fetcher = vi.fn((url: string | URL | Request) => {
    mock.calls.push(String(url));
    return Promise.resolve(new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } }));
  });
  return { ...mock, fetcher: fetcher as unknown as typeof fetch };
}

const loadedJcim = () => {
  const loader = createJcimSourceLoader({ fetcher: settledFetch({ status: "available", source: jcim }).fetcher });
  loader.ensureLoaded();
  return loader;
};

function snapshotFor(question: string) {
  return createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
}

function sendWithLoaders(question: string, cbaFetch: Deferred, nlrbFetch: Deferred, options: { sourceWaitMs?: number; jcimLoader?: ReturnType<typeof createJcimSourceLoader> } = {}) {
  const cbaSourceLoader = createCbaSourceLoader(cbaFetch.fetcher);
  const publicSourceLoader = createPublicSourceLoader(nlrbFetch.fetcher);
  cbaSourceLoader.ensureLoaded(); // the app's mount effects
  publicSourceLoader.ensureLoaded();
  return answerChatTurn({ question, snapshot: snapshotFor(question), cbaSourceLoader, publicSourceLoader,
    jcimLoader: options.jcimLoader ?? loadedJcim(), runtimeVersion, sourceWaitMs: options.sourceWaitMs });
}

/** The answer the app gives once every source is already loaded (the pre-fix path with settled sources). */
function settledAnswer(question: string, cbaSource: typeof cba | null, publicSource: typeof nlrb | null) {
  return answerChatTurn({ question, snapshot: snapshotFor(question), cbaSource, publicSource, jcimLoader: loadedJcim(), runtimeVersion, jcimWaitMs: 1_000 });
}

const noTime = (answer: AnswerResult) => ({ ...answer, generatedAt: "" });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const jcimSections = (answer: AnswerResult) => answer.citations.filter((c) => c.sourceId === JCIM_SOURCE_ID).map((c) => c.section);

afterEach(() => { vi.useRealTimers(); });

describe("KIA-source-early-send-1 D1: CBA still loading when the question is sent", () => {
  it("CBA deferred then released: the normal sick-leave answer, 4 citations incl. JCIM 10.5, no sync text", async () => {
    const cbaFetch = deferredFetch();
    const pending = sendWithLoaders(SICK, cbaFetch, settledFetch({ status: "available", source: nlrb }), { sourceWaitMs: 5_000 });
    await wait(30);
    cbaFetch.release({ status: "available", source: cba });
    const answer = await pending;
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations).toHaveLength(4);
    expect(jcimSections(answer)).toEqual(["Article 10.5"]);
    // The synthetic JCIM fixture's Article 10.5 paragraph id; the real cache's is article-10-pdf81-unit8.
    expect(answer.citations.filter((c) => c.sourceId === JCIM_SOURCE_ID).map((c) => c.paragraphId)).toEqual(["article-10-pdf71-p05"]);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
    expect(noTime(answer)).toEqual(noTime(await settledAnswer(SICK, cba, nlrb)));
  });

  it("CBA never resolves within the wait: an explicit 'still loading' no-answer, 0 citations, no sync text", async () => {
    const answer = await sendWithLoaders(SICK, deferredFetch(), settledFetch({ status: "available", source: nlrb }), { sourceWaitMs: 20 });
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(answer.shortAnswer).toMatch(/APWU-USPS CBA was still loading/);
    expect(answer.shortAnswer).toMatch(/Ask again in a moment/);
    expect(answer.followUps).toEqual([SOURCE_STILL_LOADING_FOLLOW_UP]);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
    expect(answer.shortAnswer).not.toMatch(/cache is unavailable/);
  });

  it("CBA fetch error: a distinct 'couldn't load, try again' no-answer that never prescribes sync", async () => {
    const cbaFetch = deferredFetch();
    const pending = sendWithLoaders(SICK, cbaFetch, settledFetch({ status: "available", source: nlrb }), { sourceWaitMs: 5_000 });
    await wait(10);
    cbaFetch.fail();
    const answer = await pending;
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(answer.shortAnswer).toMatch(/APWU-USPS CBA couldn't be loaded in this page/);
    expect(answer.followUps).toEqual([SOURCE_LOAD_FAILED_FOLLOW_UP]);
    expect(answer.shortAnswer).not.toMatch(/still loading/);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("a CBA response that is not JSON (HTTP error page) is a load failure, not 'run sync'", async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response("<html>502</html>", { status: 502 }))) as unknown as typeof fetch;
    const answer = await sendWithLoaders(SICK, { ...deferredFetch(), fetcher }, settledFetch({ status: "available", source: nlrb }), { sourceWaitMs: 5_000 });
    expect(answer.shortAnswer).toMatch(/couldn't be loaded/);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("a real route-reported unavailable CBA keeps today's message and sync instruction", async () => {
    const answer = await sendWithLoaders(SICK, settledFetch({ status: "unavailable", reason: "cache_missing" }), settledFetch({ status: "available", source: nlrb }), { sourceWaitMs: 5_000 });
    expect(answer.shortAnswer).toMatch(/The exact allowlisted CBA cache is unavailable/);
    expect(answer.followUps.join(" ")).toMatch(/public-source-sync\.mjs apwu-usps-cba-2024-2027/);
    expect(noTime(answer)).toEqual(noTime(await settledAnswer(SICK, null, nlrb)));
  });
});

describe("KIA-source-early-send-1 D2: NLRB (Weingarten) still loading when the question is sent", () => {
  it("NLRB deferred then released: the normal Weingarten answer, no sync text", async () => {
    const nlrbFetch = deferredFetch();
    const pending = sendWithLoaders(WEINGARTEN, deferredFetch(), nlrbFetch, { sourceWaitMs: 5_000 });
    await wait(30);
    nlrbFetch.release({ status: "available", source: nlrb });
    const answer = await pending;
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
    expect(noTime(answer)).toEqual(noTime(await settledAnswer(WEINGARTEN, null, nlrb)));
  });

  it("NLRB never resolves within the wait: an explicit 'still loading' no-answer, 0 citations, no sync text", async () => {
    const answer = await sendWithLoaders(WEINGARTEN, settledFetch({ status: "available", source: cba }), deferredFetch(), { sourceWaitMs: 20 });
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(answer.shortAnswer).toMatch(/NLRB Weingarten guidance was still loading/);
    expect(answer.followUps).toEqual([SOURCE_STILL_LOADING_FOLLOW_UP]);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("NLRB fetch error: a distinct 'couldn't load, try again' no-answer that never prescribes sync", async () => {
    const nlrbFetch = deferredFetch();
    const pending = sendWithLoaders(WEINGARTEN, settledFetch({ status: "available", source: cba }), nlrbFetch, { sourceWaitMs: 5_000 });
    await wait(10);
    nlrbFetch.fail();
    const answer = await pending;
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(answer.shortAnswer).toMatch(/NLRB Weingarten guidance couldn't be loaded in this page/);
    expect(answer.followUps).toEqual([SOURCE_LOAD_FAILED_FOLLOW_UP]);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("a real route-reported unavailable NLRB source keeps today's message and sync instruction", async () => {
    const answer = await sendWithLoaders(WEINGARTEN, settledFetch({ status: "available", source: cba }), settledFetch({ status: "unavailable", reason: "cache_missing" }), { sourceWaitMs: 5_000 });
    expect(answer.shortAnswer).toMatch(/allowlisted public source is unavailable/);
    expect(answer.followUps.join(" ")).toMatch(/public-source-sync\.mjs nlrb-weingarten-rights/);
    expect(noTime(answer)).toEqual(noTime(await settledAnswer(WEINGARTEN, null, null)));
  });
});

describe("KIA-source-early-send-1: default wait (no override) and answer-time reads", () => {
  // Reviewer N10 pattern: no sourceWaitMs override, so a `?? 0` default would answer before the source lands.
  it("an early CBA send with no wait override waits by default for a CBA load that lands shortly after", async () => {
    const cbaFetch = deferredFetch();
    const pending = sendWithLoaders(SICK, cbaFetch, settledFetch({ status: "available", source: nlrb }));
    await wait(50);
    cbaFetch.release({ status: "available", source: cba });
    const answer = await pending;
    expect(jcimSections(answer)).toEqual(["Article 10.5"]);
    expect(answer.citations).toHaveLength(4);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("an early NLRB send with no wait override waits by default for an NLRB load that lands shortly after", async () => {
    const nlrbFetch = deferredFetch();
    const pending = sendWithLoaders(WEINGARTEN, settledFetch({ status: "available", source: cba }), nlrbFetch);
    await wait(50);
    nlrbFetch.release({ status: "available", source: nlrb });
    const answer = await pending;
    expect(answer.noAnswer).toBe(false);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("D3: CBA lands before a slower JCIM; the answer uses the CBA read at answer time, not click time", async () => {
    const cbaFetch = deferredFetch();
    const jcimFetch = deferredFetch();
    const jcimLoader = createJcimSourceLoader({ fetcher: jcimFetch.fetcher, timeoutMs: 60_000 });
    jcimLoader.ensureLoaded();
    const pending = sendWithLoaders(SICK, cbaFetch, settledFetch({ status: "available", source: nlrb }), { jcimLoader });
    await wait(20);
    cbaFetch.release({ status: "available", source: cba });
    await wait(40);
    jcimFetch.release({ status: "available", source: jcim });
    const answer = await pending;
    expect(answer.citations).toHaveLength(4);
    expect(jcimSections(answer)).toEqual(["Article 10.5"]);
    expect(JSON.stringify(answer)).not.toMatch(SYNC);
  });

  it("a lane that needs neither source (B-5 safe no-answer) never waits on a stuck CBA/NLRB load", async () => {
    const started = Date.now();
    const answer = await sendWithLoaders("Is it unsafe to work with a cold?", deferredFetch(), deferredFetch());
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
  });
});

describe("KIA-source-early-send-1: each source is fetched at most once per page load", () => {
  it("CBA and NLRB: one fetch each across mount, repeated sends and a failure; no refetch", async () => {
    const cbaFetch = deferredFetch();
    const nlrbFetch = deferredFetch();
    const cbaSourceLoader = createCbaSourceLoader(cbaFetch.fetcher);
    const publicSourceLoader = createPublicSourceLoader(nlrbFetch.fetcher);
    cbaSourceLoader.ensureLoaded();
    publicSourceLoader.ensureLoaded();
    cbaSourceLoader.ensureLoaded(); // e.g. a remount / Strict Mode effect re-run
    publicSourceLoader.ensureLoaded();
    const ask = (question: string) => answerChatTurn({ question, snapshot: snapshotFor(question), cbaSourceLoader, publicSourceLoader,
      jcimLoader: loadedJcim(), runtimeVersion, sourceWaitMs: 5_000 });
    const first = ask(SICK);
    const second = ask(WEINGARTEN);
    await wait(10);
    cbaFetch.release({ status: "available", source: cba });
    nlrbFetch.fail();
    expect((await first).citations).toHaveLength(4);
    expect((await second).shortAnswer).toMatch(/couldn't be loaded/);
    await ask(WEINGARTEN);
    await ask(SICK);
    await Promise.resolve();
    expect(cbaFetch.calls).toEqual(["/api/public-cba-source"]);
    expect(nlrbFetch.calls).toEqual(["/api/public-source"]);
  });
});

