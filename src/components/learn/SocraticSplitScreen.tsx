import React, { useState, useRef } from "react";
import { X, Send, Zap, Upload, ChevronLeft, ChevronRight, Lock, Unlock, FileText } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { generateText } from "../../services/gemini";

interface Message { role: 'user' | 'assistant'; content: string; }

interface Props { isOpen: boolean; onClose: () => void; mode: 'scholar' | 'sniper'; subject: string; topic: string; }

export default function SocraticSplitScreen({ isOpen, onClose, mode, subject, topic }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50);
    const [hasDoc, setHasDoc] = useState(false);
    const [sourceLock, setSourceLock] = useState<'strict' | 'hybrid'>('strict');
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleDragStart = () => { isDragging.current = true; };
    const handleDrag = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const pct = (e.clientX / window.innerWidth) * 100;
        setLeftWidth(Math.max(25, Math.min(75, pct)));
    };
    const handleDragEnd = () => { isDragging.current = false; };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const q = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setIsLoading(true);
        const sys = `You are a Socratic AI tutor. Subject: ${subject}, Topic: ${topic}. Mode: ${mode}. Source lock: ${sourceLock}. Guide the student through deep understanding. Ask probing follow-up questions. If mode is 'sniper', keep answers concise.`;
        try {
            const res = await generateText(q, sys);
            setMessages(prev => [...prev, { role: 'assistant', content: res }]);
        } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }]); }
        setIsLoading(false);
        setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    };

    if (!isOpen) return null;

    return (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 bg-white z-50 flex flex-col" onMouseMove={handleDrag} onMouseUp={handleDragEnd}>
            {/* Header */}
            <header className="h-12 border-b border-gray-100 flex items-center justify-between px-4 shrink-0 bg-gray-50">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Socratic Split-Screen</span>
                    <button onClick={() => setSourceLock(s => s === 'strict' ? 'hybrid' : 'strict')} className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border", sourceLock === 'strict' ? 'border-amber-300 text-amber-600 bg-amber-50' : 'border-blue-300 text-blue-600 bg-blue-50')}>
                        {sourceLock === 'strict' ? <><Lock className="w-3 h-3 inline mr-1" />Strict</> : <><Unlock className="w-3 h-3 inline mr-1" />Hybrid</>}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-bold text-gray-500 truncate max-w-[160px]">{subject} · {topic}</span>
                </div>
            </header>

            {/* Split Panels */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left — Document Viewer */}
                <div style={{ width: `${leftWidth}%` }} className="h-full flex flex-col border-r border-gray-200">
                    {hasDoc ? (
                        <div className="flex-1 p-8 overflow-y-auto bg-white">
                            <div className="text-xs text-gray-400 text-center">Document content would render here</div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-12">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8 text-indigo-300" />
                            </div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Upload a Document</p>
                            <p className="text-[10px] text-gray-400 text-center max-w-[200px] mb-4">Drag a PDF, DOCX, or paste text to anchor your study session</p>
                            <label className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors">
                                Browse Files
                                <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={() => setHasDoc(true)} />
                            </label>
                        </div>
                    )}
                </div>

                {/* Resize Handle */}
                <div className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors flex items-center justify-center"
                    onMouseDown={handleDragStart}>
                    <div className="flex flex-col gap-0.5">
                        <div className="w-0.5 h-3 bg-gray-400 rounded-full" />
                    </div>
                </div>

                {/* Right — Oracle Chat */}
                <div style={{ width: `${100 - leftWidth}%` }} className="h-full flex flex-col">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 text-center px-8">
                                <Zap className="w-8 h-8 text-emerald-400 mb-3" />
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Oracle Ready</p>
                                <p className="text-[10px] text-gray-400">Ask questions about your uploaded document</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: msg.role === 'user' ? 16 : -16 }} animate={{ opacity: 1, x: 0 }}
                                className={cn("max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap",
                                    msg.role === 'user' ? "bg-indigo-600 text-white ml-auto rounded-br-sm shadow-md" : "bg-white text-gray-700 border border-gray-100 rounded-bl-sm shadow-sm"
                                )}>
                                {msg.content}
                            </motion.div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-1 p-3 bg-white rounded-2xl rounded-bl-sm max-w-[60%] border border-gray-100 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        )}
                    </div>
                    <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white">
                        <div className="relative">
                            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about the document..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10" />
                            <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </motion.div>
    );
}
