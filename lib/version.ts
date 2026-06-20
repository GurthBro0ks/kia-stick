import { corpus } from "@/lib/sourceModel";

export interface RuntimeVersion {
  productVersion: string;
  channel: string;
  buildDate: string;
  gitSha: string;
  displayVersion: string;
  corpusVersion: string;
  indexVersion: string;
  promptVersion: string;
  provider: string;
}

export const PRODUCT_VERSION = "0.4.0";
export const DEFAULT_CHANNEL = "dev";
export const PROMPT_VERSION = "prompt.fake-docs.v0.4-vault-hardening";
export const DEFAULT_PROVIDER = "local-fake-deterministic";
export const UNKNOWN_GIT_SHA = "unknown";

export const runtimeVersionFields = [
  "productVersion",
  "channel",
  "buildDate",
  "gitSha",
  "displayVersion",
  "corpusVersion",
  "indexVersion",
  "promptVersion",
  "provider",
] as const satisfies readonly (keyof RuntimeVersion)[];

export function utcBuildDate(date = new Date()): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function validBuildDate(value: string | undefined): string {
  return value && /^\d{8}$/.test(value) ? value : utcBuildDate();
}

function validChannel(value: string | undefined): string {
  if (!value) return DEFAULT_CHANNEL;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9.-]*$/.test(normalized) ? normalized : DEFAULT_CHANNEL;
}

function validGitSha(value: string | undefined): string {
  if (!value) return UNKNOWN_GIT_SHA;
  const normalized = value.trim();
  return /^[a-z0-9]+$/i.test(normalized) ? normalized : UNKNOWN_GIT_SHA;
}

export function buildDisplayVersion(productVersion: string, channel: string, buildDate: string, gitSha: string): string {
  return `${productVersion}-${channel}.${buildDate}+${gitSha}`;
}

export function createRuntimeVersion(overrides: Partial<Omit<RuntimeVersion, "displayVersion">> = {}): RuntimeVersion {
  const productVersion = overrides.productVersion ?? PRODUCT_VERSION;
  const channel = validChannel(overrides.channel ?? process.env.NEXT_PUBLIC_KIA_CHANNEL);
  const buildDate = validBuildDate(overrides.buildDate ?? process.env.NEXT_PUBLIC_BUILD_DATE);
  const gitSha = validGitSha(overrides.gitSha ?? process.env.NEXT_PUBLIC_GIT_SHA);
  const provider = overrides.provider ?? process.env.NEXT_PUBLIC_KIA_PROVIDER ?? DEFAULT_PROVIDER;

  return {
    productVersion,
    channel,
    buildDate,
    gitSha,
    displayVersion: buildDisplayVersion(productVersion, channel, buildDate, gitSha),
    corpusVersion: overrides.corpusVersion ?? corpus.corpusVersion,
    indexVersion: overrides.indexVersion ?? corpus.indexVersion,
    promptVersion: overrides.promptVersion ?? PROMPT_VERSION,
    provider,
  };
}

export const clientVersion: RuntimeVersion = createRuntimeVersion();
