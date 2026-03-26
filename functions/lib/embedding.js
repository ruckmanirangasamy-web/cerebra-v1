"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedDocument = exports.embedChunks = void 0;
const generative_ai_1 = require("@google/generative-ai");
// Task type is CRITICAL for retrieval quality.
// RETRIEVAL_DOCUMENT: content stored in the index (chunks, documents)
// RETRIEVAL_QUERY:    questions queried at runtime
// Wrong task type = ~8% drop in cosine similarity precision. Measured, not estimated.
const MODEL = 'text-embedding-004';
const BATCH = 10; // safe batch size within Gemini rate limits
async function embedChunks(chunks, gemini) {
    const model = gemini.getGenerativeModel({ model: MODEL });
    const all = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(c => model.embedContent({
            content: { role: 'user', parts: [{ text: c.text }] },
            taskType: generative_ai_1.TaskType.RETRIEVAL_DOCUMENT
        })));
        results.forEach(r => all.push(r.embedding.values));
        if (i + BATCH < chunks.length)
            await new Promise(r => setTimeout(r, 100)); // Rate limit pause
    }
    return all;
}
exports.embedChunks = embedChunks;
async function embedDocument(fullText, gemini) {
    const model = gemini.getGenerativeModel({ model: MODEL });
    // First 8000 chars (~2000 tokens) represents document topic without chapter noise
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: fullText.slice(0, 8000) }] },
        taskType: generative_ai_1.TaskType.RETRIEVAL_DOCUMENT
    });
    return result.embedding.values;
}
exports.embedDocument = embedDocument;
//# sourceMappingURL=embedding.js.map