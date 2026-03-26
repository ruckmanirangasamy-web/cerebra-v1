import React, { useState } from "react";
import { X, Undo2, Brain, FolderSearch, Link2, Sparkles, Scissors, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { AutoWeaveLog, AutoWeaveActionType } from "../../services/vaultTypes";

interface AutoWeaveCarouselProps {
    logs: AutoWeaveLog[];
    onUndo: (logId: string) => void;
    onClear: () => void;
}

const actionIcons: Record<AutoWeaveActionType, React.ElementType> = {
    auto_sort: FolderSearch,
    cross_ref: Link2,
    duplicate_flag: Scissors,
    ghost_capture: Brain,
    pyq_update: Sparkles,
    auto_title: Sparkles
};

const actionColors: Record<AutoWeaveActionType, string> = {
    auto_sort: "text-purple-400 bg-purple-500/10",
    cross_ref: "text-emerald-400 bg-emerald-500/10",
    duplicate_flag: "text-amber-400 bg-amber-500/10",
    ghost_capture: "text-emerald-400 bg-emerald-500/10",
    pyq_update: "text-blue-400 bg-blue-500/10",
    auto_title: "text-purple-400 bg-purple-500/10"
};

export const AutoWeaveCarousel: React.FC<AutoWeaveCarouselProps> = ({ logs, onUndo, onClear }) => {
    const [expanded, setExpanded] = useState(false);
    const [undoneIds, setUndoneIds] = useState<Set<string>>(new Set());

    const handleUndo = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setUndoneIds(prev => new Set(prev).add(id));
        setTimeout(() => onUndo(id), 1500); // Visual delay before actually removing
    };

    if (logs.length === 0) return null;

    return (
        <div className="w-full relative z-10 my-4">
            <motion.div
                layout
                className="w-full bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                transition={{ stiffness: 320, damping: 30 }}
            >
                <div
                    className={cn(
                        "flex items-center gap-3 p-3 select-none",
                        !expanded ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""
                    )}
                    onClick={() => !expanded && setExpanded(true)}
                >
                    <div className="flex items-center gap-2 pl-2 whitespace-nowrap hidden sm:flex">
                        <Brain className="w-4 h-4 text-emerald-500" />
                        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                            Librarian Agent
                        </span>
                    </div>

                    {/* Collapsed Strip */}
                    <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth pl-2 sm:pl-4 border-l border-slate-200">
                        {logs.slice(0, expanded ? logs.length : 5).map(log => {
                            const Icon = actionIcons[log.actionType];
                            return (
                                <div
                                    key={log.id}
                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 min-w-[160px] max-w-[240px]"
                                >
                                    <div className={cn("p-1 rounded-md", actionColors[log.actionType])}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="font-mono text-xs text-slate-600 truncate">
                                        {log.summary}
                                    </span>
                                </div>
                            );
                        })}

                        {!expanded && logs.length > 5 && (
                            <div className="flex-shrink-0 flex items-center px-4 rounded-full bg-slate-50 font-mono text-xs text-slate-500">
                                +{logs.length - 5} more
                            </div>
                        )}
                    </div>

                    {/* Expanded Controls */}
                    {expanded && (
                        <div className="flex items-center gap-2 pr-2 ml-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); onClear(); setExpanded(false); }}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors tooltip-trigger"
                                title="Clear AI Log"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Expanded Vertical List */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="max-h-[320px] overflow-y-auto no-scrollbar border-t border-slate-200"
                        >
                            <div className="p-2 flex flex-col gap-1">
                                {logs.map((log) => {
                                    const Icon = actionIcons[log.actionType];
                                    const isUndone = undoneIds.has(log.id);
                                    const isExpired = new Date() > new Date(log.undoAvailableUntil.toString());

                                    return (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                                        >
                                            <div className={cn("p-2 rounded-xl", actionColors[log.actionType])}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-syne font-bold text-sm text-slate-800 truncate">
                                                    {log.actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </h4>
                                                <p className="font-mono text-[11px] text-slate-500 truncate mt-1">
                                                    {log.summary}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-[10px] text-slate-400 hidden sm:block">
                                                    {new Date(log.timestamp.toString()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>

                                                {isUndone ? (
                                                    <div className="flex items-center justify-center h-8 px-4 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        <span className="font-mono text-xs">✓ Undone</span>
                                                    </div>
                                                ) : isExpired ? (
                                                    <div className="flex items-center justify-center h-8 px-4 rounded-full bg-slate-100 text-slate-400">
                                                        <span className="font-mono text-xs">Expired</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => handleUndo(e, log.id)}
                                                        className="flex items-center justify-center h-8 px-4 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/20 transition-all border border-transparent opacity-0 group-hover:opacity-100 sm:opacity-100"
                                                    >
                                                        <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                                                        <span className="font-mono text-xs">Undo</span>
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
