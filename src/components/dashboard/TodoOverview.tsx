import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
    Play,
    CheckCircle2,
    MoreHorizontal,
    PartyPopper,
    Loader2,
} from "lucide-react";
import { subscribeTasks, updateTask } from "../../services/scheduleService";
import { KanbanTask } from "../../services/scheduleTypes";

const priorityColors = {
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-gray-300",
};

export default function TodoOverview() {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeTasks((data) => {
            // Filter for urgent tasks in overview: status 'today' or priority 'high'
            // and not done
            const urgent = data.filter(t =>
                (t.status === 'In Progress' || t.priority === 'high' || t.priority === 'critical') &&
                t.status !== 'Completed'
            );
            setTasks(urgent);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const markAsDone = async (id: string) => {
        try {
            await updateTask(id, { status: "Completed", completedAt: new Date() });
        } catch (err) {
            console.error("Failed to update task:", err);
        }
    };

    if (loading) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Urgent Tasks
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
                    <p className="text-xs text-gray-400 mt-2">Loading tasks...</p>
                </div>
            </section>
        );
    }

    if (tasks.length === 0) {
        return (
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Urgent Tasks
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                    <PartyPopper className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500">All caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">No pending tasks. Well done.</p>
                </div>
            </section>
        );
    }

    return (
        <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Urgent Tasks
            </h2>

            <div className="space-y-2">
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        whileHover={{ x: 3 }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
                    >
                        {/* Priority dot */}
                        <div className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority]} shrink-0`} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                                {task.status === 'In Progress' && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                                        Today
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {task.subject} • {task.estimatedDuration} mins
                            </p>
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
                                title="Done"
                                onClick={() => markAsDone(task.id)}
                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                title="Options"
                                className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
