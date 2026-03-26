import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Loader2, BookOpen, Calendar, X } from 'lucide-react';
import { getProphecyData, type ProphecyTopic } from '../../services/analyseService';

interface ProphecyEngineProps {
    missionId: string | null;
}

const tierConfig: Record<string, { emoji: string; label: string; bg: string; border: string; textColor: string }> = {
    critical: {
        emoji: '🔴',
        label: 'CRITICAL',
        bg: 'bg-red-50',
        border: 'border-red-200',
        textColor: 'text-red-600',
    },
    high: {
        emoji: '🟡',
        label: 'PROBABLE',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        textColor: 'text-amber-600',
    },
    wildcard: {
        emoji: '🟢',
        label: 'WILDCARD',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        textColor: 'text-emerald-600',
    },
};

export default function ProphecyEngine({ missionId }: ProphecyEngineProps) {
    const [topics, setTopics] = useState<ProphecyTopic[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<ProphecyTopic | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    async function loadData() {
        if (!missionId) {
            setTopics([]);
            return;
        }
        setLoading(true);
        try {
            const data = await getProphecyData(missionId);
            setTopics(data);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('Prophecy load error:', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, [missionId]);

    async function handleRefresh() {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }

    // Group by tier
    const criticalTopics = topics.filter(t => t.priorityLevel === 'critical');
    const highTopics = topics.filter(t => t.priorityLevel === 'high');
    const wildcardTopics = topics.filter(t => t.priorityLevel === 'wildcard');

    if (!missionId) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                    🔮 Prophecy Engine
                </h3>
                <p className="text-sm font-semibold text-gray-500">No predictions yet</p>
                <p className="text-xs text-gray-400 mt-1 italic">
                    Select a mission and upload PYQ papers to activate predictions.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    🔮 Prophecy Engine
                </h3>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                    {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Refresh
                </button>
            </div>

            {loading && topics.length === 0 ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-100 rounded-full animate-pulse" />
                    ))}
                </div>
            ) : topics.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-sm text-gray-500 font-semibold">No PYQ data found</p>
                    <p className="text-xs text-gray-400 mt-1 italic">
                        Upload past papers in Mission PLAN to unlock predictions.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Render tiers */}
                    {[
                        { key: 'critical', items: criticalTopics },
                        { key: 'high', items: highTopics },
                        { key: 'wildcard', items: wildcardTopics },
                    ].filter(g => g.items.length > 0).map(group => {
                        const tier = tierConfig[group.key];
                        return (
                            <div key={group.key}>
                                <p className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${tier.textColor}`}>
                                    {tier.emoji} {tier.label}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {group.items.map((topic, i) => (
                                        <motion.button
                                            key={topic.topicName}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            onClick={() => setSelectedTopic(topic)}
                                            className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 transition-all hover:shadow-sm ${tier.bg} ${tier.border}`}
                                        >
                                            <span className="text-gray-800">{topic.topicName}</span>
                                            <span className={`font-mono font-bold ${tier.textColor}`}>
                                                {Math.round(topic.probabilityScore * 100)}%
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Last updated */}
            {lastUpdated && (
                <p className="text-[10px] font-mono text-gray-400 mt-4">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
            )}

            {/* Detail Bottom Sheet */}
            <AnimatePresence>
                {selectedTopic && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 z-50 flex items-end lg:items-center lg:justify-center"
                        onClick={() => setSelectedTopic(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                            className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:w-96 p-6 shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">{selectedTopic.topicName}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${tierConfig[selectedTopic.priorityLevel].bg} ${tierConfig[selectedTopic.priorityLevel].textColor}`}>
                                            {tierConfig[selectedTopic.priorityLevel].label}
                                        </span>
                                        <span className="text-lg font-mono font-bold text-indigo-600">
                                            {Math.round(selectedTopic.probabilityScore * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTopic(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Factor breakdown */}
                            <div className="space-y-2 mb-5">
                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Why this prediction?</p>
                                <div className="text-xs text-gray-600 space-y-1.5">
                                    <p>📊 Frequency score: <span className="font-mono font-bold">{(selectedTopic.frequencyScore * 100).toFixed(0)}%</span></p>
                                    <p>🕐 Recency score: <span className="font-mono font-bold">{(selectedTopic.recencyScore * 100).toFixed(0)}%</span></p>
                                    <p>⚡ Weakness factor: <span className="font-mono font-bold">{(selectedTopic.weaknessScore * 100).toFixed(0)}%</span></p>
                                </div>
                            </div>

                            {/* Quick actions */}
                            <div className="space-y-2">
                                <button className="w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                                    <BookOpen className="w-3.5 h-3.5" /> Open Oracle for this topic
                                </button>
                                <button className="w-full py-2.5 rounded-xl bg-gray-50 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Add to today's schedule
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
