import type { Metadata } from "next";
import { corpus, sourceClassLabels } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const version = getRuntimeVersion();
  return {
    title: "KIA Stick Version",
    description: `KIA Stick Version: App ${version.appVersion}; Git ${version.gitSha}; Corpus ${version.corpusVersion}; Index ${version.indexVersion}; Prompt ${version.promptVersion}; Provider ${version.provider}.`,
  };
}

export default function VersionPage() {
  const version = getRuntimeVersion();

  return (
    <main className="versionPage">
      <section className="versionHero">
        <h1>KIA Stick Version</h1>
        <p>
          App {version.appVersion} · Git {version.gitSha} · Corpus {version.corpusVersion} · Index {version.indexVersion} · Prompt{" "}
          {version.promptVersion} · Provider {version.provider}
        </p>
      </section>

      <section className="tabPanel">
        <div className="panelHeader">
          <h2>Runtime</h2>
          <span>fake-only local</span>
        </div>
        <dl className="versionGrid">
          <dt>App</dt>
          <dd>{version.appVersion}</dd>
          <dt>Git</dt>
          <dd>{version.gitSha}</dd>
          <dt>Corpus</dt>
          <dd>{version.corpusVersion}</dd>
          <dt>Index</dt>
          <dd>{version.indexVersion}</dd>
          <dt>Prompt</dt>
          <dd>{version.promptVersion}</dd>
          <dt>Provider</dt>
          <dd>{version.provider}</dd>
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
