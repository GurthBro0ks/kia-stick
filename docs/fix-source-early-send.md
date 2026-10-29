# Fix: CBA and NLRB early send (KIA-source-early-send-1)

## The bug

The Reviewer's findings D1, D2 and D3 are in `evidence/KIA-box-served-app-move-jcim-1-review.md`. If a question was sent
right after the page opened, before the CBA or NLRB Weingarten source had loaded, the chat used the source state it had
captured at click time. That state was still "loading", so the answer code got `null` and gave the operator
"unavailable" answer:

- CBA lane: "The exact allowlisted CBA cache is unavailable", plus `Run node scripts/public-source-sync.mjs ...`.
- NLRB lane: "The allowlisted public source is unavailable", plus "Run the explicit operator sync command".

Neither was true. The source was simply still loading, and asking again a moment later gave the normal answer.

D3 was a related problem. JCIM was already awaited at answer time, but CBA and NLRB stayed frozen at click time. So a
sick-leave question could wait for JCIM and still be answered with no CBA.

## Fix: the same bounded wait as JCIM

`lib/sourceLoader.ts` adds a small loader shared by both sources. The app makes one loader per source for the life of
the page:

- `createCbaSourceLoader()` loads `/api/public-cba-source`.
- `createPublicSourceLoader()` loads `/api/public-source`.

How the loaders behave:

- **One fetch per page load.** `ensureLoaded()` starts the fetch the first time and does nothing after that. There is
  no retry and no refetch on a tab change. Every waiter shares the one in-flight request.
- **Read at answer time.** `answerChatTurn` reads each loader when it builds the answer, not when Send is clicked.
  A source is waited on only when the routed lane needs it:
  - the CBA lane needs CBA, and also NLRB because of the cross-source intent;
  - the NLRB and public lanes need NLRB.
- **The wait is bounded.** `SOURCE_LOAD_TIMEOUT_MS = 15000` is the same value and pattern as `JCIM_LOAD_TIMEOUT_MS`.
  CBA, NLRB and JCIM are awaited in parallel, so the worst case is still about 15 s, not 45 s.
- **The fetch itself is never aborted.** If the 15 s wait runs out, "still loading" is accurate. A later question uses
  the source as soon as it lands.

## What the user sees

| Source state when the answer is built | Answer |
| --- | --- |
| Loaded, including after a short wait | The normal answer, exactly as before: same text, citations and packet. Sick leave still gives 4 citations, including JCIM Article 10.5. |
| Still loading after 15 s | A no-answer: "The APWU-USPS CBA / NLRB Weingarten guidance was still loading when this question was sent ... Ask again in a moment." 0 citations, no sync instruction. |
| The request failed (network error, non-JSON reply) | A different no-answer: "... couldn't be loaded in this page (the request to the local app failed) ... Reload the page and try again." 0 citations, no sync instruction. |
| The route really reports the cache as unavailable or unsafe | Unchanged: today's message, including the operator sync instruction. |

The two not-loaded answers are built in `lib/chatAnswerRouter.ts` by `sourceNotLoadedAnswer`. It starts from the
existing unavailable answer and replaces only the wording, sets citations to `[]`, and sets `noAnswer` and
`bestGuessDisabled` to true.

## Unchanged

The following are not changed:

- Retrieval, answer text, citations, packets and the golden outputs for a loaded source.
- `lib/cbaAnswer.ts`, `lib/publicSourceAnswer.ts`, `lib/jcimSource.ts` and `lib/jcimAnswer.ts`.
- The JCIM loader.
- Dependencies, the lockfile, routes and data.

Callers that pass a settled `cbaSource` / `publicSource` to `answerChatTurn` directly, as the older tests do, get the
same behavior as before.

## Tests

All tests use mocked or deferred fetch and synthetic fixtures, with no network access.

`tests/sourceEarlySend.answer.test.ts` covers:

- CBA and NLRB loads that are deferred and then released, never resolve, fail, return non-JSON, or are reported
  unavailable by the route;
- the default wait with no override, using the Reviewer N10 pattern: an early send with the load landing 50 ms later
  still gets the normal answer;
- D3, where CBA is read at answer time behind a slower JCIM;
- a no-source lane that never waits;
- one fetch per source across repeated sends and a failure.

`tests/sourceEarlySend.loader.test.ts` covers:

- the loader contract: a shared in-flight load, timeout to "loading", `load_failed`, `cache_unsafe`, and no retry;
- the 15 s constant;
- a source-text check that `completeAssistantTurn` passes the loaders, not click-time state.
