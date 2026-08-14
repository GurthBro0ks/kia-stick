import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import {
  currentAcceptedPushedState,
  localBundleManualQaLabel,
  localDataModeLabel,
} from "@/lib/acceptedState";
import { corpus, sourceClassLabels } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const version = getRuntimeVersion();
  return {
    title: `KIA Stick ${version.displayVersion}`,
    description: `KIA Stick build identity: Display ${version.displayVersion}; Product ${version.productVersion}; Channel ${version.channel}; Build date ${version.buildDate}; Git ${version.gitSha}; Corpus ${version.corpusVersion}; Index ${version.indexVersion}; Prompt ${version.promptVersion}; Provider ${version.provider}.`,
  };
}

export default function VersionPage() {
  const version = getRuntimeVersion();

  return (
    <main className="versionPage">
      <section className="versionHero">
        <span className="sectionKicker">Build Identity</span>
        <h1>{version.displayVersion}</h1>
        <p>
          Product {version.productVersion} changes only at milestone phases. Build identity uses channel, UTC build date, and Git SHA.
        </p>
        <Link className="button versionBack" href="/">
          Back to KIA Stick
        </Link>
      </section>

      <section className="tabPanel">
        <div className="panelHeader">
          <h2>Runtime</h2>
          <span>{localDataModeLabel()}</span>
        </div>
        <dl className="versionGrid">
          <dt>Display Version</dt>
          <dd>{version.displayVersion}</dd>
          <dt>Product Version</dt>
          <dd>{version.productVersion}</dd>
          <dt>Channel</dt>
          <dd>{version.channel}</dd>
          <dt>Build Date</dt>
          <dd>{version.buildDate}</dd>
          <dt>Git SHA</dt>
          <dd>{version.gitSha}</dd>
          <dt>Corpus</dt>
          <dd>{version.corpusVersion}</dd>
          <dt>Index</dt>
          <dd>{version.indexVersion}</dd>
          <dt>Prompt</dt>
          <dd>{version.promptVersion}</dd>
          <dt>Provider</dt>
          <dd>{version.provider}</dd>
          <dt>Current Local Phase</dt>
          <dd>{currentAcceptedPushedState.local_bundle_phase}</dd>
          <dt>Current Local Validation</dt>
          <dd>{currentAcceptedPushedState.local_bundle_validation}</dd>
          <dt>Current Local Pushed</dt>
          <dd>{currentAcceptedPushedState.local_bundle_pushed ? "yes" : "no"}</dd>
          <dt>Current Local Manual QA</dt>
          <dd>{localBundleManualQaLabel()}</dd>
          <dt>Accepted Capability</dt>
          <dd>{currentAcceptedPushedState.accepted_pushed_short_commit}</dd>
        </dl>
      </section>

      <section className="tabPanel">
        <div className="panelHeader">
          <h2>Source Classes</h2>
          <span>{corpus.sourceClasses.length} classes</span>
        </div>
        <div className="sourceClassGrid">
          {corpus.sourceClasses.map((sourceClass) => (
            <span key={sourceClass}>{sourceClassLabels[sourceClass]}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
