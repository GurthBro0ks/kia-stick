import { readBoundedCbaSourceCache } from "@/lib/cbaSourceServer";
import { readJcimCache } from "@/lib/jcimSourceServer";
import { readBoundedPublicSourceCache } from "@/lib/publicSourceServer";

type SourceState = { status: "available" } | { status: "unavailable"; reason: string };

export interface PublicSourceReaders {
  cba: () => SourceState;
  nlrb: () => SourceState;
  jcim: () => SourceState;
}

const defaultReaders: PublicSourceReaders = {
  cba: readBoundedCbaSourceCache,
  nlrb: readBoundedPublicSourceCache,
  jcim: readJcimCache,
};

function summary(state: SourceState): { status: "available" } | { status: "unavailable"; reason: string } {
  return state.status === "available" ? { status: "available" } : { status: "unavailable", reason: state.reason };
}

/**
 * /health public-source block (E review N2): `available` is true only when every local cache validates. JCIM reports the
 * local cache check only; the live apwu.org identity check runs in /api/public-jcim-source, never in /health.
 */
export function publicSourcesHealth(readers: PublicSourceReaders = defaultReaders) {
  const sources = { cba: summary(readers.cba()), nlrb: summary(readers.nlrb()), jcim: summary(readers.jcim()) };
  return {
    count: 3,
    accessMode: "exact_allowlisted_read_only" as const,
    available: Object.values(sources).every((source) => source.status === "available"),
    sources,
    jcimLiveIdentity: "not_checked_by_health" as const,
  };
}
