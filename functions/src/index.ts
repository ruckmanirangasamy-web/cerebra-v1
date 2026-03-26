import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as logger from 'firebase-functions/logger';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractText } from './extraction';
import { chunkDocument, validateChunks } from './chunking';
import { embedChunks, embedDocument } from './embedding';
import { indexToFirestore } from './indexing';

import * as admin from 'firebase-admin';
admin.initializeApp();

const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_KEY;

export const embedVaultItem = onObjectFinalized({ memory: '1GiB', timeoutSeconds: 540 }, async (event) => {
    const object = event.data;
    if (!GEMINI_KEY) {
        logger.error('[PIPELINE] Missing Gemini API Key');
        return;
    }
    const gemini = new GoogleGenerativeAI(GEMINI_KEY);

    if (!object.name?.includes('/vaults/')) return null;
    if (!object.name?.includes('/original.')) return null;

    const parts = object.name.split('/');
    const uid = parts[1];
    const vaultId = parts[3];
    const itemId = parts[5];
    const mimeType = object.contentType ?? 'application/octet-stream';

    const db = getFirestore();
    const itemRef = db.doc('users/' + uid + '/vaults/' + vaultId + '/items/' + itemId);
    const setStatus = (s: string, extra?: object) => itemRef.update({ indexingStatus: s, ...extra });

    try {
        // STAGE 2: EXTRACT
        await setStatus('extracting');
        const [buffer] = await getStorage().bucket(object.bucket).file(object.name!).download();
        const extraction = await extractText(buffer, mimeType, gemini);
        if (extraction.text.trim().length < 50) {
            await setStatus('failed', { indexingError: 'Extracted text too short' }); return null;
        }

        // STAGE 3: CHUNK
        await setStatus('chunking');
        const chunks = chunkDocument(extraction);
        validateChunks(chunks);

        // STAGE 4: EMBED (chunk + document level in parallel)
        await setStatus('embedding');
        const [chunkEmbeddings, docEmbedding] = await Promise.all([
            embedChunks(chunks, gemini),
            embedDocument(extraction.text, gemini)
        ]);

        // STAGE 5: INDEX to Firestore
        indexToFirestore({
            uid, vaultId, itemId, chunks, chunkEmbeddings, docEmbedding,
            extractionMeta: { wordCount: extraction.wordCount, pageCount: extraction.pageCount }
        });

        logger.info('[PIPELINE] Indexed ' + chunks.length + ' chunks for ' + itemId);
        return;

    } catch (err: any) {
        logger.error('[PIPELINE] Failed for', itemId, err.message);
        await setStatus('failed', { indexingError: err.message.slice(0, 200) });
        return;
    }
});
