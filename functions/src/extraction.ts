// @ts-ignore
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractionResult {
    text: string;
    pageMap: Array<{ pageNumber: number; startChar: number; endChar: number }>;
    wordCount: number;
    pageCount: number;
}

export async function extractText(
    buffer: Buffer,
    mimeType: string,
    gemini: GoogleGenerativeAI
): Promise<ExtractionResult> {

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (mimeType === 'application/pdf') {
        const parsed = await pdfParse(buffer, {
            pagerender: (pageData: any) =>
                pageData.getTextContent().then((tc: any) =>
                    tc.items.map((i: any) => i.str).join(' ') + '\n===PAGE_BREAK===\n'
                )
        });
        const pages = parsed.text.split('===PAGE_BREAK===');
        const pageMap: Array<{ pageNumber: number; startChar: number; endChar: number }> = [];
        let cursor = 0;
        pages.forEach((pageText: string, i: number) => {
            pageMap.push({ pageNumber: i + 1, startChar: cursor, endChar: cursor + pageText.length });
            cursor += pageText.length;
        });
        const fullText = pages.join(' ');
        return { text: fullText, pageMap, wordCount: fullText.split(/\s+/).length, pageCount: pages.length };
    }

    // ── DOCX ─────────────────────────────────────────────────────────────────
    if (mimeType.includes('wordprocessingml')) {
        const result = await mammoth.extractRawText({ buffer });
        const words = result.value.split(/\s+/);
        const WORDS_PER_PAGE = 250;
        const pageMap: Array<{ pageNumber: number; startChar: number; endChar: number }> = [];
        let charCursor = 0;
        for (let p = 0; p < Math.ceil(words.length / WORDS_PER_PAGE); p++) {
            const pageWords = words.slice(p * WORDS_PER_PAGE, (p + 1) * WORDS_PER_PAGE).join(' ');
            pageMap.push({ pageNumber: p + 1, startChar: charCursor, endChar: charCursor + pageWords.length });
            charCursor += pageWords.length + 1;
        }
        return { text: result.value, pageMap, wordCount: words.length, pageCount: pageMap.length };
    }

    // ── PLAIN TEXT ────────────────────────────────────────────────────────────
    if (mimeType === 'text/plain') {
        const text = buffer.toString('utf-8');
        return {
            text, pageMap: [{ pageNumber: 1, startChar: 0, endChar: text.length }],
            wordCount: text.split(/\s+/).length, pageCount: 1
        };
    }

    // ── IMAGE — Gemini Vision OCR ─────────────────────────────────────────────
    if (mimeType.startsWith('image/')) {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const base64 = buffer.toString('base64');
        const result = await model.generateContent([
            { inlineData: { mimeType, data: base64 } },
            'Extract ALL text from this image. Preserve structure. Return ONLY the extracted text.'
        ]);
        const text = result.response.text();
        return {
            text, pageMap: [{ pageNumber: 1, startChar: 0, endChar: text.length }],
            wordCount: text.split(/\s+/).length, pageCount: 1
        };
    }

    throw new Error('UNSUPPORTED_MIME: ' + mimeType);
}
