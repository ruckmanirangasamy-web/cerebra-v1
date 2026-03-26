/**
 * RadialOrb.tsx — main orb shell
 * Floating action button with 5 fan-out tool satellites.
 * Positioned at bottom-left via Layout.tsx (fixed, z-[150]).
 */
import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, PenTool, CheckSquare, Camera, Zap, BookMarked } from "lucide-react";
import { AnimatePresence as AP } from "motion/react";   // alias for clarity
import { useAuth } from "../../lib/AuthContext";
import { subscribeToVaultFolders } from "../../services/vaultService";
import { VaultFolder } from "../../services/vaultTypes";

import { OrbToolButton } from "./OrbToolButton";
import { QuickNotes } from "./QuickNotes";
import { QuickTodo } from "./QuickTodo";
import { VisionSolver } from "./VisionSolver";
import { PYQSniper } from "./PYQSniper";
import { MicroCodex } from "./MicroCodex";

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
    { id: "notes", label: "Quick Notes", icon: PenTool, accent: "#10D9A0", angleDeg: 190 },
    { id: "todo", label: "Quick To-Do", icon: CheckSquare, accent: "#F59E0B", angleDeg: 162 },
    { id: "vision", label: "Vision Solver", icon: Camera, accent: "#818CF8", angleDeg: 134 },
    { id: "sniper", label: "PYQ Sniper", icon: Zap, accent: "#EF4444", angleDeg: 106 },
    { id: "codex", label: "Micro-Codex", icon: BookMarked, accent: "#60A5FA", angleDeg: 78 },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];
type ToolOrNull = ToolId | null;

// ─── Component ────────────────────────────────────────────────────────────────

interface RadialOrbProps {
    /** Hide the orb (e.g. when full-screen overlay is active from another feature). */
    hidden?: boolean;
}

export function RadialOrb({ hidden = false }: RadialOrbProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<ToolOrNull>(null);
    const [folders, setFolders] = useState<VaultFolder[]>([]);
    const [foldersLoaded, setFoldersLoaded] = useState(false);
    // Persist Quick Notes text across opens
    const [notesText, setNotesText] = useState("");

    // Lazy-load vault folders only when the orb is first opened
    // This prevents a race condition with Learn.tsx's many simultaneous Firestore listeners
    useEffect(() => {
        if (!open || !user || foldersLoaded) return;
        setFoldersLoaded(true);
        const unsub = subscribeToVaultFolders(user.uid, setFolders);
        return unsub;
    }, [open, user, foldersLoaded]);

    const handleToolClick = useCallback((toolId: ToolId) => {
        setOpen(false);
        // Small delay so close animation plays before tool opens
        setTimeout(() => setActiveTool(toolId), 150);
    }, []);

    const closeAll = useCallback(() => {
        setOpen(false);
        setActiveTool(null);
    }, []);

    // Close fan when scrolling begins (prevent overlap with content)
    useEffect(() => {
        if (!open) return;
        const handler = () => setOpen(false);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, [open]);

    return (
        <>
            {/* ── Orb Anchor ────────────────────────────────────────────────── */}
            <motion.div
                className="fixed bottom-36 left-6 lg:bottom-16 lg:left-8 z-[150]"
                style={{ originX: 0.5, originY: 1 }}
                animate={hidden ? { y: 100, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* Dim overlay */}
                <AnimatePresence>
                    {open && (
                        <motion.div
                            key="orb-dim"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.45 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-[-1] pointer-events-auto"
                            onClick={() => setOpen(false)}
                        />
                    )}
                </AnimatePresence>

                {/* Fan-out tool buttons */}
                <AnimatePresence>
                    {open && TOOLS.map((tool, i) => (
                        <OrbToolButton
                            key={tool.id}
                            icon={tool.icon}
                            label={tool.label}
                            accentColor={tool.accent}
                            angleDeg={tool.angleDeg}
                            index={i}
                            delay={i * 0.04}
                            onClick={() => handleToolClick(tool.id)}
                        />
                    ))}
                </AnimatePresence>

                {/* Main Orb Button */}
                <motion.button
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.08 }}
                    onClick={() => setOpen((v) => !v)}
                    className="relative w-14 h-14 rounded-full flex items-center justify-center text-white z-[160] border border-white/20"
                    style={{
                        background: open
                            ? "#10D9A0"
                            : "linear-gradient(135deg, #10D9A0 0%, #7C3AED 100%)",
                        boxShadow: open
                            ? "0 0 28px rgba(16,217,160,0.6)"
                            : "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                    aria-label={open ? "Close orb menu" : "Open study tools"}
                >
                    {/* Ring rotate animation */}
                    {!open && (
                        <span
                            className="absolute inset-0 rounded-full border-2 border-transparent"
                            style={{
                                background: "linear-gradient(135deg, #10D9A0, #7C3AED) border-box",
                                WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                                WebkitMaskComposite: "destination-out",
                                animation: "orb-ring-rotate 3s linear infinite",
                                opacity: 0.7,
                            }}
                        />
                    )}
                    {/* Pulse ring */}
                    {!open && (
                        <span
                            className="absolute inset-0 rounded-full"
                            style={{
                                border: "2px solid rgba(16,217,160,0.4)",
                                animation: "orb-pulse 2.5s ease-out infinite",
                            }}
                        />
                    )}

                    {/* Icon */}
                    <AnimatePresence mode="wait">
                        {open ? (
                            <motion.span key="close" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.12 }}>
                                <X className="w-6 h-6" />
                            </motion.span>
                        ) : (
                            <motion.span key="open" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.12 }}>
                                <Sparkles className="w-6 h-6" />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </motion.div>

            {/* ── Active Tool Panels ─────────────────────────────────────────── */}
            <AnimatePresence>
                {activeTool === "notes" && (
                    <QuickNotes
                        key="quick-notes"
                        onClose={closeAll}
                        folders={folders}
                        savedText={notesText}
                        onTextChange={setNotesText}
                    />
                )}
                {activeTool === "todo" && (
                    <QuickTodo
                        key="quick-todo"
                        onClose={closeAll}
                        folders={folders}
                    />
                )}
                {activeTool === "vision" && (
                    <VisionSolver
                        key="vision-solver"
                        onClose={closeAll}
                        folders={folders}
                    />
                )}
                {activeTool === "sniper" && (
                    <PYQSniper
                        key="pyq-sniper"
                        onClose={closeAll}
                        folders={folders}
                    />
                )}
                {activeTool === "codex" && (
                    <MicroCodex
                        key="micro-codex"
                        onClose={closeAll}
                        folders={folders}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
