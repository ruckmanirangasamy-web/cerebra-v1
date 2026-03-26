import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, FileText, Share2, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { generateText } from "../../services/gemini";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaveAsNote: (text: string) => void;
    onSpawnGraphNode: (text: string) => void;
}

export default function VoiceCapture({ isOpen, onClose, onSaveAsNote, onSpawnGraphNode }: Props) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showRouting, setShowRouting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                setIsTranscribing(true);
                // Simulate transcription with Gemini text description
                const simulatedText = "The Krebs cycle, also known as the citric acid cycle, is a series of chemical reactions that occurs in the mitochondrial matrix. It produces NADH, FADH2, and GTP through oxidation of acetyl-CoA.";
                setTranscript(simulatedText);
                setIsTranscribing(false);
                setShowRouting(true);
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            drawWaveform(analyser);
        } catch {
            alert("Microphone access denied. Enable it in browser settings.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        cancelAnimationFrame(animFrameRef.current);
    };

    const drawWaveform = (analyser: AnalyserNode) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const bufLen = analyser.frequencyBinCount;
        const dataArr = new Uint8Array(bufLen);
        const draw = () => {
            animFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArr);
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#EF4444';
            ctx.beginPath();
            const sw = canvas.width / bufLen;
            for (let i = 0; i < bufLen; i++) {
                const v = dataArr[i] / 128.0;
                const y = (v * canvas.height) / 2;
                if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sw, y);
            }
            ctx.stroke();
        };
        draw();
    };

    const handleDiscard = () => { setTranscript(""); setShowRouting(false); };

    if (!isOpen) return null;

    return (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center gap-6 max-w-md w-full px-8">
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">Neural Voice Capture</h2>

                {/* Record Button */}
                <button onClick={isRecording ? stopRecording : startRecording}
                    className={cn("w-24 h-24 rounded-full flex items-center justify-center transition-all",
                        isRecording ? "bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.2)] animate-pulse" : "bg-white/10 border-2 border-white/30 hover:border-white/60"
                    )}>
                    {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                </button>
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                    {isRecording ? 'Recording... tap to stop' : isTranscribing ? 'Transcribing...' : 'Tap to record'}
                </p>

                {/* Waveform */}
                {isRecording && <canvas ref={canvasRef} width={300} height={60} className="rounded-lg" />}

                {/* Transcribing spinner */}
                {isTranscribing && <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />}

                {/* Transcript + Routing */}
                <AnimatePresence>
                    {showRouting && transcript && (
                        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full space-y-4">
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                <p className="text-xs text-white/70 leading-relaxed">{transcript}</p>
                            </div>
                            <div className="flex gap-2">
                                <motion.button initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                                    onClick={() => { onSaveAsNote(transcript); handleDiscard(); }}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
                                    <FileText className="w-4 h-4" /> Save as Note
                                </motion.button>
                                <motion.button initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                    onClick={() => { onSpawnGraphNode(transcript); handleDiscard(); }}
                                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors">
                                    <Share2 className="w-4 h-4" /> Graph Node
                                </motion.button>
                            </div>
                            <button onClick={handleDiscard} className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors">✗ Discard</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
