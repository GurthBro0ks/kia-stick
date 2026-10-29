# Fix: JCIM early send (KIA-jcim-early-send-1)

## The bug

Found in relocate-1. A chat question sent before the JCIM joint interpretation finished loading was answered from the
contract (CBA) alone, with nothing saying JCIM had been skipped. The sick-leave answer showed 3 citations instead of 4.

Causes in `components/KiaStickApp.tsx` at e23ece01:

- The JCIM effect ran on every tab change. Each run reset JCIM to `loading` and fetched `/api/public-jcim-source` again.
  That route checks apwu.org on every request.
- `completeAssistantTurn` read `jcimSourceState` from the render that started the send (a stale closure). It never
  waited for the load.
- `enrichCbaAnswerWithJcim` (`lib/jcimAnswer.ts`) returned the contract-only answer silently when JCIM was missing.

## Option chosen: (a) bounded wait

A chat answer in the contract lane waits for the JCIM load to settle. The wait lasts at most `JCIM_LOAD_TIMEOUT_MS`
(15 s, `lib/jcimSource.ts`). The usual pending assistant message stays on screen while it waits. The screen-reader
region is not changed, so the UX-8 rule of one announcement per completion path still holds. The answer is computed
once the load settles.

If JCIM is still missing at answer time, the answer says so plainly. This happens when the load failed, apwu.org could
not be verified, the route reported an unavailable cache, or the 15 s wait ran out. One of these sentences is appended
to the short answer:

- `JCIM not checked: the JCIM joint interpretation was still loading ...` (the wait ran out with JCIM still loading)
- `JCIM not checked: the JCIM joint interpretation is unavailable right now ...` (the load failed, timed out or was refused)

Why (a) and not (b), disclose and recompute: the answer is computed once, after the wait. So a chat answer and the
saved copy of it can never disagree with each other, and the thread history needs no rewriting. The 15 s cap keeps a
hung apwu.org check from blocking chat indefinitely.

## Loading

`createJcimSourceLoader` (in `lib/jcimSource.ts`) holds the JCIM state for the app:

- It fetches once. A tab change calls `ensureLoaded()`, which does nothing while a fetch is in flight or once JCIM is
  available.
- It retries only while JCIM is unavailable.
- It never resets loaded data to `loading`, and a failed retry never replaces loaded data.
- Each fetch is aborted after 15 s and then reports `unavailable` with reason `load_timeout`. A network error reports
  `load_failed`.

## Saved answers and packets

- **Saved chat answers** store the rendered answer, so the disclosure is saved with it.
- **Steward packets** built while JCIM is not available carry `jcimDisclosure`. It appears in the packet view, the
  text export, the markdown export and the saved record. It is part of the packet's content identity, so an export
  check catches a packet whose disclosure was removed.
- **Packets built with JCIM loaded** are unchanged. So is any caller that passes no JCIM status, which keeps goldens
  and existing tests byte-identical.

## Unchanged

- With JCIM loaded, answers are identical. Sick leave still cites JCIM 10.5, and the cold question still cites
  CBA Art 14 §6 plus JCIM 14.1.
- No-answer results (including all 19 B-5 rows) never get the disclosure and keep 0 citations.
- Grievance outlines and argument plans are contract-only by design and already say JCIM is not verified there.

## Tests

| File | Test |
|---|---|
| `tests/jcimEarlySend.answer.test.ts` | 1: answer code |
| `tests/jcimEarlySend.component.test.ts` | 2: early Send, and a Sources→Chat switch |
| `tests/jcimEarlySend.apwuFailure.test.ts` | 3: apwu.org failure through the real route handler, with mocked fetch |
| `tests/jcimEarlySend.saved.test.ts` | 4: saved answer and packet |
| `tests/jcimEarlySend.regression.test.ts` | the B-5 rows |

The repo has no DOM test environment, and adding one would be a dependency change. So the component test drives the
functions `KiaStickApp` calls, `answerChatTurn` and `jcimTabEffect`, and checks the component wiring from its source text.
