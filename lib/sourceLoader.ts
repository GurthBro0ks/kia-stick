import type { AnswerResult } from "@/lib/answerGovernor";

/**
 * KIA-source-early-send-1: one shared, awaitable load per public source (CBA, NLRB Weingarten).
 *
 * The app starts each source fetch once per page load. A chat answer reads the loader at answer time and waits,
 * bounded by SOURCE_LOAD_TIMEOUT_MS, while the fetch is still in flight. That way an early question no longer sees a
 * click-time "loading" snapshot as "cache unavailable".
 */

/** Bound on the wait an early Send makes for a CBA or NLRB load (same 15 s pattern as JCIM_LOAD_TIMEOUT_MS). */
export const SOURCE_LOAD_TIMEOUT_MS = 15000 as const;

/** Client-side load state. "load_failed" is client-only (the request or its JSON failed); other reasons come from the route. */
export type SourceLoadState<TSource, TReason extends string> =
  | { status: "loading" }
  | { status: "available"; source: TSource }
  | { status: "unavailable"; reason: TReason | "load_failed" };

export interface SourceLoader<TSource, TReason extends string> {
  getState(): SourceLoadState<TSource, TReason>;
  subscribe(listener: (state: SourceLoadState<TSource, TReason>) => void): () => void;
  /** Starts the fetch the first time it is called. Later calls do nothing: at most one fetch per loader (page load). */
  ensureLoaded(): void;
  /** Resolves once the state is no longer "loading", or after waitMs with the (still loading) state. */
  whenSettled(waitMs?: number): Promise<SourceLoadState<TSource, TReason>>;
}

export function createSourceLoader<TSource, TReason extends string>(options: {
  url: string;
  fetcher?: typeof fetch;
}): SourceLoader<TSource, TReason> {
  type State = SourceLoadState<TSource, TReason>;
  let state: State = { status: "loading" };
  let started = false;
  const listeners = new Set<(state: State) => void>();
  const settle = (next: State) => {
    if (state.status !== "loading") return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    ensureLoaded() {
      if (started) return;
      started = true;
      const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
      Promise.resolve()
        .then(() => fetcher(options.url, { method: "GET", cache: "no-store" }))
        .then(async (response) => {
          const payload = (await response.json()) as { status?: unknown; source?: unknown; reason?: unknown } | null;
          if (payload?.status === "available" && payload.source) settle({ status: "available", source: payload.source as TSource });
          else if (payload?.status === "unavailable") settle({ status: "unavailable", reason: payload.reason as TReason });
          else settle({ status: "unavailable", reason: "cache_unsafe" as TReason });
        })
        .catch(() => settle({ status: "unavailable", reason: "load_failed" }));
    },
    whenSettled(waitMs = SOURCE_LOAD_TIMEOUT_MS) {
      if (state.status !== "loading") return Promise.resolve(state);
      return new Promise((resolve) => {
        const done = () => { clearTimeout(timer); listeners.delete(onChange); resolve(state); };
        const onChange = (next: State) => { if (next.status !== "loading") done(); };
        const timer = setTimeout(done, waitMs);
        listeners.add(onChange);
      });
    },
  };
}

/** What an answer knew about a source: loaded, still loading, the request failed, or the route reported it unavailable. */
export type SourceCheckStatus = "available" | "loading" | "load_failed" | "unavailable";

/** Source input for one answer, read at answer time; waits (bounded) for an in-flight load only when the lane needs it. */
export async function sourceForAnswer<TSource, TReason extends string>(loader: SourceLoader<TSource, TReason>, needed: boolean,
  waitMs: number = SOURCE_LOAD_TIMEOUT_MS): Promise<{ source: TSource | null; status: SourceCheckStatus }> {
  loader.ensureLoaded();
  const state = needed ? await loader.whenSettled(waitMs) : loader.getState();
  if (state.status === "available") return { source: state.source, status: "available" };
  if (state.status === "loading") return { source: null, status: "loading" };
  return { source: null, status: state.reason === "load_failed" ? "load_failed" : "unavailable" };
}

export const SOURCE_STILL_LOADING_FOLLOW_UP = "Wait a moment for the source to finish loading, then ask the question again." as const;
export const SOURCE_LOAD_FAILED_FOLLOW_UP = "Reload the page, then ask the question again." as const;

/**
 * Replaces the "cache unavailable / run public-source-sync" wording of a lane's no-source answer when the source was
 * only still loading, or when this page's request for it failed. A real route-reported unavailable status never
 * comes here and keeps its existing message.
 */
export function sourceNotLoadedAnswer(answer: AnswerResult, sourceLabel: string, status: "loading" | "load_failed"): AnswerResult {
  const loading = status === "loading";
  return {
    ...answer,
    shortAnswer: loading
      ? `The ${sourceLabel} was still loading when this question was sent, so it was not checked and no answer was given. No other source, path, or fake answer lane was substituted. Ask again in a moment.`
      : `The ${sourceLabel} couldn't be loaded in this page (the request to the local app failed), so it was not checked and no answer was given. No other source, path, or fake answer lane was substituted. Reload the page and try again.`,
    noAnswer: true,
    bestGuessDisabled: true,
    citations: [],
    conflicts: [loading ? `The ${sourceLabel} had not finished loading when this answer was prepared.` : `This page could not load the ${sourceLabel}.`],
    missingFacts: [loading ? `The ${sourceLabel}, which was still loading.` : `The ${sourceLabel}, which this page could not load.`],
    followUps: [loading ? SOURCE_STILL_LOADING_FOLLOW_UP : SOURCE_LOAD_FAILED_FOLLOW_UP],
    suggestedQuestions: undefined,
  };
}
