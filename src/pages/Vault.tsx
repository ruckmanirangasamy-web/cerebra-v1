import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Upload, Grid, List as ListIcon, Plus,
  ChevronRight, FolderOpen, Star, Clock, Trash2,
  FileText, FilePenLine, Zap, BookOpen, StickyNote,
  Download, Pencil, Pin, X, ArrowLeft, File, FileImage, FileAudio,
  Cloud, HardDrive, AlertCircle, CheckCircle, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { CreateSubjectModal } from "../components/vault/CreateSubjectModal";
import { VaultFolder, VaultItem, VaultItemType } from "../services/vaultTypes";
import { useAuth } from "../lib/AuthContext";
import {
  subscribeToVaultFolders,
  subscribeToVaultItems,
  subscribeToStorageUsage,
  createVaultFolder,
  uploadVaultFile,
  deleteVaultItem,
  validateFile,
  StorageUsage
} from "../services/vaultService";

// ─── Sub-Folder config ──────────────────────────────────────────────────────

const SUB_FOLDERS: { id: VaultItemType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { id: "source", label: "Source Library", icon: BookOpen, color: "#3B82F6", description: "PDFs, docs & reference material" },
  { id: "workspace", label: "Workspace", icon: FilePenLine, color: "#10B981", description: "Notes, essays & rich documents" },
  { id: "intel", label: "Intel", icon: Zap, color: "#F59E0B", description: "Formulas, mnemonics & key concepts" },
  { id: "chat", label: "Quick Notes", icon: StickyNote, color: "#8B5CF6", description: "Captured thoughts & quick saves" },
];

// ─── File type config ────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  pdf: { icon: FileText, color: "#EF4444" },
  docx: { icon: FileText, color: "#3B82F6" },
  txt: { icon: FileText, color: "#6B7280" },
  image: { icon: FileImage, color: "#10B981" },
  audio: { icon: FileAudio, color: "#8B5CF6" },
  note: { icon: StickyNote, color: "#F59E0B" },
  other: { icon: File, color: "#94A3B8" },
};

// ─── Sample demo card ────────────────────────────────────────────────────────

