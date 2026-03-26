import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
    Play,
    Pencil,
    Trash2,
    CalendarDays,
    ArrowRight,
    Clock,
    Loader2,
} from "lucide-react";
import { subscribeCalendarBlocks, deleteCalendarBlock } from "../../services/scheduleService";
import { CalendarBlock } from "../../services/scheduleTypes";

export default function ScheduleOverview() {
    const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const unsubscribe = subscribeCalendarBlocks(
            formatDate(today),
            formatDate(nextWeek),
            (data) => {
                setBlocks(data);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const removeBlock = async (id: string) => {
        try {
            await deleteCalendarBlock(id);
        } catch (err) {
            console.error("Failed to delete block:", err);
        }
    };

    if (loading) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Upcoming Schedule
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
                    <p className="text-xs text-gray-400 mt-2">Loading schedule...</p>
                </div>
            </section>
        );
    }

    if (blocks.length === 0) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Upcoming Schedule
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500">No upcoming sessions</p>
                    <p className="text-xs text-gray-400 mt-1">Schedule a study block to get started.</p>
                </div>
            </section>
        );
    }

    // Group by day with labels
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const grouped: Record<string, CalendarBlock[]> = {};

    // Only show today and tomorrow in overview
    blocks.forEach((b) => {
        let label = '';
        if (b.date === todayStr) label = 'Today';
        else if (b.date === tomorrowStr) label = 'Tomorrow';
        else return; // Skip other days in overview

        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(b);
    });

    const groupKeys = Object.keys(grouped);

    if (groupKeys.length === 0) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Upcoming Schedule
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500">No sessions for today or tomorrow</p>
                    <p className="text-xs text-gray-400 mt-1">Check your full schedule for future tasks.</p>
                </div>
            </section>
        );
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Upcoming Schedule
                </h2>
                <Link
                    to="/schedule"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                    Full schedule <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="space-y-4">
                {['Today', 'Tomorrow'].map((day) => {
                    const dayBlocks = grouped[day];
                    if (!dayBlocks || dayBlocks.length === 0) return null;

                    return (
                        <div key={day}>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{day}</p>
                            <div className="space-y-2">
                                {dayBlocks.map((block) => (
                                    <motion.div
                                        key={block.id}
                                        whileHover={{ x: 3 }}
                                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
                                    >
                                        {/* Color strip */}
                                        <div
                                            className="w-1 h-12 rounded-full shrink-0"
                                            style={{ backgroundColor: block.subjectColour || '#6366f1' }}
                                        />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{block.subject}</p>
                                            <p className="text-xs text-gray-500 truncate">{block.topic}</p>
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {block.startTime} – {block.endTime}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                title="Start"
                                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                title="Edit"
                                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                title="Remove"
                                                onClick={() => removeBlock(block.id)}
                                                className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
