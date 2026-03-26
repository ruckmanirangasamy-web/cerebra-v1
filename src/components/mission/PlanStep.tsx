import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMission } from '../../lib/MissionContext';
import {
  Target,
  Calendar as CalendarIcon,
  Cpu,
  FileUp,
  Shield,
  Zap,
  GraduationCap,
  ChevronRight,
  Info,
  MessageCircle,
  BookOpen,
  Clock,
  Minus,
  Plus,
  Edit2,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function PlanStep() {
  const { missionData, updateMissionData, initializeMission, isLoading } = useMission();
  const [showPYQUpload, setShowPYQUpload] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Calculate days remaining
  const deadlineDate = new Date(missionData.deadline);
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate total available hours
  const weekdays = Math.min(daysRemaining, Math.floor(daysRemaining * 5 / 7));
  const weekends = daysRemaining - weekdays;
  const totalHours = (weekdays * missionData.weekdayHours) + (weekends * missionData.weekendHours);

  // Check if all required params are filled
  const isReady = missionData.subject.trim().length > 0 && daysRemaining > 0;

  const handleInitialize = async () => {
    if (!isReady) return;
    setShowSummary(true);
  };

  const handleConfirmAndGo = async () => {
    await initializeMission();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 h-full">
      {/* Left Column: AI Speaks */}
      <div className="lg:col-span-4 flex flex-col justify-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-4xl md:text-5xl font-serif italic text-gray-400 leading-tight">
            "Let's calibrate your Mesh. Tell me exactly what we are tackling so I can configure your schedule, lock in your study sources, and tune the AI's teaching style for this specific mission."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
              {isLoading ? 'Initializing mission...' : 'Waiting for input...'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Right Column: Mission Parameters */}
      <div className="lg:col-span-8 overflow-y-auto pr-4 space-y-8 pb-12">

        <AnimatePresence mode="wait">
          {!showSummary ? (
            <motion.div
              key="params"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Section A: THE OBJECTIVE */}
              <section className="space-y-4">
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-3 h-3" />
                  Section A — THE OBJECTIVE
                </label>

                {/* Subject Name */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> Subject Name
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. Advanced Cardiology, Organic Chemistry..."
                    value={missionData.subject}
                    onChange={(e) => updateMissionData({ subject: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Mission Type</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '🎯 Exam Prep', value: 'exam' },
                        { label: '✍️ Assignment', value: 'assignment' },
                        { label: '📖 Project', value: 'project' },
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => updateMissionData({ missionType: type.value as any })}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all",
                            missionData.missionType === type.value
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">⚡ Judgment Day</p>
                    <input
                      type="date"
                      value={missionData.deadline}
                      onChange={(e) => updateMissionData({ deadline: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {daysRemaining > 0 && (
                      <p className={cn(
                        "text-lg font-mono font-bold",
                        daysRemaining > 14 ? "text-emerald-500" : daysRemaining > 7 ? "text-amber-500" : "text-rose-500"
                      )}>
                        {daysRemaining} DAYS REMAINING
                      </p>
                    )}
                  </div>
                </div>

                {/* Hours Per Day Steppers */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Hours Per Day
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">Weekdays</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateMissionData({ weekdayHours: Math.max(1, missionData.weekdayHours - 1) })}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                        <motion.span
                          key={missionData.weekdayHours}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-mono font-bold text-gray-900 w-8 text-center"
                        >
                          {missionData.weekdayHours}h
                        </motion.span>
                        <button
                          onClick={() => updateMissionData({ weekdayHours: Math.min(12, missionData.weekdayHours + 1) })}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">Weekends</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateMissionData({ weekendHours: Math.max(1, missionData.weekendHours - 1) })}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                        <motion.span
                          key={missionData.weekendHours}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-mono font-bold text-gray-900 w-8 text-center"
                        >
                          {missionData.weekendHours}h
                        </motion.span>
                        <button
                          onClick={() => updateMissionData({ weekendHours: Math.min(12, missionData.weekendHours + 1) })}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-emerald-500 font-bold">
                    Total available: ~{totalHours} hours before exam
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Scheduling</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => updateMissionData({ scheduling: 'autopilot' })}
                      className={cn(
                        "flex-1 p-4 rounded-xl border transition-all flex items-center gap-3",
                        missionData.scheduling === 'autopilot'
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-700"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      <Cpu className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-sm font-bold">🤖 Auto-Pilot</p>
                        <p className="text-[10px] opacity-70">Temporal Agent maps the Kanban</p>
                      </div>
                    </button>
                    <button
                      onClick={() => updateMissionData({ scheduling: 'manual' })}
                      className={cn(
                        "flex-1 p-4 rounded-xl border transition-all flex items-center gap-3",
                        missionData.scheduling === 'manual'
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-700"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">✋ Manual</p>
                        <p className="text-[10px] opacity-70">User builds the calendar themselves</p>
                      </div>
                    </button>
                  </div>
                </div>
              </section>

              {/* Section B: THE INTEL */}
              <section className="space-y-4">
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Section B — THE INTEL
                </label>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Perceived Difficulty</p>
                  <div className="flex gap-2">
                    {[
                      { label: 'Easy', value: 'easy', color: 'bg-emerald-500' },
                      { label: 'Medium', value: 'medium', color: 'bg-amber-500' },
                      { label: 'Hard', value: 'hard', color: 'bg-rose-500' },
                    ].map((diff) => (
                      <button
                        key={diff.value}
                        onClick={() => updateMissionData({ difficulty: diff.value as any })}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                          missionData.difficulty === diff.value
                            ? "bg-gray-900 text-white"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full", diff.color)} />
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Do you have PYQs?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateMissionData({ hasPYQs: true });
                        setShowPYQUpload(true);
                      }}
                      className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all",
                        missionData.hasPYQs ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-600"
                      )}
                    >
                      ✓ Yes
                    </button>
                    <button
                      onClick={() => {
                        updateMissionData({ hasPYQs: false });
                        setShowPYQUpload(false);
                      }}
                      className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all",
                        !missionData.hasPYQs ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-600"
                      )}
                    >
                      ✗ No
                    </button>
                  </div>
                  {showPYQUpload && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="pt-4"
                    >
                      <div className="border-2 border-dashed border-emerald-200 rounded-xl p-8 text-center space-y-2 hover:border-emerald-500 transition-colors cursor-pointer bg-emerald-50/30">
                        <FileUp className="w-8 h-8 text-emerald-400 mx-auto" />
                        <p className="text-sm font-medium text-gray-600">Drop PYQs here or click to upload</p>
                        <p className="text-[10px] text-gray-400 uppercase">PDF, PNG, JPEG supported</p>
                      </div>
                      {missionData.pyqFiles.length > 0 && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                          {missionData.pyqFiles.length} papers locked · PYQ Matrix ready
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </section>

              {/* Section C: AI CALIBRATION */}
              <section className="space-y-4">
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Section C — AI CALIBRATION
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Source Lock</p>
                      <div className="group relative">
                        <Info className="w-3 h-3 text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          Strict mode disables web hallucinations by only using your textbooks.
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMissionData({ sourceLock: 'strict' })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          missionData.sourceLock === 'strict' ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500"
                        )}
                      >
                        🔒 Strict
                      </button>
                      <button
                        onClick={() => updateMissionData({ sourceLock: 'general' })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          missionData.sourceLock === 'general' ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500"
                        )}
                      >
                        🌐 General
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Cognitive Mode</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMissionData({ cognitiveMode: 'sniper' })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          missionData.cognitiveMode === 'sniper' ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-500"
                        )}
                      >
                        🎯 Sniper
                      </button>
                      <button
                        onClick={() => updateMissionData({ cognitiveMode: 'scholar' })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                          missionData.cognitiveMode === 'scholar' ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-500"
                        )}
                      >
                        🎓 Scholar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Baseline</p>
                  <div className="flex gap-2">
                    {[
                      { label: '🐣 Novice', value: 'novice' },
                      { label: '🧗 Intermediate', value: 'intermediate' },
                      { label: '🎓 Advanced', value: 'advanced' },
                    ].map((level) => (
                      <button
                        key={level.value}
                        onClick={() => updateMissionData({ baseline: level.value as any })}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                          missionData.baseline === level.value ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-500"
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    {missionData.baseline === 'novice' && "I'll use heavy analogies, explain every term, build from the ground up."}
                    {missionData.baseline === 'intermediate' && "I'll assume you know the basics and focus on connecting the complex pieces."}
                    {missionData.baseline === 'advanced' && "No definitions, no hand-holding. Edge cases and distinction-level nuance only."}
                  </p>
                </div>
              </section>

              {/* Section D: THE CUSTOM PROMPT */}
              <section className="space-y-4">
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  Section D — CUSTOM INSTRUCTION (optional)
                </label>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-inner focus-within:border-emerald-500 transition-colors">
                  <textarea
                    placeholder="Anything else? e.g. 'Focus 80% on Chapter 4 (Electromagnetism) because I missed that lecture entirely'"
                    value={missionData.customPrompt}
                    onChange={(e) => updateMissionData({ customPrompt: e.target.value })}
                    rows={3}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-gray-300 resize-none font-mono"
                  />
                </div>
              </section>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: isReady ? 1.02 : 1 }}
                whileTap={{ scale: isReady ? 0.98 : 1 }}
                onClick={handleInitialize}
                disabled={!isReady || isLoading}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 group transition-all",
                  isReady && !isLoading
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                )}
              >
                ⚡ Review & Initialize Mission
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {!isReady && (
                <p className="text-[10px] text-center text-gray-400">
                  Enter a subject name and set a future deadline to continue.
                </p>
              )}
            </motion.div>
          ) : (
            /* Mission Summary Card */
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden">
                {/* Summary Header */}
                <div className="p-6 border-b border-gray-100 bg-emerald-50/50">
                  <h3 className="text-xl font-bold text-emerald-700 uppercase tracking-tight flex items-center gap-2">
                    ⚡ Mission Understood
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mt-1">
                    Dispatcher Agent · Verification Layer
                  </p>
                </div>

                <div className="p-6 space-y-3">
                  {[
                    { label: 'Subject', value: missionData.subject },
                    { label: 'Type', value: missionData.missionType.charAt(0).toUpperCase() + missionData.missionType.slice(1) },
                    { label: 'Baseline', value: missionData.baseline.charAt(0).toUpperCase() + missionData.baseline.slice(1) },
                    { label: 'Source Lock', value: missionData.sourceLock === 'strict' ? '🔒 Strict Source Only' : '🌐 Hybrid Intelligence' },
                    { label: 'Mode', value: missionData.cognitiveMode === 'sniper' ? '🎯 Sniper' : '🎓 Scholar' },
                    { label: 'Deadline', value: `${missionData.deadline} · ${daysRemaining} days` },
                    { label: 'Weekdays', value: `${missionData.weekdayHours}h/day` },
                    { label: 'Weekends', value: `${missionData.weekendHours}h/day` },
                    { label: 'Total Hours', value: `~${totalHours} hours available` },
                    { label: 'PYQs', value: missionData.hasPYQs ? '✓ Uploaded' : 'None' },
                    { label: 'Custom', value: missionData.customPrompt || 'None' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 group cursor-pointer">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">{item.value}</span>
                        <Edit2
                          className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setShowSummary(false)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmAndGo}
                  disabled={isLoading}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Mission...
                    </>
                  ) : (
                    <>
                      ⚡ Confirm Plan · Go to Schedule
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>

              <button
                onClick={() => setShowSummary(false)}
                className="w-full text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors text-center"
              >
                ← Edit Parameters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
