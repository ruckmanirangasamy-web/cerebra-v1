import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function run() {
    const uid = "hR5hA3uN7dMFxS3o5fF06hK650u2"; // Current logged in user

    // First let's find a vault folder
    const vaults = await db.collection(`users/${uid}/vaults`).limit(1).get();
    if (vaults.empty) {
        console.log("No vaults found for this user");
        return;
    }
    const vaultId = vaults.docs[0].id;
    console.log("Using Vault:", vaults.docs[0].data().name, vaultId);

    // Create a mock item so keyword works
    const itemRef = await db.collection(`users/${uid}/vaults/${vaultId}/items`).add({
        type: 'source',
        subtype: 'pdf',
        title: 'Mock Relativity Physics Guide',
        content: '',
        chunkCount: 2,
        indexedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastEditedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        storageRef: null
    });
    console.log("Created Mock Item:", itemRef.id);

    // Create Chunks
    const chunksRef = itemRef.collection('chunks');

    await chunksRef.doc('0').set({
        uid,
        vaultId,
        itemId: itemRef.id,
        chunkIndex: 0,
        pageNumber: 1,
        text: "Albert Einstein developed the theory of special relativity in 1905. The formula E=mc^2 indicates that mass and energy are equivalent. The speed of light is constant for all observers."
    });

    await chunksRef.doc('1').set({
        uid,
        vaultId,
        itemId: itemRef.id,
        chunkIndex: 1,
        pageNumber: 2,
        text: "General relativity describes gravity as the geometric warping of spacetime by mass and energy. Black holes are regions where spacetime curvature is so extreme that nothing, not even light, can escape."
    });

    console.log("Chunks injected successfully!");
}

run().catch(console.error);
