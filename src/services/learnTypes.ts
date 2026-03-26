/**
 * Shared types for the Learn Hub — Sessions, Oracle, Knowledge Graph, Voice
 */

export type CognitiveMode = 'scholar' | 'sniper';
export type SourceLockMode = 'strict' | 'hybrid';
export type BaselineLevel = 'novice' | 'intermediate' | 'advanced';
export type SessionStatus = 'active' | 'paused' | 'completed';

export interface StudySession {
    id: string;
    userId: string;
    subject: string;
    topic: string;
    missionId: string | null;
    cognitiveMode: CognitiveMode;
    sourceLock: SourceLockMode;
    baseline: BaselineLevel;
    status: SessionStatus;
    durationSeconds: number;
    startedAt: any; // Timestamp
    pausedAt: any | null;
    completedAt: any | null;
}

export interface OracleConversation {
    id: string;
    userId: string;
    subjectId: string;
    topicName: string;
    title: string;
    mode: CognitiveMode;
    sourceLock: SourceLockMode;
    messageCount: number;
    lastMessageAt: any;
    createdAt: any;
}

export interface OracleMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citedPages: number[];
    timestamp: any;
}

export type GraphNodeType = 'core' | 'concept' | 'data' | 'output';

export interface KnowledgeGraph {
    id: string;
    userId: string;
    subjectId: string;
    missionId: string | null;
    title: string;
    nodeCount: number;
    edgeCount: number;
    lastUpdated: any;
}

export interface GraphNode {
    id: string;
    label: string;
    type: GraphNodeType;
    x: number;
    y: number;
    notes: string;
    createdFrom: 'manual' | 'voice' | 'ghost' | 'agent_expand';
    createdAt: any;
}

export interface GraphEdge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    label: string;
    createdAt: any;
}

export interface VoiceCapture {
    id: string;
    transcript: string;
    routedTo: 'note' | 'graph' | null;
    nodeId: string | null;
    createdAt: any;
}

export interface GhostEvent {
    id: string;
    matchedItemId: string;
    matchedTitle: string;
    matchedPreview: string;
    similarityScore: number;
    action: 'shown' | 'accepted' | 'dismissed';
    timestamp: any;
}

// Node color mapping
export const NODE_COLORS: Record<GraphNodeType, string> = {
    core: '#10D9A0',
    concept: '#7C3AED',
    data: '#F59E0B',
    output: '#10D9A0',
};

export const NODE_SIZES: Record<GraphNodeType, number> = {
    core: 36,
    concept: 28,
    data: 22,
    output: 26,
};
