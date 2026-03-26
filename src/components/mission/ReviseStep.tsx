import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMission } from '../../lib/MissionContext';
import {
  Layers,
  FileText,
  Mic,
  ArrowRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Timer,
  Star,
  Zap,
  Loader2,
  PartyPopper,
  CalendarDays,
  Clock,
  ChevronRight,
  Save
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

type TestFormat = 'flashcards' | 'mcq' | 'oral';

const DAY_OPTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type DayKey = typeof DAY_OPTS[number];

// ─── Revision Plan Panel ──────────────────────────────────────────────────────
function RevisionPlanPanel({ onSaved }: { onSaved: () => void }) {
  const { saveRevision, isLoading } = useMission();

  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [days, setDays] = useState<DayKey[]>(['Mon', 'Wed', 'Fri']);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  const toggleDay = (day: DayKey) =>
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const handleSave = async () => {
    await saveRevision({ hoursPerDay, days, startDate });
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[640px] mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mb-8"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-gray-900 text-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CalendarDays className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Revision Plan</h3>
          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Schedule your review sessions</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Hours per day */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" /> Hours per Session
            </label>
            <span className="text-2xl font-black text-gray-900 font-mono">{hoursPerDay}h</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.5}
            value={hoursPerDay}
            onChange={e => setHoursPerDay(Number(e.target.value))}
            className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[9px] font-mono text-gray-300">
            <span>0.5h</span><span>4h</span><span>8h</span>
          </div>
        </div>

        {/* Study days */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700">Study Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAY_OPTS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={cn(
                  'w-10 h-10 rounded-xl text-[10px] font-black transition-all',
                  days.includes(day)
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                )}
              >
                {day.slice(0, 2)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            {days.length} days/week · ~{(hoursPerDay * days.length).toFixed(1)}h weekly
          </p>
        </div>

        {/* Start date */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" /> Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 text-xs font-bold border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 bg-white"
          />
        </div>

        {/* Save CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isLoading || days.length === 0}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
            days.length > 0
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving Plan…</>
          ) : (
            <><Save className="w-4 h-4" /> Save Revision Plan & Start Test Engine <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function ReviseStep() {
  const { setStep, completeMission, isLoading } = useMission();
  const navigate = useNavigate();
  const [planSaved, setPlanSaved] = useState(false);
  const [activeFormat, setActiveFormat] = useState<TestFormat | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const testFormats = [
    {
      id: 'flashcards' as TestFormat,
      title: 'Flashcards',
      icon: Layers,
      desc: 'Algorithm: SM-2 Spaced Rep',
      details: '20 cards · All topics · Auto difficulty',
      color: 'bg-indigo-50 text-indigo-600',
      btnColor: 'bg-indigo-600'
    },
    {
      id: 'mcq' as TestFormat,
      title: 'MCQ Quiz',
      icon: FileText,
      desc: 'PYQ-style questions',
      details: '10 questions · Chapter 4 · 60s/Q',
      color: 'bg-emerald-50 text-emerald-600',
      btnColor: 'bg-emerald-600'
    },
    {
      id: 'oral' as TestFormat,
      title: 'Oral Exam',
      icon: Mic,
      desc: 'AI interviews you live',
      details: '15 min · Examiner style · Medium pressure',
      color: 'bg-rose-50 text-rose-600',
      btnColor: 'bg-rose-600'
    }
  ];

  const handleStartTest = (format: TestFormat) => {
    setActiveFormat(format);
    setCurrentQuestion(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentQuestion < 9) {
      setCurrentQuestion(prev => prev + 1);
      setIsFlipped(false);
      setShowFeedback(false);
    } else {
      setActiveFormat(null);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      {/* Step 1: Revision Plan (always shown, collapses after save) */}
      <AnimatePresence>
        {!planSaved && (
          <motion.div exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}>
            <RevisionPlanPanel onSaved={() => setPlanSaved(true)} />
          </motion.div>
        )}
        {planSaved && (
          <motion.div
            key="plan-done"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl self-start"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700">Revision Plan Saved</span>
            <button onClick={() => setPlanSaved(false)} className="ml-2 text-[10px] text-emerald-400 hover:text-emerald-600 underline">Edit</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2: Test Engine (only shows after plan saved) */}
      {planSaved && (
      <AnimatePresence mode="wait">
        {!activeFormat ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 font-display">Testing Engine</h2>
              <p className="text-gray-500 max-w-md mx-auto">Active recall, not passive re-reading. Tests are generated strictly from your locked materials.</p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testFormats.map((format) => (
                <div key={format.id} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", format.color)}>
                        <format.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{format.title}</h3>
                        <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{format.desc}</p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] text-gray-500 leading-relaxed">{format.details}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartTest(format.id)}
                      className={cn("mt-8 w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all group-hover:scale-105", format.btnColor)}
                    >
                      {format.id === 'oral' ? 'Begin Session' : `Generate ${format.title}`} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active-test"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <div className="w-full max-w-2xl space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveFormat(null)}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                    <Timer className="w-3 h-3" /> 00:45
                  </div>
                  <span className="text-xs font-bold text-gray-400">Card {currentQuestion + 1} of 10</span>
                </div>
              </div>

              {/* Test UI: Flashcards */}
              {activeFormat === 'flashcards' && (
                <div className="perspective-1000 w-full h-[400px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="relative w-full h-full preserve-3d"
                  >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-12 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 leading-tight">What are the primary compensatory mechanisms in chronic heart failure?</h3>
                      <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Tap to reveal answer</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden bg-gray-900 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-6 rotate-y-180">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div className="space-y-4">
                        <p className="text-xl text-white leading-relaxed">1. RAAS Activation<br />2. Sympathetic Nervous System Overdrive<br />3. Myocardial Hypertrophy</p>
                        <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">Source: Ch. 4 · p.112</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Test UI: MCQ */}
              {activeFormat === 'mcq' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-12 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">Q{currentQuestion + 1}</div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Multiple Choice</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 leading-tight font-display">Which of the following is a classic sign of right-sided heart failure?</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {[
                      'Pulmonary Edema',
                      'Jugular Venous Distension',
                      'Paroxysmal Nocturnal Dyspnea',
                      'Orthopnea'
                    ].map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setShowFeedback(true)}
                        className={cn(
                          "w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all flex items-center justify-between group",
                          showFeedback && i === 1 ? "bg-emerald-50 border-emerald-500 text-emerald-700" :
                            showFeedback && i !== 1 ? "bg-gray-50 border-gray-100 text-gray-400 opacity-50" :
                              "bg-white border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/30"
                        )}
                      >
                        {opt}
                        {showFeedback && i === 1 && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Test UI: Oral Exam */}
              {activeFormat === 'oral' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-12 space-y-8 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 relative">
                    <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                    <Mic className="w-10 h-10 relative z-10" />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900 leading-tight font-display">
                      "Explain the difference between systolic and diastolic heart failure in terms of ejection fraction."
                    </h3>
                    <p className="text-xs text-rose-500 font-bold uppercase tracking-widest animate-pulse">Examiner is listening...</p>
                  </div>

                  <div className="w-full max-w-sm p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-1 h-8 bg-rose-400 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Voice Input Active</span>
                  </div>

                  <button
                    onClick={handleNext}
                    className="mt-4 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                  >
                    Stop & Get Feedback
                  </button>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {activeFormat === 'flashcards' && isFlipped && (
                  <div className="flex gap-3">
                    <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors">😓 Hard</button>
                    <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-widest hover:bg-amber-100 transition-colors">🤔 Medium</button>
                    <button onClick={handleNext} className="px-6 py-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-colors">😊 Easy</button>
                  </div>
                )}
                {activeFormat === 'mcq' && showFeedback && (
                  <button
                    onClick={handleNext}
                    className="px-12 py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  >
                    Next Question <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )} {/* end planSaved */}

      {/* Confetti Overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-12 text-center space-y-6 shadow-2xl max-w-md"
            >
              <div className="text-6xl">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900">Mission Complete!</h2>
              <p className="text-gray-500">Your study data has been saved. Keep up the amazing work!</p>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
              >
                Back to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Navigation */}
      {!activeFormat && (
        <div className="flex items-center justify-between pt-8 border-t border-gray-100">
          <button
            onClick={() => setStep(4)}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to Arrange
          </button>
          <button
            onClick={async () => {
              setIsCompleting(true);
              await completeMission();
              setIsCompleting(false);
              setShowConfetti(true);
            }}
            disabled={isCompleting}
            className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            {isCompleting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Completing...</>
            ) : (
              <>Finish Mission & Go Home <CheckCircle2 className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}
