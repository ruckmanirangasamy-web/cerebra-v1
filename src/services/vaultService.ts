/**
 * Vault Service
 * Handles CRUD for subject folders, vault items, uploads (Firebase Storage), and storage tracking.
 */
import {
    collection, query, where, orderBy, onSnapshot, doc,
    addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs,
    writeBatch, increment, getDoc, setDoc
} from 'firebase/firestore';
import {
    ref, uploadBytesResumable, getDownloadURL, deleteObject,
    getMetadata
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { VaultFolder, VaultItem, AutoWeaveLog, VaultItemType, VaultSubtype } from './vaultTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const FREE_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// ─── Storage Usage ───────────────────────────────────────────────────────────

export interface StorageUsage {
    usedBytes: number;
    totalBytes: number;
    usedFormatted: string;
    totalFormatted: string;
    percentage: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Subscribe to a user's real-time storage usage (stored as a denormalised counter on users/{uid}) */
export function subscribeToStorageUsage(uid: string, onUpdate: (usage: StorageUsage) => void) {
    const userRef = doc(db, `users`, uid);
    return onSnapshot(userRef, (snap) => {
        const usedBytes = snap.data()?.storageUsedBytes ?? 0;
        onUpdate({
            usedBytes,
            totalBytes: FREE_STORAGE_BYTES,
            usedFormatted: formatBytes(usedBytes),
            totalFormatted: '5 GB',
            percentage: Math.min((usedBytes / FREE_STORAGE_BYTES) * 100, 100),
        });
    });
}

/** Increment/decrement the user's storage counter (called after upload or delete) */
async function updateStorageCounter(uid: string, deltaBytes: number) {
    const userRef = doc(db, `users`, uid);
    // Use setDoc with merge so it creates the doc if it doesn't exist
    await updateDoc(userRef, { storageUsedBytes: increment(deltaBytes) }).catch(async () => {
        // Doc might not exist yet
        await setDoc(userRef, { storageUsedBytes: Math.max(0, deltaBytes) }, { merge: true });
    });
}

// ─── Subject Folders ─────────────────────────────────────────────────────────

export function subscribeToVaultFolders(uid: string, onUpdate: (folders: VaultFolder[]) => void) {
    const q = query(
        collection(db, `users/${uid}/vaults`),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const folders: VaultFolder[] = [];
        snapshot.forEach((d) => folders.push({ id: d.id, ...d.data() } as VaultFolder));
        onUpdate(folders);
    }, (err) => console.error("Error subscribing to vault folders:", err));
}

export async function createVaultFolder(uid: string, data: Partial<VaultFolder>) {
    const ref = collection(db, `users/${uid}/vaults`);
    return addDoc(ref, {
        ...data,
        itemCount: 0,
        isShared: false,
        ownerId: uid,
        createdAt: serverTimestamp()
    });
}

export async function updateVaultFolder(uid: string, folderId: string, data: Partial<VaultFolder>) {
    const ref = doc(db, `users/${uid}/vaults`, folderId);
    return updateDoc(ref, data);
}

export async function deleteVaultFolder(uid: string, folderId: string) {
    const ref = doc(db, `users/${uid}/vaults`, folderId);
    return deleteDoc(ref);
}

// ─── Vault Items ──────────────────────────────────────────────────────────────

export function subscribeToVaultItems(
    uid: string,
    folderId: string | null,
    type: VaultItemType | 'all',
    onUpdate: (items: VaultItem[]) => void
) {
    const itemsRef = collection(db, `users/${uid}/vault_items`);
    // Due to missing composite indexes initially, we will query by type and filter/sort client-side if folderId is provided.
    // Ideally, we'd add where('vaultId', '==', folderId) + orderBy('lastEditedAt', 'desc')
    // We will do a generic query and sort client-side to prevent crashing if indexes aren't built yet.
    
    let q;
    if (type !== 'all') {
        q = query(itemsRef, where('type', '==', type));
    } else {
        q = query(itemsRef);
    }

    return onSnapshot(q, (snapshot) => {
        let items: VaultItem[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as VaultItem));
        
        if (folderId) {
            items = items.filter(img => img.vaultId === folderId);
        }
        
        // Sort descending by lastEditedAt
        items.sort((a, b) => {
            const timeA = (a.lastEditedAt as any)?.toMillis?.() || 0;
            const timeB = (b.lastEditedAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
        });

        onUpdate(items);
    }, (err) => console.error("Error subscribing to vault items:", err));
}

// Subscribe to items by Subject (New for Phase 1)
export function subscribeVaultItemsBySubject(
    uid: string,
    subjectId: string | null,
    onUpdate: (items: VaultItem[]) => void
) {
    const itemsRef = collection(db, `users/${uid}/vault_items`);
    const q = query(itemsRef, where('subjectId', '==', subjectId));
    
    return onSnapshot(q, (snapshot) => {
        const items: VaultItem[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as VaultItem));
        
        items.sort((a, b) => {
            const timeA = (a.lastEditedAt as any)?.toMillis?.() || 0;
            const timeB = (b.lastEditedAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
        });
        
        onUpdate(items);
    });
}

// Generic page subscription (New for Phase 1)
export function subscribeVaultPage(
    uid: string,
    onUpdate: (items: VaultItem[]) => void
) {
    const itemsRef = collection(db, `users/${uid}/vault_items`);
    // Subscribe to all to group client-side
    return onSnapshot(itemsRef, (snapshot) => {
        const items: VaultItem[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as VaultItem));
        
        items.sort((a, b) => {
            const timeA = (a.lastEditedAt as any)?.toMillis?.() || 0;
            const timeB = (b.lastEditedAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
        });
        
        onUpdate(items);
    });
}

export async function deleteVaultItem(uid: string, folderId: string | null, itemId: string) {
    // Load item to get storage ref + fileSize
    const itemRef = doc(db, `users/${uid}/vault_items`, itemId);
    const itemSnap = await getDoc(itemRef);
    const item = itemSnap.data() as VaultItem | undefined;

    // Delete from Storage if applicable
    if (item?.storageRef) {
        try {
            const fileRef = ref(storage, item.storageRef);
            await deleteObject(fileRef);
        } catch (e) {
            console.warn('Storage delete failed (may already be deleted):', e);
        }
    }

    // Decrement storage counter
    if (item?.fileSize) {
        await updateStorageCounter(uid, -item.fileSize);
    }

    // Delete Firestore doc
    await deleteDoc(itemRef);

    // Decrement folder item count if it exists
    if (folderId) {
        const folderRef = doc(db, `users/${uid}/vaults`, folderId);
        // Catch gracefully in case the folder doesn't exist anymore
        await updateDoc(folderRef, { itemCount: increment(-1) }).catch(() => {});
    }
}

// ─── Upload Pipeline ──────────────────────────────────────────────────────────

export type UploadProgressCallback = (progress: number) => void;

function detectSubtype(file: File): VaultSubtype {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'docx';
    if (ext === 'txt') return 'txt';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return 'audio';
    return 'other';
}

const SUPPORTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export interface UploadValidationError {
    type: 'unsupported_type' | 'too_large' | 'storage_full';
    message: string;
}

export function validateFile(
    file: File,
    currentUsageBytes: number
): UploadValidationError | null {
    if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt|png|jpg|jpeg|mp3|wav)$/i)) {
        return { type: 'unsupported_type', message: `Unsupported file type. Supported: PDF, DOCX, TXT, PNG, JPG, Audio` };
    }
    if (file.size > MAX_FILE_SIZE) {
        return { type: 'too_large', message: `File too large (${formatBytes(file.size)}). Max 50 MB.` };
    }
    if (currentUsageBytes + file.size > FREE_STORAGE_BYTES) {
        return { type: 'storage_full', message: `Not enough storage. Free up space or upgrade.` };
    }
    return null;
}

