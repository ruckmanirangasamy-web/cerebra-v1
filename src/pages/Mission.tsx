import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMission } from '../lib/MissionContext';
import { PlanStep } from '../components/mission/PlanStep';
import { ScheduleStep } from '../components/mission/ScheduleStep';
import { LearnStep } from '../components/mission/LearnStep';
import { ArrangeStep } from '../components/mission/ArrangeStep';
import { ReviseStep } from '../components/mission/ReviseStep';
import {
  Check, Lock, ArrowLeft, MoreHorizontal, Plus,
  BookOpen, Calendar, Target, Flame, Clock, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { subscribeMissionsList, type MissionDoc } from '../services/missionService';

// ─── Wizard step config ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'PLAN' },
  { id: 2, label: 'SCHEDULE' },
  { id: 3, label: 'LEARN' },
  { id: 4, label: 'ARRANGE' },
  { id: 5, label: 'REVISE' },
];

// ─── Status metadata ──────────────────────────────────────────────────────────
const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  planning:  { color: 'text-slate-600',  bg: 'bg-slate-100',  label: 'Planning' },
  scheduled: { color: 'text-sky-700',    bg: 'bg-sky-100',    label: 'Scheduled' },
  learning:  { color: 'text-violet-700', bg: 'bg-violet-100', label: 'Learning' },
  arranged:  { color: 'text-indigo-700', bg: 'bg-indigo-100', label: 'Arranged' },
  revising:  { color: 'text-amber-700',  bg: 'bg-amber-100',  label: 'Revising' },
  completed: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Completed' },
};

// ─── Mission card ─────────────────────────────────────────────────────────────
function MissionCard({ mission }: { mission: MissionDoc }) {
  const navigate = useNavigate();
  const meta = STATUS_META[mission.status] ?? STATUS_META.planning;
  const deadline = new Date(mission.deadline);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/mission/${mission.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
    >
      {/* Top accent line based on difficulty */}
      <div className={cn(
        'h-1 w-full',
        mission.difficulty === 'hard' ? 'bg-rose-400' :
        mission.difficulty === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
      )} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
              {mission.missionName}
            </h3>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">
              {mission.subject}
            </p>
          </div>
          <span className={cn('shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', meta.bg, meta.color)}>
            {meta.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-gray-400 mb-1" />
            <span className={cn('text-sm font-black font-mono', daysLeft <= 7 ? 'text-rose-500' : 'text-gray-900')}>{daysLeft}</span>
            <span className="text-[9px] text-gray-400 uppercase font-bold">days left</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl">
            <Target className="w-3.5 h-3.5 text-gray-400 mb-1" />
            <span className="text-sm font-black font-mono text-gray-900">
              {mission.cognitiveMode === 'sniper' ? 'SNP' : 'SCH'}
            </span>
            <span className="text-[9px] text-gray-400 uppercase font-bold">mode</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-gray-400 mb-1" />
            <span className="text-sm font-black font-mono text-gray-900">{mission.weekdayHours}h</span>
            <span className="text-[9px] text-gray-400 uppercase font-bold">/ day</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mission.hasPYQs && (
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-md border border-emerald-100">
                PYQs ✓
              </span>
            )}
            {mission.learnContextReady && (
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded-md border border-indigo-100">
                Intel ✓
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Mission() {
  const { currentStep, highestCompletedStep, missionData, missionId, setStep } = useMission();
  const navigate = useNavigate();
  const [shakeStep, setShakeStep] = useState<number | null>(null);
  const [mode, setMode] = useState<'landing' | 'wizard'>('landing');
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [missions, setMissions] = useState<MissionDoc[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);

  // Real-time subscription to Firestore
  useEffect(() => {
    const unsub = subscribeMissionsList(data => {
      setMissions(data);
      setLoadingMissions(false);
    });
    return unsub;
  }, []);

  // If we're mid-wizard (missionId exists), show wizard
  useEffect(() => {
    if (missionId) setMode('wizard');
  }, [missionId]);

  const handleStepClick = (stepId: number) => {
    if (stepId <= highestCompletedStep + 1) {
      setStep(stepId);
    } else {
      setShakeStep(stepId);
      setTimeout(() => setShakeStep(null), 500);
    }
  };

  const displayedMissions = missions.filter(m =>
    filter === 'all' ? true : !['completed'].includes(m.status)
  );

  // ─── Landing view ─────────────────────────────────────────────────────────
  if (mode === 'landing') {
    return (
      <div className="flex flex-col space-y-6 max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Missions</h1>
            <p className="text-xs text-gray-400 mt-0.5">{missions.length} total · {missions.filter(m => m.status !== 'completed').length} active</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setMode('wizard')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" /> New Mission
          </motion.button>
        </div>

        {/* Active / All toggle */}
        <div className="flex items-center gap-1 self-start bg-gray-100 rounded-xl p-1">
          {(['active', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-5 py-2 rounded-lg text-xs font-bold transition-all',
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'
              )}
            >
              {f === 'active' ? 'Active' : 'All Missions'}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <AnimatePresence mode="wait">
          {loadingMissions ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedMissions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-gray-300" />
              </div>
              <div>
                <p className="font-bold text-gray-500">No {filter === 'active' ? 'active ' : ''}missions yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a new mission to begin tracking your study goals</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                onClick={() => setMode('wizard')}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                Create First Mission
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {displayedMissions.map(m => (
                <MissionCard key={m.id} mission={m} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Wizard view ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-6">
      {/* Persistent Mission Header (shows after Step 1) */}
      {missionId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('landing')}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                {missionData.missionName || 'Untitled Mission'}
              </h2>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                {missionData.subject} · {missionData.status}
              </p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Back button when no missionId yet */}
      {!missionId && (
        <button
          onClick={() => setMode('landing')}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Missions
        </button>
      )}

      {/* Progress Bar */}
      <div className="flex items-center justify-between px-4 py-6 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-sm">
        {STEPS.map((step, index) => {
          const isLocked = step.id > highestCompletedStep + 1;
          const isCompleted = step.id <= highestCompletedStep;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2 relative group">
                <motion.button
                  onClick={() => handleStepClick(step.id)}
                  animate={shakeStep === step.id ? { x: [0, -4, 4, -4, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 relative z-10',
                    isCurrent
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110'
                      : isCompleted
                        ? 'bg-emerald-100 text-emerald-600 cursor-pointer hover:bg-emerald-200'
                        : isLocked
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : isLocked ? <Lock className="w-3 h-3" /> : step.id}

                  {isCurrent && (
                    <motion.div
                      layoutId="active-glow"
                      className="absolute inset-0 bg-emerald-500 rounded-full blur-md -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                    />
                  )}
                </motion.button>

                {isLocked && shakeStep === step.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-8 whitespace-nowrap px-2 py-1 bg-gray-900 text-white text-[9px] font-bold rounded-md"
                  >
                    Complete previous steps first
                  </motion.div>
                )}

                <span className={cn(
                  'text-[10px] font-bold tracking-widest uppercase transition-colors',
                  isCurrent ? 'text-emerald-600' : isLocked ? 'text-gray-300' : 'text-gray-400'
                )}>
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-4 bg-gray-100 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-emerald-500 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {currentStep === 1 && <PlanStep />}
            {currentStep === 2 && <ScheduleStep />}
            {currentStep === 3 && <LearnStep />}
            {currentStep === 4 && <ArrangeStep />}
            {currentStep === 5 && <ReviseStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
