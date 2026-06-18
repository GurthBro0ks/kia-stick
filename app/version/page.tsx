import { corpus, sourceClassLabels } from "@/lib/sourceModel";
import { getRuntimeVersion } from "@/lib/serverVersion";

export default function VersionPage() {
  const version = getRuntimeVersion();

  return (
    <main className="versionPage">
      <section className="windowPanel">
        <div className="windowTitle">KIA Stick Version</div>
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

      <section className="windowPanel">
        <div className="windowTitle">Source Classes</div>
        <div className="sourceClassGrid">
          {corpus.sourceClasses.map((sourceClass) => (
            <span key={sourceClass}>{sourceClassLabels[sourceClass]}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
