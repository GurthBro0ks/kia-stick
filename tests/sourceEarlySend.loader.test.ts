import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { JCIM_LOAD_TIMEOUT_MS } from "@/lib/jcimSource";
import { createSourceLoader, SOURCE_LOAD_TIMEOUT_MS, sourceForAnswer } from "@/lib/sourceLoader";

// KIA-source-early-send-1: the shared CBA/NLRB loader and the app wiring. Mocked fetch only; no network.
type Reason = "cache_missing" | "cache_unsafe";

function controllable() {
  let resolveFn: ((response: Response) => void) | null = null;
  let rejectFn: ((error: Error) => void) | null = null;
  const fetcher = vi.fn(() => new Promise<Response>((resolve, reject) => { resolveFn = resolve; rejectFn = reject; }));
  return {
    fetcher: fetcher as unknown as typeof fetch,
    mock: fetcher,
    release: (payload: unknown) => resolveFn?.(new Response(JSON.stringify(payload))),
    fail: () => rejectFn?.(new TypeError("Failed to fetch")),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("KIA-source-early-send-1 shared source loader", () => {
  it("uses the same 15 s bound as JCIM", () => {
    expect(SOURCE_LOAD_TIMEOUT_MS).toBe(15000);
    expect(SOURCE_LOAD_TIMEOUT_MS).toBe(JCIM_LOAD_TIMEOUT_MS);
  });

  it("one in-flight load: concurrent waiters share the single fetch and all see the loaded state", async () => {
    const c = controllable();
    const loader = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: c.fetcher });
    const seen: string[] = [];
    loader.subscribe((state) => seen.push(state.status));
    const a = sourceForAnswer(loader, true, 5_000);
    const b = sourceForAnswer(loader, true, 5_000);
    loader.ensureLoaded();
    await flush();
    c.release({ status: "available", source: "S" });
    expect(await a).toEqual({ source: "S", status: "available" });
    expect(await b).toEqual({ source: "S", status: "available" });
    expect(c.mock).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(["available"]);
  });

  it("times out to 'loading' when the fetch is still in flight, and a later answer gets the loaded source without refetching", async () => {
    const c = controllable();
    const loader = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: c.fetcher });
    expect(await sourceForAnswer(loader, true, 10)).toEqual({ source: null, status: "loading" });
    c.release({ status: "available", source: "S" });
    await flush();
    expect(await sourceForAnswer(loader, true, 10)).toEqual({ source: "S", status: "available" });
    expect(c.mock).toHaveBeenCalledTimes(1);
  });

  it("a lane that does not need the source does not wait for it", async () => {
    const c = controllable();
    const loader = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: c.fetcher });
    expect(await sourceForAnswer(loader, false, 60_000)).toEqual({ source: null, status: "loading" });
  });

  it("fetch error -> load_failed (no retry); route unavailable -> its reason; malformed payload -> cache_unsafe", async () => {
    const failing = controllable();
    const failed = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: failing.fetcher });
    failed.ensureLoaded();
    await flush();
    failing.fail();
    expect(await failed.whenSettled(1_000)).toEqual({ status: "unavailable", reason: "load_failed" });
    expect(await sourceForAnswer(failed, true, 1_000)).toEqual({ source: null, status: "load_failed" });
    failed.ensureLoaded();
    expect(failing.mock).toHaveBeenCalledTimes(1);

    const routed = controllable();
    const missing = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: routed.fetcher });
    missing.ensureLoaded();
    await flush();
    routed.release({ status: "unavailable", reason: "cache_missing" });
    expect(await missing.whenSettled(1_000)).toEqual({ status: "unavailable", reason: "cache_missing" });
    expect(await sourceForAnswer(missing, true, 1_000)).toEqual({ source: null, status: "unavailable" });

    const odd = controllable();
    const malformed = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: odd.fetcher });
    malformed.ensureLoaded();
    await flush();
    odd.release({ hello: "world" });
    expect(await malformed.whenSettled(1_000)).toEqual({ status: "unavailable", reason: "cache_unsafe" });
  });

  it("a settled state never changes again, even if a subscriber throws while the load lands", async () => {
    const c = controllable();
    const loader = createSourceLoader<string, Reason>({ url: "/api/x", fetcher: c.fetcher });
    loader.subscribe(() => { throw new Error("listener bug"); });
    loader.ensureLoaded();
    await flush();
    c.release({ status: "available", source: "S" });
    await flush();
    await flush();
    expect(loader.getState()).toEqual({ status: "available", source: "S" });
    expect(c.mock).toHaveBeenCalledTimes(1);
  });
});

describe("KIA-source-early-send-1 app wiring (source tripwire; no DOM test environment)", () => {
  const app = readFileSync(path.join(process.cwd(), "components/KiaStickApp.tsx"), "utf8");

  it("completeAssistantTurn hands answerChatTurn the CBA/NLRB loaders, not click-time state, and no wait override", () => {
    const start = app.indexOf("function completeAssistantTurn(");
    expect(start).toBeGreaterThan(0);
    const callStart = app.indexOf("await answerChatTurn({", start);
    expect(callStart).toBeGreaterThan(start);
    const args = app.slice(callStart, app.indexOf("});", callStart));
    expect(args).toMatch(/\bcbaSourceLoader,/);
    expect(args).toMatch(/\bpublicSourceLoader,/);
    expect(args).not.toMatch(/\bcbaSource:|\bpublicSource:|cbaSourceState|publicSourceState|sourceWaitMs/);
  });

  it("each source is fetched only through its page-lifetime loader (no direct fetch, no tab-dependent refetch)", () => {
    // The only direct request for each route is the default fetcher inside its page-lifetime loader factory.
    expect(app.match(/fetch\("\/api\/public-cba-source"/g)).toHaveLength(1);
    expect(app.match(/fetch\("\/api\/public-source"/g)).toHaveLength(1);
    expect(app).toMatch(/createCbaSourceLoader\(fetcher\?: typeof fetch\)[^]*?fetch\("\/api\/public-cba-source", init\)\) \}\);\n\}/);
    expect(app).toMatch(/createPublicSourceLoader\(fetcher\?: typeof fetch\)[^]*?fetch\("\/api\/public-source", init\)\) \}\);\n\}/);
    expect(app).toMatch(/useState<CbaSourceLoader>\(\(\) => createCbaSourceLoader\(\)\)/);
    expect(app).toMatch(/useState<PublicSourceLoader>\(\(\) => createPublicSourceLoader\(\)\)/);
    expect(app).toMatch(/cbaSourceLoader\.ensureLoaded\(\);\n\s*return unsubscribe;\n\s*\}, \[cbaSourceLoader\]\);/);
    expect(app).toMatch(/publicSourceLoader\.ensureLoaded\(\);\n\s*return unsubscribe;\n\s*\}, \[publicSourceLoader\]\);/);
  });
});
