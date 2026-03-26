import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Play,
    CheckCircle2,
    StopCircle,
    ChevronDown,
    FolderKanban,
    Inbox,
    Loader2,
} from "lucide-react";
import { listMissions, type MissionDoc } from "../../services/missionService";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
    planning: "bg-blue-100 text-blue-700",
    scheduled: "bg-indigo-100 text-indigo-700",
    learning: "bg-emerald-100 text-emerald-700",
    arranged: "bg-teal-100 text-teal-700",
    revising: "bg-amber-100 text-amber-700",
    completed: "bg-gray-100 text-gray-500",
};

const stepLabels: Record<string, string> = {
    planning: "Step 1 — Plan",
    scheduled: "Step 2 — Schedule",
    learning: "Step 3 — Learn",
    arranged: "Step 4 — Arrange",
    revising: "Step 5 — Revise",
    completed: "Completed ✓",
};

export default function ActiveProjects() {
    const [missions, setMissions] = useState<MissionDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchMissions() {
            try {
                const data = await listMissions();
                setMissions(data.filter(m => m.status !== 'completed'));
            } catch (err) {
                console.error("Failed to fetch missions:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMissions();
    }, []);

    if (loading) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Active Projects
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
                    <p className="text-xs text-gray-400 mt-2">Loading missions...</p>
                </div>
            </section>
        );
    }

    return (
        <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Active Projects
            </h2>

            {missions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500">No active projects</p>
                    <p className="text-xs text-gray-400 mt-1">Start a mission to see it here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {missions.map((m) => {
                        const progress = Math.round((m.currentStep / 5) * 100);
                        const isExpanded = expandedId === m.id;

                        // Days remaining
                        const daysLeft = Math.max(0, Math.ceil((new Date(m.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                        return (
                            <motion.div
                                key={m.id}
                                layout
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FolderKanban className="w-4 h-4 text-gray-400 shrink-0" />
                                                <p className="text-sm font-bold text-gray-900 truncate">{m.missionName}</p>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${statusColors[m.status] || statusColors.planning}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {m.subject} • {stepLabels[m.status] || 'In Progress'}
                                            </p>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                title="Resume"
                                                onClick={() => navigate('/mission')}
                                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                title="Info"
                                                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                                                className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                            >
                                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </motion.div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                            <div
                                                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-gray-400">
                                            {m.currentStep}/5
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                                        <span>Due: {m.deadline} ({daysLeft}d left)</span>
                                        <span>{progress}% complete</span>
                                    </div>
                                </div>

                                {/* Expanded info panel */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 text-xs text-gray-600 space-y-1"
                                        >
                                            <p><strong>Subject:</strong> {m.subject}</p>
                                            <p><strong>Type:</strong> {m.missionType}</p>
                                            <p><strong>Difficulty:</strong> {m.difficulty}</p>
                                            <p><strong>Mode:</strong> {m.cognitiveMode}</p>
                                            <p><strong>Baseline:</strong> {m.baseline}</p>
                                            <p><strong>Hours:</strong> Weekday {m.weekdayHours}h · Weekend {m.weekendHours}h</p>
                                            <p><strong>Deadline:</strong> {m.deadline}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
