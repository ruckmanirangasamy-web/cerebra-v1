import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, BookOpen } from 'lucide-react';
import { type StudySession } from '../../services/analyseService';

interface SyllabusBarProps {
    sessions: StudySession[];
}

interface TopicData {
    name: string;
    score: number;
    sessionCount: number;
    lastTested: Date | null;
}

function getMasteryColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-red-500';
    return 'bg-gray-300';
}

function getMasteryBorder(score: number): string {
    if (score >= 80) return 'border-emerald-200';
    if (score >= 60) return 'border-amber-200';
    if (score >= 40) return 'border-red-200';
    return 'border-gray-200 border-dashed';
}

export default function SyllabusBar({ sessions }: SyllabusBarProps) {
    const [selectedTopic, setSelectedTopic] = useState<TopicData | null>(null);

    const topicData = useMemo(() => {
        const map: Record<string, { scores: number[]; lastTested: Date | null }> = {};
        sessions.forEach(s => {
            if (!['flashcard', 'mcq', 'oral'].includes(s.sessionType)) return;
            if (!map[s.topic]) map[s.topic] = { scores: [], lastTested: null };
            map[s.topic].scores.push(s.scorePercentage);
            const end = s.endedAt ? s.endedAt.toDate() : null;
            if (end && (!map[s.topic].lastTested || end > map[s.topic].lastTested!)) {
                map[s.topic].lastTested = end;
            }
        });

        return Object.entries(map).map(([name, data]) => ({
            name,
            score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
            sessionCount: data.scores.length,
            lastTested: data.lastTested,
        })).sort((a, b) => a.score - b.score);
    }, [sessions]);

    const untestedCount = 0; // We only show topics that have sessions

    if (topicData.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>📊 Syllabus Completion</span>
                </h3>
                <div className="h-7 bg-gray-100 rounded-lg w-full" />
                <p className="text-xs text-gray-400 mt-3 italic">
                    No topics to display — complete REVISE sessions to see breakdown.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>📊 Syllabus Completion</span>
            </h3>

            {/* Segmented bar */}
            <div className="flex gap-0.5 h-7 md:h-8 rounded-lg overflow-hidden">
                {topicData.map((topic, i) => (
                    <motion.button
                        key={topic.name}
                        initial={{ width: 0 }}
                        animate={{ width: `${100 / topicData.length}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                        onClick={() => setSelectedTopic(topic)}
                        className={`${getMasteryColor(topic.score)} hover:opacity-80 transition-opacity relative group ${i === 0 ? 'rounded-l-lg' : ''
                            } ${i === topicData.length - 1 ? 'rounded-r-lg' : ''}`}
                        title={`${topic.name}: ${topic.score}%`}
                    />
                ))}
            </div>

            {/* Topic labels (desktop only, up to 8) */}
            <div className="hidden md:flex gap-0.5 mt-2">
                {topicData.slice(0, 8).map(topic => (
                    <div
                        key={topic.name}
                        className="text-center overflow-hidden"
                        style={{ width: `${100 / topicData.length}%` }}
                    >
                        <p className="text-[9px] text-gray-400 truncate">{topic.name}</p>
                    </div>
                ))}
                {topicData.length > 8 && (
                    <p className="text-[9px] text-gray-400 ml-1">+{topicData.length - 8} more</p>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> ≥80%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> 60-79%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> 40-59%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-300" /> &lt;40%</span>
            </div>

            {/* Topic detail popover */}
            <AnimatePresence>
                {selectedTopic && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15, type: 'spring' }}
                        className="mt-4 p-4 rounded-xl border bg-gray-50"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-gray-900">{selectedTopic.name}</h4>
                            <button onClick={() => setSelectedTopic(null)} className="p-1 rounded-lg hover:bg-gray-200">
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                        </div>
                        <div className={`text-2xl font-mono font-bold ${selectedTopic.score >= 80 ? 'text-emerald-600' : selectedTopic.score >= 60 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                            REVISE Score: {selectedTopic.score}%
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 mt-1">
                            Based on {selectedTopic.sessionCount} REVISE session{selectedTopic.sessionCount !== 1 ? 's' : ''}
                        </p>
                        {selectedTopic.lastTested && (
                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                Last tested: {Math.round((Date.now() - selectedTopic.lastTested.getTime()) / (1000 * 60 * 60 * 24))} days ago
                            </p>
                        )}
                        <div className="flex gap-2 mt-3">
                            <button className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 flex items-center justify-center gap-1">
                                <Play className="w-3 h-3" /> Test this topic
                            </button>
                            <button className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold hover:bg-gray-200 flex items-center justify-center gap-1">
                                <BookOpen className="w-3 h-3" /> Open Oracle
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
