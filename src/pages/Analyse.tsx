import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, BarChart3 } from 'lucide-react';
import { listMissions, type MissionDoc } from '../services/missionService';
import {
    getStudySessions,
    getStreakData,
    computeMasteryScore,
    computeFallbackVerdict,
    type StudySession,
    type StreakData,
    type HorizonAssessment,
} from '../services/analyseService';
import MasteryKPI from '../components/analyse/MasteryKPI';
import HorizonCard from '../components/analyse/HorizonCard';
import ProphecyEngine from '../components/analyse/ProphecyEngine';
import SyllabusBar from '../components/analyse/SyllabusBar';
import PYQChart from '../components/analyse/PYQChart';
import SessionHistory from '../components/analyse/SessionHistory';
import StudyStreak from '../components/analyse/StudyStreak';

export default function Analyse() {
    const [missions, setMissions] = useState<MissionDoc[]>([]);
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, bestStreak: 0, lastSessionDate: '', studyDays: [] });
    const [masteryScore, setMasteryScore] = useState(0);
    const [horizon, setHorizon] = useState<HorizonAssessment | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch missions
    useEffect(() => {
        async function load() {
            try {
                const m = await listMissions();
                setMissions(m.filter(x => x.status !== 'completed'));
            } catch (e) {
                console.error('Failed to load missions:', e);
            }
        }
        load();
    }, []);

    // Fetch analytics data whenever active mission changes
    useEffect(() => {
        async function loadAnalytics() {
            setLoading(true);
            try {
                const [sessionResult, streak] = await Promise.all([
                    getStudySessions(activeMissionId || undefined),
                    getStreakData(),
                ]);
                setSessions(sessionResult.sessions);
                setStreakData(streak);

                // Compute mastery
                const allTopics = [...new Set(sessionResult.sessions.map(s => s.topic))];
                const mastery = computeMasteryScore(sessionResult.sessions, allTopics);
                setMasteryScore(mastery);

                // Compute horizon (fallback—no Gemini key)
                const activeMission = missions.find(m => m.id === activeMissionId);
                if (activeMission) {
                    const daysLeft = Math.max(0, Math.ceil((new Date(activeMission.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                    const weakCount = sessionResult.sessions.filter(s => s.scorePercentage < 60).length;
                    // Use fallback verdict
                    const h = computeFallbackVerdict(mastery);
                    h.detail = `${daysLeft} days remaining. ${h.detail} ${weakCount} weak topic${weakCount !== 1 ? 's' : ''} flagged.`;
                    setHorizon(h);
                } else {
                    setHorizon(null);
                }
            } catch (e) {
                console.error('Failed to load analytics:', e);
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, [activeMissionId, missions]);

    const activeMission = missions.find(m => m.id === activeMissionId) || null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-gray-200 pb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 font-display flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-indigo-600" />
                        Analyse
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm md:text-base">
                        Intelligence dashboard. Predict. Prioritize. Win.
                    </p>
                </div>
            </header>

            {/* Mission Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setActiveMissionId(null)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeMissionId === null
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    📊 All Missions
                </button>
                {missions.map(m => (
                    <button
                        key={m.id}
                        onClick={() => setActiveMissionId(m.id)}
                        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeMissionId === m.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <span>{m.subject}</span>
                        <span className="opacity-60">·</span>
                        <span className="opacity-80 capitalize">{m.missionType}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Two-column layout on desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left column — 60% */}
                        <div className="lg:col-span-3 space-y-6">
                            <MasteryKPI score={masteryScore} sessionCount={sessions.length} />
                            <HorizonCard
                                assessment={horizon}
                                mission={activeMission}
                            />
                            <SyllabusBar sessions={sessions} />
                            <SessionHistory
                                missionId={activeMissionId}
                            />
                        </div>

                        {/* Right column — 40% */}
                        <div className="lg:col-span-2 space-y-6">
                            <StudyStreak streakData={streakData} />
                            <ProphecyEngine missionId={activeMissionId} />
                            <PYQChart missionId={activeMissionId} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
