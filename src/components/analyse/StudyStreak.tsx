import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { type StreakData } from '../../services/analyseService';

interface StudyStreakProps {
    streakData: StreakData;
}

export default function StudyStreak({ streakData }: StudyStreakProps) {
    const [displayStreak, setDisplayStreak] = useState(0);
    const animRef = useRef<NodeJS.Timeout | null>(null);
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);

    // Count-up animation
    useEffect(() => {
        setDisplayStreak(0);
        if (streakData.currentStreak === 0) return;
        const duration = 600;
        const steps = 30;
        const stepTime = duration / steps;
        let current = 0;
        const increment = streakData.currentStreak / steps;

        animRef.current = setInterval(() => {
            current += increment;
            if (current >= streakData.currentStreak) {
                setDisplayStreak(streakData.currentStreak);
                if (animRef.current) clearInterval(animRef.current);
            } else {
                setDisplayStreak(Math.round(current));
            }
        }, stepTime);

        return () => { if (animRef.current) clearInterval(animRef.current); };
    }, [streakData.currentStreak]);

    // Build 30-day grid
    const today = new Date();
    const days: { date: string; label: string; isActive: boolean; isToday: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({
            date: dateStr,
            label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            isActive: streakData.studyDays?.includes(dateStr) || false,
            isToday: i === 0,
        });
    }

    const isBroken = streakData.currentStreak === 0 && streakData.bestStreak > 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Streak number */}
            <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl">🔥</span>
                    <motion.span
                        className={`text-5xl md:text-6xl font-bold font-mono ${isBroken ? 'text-red-500' : streakData.currentStreak === 0 ? 'text-gray-300' : 'text-amber-500'
                            }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {displayStreak}
                    </motion.span>
                </div>
                <p className="text-sm font-semibold text-gray-400 mt-1">
                    {isBroken ? 'Streak broken' : 'Day Streak'}
                </p>
                <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    Personal best: {streakData.bestStreak} day{streakData.bestStreak !== 1 ? 's' : ''}
                </p>
                {isBroken && (
                    <p className="text-xs text-amber-600 italic mt-2">
                        Restart today — study for at least 1 session to begin again
                    </p>
                )}
            </div>

            {/* 30-Day Activity Grid */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                {days.map((day, i) => (
                    <motion.div
                        key={day.date}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="relative"
                        onMouseEnter={() => setHoveredDay(day.date)}
                        onMouseLeave={() => setHoveredDay(null)}
                    >
                        <div
                            className={`w-full aspect-square rounded ${day.isActive
                                    ? 'bg-gradient-to-br from-emerald-400 to-indigo-500'
                                    : 'bg-gray-100'
                                } ${day.isToday ? 'ring-2 ring-white ring-offset-1 ring-offset-indigo-300' : ''}`}
                        />

                        {/* Tooltip */}
                        {hoveredDay === day.date && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white rounded-md text-[9px] font-mono whitespace-nowrap z-10 shadow-lg">
                                <p>{day.label}</p>
                                <p>{day.isActive ? '✅ Active' : 'No sessions'}</p>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
