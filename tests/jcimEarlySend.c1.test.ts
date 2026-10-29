import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JCIM_LOAD_TIMEOUT_MS } from "@/lib/jcimSource";

// KIA-jcim-early-send-1 review condition C1: pin the wait timeout and the app wiring that
// the exported-function tests cannot reach (no DOM test environment without a dependency change).
const appSource = () => readFileSync(path.join(process.cwd(), "components/KiaStickApp.tsx"), "utf8");

function callArgs(source: string, fromMarker: string, call: string): string {
  const from = source.indexOf(fromMarker);
  expect(from).toBeGreaterThan(0);
  const start = source.indexOf(call, from);
  expect(start).toBeGreaterThan(from);
  const end = source.indexOf("});", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("KIA-jcim-early-send-1 C1: timeout and app wiring", () => {
  it("the JCIM wait timeout is 15000 ms", () => {
    expect(JCIM_LOAD_TIMEOUT_MS).toBe(15000);
  });

  it("the app's packet build passes the current JCIM status", () => {
    const args = callArgs(appSource(), "function buildStewardPacketWorkspace(", "buildPublicStewardPacket({");
    expect(args).toMatch(/\n\s*jcimStatus: jcimSourceState\.status,\n/);
  });

  it("the send path passes no JCIM wait override, so it uses the default timeout", () => {
    const args = callArgs(appSource(), "function completeAssistantTurn(", "await answerChatTurn({");
    expect(args).toContain("jcimLoader,");
    expect(args).not.toMatch(/jcimWaitMs/);
  });
});
