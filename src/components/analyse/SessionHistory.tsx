import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Loader2, RefreshCw, Copy, BookOpen } from 'lucide-react';
import { getStudySessions, type StudySession } from '../../services/analyseService';
import { DocumentSnapshot } from 'firebase/firestore';

interface SessionHistoryProps {
    missionId: string | null;
}

const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
    flashcard: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'FLASHCARD' },
    mcq: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'MCQ' },
    oral: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'ORAL' },
    learn: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'LEARN' },
};

const statusDot: Record<string, string> = {
    completed: 'bg-emerald-500',
    paused: 'bg-amber-500',
    abandoned: 'bg-red-500',
    active: 'bg-blue-500',
};

const FILTERS = ['All', 'Flashcard', 'MCQ', 'Oral', 'Learn', 'Completed', 'Abandoned'] as const;
type FilterType = typeof FILTERS[number];

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(ts: { toDate: () => Date } | null): string {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(sessions: StudySession[]): Record<string, StudySession[]> {
    const groups: Record<string, StudySession[]> = {};
    sessions.forEach(s => {
        const d = s.endedAt ? s.endedAt.toDate() : s.startedAt ? s.startedAt.toDate() : new Date();
        const key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    return groups;
}

export default function SessionHistory({ missionId }: SessionHistoryProps) {
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('All');
    const [search, setSearch] = useState('');
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const result = await getStudySessions(missionId || undefined, 30);
                setSessions(result.sessions);
                setLastDoc(result.lastDoc);
                setHasMore(result.sessions.length === 30);
            } catch (e) {
                console.error('Sessions load error:', e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [missionId]);

    async function loadMore() {
        if (!lastDoc) return;
        setLoadingMore(true);
        try {
            const result = await getStudySessions(missionId || undefined, 30, lastDoc);
            setSessions(prev => [...prev, ...result.sessions]);
            setLastDoc(result.lastDoc);
            setHasMore(result.sessions.length === 30);
        } catch (e) {
            console.error('Load more error:', e);
        } finally {
            setLoadingMore(false);
        }
    }

    // Apply filters
    const filtered = sessions.filter(s => {
        if (filter === 'Flashcard' && s.sessionType !== 'flashcard') return false;
        if (filter === 'MCQ' && s.sessionType !== 'mcq') return false;
        if (filter === 'Oral' && s.sessionType !== 'oral') return false;
        if (filter === 'Learn' && s.sessionType !== 'learn') return false;
        if (filter === 'Completed' && s.status !== 'completed') return false;
        if (filter === 'Abandoned' && s.status !== 'abandoned') return false;
        if (search) {
            const q = search.toLowerCase();
            return s.subject.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q);
        }
        return true;
    });

    const grouped = groupByDate(filtered);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                📅 Session History
            </h3>

            {/* Search & Filters */}
            <div className="space-y-3 mb-5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search subject or topic..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${filter === f
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-sm text-gray-500 font-semibold">No sessions yet</p>
                    <p className="text-xs text-gray-400 mt-1 italic">
                        Complete a REVISE session to see your history.
                    </p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-gray-100" />

                    <div className="space-y-4">
                        {Object.entries(grouped).map(([dateLabel, dateSessions]) => (
                            <div key={dateLabel}>
                                {/* Date header */}
                                <div className="flex items-center gap-2 mb-3 ml-[-2px]">
                                    <div className="w-3 h-3 rounded-full bg-white border-2 border-indigo-400 z-10" />
                                    <span className="text-xs font-bold text-indigo-600 font-mono">
                                        {dateLabel}
                                    </span>
                                </div>

                                {/* Sessions */}
                                <div className="space-y-2 ml-6">
                                    {dateSessions.map((session, i) => {
                                        const isExpanded = expandedId === session.id;
                                        const type = typeStyles[session.sessionType] || typeStyles.learn;
                                        const hasScore = ['flashcard', 'mcq', 'oral'].includes(session.sessionType);
                                        const scoreColor = session.scorePercentage >= 80 ? 'text-emerald-600'
                                            : session.scorePercentage >= 60 ? 'text-amber-600' : 'text-red-600';

                                        return (
                                            <motion.div
                                                key={session.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                layout
                                            >
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                                                    className="w-full text-left"
                                                >
                                                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                                        {/* Status dot */}
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[session.status] || statusDot.active}`} />

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-gray-900 truncate">{session.subject}</span>
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${type.bg} ${type.text}`}>
                                                                    {session.status === 'abandoned' ? 'ABANDONED' : type.label}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500">{session.topic}</span>
                                                        </div>

                                                        {/* Score */}
                                                        {hasScore && session.status !== 'abandoned' && (
                                                            <span className={`text-base font-mono font-bold ${scoreColor}`}>
                                                                {session.scorePercentage}%
                                                            </span>
                                                        )}

                                                        {/* Duration + time */}
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[11px] font-mono text-gray-400">
                                                                {formatDuration(session.durationSeconds)}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-gray-300">
                                                                {formatTime(session.startedAt)}
                                                            </p>
                                                        </div>

                                                        {/* Mood */}
                                                        {session.moodRating && (
                                                            <span className="text-sm">{session.moodRating}</span>
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Expanded report */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 ml-5 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                                                                {hasScore && (
                                                                    <div>
                                                                        <span className="text-2xl font-mono font-bold text-gray-900">
                                                                            {session.scorePercentage}%
                                                                        </span>
                                                                        <span className="text-xs font-mono text-gray-400 ml-2">overall score</span>
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-gray-500">
                                                                    Duration: {formatDuration(session.durationSeconds)} • Status: {session.status}
                                                                </p>
                                                                {session.weakTopics.length > 0 && (
                                                                    <div>
                                                                        <p className="text-[10px] font-mono text-gray-400 uppercase mb-1">Weak areas:</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {session.weakTopics.map(t => (
                                                                                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                                                                                    {t}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-2 pt-2">
                                                                    <button className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold hover:bg-indigo-100 flex items-center justify-center gap-1">
                                                                        <RefreshCw className="w-3 h-3" /> Re-test
                                                                    </button>
                                                                    <button className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 flex items-center justify-center gap-1">
                                                                        <BookOpen className="w-3 h-3" /> Source
                                                                    </button>
                                                                    <button className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 flex items-center justify-center gap-1">
                                                                        <Copy className="w-3 h-3" /> Copy
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load more */}
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="w-full mt-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            + Load 30 more sessions
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
