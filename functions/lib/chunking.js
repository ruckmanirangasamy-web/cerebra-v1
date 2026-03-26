"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChunks = exports.chunkDocument = void 0;
// 1 token ~= 4 chars — accurate enough for chunking without a full tokenizer
const estimateTokens = (text) => Math.ceil(text.length / 4);
// Snap to nearest sentence boundary within 80 chars of targetPos
const findSentenceBoundary = (text, targetPos) => {
    var _a;
    const lo = Math.max(0, targetPos - 80);
    const hi = Math.min(text.length, targetPos + 80);
    const window = text.slice(lo, hi);
    const matches = [...window.matchAll(/[.!?][\s\n]/g)];
    if (matches.length === 0)
        return targetPos;
    const mid = matches[Math.floor(matches.length / 2)];
    return lo + ((_a = mid.index) !== null && _a !== void 0 ? _a : 0) + 1;
};
function chunkDocument(extraction) {
    const { text, pageMap } = extraction;
    const TARGET_CHARS = 500 * 4; // 500 tokens * ~4 chars/token = 2000 chars
    const OVERLAP_CHARS = 50 * 4; // 50-token overlap = 200 chars
    const getPage = (charPos) => {
        var _a, _b, _c;
        const p = pageMap.find(p => charPos >= p.startChar && charPos < p.endChar);
        return (_c = (_a = p === null || p === void 0 ? void 0 : p.pageNumber) !== null && _a !== void 0 ? _a : (_b = pageMap[pageMap.length - 1]) === null || _b === void 0 ? void 0 : _b.pageNumber) !== null && _c !== void 0 ? _c : 1;
    };
    const chunks = [];
    let pos = 0;
    let idx = 0;
    while (pos < text.length) {
        const rawEnd = Math.min(pos + TARGET_CHARS, text.length);
        const end = rawEnd < text.length ? findSentenceBoundary(text, rawEnd) : rawEnd;
        const chunkText = text.slice(pos, end).trim();
        if (chunkText.length > 0) {
            chunks.push({
                text: chunkText, chunkIndex: idx, pageNumber: getPage(pos),
                charStart: pos, charEnd: end, tokenEstimate: estimateTokens(chunkText)
            });
            idx++;
        }
        pos = Math.max(pos + 1, end - OVERLAP_CHARS);
    }
    return chunks;
}
exports.chunkDocument = chunkDocument;
function validateChunks(chunks) {
    if (chunks.length === 0)
        return;
    const avg = chunks.reduce((s, c) => s + c.tokenEstimate, 0) / chunks.length;
    const empty = chunks.filter(c => c.text.trim().length < 20).length;
    if (avg < 100)
        console.warn('[CHUNKING] Avg tokens too small:', avg);
    if (avg > 700)
        console.warn('[CHUNKING] Avg tokens too large:', avg);
    if (empty > 0)
        console.warn('[CHUNKING] Empty chunks:', empty);
}
exports.validateChunks = validateChunks;
//# sourceMappingURL=chunking.js.map