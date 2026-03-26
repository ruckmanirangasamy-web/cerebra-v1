/**
 * MicroCodex.tsx
 * Orb Tool 5 — personal reference sheet. Reads/writes Vault Intel items.
 * Slides up from bottom. Full-screen overlay.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { X, Plus, Search, Book, Trash2, Edit2, RotateCcw, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { onSnapshot, collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { VaultFolder, VaultItem } from "../../services/vaultTypes";
import { CodexEntryType } from "../../services/orbAI";

const CATEGORIES: CodexEntryType[] = [
    "Formula", "Mnemonic", "Date", "Dosage", "Definition", "Code", "Note", "Other",
];

const CATEGORY_META: Record<CodexEntryType, { icon: string; color: string }> = {
    Formula: { icon: "Σ", color: "#10D9A0" },
    Mnemonic: { icon: "🧠", color: "#A78BFA" },
    Date: { icon: "📅", color: "#F59E0B" },
    Dosage: { icon: "💊", color: "#EF4444" },
    Definition: { icon: "D", color: "#60A5FA" },
    Code: { icon: "<>", color: "#34D399" },
    Note: { icon: "📝", color: "#ffffff" },
    Other: { icon: "✦", color: "#6b7280" },
};

interface MicroCodexProps {
    onClose: () => void;
    folders: VaultFolder[];
}

interface CodexEntry extends Omit<VaultItem, 'subtype'> {
    subtype: CodexEntryType;
    folderId: string;
}

export function MicroCodex({ onClose, folders }: MicroCodexProps) {
    const { user } = useAuth();
    const [entries, setEntries] = useState<CodexEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<CodexEntryType | "All">("All");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Review mode
    const [reviewMode, setReviewMode] = useState(false);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [knownIds, setKnownIds] = useState<Set<string>>(new Set());

    // Add form state
    const [newContent, setNewContent] = useState("");
    const [newType, setNewType] = useState<CodexEntryType>("Note");
    const [newFolderId, setNewFolderId] = useState<string>(folders[0]?.id ?? "");
    const addContentRef = useRef<HTMLTextAreaElement>(null);

    // Subscribe to intel items from all folders
    useEffect(() => {
        if (!user || folders.length === 0) { setLoading(false); return; }
        const unsubs: (() => void)[] = [];
        const allEntries: Record<string, CodexEntry> = {};

        folders.forEach((folder) => {
            const q = query(
                collection(db, `users/${user.uid}/vaults/${folder.id}/items`),
                orderBy("createdAt", "desc")
            );
            const unsub = onSnapshot(q, (snap) => {
                snap.forEach((d) => {
                    const data = d.data() as VaultItem;
                    if (data.type === "intel") {
                        allEntries[d.id] = { ...data, id: d.id, folderId: folder.id, subtype: (data.subtype as CodexEntryType) ?? "Note" };
                    } else {
                        delete allEntries[d.id];
                    }
                });
                setEntries(Object.values(allEntries).sort((a, b) => {
                    const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
                    const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
                    return tb - ta;
                }));
                setLoading(false);
            });
            unsubs.push(unsub);
        });
        return () => unsubs.forEach((u) => u());
    }, [user, folders]);

    const filtered = entries.filter((e) => {
        const matchType = filter === "All" || e.subtype === filter;
        const matchSearch = !search || (typeof e.content === "string" && e.content.toLowerCase().includes(search.toLowerCase())) || e.title?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    const handleAddEntry = useCallback(async () => {
        if (!newContent.trim() || !user || !newFolderId) return;
        const folder = folders.find((f) => f.id === newFolderId);
        await addDoc(collection(db, `users/${user.uid}/vaults/${newFolderId}/items`), {
            type: "intel",
            subtype: newType.toLowerCase() as VaultItem['subtype'],
            title: newContent.slice(0, 40),
            content: newContent,
            ghostSuppressed: false,
            isPinned: false,
            chunkCount: 0,
            crossReferenceCount: 0,
            indexedAt: null,
            storageRef: null,
            missionId: null,
            createdBy: user.uid,
            subjectName: folder?.name ?? "Unknown",
            createdAt: serverTimestamp(),
            lastEditedAt: serverTimestamp(),
        });
        setNewContent("");
        setShowAddForm(false);
    }, [newContent, newType, newFolderId, user, folders]);

    const handleDelete = useCallback(async (entry: CodexEntry) => {
        if (!user) return;
        await deleteDoc(doc(db, `users/${user.uid}/vaults/${entry.folderId}/items/${entry.id}`));
    }, [user]);

    // Review mode helpers
    const reviewEntries = filtered;
    const reviewEntry = reviewEntries[reviewIndex];

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-0 z-[110] flex flex-col"
            style={{ background: "#060810" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                    <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold font-mono uppercase text-sm tracking-widest">📌 MICRO-CODEX</span>
                    <span className="text-white/30 font-mono text-xs">{entries.length} entries</span>
                </div>
                <button
                    onClick={() => { setShowAddForm(!showAddForm); setTimeout(() => addContentRef.current?.focus(), 80); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {!reviewMode ? (
                <>
                    {/* Filter + Search */}
                    <div className="flex-shrink-0 px-5 py-3 border-b border-white/5 space-y-2">
                        {/* Category chips */}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {(["All", ...CATEGORIES] as (CodexEntryType | "All")[]).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all"
                                    style={{
                                        background: filter === cat ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                                        color: filter === cat ? "white" : "rgba(255,255,255,0.35)",
                                        border: filter === cat ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                                    }}
                                >
                                    {cat === "All" ? "All" : `${CATEGORY_META[cat].icon} ${cat}`}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search your Codex..."
                                className="flex-1 bg-transparent text-white text-sm outline-none"
                                style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
                            />
                        </div>
                    </div>

                    {/* Entry List */}
                    <LayoutGroup>
                        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                            {/* Add form */}
                            <AnimatePresence>
                                {showAddForm && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 rounded-2xl mb-2 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                            {/* Type selector */}
                                            <div className="flex gap-1.5 flex-wrap">
                                                {CATEGORIES.map((c) => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setNewType(c)}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all"
                                                        style={{
                                                            background: newType === c ? CATEGORY_META[c].color + "25" : "rgba(255,255,255,0.04)",
                                                            color: newType === c ? CATEGORY_META[c].color : "rgba(255,255,255,0.3)",
                                                            border: newType === c ? `1px solid ${CATEGORY_META[c].color}50` : "1px solid transparent",
                                                        }}
                                                    >
                                                        {CATEGORY_META[c].icon} {c}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                ref={addContentRef}
                                                value={newContent}
                                                onChange={(e) => setNewContent(e.target.value)}
                                                placeholder="Write your formula, mnemonic, note..."
                                                rows={3}
                                                className="w-full bg-transparent text-white text-sm outline-none resize-none"
                                                style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
                                            />
                                            {/* Subject picker */}
                                            <div className="flex gap-2 overflow-x-auto">
                                                {folders.map((f) => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => setNewFolderId(f.id)}
                                                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all"
                                                        style={{
                                                            background: newFolderId === f.id ? f.subjectColour + "25" : "rgba(255,255,255,0.04)",
                                                            color: newFolderId === f.id ? f.subjectColour : "rgba(255,255,255,0.3)",
                                                            border: newFolderId === f.id ? `1px solid ${f.subjectColour}50` : "1px solid transparent",
                                                        }}
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.subjectColour }} />
                                                        {f.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleAddEntry}
                                                    disabled={!newContent.trim()}
                                                    className="flex-1 h-9 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                                                    style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                                                >
                                                    ✓ Save Entry
                                                </button>
                                                <button
                                                    onClick={() => { setShowAddForm(false); setNewContent(""); }}
                                                    className="flex-1 h-9 rounded-xl text-xs font-bold text-white/50 border border-white/10 hover:text-white transition-all"
                                                >
                                                    × Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Loading */}
                            {loading && (
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                                    ))}
                                </div>
                            )}

                            {/* Empty state */}
                            {!loading && filtered.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                                    <span className="text-4xl">📌</span>
                                    <p className="text-white/30 text-sm font-mono">
                                        {search || filter !== "All"
                                            ? `No ${filter !== "All" ? filter : ""} entries found.`
                                            : "Your Codex is empty. Tap + to add your first entry."}
                                    </p>
                                </div>
                            )}

                            {/* Entries */}
                            {!loading && filtered.map((entry) => {
                                const meta = CATEGORY_META[entry.subtype] ?? CATEGORY_META.Note;
                                const isExpanded = expandedId === entry.id;
                                return (
                                    <motion.div
                                        key={entry.id}
                                        layout
                                        className="rounded-2xl overflow-hidden cursor-pointer"
                                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                    >
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <span className="flex-shrink-0 text-sm" style={{ color: meta.color, fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: 20 }}>
                                                {meta.icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm truncate" style={{ fontFamily: "var(--font-mono)" }}>
                                                    {typeof entry.content === "string" ? entry.content : entry.title}
                                                </p>
                                            </div>
                                            {/* Subject dot */}
                                            {(() => {
                                                const folder = folders.find((f) => f.id === entry.folderId);
                                                return folder ? (
                                                    <span
                                                        className="flex-shrink-0 w-2 h-2 rounded-full"
                                                        title={folder.name}
                                                        style={{ background: folder.subjectColour }}
                                                    />
                                                ) : null;
                                            })()}
                                        </div>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="px-4 pb-4 pt-0 space-y-3"
                                            >
                                                <p className="text-white/80 text-sm leading-relaxed" style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                                                    {typeof entry.content === "string" ? entry.content : JSON.stringify(entry.content, null, 2)}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all font-mono"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Delete
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </LayoutGroup>

                    {/* Review Mode button */}
                    {filtered.length > 0 && (
                        <div className="flex-shrink-0 px-5 pb-8 pt-4 border-t border-white/5">
                            <button
                                onClick={() => { setReviewMode(true); setReviewIndex(0); setFlipped(false); setKnownIds(new Set()); }}
                                className="w-full h-11 rounded-2xl text-sm font-bold text-white border border-white/10 flex items-center justify-center gap-2 hover:border-white/20 transition-all"
                            >
                                <Book className="w-4 h-4" /> Review Mode ({filtered.length} cards)
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* Review Mode */
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    {reviewIndex < reviewEntries.length && reviewEntry ? (
                        <>
                            <p className="text-white/30 text-xs font-mono mb-6">
                                {reviewIndex + 1} / {reviewEntries.length} · {knownIds.size} known
                            </p>
                            <div
                                className="flip-card w-full max-w-sm cursor-pointer"
                                style={{ perspective: 800 }}
                                onClick={() => setFlipped(!flipped)}
                            >
                                <motion.div
                                    className="flip-card-inner relative w-full"
                                    style={{ transformStyle: "preserve-3d" }}
                                    animate={{ rotateY: flipped ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Front */}
                                    <div
                                        className="flip-card-front w-full aspect-square rounded-3xl flex flex-col items-center justify-center p-8 gap-4"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backfaceVisibility: "hidden" }}
                                    >
                                        <span className="text-3xl">{CATEGORY_META[reviewEntry.subtype]?.icon ?? "📝"}</span>
                                        <p className="text-white/40 font-mono text-xs uppercase tracking-widest">{reviewEntry.subtype}</p>
                                        <p className="text-white/30 text-xs font-mono">Tap to reveal</p>
                                    </div>
                                    {/* Back */}
                                    <div
                                        className="flip-card-back absolute inset-0 w-full aspect-square rounded-3xl flex flex-col items-center justify-center p-8"
                                        style={{ background: "rgba(16,217,160,0.06)", border: "1px solid rgba(16,217,160,0.15)", backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                    >
                                        <p className="text-white text-base leading-relaxed text-center" style={{ fontFamily: "var(--font-mono)" }}>
                                            {typeof reviewEntry.content === "string" ? reviewEntry.content : reviewEntry.title}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>

                            {flipped && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 mt-8"
                                >
                                    <button
                                        onClick={() => { setKnownIds(new Set([...knownIds])); setReviewIndex(reviewIndex + 1); setFlipped(false); }}
                                        className="flex-1 h-12 rounded-2xl text-sm font-bold text-white border border-white/10 flex items-center justify-center gap-2 px-6 hover:border-white/20 transition-all"
                                    >
                                        <RotateCcw className="w-4 h-4 text-amber-400" /> Review Again
                                    </button>
                                    <button
                                        onClick={() => {
                                            const next = new Set([...knownIds, reviewEntry.id]);
                                            setKnownIds(next);
                                            setReviewIndex(reviewIndex + 1);
                                            setFlipped(false);
                                        }}
                                        className="flex-1 h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 px-6"
                                        style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Known
                                    </button>
                                </motion.div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <span className="text-5xl">🎉</span>
                            <p className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display)" }}>
                                {knownIds.size}/{reviewEntries.length} Known
                            </p>
                            <p className="text-white/40 text-sm font-mono">
                                {reviewEntries.length - knownIds.size} to review again
                            </p>
                            <button
                                onClick={() => setReviewMode(false)}
                                className="mt-4 px-6 py-3 rounded-2xl text-sm font-bold text-white border border-white/10 hover:border-white/20 transition-all"
                            >
                                Back to Codex
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
