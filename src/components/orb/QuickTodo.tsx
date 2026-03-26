/**
 * QuickTodo.tsx
 * Orb Tool 2 — natural language task input with AI parse preview.
 * Writes tasks to users/{uid}/tasks in Firestore.
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Loader2, CheckCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthContext";
import { parseTaskInput, ParsedTask } from "../../services/orbAI";
import { VaultFolder } from "../../services/vaultTypes";

interface QuickTodoProps {
    onClose: () => void;
    folders: VaultFolder[];
}

const PRIORITY_COLORS: Record<string, string> = {
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#10B981",
};

const PRIORITY_DOTS: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
};

export function QuickTodo({ onClose, folders }: QuickTodoProps) {
    const { user } = useAuth();
    const [input, setInput] = useState("");
    const [parsed, setParsed] = useState<ParsedTask | null>(null);
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);

    const handleInput = (val: string) => {
        setInput(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!val.trim()) { setParsed(null); return; }
        setParsing(true);
        debounceRef.current = setTimeout(async () => {
            const result = await parseTaskInput(val);
            setParsed(result);
            setParsing(false);
        }, 500);
    };

    const handleSave = useCallback(async (usePlainText = false) => {
        if (!input.trim() || !user) return;
        setSaving(true);
        const data = usePlainText || !parsed
            ? {
                title: input.trim(),
                subject: null,
                status: "Backlog",
                priority: "medium",
                dueDate: null,
                estimatedDuration: 45,
                mode: "scholar",
                kanbanOrder: 0,
                createdFrom: "quickTodo",
                createdAt: serverTimestamp(),
            }
            : {
                title: parsed.title,
                subject: parsed.subject,
                status: "Backlog",
                priority: parsed.priority,
                dueDate: parsed.dueDate ?? null,
                estimatedDuration: parsed.estimatedMinutes,
                mode: parsed.mode,
                kanbanOrder: 0,
                createdFrom: "quickTodo",
                createdAt: serverTimestamp(),
            };

        try {
            await addDoc(collection(db, `users/${user.uid}/tasks`), data);
            setToast(`✅ Added to Backlog — ${(data as any).title}`);
            setTimeout(() => { setToast(null); onClose(); }, 2000);
        } catch (err) {
            console.error("QuickTodo save error:", err);
        } finally {
            setSaving(false);
        }
    }, [input, parsed, user, onClose]);

    const isLowConfidence = (val: number) => val < 0.5;

    return (
        <>
            <div className="fixed inset-0 z-[100]" onClick={onClose} />

            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 38 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 z-[110] rounded-t-3xl overflow-hidden
                   lg:bottom-24 lg:right-8 lg:left-auto lg:rounded-3xl lg:w-96"
                style={{
                    background: "rgba(6,8,16,0.97)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-white text-base">
                        ✅ Quick To-Do
                    </span>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Input */}
                <div className="px-5 pb-4">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => handleInput(e.target.value)}
                        placeholder="e.g. Revise Krebs Cycle by Thursday, 1 hour"
                        className="w-full bg-transparent text-white outline-none border-b pb-2"
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "14px",
                            borderColor: "rgba(255,255,255,0.12)",
                            caretColor: "#F59E0B",
                        }}
                    />
                </div>

                {/* Parse Preview */}
                <AnimatePresence>
                    {(parsing || parsed) && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mx-5 mb-4 p-3 rounded-2xl"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                            {parsing ? (
                                <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Parsing…
                                </div>
                            ) : parsed ? (
                                <div className="flex flex-wrap gap-2">
                                    {/* Subject */}
                                    <Chip
                                        label={parsed.subject ?? "General"}
                                        color={parsed.subject ? "#818cf8" : "#6b7280"}
                                        lowConf={isLowConfidence(parsed.confidence.subject)}
                                    />
                                    {/* Due Date */}
                                    <Chip
                                        label={parsed.dueDate ?? "No deadline"}
                                        color={parsed.dueDate ? "#F59E0B" : "#6b7280"}
                                        lowConf={isLowConfidence(parsed.confidence.dueDate)}
                                    />
                                    {/* Priority */}
                                    <Chip
                                        label={`${PRIORITY_DOTS[parsed.priority]} ${parsed.priority}`}
                                        color={PRIORITY_COLORS[parsed.priority]}
                                    />
                                    {/* Duration */}
                                    <Chip
                                        label={`${parsed.estimatedMinutes}min`}
                                        color="#10D9A0"
                                        lowConf={isLowConfidence(parsed.confidence.estimatedMinutes)}
                                    />
                                    {/* Mode */}
                                    <Chip
                                        label={parsed.mode === "sniper" ? "⚡ Sniper" : "🎓 Scholar"}
                                        color={parsed.mode === "sniper" ? "#EF4444" : "#818cf8"}
                                    />
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actions */}
                <div className="px-5 pb-6 flex flex-col gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving || !input.trim()}
                        className="w-full h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Add to Kanban
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        className="text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1 font-mono"
                    >
                        Save as plain text
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ y: 32, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 32, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2"
                        style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", backdropFilter: "blur(12px)" }}
                    >
                        <CheckCircle className="w-4 h-4 text-amber-400" />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function Chip({ label, color, lowConf }: { label: string; color: string; lowConf?: boolean }) {
    return (
        <span
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium flex items-center gap-1"
            style={{
                background: color + "18",
                border: `1px solid ${color}40`,
                color: lowConf ? "#F59E0B" : color,
            }}
        >
            {lowConf && <span className="text-amber-400">?</span>}
            {label}
        </span>
    );
}
