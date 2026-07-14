import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.37 next safe work checkpoint", () => {
  it("keeps the refresh local-only and blocked states intact", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1137_next_safe_work_checkpoint;
    expect(state.current_accepted_pushed_short_commit).toBe("05cb559");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("pending_operator_review");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.v0912c_status).toBe("blocked_pending_exact_target");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
