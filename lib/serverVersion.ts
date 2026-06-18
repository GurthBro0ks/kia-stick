import { execFileSync } from "node:child_process";
import { clientVersion, type RuntimeVersion } from "@/lib/version";

function readGitSha(): string {
  if (process.env.NEXT_PUBLIC_GIT_SHA) return process.env.NEXT_PUBLIC_GIT_SHA;
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "uncommitted-local";
  }
}

export function getRuntimeVersion(): RuntimeVersion {
  return {
    ...clientVersion,
    gitSha: readGitSha(),
    provider: process.env.NEXT_PUBLIC_KIA_PROVIDER ?? clientVersion.provider,
  };
}
