# KIA Stick v0.7 Release Note

Phase: `KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0`

Product version: `0.7.0`

Prompt version: `prompt.fake-docs.v0.5-import-wizard-hardening`

## Summary

KIA Stick now reports product/runtime version `0.7.0`. This is a release-identity catch-up bump only, following `docs/v0.7.1-product-version-bump-plan.md`.

The bump records that the accepted v0.5 fake-only tooling, v0.6 planning/safety artifacts, and v0.7 decision checkpoint have moved beyond the earlier held `0.4.0` product identity. It does not add a new runtime workflow or any real-document capability.

## Version Contract

- `lib/version.ts` owns `PRODUCT_VERSION = "0.7.0"`.
- `package.json` and `package-lock.json` use version `0.7.0`.
- `/health`, `/version`, app UI metadata, answer footers, and saved-answer metadata derive product identity from the shared runtime version object.
- `displayVersion` remains `productVersion-channel.buildDate+gitSha`.
- `corpusVersion`, `indexVersion`, `promptVersion`, and provider remain separate from product version.
- `promptVersion` remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## Not Approved

This release does not approve real-document implementation. It does not add file pickers, path readers, file reads, copying, OCR, upload handlers, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, credentials, or private-data commits.

## Validation

Required validation for this bump:

- `npm run release:check`
- `npm run qa`
- `npm run proof:latest`
- `npm run closeout:review`
- `npm run closeout:summary`
- `npm run scan:fake`
- `npm run scan:privacy`
- `git diff --check`
- `git status --short`

The validation proof must remain GitHub-safe and contain only sanitized command names, version strings, commit IDs, booleans, counts, and PASS/WARN/FAIL labels.
