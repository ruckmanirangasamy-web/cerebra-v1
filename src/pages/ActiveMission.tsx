import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Save, CheckCircle2, BookOpen,
  MessageSquare, Database, Loader2, FileText, Upload,
  Send, X, BarChart2, Edit3, Cpu, Flame, Zap, Target, Clock
} from 'lucide-react';

import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { type MissionDoc, updateMissionDoc, completeMission } from '../services/missionService';
import { getStreakData, getStudySessions, type StreakData, type StudySession } from '../services/analyseService';
import {
  subscribeToVaultFolders, subscribeToVaultItems, uploadVaultFile, validateFile
} from '../services/vaultService';
import {
  subscribeToConversations, createConversation,
  addOracleMessage, subscribeToMessages
} from '../services/learnService';
import type { OracleConversation, OracleMessage as OracleMsg } from '../services/learnTypes';

import StudyStreak from '../components/analyse/StudyStreak';
import SyllabusBar from '../components/analyse/SyllabusBar';
import SessionHistory from '../components/analyse/SessionHistory';

import { GoogleGenerativeAI } from '@google/generative-ai';
import Markdown from 'react-markdown';

// ─── Small helpers ─────────────────────────────────────────────────────────────
const uid = () => auth.currentUser?.uid ?? 'guest';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-sky-100 text-sky-700',
  learning: 'bg-violet-100 text-violet-700',
  arranged: 'bg-indigo-100 text-indigo-700',
  revising: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const STATUS_OPTIONS = ['planning', 'scheduled', 'learning', 'arranged', 'revising', 'completed'] as const;

