import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildPublicStewardPacket, publicStewardPacketToText, publicStewardPacketToMarkdown } from '@/lib/publicStewardPacket';
import { PublicStewardPacketView } from '@/components/KiaStickApp';
import { createCbaSourceFixtureCache } from '@/tests/fixtures/cbaSourceFixture';
import { createRuntimeVersion } from '@/lib/version';
import { createSavedStewardPacketRecord, migrateSavedAnswers } from '@/lib/savedAnswers';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
it('golden', () => {
 const source=createCbaSourceFixtureCache();
 const packet=buildPublicStewardPacket({source,topicIds:['annual_leave','overtime'],runtimeVersion:createRuntimeVersion({buildDate:'20260813',gitSha:'printqa1'}),createdAt:'2026-08-13T17:00:00.000Z'})!;
 const values={serialized:sha(JSON.stringify(packet)),contentIdentity:packet.contentIdentity,text:sha(publicStewardPacketToText(packet)),markdown:sha(publicStewardPacketToMarkdown(packet)),view:sha(renderToStaticMarkup(React.createElement(PublicStewardPacketView,{packet,source,onCitationNavigate:()=>undefined,onSave:()=>undefined})))};
 expect(values).toEqual({
  serialized: '3646ba04ebb1f44db727099a8b6c26aa0f0c78d9ff7485e7ac6f961a1d348587',
  contentIdentity: '0d381e7610bf6911c1eb7b3d537f5b99b3940748e900fbbee27f0f8bd6cf7e1b',
  text: 'edab4b38b196bda844d5ee51ceae570241e6032eedfd9cd21c618d1d868afee6',
  markdown: '9da29ad7b27170a431781b44b56d39ee9ddd09d741cf6a9328c991317189a851',
  view: '24f53fa6c667c05ce4e9405e9aae8bbe8f4405eb66892c93b48120d38e6832ca',
 });
 expect(packet.supplementalCitations).toBeUndefined();
 expect(packet.supplementalSourceAppendix).toBeUndefined();
 const oldRecord = createSavedStewardPacketRecord({packet,timestamp:'2026-08-13T17:01:00.000Z'});
 const reopened = migrateSavedAnswers(JSON.parse(JSON.stringify([oldRecord])))[0].stewardPacket!;
 expect(sha(JSON.stringify(reopened))).toBe(values.serialized);
 expect(sha(publicStewardPacketToText(reopened))).toBe(values.text);
 expect(sha(publicStewardPacketToMarkdown(reopened))).toBe(values.markdown);
 expect(reopened.supplementalCitations).toBeUndefined();
 expect(reopened.supplementalSourceAppendix).toBeUndefined();
});
