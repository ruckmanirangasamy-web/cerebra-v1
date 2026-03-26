import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMission } from '../../lib/MissionContext';
import {
  Upload, FileText, Link2, Trash2, CheckCircle2, Circle,
  BookOpen, Brain, Target, Zap, ChevronRight, Plus,
  Loader2, Info, X, BookMarked, SlidersHorizontal, MessageSquare,
  Shield, BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SourceRef, StudyPreferences } from '../../services/missionService';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../lib/firebase';

// ─── helpers ──────────────────────────────────────────────────────────────────
const getUid = () => auth.currentUser?.uid ?? 'guest';

function fileToSourceRef(file: File, url?: string): SourceRef {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const type: SourceRef['type'] = ext === 'pdf' ? 'pdf'
    : ['png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '') ? 'image' : 'text';
  return { name: file.name, url, type, addedAt: null };
}

async function uploadFileToStorage(file: File): Promise<string> {
  const uid = getUid();
  const path = `mission-context/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed', undefined, reject, () => resolve());
  });
  return getDownloadURL(storageRef);
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
        <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── File Upload Zone ──────────────────────────────────────────────────────────
function UploadZone({ label, sources, onAdd, onRemove, accept = '.pdf,.png,.jpg,.jpeg,.txt,.md' }: {
  label: string;
  sources: SourceRef[];
  onAdd: (src: SourceRef) => void;
  onRemove: (index: number) => void;
  accept?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showLink, setShowLink] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('File must be under 50 MB'); return; }
    setUploading(true);
    try {
      const url = await uploadFileToStorage(file);
      onAdd(fileToSourceRef(file, url));
    } catch {
      // Add as local ref so UX stays responsive even if storage upload fails
      onAdd(fileToSourceRef(file));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleLink = () => {
    if (!linkInput.trim()) return;
    onAdd({ name: linkInput.trim(), url: linkInput.trim(), type: 'link', addedAt: null });
    setLinkInput('');
    setShowLink(false);
  };

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
        ) : (
          <Upload className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
        )}
        <span className="text-xs font-bold text-gray-400 group-hover:text-emerald-600 transition-colors">
          {uploading ? 'Uploading…' : `Click to upload ${label}`}
        </span>
        <span className="text-[10px] text-gray-300">PDF, image, or text</span>
      </div>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      {/* Link button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowLink(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <Link2 className="w-3 h-3" /> Add Link
        </button>
      </div>

      {showLink && (
        <div className="flex gap-2">
          <input
            type="url"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLink()}
            placeholder="https://..."
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          />
          <button onClick={handleLink} className="px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600">
            Add
          </button>
        </div>
      )}

      {/* Uploaded list */}
      {sources.length > 0 && (
        <div className="space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
              {src.type === 'link' ? <Link2 className="w-3 h-3 text-blue-500 shrink-0" /> : <FileText className="w-3 h-3 text-emerald-500 shrink-0" />}
              <span className="flex-1 text-xs text-gray-700 truncate font-medium">{src.name}</span>
              <span className="text-[9px] font-mono font-bold uppercase text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{src.type}</span>
              <button onClick={() => onRemove(i)} className="p-0.5 rounded hover:bg-rose-50 hover:text-rose-500 text-gray-300 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Preferences toggle row ────────────────────────────────────────────────────
function ToggleRow<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
              value === opt.value
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Checklist item ────────────────────────────────────────────────────────────
function CheckItem({ label, done, sublabel }: { label: string; done: boolean; sublabel?: string }) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex items-start gap-3"
    >
      <div className={cn(
        'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors',
        done ? 'bg-emerald-500' : 'bg-gray-100'
      )}>
        {done ? <CheckCircle2 className="w-3 h-3 text-white" /> : <Circle className="w-3 h-3 text-gray-300" />}
      </div>
      <div>
        <span className={cn('text-sm font-bold', done ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
        {sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function LearnStep() {
  const { missionData, updateMissionData, saveLearnContext, isLoading, setStep } = useMission();

  const prefs = missionData.studyPreferences;

  const updatePrefs = (patch: Partial<StudyPreferences>) => {
    updateMissionData({ studyPreferences: { ...prefs, ...patch } });
  };

  const addPYQ = (src: SourceRef) =>
    updateMissionData({ pyqSources: [...missionData.pyqSources, src], hasPYQs: true });
  const removePYQ = (i: number) => {
    const updated = missionData.pyqSources.filter((_, idx) => idx !== i);
    updateMissionData({ pyqSources: updated, hasPYQs: updated.length > 0 });
  };

  const addSource = (src: SourceRef) =>
    updateMissionData({ studySources: [...missionData.studySources, src] });
  const removeSource = (i: number) =>
    updateMissionData({ studySources: missionData.studySources.filter((_, idx) => idx !== i) });

  // Checklist
  const checks = [
    {
      label: 'PYQs uploaded',
      done: missionData.pyqSources.length > 0,
      sublabel: missionData.pyqSources.length > 0
        ? `${missionData.pyqSources.length} file${missionData.pyqSources.length > 1 ? 's' : ''} added`
        : 'Upload at least one past year paper',
    },
    {
      label: 'Study sources added',
      done: missionData.studySources.length > 0,
      sublabel: missionData.studySources.length > 0
        ? `${missionData.studySources.length} source${missionData.studySources.length > 1 ? 's' : ''} added`
        : 'Textbook, slides, or notes',
    },
    {
      label: 'Teaching style set',
      done: true,
      sublabel: `${prefs.teachingStyle} · ${prefs.depthLevel} depth`,
    },
    {
      label: 'Reference sources noted',
      done: prefs.referenceSources.trim().length > 0 || missionData.studySources.length > 0,
      sublabel: 'Agent will use these references when teaching',
    },
  ];

  const allReady = checks.every(c => c.done);

  const handleConfirm = async () => {
    updateMissionData({ learnContextReady: true });
    await saveLearnContext();
  };

  return (
    <div className="flex flex-col space-y-6 pb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">{missionData.missionName || missionData.subject || 'Mission'}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20" />
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', missionData.difficulty === 'hard' ? 'bg-rose-400' : missionData.difficulty === 'medium' ? 'bg-amber-400' : 'bg-emerald-400')} />
            <span className="text-[10px] font-mono uppercase tracking-widest">{missionData.difficulty}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
          ⚡ Intelligence Setup
        </span>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* — PYQ Upload — */}
        <Section
          icon={<BarChart3 className="w-4 h-4" />}
          title="Past Year Questions (PYQs)"
          subtitle="Agent uses these to predict exam priorities"
        >
          <UploadZone
            label="PYQs"
            sources={missionData.pyqSources}
            onAdd={addPYQ}
            onRemove={removePYQ}
          />
          {missionData.pyqSources.length === 0 && (
            <p className="mt-3 text-[10px] text-amber-500 flex items-center gap-1">
              <Info className="w-3 h-3" /> Without PYQs, the agent uses general exam patterns
            </p>
          )}
        </Section>

        {/* — Source Upload — */}
        <Section
          icon={<BookMarked className="w-4 h-4" />}
          title="Study Sources"
          subtitle="Textbooks, slides, notes — agent teaches from these"
        >
          <UploadZone
            label="Sources"
            sources={missionData.studySources}
            onAdd={addSource}
            onRemove={removeSource}
          />
        </Section>

        {/* — Study Preferences — */}
        <Section
          icon={<SlidersHorizontal className="w-4 h-4" />}
          title="How You Want to Study"
          subtitle="Agent adapts teaching to your preferences"
        >
          <div className="space-y-4">
            <ToggleRow
              label="Teaching Style"
              value={prefs.teachingStyle}
              onChange={v => updatePrefs({ teachingStyle: v })}
              options={[
                { value: 'socratic', label: 'Socratic' },
                { value: 'direct', label: 'Direct' },
                { value: 'challenge', label: 'Challenge' },
              ]}
            />
            <ToggleRow
              label="Question Frequency"
              value={prefs.questionFrequency}
              onChange={v => updatePrefs({ questionFrequency: v })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
            <ToggleRow
              label="Depth Level"
              value={prefs.depthLevel}
              onChange={v => updatePrefs({ depthLevel: v })}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'deep', label: 'Deep' },
                { value: 'mastery', label: 'Mastery' },
              ]}
            />

            {/* Additional notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Additional Instructions
              </label>
              <textarea
                rows={3}
                value={prefs.additionalNotes}
                onChange={e => updatePrefs({ additionalNotes: e.target.value })}
                placeholder="e.g. Focus on clinical applications, ignore basic science, use simple analogies..."
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none placeholder-gray-300"
              />
            </div>
          </div>
        </Section>

        {/* — Reference Pinning — */}
        <Section
          icon={<Target className="w-4 h-4" />}
          title="Reference Pinning"
          subtitle="Links or text the agent uses as ground truth"
        >
          <div className="space-y-3">
            <textarea
              rows={5}
              value={prefs.referenceSources}
              onChange={e => updatePrefs({ referenceSources: e.target.value })}
              placeholder={`Paste key URLs or reference points the agent should always consult:\n\nhttps://guidelines.example.com\nhttps://standard-textbook.com/chapter-4\n\nor paste short reference text directly here...`}
              className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none placeholder-gray-300 leading-relaxed"
            />
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              The agent will always cross-check answers against these references
            </p>
          </div>
        </Section>
      </div>

      {/* ── Verification Checklist ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center',
              allReady ? 'bg-emerald-500' : 'bg-gray-200'
            )}>
              <Shield className={cn('w-4 h-4', allReady ? 'text-white' : 'text-gray-400')} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Mission Intelligence Checklist</h3>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                {checks.filter(c => c.done).length}/{checks.length} ready
              </p>
            </div>
          </div>

          {/* Progress pills */}
          <div className="flex gap-1">
            {checks.map((c, i) => (
              <div
                key={i}
                className={cn(
                  'w-6 h-1.5 rounded-full transition-colors',
                  c.done ? 'bg-emerald-500' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {checks.map((c, i) => (
            <CheckItem key={i} label={c.label} done={c.done} sublabel={c.sublabel} />
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <motion.button
            whileHover={allReady ? { scale: 1.02 } : {}}
            whileTap={allReady ? { scale: 0.98 } : {}}
            onClick={handleConfirm}
            disabled={!allReady || isLoading}
            className={cn(
              'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
              allReady
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving Context…</>
            ) : allReady ? (
              <>✅ Confirm Intelligence & Proceed to Arrange <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Complete all checks to continue <ChevronRight className="w-4 h-4" /></>
            )}
          </motion.button>
          {!allReady && (
            <p className="text-center text-[10px] text-gray-400 mt-2">
              Upload PYQs and Sources, then set your study preferences
            </p>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => setStep(2)} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to Schedule
        </button>
      </div>
    </div>
  );
}
