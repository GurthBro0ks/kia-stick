import { describe, expect, it } from "vitest";
import { publicSourcesHealth } from "@/lib/publicSourcesHealth";

// E review N2: /health no longer hard-codes publicSources.available: true.
const up = () => ({ status: "available" as const });
const down = (reason: string) => () => ({ status: "unavailable" as const, reason });

describe("/health public-source block", () => {
  it("is available only when all three local caches validate", () => {
    expect(publicSourcesHealth({ cba: up, nlrb: up, jcim: up })).toEqual({
      count: 3,
      accessMode: "exact_allowlisted_read_only",
      available: true,
      sources: { cba: { status: "available" }, nlrb: { status: "available" }, jcim: { status: "available" } },
      jcimLiveIdentity: "not_checked_by_health",
    });
  });
  it.each([
    ["cba", { cba: down("cache_unsafe"), nlrb: up, jcim: up }],
    ["nlrb", { cba: up, nlrb: down("cache_missing"), jcim: up }],
    ["jcim", { cba: up, nlrb: up, jcim: down("drift_detected") }],
  ] as const)("reports %s unavailable with its reason", (id, readers) => {
    const health = publicSourcesHealth(readers);
    expect(health.available).toBe(false);
    expect(health.sources[id].status).toBe("unavailable");
    expect(health.sources[id]).toHaveProperty("reason");
  });
  it("never forwards cache contents", () => {
    const health = publicSourcesHealth({ cba: () => ({ status: "available", source: { secret: 1 } } as never), nlrb: up, jcim: up });
    expect(JSON.stringify(health)).not.toContain("secret");
  });
});
