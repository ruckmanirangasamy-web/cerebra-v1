/**
 * Shared types for the Vault — subjects, items, cross-references, and auto-weave logs.
 */

import { Timestamp } from 'firebase/firestore';

export type VaultItemType = 'chat' | 'note' | 'source' | 'pyq' | 'schedule' | 'mission' | 'uncategorised' | 'workspace' | 'intel';

export type VaultSubtype =
    | 'pdf' | 'docx' | 'txt' | 'image' | 'audio' // source subtypes
    | 'formula' | 'mnemonic' | 'definition' | 'date' | 'code' | 'note' | 'other'; // intel subtypes

export type AgentId = 'oracle' | 'sniper' | 'librarian' | 'temporal' | 'exam_solver' | 'dispatcher' | 'editor';

export interface VaultFolder {
    id: string; // Document ID
    name: string;
    subjectColour: string;
    missionIds: string[];
    itemCount: number;
    isShared: boolean;
    sharedWith?: {
        uid: string;
        email: string;
        accessLevel: 'view' | 'collaborate';
        addedAt: Timestamp;
    }[];
    ownerId: string;
    createdAt: Timestamp | Date;
}

export interface VaultItem {
    id: string; // Document ID
    type: VaultItemType;
    subtype?: VaultSubtype;
    agentId?: AgentId;
    subjectId: string | null;  // AI-detected; null = Uncategorised
    subjectName?: string; // Optional for display
    title: string;
    content: string | Record<string, any>; // string for source/intel, TipTap JSON for workspace
    tags: string[];

    // Legacy fields for backward compatibility
    vaultId?: string; 

    embedding?: number[]; // 1536-dim vector, only on backend normally but good for typing
    ghostSuppressed: boolean;
    isPinned: boolean;

    // Type-specific metadata
    fileSize?: number; // bytes, for sources
    pageCount?: number; // for PDFs
    wordCount?: number; // for workspaces/chat memories
    isPYQ?: boolean; // past-year question paper

    missionId?: string | null;
    createdBy: string;

    chunkCount: number;
    indexedAt?: Timestamp | Date | null;
    crossReferenceCount?: number;
    storageRef?: string | null;
    downloadURL?: string | null;

    createdAt: Timestamp | Date;
    lastEditedAt?: Timestamp | Date;
}

export interface CrossReference {
    id: string;
    itemAId: string;
    itemAVaultId: string;
    itemASubject: string;
    itemBId: string;
    itemBVaultId: string;
    itemBSubject: string;
    similarityScore: number;
    connectionDescription: string;
    discoveredAt: Timestamp | Date;
    isPinned: boolean;
}

export type AutoWeaveActionType =
    | 'auto_sort'
    | 'cross_ref'
    | 'duplicate_flag'
    | 'ghost_capture'
    | 'pyq_update'
    | 'auto_title';

export interface AutoWeaveLog {
    id: string;
    actionType: AutoWeaveActionType;
    summary: string;
    affectedItemIds: string[];
    undoPayload: Record<string, any>;
    undoAvailableUntil: Timestamp | Date;
    timestamp: Timestamp | Date;
}

// Search Options
export interface SemanticSearchOptions {
    subjectId?: string;
    itemType?: VaultItemType;
    limit?: number;
}
