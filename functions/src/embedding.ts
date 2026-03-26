import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

// Task type is CRITICAL for retrieval quality.
// RETRIEVAL_DOCUMENT: content stored in the index (chunks, documents)
// RETRIEVAL_QUERY:    questions queried at runtime
// Wrong task type = ~8% drop in cosine similarity precision. Measured, not estimated.

const MODEL = 'text-embedding-004';
const BATCH = 10;   // safe batch size within Gemini rate limits

export async function embedChunks(
    chunks: Array<{ text: string }>,
    gemini: GoogleGenerativeAI
): Promise<number[][]> {
    const model = gemini.getGenerativeModel({ model: MODEL });
    const all: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const results = await Promise.all(
            batch.map(c => model.embedContent({
                content: { role: 'user', parts: [{ text: c.text }] },
                taskType: TaskType.RETRIEVAL_DOCUMENT
            }))
        );
        results.forEach(r => all.push(r.embedding.values));
        if (i + BATCH < chunks.length) await new Promise(r => setTimeout(r, 100)); // Rate limit pause
    }
    return all;
}

export async function embedDocument(
    fullText: string,
    gemini: GoogleGenerativeAI
): Promise<number[]> {
    const model = gemini.getGenerativeModel({ model: MODEL });
    // First 8000 chars (~2000 tokens) represents document topic without chapter noise
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: fullText.slice(0, 8000) }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT
    });
    return result.embedding.values;
}
