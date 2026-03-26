/**
 * VisionSolver.tsx
 * Orb Tool 3 — full-screen camera/upload → Gemini Vision analysis.
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera, Upload, RefreshCw, Loader2, Zap, ClipboardList, BookMarked } from "lucide-react";
import { analyseImage } from "../../services/orbAI";
import { useAuth } from "../../lib/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { VaultFolder, VaultItem } from "../../services/vaultTypes";

interface VisionSolverProps {
    onClose: () => void;
    folders: VaultFolder[];
}

type Mode = "solve" | "scan";
type Stage = "capture" | "confirm" | "processing" | "result";

export function VisionSolver({ onClose, folders }: VisionSolverProps) {
    const { user } = useAuth();
    const [mode, setMode] = useState<Mode>("solve");
    const [stage, setStage] = useState<Stage>("capture");
    const [capturedImg, setCapturedImg] = useState<string | null>(null); // base64 jpeg
    const [result, setResult] = useState<string>("");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [flash, setFlash] = useState(false);

    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folders[0]?.id ?? null);
    const [saving, setSaving] = useState(false);
    const [savedPopup, setSavedPopup] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Start camera on mount
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch {
            setCameraError("Camera access denied. Use upload instead.");
        }
    }

    function stopCamera() {
        streamRef.current?.getTracks().forEach((t) => t.stop());
    }

    function captureFrame() {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        setCapturedImg(base64);
        setStage("confirm");
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
        stopCamera();
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data url prefix to get raw base64
            const base64 = (reader.result as string).split(",")[1];
            setCapturedImg(base64);
            setStage("confirm");
            stopCamera();
        };
        reader.readAsDataURL(file);
    }

    function handleRetake() {
        setCapturedImg(null);
        setStage("capture");
        startCamera();
    }

    const handleAnalyse = useCallback(async () => {
        if (!capturedImg) return;
        setStage("processing");
        try {
            const text = await analyseImage(capturedImg, mode);
            setResult(text);
            setStage("result");
        } catch {
            setResult("❌ Could not analyse the image. Please try again.");
            setStage("result");
        }
    }, [capturedImg, mode]);

    const handleSaveToVault = useCallback(async () => {
        if (!user || !selectedFolderId || !result) return;
        setSaving(true);
        try {
            const folder = folders.find((f) => f.id === selectedFolderId);
            await addDoc(collection(db, `users/${user.uid}/vaults/${selectedFolderId}/items`), {
                type: "intel",
                subtype: "other",
                title: (mode === "solve" ? "Solution: " : "Scan: ") + result.slice(0, 30) + "...",
                content: result,
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
            setSavedPopup(true);
            setTimeout(() => { setSavedPopup(false); }, 2000);
        } catch (err) {
            console.error("Save to vault failed", err);
        } finally {
            setSaving(false);
        }
    }, [user, selectedFolderId, result, folders, mode]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[115] flex flex-col"
            style={{ background: "#000000" }}
        >
            {/* Flash effect */}
            <AnimatePresence>
                {flash && (
                    <motion.div
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-white z-[200] pointer-events-none"
                    />
                )}
                {savedPopup && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-xl text-sm font-bold text-white shadow-xl flex items-center gap-2"
                        style={{ background: "rgba(16,217,160,0.2)", border: "1px solid rgba(16,217,160,0.5)", backdropFilter: "blur(12px)" }}
                    >
                        <Zap className="w-4 h-4 text-emerald-400" />
                        Saved to Vault Intel
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 z-10 flex-shrink-0"
                style={{ background: "rgba(0,0,0,0.6)" }}
            >
                <button onClick={onClose} className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium transition-colors">
                    <X className="w-4 h-4" /> Close
                </button>
                <span className="text-white text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    📷 Vision Solver
                </span>
                {/* Mode Toggle */}
                <div className="flex rounded-xl overflow-hidden border border-white/10">
                    {(["solve", "scan"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className="px-3 py-1.5 text-[11px] font-mono font-bold transition-all"
                            style={{
                                background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                                color: mode === m ? "white" : "rgba(255,255,255,0.4)",
                            }}
                        >
                            {m === "solve" ? "⚡ Solve" : "📋 Scan"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Stage: Capture */}
                {stage === "capture" && (
                    <>
                        {cameraError ? (
                            <div className="flex flex-col items-center justify-center h-full text-white gap-4 p-8">
                                <Camera className="w-16 h-16 opacity-30" />
                                <p className="text-center text-sm opacity-60">{cameraError}</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
                                    style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                                >
                                    Upload Image Instead
                                </button>
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        )}
                    </>
                )}

                {/* Stage: Confirm */}
                {stage === "confirm" && capturedImg && (
                    <img
                        src={`data:image/jpeg;base64,${capturedImg}`}
                        alt="Captured"
                        className="w-full h-full object-contain"
                    />
                )}

                {/* Stage: Processing */}
                {stage === "processing" && capturedImg && (
                    <div className="relative w-full h-full">
                        <img
                            src={`data:image/jpeg;base64,${capturedImg}`}
                            alt="Processing"
                            className="w-full h-full object-contain opacity-40 transition-opacity"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                            <p className="text-white text-sm font-mono">Analysing…</p>
                        </div>
                    </div>
                )}

                {/* Stage: Result */}
                {stage === "result" && (
                    <div className="h-full overflow-y-auto p-6">
                        <div className="flex items-start gap-3 mb-4">
                            {capturedImg && (
                                <img
                                    src={`data:image/jpeg;base64,${capturedImg}`}
                                    alt="Source"
                                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0 opacity-80"
                                />
                            )}
                        </div>
                        <pre
                            className="text-white text-sm leading-relaxed whitespace-pre-wrap"
                            style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
                        >
                            {result}
                        </pre>
                    </div>
                )}
            </div>

            {/* Hidden inputs */}
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileUpload} />

            {/* Bottom Action Bar */}
            <div className="flex-shrink-0 px-5 py-5 flex items-center justify-between gap-3"
                style={{ background: "rgba(0,0,0,0.6)" }}
            >
                {stage === "capture" && (
                    <>
                        {/* Upload */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 border border-white/15 hover:border-white/30 transition-all"
                        >
                            <Upload className="w-4 h-4" />
                        </button>

                        {/* Capture */}
                        <button
                            onClick={captureFrame}
                            disabled={!!cameraError}
                            className="w-18 h-18 rounded-full bg-white flex items-center justify-center shadow-xl disabled:opacity-30 transition-all mx-auto"
                            style={{ width: 72, height: 72 }}
                        >
                            <Camera className="w-8 h-8 text-black" />
                        </button>

                        <div className="w-10" /> {/* Spacer */}
                    </>
                )}

                {stage === "confirm" && (
                    <>
                        <button
                            onClick={handleRetake}
                            className="flex-1 h-11 rounded-2xl text-sm font-bold text-white border border-white/15 hover:border-white/30 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Retake
                        </button>
                        <button
                            onClick={handleAnalyse}
                            className="flex-1 h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                        >
                            {mode === "solve" ? <><Zap className="w-4 h-4" /> Solve</> : <><ClipboardList className="w-4 h-4" /> Scan</>}
                        </button>
                    </>
                )}

                {stage === "result" && (
                    <div className="flex flex-col w-full gap-3">
                        {folders.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 w-full justify-center">
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
                        )}
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleRetake}
                                className="flex-1 h-11 rounded-2xl text-sm font-bold text-white border border-white/15 hover:border-white/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Camera className="w-4 h-4" /> New {mode === "solve" ? "Solve" : "Scan"}
                            </button>
                            <button
                                onClick={handleSaveToVault}
                                disabled={saving}
                                className="flex-1 h-11 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #10D9A0, #059669)" }}
                            >
                                <BookMarked className="w-4 h-4" />
                                {saving ? "Saving..." : "Save Intel"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
