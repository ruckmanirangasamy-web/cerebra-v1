import React, { useState, useRef, useEffect } from "react";
import { X, Send, Zap, BookOpen, History, Plus, Star, Sparkles, MessageSquare, ShieldCheck, Library, Clock, Wand2, ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { generateText } from "../../services/gemini";
import { sniperAnswer } from "../../services/orbAI";
import { hybridRetrieve } from "../../services/rag/retrieval";
import { auth } from "../../lib/firebase";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    agentId?: string;
}

interface Agent {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    desc: string;
}

const AGENTS: Agent[] = [
    { id: 'dispatcher', name: 'Dispatcher', icon: <Sparkles className="w-4 h-4" />, color: 'text-indigo-500', desc: 'Routes your intent to the right specialist' },
    { id: 'editor', name: 'Editor', icon: <Wand2 className="w-4 h-4" />, color: 'text-purple-500', desc: 'Refines, structures and expands your notes' },
    { id: 'sniper', name: 'Sniper', icon: <Zap className="w-4 h-4" />, color: 'text-amber-500', desc: 'Facts and PYQ analysis with citations' },
    { id: 'exam_solver', name: 'Exam Solver', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-500', desc: 'Solve complex problems and evaluate answers' },
    { id: 'librarian', name: 'Librarian', icon: <Library className="w-4 h-4" />, color: 'text-blue-500', desc: 'Retrieve relevant info from your Vault' },
    { id: 'temporal', name: 'Temporal', icon: <Clock className="w-4 h-4" />, color: 'text-rose-500', desc: 'Time-aware context and deadline tracking' },
];

interface AgentWritingPanelProps {
    isOpen: boolean;
    onClose: () => void;
    subject: string;
    topic: string;
    editorContent?: string;
    onInsertText?: (text: string) => void;
    missionId?: string;
}

export default function AgentWritingPanel({ 
    isOpen, 
    onClose, 
    subject, 
    topic, 
    editorContent, 
    onInsertText,
    missionId 
}: AgentWritingPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0]);
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

        try {
            let response = "";
            const uid = auth.currentUser?.uid || 'guest';

            switch (activeAgent.id) {
                case 'sniper':
                    // Mock context for now, ideally would be RAG context
                    response = await sniperAnswer(userMsg, `Context for ${subject} - ${topic}. Factual data point: ${topic} is key for the upcoming exam.`);
                    break;
                case 'librarian':
                    const chunks = await hybridRetrieve(userMsg, [], uid, 3);
                    if (chunks.length === 0) {
                        response = "No relevant matches found in your Vault. Try adjusting your query.";
                    } else {
                        const context = chunks.map(c => c.text).join('\n\n');
                        response = await generateText(
                            `Based on these vault items:\n${context}\n\nQuestion: ${userMsg}`,
                            "You are the Librarian. Answer using ONLY provided context."
                        );
                    }
                    break;
                case 'editor':
                    response = await generateText(
                        `Context: "${editorContent || ''}"\nInput: ${userMsg}`,
                        "You are the Editor Agent. Help the student refine their notes. If they ask to reformat, provide the full markdown. Be helpful and professional."
                    );
                    break;
                case 'exam_solver':
                    response = await generateText(
                        `Solve this exam problem for ${subject}: ${userMsg}`,
                        "You are the Exam Solver. Provide step-by-step solutions with clear reasoning. Use LaTeX for math."
                    );
                    break;
                case 'temporal':
                    response = await generateText(
                        `Current Context: ${topic}. User query: ${userMsg}`,
                        "You are the Temporal Agent. Focus on timelines, deadlines, and the historical/time-based context of the study material."
                    );
                    break;
                default: // dispatcher
                    response = await generateText(
                        `The student is studying ${subject} - ${topic}. They said: "${userMsg}". 
                        Categorise this into one of: scholar, sniper, librarian, exam_solver, temporal. 
                        Then respond as that agent in character.`,
                        "You are the Dispatcher. You route intents and maintain context."
                    );
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response, agentId: activeAgent.id }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed. Please retry.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2">
                    {activeAgent.icon}
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">{activeAgent.name}</span>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Agent Switcher */}
            <div className="flex gap-1 p-2 bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
                {AGENTS.map(agent => (
                    <button
                        key={agent.id}
                        onClick={() => setActiveAgent(agent)}
                        className={cn(
                            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap",
                            activeAgent.id === agent.id 
                                ? "bg-gray-900 text-white" 
                                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        )}
                    >
                        {agent.icon}
                        {agent.name}
                    </button>
                ))}
            </div>

            {/* Topic Context */}
            <div className="px-4 py-2 bg-indigo-50/30 border-b border-indigo-100/50 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest truncate">{subject} · {topic}</span>
                </div>
                <span className="text-[9px] text-indigo-400 font-medium italic">Context Loaded</span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 text-center px-8">
                        <div className={cn("p-4 rounded-full bg-gray-50 mb-4", activeAgent.color)}>
                            {activeAgent.icon}
                        </div>
                        <p className="text-sm font-bold text-gray-600 mb-1">{activeAgent.name} Ready</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{activeAgent.desc}</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex flex-col gap-1.5 max-w-[92%]",
                            msg.role === 'user' ? "ml-auto" : "mr-auto"
                        )}
                    >
                        <div className={cn(
                            "p-3.5 rounded-2xl text-[12px] leading-relaxed",
                            msg.role === 'user'
                                ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-200/50 shadow-lg"
                                : "bg-white text-gray-700 border border-gray-100 rounded-bl-sm shadow-sm"
                        )}>
                            {msg.content}
                        </div>
                        {msg.role === 'assistant' && onInsertText && (
                            <button 
                                onClick={() => onInsertText(msg.content)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all self-start"
                            >
                                <ArrowLeft className="w-3 h-3" /> Insert into Editor
                            </button>
                        )}
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-2xl max-w-[140px] border border-gray-100">
                        <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Thinking</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <div className="relative group">
                    <textarea
                        rows={1}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        placeholder={`Message ${activeAgent.name}...`}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none min-h-[48px] max-h-[120px]"
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()} 
                        className="absolute right-2.5 bottom-2.5 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transform transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
                <p className="mt-2 text-[9px] text-gray-400 text-center font-medium">
                    Shift + Enter for new line · AI may hallucinate
                </p>
            </form>
        </motion.div>
    );
}
