import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.27 next safe work checkpoint", () => {
  it("keeps the refresh local-only and blocked states intact", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1127_next_safe_work_checkpoint;
    expect(state.current_accepted_pushed_short_commit).toBe("0051a15");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("pending_operator_review");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.queue_015_status).toBe("blocked");
  });
});
