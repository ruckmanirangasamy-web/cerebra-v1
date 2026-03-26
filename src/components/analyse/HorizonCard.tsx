import { motion } from 'motion/react';
import { Zap, ArrowRight } from 'lucide-react';
import { type MissionDoc } from '../../services/missionService';
import { type HorizonAssessment, getRandomPeerQuote } from '../../services/analyseService';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface HorizonCardProps {
    assessment: HorizonAssessment | null;
    mission: MissionDoc | null;
}

const verdictStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
    on_track: {
        bg: 'bg-emerald-50',
        border: 'border-l-emerald-500',
        text: 'text-emerald-700',
        label: 'ON TRACK',
    },
    at_risk: {
        bg: 'bg-amber-50',
        border: 'border-l-amber-500',
        text: 'text-amber-700',
        label: 'AT RISK',
    },
    critical: {
        bg: 'bg-red-50',
        border: 'border-l-red-500',
        text: 'text-red-700',
        label: 'CRITICAL',
    },
};

export default function HorizonCard({ assessment, mission }: HorizonCardProps) {
    const [peerQuote] = useState(() => getRandomPeerQuote());

    if (!mission) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">The Horizon</span>
                </div>
                <p className="text-sm font-semibold text-gray-500">No active mission</p>
                <p className="text-xs text-gray-400 mt-1 italic">Select a mission above or start your first one.</p>
                <Link
                    to="/mission"
                    className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                    Start your first mission <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        );
    }

    const daysLeft = Math.max(0, Math.ceil((new Date(mission.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.max(1, Math.ceil((new Date(mission.deadline).getTime() - (mission.createdAt?.toMillis() || Date.now())) / (1000 * 60 * 60 * 24)));
    const elapsed = totalDays - daysLeft;
    const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));

    const urgencyColor = daysLeft <= 3 ? 'text-red-600 bg-red-50' : daysLeft <= 7 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

    const verdict = assessment ? verdictStyles[assessment.verdict] || verdictStyles.at_risk : null;

    return (
        <motion.div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">The Horizon</span>
                </div>
                <span className="text-xs font-bold text-gray-700">{mission.subject}</span>
            </div>

            {/* Deadline row */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-mono text-gray-400">⚡ Judgment Day:</span>
                <span className="text-sm font-mono font-bold text-gray-800">{mission.deadline}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyColor}`}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Progress bar */}
            <div className="relative mb-1">
                <div className="bg-gray-100 rounded-full h-2">
                    <motion.div
                        className="h-full rounded-full bg-indigo-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>
                {/* Today marker */}
                <div
                    className="absolute -top-4 text-[9px] font-mono text-indigo-500 font-bold"
                    style={{ left: `${Math.min(90, progress)}%`, transform: 'translateX(-50%)' }}
                >
                    Today ▼
                </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mt-1">
                <span>Mission start</span>
                <span>Exam</span>
            </div>

            {/* AI Assessment */}
            {assessment && verdict && (
                <div className={`mt-5 p-4 rounded-xl border-l-4 ${verdict.border} ${verdict.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-mono font-bold uppercase ${verdict.text}`}>
                            {verdict.label}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 italic leading-relaxed">
                        {assessment.headline}
                    </p>
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        {assessment.detail}
                    </p>
                </div>
            )}

            {/* Peer Quote */}
            <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic leading-relaxed">
                    {peerQuote}
                </p>
            </div>
        </motion.div>
    );
}
