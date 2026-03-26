import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useMission } from '../../lib/MissionContext';
import {
  Check, Edit2, Folder, FileText, Zap, BarChart3,
  ChevronRight, ShieldCheck, Loader2, BookOpen, Link2,
  SlidersHorizontal, Target, ArrowLeft
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Row helper ───────────────────────────────────────────────────────────────
function SummaryRow({ label, value, color, onEdit }: {
  label: string; value: string; color?: string; onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between group py-1.5">
      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-bold text-gray-700', color)}>{value}</span>
        {onEdit && (
          <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-3 h-3 text-gray-300 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Source pill ──────────────────────────────────────────────────────────────
function SourcePill({ name, type }: { name: string; type: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg">
      {type === 'link' ? <Link2 className="w-2.5 h-2.5 text-blue-400 shrink-0" /> : <FileText className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
      <span className="text-[10px] font-medium text-gray-600 truncate max-w-[120px]">{name}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ArrangeStep() {
  const { missionData, setStep, confirmArrange, isLoading } = useMission();

  const defaultVault = missionData.subject
    ? `${missionData.subject} — ${missionData.missionType.charAt(0).toUpperCase() + missionData.missionType.slice(1)}`
    : `Mission — ${new Date().getFullYear()}`;

  const [vaultName, setVaultName] = useState(defaultVault);
  const [isInitializing, setIsInitializing] = useState(false);
  const [completedItems, setCompletedItems] = useState<number[]>([]);

  const prefs = missionData.studyPreferences;

  const deadlineDate = new Date(missionData.deadline);
  const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000));

  const handleConfirm = async () => {
    setIsInitializing(true);
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setCompletedItems(prev => [...prev, i]);
    }
    await confirmArrange(vaultName);
  };

  const buildItems = [
    { icon: Folder, title: 'Vault Folder', desc: `"${vaultName}" with Sources, Chats, Workspaces, Intel tabs` },
    { icon: FileText, title: 'Tiptap Workspace', desc: 'Blank document pre-titled and ready for notes' },
    { icon: Zap,  title: 'Oracle Config', desc: `Style: ${prefs?.teachingStyle ?? 'socratic'} · Depth: ${prefs?.depthLevel ?? 'deep'} · Q-freq: ${prefs?.questionFrequency ?? 'medium'}` },
    { icon: BarChart3, title: 'PYQ Matrix', desc: missionData.pyqSources.length > 0 ? `${missionData.pyqSources.length} PYQ file(s) indexed for exam pattern analysis` : 'No PYQs — general exam patterns will be used' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[780px] bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-display uppercase tracking-tight">Mission Brief — Final Review</h2>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Verify · Edit · Initialize</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">

          {/* ── Section 1: Plan Summary ── */}
          <section className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Plan Summary
              <button onClick={() => setStep(1)} className="text-emerald-500 hover:underline">edit</button>
            </p>
            <div className="grid grid-cols-2 gap-x-12">
              <SummaryRow label="Subject" value={missionData.subject || 'Untitled'} onEdit={() => setStep(1)} />
              <SummaryRow label="Type" value={missionData.missionType} onEdit={() => setStep(1)} />
              <SummaryRow label="Deadline" value={`${missionData.deadline} · ${daysRemaining} days`} onEdit={() => setStep(1)} />
              <SummaryRow
                label="Difficulty"
                value={missionData.difficulty}
                color={missionData.difficulty === 'hard' ? 'text-rose-500' : missionData.difficulty === 'medium' ? 'text-amber-500' : 'text-emerald-500'}
                onEdit={() => setStep(1)}
              />
              <SummaryRow label="Mode" value={missionData.cognitiveMode} onEdit={() => setStep(1)} />
              <SummaryRow label="Baseline" value={missionData.baseline} onEdit={() => setStep(1)} />
              <SummaryRow label="Hours" value={`Weekday ${missionData.weekdayHours}h · Weekend ${missionData.weekendHours}h`} onEdit={() => setStep(2)} />
              <SummaryRow label="Source Lock" value={missionData.sourceLock} onEdit={() => setStep(1)} />
            </div>
          </section>

          <div className="h-px bg-gray-100" />

          {/* ── Section 2: Learning Context ── */}
          <section className="space-y-4">
            <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <SlidersHorizontal className="w-3 h-3" /> Learning Intelligence
              <button onClick={() => setStep(3)} className="text-emerald-500 hover:underline">edit</button>
            </p>

            {/* PYQs */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">PYQ Sources ({missionData.pyqSources.length})</span>
              {missionData.pyqSources.length === 0 ? (
                <p className="text-xs text-amber-500 italic">None uploaded — using general patterns</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {missionData.pyqSources.map((s, i) => <SourcePill key={i} name={s.name} type={s.type} />)}
                </div>
              )}
            </div>

            {/* Study Sources */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Study Sources ({missionData.studySources.length})</span>
              {missionData.studySources.length === 0 ? (
                <p className="text-xs text-gray-400 italic">None uploaded</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {missionData.studySources.map((s, i) => <SourcePill key={i} name={s.name} type={s.type} />)}
                </div>
              )}
            </div>

            {/* Teaching preferences */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Teaching Style', value: prefs?.teachingStyle ?? '—' },
                { label: 'Depth Level', value: prefs?.depthLevel ?? '—' },
                { label: 'Q Frequency', value: prefs?.questionFrequency ?? '—' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                  <p className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-xs font-bold text-gray-800 capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Reference sources */}
            {prefs?.referenceSources?.trim() && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Target className="w-2.5 h-2.5" /> Pinned References
                </p>
                <p className="text-xs text-indigo-700 whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {prefs.referenceSources}
                </p>
              </div>
            )}

            {/* Additional notes */}
            {prefs?.additionalNotes?.trim() && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest mb-1">Agent Instructions</p>
                <p className="text-xs text-amber-800 leading-relaxed line-clamp-2">{prefs.additionalNotes}</p>
              </div>
            )}
          </section>

          <div className="h-px bg-gray-100" />

          {/* ── Section 3: What AI Will Build ── */}
          <section className="space-y-4">
            <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3" /> 🤖 Dispatcher Will Initialize
            </label>
            <div className="space-y-3">
              {buildItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                    completedItems.includes(i) ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    {completedItems.includes(i) ? <Check className="w-4 h-4" /> : <item.icon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                      {!completedItems.includes(i) && isInitializing && i === completedItems.length && (
                        <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5',
                    completedItems.includes(i) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-200'
                  )} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 4: Vault Name ── */}
          <section className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Vault Name</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vaultName}
                onChange={e => setVaultName(e.target.value)}
                className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-gray-700 focus:ring-0"
              />
              <Edit2 className="w-3 h-3 text-gray-400" />
            </div>
          </section>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={isInitializing}
            className={cn(
              'w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 group',
              isInitializing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
            )}
          >
            {isInitializing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Initializing Workspace…</>
            ) : (
              <>⚡ Confirm & Initialize Workspace <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
            )}
          </motion.button>
        </div>
      </motion.div>

      {!isInitializing && (
        <button onClick={() => setStep(3)} className="mt-8 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to Learn
        </button>
      )}
    </div>
  );
}
