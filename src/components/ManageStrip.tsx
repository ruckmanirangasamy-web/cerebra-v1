import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronUp, Activity, Target, Flame, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

export function ManageStrip() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            {/* Backdrop for expanded state */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 z-[80] lg:hidden"
                        onClick={() => setIsExpanded(false)}
                    />
                )}
            </AnimatePresence>

            <motion.div
                layout
                className={cn(
                    "fixed bottom-16 lg:bottom-0 left-0 right-0 z-[90] flex flex-col items-center",
                    "bg-[#060810]/90 backdrop-blur-xl border-t border-emerald-500/30 text-white overflow-hidden",
                    isExpanded ? "h-[328px]" : "h-[48px] cursor-pointer"
                )}
                onClick={() => !isExpanded && setIsExpanded(true)}
                animate={{ height: isExpanded ? 328 : 48 }}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
            >
                {/* Collapsed Bar / Header */}
                <div className="flex-none h-[48px] w-full max-w-6xl mx-auto flex items-center justify-center px-4 md:px-8 gap-3 font-mono text-[11px] select-none text-white/80">
                    <div className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>74% complete</span>
                    </div>
                    <span className="text-white/30 hidden sm:inline">·</span>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="hidden sm:inline">Krebs Cycle needs review</span>
                        <span className="sm:hidden">Krebs Cycle</span>
                    </div>
                    <span className="text-white/30">·</span>
                    <div className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span>7-day streak</span>
                    </div>

                    <div className="ml-auto">
                        {isExpanded ? (
                            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-1 hover:bg-white/10 rounded flex items-center gap-1 opacity-70 hover:opacity-100">
                                <span>collapse</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 opacity-50">
                                <span>expand</span>
                                <ChevronUp className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Expanded Content Panels */}
                <div className={cn(
                    "flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pb-6 grid grid-cols-1 md:grid-cols-4 gap-4 opacity-0 transition-opacity duration-300 delay-100",
                    isExpanded && "opacity-100"
                )}>
                    {/* Panel 1 - Syllabus */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Syllabus</h4>
                        <div className="flex gap-1 h-3 mt-auto mb-2">
                            <div className="flex-1 bg-emerald-500 rounded-sm" title="Completed" />
                            <div className="flex-1 bg-emerald-500 rounded-sm" title="Completed" />
                            <div className="flex-1 bg-amber-500 rounded-sm" title="Needs Work" />
                            <div className="flex-1 bg-white/10 rounded-sm" title="Not Started" />
                            <div className="flex-1 bg-white/10 rounded-sm" title="Not Started" />
                        </div>
                        <div className="text-[10px] text-white/50 font-mono">Cellular Respiration Block</div>
                    </div>

                    {/* Panel 2 - PYQ Matrix */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">PYQ Frequency</h4>
                        <div className="flex items-end gap-2 h-16 mt-auto border-b border-white/10 pb-1">
                            <div className="w-full bg-rose-500 rounded-t-sm h-full" title="Krebs Cycle (5x)" />
                            <div className="w-full bg-rose-500 rounded-t-sm h-[80%]" title="Glycolysis (4x)" />
                            <div className="w-full bg-amber-500 rounded-t-sm h-[40%]" title="ETC (2x)" />
                            <div className="w-full bg-emerald-500 rounded-t-sm h-[20%]" title="ATP Yield (1x)" />
                        </div>
                        <div className="text-[10px] text-white/50 font-mono mt-2">Top repeated topics</div>
                    </div>

                    {/* Panel 3 - Prophecy Engine */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 overflow-hidden">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" /> Exam Prophecy
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg border border-rose-500/20">
                                <span className="text-xs font-medium">Krebs Cycle</span>
                                <span className="text-[10px] font-mono font-bold text-rose-400">94%</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <span className="text-xs font-medium">ATP Synthase</span>
                                <span className="text-[10px] font-mono font-bold text-amber-400">71%</span>
                            </div>
                        </div>
                    </div>

                    {/* Panel 4 - History */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 hidden md:block">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Recent Sessions</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="text-white/80">Biology · MCQ Test</span>
                                </div>
                                <span className="font-mono text-white/50">84%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="text-white/80">Physics · Flashcards</span>
                                </div>
                                <span className="font-mono text-white/50">45m</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
