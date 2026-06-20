import { corpus } from "@/lib/sourceModel";

export interface RuntimeVersion {
  appVersion: string;
  gitSha: string;
  corpusVersion: string;
  indexVersion: string;
  promptVersion: string;
  provider: string;
}

export const APP_VERSION = "0.3.0";
export const PROMPT_VERSION = "prompt.fake-docs.v0.3-vault-ui";
export const DEFAULT_PROVIDER = "local-fake-deterministic";

export const clientVersion: RuntimeVersion = {
  appVersion: APP_VERSION,
  gitSha: process.env.NEXT_PUBLIC_GIT_SHA ?? "runtime-detected",
  corpusVersion: corpus.corpusVersion,
  indexVersion: corpus.indexVersion,
  promptVersion: PROMPT_VERSION,
  provider: process.env.NEXT_PUBLIC_KIA_PROVIDER ?? DEFAULT_PROVIDER,
};
