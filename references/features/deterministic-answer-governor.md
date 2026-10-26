# Deterministic answer governor

Feature id: `deterministic_answer_governor`

Product entry: `buildAnswer` in `lib/answerGovernor.ts`.

## What a caller can do

Ask one fake-corpus question and receive a governed answer: an intent, a no-answer flag, ordered fake citations, and a short answer. The chat screen uses this same function for sample questions. This map covers the library journey only.

## Synthetic journey

Question: `Can annual leave be denied after I submitted inside the fake window?`

Options: Strict Research, All Fake, Detailed.

Observed shape when the pinned product baseline is loaded:

- intent `annual_leave`
- an answer is allowed (`noAnswer` false, best-guess block off)
- three fake citation ids, in governor order: `fake-local-annual-leave-window`, `fake-past-practice-vacation-board`, `fake-official-annual-leave`
- citation classes include controlling contract language
- product version `0.7.0`
- provider `local-fake-deterministic`

The short answer is checked by SHA-256 in `slimy-verify/fixtures/annual-leave-question.json`. The sentence stays in the product module.

## Adapter

`slimy-verify/prepare.py` resolves the approved `python3` and `node` aliases once and writes a gitignored manifest and binding. `slimy-verify/hooks/journey.py` then execs that bound Node and loads the module with the repo path alias. It does not search `PATH`, start the web server, write a saved answer, or call a public-source route.

## Out of this map

Public CBA routing, JCIM text, steward packets, the browser shell, and any live or production data.
