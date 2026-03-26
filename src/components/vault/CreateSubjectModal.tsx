import React, { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CreateSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, color: string) => Promise<void>;
}

const COLORS = [
    "#f87171", // red-400
    "#fb923c", // orange-400
    "#fbbf24", // amber-400
    "#34d399", // emerald-400
    "#38bdf8", // sky-400
    "#818cf8", // indigo-400
    "#a78bfa", // violet-400
    "#f472b6", // pink-400
    "#94a3b8", // slate-400
];

export const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
    isOpen,
    onClose,
    onCreate
}) => {
    const [name, setName] = useState("");
    const [color, setColor] = useState(COLORS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onCreate(name.trim(), color);
            setName("");
            setColor(COLORS[0]);
            onClose();
        } catch (error) {
            console.error("Failed to create subject:", error);
            // In a real app, show a toast notification here
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                        <form onSubmit={handleSubmit} className="flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                        <FolderPlus className="w-5 h-5" />
                                    </div>
                                    <h2 className="font-syne font-bold text-xl text-slate-800">New Subject</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 flex flex-col gap-6">
                                {/* Name Input */}
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="subject-name" className="font-syne font-bold text-sm text-slate-700">
                                        Subject Name
                                    </label>
                                    <input
                                        id="subject-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. History 101, Physics Notes..."
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans text-slate-800"
                                        autoFocus
                                        required
                                    />
                                </div>

                                {/* Color Picker */}
                                <div className="flex flex-col gap-3">
                                    <label className="font-syne font-bold text-sm text-slate-700">
                                        Color Theme
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${color === c ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : "hover:scale-110"
                                                    }`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl font-syne font-bold text-sm text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim() || isSubmitting}
                                    className="px-6 py-2.5 rounded-xl font-syne font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {isSubmitting ? "Creating..." : "Create Subject"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
