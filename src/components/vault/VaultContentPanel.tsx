import React, { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { VaultItemType, VaultItem } from "../../services/vaultTypes";
import { FileText, Image as ImageIcon, Video, File, FileArchive, Zap, FilePenLine, StickyNote, BookOpen, MessageCircle, Download, Pencil, Trash2, MoreHorizontal, Link2, FolderSearch } from 'lucide-react';

interface VaultContentPanelProps {
    items: VaultItem[];
    activeTab: VaultItemType;
    viewMode: "grid" | "list" | "tree";
    isLoading: boolean;
    onUploadDrop: (files: FileList) => void;
    onItemAction: (action: string, item: VaultItem) => void;
}

const itemTypeIcons: Partial<Record<VaultItemType, React.ElementType>> = {
    source: FileText,
    workspace: FilePenLine,
    intel: Zap,
    chat: StickyNote,
    pyq: BookOpen,
};

export const VaultContentPanel: React.FC<VaultContentPanelProps> = ({
    items,
    activeTab,
    viewMode,
    isLoading,
    onUploadDrop,
    onItemAction
}) => {
    const [isDragging, setIsDragging] = useState(false);

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (activeTab === 'source') setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (activeTab === 'source' && e.dataTransfer.files.length > 0) {
            onUploadDrop(e.dataTransfer.files);
        }
    };

    const renderItemCard = (item: VaultItem) => {
        const Icon = itemTypeIcons[item.type];

        return (
            <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "group relative flex flex-col p-4 rounded-2xl border border-slate-200 transition-all cursor-pointer",
                    "bg-white hover:bg-slate-50 shadow-sm hover:shadow-md hover:border-slate-300 overflow-hidden"
                )}
                onClick={() => onItemAction('open', item)}
            >
                {/* Top Header Row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 w-full min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200 transition-colors flex-shrink-0">
                            <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex flex-col flex-1 min-w-0 pr-6">
                            <h3 className="font-syne font-bold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">
                                {item.title}
                            </h3>
                            <p className="font-mono text-[10px] text-slate-400 truncate">
                                {item.subjectName} • {format(new Date(item.lastEditedAt.toString()), "MMM d, yyyy")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Preview based on Type */}
                <div className="flex-1 text-sm font-sans text-slate-600 mb-6 py-2">
                    {item.type === 'workspace' && typeof item.content === 'object'
                        ? "Tiptap Document Content Preview..."
                        : typeof item.content === 'string' ? item.content : "No preview available."}
                </div>

                {/* Footer Badges */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-auto">
                    <div className="flex gap-2">
                        {item.isPinned && (
                            <span className="font-mono text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                                Pinned
                            </span>
                        )}
                        {item.crossReferenceCount > 0 && (
                            <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                                <Link2 className="w-3 h-3" /> {item.crossReferenceCount}
                            </span>
                        )}
                        {item.type === 'source' && (
                            <span className={cn(
                                "font-mono text-[10px] px-2 py-1 rounded",
                                item.indexedAt ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}>
                                {item.indexedAt ? '🤖 Indexed' : '⏳ Indexing...'}
                            </span>
                        )}
                        {item.type === 'intel' && (
                            <span className="font-mono text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400 capitalize">
                                {item.subtype || 'Intel'}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        {item.pageCount && <span className="font-mono text-[10px] text-slate-400">{item.pageCount} pages</span>}
                        {item.wordCount && <span className="font-mono text-[10px] text-slate-400">{item.wordCount} words</span>}
                        {item.fileSize && <span className="font-mono text-[10px] text-slate-400">{(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                    </div>
                </div>

                {/* Floating Context Menu (Hover) */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-md">
                    <button onClick={(e) => { e.stopPropagation(); onItemAction('rename', item); }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-900" title="Rename"><Pencil className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onItemAction('download', item); }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-900" title="Download"><Download className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onItemAction('delete', item); }} className="p-1.5 hover:bg-red-50 rounded-md text-slate-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onItemAction('menu', item); }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-900" title="More Options"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
            </motion.div>
        );
    };

    const renderListView = () => (
        <div className="flex flex-col space-y-2">
            {items.map(renderItemCard)} {/* In real app, separate list row component */}
        </div>
    );

    return (
        <div
            className={cn(
                "relative w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto no-scrollbar rounded-3xl bg-slate-50",
                isDragging && "ring-2 ring-emerald-500/50 bg-emerald-500/5 transition-colors"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drop overlay active state */}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-3xl m-4 pointer-events-none"
                    >
                        <div className="flex flex-col items-center gap-4 text-emerald-600">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-bounce">
                                <FileText className="w-10 h-10" />
                            </div>
                            <h2 className="font-syne font-bold text-2xl tracking-wide">Drop files to upload to Vault</h2>
                            <p className="font-mono text-sm opacity-80">PDF, DOCX, TXT, Images, Audio</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-syne font-bold text-2xl text-slate-900 transform-gpu capitalize tracking-tight flex items-center gap-3">
                        {activeTab.replace('_', ' ')}
                    </h1>
                    <p className="font-mono text-[11px] text-slate-400 mt-1 uppercase tracking-widest">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto mt-20">
                    <FolderSearch className="w-16 h-16 text-slate-300 mb-6" />
                    <p className="font-syne font-bold text-lg text-slate-800">No {activeTab.replace('_', ' ')} items</p>
                    <p className="font-mono text-xs text-slate-500 mt-2 leading-relaxed">
                        Drop files here or click Upload in the toolbar to add content to your Vault.
                    </p>
                </div>
            ) : (
                <motion.div layout className={cn(
                    viewMode === 'list' || viewMode === 'tree' ? "flex flex-col space-y-3" : "w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                )}>
                    {items.map(renderItemCard)}
                </motion.div>
            )}

            {/* Persistent Upload Drop Zone Banner at Bottom (Sources Tab Only) */}
            {activeTab === 'source' && items.length > 0 && !isDragging && (
                <div className="mt-12 w-full p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-3 text-center opacity-80 hover:opacity-100 hover:border-slate-300 transition-all cursor-pointer shadow-sm">
                    <FileText className="w-8 h-8 text-slate-400" />
                    <h3 className="font-syne font-bold text-base text-slate-700">Drop additional files here</h3>
                    <p className="font-mono text-[11px] text-slate-400">max 50 MB per file</p>
                </div>
            )}
        </div>
    );
};
