import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Clock, Pause, Play, Square, Pencil, Check, MessageCircle, Target, FileText, FolderOpen } from "lucide-react";
import { cn } from "../../lib/utils";

interface SessionControlsProps {
    subject: string;
    topic: string;
    onSubjectChange: (s: string) => void;
    onTopicChange: (t: string) => void;
    cognitiveMode: 'scholar' | 'sniper';
    onModeToggle: () => void;
    onOpenOracle: () => void;
    onOpenWorkspace: () => void;
    onOpenVaultSidebar: () => void;
    timerSeconds: number;
    isTimerRunning: boolean;
    onPauseResume: () => void;
    onStop: () => void;
}

const SUBJECTS = ['Cardiology', 'Biochemistry', 'Pharmacology', 'Anatomy', 'Physiology', 'Pathology'];

export default function SessionControls({
    subject, topic, onSubjectChange, onTopicChange,
    cognitiveMode, onModeToggle,
    onOpenOracle, onOpenWorkspace, onOpenVaultSidebar,
    timerSeconds, isTimerRunning, onPauseResume, onStop
}: SessionControlsProps) {
    const [editing, setEditing] = useState(false);
    const [editSubject, setEditSubject] = useState(subject);
    const [editTopic, setEditTopic] = useState(topic);
    const [colonVisible, setColonVisible] = useState(true);

    useEffect(() => {
        if (!isTimerRunning) return;
        const id = setInterval(() => setColonVisible(v => !v), 1000);
        return () => clearInterval(id);
    }, [isTimerRunning]);

    const formatTime = (s: number) => {
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        const colon = colonVisible ? ':' : ' ';
        return `${h}${colon}${m}${colon}${sec}`;
    };

    const handleConfirm = () => {
        onSubjectChange(editSubject);
        onTopicChange(editTopic);
        setEditing(false);
    };

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-5 py-3 bg-gray-900 text-white rounded-2xl shadow-xl">
            {/* Currently Studying */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                {editing ? (
                    <div className="flex items-center gap-2 flex-1">
                        <select
                            value={editSubject}
                            onChange={e => setEditSubject(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                            {SUBJECTS.map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                        </select>
                        <span className="text-white/30">·</span>
                        <input
                            value={editTopic}
                            onChange={e => setEditTopic(e.target.value)}
                            placeholder="Topic..."
                            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-mono flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button onClick={handleConfirm} className="p-1 bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1 transition-colors min-w-0">
                        {subject ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                <span className="text-xs font-bold truncate">{subject}</span>
                                <span className="text-white/30">·</span>
                                <span className="text-xs font-mono text-white/60 truncate">{topic || 'No topic'}</span>
                            </>
                        ) : (
                            <span className="text-xs font-mono text-white/30">Tap to set topic</span>
                        )}
                        <Pencil className="w-3 h-3 text-white/30 shrink-0" />
                    </button>
                )}
            </div>

            {/* Timer */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-white/50" />
                    <span className="text-sm font-mono font-bold tracking-wider">{formatTime(timerSeconds)}</span>
                </div>
                <button onClick={onPauseResume} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title={isTimerRunning ? 'Pause' : 'Resume'}>
                    {isTimerRunning ? <Pause className="w-4 h-4 text-white/50" /> : <Play className="w-4 h-4 text-emerald-400" />}
                </button>
                <button onClick={onStop} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Stop session">
                    <Square className="w-4 h-4 text-white/50" />
                </button>

                <div className="h-5 w-px bg-white/10" />

                {/* Mode Toggle */}
                <button onClick={onModeToggle} className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                    cognitiveMode === 'sniper' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                )}>
                    {cognitiveMode === 'sniper' ? '⚡ Sniper' : '🎓 Scholar'}
                </button>

                <div className="h-5 w-px bg-white/10" />

                {/* Quick Access Strip */}
                <div className="flex items-center gap-1.5">
                    <button onClick={onOpenOracle} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold hover:border-emerald-500/30 transition-colors">
                        <MessageCircle className="w-3 h-3" /> Oracle
                    </button>
                    <button onClick={onOpenWorkspace} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold hover:border-purple-500/30 transition-colors">
                        <FileText className="w-3 h-3" /> Workspace
                    </button>
                    <button onClick={onOpenVaultSidebar} className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold hover:border-blue-500/30 transition-colors">
                        <FolderOpen className="w-3 h-3" /> Vault
                    </button>
                </div>
            </div>
        </div>
    );
}
