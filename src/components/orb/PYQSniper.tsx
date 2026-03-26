/**
 * PYQSniper.tsx
 * Orb Tool 4 — PYQ source-locked answer with structured output.
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { X, Zap, Loader2, RefreshCw, Lock } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { sniperAnswer } from "../../services/orbAI";
import { VaultFolder } from "../../services/vaultTypes";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface PYQSniperProps {
    onClose: () => void;
    folders: VaultFolder[];
}

type Stage = "input" | "processing" | "result";

export function PYQSniper({ onClose, folders }: PYQSniperProps) {
    const { user } = useAuth();
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [stage, setStage] = useState<Stage>("input");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setTimeout(() => textareaRef.current?.focus(), 80);
    }, []);

    const handleSnipe = useCallback(async () => {
        if (!question.trim() || !user) return;
        setStage("processing");

        // Fetch vault items as context (simple keyword fetch for prototype)
        let context = "No source material uploaded yet.";
        try {
            const lines: string[] = [];
            for (const folder of folders.slice(0, 3)) {
                const snap = await getDocs(
                    collection(db, `users/${user.uid}/vaults/${folder.id}/items`)
                );
                snap.forEach((d) => {
                    const item = d.data();
                    if (typeof item.content === "string") {
                        lines.push(`[${folder.name}] ${item.title}: ${item.content.slice(0, 300)}`);
                    }
                });
            }
            if (lines.length > 0) context = lines.join("\n\n");
        } catch {
            // use default context
        }

        try {
            const raw = await sniperAnswer(question, context);
            setAnswer(raw);
            setStage("result");
        } catch {
            setAnswer("❌ Failed to retrieve answer. Check your connection and try again.");
            setStage("result");
        }
    }, [question, user, folders]);

    // Parse answer into sections
    const sections = parseAnswer(answer);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[110] flex flex-col"
            style={{ background: "#060810" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-white/5">
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                    <X className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white text-sm font-bold font-mono uppercase tracking-widest">🎯 PYQ SNIPER</span>
                    <span className="flex items-center gap-1 text-amber-400 text-[10px] font-mono mt-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Source Lock Always On
                    </span>
                </div>
                <div className="w-8" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {/* Question Input */}
                {stage !== "result" ? (
                    <div className="flex flex-col gap-2">
                        <label className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
                            Your exam question
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Paste or type your exam question here..."
                            disabled={stage === "processing"}
                            rows={6}
                            className="w-full bg-transparent text-white outline-none resize-none rounded-2xl p-4 text-sm leading-relaxed"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "14px",
                                background: stage === "processing" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                opacity: stage === "processing" ? 0.5 : 1,
                                caretColor: "#EF4444",
                                transition: "opacity 0.2s",
                            }}
                        />
                    </div>
                ) : (
                    /* Answer */
                    <div className="flex flex-col gap-4">
                        {/* ANSWER */}
                        {sections.answer && (
                            <div className="p-4 rounded-2xl" style={{ background: "rgba(16,217,160,0.08)", border: "1px solid rgba(16,217,160,0.2)" }}>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1">ANSWER</p>
                                <p className="text-white font-bold text-base leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                                    {sections.answer}
                                </p>
                            </div>
                        )}
                        {/* STEPS */}
                        {sections.steps && (
                            <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">STEPS</p>
                                <pre className="text-white text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "var(--font-sans)", fontSize: "14px" }}>
                                    {sections.steps}
                                </pre>
                            </div>
                        )}
                        {/* SOURCE */}
                        {sections.source && (
                            <div className="flex flex-wrap gap-2">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 w-full mb-1">SOURCE</p>
                                <span className="px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400" style={{ background: "rgba(16,217,160,0.1)", border: "1px solid rgba(16,217,160,0.2)" }}>
                                    {sections.source}
                                </span>
                            </div>
                        )}
                        {/* EXAM TIP */}
                        {sections.tip && (
                            <div className="p-4 rounded-2xl" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-purple-400 mb-1">EXAM TIP</p>
                                <p className="text-white/80 text-sm italic leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
                                    {sections.tip}
                                </p>
                            </div>
                        )}
                        {/* Fallback if no parsing */}
                        {!sections.answer && !sections.steps && (
                            <pre className="text-white text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
                                {answer}
                            </pre>
                        )}
                    </div>
                )}

                {/* Source Folders pill row */}
                {stage === "input" && folders.length > 0 && (
                    <div>
                        <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-2">Sources in use</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {folders.map((f) => (
                                <span key={f.id}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                                    style={{ background: f.subjectColour + "15", border: `1px solid ${f.subjectColour}40`, color: f.subjectColour, fontFamily: "var(--font-mono)" }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.subjectColour }} />
                                    {f.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action */}
            <div className="flex-shrink-0 px-5 pb-8 pt-4 border-t border-white/5">
                {stage === "input" && (
                    <button
                        onClick={handleSnipe}
                        disabled={!question.trim()}
                        className="w-full h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                        style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
                    >
                        <Zap className="w-4 h-4" /> Snipe Answer
                    </button>
                )}
                {stage === "processing" && (
                    <div className="w-full h-11 flex items-center justify-center gap-2 text-white/50">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-sm">Sniping…</span>
                    </div>
                )}
                {stage === "result" && (
                    <button
                        onClick={() => { setQuestion(""); setAnswer(""); setStage("input"); }}
                        className="w-full h-11 rounded-2xl text-sm font-bold text-white border border-white/10 flex items-center justify-center gap-2 hover:border-white/20 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" /> New Question
                    </button>
                )}
            </div>
        </motion.div>
    );
}

/** Parse structured answer text into sections */
function parseAnswer(text: string) {
    const get = (key: string) => {
        const re = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, "i");
        return text.match(re)?.[1]?.trim() ?? "";
    };
    return {
        answer: get("ANSWER"),
        steps: get("STEPS"),
        source: get("SOURCE"),
        tip: get("EXAM TIP"),
    };
}
