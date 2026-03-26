/**
 * Cerebra Firestore Seed Script
 * Uses Firebase REST API with a token from Firebase CLI cache.
 * Creates initial Firestore collection structure for the Cerebra app.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PROJECT_ID = "cerebra-17706";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Get access token from Firebase CLI's credential store ──────────────────
function getFirebaseToken() {
    // Try reading from the firebase config file
    const configPaths = [
        path.join(os.homedir(), '.config', 'firebase', 'config.json'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'firebase', 'config.json'),
        path.join(process.env.APPDATA || '', 'firebase', 'config.json'),
    ];

    for (const p of configPaths) {
        try {
            if (fs.existsSync(p)) {
                const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
                console.log("Found firebase config at:", p);
                return cfg;
            }
        } catch (e) { /* skip */ }
    }

    // Try using gcloud's default credentials
    try {
        const token = execSync(
            'powershell -ExecutionPolicy Bypass -Command "npx firebase-tools --version; $env:GOOGLE_APPLICATION_CREDENTIALS"',
            { encoding: 'utf8' }
        );
        console.log("Firebase tools output:", token.slice(0, 200));
    } catch (e) { /* skip */ }

    return null;
}

// ── Convert plain JS value → Firestore REST API Value type ────────────────
function toFSValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFSValue) } };
    if (typeof val === 'object') {
        return {
            mapValue: {
                fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, toFSValue(v)]))
            }
        };
    }
    return { stringValue: String(val) };
}

// ── Upsert a Firestore document via REST ──────────────────────────────────
async function writeDoc(docPath, data, token) {
    const url = `${BASE_URL}/${docPath}`;
    const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFSValue(v)]));

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
    });

    const body = await res.json();
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(body?.error)}`);
    }
    return body;
}

// ── Main seed function ────────────────────────────────────────────────────
async function seed() {
    console.log("🔥 Cerebra — Firestore Seed Script");
    console.log("   Project:", PROJECT_ID);
    console.log("");

    // Try to get a token from Firebase CLI
    let token = null;
    try {
        // Firebase CLI stores tokens in a credentials file
        const tokenFile = path.join(os.homedir(), 'AppData', 'Roaming', 'firebase', 'credentials.json');
        if (fs.existsSync(tokenFile)) {
            const creds = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
            token = creds?.tokens?.access_token;
            console.log("✅ Found Firebase CLI credentials");
        }
    } catch (e) {
        console.log("ℹ️  No CLI credentials file found, will try unauthenticated...");
    }

    // ── Documents to create ────────────────────────────────────────────────
    const docs = [
        {
            path: '_meta/system',
            data: {
                initialized: true,
                appName: 'Cerebra',
                version: '1.0.0',
                description: 'Memree Study Assistant — Firestore Database',
                createdAt: new Date().toISOString(),
                schema: [
                    'users/{uid}',
                    'users/{uid}/vaults/{vaultId}',
                    'users/{uid}/vaults/{vaultId}/items/{itemId}',
                    'users/{uid}/autoWeaveLog/{logId}',
                ]
            }
        },
        {
            path: '_meta/schema',
            data: {
                collections: {
                    users: 'Top-level user profile documents, keyed by Firebase Auth UID',
                    vaults: 'Subject folders under each user. Each vault holds study material.',
                    items: 'Vault items: uploaded PDFs, notes, intel. Subcollection of vaults.',
                    autoWeaveLog: 'AI cross-reference activity logs per user.'
                },
                itemTypes: ['source', 'workspace', 'intel', 'chat_memory'],
                itemSubtypes: ['pdf', 'docx', 'txt', 'image', 'audio', 'note', 'other'],
                vaultFields: ['name', 'subjectColour', 'itemCount', 'isShared', 'ownerId', 'createdAt'],
                itemFields: ['type', 'subtype', 'title', 'content', 'fileSize', 'pageCount', 'isPinned',
                    'isPYQ', 'ghostSuppressed', 'storageRef', 'downloadURL', 'indexedAt',
                    'createdBy', 'vaultId', 'subjectName', 'createdAt', 'lastEditedAt']
            }
        }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const doc of docs) {
        try {
            await writeDoc(doc.path, doc.data, token);
            console.log(`✅ Created: ${doc.path}`);
            successCount++;
        } catch (err) {
            console.error(`❌ Failed: ${doc.path} — ${err.message}`);
            errorCount++;
        }
    }

    console.log("");
    if (successCount > 0) {
        console.log(`🎉 Seed complete! ${successCount} documents created.`);
        console.log("");
        console.log("📦 Your Firestore structure:");
        console.log("   _meta/system    — App initialization flag");
        console.log("   _meta/schema    — Collection schema documentation");
        console.log("");
        console.log("   When users sign in & create subjects, data will be stored at:");
        console.log("   users/{uid}/vaults/{vaultId}/items/{itemId}");
        console.log("");
        console.log("🔗 View in console:");
        console.log(`   https://console.firebase.google.com/project/${PROJECT_ID}/firestore`);
    } else {
        console.log("💡 NEXT STEPS:");
        console.log("   The Firestore rules block unauthenticated admin writes.");
        console.log("   To seed data, you need a Service Account key.");
        console.log("   Here's how to generate one:");
        console.log("");
        console.log("   1. Go to: https://console.firebase.google.com/project/cerebra-17706/settings/serviceaccounts/adminsdk");
        console.log("   2. Click 'Generate new private key'");
        console.log("   3. Save the JSON file as 'service-account.json' in the cerebra/ folder");
        console.log("   4. Run: node seed-admin-sa.mjs");
        console.log("");
        console.log("   OR: The app will auto-create collections when you sign in and create your first subject.");
    }
}

seed().catch(console.error);
