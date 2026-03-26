/**
 * Schedule Service — Firebase CRUD with Mock Fallbacks for Development
 */
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { CalendarBlock, KanbanTask, ActiveMission, CustomColumn, KanbanBoard, TaskStatus, Timelog, TaskLabel } from './scheduleTypes';

// Helper to get current user ID
function getCurrentUserId(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) {
        console.warn('[scheduleService] No authenticated user, using demo user');
        return 'demo_user_001';
    }
    return uid;
}

// ─── Mock Data Fallbacks ─────────────────────────────────────────────────────

const MOCK_LABELS: TaskLabel[] = [
    { id: 'l1', name: 'Urgent', color: '#ef4444' },
    { id: 'l2', name: 'Exam Focus', color: '#6366f1' },
    { id: 'l3', name: 'Practical', color: '#10b981' },
];

const MOCK_COLUMNS: CustomColumn[] = [
    { id: 'Backlog', title: 'BACKLOG', order: 1, icon: '📋' },
    { id: 'Unstarted', title: 'UNSTARTED', order: 2, icon: '⏳' },
    { id: 'In Progress', title: 'IN PROGRESS', order: 3, icon: '🔥' },
    { id: 'Completed', title: 'COMPLETED', order: 4, icon: '✅' },
    { id: 'Cancelled', title: 'CANCELLED', order: 5, icon: '🚫' }
];

const MOCK_BOARDS: KanbanBoard[] = [
    {
        id: 'default-board',
        title: 'Main Board',
        groupByProperty: 'status',
        displayProperties: { title: true, priority: true, labels: true, subject: true }
    }
];

const MOCK_MISSIONS: ActiveMission[] = [
    {
        id: 'mock-m1',
        subject: 'Advanced Cardiology',
        examDate: Timestamp.fromDate(new Date('2025-04-15')),
        status: 'active',
        masteryPercent: 45,
        subjectColour: '#ef4444'
    },
    {
        id: 'mock-m2',
        subject: 'Data Structures',
        examDate: Timestamp.fromDate(new Date('2025-03-20')),
        status: 'active',
        masteryPercent: 80,
        subjectColour: '#6366f1'
    }
];

const MOCK_TASKS: KanbanTask[] = [
    {
        id: 'mock-t1',
        title: 'Krebs Cycle — Enzyme Mechanisms',
        subject: 'Advanced Cardiology',
        topic: 'Chapter 3 · Enzyme Mech.',
        missionId: 'mock-m1',
        priority: 'high',
        status: 'In Progress',
        dueDate: Timestamp.fromDate(new Date('2025-03-12')),
        estimatedDuration: 90,
        actualDuration: 0,
        kanbanOrder: 1,
        completedAt: null,
        linkedCalendarBlockId: 'mock-b1',
        sourceReference: 'Cardiology_Textbook.pdf',
        subtasks: [{ id: 's1', title: 'Read pages 45–52', done: true }],
        linkedPYQIds: [],
        labelIds: ['l1', 'l2'],
        assigneeIds: [],
        attachmentCount: 1,
        linkCount: 0,
        parentTaskId: null,
        mode: 'scholar',
        subjectColour: '#ef4444',
        createdFrom: 'manual',
        timelogs: [],
        customProperties: {},
        dependencies: []
    }
];

const MOCK_BLOCKS: CalendarBlock[] = [
    {
        id: 'mock-b1',
        subject: 'Advanced Cardiology',
        topic: 'Krebs Cycle',
        missionId: 'mock-m1',
        taskId: 'mock-t1',
        date: new Date().toISOString().split('T')[0], // Today
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        mode: 'scholar',
        sourceReference: 'Cardiology_Textbook.pdf',
        isAIPlaced: false,
        status: 'scheduled',
        subjectColour: '#ef4444',
        createdAt: Timestamp.now(),
        agentBatchId: ''
    }
];

// ─── Helper for Fallback Listeners ──────────────────────────────────────────

function createSafeSubscription<T>(
    q: any,
    callback: (data: T[]) => void,
    fallbackData: T[]
) {
    return onSnapshot(q,
        (snap) => {
            const data = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as T[];
            callback(data.length > 0 ? data : fallbackData);
        },
        (error) => {
            console.warn("Firestore subscription failed (likely permissions). Using mock data.", error);
            callback(fallbackData);
        }
    );
}

