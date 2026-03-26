import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, FileText, Search, ChevronRight, Plus, Upload, Loader2, StickyNote, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { subscribeToVaultFolders, subscribeToVaultItems, createVaultItem } from '../services/vaultService';
import { VaultFolder, VaultItem, VaultSubtype } from '../services/vaultTypes';
import { cn } from '../lib/utils';

interface VaultSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: VaultItem) => void;
}

export const VaultSelectionModal: React.FC<VaultSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { user } = useAuth();
    const [folders, setFolders] = useState<VaultFolder[]>([]);
    const [items, setItems] = useState<VaultItem[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Upload/Note State
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user || !isOpen) return;
        return subscribeToVaultFolders(user.uid, (data) => {
            setFolders(data);
            // Auto-select first folder if none selected
            if (data.length > 0 && !selectedFolderId) {
                setSelectedFolderId(data[0].id);
            }
        });
    }, [user, isOpen]);

    useEffect(() => {
        if (!user || !selectedFolderId || !isOpen) {
            setItems([]);
            return;
        }
        return subscribeToVaultItems(user.uid, selectedFolderId, 'intel', setItems);
    }, [user, selectedFolderId, isOpen]);

    const handleCreateQuickNote = async () => {
        if (!user || !selectedFolderId || !noteTitle.trim()) return;

        setIsUploading(true);
        try {
            const folder = folders.find(f => f.id === selectedFolderId);
            const newItem: Partial<VaultItem> = {
                title: noteTitle,
                content: noteContent || "Empty note",
                type: 'intel',
                subtype: 'note' as VaultSubtype,
                subjectName: folder?.name || "Unsorted",
                createdBy: user.uid,
                isPinned: false,
                ghostSuppressed: false,
                missionId: null
            };

            const docId = await createVaultItem(user.uid, selectedFolderId, newItem);
            const fullItem = { id: docId, ...newItem } as VaultItem;
            onSelect(fullItem);

            // Reset
            setNoteTitle("");
            setNoteContent("");
            setIsCreatingNote(false);
        } catch (err) {
            console.error("Error creating quick note:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !selectedFolderId) return;

        setIsUploading(true);
        try {
            const folder = folders.find(f => f.id === selectedFolderId);
            const newItem: Partial<VaultItem> = {
                title: file.name,
                content: `Uploaded file: ${file.name} (${Math.round(file.size / 1024)}KB). This document is now part of the ${folder?.name} vault.`,
                type: 'intel',
                subtype: 'other' as VaultSubtype,
                subjectName: folder?.name || "Unsorted",
                fileSize: file.size,
                createdBy: user.uid,
                isPinned: false,
                ghostSuppressed: false,
                missionId: null
            };

            const docId = await createVaultItem(user.uid, selectedFolderId, newItem);
            const fullItem = { id: docId, ...newItem } as VaultItem;
            onSelect(fullItem);
        } catch (err) {
            console.error("Error uploading file:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="absolute bottom-full left-0 mb-3 z-[300] w-[440px] max-w-[calc(100vw-40px)]">
                    <div className="fixed inset-0 z-[-1]" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="relative bg-[#0C0F19]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col h-[520px] pointer-events-auto"
                    >
                        {/* Persistent Header */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                            <h3 className="text-white text-sm font-bold flex items-center gap-2">
                                <Folder className="w-4 h-4 text-emerald-400" />
                                Vault Context
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload from Device"
                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsCreatingNote(true)}
                                    title="New Quick Note"
                                    className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <div className="w-px h-4 bg-white/10 mx-1" />
                                <button onClick={onClose} className="text-white/40 hover:text-white p-1 hover:bg-white/5 rounded-lg">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Folders List */}
                            <div className="w-[140px] border-r border-white/10 overflow-y-auto p-2 space-y-1 bg-black/40">
                                <div className="px-2 py-1 text-[9px] uppercase font-black text-white/20 tracking-[0.2em] mb-1">Vaults</div>
                                {folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => {
                                            setSelectedFolderId(folder.id);
                                            setIsCreatingNote(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-2.5 py-2.5 rounded-xl text-[12px] transition-all flex items-center justify-between group relative",
                                            selectedFolderId === folder.id
                                                ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20"
                                                : "text-white/40 hover:bg-white/5 hover:text-white border border-transparent"
                                        )}
                                    >
                                        <span className="truncate">{folder.name}</span>
                                        {selectedFolderId === folder.id && (
                                            <motion.div layoutId="activeFolder" className="absolute left-0 w-1 h-4 bg-emerald-400 rounded-r-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Items List Area */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {isCreatingNote ? (
                                    <div className="flex-1 flex flex-col p-5 bg-emerald-500/[0.03]">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                <Plus className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-white text-xs font-bold uppercase tracking-wider">New Quick Note</h4>
                                                <p className="text-[10px] text-white/30 italic">Adding to {folders.find(f => f.id === selectedFolderId)?.name}</p>
                                            </div>
                                        </div>

                                        <input
                                            autoFocus
                                            placeholder="Subject Title..."
                                            value={noteTitle}
                                            onChange={e => setNoteTitle(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium mb-3 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 transition-all"
                                        />
                                        <textarea
                                            placeholder="Write or paste content here..."
                                            value={noteContent}
                                            onChange={e => setNoteContent(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-xs resize-none placeholder:text-white/10 focus:outline-none focus:border-emerald-500/30 transition-all scrollbar-hide"
                                        />

                                        <div className="flex gap-2.5 mt-5">
                                            <button
                                                onClick={() => setIsCreatingNote(false)}
                                                className="flex-1 py-3 rounded-xl bg-white/5 text-white/40 text-[11px] font-bold uppercase hover:bg-white/10 transition-all"
                                            >
                                                Back
                                            </button>
                                            <button
                                                disabled={!noteTitle.trim() || isUploading}
                                                onClick={handleCreateQuickNote}
                                                className="flex-[2] py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(16,217,160,0.2)]"
                                            >
                                                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Sync to Chat"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-3 border-b border-white/10 bg-black/20">
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    placeholder="Search vault items..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-hide">
                                            {isUploading && (
                                                <div className="flex items-center gap-3 px-3 py-4 rounded-xl bg-white/5 border border-white/10 animate-pulse mb-2">
                                                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                                    <span className="text-xs text-emerald-400 font-medium tracking-tight">Syncing to Vault & Chat...</span>
                                                </div>
                                            )}

                                            {selectedFolderId && items.length === 0 && !searchQuery ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-5">
                                                    <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-inner">
                                                        <Plus className="w-8 h-8 text-white/5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white/90 font-bold text-sm tracking-tight">Empty Folder</p>
                                                        <p className="text-white/30 text-[11px] mt-1 line-clamp-2 max-w-[180px] mx-auto">Upload documents to provide AI with relevant context</p>
                                                    </div>
                                                    <div className="flex flex-col w-full gap-2 pt-2">
                                                        <button
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase hover:bg-emerald-500/20 flex items-center justify-center gap-2.5 transition-all group"
                                                        >
                                                            <Monitor className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                            Upload from Computer
                                                        </button>
                                                        <button
                                                            onClick={() => setIsCreatingNote(true)}
                                                            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[11px] font-black uppercase hover:bg-white/10 flex items-center justify-center gap-2.5 transition-all"
                                                        >
                                                            <StickyNote className="w-4 h-4" /> New Quick Note
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : !selectedFolderId ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                                    <Folder className="w-10 h-10 text-white/5 mb-3" />
                                                    <p className="text-white/20 text-[12px] italic tracking-wide">Select a vault folder</p>
                                                </div>
                                            ) : filteredItems.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                                    <Search className="w-8 h-8 text-white/5 mb-2" />
                                                    <p className="text-white/20 text-[11px]">No items found</p>
                                                </div>
                                            ) : (
                                                filteredItems.map(item => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => onSelect(item)}
                                                        className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all flex items-center gap-3 border border-transparent hover:border-white/10 group active:scale-[0.98]"
                                                    >
                                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                                            <FileText className="w-4 h-4 text-emerald-400" />
                                                        </div>
                                                        <div className="flex-1 truncate">
                                                            <p className="text-[13px] font-semibold truncate tracking-tight">{item.title}</p>
                                                            <p className="text-[9px] text-white/20 truncate uppercase tracking-widest font-bold mt-0.5">{(item.subtype as string) || 'document'}</p>
                                                        </div>
                                                        <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-emerald-400/50 transition-colors" />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.docx,.txt,image/*"
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
