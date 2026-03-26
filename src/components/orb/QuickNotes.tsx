/**
 * QuickNotes.tsx
 * Orb Tool 1 — fast note capture, saves to Vault as Intel item.
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Inbox, Sparkles, CheckCircle } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { createVaultItem } from "../../services/vaultService";
import { VaultFolder } from "../../services/vaultTypes";

interface QuickNotesProps {
    onClose: () => void;
    folders: VaultFolder[];
    savedText?: string;
    onTextChange: (text: string) => void;
}

export function QuickNotes({ onClose, folders, savedText = "", onTextChange }: QuickNotesProps) {
    const { user } = useAuth();
    const [text, setText] = useState(savedText);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
        folders[0]?.id ?? null
    );
    const [toast, setToast] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setTimeout(() => textareaRef.current?.focus(), 80);
    }, []);

    const handleChange = (val: string) => {
        setText(val);
        onTextChange(val);
    };

    const handleSave = useCallback(async () => {
        if (!text.trim()) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
            return;
        }
        if (!user || !selectedFolderId) return;
        setSaving(true);
        try {
            const folder = folders.find((f) => f.id === selectedFolderId);
            const itemId = await createVaultItem(user.uid, selectedFolderId, {
                type: "chat",
                subtype: "note",
                title: text.slice(0, 40) + (text.length > 40 ? "…" : ""),
                content: text,
                ghostSuppressed: false,
                isPinned: false,
                chunkCount: 0,
                crossReferenceCount: 0,
                indexedAt: null,
                storageRef: null,
                missionId: null,
                createdBy: user.uid,
                subjectName: folder?.name ?? "Unknown",
            });
            onTextChange("");
            setToast(`📥 Saved to ${folder?.name ?? "Vault"} Intel`);
            setTimeout(() => { setToast(null); onClose(); }, 1800);
        } catch (err) {
            console.error("QuickNotes save error:", err);
            setToast("❌ Failed to save. Try again.");
            setTimeout(() => setToast(null), 2000);
        } finally {
            setSaving(false);
        }
    }, [text, user, selectedFolderId, folders, onClose, onTextChange]);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100]"
                onClick={onClose}
            />

            {/* Sheet */}
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
                    maxHeight: "60dvh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }} className="text-white text-base">
                        📝 Quick Note
                    </span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Textarea */}
                <div className="flex-1 overflow-hidden px-5">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => handleChange(e.target.value)}
                        maxLength={5000}
                        placeholder="Write anything..."
                        className="w-full h-full resize-none bg-transparent text-white outline-none leading-relaxed"
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "14px",
                            color: "white",
                            caretColor: "#10D9A0",
                            borderBottom: shake ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,0.06)",
                            transition: "border-color 0.2s",
                            minHeight: "120px",
                            paddingBottom: "12px",
                        }}
                    />
                </div>

                {/* Subject Picker */}
                {folders.length > 0 && (
                    <div className="flex-shrink-0 px-5 py-3 border-t border-white/5">
                        <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest mb-2">Save to</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {folders.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setSelectedFolderId(f.id)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                                    style={{
                                        background: selectedFolderId === f.id ? f.subjectColour + "33" : "rgba(255,255,255,0.05)",
                                        border: `1px solid ${selectedFolderId === f.id ? f.subjectColour : "transparent"}`,
                                        color: selectedFolderId === f.id ? f.subjectColour : "rgba(255,255,255,0.5)",
                                    }}
                                >
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.subjectColour }} />
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex-shrink-0 px-5 pb-6 pt-3 flex flex-col gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                    >
                        <Inbox className="w-4 h-4" />
                        {saving ? "Saving…" : "Send to Vault"}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full h-11 rounded-2xl text-sm font-bold text-white/60 border border-white/10 flex items-center justify-center gap-2 hover:border-white/20 hover:text-white transition-all"
                    >
                        <Sparkles className="w-4 h-4" />
                        Ask AI
                    </button>
                </div>
            </motion.div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ y: 32, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 32, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2"
                        style={{ background: "rgba(16,217,160,0.15)", border: "1px solid rgba(16,217,160,0.4)", backdropFilter: "blur(12px)" }}
                    >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