// ─── Calendar Blocks ─────────────────────────────────────────────────────────

export function subscribeCalendarBlocks(
    weekStart: string,
    weekEnd: string,
    callback: (blocks: CalendarBlock[]) => void,
    missionId?: string | null
) {
    const uid = getCurrentUserId();
    let q = query(
        collection(db, `users/${uid}/calendarBlocks`),
        where('date', '>=', weekStart),
        where('date', '<=', weekEnd)
    );

    if (missionId) {
        q = query(q, where('missionId', '==', missionId));
    }

    // Secondary ordering
    q = query(q, orderBy('date', 'asc'), orderBy('startTime', 'asc'));

    return createSafeSubscription(q, callback, MOCK_BLOCKS);
}

export async function createCalendarBlock(block: Omit<CalendarBlock, 'id' | 'createdAt'>) {
    const uid = getCurrentUserId();
    try {
        const ref = collection(db, `users/${uid}/calendarBlocks`);
        const docRef = await addDoc(ref, { ...block, createdAt: serverTimestamp() });
        return docRef.id;
    } catch (e) {
        console.error("Local save only (Permissions):", e);
        return `local-${Date.now()}`;
    }
}

export async function updateCalendarBlock(blockId: string, updates: Partial<CalendarBlock>) {
    if (blockId.startsWith('local-') || blockId.startsWith('mock-')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/calendarBlocks`, blockId);
    await updateDoc(ref, updates);
}

export async function deleteCalendarBlock(blockId: string) {
    if (blockId.startsWith('local-') || blockId.startsWith('mock-')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/calendarBlocks`, blockId);
    await deleteDoc(ref);
}

// ─── Kanban Tasks ─────────────────────────────────────────────────────────────

export function subscribeTasks(callback: (tasks: KanbanTask[]) => void, missionId?: string | null) {
    const uid = getCurrentUserId();
    let q = query(
        collection(db, `users/${uid}/tasks`)
    );

    if (missionId) {
        q = query(q, where('missionId', '==', missionId));
    }

    q = query(q, orderBy('kanbanOrder', 'asc'));
    
    return createSafeSubscription(q, callback, MOCK_TASKS);
}

export async function createTask(task: Omit<KanbanTask, 'id'>) {
    const uid = getCurrentUserId();
    try {
        const ref = collection(db, `users/${uid}/tasks`);
        const docRef = await addDoc(ref, task);
        return docRef.id;
    } catch (e) {
        return `local-t-${Date.now()}`;
    }
}

export async function updateTask(taskId: string, updates: Partial<KanbanTask>) {
    if (taskId.startsWith('local-') || taskId.startsWith('mock-')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/tasks`, taskId);
    await updateDoc(ref, updates as any);
}

export async function bulkUpdateTasks(taskUpdates: { id: string, updates: Partial<KanbanTask> }[]) {
    const uid = getCurrentUserId();
    const batch = writeBatch(db);
    
    taskUpdates.forEach(({ id, updates }) => {
        if (id.startsWith('local-') || id.startsWith('mock-')) return;
        const ref = doc(db, `users/${uid}/tasks`, id);
        batch.update(ref, updates as any);
    });

    await batch.commit();
}

export async function deleteTask(taskId: string) {
    if (taskId.startsWith('local-') || taskId.startsWith('mock-')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/tasks`, taskId);
    await deleteDoc(ref);
}

// ─── Labels ─────────────────────────────────────────────────────────────

export function subscribeLabels(callback: (labels: TaskLabel[]) => void) {
    const uid = getCurrentUserId();
    const q = query(
        collection(db, `users/${uid}/labels`),
        orderBy('name', 'asc')
    );
    return createSafeSubscription(q, callback, MOCK_LABELS);
}

export async function createLabel(label: Omit<TaskLabel, 'id'>) {
    const uid = getCurrentUserId();
    const ref = collection(db, `users/${uid}/labels`);
    const docRef = await addDoc(ref, label);
    return docRef.id;
}

// ─── Active Missions ──────────────────────────────────────────────────────────

