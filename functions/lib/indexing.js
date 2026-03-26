"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexToFirestore = void 0;
const firestore_1 = require("firebase-admin/firestore");
async function indexToFirestore(opts) {
    const { uid, vaultId, itemId, chunks, chunkEmbeddings, docEmbedding, extractionMeta } = opts;
    const db = (0, firestore_1.getFirestore)();
    // Firestore batch limit: 500 ops — split large documents across multiple batches
    const BATCH_LIMIT = 400;
    const batches = [];
    let current = db.batch();
    let count = 0;
    chunks.forEach((chunk, i) => {
        if (count >= BATCH_LIMIT) {
            batches.push(current);
            current = db.batch();
            count = 0;
        }
        const ref = db.collection('users/' + uid + '/vaults/' + vaultId + '/items/' + itemId + '/chunks').doc();
        current.set(ref, {
            text: chunk.text,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            embedding: firestore_1.FieldValue.vector(chunkEmbeddings[i]),
            uid, vaultId, itemId
        });
        count++;
    });
    // Update parent item with document-level embedding + metadata
    const itemRef = db.doc('users/' + uid + '/vaults/' + vaultId + '/items/' + itemId);
    current.update(itemRef, {
        embedding: firestore_1.FieldValue.vector(docEmbedding),
        chunkCount: chunks.length,
        wordCount: extractionMeta.wordCount,
        pageCount: extractionMeta.pageCount,
        indexingStatus: 'indexed',
        indexedAt: firestore_1.FieldValue.serverTimestamp()
    });
    batches.push(current);
    for (const batch of batches)
        await batch.commit();
    console.log('[INDEXING] Indexed ' + chunks.length + ' chunks for ' + itemId);
}
exports.indexToFirestore = indexToFirestore;
//# sourceMappingURL=indexing.js.map