/**
 * Upload a file to Firebase Storage and create a Firestore vault item.
 * Returns the item ID on success.
 */
export async function uploadVaultFile(
    uid: string,
    folderId: string | null,
    subjectName: string,
    file: File,
    onProgress: UploadProgressCallback
): Promise<string> {
    const subtype = detectSubtype(file);
    const storagePath = `users/${uid}/vault_items/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    // Stage 1: Upload to Firebase Storage
    await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on(
            'state_changed',
            (snapshot) => {
                onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            },
            reject,
            () => resolve()
        );
    });

    const downloadURL = await getDownloadURL(storageRef);

    // Stage 2: Create Firestore item
    const itemsRef = collection(db, `users/${uid}/vault_items`);
    const newDoc = await addDoc(itemsRef, {
        type: 'source' as VaultItemType,
        subtype,
        subjectId: null, // Will be set by a background auto-tagger
        title: file.name.replace(/\.[^/.]+$/, ''), // strip extension
        content: '',
        subjectName,
        tags: [],
        vaultId: folderId, // maintain backward mapping for now
        fileSize: file.size,
        pageCount: null,
        wordCount: null,
        isPYQ: false,
        isPinned: false,
        ghostSuppressed: false,
        missionId: null,
        createdBy: uid,
        chunkCount: 0,
        crossReferenceCount: 0,
        indexedAt: null,
        storageRef: storagePath,
        downloadURL,
        createdAt: serverTimestamp(),
        lastEditedAt: serverTimestamp(),
    });

    // Increment folder item count if it exists
    if (folderId) {
        const folderRef = doc(db, `users/${uid}/vaults`, folderId);
        await updateDoc(folderRef, { itemCount: increment(1) }).catch(() => {});
    }

    // Increment user storage counter
    await updateStorageCounter(uid, file.size);

    return newDoc.id;
}

/**
 * Create a vault item directly (no file upload — for notes, intel entries, etc.).
 * Used by QuickNotes and other orb tools.
 */
export async function createVaultItem(
    uid: string,
    folderId: string | null,
    data: Partial<VaultItem>
): Promise<string> {
    const itemsRef = collection(db, `users/${uid}/vault_items`);
    const newDoc = await addDoc(itemsRef, {
        ...data,
        subjectId: data.subjectId ?? null,
        tags: data.tags ?? [],
        vaultId: folderId,
        createdBy: uid,
        chunkCount: data.chunkCount ?? 0,
        crossReferenceCount: data.crossReferenceCount ?? 0,
        indexedAt: data.indexedAt ?? null,
        storageRef: data.storageRef ?? null,
        createdAt: serverTimestamp(),
        lastEditedAt: serverTimestamp(),
    });

    // Increment folder item count if exists
    if (folderId) {
        const folderRef = doc(db, `users/${uid}/vaults`, folderId);
        await updateDoc(folderRef, { itemCount: increment(1) }).catch(() => {});
    }

    return newDoc.id;
}

// ─── Auto-Weave Log ───────────────────────────────────────────────────────────

export function subscribeToAutoWeaveLog(uid: string, onUpdate: (logs: AutoWeaveLog[]) => void) {
    const q = query(
        collection(db, `users/${uid}/autoWeaveLog`),
        orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const logs: AutoWeaveLog[] = [];
        snapshot.forEach((d) => logs.push({ id: d.id, ...d.data() } as AutoWeaveLog));
        onUpdate(logs);
    }, (err) => console.error("Error subscribing to auto-weave log:", err));
}

export async function clearAutoWeaveLog(uid: string) {
    const logsSnap = await getDocs(collection(db, `users/${uid}/autoWeaveLog`));
    const batch = writeBatch(db);
    logsSnap.docs.forEach(d => batch.delete(d.ref));
    return batch.commit();
}