export function subscribeMissions(callback: (missions: ActiveMission[]) => void) {
    const uid = getCurrentUserId();
    const q = query(
        collection(db, `users/${uid}/missions`),
        orderBy('examDate', 'asc')
    );
    return createSafeSubscription(q, callback, MOCK_MISSIONS);
}

// ─── Custom Columns ───────────────────────────────────────────────────────────

export function subscribeColumns(callback: (columns: CustomColumn[]) => void) {
    const uid = getCurrentUserId();
    const q = query(
        collection(db, `users/${uid}/columns`),
        orderBy('order', 'asc')
    );
    return createSafeSubscription(q, callback, MOCK_COLUMNS);
}

export async function createColumn(column: Omit<CustomColumn, 'id'>) {
    const uid = getCurrentUserId();
    try {
        const ref = collection(db, `users/${uid}/columns`);
        const docRef = await addDoc(ref, column);
        return docRef.id;
    } catch (e) {
        return `local-c-${Date.now()}`;
    }
}

export async function updateColumn(columnId: string, updates: Partial<CustomColumn>) {
    if (columnId.startsWith('local-') || columnId.startsWith('mock-') || columnId.startsWith('backlog') || columnId.startsWith('thisWeek') || columnId.startsWith('today') || columnId.startsWith('done')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/columns`, columnId);
    await updateDoc(ref, updates as any);
}

export async function deleteColumn(columnId: string) {
    if (columnId.startsWith('local-') || columnId.startsWith('mock-') || columnId.startsWith('backlog') || columnId.startsWith('thisWeek') || columnId.startsWith('today') || columnId.startsWith('done')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/columns`, columnId);
    await deleteDoc(ref);
}

// ─── Kanban Boards ───────────────────────────────────────────────────────────

export function subscribeBoards(callback: (boards: KanbanBoard[]) => void) {
    const uid = getCurrentUserId();
    const q = query(
        collection(db, `users/${uid}/boards`),
        orderBy('title', 'asc')
    );
    return createSafeSubscription(q, callback, MOCK_BOARDS);
}

export async function createBoard(board: Omit<KanbanBoard, 'id'>) {
    const uid = getCurrentUserId();
    try {
        const ref = collection(db, `users/${uid}/boards`);
        const docRef = await addDoc(ref, board);
        return docRef.id;
    } catch (e) {
        return `local-b-${Date.now()}`;
    }
}

export async function updateBoard(boardId: string, updates: Partial<KanbanBoard>) {
    if (boardId.startsWith('local-') || boardId.startsWith('mock-')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/boards`, boardId);
    await updateDoc(ref, updates as any);
}

export async function deleteBoard(boardId: string) {
    if (boardId.startsWith('local-') || boardId.startsWith('mock-')) return;
    const uid = getCurrentUserId();
    const ref = doc(db, `users/${uid}/boards`, boardId);
    await deleteDoc(ref);
}

// ─── Temporal Agent — Batch apply schedule changes ───────────────────────────

export async function applyAgentActions(actions: any[], batchId: string) {
    const uid = getCurrentUserId();
    try {
        const batch = writeBatch(db);
        for (const a of actions) {
            if (a.action === 'create_block') {
                const ref = doc(collection(db, `users/${uid}/calendarBlocks`));
                batch.set(ref, { ...a, createdAt: serverTimestamp(), agentBatchId: batchId });
            }
        }
        await batch.commit();
    } catch (e) {
        console.warn("Batch apply failed (Permissions). Actions logged to console:", actions);
    }
}

// ─── Export Helpers ──────────────────────────────────────────────────────────

export function exportToCSV(blocks: CalendarBlock[], tasks: KanbanTask[]): string {
    let csv = 'Subject,Topic,Date,Start Time,End Time\n';
    blocks.forEach(b => csv += `"${b.subject}","${b.topic}","${b.date}","${b.startTime}","${b.endTime}"\n`);
    return csv;
}

export function exportToICS(blocks: CalendarBlock[]): string {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\n';
    blocks.forEach(b => {
        const date = b.date.replace(/-/g, '');
        ics += `BEGIN:VEVENT\nSUMMARY:${b.subject}\nDTSTART:${date}T090000\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    return ics;
}
