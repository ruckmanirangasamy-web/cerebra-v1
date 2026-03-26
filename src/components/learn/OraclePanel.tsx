import React, { useState, useRef, useEffect } from "react";
import { X, Send, Zap, BookOpen, History, Plus, Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { generateText } from "../../services/gemini";

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface OraclePanelProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'scholar' | 'sniper';
    subject: string;
    topic: string;
}

export default function OraclePanel({ isOpen, onClose, mode, subject, topic }: OraclePanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const systemPrompt = mode === 'sniper'
            ? `You are the Exam Oracle in Sniper mode for a student studying ${subject} — ${topic}. Answer in bullet points only. Maximum 150 words. Be ruthlessly brief. Include formulas if relevant. Every factual claim must be followed by a citation reference. No follow-up questions.`
            : `You are the Exam Oracle in Scholar mode for a student studying ${subject} — ${topic}. Give a full conceptual explanation. Use clear analogies. End with a Socratic follow-up question to deepen understanding. Maximum 400 words.`;

        try {
            const response = await generateText(userMsg, systemPrompt);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with Oracle. Please try again.' }]);
        }
        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Exam Oracle</span>
                    <div className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
                        mode === 'sniper' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    )}>
                        {mode === 'sniper' ? '⚡ Sniper' : '🎓 Scholar'}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <History className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Topic Bar */}
            {subject && (
                <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest truncate">{subject} · {topic}</span>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 text-center px-8">
                        <Zap className="w-8 h-8 text-emerald-400 mb-3" />
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Oracle Ready</p>
                        <p className="text-[10px] text-gray-400">Ask any question about {topic || 'your subject'}</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 16 : -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                            "max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap",
                            msg.role === 'user'
                                ? "bg-indigo-600 text-white ml-auto rounded-br-sm shadow-md"
                                : "bg-gray-50 text-gray-700 border border-gray-100 rounded-bl-sm"
                        )}
                    >
                        {msg.content}
                        {msg.role === 'assistant' && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                                <button className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">✨ Inject</button>
                                <span className="text-gray-200">·</span>
                                <button className="text-[9px] font-bold text-amber-500 hover:text-amber-700 uppercase tracking-widest">📌 Pin</button>
                                <span className="text-gray-200">·</span>
                                <button className="text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">📁 Save</button>
                            </div>
                        )}
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl rounded-bl-sm max-w-[60%] border border-gray-100">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white">
                <div className="relative">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={mode === 'sniper' ? 'Quick question...' : 'Ask the Oracle...'}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 pr-10"
                    />
                    <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
