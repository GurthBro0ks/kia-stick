import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.77 next safe work checkpoint", () => {
  it("keeps the new local checkpoint unpushed and all blocked states closed", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1177_next_safe_work_checkpoint;
    expect(state.current_accepted_pushed_short_commit).toBe("ab1878e");
    expect(state.local_checkpoint_validation).toBe("PASS");
    expect(state.local_checkpoint_pushed).toBe(false);
    expect(state.local_checkpoint_manual_qa_status).toBe("pending_operator_review");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.v0912c_status).toBe("blocked_pending_exact_target");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
