/**
 * Shared types for the Schedule page — Calendar Blocks & Kanban Tasks
 */

export interface CalendarBlock {
    id: string;
    subject: string;
    topic: string;
    missionId: string | null;
    taskId: string | null;
    date: string; // 'YYYY-MM-DD'
    startTime: string; // 'HH:MM'
    endTime: string; // 'HH:MM'
    duration: number; // minutes
    mode: 'sniper' | 'scholar';
    sourceReference: string | null;
    isAIPlaced: boolean;
    status: 'scheduled' | 'inProgress' | 'completed' | 'missed' | 'cancelled';
    subjectColour: string; // hex or tailwind class
    createdAt: any; // Firestore Timestamp
    agentBatchId: string | null;
}

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'Backlog' | 'Unstarted' | 'In Progress' | 'Completed' | 'Cancelled';

export interface TaskLabel {
    id: string;
    name: string;
    color: string;
}

export interface CustomColumn {
    id: string;
    title: string;
    order: number;
    icon?: string;
}

export interface TaskPropertyToggle {
    key: keyof KanbanTask;
    label: string;
    visible: boolean;
}

export interface KanbanBoard {
    id: string;
    title: string;
    groupByProperty: string;
    subGroupByProperty?: string;
    displayProperties?: Record<string, boolean>;
    filters?: Record<string, any>;
    columns?: CustomColumn[]; // Array of custom columns specific to this board
}

export interface Subtask {
    id: string;
    title: string;
    done: boolean;
}

export interface Timelog {
    date: string; // ISO String
    duration: number; // minutes or seconds
}

export interface KanbanTask {
    id: string;
    title: string;
    subject: string;
    topic: string;
    missionId: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: any | null; // Firestore Timestamp
    startDate?: any | null; // Firestore Timestamp
    targetDate?: any | null; // Firestore Timestamp
    date?: string | null; // 'YYYY-MM-DD' for calendar sync
    startTime?: string | null; // 'HH:MM'
    endTime?: string | null; // 'HH:MM'
    estimatedDuration: number; // minutes
    actualDuration: number;
    estimatePoints?: number;
    kanbanOrder: number;
    completedAt: any | null;
    linkedCalendarBlockId: string | null;
    sourceReference: string | null;
    subtasks: Subtask[];
    linkedPYQIds: string[];
    labelIds: string[];
    assigneeIds: string[];
    attachmentCount: number;
    linkCount: number;
    parentTaskId: string | null;
    mode?: 'sniper' | 'scholar';
    subjectColour: string;
    createdFrom: 'mission' | 'quickTodo' | 'manual' | 'agent';
    customProperties?: Record<string, any>;
    dependencies?: string[];
    timelogs?: Timelog[];
    notes?: string;
    boardIds?: string[];
}

export type ScheduleActionType = 'create_block' | 'update_task' | 'move_block' | 'delete_block' | 'create_task';

export interface ScheduleAction {
    id: string;
    type: ScheduleActionType;
    payload: any;
    reason?: string;
}

export interface ActiveMission {
    id: string;
    subject: string;
    examDate: any; // Firestore Timestamp
    status: 'active' | 'paused';
    masteryPercent: number;
    subjectColour: string;
}

// Subject colour palette (12 colours)
export const SUBJECT_COLOURS = [
    '#ef4444', // red
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#3b82f6', // blue
    '#84cc16', // lime
    '#06b6d4', // cyan
    '#a855f7', // purple
];
