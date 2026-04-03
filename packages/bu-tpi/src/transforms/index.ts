/**
 * NINJUTSU: Buff/Transform System — Public API
 */

export type { BuffType, Buff, BuffChain, BuffResult } from './types.js';
export { BUFF_TYPES } from './types.js';

export {
  base64Buff, leetSpeakBuff, unicodeSubBuff, rot13Buff,
  spanishFrameBuff, technicalJargonBuff,
  markdownInjectionBuff, jsonWrapBuff, xmlTagBuff,
  developerModeBuff, researcherBuff,
  ALL_BUFFS,
  applyBuff, applyBuffChain, createChain,
} from './buffs.js';
