import { execFileSync } from "node:child_process";
import { createRuntimeVersion, type RuntimeVersion, UNKNOWN_GIT_SHA, utcBuildDate } from "@/lib/version";

function readGitSha(): string {
  if (process.env.NEXT_PUBLIC_GIT_SHA) return process.env.NEXT_PUBLIC_GIT_SHA;
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return UNKNOWN_GIT_SHA;
  }
}

export function getRuntimeVersion(): RuntimeVersion {
  return createRuntimeVersion({
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE ?? process.env.KIA_BUILD_DATE ?? utcBuildDate(),
    channel: process.env.NEXT_PUBLIC_KIA_CHANNEL ?? process.env.KIA_CHANNEL,
    gitSha: readGitSha(),
    provider: process.env.NEXT_PUBLIC_KIA_PROVIDER ?? process.env.KIA_PROVIDER,
  });
}
