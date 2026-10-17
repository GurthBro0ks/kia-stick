import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildPublicStewardPacket, publicStewardPacketToText, publicStewardPacketToMarkdown } from '@/lib/publicStewardPacket';
import { PublicStewardPacketView } from '@/components/KiaStickApp';
import { createCbaSourceFixtureCache } from '@/tests/fixtures/cbaSourceFixture';
import { createRuntimeVersion } from '@/lib/version';
import { createSavedStewardPacketRecord, migrateSavedAnswers } from '@/lib/savedAnswers';
const legacyLimitation = 'This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice.';
const displayedLimitation = 'This public pilot verifies only the admitted public sources and citations cited here. It does not determine whether a JCIM interpretation, LMOU, handbook rule, arbitration precedent, management policy, or local practice applies to a particular case.';
const overtimeLegacyLimitation = 'This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, local practice, or worked-off-assignment theory beyond the cited Article 8 language.';
// Reverse the authorized presentation replacements in stored-limitation order (both legacy literals share one display wording).
let storedLegacyOrder: string[] = [];
const originalOutput = (value: string) => {
 let index = 0;
 return value.replaceAll(displayedLimitation, () => storedLegacyOrder[index++] ?? legacyLimitation);
};
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
it('golden', () => {
 const source=createCbaSourceFixtureCache();
 const packet=buildPublicStewardPacket({source,topicIds:['annual_leave','overtime'],runtimeVersion:createRuntimeVersion({buildDate:'20260813',gitSha:'printqa1'}),createdAt:'2026-08-13T17:00:00.000Z'})!;
 storedLegacyOrder=packet.limitations.map((item)=>item.text).filter((text)=>text===legacyLimitation||text===overtimeLegacyLimitation);
 expect(storedLegacyOrder).toEqual([legacyLimitation, overtimeLegacyLimitation]);
 const values={serialized:sha(JSON.stringify(packet)),contentIdentity:packet.contentIdentity,text:sha(originalOutput(publicStewardPacketToText(packet))),markdown:sha(originalOutput(publicStewardPacketToMarkdown(packet))),view:sha(originalOutput(renderToStaticMarkup(React.createElement(PublicStewardPacketView,{packet,source,onCitationNavigate:()=>undefined,onSave:()=>undefined}))))};
 expect(publicStewardPacketToText(packet)).toContain(displayedLimitation);
 expect(publicStewardPacketToMarkdown(packet)).toContain(displayedLimitation);
 // Frozen pre-repair hashes: only reverse the authorized presentation replacement.
 expect(values).toEqual({
  serialized: '3646ba04ebb1f44db727099a8b6c26aa0f0c78d9ff7485e7ac6f961a1d348587',
  contentIdentity: '0d381e7610bf6911c1eb7b3d537f5b99b3940748e900fbbee27f0f8bd6cf7e1b',
  text: 'a491e60c703e1b7118cbdbb70c6e1c6608cf0fc927a206a5daa8781fa0a06ec1',
  markdown: '7d5c46fa4e7aad398524fe18c631c3bc4112f4a322fc3e54a4e5bfc7e0129e14',
  view: '74b30184d616e297fde9d84644069c2463afe63d0851295dd5c2f5f7b5903f90',
 });
 expect(packet.supplementalCitations).toBeUndefined();
 expect(packet.supplementalSourceAppendix).toBeUndefined();
 const oldRecord = createSavedStewardPacketRecord({packet,timestamp:'2026-08-13T17:01:00.000Z'});
 const reopened = migrateSavedAnswers(JSON.parse(JSON.stringify([oldRecord])))[0].stewardPacket!;
 expect(sha(JSON.stringify(reopened))).toBe(values.serialized);
 expect(sha(originalOutput(publicStewardPacketToText(reopened)))).toBe(values.text);
 expect(sha(originalOutput(publicStewardPacketToMarkdown(reopened)))).toBe(values.markdown);
 expect(reopened.supplementalCitations).toBeUndefined();
 expect(reopened.supplementalSourceAppendix).toBeUndefined();
});
