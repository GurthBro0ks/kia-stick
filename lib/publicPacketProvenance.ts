import { verifyPublicCitation } from "@/lib/publicCitationIntegrity";
import { PUBLIC_SOURCE_ID, type PublicSourceCache } from "@/lib/publicSource";
import type { Citation } from "@/lib/sourceModel";

export type SupplementalAuthorityClass = "joint_interpretation" | "public_guidance";
export type SupplementalVerificationState = NonNullable<Citation["citationVerificationState"]>;

export interface SupplementalSourceVerifier {
  sourceId: string;
  publicSourceType: string;
  authorityClass: SupplementalAuthorityClass;
  verify: (citation: Citation) => SupplementalVerificationState;
}

export interface PublicStewardPacketSupplementalSourceAppendixItem {
  citationId: string;
  sourceId: string;
  authorityClass: SupplementalAuthorityClass;
  publicSourceType: SupplementalSourceVerifier["publicSourceType"];
  sourceInstanceId: string;
  sectionId: string;
  paragraphId: string;
  paragraphContentSha256: string;
  citationAnchorSha256: string;
  verificationState: SupplementalVerificationState;
}

const roleLabels: Record<SupplementalAuthorityClass, string> = {
  joint_interpretation: "Joint interpretation",
  public_guidance: "Public guidance",
};

export function supplementalAuthorityRole(authorityClass: SupplementalAuthorityClass): string {
  return roleLabels[authorityClass];
}

export function nlrbPacketSourceVerifier(source: PublicSourceCache | null): SupplementalSourceVerifier {
  return {
    sourceId: PUBLIC_SOURCE_ID,
    publicSourceType: "nlrb_guidance",
    authorityClass: "public_guidance",
    verify: (citation) => verifyPublicCitation(citation, source).state,
  };
}

export function validSupplementalAppendixItem(value: unknown): value is PublicStewardPacketSupplementalSourceAppendixItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PublicStewardPacketSupplementalSourceAppendixItem>;
  return [item.citationId, item.sourceId, item.publicSourceType,
    item.sectionId, item.paragraphId]
    .every((field) => typeof field === "string" && field.length > 0) &&
    [item.sourceInstanceId, item.paragraphContentSha256, item.citationAnchorSha256]
      .every((field) => typeof field === "string" && /^[a-f0-9]{64}$/i.test(field)) &&
    item.publicSourceType !== "cba_contract" &&
    (item.authorityClass === "joint_interpretation" || item.authorityClass === "public_guidance") &&
    typeof item.verificationState === "string";
}
