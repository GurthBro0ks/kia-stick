import { describe, expect, it, vi } from "vitest";
import { copyPublicExportText } from "@/lib/publicClipboard";

describe("public export clipboard helper", () => {
  it("uses the modern transfer before a false-positive legacy copy result", async () => {
    const text = "complete verified public export\nwith source appendix";
    let clipboardText = "sentinel";
    const modernWriteText = vi.fn(async (value: string) => {
      clipboardText = value;
    });
    const legacyCopy = vi.fn(() => true);

    await expect(copyPublicExportText(text, { modernWriteText, legacyCopy })).resolves.toBe(true);

    expect(clipboardText).toBe(text);
    expect(modernWriteText).toHaveBeenCalledOnce();
    expect(modernWriteText).toHaveBeenCalledWith(text);
    expect(legacyCopy).not.toHaveBeenCalled();
  });

  it("does not verify a false-positive legacy result after the modern API rejects", async () => {
    const text = "public export";
    const clipboardText = "sentinel";
    const modernWriteText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    const legacyCopy = vi.fn(() => true);

    await expect(copyPublicExportText(text, { modernWriteText, legacyCopy })).resolves.toBe(false);

    expect(clipboardText).toBe("sentinel");
    expect(modernWriteText).toHaveBeenCalledWith(text);
    expect(legacyCopy).toHaveBeenCalledOnce();
    expect(legacyCopy).toHaveBeenCalledWith(text);
  });

  it("treats an unverified legacy attempt as unverified when the modern API is unavailable", async () => {
    const legacyCopy = vi.fn(() => true);

    await expect(copyPublicExportText("public export", { legacyCopy })).resolves.toBe(false);

    expect(legacyCopy).toHaveBeenCalledOnce();
  });

  it("reports failure when neither clipboard path transfers the export", async () => {
    const modernWriteText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });
    const legacyCopy = vi.fn(() => false);

    await expect(copyPublicExportText("public export", { modernWriteText, legacyCopy })).resolves.toBe(false);
  });
});
