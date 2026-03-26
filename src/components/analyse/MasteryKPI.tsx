import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MasteryKPIProps {
    score: number;
    sessionCount: number;
    weeklyChange?: number;
}

function getScoreColor(score: number): string {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 70) return 'text-teal-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
}

function getBarGradient(score: number): string {
    if (score >= 70) return 'from-emerald-400 to-indigo-500';
    if (score >= 50) return 'from-amber-400 to-indigo-500';
    return 'from-red-400 to-amber-500';
}

export default function MasteryKPI({ score, sessionCount, weeklyChange = 0 }: MasteryKPIProps) {
    const [displayScore, setDisplayScore] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const animRef = useRef<NodeJS.Timeout | null>(null);

    // Count-up animation
    useEffect(() => {
        setDisplayScore(0);
        const duration = 1200;
        const steps = 60;
        const stepTime = duration / steps;
        let current = 0;
        const increment = score / steps;

        animRef.current = setInterval(() => {
            current += increment;
            if (current >= score) {
                setDisplayScore(score);
                if (animRef.current) clearInterval(animRef.current);
            } else {
                setDisplayScore(Math.round(current));
            }
        }, stepTime);

        return () => { if (animRef.current) clearInterval(animRef.current); };
    }, [score]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Main KPI */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left focus:outline-none"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <motion.div
                            className={`text-6xl md:text-7xl font-bold font-mono ${score === 0 ? 'text-gray-300' : getScoreColor(score)}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            {displayScore}%
                        </motion.div>
                        <p className="text-sm font-semibold text-gray-400 mt-1 uppercase tracking-wider">
                            Syllabus Mastery
                        </p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(score)}`}
                        initial={{ width: '0%' }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
                    />
                </div>

                {/* Sub-labels */}
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-400">
                        Based on {sessionCount} REVISE session{sessionCount !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-[11px] font-mono flex items-center gap-1 ${weeklyChange > 0 ? 'text-emerald-500' : weeklyChange < 0 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                        {weeklyChange > 0 ? <TrendingUp className="w-3 h-3" /> : weeklyChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {weeklyChange > 0 ? '+' : ''}{weeklyChange}% this week
                    </span>
                </div>
            </button>

            {/* Drill-down panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 mt-4 border-t border-gray-100">
                            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-3">
                                Mastery Breakdown
                            </p>
                            {sessionCount === 0 ? (
                                <p className="text-xs text-gray-400 italic">
                                    Complete your first REVISE session to see topic breakdown.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Topic breakdowns will appear here as you complete more REVISE sessions across different topics.
                                    </p>
                                    <button
                                        className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                                        onClick={e => { e.stopPropagation(); }}
                                    >
                                        See full syllabus breakdown ↓
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
