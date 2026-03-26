import { ref, uploadBytesResumable } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';

interface IngestOptions {
    file: File;
    uid: string;
    vaultId: string;
    isPYQ?: boolean;
    onProgress?: (percent: number) => void;
}

export async function ingestDocument(opts: IngestOptions): Promise<string> {
    const { file, uid, vaultId, isPYQ = false, onProgress } = opts;

    const ALLOWED = ['application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'image/png', 'image/jpeg', 'video/mp4'];
    const MAX = file.type === 'video/mp4' ? 200 * 1024 * 1024 : 50 * 1024 * 1024;

    if (!ALLOWED.includes(file.type)) throw new Error('UNSUPPORTED_TYPE');
    if (file.size > MAX) throw new Error('FILE_TOO_LARGE');

    const itemId = crypto.randomUUID();
    const itemRef = doc(db, 'users', uid, 'vaults', vaultId, 'items', itemId);

    await setDoc(itemRef, {
        type: 'source',
        title: file.name.replace(/\.[^.]+$/, ''),
        content: null,
        embedding: null,
        ghostSuppressed: false,
        isPYQ,
        fileSize: file.size,
        pageCount: null,
        wordCount: null,
        chunkCount: 0,
        indexingStatus: 'uploading',  // uploading > extracting > chunking > embedding > indexed | failed
        uid, vaultId,
        createdAt: serverTimestamp(),
        lastEditedAt: serverTimestamp()
    });

    const ext = file.name.split('.').pop();
    const storagePath = 'users/' + uid + '/vaults/' + vaultId + '/items/' + itemId + '/original.' + ext;
    const storageRef = ref(storage, storagePath);

    await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, {
            customMetadata: { uid, vaultId, itemId, isPYQ: String(isPYQ) }
        });
        task.on('state_changed',
            snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            () => resolve()
        );
    });

    await setDoc(itemRef, { storageRef: storagePath }, { merge: true });
    return itemId;
}
