import React, { useState, useRef, useEffect } from "react";
import { X, Send, Globe, Thermometer } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { generateText } from "../../services/gemini";

interface Message { role: 'user' | 'assistant'; content: string; }
type TempMode = 'creative' | 'balanced' | 'precise';
const TEMP_MAP: Record<TempMode, { value: number; label: string; color: string }> = {
    creative: { value: 0.7, label: 'Creative', color: 'text-purple-500' },
    balanced: { value: 0.4, label: 'Balanced', color: 'text-blue-500' },
    precise: { value: 0.1, label: 'Precise', color: 'text-emerald-500' },
};

interface OpenIntelProps { isOpen: boolean; onClose: () => void; }

export default function OpenIntelPanel({ isOpen, onClose }: OpenIntelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [tempMode, setTempMode] = useState<TempMode>('balanced');
    const [webSearch, setWebSearch] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const q = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setIsLoading(true);
        const sys = `You are Open Intel — a general-purpose AI assistant. Mode: ${tempMode}. No source restrictions. ${webSearch ? 'Web search enabled — cite sources with URLs.' : ''} Answer clearly and helpfully.`;
        try {
            const res = await generateText(q, sys);
            setMessages(prev => [...prev, { role: 'assistant', content: res }]);
        } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Error. Try again.' }]); }
        setIsLoading(false);
    };

    if (!isOpen) return null;
    return (
        <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Open Intel</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setWebSearch(!webSearch)} className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all", webSearch ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-400')}>
                        🌐 {webSearch ? 'Web On' : 'Web Off'}
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
                </div>
            </div>
            {/* Temp selector */}
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                <Thermometer className="w-3 h-3 text-gray-400" />
                {(Object.keys(TEMP_MAP) as TempMode[]).map(t => (
                    <button key={t} onClick={() => setTempMode(t)} className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all", tempMode === t ? `${TEMP_MAP[t].color} bg-gray-100` : 'text-gray-300')}>
                        {TEMP_MAP[t].label}
                    </button>
                ))}
            </div>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 text-center px-8">
                        <Globe className="w-8 h-8 text-blue-400 mb-3" />
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Open Intel</p>
                        <p className="text-[10px] text-gray-400">General Gemini AI — no source lock</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: msg.role === 'user' ? 16 : -16 }} animate={{ opacity: 1, x: 0 }}
                        className={cn("max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap",
                            msg.role === 'user' ? "bg-blue-600 text-white ml-auto rounded-br-sm shadow-md" : "bg-gray-50 text-gray-700 border border-gray-100 rounded-bl-sm"
                        )}>
                        {msg.content}
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="flex gap-1 p-3 bg-gray-50 rounded-2xl rounded-bl-sm max-w-[60%] border border-gray-100">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                )}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white">
                <div className="relative">
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-10" />
                    <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
