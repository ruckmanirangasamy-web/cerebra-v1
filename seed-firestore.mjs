/**
 * Firestore Seed Script
 * Creates the initial collections for Memree/Cerebra using Firebase REST API
 * (No Admin SDK needed - uses a test user document with Firestore REST API)
 */

const PROJECT_ID = "cerebra-17706";

// We'll use the Firebase REST API with a simple fetch
// This creates the initial 'users' collection structure

async function createDocument(docPath, data) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;

    // Convert JS object to Firestore REST API format
    function toFirestoreValue(val) {
        if (val === null) return { nullValue: null };
        if (typeof val === "boolean") return { booleanValue: val };
        if (typeof val === "number") return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
        if (typeof val === "string") return { stringValue: val };
        if (val instanceof Date) return { timestampValue: val.toISOString() };
        if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
        if (typeof val === "object") {
            return {
                mapValue: {
                    fields: Object.fromEntries(
                        Object.entries(val).map(([k, v]) => [k, toFirestoreValue(v)])
                    )
                }
            };
        }
        return { stringValue: String(val) };
    }

    const fields = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)])
    );

    const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to create ${docPath}: ${JSON.stringify(result.error)}`);
    }
    return result;
}

async function seedFirestore() {
    console.log("🔥 Seeding Firestore for project:", PROJECT_ID);
    console.log("");

    // NOTE: Firestore Security Rules require auth, so we're creating 
    // a __seed__ system document in a public collection for testing.
    // The actual user data will be created when users sign in via the app.

    try {
        // Create a _meta/system document to mark the DB as initialized
        await createDocument("_meta/system", {
            initialized: true,
            projectName: "Cerebra",
            version: "1.0.0",
            initializedAt: new Date().toISOString(),
            note: "This document marks the Firestore database as initialized for the Cerebra app.",
            collections: ["users/{uid}", "users/{uid}/vaults", "users/{uid}/vaults/{vaultId}/items", "users/{uid}/autoWeaveLog"]
        });
        console.log("✅ Created: _meta/system");

        // Create a sample template document in a public _templates collection
        await createDocument("_templates/vault_intro", {
            name: "Getting Started",
            description: "Your first subject template",
            type: "vault_folder",
            createdAt: new Date().toISOString()
        });
        console.log("✅ Created: _templates/vault_intro");

        console.log("");
        console.log("🎉 Firestore initialized! Here are the collections created:");
        console.log("   • _meta/ — System metadata");
        console.log("   • _templates/ — Default templates");
        console.log("");
        console.log("📌 Note: User-specific collections (users/, vaults/) will be");
        console.log("   auto-created when you sign in and create subjects in the app.");

    } catch (error) {
        console.error("❌ Error seeding Firestore:", error.message);
        console.log("");
        console.log("💡 This usually means Firestore API is not yet enabled.");
        console.log("   Go to: https://console.firebase.google.com/project/cerebra-17706/firestore");
        console.log("   and click 'Create database'.");
    }
}

seedFirestore();
