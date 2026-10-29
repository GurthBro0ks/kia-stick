import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChatSubmitSnapshot } from "@/lib/chatAnswerRouter";
import { createJcimSourceLoader, JCIM_SOURCE_ID } from "@/lib/jcimSource";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";

// KIA-jcim-early-send-1, test 3: apwu.org failure (mocked global fetch, no network) must be disclosed in the chat answer.
// The real /api/public-jcim-source route handler runs; only its on-disk cache read and the global fetch are mocked.
vi.mock("@/lib/jcimSourceServer", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/jcimSourceServer")>();
  const fixture = await import("@/tests/fixtures/jcimSourceFixture");
  return { ...original, readJcimCache: () => ({ status: "available", source: fixture.createJcimSourceFixtureCache() }) };
});

const cba = createCbaSourceFixtureCacheWithArticle19();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261029", gitSha: "e23ece0" });
const SICK = "How does sick leave work?";
const apwuCalls: string[] = [];

beforeEach(() => {
  apwuCalls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
    const target = String(url instanceof Request ? url.url : url);
    if (!target.startsWith("https://apwu.org/")) throw new Error(`unexpected fetch in test: ${target}`);
    apwuCalls.push(target);
    throw new TypeError("fetch failed: apwu.org unreachable (mocked)");
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

async function routeFetcher(url: string | URL | Request): Promise<Response> {
  const { GET } = await import("@/app/api/public-jcim-source/route");
  return GET(new Request(new URL(String(url), "http://127.0.0.1:3107")));
}

async function sendWith(loader: ReturnType<typeof createJcimSourceLoader>) {
  const { answerChatTurn, jcimTabEffect } = await import("@/components/KiaStickApp");
  jcimTabEffect(loader);
  const snapshot = createChatSubmitSnapshot({ question: SICK, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
  return answerChatTurn({ question: SICK, snapshot, publicSource: null, cbaSource: cba, jcimLoader: loader, runtimeVersion, jcimWaitMs: 5_000 });
}

describe("KIA-jcim-early-send-1 test 3: apwu.org failure is disclosed in the chat answer", () => {
  it("route reports unverified_current after the mocked apwu.org failure; the answer says JCIM was not checked", async () => {
    const loader = createJcimSourceLoader({ fetcher: routeFetcher as typeof fetch, timeoutMs: 5_000 });
    const answer = await sendWith(loader);
    expect(apwuCalls[0]).toMatch(/^https:\/\/apwu\.org\//);
    expect(loader.getState()).toEqual({ status: "unavailable", reason: "unverified_current" });
    expect(answer.citations.some((citation) => citation.sourceId === JCIM_SOURCE_ID)).toBe(false);
    expect(answer.noAnswer || /JCIM not checked/.test(answer.shortAnswer)).toBe(true);
    expect(answer.shortAnswer).toMatch(/JCIM not checked: .*unavailable right now/);
  });

  it("the JCIM request itself failing (mocked global fetch) is disclosed", async () => {
    const loader = createJcimSourceLoader({ timeoutMs: 5_000 }); // default fetcher = mocked global fetch
    const answer = await sendWith(loader);
    expect(loader.getState()).toEqual({ status: "unavailable", reason: "load_failed" });
    expect(answer.shortAnswer).toMatch(/JCIM not checked: .*unavailable right now/);
  });

  it("a JCIM request that hangs past the timeout is disclosed", async () => {
    const hanging = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    const loader = createJcimSourceLoader({ fetcher: hanging, timeoutMs: 25 });
    const answer = await sendWith(loader);
    expect(loader.getState()).toEqual({ status: "unavailable", reason: "load_timeout" });
    expect(answer.shortAnswer).toMatch(/JCIM not checked: .*unavailable right now/);
  });
});
