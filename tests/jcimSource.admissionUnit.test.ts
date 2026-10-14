// Narrow admission-unit boundary: only exact synthetic PDF/section hashes receive
// admission pins. Semantic, rejection, routing and real-cache tests use real crypto.
import { describe, expect, it, vi } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { JCIM_SOURCE_ID } from "@/lib/jcimSource";
import { readJcimCache, validateJcimCache } from "@/lib/jcimSourceServer";
import { createJcimSourceFixtureCache, createSyntheticJcimPdfBytes } from "@/tests/fixtures/jcimSourceFixture";

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  const fixture = await import("@/tests/fixtures/jcimSourceFixture");
  const identity = await import("@/lib/jcimSource");
  const syntheticPdf = fixture.createSyntheticJcimPdfBytes();
  const syntheticSections = Buffer.from(fixture.syntheticJcimStableJson(fixture.createJcimSourceFixtureCache().normalized.sections));
  return { ...original, createHash: (...args: Parameters<typeof original.createHash>) => {
    const hash = original.createHash(...args);
    const chunks: Buffer[] = [];
    const proxy: import("node:crypto").Hash = new Proxy(hash, {
      get(target, property) {
        if (property === "update") return (data: import("node:crypto").BinaryLike, encoding?: BufferEncoding) => {
          chunks.push(typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data as Uint8Array));
          if (typeof data === "string" && encoding) target.update(data, encoding); else target.update(data);
          return proxy;
        };
        if (property === "digest") return (encoding?: import("node:crypto").BinaryToTextEncoding) => {
          const result = encoding ? target.digest(encoding) : target.digest();
          // Only exact SYNTHETIC bytes/sections receive admission pins. Every other
          // input (zeroed PDF, changed text, citation anchors, CBA) uses real hashing.
          if (args[0] === "sha256" && encoding === "hex") {
            const input = Buffer.concat(chunks);
            if (input.equals(syntheticPdf)) return identity.JCIM_SHA256;
            if (input.equals(syntheticSections)) return identity.JCIM_NORMALIZED_SHA256;
          }
          return result;
        };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    return proxy;
  } };
});

const cache = createJcimSourceFixtureCache();
const pdf = createSyntheticJcimPdfBytes();
describe("synthetic pinned-hash admission units", () => {
  it("admits only the exact synthetic baseline under pinned hashes", () => {
    expect(validateJcimCache(cache, pdf)).toBe(true);
    const temporaryRoot = mkdtempSync(path.join(realpathSync(tmpdir()), "kia-synthetic-jcim-"));
    try {
      const directory = path.join(temporaryRoot, ".kia-public-data");
      mkdirSync(directory, { mode: 0o700 });
      chmodSync(directory, 0o700);
      for (const [name, contents] of [
        [`${JCIM_SOURCE_ID}.json`, JSON.stringify(cache)],
        [`${JCIM_SOURCE_ID}.pdf`, pdf],
      ] as const) {
        const target = path.join(directory, name);
        writeFileSync(target, contents, { mode: 0o600 });
        chmodSync(target, 0o600);
      }
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(temporaryRoot);
      try {
        expect(readJcimCache().status).toBe("available");
      } finally {
        cwdSpy.mockRestore();
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
  it("fails closed on local identity, content, or section drift", () => {
    expect(validateJcimCache({ ...cache, response: { ...cache.response, lastModified: "drift" } }, pdf)).toBe(false);
    expect(validateJcimCache(cache, new Uint8Array(pdf.length))).toBe(false);
    const contentDrift = structuredClone(cache);
    contentDrift.normalized.sections[0].paragraphs[0].text += " SYNTHETIC drift";
    expect(validateJcimCache(contentDrift, pdf)).toBe(false);
    expect(validateJcimCache({ ...cache, normalized: { ...cache.normalized, sections: [
      ...cache.normalized.sections, { id: "article-18", title: "forbidden", paragraphs: [] }] } }, pdf)).toBe(false);
  });

});
