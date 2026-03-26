import React, { useState } from "react";
import { 
    Folder, FileText, ChevronRight, ChevronDown, 
    MoreVertical, FileArchive, Zap, FilePenLine, 
    BookOpen, StickyNote, Plus, FolderPlus, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { VaultFolder, VaultItemType } from "../../services/vaultTypes";

interface FolderTreeProps {
    folders: VaultFolder[];
    activeFolderId: string | null;
    activeTab: VaultItemType;
    onSelectFolder: (id: string) => void;
    onSelectTab: (type: VaultItemType) => void;
    onBackToRoot: () => void;
}

const TABS: { id: VaultItemType; label: string; icon: React.ElementType }[] = [
    { id: 'source', label: 'Source Library', icon: BookOpen },
    { id: 'workspace', label: 'Workspace', icon: FilePenLine },
    { id: 'intel', label: 'Intel', icon: Zap },
    { id: 'chat', label: 'Quick Notes', icon: StickyNote },
];

export const FolderTree: React.FC<FolderTreeProps> = ({
    folders,
    activeFolderId,
    activeTab,
    onSelectFolder,
    onSelectTab,
    onBackToRoot
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const activeFolder = folders.find(f => f.id === activeFolderId);

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Back to Root Navigation */}
            <button
                onClick={onBackToRoot}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit group"
            >
                <div className="p-1 rounded-md bg-slate-100 group-hover:bg-slate-200 transition-colors">
                    <ChevronDown className="w-4 h-4 rotate-90" />
                </div>
                <span className="font-syne font-bold text-sm">All Subjects</span>
            </button>

            {/* Folder Dropdown Selector */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all group",
                        isOpen && "ring-2 ring-emerald-500/20 border-emerald-500/50"
                    )}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {activeFolder ? (
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: activeFolder.subjectColour }}
                            />
                        ) : (
                            <Folder className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-syne font-bold text-slate-800 truncate">
                            {activeFolder?.name || "Select Folder"}
                        </span>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 z-[60] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto no-scrollbar"
                        >
                            {folders.length === 0 ? (
                                <div className="p-4 text-center">
                                    <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">No Folders Found</p>
                                </div>
                            ) : (
                                folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => {
                                            onSelectFolder(folder.id);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between w-full p-3 rounded-xl transition-colors",
                                            activeFolderId === folder.id ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: folder.subjectColour }}
                                            />
                                            <span className="font-medium text-sm truncate">{folder.name}</span>
                                        </div>
                                        <span className="font-mono text-[10px] opacity-60 ml-2">{folder.itemCount}</span>
                                    </button>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Feature Tabs (Horizontal Grid) */}
            <div className="grid grid-cols-2 gap-2">
                {TABS.map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onSelectTab(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                                isActive
                                    ? "bg-white border-emerald-500 shadow-sm text-emerald-700 ring-4 ring-emerald-500/5"
                                    : "bg-slate-50/50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-xl",
                                isActive ? "bg-emerald-50 text-emerald-600" : "bg-white text-slate-400 shadow-sm"
                            )}>
                                <TabIcon className="w-5 h-5" />
                            </div>
                            <span className={cn("text-xs font-bold font-syne uppercase tracking-tight", isActive ? "opacity-100" : "opacity-60")}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
