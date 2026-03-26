import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { PieChart, Flame, CalendarClock, ArrowRight, Loader2 } from "lucide-react";
import { subscribeMissions } from "../../services/scheduleService";
import { ActiveMission } from "../../services/scheduleTypes";

export default function AnalyticsOverview() {
    const [missions, setMissions] = useState<ActiveMission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeMissions((data) => {
            setMissions(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Quick Stats
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
                    <p className="text-xs text-gray-400 mt-2">Calculating stats...</p>
                </div>
            </section>
        );
    }

    // Calculate dynamic stats
    const totalMissions = missions.length;
    const avgMastery = totalMissions > 0
        ? Math.round(missions.reduce((acc, m) => acc + m.masteryPercent, 0) / totalMissions)
        : 0;

    // Find next deadline
    const sortedByDate = [...missions].sort((a, b) => {
        const dateA = a.examDate?.toDate?.() || new Date(a.examDate);
        const dateB = b.examDate?.toDate?.() || new Date(b.examDate);
        return dateA.getTime() - dateB.getTime();
    });

    const nextMission = sortedByDate[0];
    let deadlineLabel = "No deadlines";
    let deadlineSub = "All missions clear";

    if (nextMission) {
        const examDate = nextMission.examDate?.toDate?.() || new Date(nextMission.examDate);
        const diffDays = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        deadlineLabel = diffDays > 0 ? `${diffDays} days` : "Today!";
        deadlineSub = nextMission.subject;
    }

    const displayStats = [
        {
            label: "Syllabus Mastery",
            value: `${avgMastery}%`,
            sub: `Across ${totalMissions} subject${totalMissions !== 1 ? 's' : ''}`,
            icon: <PieChart className="w-5 h-5" />,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
        },
        {
            label: "Study Streak",
            value: "12 days", // Placeholder for now
            sub: "Personal best: 18 days",
            icon: <Flame className="w-5 h-5" />,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            label: "Next Deadline",
            value: deadlineLabel,
            sub: deadlineSub,
            icon: <CalendarClock className="w-5 h-5" />,
            color: "text-rose-600",
            bg: "bg-rose-50",
        },
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Quick Stats
                </h2>
                <Link
                    to="/workspace"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                    See full analytics <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {displayStats.map((stat, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -3 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4"
                    >
                        <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shrink-0`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color} mt-0.5`}>{stat.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