// ─── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 shadow-sm">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-black text-gray-900 font-mono leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Oracle Chat ──────────────────────────────────────────────────────────────
function OracleChat({ missionId, missionSubject }: { missionId: string; missionSubject: string }) {
  const [conversations, setConversations] = useState<OracleConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OracleMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = uid();
    const unsub = subscribeToConversations(userId, missionId, convs => {
      setConversations(convs);
      if (!activeConvId && convs.length > 0) setActiveConvId(convs[0].id);
    });
    return unsub;
  }, [missionId]);

  useEffect(() => {
    if (!activeConvId) return;
    const userId = uid();
    const unsub = subscribeToMessages(userId, activeConvId, setMessages);
    return unsub;
  }, [activeConvId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function newConversation() {
    const userId = uid();
    const data: Omit<OracleConversation, 'id'> = {
      userId,
      subjectId: missionId,
      topicName: missionSubject,
      title: `Chat – ${new Date().toLocaleDateString()}`,
      mode: 'scholar',
      sourceLock: 'hybrid',
      messageCount: 0,
      lastMessageAt: null,
      createdAt: null,
    };
    const ref = await createConversation(userId, data);
    setActiveConvId(ref.id);
    setMessages([]);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userId = uid();
    let convId = activeConvId;
    if (!convId) {
      const data: Omit<OracleConversation, 'id'> = {
        userId,
        subjectId: missionId,
        topicName: missionSubject,
        title: `Chat – ${new Date().toLocaleDateString()}`,
        mode: 'scholar',
        sourceLock: 'hybrid',
        messageCount: 0,
        lastMessageAt: null,
        createdAt: null,
      };
      const ref = await createConversation(userId, data);
      convId = ref.id;
      setActiveConvId(convId);
    }
    setInput('');
    setLoading(true);
    const userMsg: Omit<OracleMsg, 'id'> = { role: 'user', content: text, citedPages: [], timestamp: null };
    await addOracleMessage(userId, convId, userMsg);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const ctx = messages.slice(-8).map(m => `${m.role}: ${m.content}`).join('\n');
      const result = await model.generateContent(
        `You are Oracle, an AI study assistant for "${missionSubject}". ${ctx ? ctx + '\nuser: ' : ''}${text}`
      );
      const reply = result.response.text();
      const assistantMsg: Omit<OracleMsg, 'id'> = { role: 'assistant', content: reply, citedPages: [], timestamp: null };
      await addOracleMessage(userId, convId, assistantMsg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Conversation list */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-3 overflow-x-auto scrollbar-none shrink-0">
        {conversations.map(c => (
          <button key={c.id} onClick={() => { setActiveConvId(c.id); setMessages([]); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
              activeConvId === c.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {c.title}
          </button>
        ))}
        <button onClick={newConversation}
          className="shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">
          +
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">🔮</p>
            <p className="text-sm font-semibold text-gray-500">Oracle is ready</p>
            <p className="text-xs text-gray-400 mt-1">Ask anything about {missionSubject}</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 shrink-0">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={`Ask about ${missionSubject}…`}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-indigo-600 disabled:opacity-40 hover:bg-indigo-700 text-white flex items-center justify-center">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Source Vault ─────────────────────────────────────────────────────────────
function SourceVault({ missionId }: { missionId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Find the mission's vault folder
  useEffect(() => {
    const userId = uid();
    const unsub = subscribeToVaultFolders(userId, folders => {
      const missionVault = folders.find((f: any) => f.missionId === missionId);
      if (missionVault) setVaultId(missionVault.id);
    });
    return unsub;
  }, [missionId]);

  // Subscribe to vault items when vault is found
  useEffect(() => {
    if (!vaultId) return;
    const userId = uid();
    const unsub = subscribeToVaultItems(userId, vaultId, 'source', setItems);
    return unsub;
  }, [vaultId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vaultId) return;
    const err = validateFile(file, 0);
    if (err) { alert(err.message); return; }
    setUploading(true);
    try {
      await uploadVaultFile(uid(), vaultId, missionId, file, (p) => setUploadProgress(p));
    } catch (ex) { console.error(ex); }
    finally { setUploading(false); setUploadProgress(0); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Source Vault</h3>
        <button onClick={() => fileRef.current?.click()} disabled={uploading || !vaultId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? `${Math.round(uploadProgress)}%` : 'Add Source'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.mp3,.wav" />
      </div>

      {!vaultId && (
        <div className="text-center py-8">
          <Database size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">No vault linked to this mission yet.<br />Complete the Mission Setup to create one.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {vaultId && items.length === 0 && (
          <div className="text-center py-10">
            <Database size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">No sources yet — upload PDFs, notes, or images</p>
          </div>
        )}
        {items.map((item: any) => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100">
            <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{item.title || 'Untitled'}</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                {item.subtype?.toUpperCase()} · {item.createdAt?.toDate?.().toLocaleDateString()}
              </p>
            </div>
            {item.downloadURL && (
              <a href={item.downloadURL} target="_blank" rel="noreferrer"
                className="shrink-0 p-1 rounded hover:bg-gray-200">
                <BookOpen size={13} className="text-indigo-500" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right: Edit Panel ─────────────────────────────────────────────────────────
function EditPanel({ mission, missionId, onSaved }: { mission: MissionDoc; missionId: string; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<MissionDoc>>({
    subject: mission.subject,
    missionName: mission.missionName,
    deadline: mission.deadline,
    difficulty: mission.difficulty,
    status: mission.status,
    weekdayHours: mission.weekdayHours,
    weekendHours: mission.weekendHours,
    customPrompt: mission.customPrompt,
    baseline: mission.baseline,
    cognitiveMode: mission.cognitiveMode,
  });
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const navigate = useNavigate();

  const set = (k: keyof MissionDoc, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try { await updateMissionDoc(missionId, form); onSaved(); } finally { setSaving(false); }
  }

  async function complete() {
    setCompleting(true);
    try { await completeMission(missionId); navigate('/'); } finally { setCompleting(false); }
  }

  return (
    <div className="space-y-4 overflow-y-auto">
      <div className="space-y-3">
        <label className="block">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Subject</span>
          <input value={form.subject ?? ''} onChange={e => set('subject', e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        </label>
        <label className="block">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Mission Name</span>
          <input value={form.missionName ?? ''} onChange={e => set('missionName', e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        </label>
        <label className="block">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Deadline</span>
          <input type="date" value={form.deadline ?? ''} onChange={e => set('deadline', e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Weekday hrs</span>
            <input type="number" min={0} max={12} value={form.weekdayHours ?? 2}
              onChange={e => set('weekdayHours', +e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Weekend hrs</span>
            <input type="number" min={0} max={12} value={form.weekendHours ?? 4}
              onChange={e => set('weekendHours', +e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
          </label>
        </div>
        <label className="block">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Status</span>
          <select value={form.status ?? 'planning'} onChange={e => set('status', e.target.value as any)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 bg-white">
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Difficulty</span>
          <div className="flex gap-1.5 mt-1">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => set('difficulty', d)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                  form.difficulty === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>{d}</button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Custom Prompt</span>
          <textarea rows={3} value={form.customPrompt ?? ''} onChange={e => set('customPrompt', e.target.value)}
            placeholder="Any special focus or instructions…"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        </label>
      </div>

      <div className="space-y-2 pt-2">
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
        <button onClick={complete} disabled={completing}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Mark as Completed
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActiveMission() {
  const { id: missionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mission, setMission] = useState<MissionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0, bestStreak: 0, lastSessionDate: '', studyDays: []
  });
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [saveBanner, setSaveBanner] = useState(false);
  const [centerTab, setCenterTab] = useState<'oracle' | 'vault'>('oracle');
  const [mobileTab, setMobileTab] = useState<'stats' | 'oracle' | 'vault' | 'edit'>('oracle');

  useEffect(() => {
    if (!missionId) return;
    const userId = uid();
    const ref = doc(db, 'users', userId, 'missions', missionId);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setMission(snap.data() as MissionDoc);
      setLoading(false);
    });
    return unsub;
  }, [missionId]);

  useEffect(() => {
    getStreakData().then(setStreakData).catch(() => {});
    if (missionId) {
      getStudySessions(missionId, 50).then(r => setSessions(r.sessions)).catch(() => {});
    }
  }, [missionId]);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (!mission || !missionId) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">🚫</p>
        <p className="text-gray-600 font-semibold">Mission not found</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-indigo-600 text-sm font-bold hover:underline">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );

  // Analytics derived from sessions
  const scoreSessions = sessions.filter(s =>
    ['flashcard', 'mcq', 'oral'].includes(s.sessionType) && s.status === 'completed'
  );
  const avgScore = scoreSessions.length > 0
    ? Math.round(scoreSessions.reduce((a, b) => a + b.scorePercentage, 0) / scoreSessions.length)
    : 0;
  const flashcardCount = sessions.filter(s => s.sessionType === 'flashcard').length;
  const quizCount = sessions.filter(s => s.sessionType === 'mcq').length;
  const assessmentCount = sessions.filter(s => s.sessionType === 'oral').length;

  const daysLeft = mission.deadline
    ? Math.max(0, Math.ceil((new Date(mission.deadline).getTime() - Date.now()) / 86400000))
    : null;

  const deadlineFmt = mission.deadline
    ? new Date(mission.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No deadline';

  function onSaved() {
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 2500);
  }

  const CENTER_TABS = [
    { key: 'oracle' as const, label: 'Oracle', icon: <Cpu size={14} /> },
    { key: 'vault' as const, label: 'Source Vault', icon: <Database size={14} /> },
  ];

  const MOBILE_TABS = [
    { key: 'stats' as const, label: 'Stats', icon: <BarChart2 size={16} /> },
    { key: 'oracle' as const, label: 'Oracle', icon: <Cpu size={16} /> },
    { key: 'vault' as const, label: 'Vault', icon: <Database size={16} /> },
    { key: 'edit' as const, label: 'Edit', icon: <Edit3 size={16} /> },
  ];

  const StatsPanel = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <KPICard label="Streak" value={`${streakData.currentStreak}d`} icon={<Flame size={14} />} accent="#F59E0B" />
        <KPICard label="Avg Score" value={`${avgScore}%`} icon={<Target size={14} />} accent="#6366F1" />
        <KPICard label="Flashcards" value={flashcardCount} icon={<Zap size={14} />} accent="#8B5CF6" />
        <KPICard label="Quizzes" value={quizCount} icon={<CheckCircle2 size={14} />} accent="#10B981" />
        <KPICard label="Assessments" value={assessmentCount} icon={<BookOpen size={14} />} accent="#F43F5E" />
        {daysLeft !== null && <KPICard label="Days Left" value={daysLeft} icon={<Clock size={14} />} accent="#0EA5E9" />}
      </div>
      <StudyStreak streakData={streakData} />
      <SyllabusBar sessions={sessions} />
      <SessionHistory missionId={missionId} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Save Banner */}
      <AnimatePresence>
        {saveBanner && (
          <motion.div
            initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 size={14} /> Saved successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-black text-gray-900 truncate">{mission.subject}</h1>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[mission.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {mission.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono truncate">
            {mission.missionName} · {deadlineFmt}{daysLeft !== null ? ` · ${daysLeft}d left` : ''}
          </p>
        </div>
      </header>

      {/* Desktop 3-panel */}
      <div className="hidden md:flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Left: Stats */}
        <aside className="w-72 lg:w-80 border-r border-gray-100 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold mb-4">Analytics</p>
            <StatsPanel />
          </div>
        </aside>

        {/* Center: Oracle / Vault */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
          <div className="flex gap-1 p-3 border-b border-gray-100 bg-white shrink-0">
            {CENTER_TABS.map(t => (
              <button key={t.key} onClick={() => setCenterTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  centerTab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
            {centerTab === 'oracle' && <OracleChat missionId={missionId} missionSubject={mission.subject} />}
            {centerTab === 'vault' && <SourceVault missionId={missionId} />}
          </div>
        </main>

        {/* Right: Edit */}
        <aside className="w-72 lg:w-80 border-l border-gray-100 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold mb-4">Mission Control</p>
            <EditPanel mission={mission} missionId={missionId} onSaved={onSaved} />
          </div>
        </aside>
      </div>

      {/* Mobile tabbed */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {mobileTab === 'stats' && <StatsPanel />}
          {mobileTab === 'oracle' && <OracleChat missionId={missionId} missionSubject={mission.subject} />}
          {mobileTab === 'vault' && <SourceVault missionId={missionId} />}
          {mobileTab === 'edit' && <EditPanel mission={mission} missionId={missionId} onSaved={onSaved} />}
        </div>
        <nav className="flex border-t border-gray-100 bg-white shrink-0">
          {MOBILE_TABS.map(t => (
            <button key={t.key} onClick={() => setMobileTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors ${
                mobileTab === t.key ? 'text-indigo-600' : 'text-gray-400'
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
