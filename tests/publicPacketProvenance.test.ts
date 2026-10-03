import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicStewardPacketView, SavedAnswersPanel } from "@/components/KiaStickApp";
import {
  buildPublicStewardPacket,
  publicStewardPacketExportEligibility,
  publicStewardPacketToMarkdown,
  publicStewardPacketToText,
} from "@/lib/publicStewardPacket";
import {
  nlrbPacketSourceVerifier,
  supplementalAuthorityRole,
  type SupplementalSourceVerifier,
} from "@/lib/publicPacketProvenance";
import { citationForPublicParagraph } from "@/lib/publicSourceAnswer";
import { cbaCitationIdentityKey, supplementalCitationIdentityKey } from "@/lib/sourceModel";
import { createSavedStewardPacketRecord, migrateSavedAnswers } from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const cba = createCbaSourceFixtureCache();
const guidance = createPublicSourceFixtureCache();
const citation = citationForPublicParagraph(guidance, guidance.normalized.sections[0], guidance.normalized.sections[0].paragraphs[0]);
const verifier = nlrbPacketSourceVerifier(guidance);
const version = createRuntimeVersion({ buildDate: "20260813", gitSha: "printqa1" });
const base = () => buildPublicStewardPacket({ source: cba, topicIds: ["annual_leave"], runtimeVersion: version, createdAt: "2026-08-13T17:00:00.000Z" })!;
const withGuidance = () => buildPublicStewardPacket({ source: cba, topicIds: ["annual_leave"], runtimeVersion: version, createdAt: "2026-08-13T17:00:00.000Z", supplementalCitations: [citation], supplementalSourceVerifiers: [verifier] })!;

function html(packet = withGuidance(), sources: SupplementalSourceVerifier[] = [verifier]) {
  return renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
    packet, source: cba, supplementalSourceVerifiers: sources,
    onCitationNavigate: () => undefined, onSave: () => undefined,
  }));
}

