import { expect, vi } from "vitest";
import { JCIM_BYTES, JCIM_LANDING_URL, JCIM_LAST_MODIFIED, JCIM_PDF_URL } from "@/lib/jcimSource";

export function createJcimLiveIdentityFetcher(bytes: Uint8Array, contentType = "application/pdf") {
  const landing = new Response(`<a href="${JCIM_PDF_URL}">PDF</a>`);
  const response = new Response(Buffer.from(bytes), { headers: {
    "content-length": String(JCIM_BYTES), "last-modified": JCIM_LAST_MODIFIED,
    "content-type": contentType,
  } });
  Object.defineProperty(landing, "url", { value: JCIM_LANDING_URL });
  Object.defineProperty(response, "url", { value: JCIM_PDF_URL });
  expect(landing.ok).toBe(true);
  expect(landing.url).toBe(JCIM_LANDING_URL);
  expect(response.ok).toBe(true);
  expect(response.url).toBe(JCIM_PDF_URL);
  expect(response.headers.get("content-length")).toBe(String(JCIM_BYTES));
  expect(response.headers.get("last-modified")).toBe(JCIM_LAST_MODIFIED);
  expect(response.headers.get("content-type")).toBe(contentType);
  const readBody = vi.spyOn(response, "arrayBuffer");
  const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
    expect([JCIM_LANDING_URL, JCIM_PDF_URL]).toContain(url);
    if (url === JCIM_LANDING_URL) return landing;
    return response;
  });
  return { fetcher: fetcher as typeof fetch, readBody };
}
