import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  createMission, updateMissionDoc,
  completeMission as completeMissionFB,
  initializeWorkspace, getMission,
  saveLearningContext, saveRevisionPlan,
  type SourceRef, type StudyPreferences, type RevisionPlan,
} from '../services/missionService';

export type MissionType = 'exam' | 'assignment' | 'project';
export type SchedulingMode = 'autopilot' | 'manual';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SourceLock = 'strict' | 'general';
export type CognitiveMode = 'sniper' | 'scholar';
export type Baseline = 'novice' | 'intermediate' | 'advanced';
export type MissionStatus = 'planning' | 'scheduled' | 'learning' | 'arranged' | 'revising' | 'completed';

export interface MissionData {
  missionType: MissionType;
  subject: string;
  missionName: string;
  deadline: string;
  scheduling: SchedulingMode;
  difficulty: Difficulty;
  hasPYQs: boolean;
  pyqFiles: File[];
  sourceLock: SourceLock;
  cognitiveMode: CognitiveMode;
  baseline: Baseline;
  customPrompt: string;
  weekdayHours: number;
  weekendHours: number;
  status: MissionStatus;
  vaultId: string | null;
  vaultName: string | null;

  // Learning context (Step 3)
  pyqSources: SourceRef[];
  studySources: SourceRef[];
  studyPreferences: StudyPreferences;
  learnContextReady: boolean;

  // Revision plan (Step 5)
  revisionPlan: RevisionPlan;
}

interface MissionContextType {
  currentStep: number;
  highestCompletedStep: number;
  missionData: MissionData;
  missionId: string | null;
  isLoading: boolean;
  setStep: (step: number) => void;
  updateMissionData: (data: Partial<MissionData>) => void;
  initializeMission: () => Promise<void>;
  saveLearnContext: () => Promise<void>;
  confirmArrange: (vaultName: string) => Promise<void>;
  completeMission: () => Promise<void>;
  lockSchedule: () => Promise<void>;
  saveRevision: (plan: RevisionPlan) => Promise<void>;
}

const defaultStudyPrefs: StudyPreferences = {
  teachingStyle: 'socratic',
  questionFrequency: 'medium',
  depthLevel: 'deep',
  referenceSources: '',
  additionalNotes: '',
};

const defaultRevisionPlan: RevisionPlan = {
  hoursPerDay: 2,
  days: ['Mon', 'Wed', 'Fri'],
  startDate: new Date().toISOString().split('T')[0],
};

const defaultMissionData: MissionData = {
  missionType: 'exam',
  subject: '',
  missionName: '',
  deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  scheduling: 'autopilot',
  difficulty: 'medium',
  hasPYQs: false,
  pyqFiles: [],
  sourceLock: 'general',
  cognitiveMode: 'scholar',
  baseline: 'intermediate',
  customPrompt: '',
  weekdayHours: 3,
  weekendHours: 5,
  status: 'planning',
  vaultId: null,
  vaultName: null,
  pyqSources: [],
  studySources: [],
  studyPreferences: defaultStudyPrefs,
  learnContextReady: false,
  revisionPlan: defaultRevisionPlan,
};

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [highestCompletedStep, setHighestCompletedStep] = useState(0);
  const [missionData, setMissionData] = useState<MissionData>(defaultMissionData);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setStep = (step: number) => {
    if (step <= highestCompletedStep + 1) {
      setCurrentStep(step);
    }
  };

  const updateMissionData = (data: Partial<MissionData>) => {
    setMissionData((prev) => ({ ...prev, ...data }));
  };

  // ── Step 1: Create mission in Firestore ──
  const initializeMission = async () => {
    setIsLoading(true);
    try {
      const name = missionData.subject
        ? `${missionData.subject} — ${missionData.missionType.charAt(0).toUpperCase() + missionData.missionType.slice(1)} Prep`
        : `Mission — ${new Date().toLocaleDateString()}`;

      const id = await createMission({
        subject: missionData.subject || 'Untitled Subject',
        missionType: missionData.missionType,
        missionName: name,
        deadline: missionData.deadline,
        difficulty: missionData.difficulty,
        sourceLock: missionData.sourceLock,
        cognitiveMode: missionData.cognitiveMode,
        baseline: missionData.baseline,
        hasPYQs: missionData.hasPYQs,
        weekdayHours: missionData.weekdayHours,
        weekendHours: missionData.weekendHours,
        customPrompt: missionData.customPrompt,
        status: 'scheduled',
        currentStep: 2,
      });

      setMissionId(id);
      updateMissionData({ missionName: name, status: 'scheduled' });
      setHighestCompletedStep(1);
      setCurrentStep(2);
    } catch (err) {
      console.error('Failed to create mission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Lock schedule ──
  const lockSchedule = async () => {
    if (!missionId) return;
    setIsLoading(true);
    try {
      await updateMissionDoc(missionId, { status: 'learning', currentStep: 3, locked: true });
      updateMissionData({ status: 'learning' });
      setHighestCompletedStep(2);
      setCurrentStep(3);
    } catch (err) {
      console.error('Failed to lock schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Save learning context ──
  const saveLearnContext = async () => {
    if (!missionId) return;
    setIsLoading(true);
    try {
      await saveLearningContext(missionId, {
        pyqSources: missionData.pyqSources,
        studySources: missionData.studySources,
        studyPreferences: missionData.studyPreferences,
        learnContextReady: true,
      });
      updateMissionData({ learnContextReady: true });
      setHighestCompletedStep(3);
      setCurrentStep(4);
    } catch (err) {
      console.error('Failed to save learn context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 4: Confirm arrange / initialize workspace ──
  const confirmArrange = async (vaultName: string) => {
    if (!missionId) return;
    setIsLoading(true);
    try {
      await initializeWorkspace(missionId, vaultName);
      const updatedMission = await getMission(missionId);
      if (updatedMission) {
        updateMissionData({
          status: 'arranged',
          vaultId: updatedMission.vaultId,
          vaultName: updatedMission.vaultName,
        });
      }
      setHighestCompletedStep(4);
      setCurrentStep(5);
    } catch (err) {
      console.error('Failed to initialize workspace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 5: Save revision plan ──
  const saveRevision = async (plan: RevisionPlan) => {
    if (!missionId) return;
    setIsLoading(true);
    try {
      await saveRevisionPlan(missionId, plan);
      updateMissionData({ revisionPlan: plan });
    } catch (err) {
      console.error('Failed to save revision plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Complete mission ──
  const completeMission = async () => {
    if (!missionId) return;
    setIsLoading(true);
    try {
      await completeMissionFB(missionId);
      updateMissionData({ status: 'completed' });
      setHighestCompletedStep(5);
    } catch (err) {
      console.error('Failed to complete mission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MissionContext.Provider
      value={{
        currentStep,
        highestCompletedStep,
        missionData,
        missionId,
        isLoading,
        setStep,
        updateMissionData,
        initializeMission,
        saveLearnContext,
        confirmArrange,
        completeMission,
        lockSchedule,
        saveRevision,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const context = useContext(MissionContext);
  if (context === undefined) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return context;
}
