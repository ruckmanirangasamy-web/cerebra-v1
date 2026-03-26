import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, Menu, Send, Clock, Loader2, BookOpen, History, BrainCircuit, Plus, Search, MessageSquare, ArrowLeft, MoreHorizontal, Paperclip, Globe, GraduationCap } from "lucide-react";
import { cn } from "../lib/utils";
import { useCommandDockService } from "../services/useCommandDockService";
import { VaultSelectionModal } from "./VaultSelectionModal";
import { VaultItem } from "../services/vaultTypes";
import ReactMarkdown from 'react-markdown';

// --- Animated Component from Skills ---
function AnimatedSwitch<T>({
    options, activeValue, onChange, layoutId = 'switch-indicator',
    className = '', activeColorClass = 'text-slate-900', inactiveColorClass = 'text-white/60'
}: {
    options: { value: T; label: string; icon?: React.ReactNode }[];
    activeValue: T;
    onChange: (value: T) => void;
    layoutId?: string;
    className?: string;
    activeColorClass?: string;
    inactiveColorClass?: string;
}) {
    return (
        <div className={`flex rounded-full p-1 relative bg-white/5 h-[32px] w-[240px] ${className}`}>
            {options.map(opt => (
                <button
                    key={String(opt.value)}
                    onClick={() => onChange(opt.value)}
                    className={`relative flex-1 flex items-center justify-center gap-2 px-2 py-1 rounded-full text-[11px] font-bold z-10 transition-colors
            ${activeValue === opt.value ? activeColorClass : inactiveColorClass}`}
                >
                    {opt.icon}
                    {opt.label}
                    {activeValue === opt.value && (
                        <motion.div
                            layoutId={layoutId}
                            className="absolute inset-0 bg-white rounded-full z-[-1]"
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}

export function CommandDock({ isMobile = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [persona, setPersona] = useState<"open_web" | "strict_tutor">("open_web");
    const [text, setText] = useState("");
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
    const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
    const [attachedDocs, setAttachedDocs] = useState<VaultItem[]>([]);

    const {
        messages,
        isTyping,
        sendMessage,
        conversations,
        activeConversationId,
        loadConversation,
        startNewChat,
        deleteConversation
    } = useCommandDockService();
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!text.trim() || isTyping) return;
        const currentText = text;
        setText("");

        // Construct context from attached docs
        const contextStr = attachedDocs.length > 0
            ? `Associated Documents:\n\n${attachedDocs.map(doc => `## ${doc.title}\n${doc.content}`).join('\n\n')}`
            : "";

        sendMessage(currentText, persona, contextStr);
        setAttachedDocs([]); // Clear after sending
    };

    const handleAttachFromVault = (item: VaultItem) => {
        setAttachedDocs(prev => [...prev, item]);
        setIsVaultModalOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                if (!isInput) {
                    e.preventDefault();
                    setIsOpen(prev => !prev);
                }
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleDragEnd = (event: any, info: any) => {
        if (info.offset.y > 150) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Trigger Pills */}
            {isMobile ? (
                <motion.button
                    layoutId="commandDock"
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "relative flex flex-shrink-0 items-center justify-center rounded-[22px]",
                        "bg-gradient-to-br from-[#10D9A0] to-[#7C3AED]",
                        "w-[120px] h-[44px] -mt-4 z-50 text-white outline-none",
                        "animate-pulse shadow-[0_0_12px_rgba(16,217,160,0.4)]"
                    )}
                >
                    <Sparkles className="w-4 h-4 text-white" />
                </motion.button>
            ) : (
                <motion.button
                    layoutId="commandDockDesktop"
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "flex items-center justify-between px-4 w-full h-[40px] rounded-[20px]",
                        "bg-white border border-gray-200 shadow-sm",
                        "hover:bg-gray-50 hover:border-gray-300 transition-all outline-none"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="font-sans text-[13px] font-medium text-gray-500">Ask AI...</span>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded shadow-sm bg-gray-50">⌘K</span>
                </motion.button>
            )}

            {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                                onClick={() => setIsOpen(false)}
                            />

                            <motion.div
                                layoutId={isMobile ? "commandDock" : "commandDockDesktop"}
                                drag={isMobile ? "y" : false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "relative z-[210] flex pointer-events-auto",
                                    "bg-[rgba(6,8,16,0.96)] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden",
                                    isMobile
                                        ? "w-full flex-col h-[92vh] rounded-t-[20px] border-b-0"
                                        : "w-full max-w-6xl h-[85vh] max-h-[85vh] rounded-[24px]"
                                )}
                            >
                                {!isMobile && isSidebarOpen && (
                                    <div className="w-[280px] flex-none border-r border-white/10 flex flex-col bg-white/[0.02]">
                                        <div className="h-14 flex items-center px-4 border-b border-white/10">
                                            <button
                                                onClick={startNewChat}
                                                className="flex-1 flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white transition-colors rounded-lg px-3 py-1.5 text-sm font-medium"
                                            >
                                                <Plus className="w-4 h-4" /> New Chat
                                            </button>
                                        </div>
                                        <div className="p-3 border-b border-white/10">
                                            <div className="relative">
                                                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    placeholder="Search history..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                            {conversations.length === 0 ? (
                                                <div className="text-center p-4 text-white/20 text-xs italic">No history yet</div>
                                            ) : (
                                                conversations.map(conv => (
                                                    <div key={conv.id} className="group relative">
                                                        <button
                                                            onClick={() => loadConversation(conv.id, conv.messages)}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors",
                                                                activeConversationId === conv.id
                                                                    ? "bg-emerald-500/10 text-emerald-100"
                                                                    : "hover:bg-white/5 text-white/70 hover:text-white"
                                                            )}
                                                        >
                                                            <MessageSquare className="w-4 h-4 shrink-0 text-white/40" />
                                                            <div className="flex-1 truncate text-xs font-medium">{conv.title}</div>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 flex flex-col min-w-0 relative">
                                    <div className="flex-none h-14 px-5 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                                        <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10">
                                            <X className="w-6 h-6" />
                                        </button>

                                        <AnimatedSwitch
                                            options={[
                                                { value: 'open_web', label: 'Open Web', icon: <Globe className="w-3.5 h-3.5" /> },
                                                { value: 'strict_tutor', label: 'Strict Tutor', icon: <GraduationCap className="w-3.5 h-3.5" /> }
                                            ]}
                                            activeValue={persona}
                                            onChange={(v) => setPersona(v as "open_web" | "strict_tutor")}
                                            layoutId="mainPersonaToggle"
                                        />

                                        <button
                                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                            className={cn(
                                                "transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                                                isSidebarOpen ? "bg-white/10 text-white border-white/10" : "text-white/50 border-transparent hover:bg-white/5"
                                            )}
                                        >
                                            <Clock className="w-4 h-4" />
                                            {!isMobile && <span className="text-xs font-semibold">History</span>}
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                                        {messages.length === 0 ? (
                                            <div className="flex-1 flex flex-col justify-end">
                                                <div className="mb-6 space-y-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10D9A0] to-[#7C3AED] flex items-center justify-center shadow-lg mb-6">
                                                        <Sparkles className="w-6 h-6 text-white" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white tracking-tight">How can I help you today?</h3>
                                                    <p className="text-sm text-white/50">Your neural study companion is ready.</p>
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-4">
                                                    {[
                                                        { prompt: "Explain the Krebs cycle simply" },
                                                        { prompt: "What are likely exam questions on Cardiology?" },
                                                        { prompt: "Quiz me on what I know so far" }
                                                    ].map((ex, i) => (
                                                        <div key={i} onClick={() => setText(ex.prompt)} className="min-w-[200px] p-4 bg-white/[0.03] rounded-2xl border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all">
                                                            <p className="text-sm font-medium text-white">{ex.prompt}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {messages.map((msg) => (
                                                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                                        <div className={cn("max-w-[85%] rounded-2xl px-5 py-4", msg.role === 'user' ? "bg-gradient-to-br from-[#10D9A0] to-[#7C3AED] text-white rounded-br-sm" : "bg-white/5 border border-white/10 text-white/90 rounded-bl-sm")}>
                                                            <div className="prose prose-invert prose-sm max-w-none">
                                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                            </div>
                                                            {msg.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-emerald-400 animate-pulse" />}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                                <div ref={chatEndRef} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-none p-4 border-t border-white/10 bg-[rgba(6,8,16,0.96)]">
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl p-1 flex items-end focus-within:border-emerald-500/50">
                                                <div className="relative">
                                                    <button onClick={() => setIsVaultModalOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 text-white/40">
                                                        <Paperclip className="w-4 h-4" />
                                                    </button>
                                                    {attachedDocs.length > 0 && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                                            {attachedDocs.length}
                                                        </div>
                                                    )}

                                                    {/* Vault Popover - Anchored here */}
                                                    <VaultSelectionModal
                                                        isOpen={isVaultModalOpen}
                                                        onClose={() => setIsVaultModalOpen(false)}
                                                        onSelect={handleAttachFromVault}
                                                    />
                                                </div>
                                                <textarea
                                                    value={text}
                                                    onChange={(e) => setText(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Ask Memree..."
                                                    className="flex-1 max-h-[88px] min-h-[22px] bg-transparent border-none outline-none text-white text-sm py-2 px-3 resize-none"
                                                    rows={1}
                                                    disabled={isTyping}
                                                />
                                                <button
                                                    onClick={handleSend}
                                                    disabled={!text.trim() || isTyping}
                                                    className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all", text.trim() && !isTyping ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30")}
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
