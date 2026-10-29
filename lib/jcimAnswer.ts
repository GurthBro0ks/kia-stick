import type { AnswerResult } from "@/lib/answerGovernor";
import { detectPublicStewardWorkflowTopic } from "@/lib/publicStewardWorkflowRegistry";
import { jcimCitation, jcimTopicCitation, type JcimCache, type JcimCheckStatus } from "@/lib/jcimSource";

export const JCIM_NOT_CHECKED_LOADING_DISCLOSURE =
  "JCIM not checked: the JCIM joint interpretation was still loading when this answer was prepared, so only the contract language was reviewed. Ask again once JCIM has loaded." as const;
export const JCIM_NOT_CHECKED_UNAVAILABLE_DISCLOSURE =
  "JCIM not checked: the JCIM joint interpretation is unavailable right now (it could not be loaded or verified against apwu.org), so only the contract language was reviewed. Ask again when JCIM is available." as const;

/** Plain disclosure for an answer prepared without JCIM; null when JCIM was available. */
export function jcimNotCheckedDisclosure(status: JcimCheckStatus): string | null {
  if (status === "available") return null;
  return status === "loading" ? JCIM_NOT_CHECKED_LOADING_DISCLOSURE : JCIM_NOT_CHECKED_UNAVAILABLE_DISCLOSURE;
}

/**
 * Adds interpretation only to an already supported, CBA-first answer.
 * When the caller reports a JCIM status and JCIM is missing, the answer says plainly that JCIM was not checked
 * (KIA-jcim-early-send-1). Callers that pass no status keep the previous behavior.
 */
export function enrichCbaAnswerWithJcim(answer: AnswerResult, question: string, source: JcimCache | null,
  jcimStatus?: JcimCheckStatus): AnswerResult {
  if (answer.noAnswer || !answer.citations.some((citation) => citation.publicSourceType === "cba_contract")) return answer;
  if (!source) {
    const disclosure = jcimStatus === undefined ? null : jcimNotCheckedDisclosure(jcimStatus === "loading" ? "loading" : "unavailable");
    return disclosure ? { ...answer, shortAnswer: `${answer.shortAnswer} ${disclosure}` } : answer;
  }
  const topic = detectPublicStewardWorkflowTopic(question);
  let supplemental = topic ? jcimTopicCitation(source, topic) : [];
  if (supplemental.length === 0 && /\barticle\s*19\b/i.test(question) && /\b(handbook|manual|incorporat)/i.test(question)) {
    const section = source.normalized.sections.find((item) => item.id === "article-19");
    const paragraph = section?.paragraphs.find((item) => /Article 19 provides/i.test(item.text));
    if (section && paragraph) supplemental = [jcimCitation(source, section, paragraph)];
  }
  if (supplemental.length === 0 && /\b(article\s*15|grievance)\b/i.test(question) && /\b(deadline|filing|file|procedure)\b/i.test(question)) {
    supplemental = jcimTopicCitation(source, "steward_grievance_handling").filter((citation) => citation.articleNumber === "15");
  }
  if (supplemental.length === 0) return answer;
  const article19 = supplemental.some((citation) => citation.articleNumber === "19");
  return {
    ...answer,
    shortAnswer: `${answer.shortAnswer} ${article19
      ? "The JCIM explains the Article 19 relationship to postal handbooks and manuals. This bounded source does not supply the underlying handbook rule or decide whether a particular provision applies."
      : "The JCIM provides joint interpretation for the cited article. Review its separate citation against the contract language and case facts; the interpretation does not replace the CBA."}`,
    citations: [...answer.citations.filter((citation) => citation.publicSourceType === "cba_contract"),
      ...supplemental, ...answer.citations.filter((citation) => citation.publicSourceType !== "cba_contract")],
    conflicts: [...answer.conflicts, "If CBA language and JCIM interpretation appear to differ, compare both sources and refer the issue for review; no conflict is automatically resolved."],
  };
}