describe("generic public packet provenance", () => {
  it("keeps the primary eligibility gate and omits empty supplemental fields", () => {
    const primary = base();
    const empty = buildPublicStewardPacket({ source: cba, topicIds: ["annual_leave"], runtimeVersion: version, createdAt: primary.createdAt, supplementalCitations: [], supplementalSourceVerifiers: [verifier] })!;
    expect(empty).toEqual(primary);
    expect(buildPublicStewardPacket({ source: null, topicIds: ["annual_leave"], runtimeVersion: version, supplementalCitations: [citation], supplementalSourceVerifiers: [verifier] })).toBeNull();
    expect(publicStewardPacketExportEligibility(primary, cba)).toEqual({ eligible: true });
    expect(publicStewardPacketExportEligibility(primary, null, [verifier]).eligible).toBe(false);
  });

  it("pins generic source selection, deduplicates it and preserves primary identity", () => {
    const primary = base();
    const packet = withGuidance();
    const duplicate = buildPublicStewardPacket({ source: cba, topicIds: ["annual_leave"], runtimeVersion: version, createdAt: packet.createdAt, supplementalCitations: [citation, citation], supplementalSourceVerifiers: [verifier] })!;
    expect(duplicate).toEqual(packet);
    expect(packet.id).not.toBe(primary.id);
    expect(packet.contentIdentity).not.toBe(primary.contentIdentity);
    expect(packet.citations).toEqual(primary.citations);
    expect(packet.sourceAppendix).toEqual(primary.sourceAppendix);
    expect(packet.supplementalCitations).toEqual([citation]);
    expect(packet.supplementalSourceAppendix?.[0]).toMatchObject({ sourceId: citation.sourceId, authorityClass: "public_guidance", publicSourceType: "nlrb_guidance", verificationState: "verified_current" });
    expect(publicStewardPacketExportEligibility(packet, cba, [verifier])).toEqual({ eligible: true });
    expect(publicStewardPacketExportEligibility(packet, cba)).toMatchObject({ eligible: false, reason: expect.stringContaining("cache_unavailable") });
    expect(cbaCitationIdentityKey(primary.citations[0])).toBeTruthy();
    expect(supplementalCitationIdentityKey(citation)).toBeTruthy();
    expect(supplementalCitationIdentityKey({ ...citation, sourceId: "other-public-source" })).not.toBe(supplementalCitationIdentityKey(citation));
  });

  it("renders role grouping and matching text, Markdown and print provenance", () => {
    const jointCitation = { ...citation, id: `joint-${citation.id}`, sourceId: "synthetic-joint-source", publicSourceType: "joint_interpretation" as const, title: "Synthetic joint interpretation" };
    const jointVerifier: SupplementalSourceVerifier = { sourceId: "synthetic-joint-source", publicSourceType: "joint_interpretation", authorityClass: "joint_interpretation", verify: () => "verified_current" };
    const packet = buildPublicStewardPacket({ source: cba, topicIds: ["annual_leave"], runtimeVersion: version, createdAt: base().createdAt, supplementalCitations: [citation, jointCitation], supplementalSourceVerifiers: [verifier, jointVerifier] })!;
    expect(packet).not.toBeNull();
    expect(supplementalAuthorityRole("joint_interpretation")).toBe("Joint interpretation");
    expect(supplementalAuthorityRole("public_guidance")).toBe("Public guidance");
    const text = publicStewardPacketToText(packet);
    const markdown = publicStewardPacketToMarkdown(packet);
    const view = html(packet, [verifier, jointVerifier]);
    for (const output of [text, markdown, view]) {
      expect(output).toContain("Joint interpretation");
      expect(output).toContain("Public guidance");
      expect(output).toContain("synthetic-joint-source");
      expect(output).toContain("nlrb-weingarten-rights");
      expect(output).toContain("13. Supplemental public-source provenance");
      expect(output.indexOf("Joint interpretation")).toBeLessThan(output.lastIndexOf("Public guidance"));
    }
    expect(view).toContain("print-atomic");
    expect(publicStewardPacketExportEligibility(packet, cba, [verifier, jointVerifier])).toEqual({ eligible: true });
  });

  it("reverifies reopened packets and blocks all export actions when supplemental source drifts", () => {
    const packet = withGuidance();
    const saved = createSavedStewardPacketRecord({ packet, timestamp: "2026-08-13T17:01:00.000Z" });
    const reopened = migrateSavedAnswers(JSON.parse(JSON.stringify([saved])))[0].stewardPacket!;
    expect(reopened.supplementalSourceAppendix).toEqual(packet.supplementalSourceAppendix);
    expect(reopened.supplementalCitations).toEqual(packet.supplementalCitations);
    expect(publicStewardPacketExportEligibility(reopened, cba, [verifier])).toEqual({ eligible: true });
    const drifted = structuredClone(guidance);
    drifted.response.sha256 = "0".repeat(64);
    const driftVerifier = nlrbPacketSourceVerifier(drifted);
    const eligibility = publicStewardPacketExportEligibility(reopened, cba, [driftVerifier]);
    expect(eligibility).toMatchObject({ eligible: false, reason: expect.stringContaining("nlrb-weingarten-rights is source_instance_changed") });
    const view = html(reopened, [driftVerifier]);
    expect(view.match(/<button[^>]*disabled=""/g)?.length).toBe(4);
    expect(view).toContain("source_instance_changed");
    expect(view).toContain("nlrb-weingarten-rights");
    expect(view).toContain("13. Supplemental public-source provenance");
    const library = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
      highlightedPacketId: saved.id, saved: [saved], onDelete: () => undefined,
      cbaSourceState: { status: "available", source: cba },
      publicSourceState: { status: "available", source: drifted },
    }));
    expect(library).toContain("Close saved packet");
    expect(library).toContain("Packet not current");
    expect(library).toContain("source_instance_changed");
    expect(library).toContain("13. Supplemental public-source provenance");
  });

  it("fails closed on malformed supplemental provenance without discarding its Library record", () => {
    const packet = withGuidance();
    const malformed = structuredClone(packet);
    malformed.supplementalSourceAppendix![0].paragraphContentSha256 = "bad";
    expect(publicStewardPacketExportEligibility(malformed, cba, [verifier])).toMatchObject({ eligible: false });
    const view = html(malformed);
    expect(view).toContain("nlrb-weingarten-rights is invalid_metadata");
    expect(view).toContain("Malformed supplemental provenance / nlrb-weingarten-rights / invalid_metadata");
    expect(view).toContain("Sources:");
    expect(view.match(/<button[^>]*disabled=""/g)?.length).toBe(4);
    const record = createSavedStewardPacketRecord({ packet: malformed, timestamp: "2026-08-13T17:01:00.000Z" });
    expect(migrateSavedAnswers([record])[0].stewardPacket?.supplementalSourceAppendix?.[0].paragraphContentSha256).toBe("bad");
  });
});
