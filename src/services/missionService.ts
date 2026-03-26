import { db, auth } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    onSnapshot,
} from 'firebase/firestore';

// ─── Nested types ──────────────────────────────────────────────────────────────
export interface SourceRef {
    name: string;
    url?: string;         // Firebase Storage download URL
    type: 'pdf' | 'link' | 'text' | 'image';
    addedAt: Timestamp | null;
}

export interface StudyPreferences {
    teachingStyle: 'socratic' | 'direct' | 'challenge';   // how agent teaches
    questionFrequency: 'low' | 'medium' | 'high';          // how often agent asks Qs
    depthLevel: 'overview' | 'deep' | 'mastery';           // depth of explanation
    referenceSources: string;                               // free-text references/links
    additionalNotes: string;                                // free-text instructions
}

export interface RevisionPlan {
    hoursPerDay: number;
    days: string[];          // ['Mon','Tue', ...]
    startDate: string;       // ISO date
}

// ─── Main Mission Doc ──────────────────────────────────────────────────────────
export interface MissionDoc {
    id: string;
    subject: string;
    missionType: 'exam' | 'assignment' | 'project';
    missionName: string;
    deadline: string;
    difficulty: 'easy' | 'medium' | 'hard';
    sourceLock: 'strict' | 'general';
    cognitiveMode: 'sniper' | 'scholar';
    baseline: 'novice' | 'intermediate' | 'advanced';
    hasPYQs: boolean;
    weekdayHours: number;
    weekendHours: number;
    customPrompt: string;
    status: 'planning' | 'scheduled' | 'learning' | 'arranged' | 'revising' | 'completed';
    currentStep: number;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
    completedAt: Timestamp | null;
    totalStudyTime: number;
    vaultId: string | null;
    vaultName: string | null;
    locked?: boolean;

    // ── NEW: Learning Context (set in LearnStep) ──
    pyqSources: SourceRef[];          // uploaded PYQ files
    studySources: SourceRef[];        // uploaded study source files
    studyPreferences: StudyPreferences | null;
    learnContextReady: boolean;       // verified checklist complete

    // ── NEW: Revision Plan (set in ReviseStep) ──
    revisionPlan: RevisionPlan | null;
}

function uid(): string {
    return auth.currentUser?.uid ?? 'guest';
}

function missionsRef() {
    return collection(db, 'users', uid(), 'missions');
}

function missionDocRef(missionId: string) {
    return doc(db, 'users', uid(), 'missions', missionId);
}

// ─── Create ────────────────────────────────────────────────────────────────────
export async function createMission(
    data: Omit<MissionDoc, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'totalStudyTime' | 'vaultId' | 'vaultName' | 'pyqSources' | 'studySources' | 'studyPreferences' | 'learnContextReady' | 'revisionPlan'>
): Promise<string> {
    const newDoc = doc(missionsRef());
    const mission: Omit<MissionDoc, 'id'> = {
        ...data,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        completedAt: null,
        totalStudyTime: 0,
        vaultId: null,
        vaultName: null,
        pyqSources: [],
        studySources: [],
        studyPreferences: null,
        learnContextReady: false,
        revisionPlan: null,
    };
    await setDoc(newDoc, { id: newDoc.id, ...mission });
    return newDoc.id;
}

// ─── Update ────────────────────────────────────────────────────────────────────
export async function updateMissionDoc(missionId: string, data: Partial<MissionDoc>): Promise<void> {
    await updateDoc(missionDocRef(missionId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ─── Save Learning Context ─────────────────────────────────────────────────────
export async function saveLearningContext(
    missionId: string,
    context: {
        pyqSources: SourceRef[];
        studySources: SourceRef[];
        studyPreferences: StudyPreferences;
        learnContextReady: boolean;
    }
): Promise<void> {
    await updateDoc(missionDocRef(missionId), {
        ...context,
        status: 'learning',
        currentStep: 3,
        updatedAt: serverTimestamp(),
    });
}

// ─── Save Revision Plan ────────────────────────────────────────────────────────
export async function saveRevisionPlan(missionId: string, plan: RevisionPlan): Promise<void> {
    await updateDoc(missionDocRef(missionId), {
        revisionPlan: plan,
        updatedAt: serverTimestamp(),
    });
}

// ─── Complete ──────────────────────────────────────────────────────────────────
export async function completeMission(missionId: string): Promise<void> {
    await updateDoc(missionDocRef(missionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

// ─── Workspace ─────────────────────────────────────────────────────────────────
export async function initializeWorkspace(missionId: string, vaultName: string): Promise<void> {
    const vaultDoc = doc(collection(db, 'users', uid(), 'vaults'));
    await setDoc(vaultDoc, {
        id: vaultDoc.id,
        missionId,
        name: vaultName,
        subTabs: ['Sources', 'Chats', 'Workspaces', 'Intel'],
        createdAt: serverTimestamp(),
    });

    const workspaceDoc = doc(collection(db, 'users', uid(), 'vaults', vaultDoc.id, 'items'));
    await setDoc(workspaceDoc, {
        id: workspaceDoc.id,
        type: 'workspace',
        title: `${vaultName} — Notes`,
        content: '',
        createdAt: serverTimestamp(),
    });

    await updateDoc(missionDocRef(missionId), {
        vaultId: vaultDoc.id,
        vaultName,
        status: 'arranged',
        currentStep: 5,
        updatedAt: serverTimestamp(),
    });
}

// ─── Read ──────────────────────────────────────────────────────────────────────
export async function getMission(missionId: string): Promise<MissionDoc | null> {
    const snap = await getDoc(missionDocRef(missionId));
    if (!snap.exists()) return null;
    return snap.data() as MissionDoc;
}

export async function listMissions(): Promise<MissionDoc[]> {
    const q = query(missionsRef(), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MissionDoc);
}

export function subscribeMissionsList(callback: (missions: MissionDoc[]) => void): () => void {
    const q = query(missionsRef(), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => d.data() as MissionDoc));
    });
}

export function subscribeMissionDoc(missionId: string, callback: (mission: MissionDoc | null) => void): () => void {
    return onSnapshot(missionDocRef(missionId), (snap) => {
        if (!snap.exists()) { callback(null); return; }
        callback(snap.data() as MissionDoc);
    });
}

// ─── Study Session ─────────────────────────────────────────────────────────────
export async function createStudySession(missionId: string, sessionData: {
    subject: string;
    topic: string;
    sessionType: 'learn' | 'flashcard' | 'mcq' | 'oral';
}) {
    const sessionDoc = doc(collection(db, 'users', uid(), 'studySessions'));
    await setDoc(sessionDoc, {
        id: sessionDoc.id,
        missionId,
        ...sessionData,
        startedAt: serverTimestamp(),
        endedAt: null,
        durationSeconds: 0,
        status: 'active',
        scorePercentage: 0,
        weakTopics: [],
        moodRating: null,
        notes: [],
    });
    return sessionDoc.id;
}
