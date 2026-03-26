/**
 * Learn Hub Service — Firebase CRUD for Sessions, Oracle, Knowledge Graph
 */
import {
    collection, query, where, orderBy, onSnapshot, doc,
    addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs,
    Timestamp, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
    StudySession, OracleConversation, OracleMessage,
    KnowledgeGraph, GraphNode, GraphEdge, GraphNodeType
} from './learnTypes';

// const UID = 'demo_user_001'; // TODO: Replace with auth

// ─── Study Sessions ───
export function subscribeToActiveSession(uid: string, cb: (s: StudySession | null) => void) {
    const q = query(
        collection(db, 'users', uid, 'studySessions'),
        where('status', 'in', ['active', 'paused']),
        orderBy('startedAt', 'desc'),
        limit(1)
    );
    return onSnapshot(q, snap => {
        if (snap.empty) { cb(null); return; }
        const d = snap.docs[0];
        cb({ id: d.id, ...d.data() } as StudySession);
    });
}

export async function createSession(uid: string, data: Omit<StudySession, 'id'>) {
    return addDoc(collection(db, 'users', uid, 'studySessions'), {
        ...data, userId: uid, startedAt: serverTimestamp()
    });
}

export async function updateSession(uid: string, id: string, data: Partial<StudySession>) {
    return updateDoc(doc(db, 'users', uid, 'studySessions', id), data);
}

// ─── Oracle Conversations ───
export function subscribeToConversations(uid: string, subjectId: string, cb: (c: OracleConversation[]) => void) {
    const q = query(
        collection(db, 'users', uid, 'oracleConversations'),
        where('subjectId', '==', subjectId),
        orderBy('lastMessageAt', 'desc')
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as OracleConversation)));
    });
}

export async function createConversation(uid: string, data: Omit<OracleConversation, 'id'>) {
    return addDoc(collection(db, 'users', uid, 'oracleConversations'), {
        ...data, userId: uid, createdAt: serverTimestamp(), lastMessageAt: serverTimestamp()
    });
}

export async function addOracleMessage(uid: string, convId: string, msg: Omit<OracleMessage, 'id'>) {
    const ref = await addDoc(
        collection(db, 'users', uid, 'oracleConversations', convId, 'messages'),
        { ...msg, timestamp: serverTimestamp() }
    );
    await updateDoc(doc(db, 'users', uid, 'oracleConversations', convId), {
        lastMessageAt: serverTimestamp(),
        messageCount: (await getDocs(collection(db, 'users', uid, 'oracleConversations', convId, 'messages'))).size
    });
    return ref;
}

export function subscribeToMessages(uid: string, convId: string, cb: (m: OracleMessage[]) => void) {
    const q = query(
        collection(db, 'users', uid, 'oracleConversations', convId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as OracleMessage)));
    });
}

// ─── Knowledge Graph ───
export function subscribeToGraphNodes(uid: string, graphId: string, cb: (n: GraphNode[]) => void) {
    const q = query(collection(db, 'users', uid, 'knowledgeGraphs', graphId, 'nodes'));
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as GraphNode)));
    });
}

export function subscribeToGraphEdges(uid: string, graphId: string, cb: (e: GraphEdge[]) => void) {
    const q = query(collection(db, 'users', uid, 'knowledgeGraphs', graphId, 'edges'));
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as GraphEdge)));
    });
}

export async function getOrCreateGraph(uid: string, subjectId: string): Promise<string> {
    const q = query(
        collection(db, 'users', uid, 'knowledgeGraphs'),
        where('subjectId', '==', subjectId),
        limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
    const ref = await addDoc(collection(db, 'users', uid, 'knowledgeGraphs'), {
        userId: uid, subjectId, missionId: null,
        title: `${subjectId} Knowledge Graph`,
        nodeCount: 0, edgeCount: 0, lastUpdated: serverTimestamp()
    });
    return ref.id;
}

export async function createNode(
    uid: string,
    graphId: string,
    data: { label: string; type: GraphNodeType; x: number; y: number; createdFrom: GraphNode['createdFrom'] }
) {
    return addDoc(collection(db, 'users', uid, 'knowledgeGraphs', graphId, 'nodes'), {
        ...data, notes: '', createdAt: serverTimestamp()
    });
}

export async function updateNodePosition(uid: string, graphId: string, nodeId: string, x: number, y: number) {
    return updateDoc(doc(db, 'users', uid, 'knowledgeGraphs', graphId, 'nodes', nodeId), { x, y });
}

export async function updateNodeLabel(uid: string, graphId: string, nodeId: string, label: string) {
    return updateDoc(doc(db, 'users', uid, 'knowledgeGraphs', graphId, 'nodes', nodeId), { label });
}

export async function updateNodeNotes(uid: string, graphId: string, nodeId: string, notes: string) {
    return updateDoc(doc(db, 'users', uid, 'knowledgeGraphs', graphId, 'nodes', nodeId), { notes });
}

export async function deleteNode(uid: string, graphId: string, nodeId: string) {
    // Delete all edges connected to this node first
    const edgesSnap = await getDocs(collection(db, 'users', uid, 'knowledgeGraphs', graphId, 'edges'));
    const batch: Promise<void>[] = [];
    edgesSnap.docs.forEach(d => {
        const data = d.data();
        if (data.sourceNodeId === nodeId || data.targetNodeId === nodeId) {
            batch.push(deleteDoc(d.ref));
        }
    });
    await Promise.all(batch);
    return deleteDoc(doc(db, 'users', uid, 'knowledgeGraphs', graphId, 'nodes', nodeId));
}

export async function createEdge(
    uid: string,
    graphId: string,
    data: { sourceNodeId: string; targetNodeId: string; label: string }
) {
    return addDoc(collection(db, 'users', uid, 'knowledgeGraphs', graphId, 'edges'), {
        ...data, createdAt: serverTimestamp()
    });
}

export async function deleteEdge(uid: string, graphId: string, edgeId: string) {
    return deleteDoc(doc(db, 'users', uid, 'knowledgeGraphs', graphId, 'edges', edgeId));
}

// ─── Topic Coverage ───
export function subscribeToTopicCoverage(uid: string, missionId: string, cb: (topics: any[]) => void) {
    const q = query(
        collection(db, 'users', uid, 'missions', missionId, 'topicCoverage'),
        orderBy('order', 'asc')
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

export async function updateTopicCoverage(uid: string, missionId: string, topicId: string, data: any) {
    return updateDoc(doc(db, 'users', uid, 'missions', missionId, 'topicCoverage', topicId), data);
}

export async function addTopicCoverage(uid: string, missionId: string, data: any) {
    return addDoc(collection(db, 'users', uid, 'missions', missionId, 'topicCoverage'), data);
}

export async function deleteTopicCoverage(uid: string, missionId: string, topicId: string) {
    return deleteDoc(doc(db, 'users', uid, 'missions', missionId, 'topicCoverage', topicId));
}

// ─── Resource Links ───
export function subscribeToResources(uid: string, missionId: string, cb: (resources: any[]) => void) {
    const q = query(
        collection(db, 'users', uid, 'missions', missionId, 'resources'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

export async function addResource(uid: string, missionId: string, data: any) {
    return addDoc(collection(db, 'users', uid, 'missions', missionId, 'resources'), {
        ...data, createdAt: serverTimestamp()
    });
}

export async function deleteResource(uid: string, missionId: string, resourceId: string) {
    return deleteDoc(doc(db, 'users', uid, 'missions', missionId, 'resources', resourceId));
}
