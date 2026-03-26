"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedVaultItem = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const storage_2 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const generative_ai_1 = require("@google/generative-ai");
const extraction_1 = require("./extraction");
const chunking_1 = require("./chunking");
const embedding_1 = require("./embedding");
const indexing_1 = require("./indexing");
const admin = require("firebase-admin");
admin.initializeApp();
const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_KEY;
exports.embedVaultItem = (0, storage_1.onObjectFinalized)({ memory: '1GiB', timeoutSeconds: 540 }, async (event) => {
    var _a, _b, _c;
    const object = event.data;
    if (!GEMINI_KEY) {
        logger.error('[PIPELINE] Missing Gemini API Key');
        return;
    }
    const gemini = new generative_ai_1.GoogleGenerativeAI(GEMINI_KEY);
    if (!((_a = object.name) === null || _a === void 0 ? void 0 : _a.includes('/vaults/')))
        return null;
    if (!((_b = object.name) === null || _b === void 0 ? void 0 : _b.includes('/original.')))
        return null;
    const parts = object.name.split('/');
    const uid = parts[1];
    const vaultId = parts[3];
    const itemId = parts[5];
    const mimeType = (_c = object.contentType) !== null && _c !== void 0 ? _c : 'application/octet-stream';
    const db = (0, firestore_1.getFirestore)();
    const itemRef = db.doc('users/' + uid + '/vaults/' + vaultId + '/items/' + itemId);
    const setStatus = (s, extra) => itemRef.update(Object.assign({ indexingStatus: s }, extra));
    try {
        // STAGE 2: EXTRACT
        await setStatus('extracting');
        const [buffer] = await (0, storage_2.getStorage)().bucket(object.bucket).file(object.name).download();
        const extraction = await (0, extraction_1.extractText)(buffer, mimeType, gemini);
        if (extraction.text.trim().length < 50) {
            await setStatus('failed', { indexingError: 'Extracted text too short' });
            return null;
        }
        // STAGE 3: CHUNK
        await setStatus('chunking');
        const chunks = (0, chunking_1.chunkDocument)(extraction);
        (0, chunking_1.validateChunks)(chunks);
        // STAGE 4: EMBED (chunk + document level in parallel)
        await setStatus('embedding');
        const [chunkEmbeddings, docEmbedding] = await Promise.all([
            (0, embedding_1.embedChunks)(chunks, gemini),
            (0, embedding_1.embedDocument)(extraction.text, gemini)
        ]);
        // STAGE 5: INDEX to Firestore
        (0, indexing_1.indexToFirestore)({
            uid, vaultId, itemId, chunks, chunkEmbeddings, docEmbedding,
            extractionMeta: { wordCount: extraction.wordCount, pageCount: extraction.pageCount }
        });
        logger.info('[PIPELINE] Indexed ' + chunks.length + ' chunks for ' + itemId);
        return;
    }
    catch (err) {
        logger.error('[PIPELINE] Failed for', itemId, err.message);
        await setStatus('failed', { indexingError: err.message.slice(0, 200) });
        return;
    }
});
//# sourceMappingURL=index.js.map