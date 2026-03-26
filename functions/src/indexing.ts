import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';

export async function indexToFirestore(opts: {
    uid: string; vaultId: string; itemId: string;
    chunks: Array<{ text: string; chunkIndex: number; pageNumber: number }>;
    chunkEmbeddings: number[][];
    docEmbedding: number[];
    extractionMeta: { wordCount: number; pageCount: number };
}): Promise<void> {
    const { uid, vaultId, itemId, chunks, chunkEmbeddings, docEmbedding, extractionMeta } = opts;
    const db = getFirestore();

    // Firestore batch limit: 500 ops — split large documents across multiple batches
    const BATCH_LIMIT = 400;
    const batches: WriteBatch[] = [];
    let current = db.batch();
    let count = 0;

    chunks.forEach((chunk, i) => {
        if (count >= BATCH_LIMIT) { batches.push(current); current = db.batch(); count = 0; }
        const ref = db.collection('users/' + uid + '/vaults/' + vaultId + '/items/' + itemId + '/chunks').doc();
        current.set(ref, {
            text: chunk.text,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            embedding: FieldValue.vector(chunkEmbeddings[i]),
            uid, vaultId, itemId
        });
        count++;
    });

    // Update parent item with document-level embedding + metadata
    const itemRef = db.doc('users/' + uid + '/vaults/' + vaultId + '/items/' + itemId);
    current.update(itemRef, {
        embedding: FieldValue.vector(docEmbedding),
        chunkCount: chunks.length,
        wordCount: extractionMeta.wordCount,
        pageCount: extractionMeta.pageCount,
        indexingStatus: 'indexed',
        indexedAt: FieldValue.serverTimestamp()
    });
    batches.push(current);

    for (const batch of batches) await batch.commit();
    console.log('[INDEXING] Indexed ' + chunks.length + ' chunks for ' + itemId);
}
