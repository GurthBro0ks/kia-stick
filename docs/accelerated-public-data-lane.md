# Accelerated Public-Data Lane

## Scope

Public, non-sensitive work against an exact operator-approved source may use a larger bounded capability bundle when the source ID, HTTPS URL, owner, sensitivity, access mode, local cache path, and runtime behavior are explicit. This lane does not authorize arbitrary URLs, arbitrary files, source discovery, background synchronization, or private data.

The first approved source is the National Labor Relations Board Weingarten Rights page under source ID `nlrb-weingarten-rights`. It is official general guidance, not an APWU source, not legal advice, and not established by this phase as controlling USPS authority. Postal applicability remains unverified.

## Required gates

Automated proof remains mandatory. Capability changes still require explicit operator QA after automated validation passes. A local implementation commit is not accepted and must not be pushed until the operator records QA PASS and authorizes closeout/push.

Accepted-state bookkeeping is folded into meaningful capability bundles. Repetitive five-version metadata-only cycles are retired. The live accepted baseline remains explicit, historical evidence remains immutable, WARN and FAIL remain visible, and neither push nor operator QA is automated.

## Sensitive-data boundary

Sensitive or private data restores the stricter approval workflow. Any future private-data work requires a separate threat model plus explicit decisions for access control, encryption, retention, deletion, backups, logging, and operator approval before implementation.

This phase does not approve APWU member data, grievance files, OWCP files, medical data, personnel data, financial data, internal-union documents, private folders, uploads, OCR, PDF parsing, embeddings, vector stores, cloud AI, or background jobs.