const DEMO_ITEM: VaultItem = {
  id: "__demo__",
  vaultId: "__demo__",
  subjectId: "__demo__",
  subjectName: "Sample Subject",
  type: "source",
  tags: ["Sample"],
  subtype: "pdf",
  title: "📄 Introduction to Quantum Mechanics",
  content: "This is a sample file to show you how your Vault works. Upload your own PDFs, notes, and study material to get started!",
  ghostSuppressed: false,
  isPinned: true,
  fileSize: 2457600,
  pageCount: 32,
  wordCount: undefined,
  isPYQ: false,
  missionId: null,
  createdBy: "system",
  chunkCount: 0,
  indexedAt: new Date("2026-03-10"),
  crossReferenceCount: 2,
  storageRef: null,
  createdAt: new Date("2026-03-10"),
  lastEditedAt: new Date("2026-03-10"),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d?: Date | any) {
  if (!d) return "—";
  try {
    const date = d?.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

// ─── Upload Toast ─────────────────────────────────────────────────────────────

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const UploadToast: React.FC<{ tasks: UploadTask[]; onDismiss: (id: string) => void }> = ({ tasks, onDismiss }) => {
  if (tasks.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {tasks.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-3">
              {task.status === "uploading" && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" />}
              {task.status === "done" && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
              {task.status === "error" && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 truncate">{task.fileName}</p>
                <p className="text-[11px] font-mono text-slate-400">
                  {task.status === "uploading" && `Uploading… ${Math.round(task.progress)}%`}
                  {task.status === "done" && "Upload complete ✓"}
                  {task.status === "error" && (task.error || "Upload failed")}
                </p>
              </div>
              {task.status !== "uploading" && (
                <button onClick={() => onDismiss(task.id)} className="p-1 text-slate-400 hover:text-slate-600 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {task.status === "uploading" && (
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ─── Storage Sidebar Panel ────────────────────────────────────────────────────

const StorageMeter: React.FC<{ usage: StorageUsage | null }> = ({ usage }) => {
  const pct = usage?.percentage ?? 0;
  const barColor = pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : "#10B981";

  return (
    <div className="p-4 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Cloud className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[11px] font-mono text-slate-500">Storage</span>
        <span className="text-[11px] font-mono text-slate-400 ml-auto">
          {usage ? `${usage.usedFormatted} / ${usage.totalFormatted}` : "—"}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] font-mono text-slate-400 mt-1.5">
        {usage ? `${(100 - pct).toFixed(1)}% free of 5 GB` : "5 GB free plan"}
      </p>
    </div>
  );
};

// ─── File Row ─────────────────────────────────────────────────────────────────

const FileRow: React.FC<{
  item: VaultItem;
  isDemo?: boolean;
  onDelete?: (item: VaultItem) => void;
}> = ({ item, isDemo, onDelete }) => {
  const subtype = (item.subtype || "other") as string;
  const { icon: Icon, color } = FILE_ICONS[subtype] || FILE_ICONS["other"];

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group border-b border-slate-100 hover:bg-slate-50 transition-colors relative cursor-pointer"
    >
      {/* Name */}
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[13px] text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {item.title}
              {isDemo && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-600 rounded tracking-wider uppercase">Demo</span>
              )}
              {item.indexedAt === null && !isDemo && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-500 rounded tracking-wider uppercase animate-pulse">Indexing…</span>
              )}
            </p>
            {isDemo && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">Click to preview • Upload your own files to replace this</p>
            )}
          </div>
          {item.isPinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
        </div>
      </td>
      {/* Date */}
      <td className="py-3 px-3 text-[12px] text-slate-500 font-mono whitespace-nowrap">
        {formatDate(item.lastEditedAt)}
      </td>
      {/* Size */}
      <td className="py-3 px-3 text-[12px] text-slate-500 font-mono whitespace-nowrap">
        {item.pageCount ? `${item.pageCount} pages` : ""}
        {item.fileSize ? ` • ${formatBytes(item.fileSize)}` : ""}
        {!item.fileSize && !item.pageCount ? "—" : ""}
      </td>
      {/* Type badge */}
      <td className="py-3 px-3">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {subtype}
        </span>
      </td>
      {/* Actions */}
      <td className="py-3 pr-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.downloadURL && (
            <a
              href={item.downloadURL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 hover:shadow-sm transition-all"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 hover:shadow-sm transition-all" title="Rename">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!isDemo && onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 hover:shadow-sm transition-all"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// ─── Sub-folder grid card ─────────────────────────────────────────────────────

const SubFolderCard: React.FC<{
  folder: typeof SUB_FOLDERS[0];
  count: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ folder, count, isActive, onClick }) => {
  const Icon = folder.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-2xl border transition-all text-left group overflow-hidden",
        isActive
          ? "border-transparent shadow-lg"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      )}
      style={isActive ? { background: `linear-gradient(135deg, ${folder.color}15 0%, ${folder.color}08 100%)`, borderColor: `${folder.color}40` } : {}}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${folder.color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color: folder.color }} />
      </div>
      <p className="font-semibold text-[13px] text-slate-800 mb-0.5">{folder.label}</p>
      <p className="text-[11px] text-slate-400">{count} items</p>

      {isActive && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ background: folder.color }}
        />
      )}
    </motion.button>
  );
};

// ─── Main Vault Component ─────────────────────────────────────────────────────

export default function Vault() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeSubFolder, setActiveSubFolder] = useState<VaultItemType>("source");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [toast, setToast] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFolder = folders.find(f => f.id === activeFolderId) || 
                       (activeFolderId === 'uncategorised' ? { id: 'uncategorised', name: 'Uncategorised', subjectColour: '#94a3b8', itemCount: 0, missionIds: [], isShared: false, ownerId: user?.uid || '', createdAt: new Date() } : undefined);

  // ── Subscribe to folders ──
  useEffect(() => {
    if (!user) return;
    return subscribeToVaultFolders(user.uid, (data) => {
      // Add synthetic 'Uncategorised' folder
      const syntheticFolder: VaultFolder = {
          id: 'uncategorised',
          name: 'Uncategorised',
          subjectColour: '#94a3b8',
          itemCount: 0, // Ideally we'd calculate this from the flat collections, but 0 is fine as a placeholder
          missionIds: [],
          isShared: false,
          ownerId: user.uid,
          createdAt: new Date(),
      };
      setFolders([...data, syntheticFolder]);
      setIsLoading(false);
    });
  }, [user]);

  // ── Subscribe to items ──
  useEffect(() => {
    if (!user || !activeFolderId) { setItems([]); return; }
    
    // If Uncategorised, we pass null as folderId to our service to fetch items with no vaultId/subjectId
    const targetFolderId = activeFolderId === 'uncategorised' ? null : activeFolderId;
    
    return subscribeToVaultItems(user.uid, targetFolderId, activeSubFolder, (data) => {
      // If uncategorised, filter only items that actually have no folder
      const finalData = activeFolderId === 'uncategorised' 
        ? data.filter(item => !item.vaultId && !item.subjectId)
        : data;
      setItems(finalData);
    });
  }, [user, activeFolderId, activeSubFolder]);

  // ── Subscribe to real storage usage ──
  useEffect(() => {
    if (!user) return;
    return subscribeToStorageUsage(user.uid, setStorageUsage);
  }, [user]);

  // ── Auto-dismiss toast ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCreateSubject = async (name: string, color: string) => {
    if (!user) return;
    await createVaultFolder(user.uid, { name, subjectColour: color });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!user || !activeFolderId || !activeFolder) {
      setToast({ type: "error", msg: "Select a subject first to upload files." });
      return;
    }

    const fileArray = Array.from(files).slice(0, 10); // max 10 at once

    for (const file of fileArray) {
      // Validate
      const validationError = validateFile(file, storageUsage?.usedBytes ?? 0);
      if (validationError) {
        setToast({ type: "error", msg: validationError.message });
        continue;
      }

      const taskId = `${Date.now()}_${file.name}`;
      const baseTask: UploadTask = { id: taskId, fileName: file.name, progress: 0, status: "uploading" };
      setUploadTasks(prev => [...prev, baseTask]);

      try {
        await uploadVaultFile(
          user.uid,
          activeFolderId,
          activeFolder.name,
          file,
          (progress) => {
            setUploadTasks(prev =>
              prev.map(t => t.id === taskId ? { ...t, progress } : t)
            );
          }
        );
        setUploadTasks(prev =>
          prev.map(t => t.id === taskId ? { ...t, status: "done", progress: 100 } : t)
        );
        // Auto-dismiss after 3s
        setTimeout(() => setUploadTasks(prev => prev.filter(t => t.id !== taskId)), 3000);
      } catch (err: any) {
        setUploadTasks(prev =>
          prev.map(t => t.id === taskId ? { ...t, status: "error", error: err?.message || "Upload failed" } : t)
        );
      }
    }
  }, [user, activeFolderId, activeFolder, storageUsage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ""; // reset input
    }
  };

  // Drag-and-drop anywhere on page
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleDeleteItem = async (item: VaultItem) => {
    if (!user || !activeFolderId) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteVaultItem(user.uid, activeFolderId, item.id);
    } catch (err) {
      setToast({ type: "error", msg: "Failed to delete file." });
    }
  };

  // Filter items by search
  const filteredItems = items.filter(i =>
    !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show demo card when no items
  const showDemo = !isLoading && filteredItems.length === 0 && activeFolderId;
  const displayItems = showDemo ? [DEMO_ITEM] : filteredItems;

  return (
    <div
      className="flex h-full w-full bg-white text-slate-900 overflow-hidden font-sans rounded-3xl border border-slate-200 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp3,.wav" />

      {/* ── Drag Overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-emerald-500/10 border-2 border-dashed border-emerald-400 rounded-3xl flex flex-col items-center justify-center gap-3 pointer-events-none"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-syne font-bold text-lg text-emerald-700">Drop to upload{activeFolderId ? ` to ${activeFolder?.name}` : ""}</p>
            {!activeFolderId && <p className="text-[13px] text-emerald-600 font-mono">Open a subject first</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className={cn(
              "absolute top-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold shadow-lg border",
              toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}
          >
            {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full border-r border-slate-100 flex flex-col overflow-hidden flex-shrink-0 bg-slate-50/60"
          >
            {/* Sidebar Header */}
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-[13px] text-slate-800 font-syne tracking-wide">THE VAULT</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono pl-6">Your study universe</p>
            </div>

            {/* Nav Items */}
            <div className="px-2 py-3 space-y-0.5">
              <button
                onClick={() => { setActiveFolderId(null); setSidebarOpen(true); }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                  !activeFolderId ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:bg-white hover:text-slate-800"
                )}
              >
                <Grid className="w-4 h-4 text-emerald-500" />
                All Subjects
              </button>
              <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-white hover:text-slate-800 transition-all">
                <Star className="w-4 h-4 text-amber-400" />
                Starred
              </button>
              <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-white hover:text-slate-800 transition-all">
                <Clock className="w-4 h-4 text-blue-400" />
                Recent
              </button>
            </div>

            {/* Subjects List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              <div className="flex items-center justify-between px-3 mb-2 mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subjects</span>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-5 h-5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-1 px-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-9 rounded-xl bg-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : folders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center px-3 py-4 leading-relaxed">
                  No subjects yet. Create one to start organizing!
                </p>
              ) : (
                <div className="space-y-0.5">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setActiveFolderId(folder.id)}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] transition-all text-left group",
                        activeFolderId === folder.id
                          ? "bg-white shadow-sm border border-slate-200 text-slate-900"
                          : "text-slate-600 hover:bg-white hover:text-slate-800"
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.subjectColour || "#94a3b8" }}
                      />
                      <span className="flex-1 truncate font-medium">{folder.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{folder.itemCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Storage meter — real Firebase data */}
            <StorageMeter usage={storageUsage} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top Toolbar ── */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-[13px] text-slate-500 font-mono">
              <button
                onClick={() => setActiveFolderId(null)}
                className="hover:text-slate-800 transition-colors"
              >
                Vault
              </button>
              {activeFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-slate-800 font-semibold">{activeFolder.name}</span>
                </>
              )}
              {activeFolderId && activeFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-slate-600 capitalize">{SUB_FOLDERS.find(s => s.id === activeSubFolder)?.label}</span>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center bg-slate-100 rounded-full border border-slate-200 h-8 px-3 gap-2 w-56 lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search files…"
              className="flex-1 bg-transparent border-none outline-none text-[12px] text-slate-700 placeholder:text-slate-400 font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUploadClick}
              disabled={!activeFolderId}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-white text-[13px] font-bold font-syne rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all",
                activeFolderId
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 hover:scale-105 active:scale-95"
                  : "bg-slate-300 cursor-not-allowed opacity-60"
              )}
              title={!activeFolderId ? "Open a subject to upload" : "Upload files"}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {!activeFolderId ? (
            /* ── Root: Subject Grid ── */
            <div className="p-6 max-w-[1100px] mx-auto">
              <div className="mb-6">
                <h2 className="font-syne font-bold text-2xl text-slate-900">Your Subjects</h2>
                <p className="text-[13px] text-slate-500 mt-1 font-mono">
                  Each subject holds your study material, notes, and resources.
                </p>
              </div>

              {/* Storage summary card (shown in main area too) */}
              {storageUsage && (
                <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <HardDrive className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-bold text-slate-700 font-syne">Cloud Storage</span>
                      <span className="text-[12px] font-mono text-slate-500">{storageUsage.usedFormatted} of {storageUsage.totalFormatted}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${storageUsage.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">{(100 - storageUsage.percentage).toFixed(1)}% free — 5 GB free plan</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[22px] font-bold text-slate-800 font-syne leading-none">{storageUsage.percentage.toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">used</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Create card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex flex-col items-center justify-center h-44 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/60 transition-all group bg-white"
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                  <span className="font-syne font-bold text-[13px] text-slate-500 group-hover:text-emerald-700">New Subject</span>
                </motion.button>

                {/* Subject cards */}
                {folders.map(folder => (
                  <motion.button
                    key={folder.id}
                    whileHover={{ scale: 1.02, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="relative flex flex-col items-start justify-between p-5 h-44 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all text-left overflow-hidden group"
                  >
                    {/* Subtle BG */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(ellipse at top left, ${folder.subjectColour || '#94a3b8'}12 0%, transparent 70%)` }}
                    />
                    {/* Icon */}
                    <div className="flex items-center justify-between w-full relative z-10">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: folder.subjectColour || '#94a3b8' }}
                      >
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        {folder.itemCount} files
                      </span>
                    </div>
                    {/* Name */}
                    <div className="relative z-10 mt-auto">
                      <h3 className="font-syne font-bold text-[16px] text-slate-800 truncate">
                        {folder.name}
                      </h3>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {SUB_FOLDERS.slice(0, 3).map(sf => (
                          <span
                            key={sf.id}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                            style={{ backgroundColor: `${sf.color}15`, color: sf.color }}
                          >
                            {sf.label.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Subject view: Sub-folders + Files ── */
            <div className="p-5 max-w-[1100px] mx-auto">
              {/* Back + title */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setActiveFolderId(null)}
                  className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors font-mono group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  Back
                </button>
                <div
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: activeFolder?.subjectColour || "#94a3b8" }}
                />
                <h2 className="font-syne font-bold text-lg text-slate-900">{activeFolder?.name}</h2>
              </div>

              {/* Sub-folder cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {SUB_FOLDERS.map(sf => (
                  <SubFolderCard
                    key={sf.id}
                    folder={sf}
                    count={sf.id === activeSubFolder ? filteredItems.length : 0}
                    isActive={activeSubFolder === sf.id}
                    onClick={() => setActiveSubFolder(sf.id)}
                  />
                ))}
              </div>

              {/* File List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* List Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const sf = SUB_FOLDERS.find(s => s.id === activeSubFolder);
                      const Icon = sf?.icon || FolderOpen;
                      return (
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: sf?.color }} />
                          <h3 className="font-semibold text-[13px] text-slate-800">{sf?.label}</h3>
                          <span className="text-[11px] text-slate-400 font-mono">{displayItems.length} {displayItems.length === 1 ? "item" : "items"}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    onClick={handleUploadClick}
                    className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 font-mono transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Add file
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="text-left py-2.5 pl-4 pr-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[45%]">
                          Name
                        </th>
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Last Modified
                        </th>
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="py-2.5 pr-4 w-[100px]" />
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {displayItems.map(item => (
                          <FileRow
                            key={item.id}
                            item={item}
                            isDemo={item.id === "__demo__"}
                            onDelete={handleDeleteItem}
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>

                  {/* Drop zone at bottom of table */}
                  <label
                    className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer border-t border-dashed border-slate-200 hover:bg-emerald-50/50 transition-colors group"
                    onClick={handleUploadClick}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <p className="text-[12px] font-mono text-slate-400 group-hover:text-emerald-600 transition-colors">
                      Drag & drop or <span className="underline underline-offset-2">browse</span>
                    </p>
                    <p className="text-[10px] font-mono text-slate-300">PDF, DOCX, TXT, Images, Audio · up to 50 MB each</p>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Subject Modal ── */}
      <CreateSubjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSubject}
      />

      {/* ── Upload Progress Toasts ── */}
      <UploadToast
        tasks={uploadTasks}
        onDismiss={id => setUploadTasks(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
}
