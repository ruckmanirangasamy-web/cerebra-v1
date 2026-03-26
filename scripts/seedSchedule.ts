import { db } from '../src/lib/firebase.ts';
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';

const DEMO_UID = 'demo_user_001';

async function seedSchedule() {
    console.log('Seeding schedule data...');
    const batch = writeBatch(db);

    // Seed Missions
    const missionsRef = collection(db, `users/${DEMO_UID}/missions`);
    const m1 = doc(missionsRef);
    batch.set(m1, {
        subject: 'Advanced Cardiology',
        examDate: Timestamp.fromDate(new Date('2025-04-15')),
        status: 'active',
        masteryPercent: 45,
        subjectColour: '#ef4444' // red
    });
    const m2 = doc(missionsRef);
    batch.set(m2, {
        subject: 'Data Structures',
        examDate: Timestamp.fromDate(new Date('2025-03-20')),
        status: 'active',
        masteryPercent: 80,
        subjectColour: '#6366f1' // indigo
    });

    // Seed Kanban Tasks
    const tasksRef = collection(db, `users/${DEMO_UID}/tasks`);
    const t1 = doc(tasksRef);
    batch.set(t1, {
        title: 'Krebs Cycle — Enzyme Mechanisms',
        subject: 'Advanced Cardiology',
        topic: 'Chapter 3 · Enzyme Mech.',
        missionId: m1.id,
        priority: 'high',
        dueDate: Timestamp.fromDate(new Date('2025-03-12')),
        estimatedDuration: 90,
        actualDuration: 0,
        kanbanOrder: 1,
        status: 'In Progress',
        completedAt: null,
        linkedCalendarBlockId: null,
        sourceReference: 'Cardiology_Textbook.pdf',
        subtasks: [
            { id: 's1', title: 'Read pages 45–52', done: true },
            { id: 's2', title: 'Make flashcards for enzymes', done: false }
        ],
        linkedPYQIds: [],
        mode: 'scholar',
        subjectColour: '#ef4444',
        createdFrom: 'mission'
    });

    const t2 = doc(tasksRef);
    batch.set(t2, {
        title: 'Graph Algorithms Practice',
        subject: 'Data Structures',
        topic: 'Graphs',
        missionId: m2.id,
        priority: 'critical',
        dueDate: Timestamp.fromDate(new Date('2025-03-14')),
        estimatedDuration: 120,
        actualDuration: 0,
        kanbanOrder: 1,
        status: 'Backlog',
        completedAt: null,
        linkedCalendarBlockId: null,
        sourceReference: 'DSA_Notes.pdf',
        subtasks: [],
        linkedPYQIds: [],
        mode: 'sniper',
        subjectColour: '#6366f1',
        createdFrom: 'quickTodo'
    });

    // Seed Calendar Blocks
    const blocksRef = collection(db, `users/${DEMO_UID}/calendarBlocks`);
    const b1 = doc(blocksRef);
    batch.set(b1, {
        subject: 'Advanced Cardiology',
        topic: 'Krebs Cycle',
        missionId: m1.id,
        taskId: t1.id,
        date: '2025-03-05', // Wednesday in the demo week
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        mode: 'scholar',
        sourceReference: 'Cardiology_Textbook.pdf',
        isAIPlaced: false,
        status: 'scheduled',
        subjectColour: '#ef4444',
        createdAt: serverTimestamp(),
        agentBatchId: null
    });

    const b2 = doc(blocksRef);
    batch.set(b2, {
        subject: 'Data Structures',
        topic: 'Graph Algorithms',
        missionId: m2.id,
        taskId: t2.id,
        date: '2025-03-06', // Thursday in the demo week
        startTime: '14:00',
        endTime: '16:00',
        duration: 120,
        mode: 'sniper',
        sourceReference: 'DSA_Notes.pdf',
        isAIPlaced: true,
        status: 'scheduled',
        subjectColour: '#6366f1',
        createdAt: serverTimestamp(),
        agentBatchId: 'ai_123'
    });

    await batch.commit();
    console.log('Successfully seeded schedule data!');
    process.exit(0);
}

seedSchedule().catch(console.error);
