export interface Chunk {
    text: string;
    chunkIndex: number;
    pageNumber: number;
    charStart: number;
    charEnd: number;
    tokenEstimate: number;
}

// 1 token ~= 4 chars — accurate enough for chunking without a full tokenizer
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Snap to nearest sentence boundary within 80 chars of targetPos
const findSentenceBoundary = (text: string, targetPos: number): number => {
    const lo = Math.max(0, targetPos - 80);
    const hi = Math.min(text.length, targetPos + 80);
    const window = text.slice(lo, hi);
    const matches = [...window.matchAll(/[.!?][\s\n]/g)];
    if (matches.length === 0) return targetPos;
    const mid = matches[Math.floor(matches.length / 2)];
    return lo + (mid.index ?? 0) + 1;
};

export function chunkDocument(extraction: {
    text: string;
    pageMap: Array<{ pageNumber: number; startChar: number; endChar: number }>;
}): Chunk[] {
    const { text, pageMap } = extraction;
    const TARGET_CHARS = 500 * 4;    // 500 tokens * ~4 chars/token = 2000 chars
    const OVERLAP_CHARS = 50 * 4;    // 50-token overlap = 200 chars

    const getPage = (charPos: number): number => {
        const p = pageMap.find(p => charPos >= p.startChar && charPos < p.endChar);
        return p?.pageNumber ?? pageMap[pageMap.length - 1]?.pageNumber ?? 1;
    };

    const chunks: Chunk[] = [];
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

export function validateChunks(chunks: Chunk[]): void {
    if (chunks.length === 0) return;
    const avg = chunks.reduce((s, c) => s + c.tokenEstimate, 0) / chunks.length;
    const empty = chunks.filter(c => c.text.trim().length < 20).length;
    if (avg < 100) console.warn('[CHUNKING] Avg tokens too small:', avg);
    if (avg > 700) console.warn('[CHUNKING] Avg tokens too large:', avg);
    if (empty > 0) console.warn('[CHUNKING] Empty chunks:', empty);
}
