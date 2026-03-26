import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { KanbanBoard, CustomColumn, BoardProperty, KanbanTask } from '../../../services/scheduleTypes';
import { cn } from '../../../lib/utils';

interface CreateBoardModalProps {
  onClose: () => void;
  onCreate: (board: KanbanBoard) => void;
  scheduleTasks?: KanbanTask[];
}

const EMOJIS = ["📋","🚀","⚡","🎯","✅","🔥","💡","📌","🎨","🛠️","📊","🌟","⚙️","🏆","📝","🔍","💬","🎪","🌈","🎭"];
const rEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
const PROP_TYPES = ["text", "number", "dropdown", "link", "date"] as const;
const PROP_ICONS: Record<string, string> = { text: "Aa", number: "#", dropdown: "☰", link: "🔗", date: "📅" };
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

export default function CreateBoardModal({ onClose, onCreate, scheduleTasks = [] }: CreateBoardModalProps) {
  const [title, setTitle] = useState('New Board');
  const [groupByProperty, setGroupByProperty] = useState('status');
  
  const [columns, setColumns] = useState<CustomColumn[]>([
    { id: 'todo', title: 'To Do', order: 1, icon: rEmoji() },
    { id: 'doing', title: 'Doing', order: 2, icon: rEmoji() },
    { id: 'done', title: 'Done', order: 3, icon: rEmoji() }
  ]);
  const [newColTitle, setNewColTitle] = useState('');

  const [properties, setProperties] = useState<BoardProperty[]>([]);
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<BoardProperty['type']>('text');

  const [importIds, setImportIds] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showEmojiFor, setShowEmojiFor] = useState<number | null>(null);

  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiFor(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleAddColumn = () => {
    if (newColTitle.trim()) {
      setColumns([...columns, { 
        id: newColTitle.trim().toLowerCase().replace(/\s+/g, '_'), 
        title: newColTitle.trim(), 
        order: columns.length + 1, 
        icon: rEmoji() 
      }]);
      setNewColTitle('');
    }
  };

  const handleAddProperty = () => {
    if (newPropName.trim()) {
      setProperties([...properties, {
        id: genId(),
        name: newPropName.trim(),
        type: newPropType,
        options: newPropType === 'dropdown' ? ["Option 1", "Option 2"] : []
      }]);
      setNewPropName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBoardId = `board_${Date.now()}`;
    const newBoard: KanbanBoard = {
      id: newBoardId,
      title: title.trim() || 'New Board',
      groupByProperty,
      columns: columns.map((col, index) => ({ ...col, order: index + 1 })),
      properties
    };
    
    // In a real app, you would process importIds here, perhaps updating the tasks' boardIds or customProperties.
    onCreate(newBoard);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Create New Board</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-500">Board Name</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Marketing Sprint"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-500 transition-all font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-500">Columns</label>
            <div className="space-y-2 mb-3">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 relative">
                  <div className="relative">
                    <button type="button" onClick={() => setShowEmojiFor(showEmojiFor === i ? null : i)} className="text-xl hover:scale-110 transition-transform">
                      {col.icon}
                    </button>
                    {showEmojiFor === i && (
                      <div ref={emojiRef} className="absolute top-full left-0 mt-1 z-50 rounded-xl p-2 grid grid-cols-5 gap-1 w-44 shadow-xl bg-white border border-gray-200">
                        {EMOJIS.map(e => (
                          <button type="button" key={e} onClick={() => {
                            setColumns(cs => cs.map((c, j) => j === i ? { ...c, icon: e } : c));
                            setShowEmojiFor(null);
                          }} className="text-lg p-1 hover:bg-gray-100 rounded-lg transition-all">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input 
                    className="flex-1 text-sm bg-transparent outline-none font-medium text-gray-700" 
                    value={col.title} 
                    onChange={e => setColumns(cs => cs.map((c, j) => j === i ? { ...c, title: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '_') } : c))}
                  />
                  <button type="button" onClick={() => setColumns(cs => cs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-rose-500 transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-200 focus:border-indigo-500 transition-colors text-gray-700"
                placeholder="New column name" 
                value={newColTitle} 
                onChange={e => setNewColTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddColumn(); } }}
              />
              <button type="button" onClick={handleAddColumn} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-500">Properties</label>
            <div className="space-y-2 mb-3">
              {properties.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-gray-50 border border-gray-100">
                  <span className="font-mono text-xs w-4 text-center text-gray-400">{PROP_ICONS[p.type]}</span>
                  <span className="flex-1 text-sm font-medium text-gray-700">{p.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-gray-200 text-gray-500">{p.type}</span>
                  <button type="button" onClick={() => setProperties(ps => ps.filter((_, j) => j !== i))} className="text-gray-400 hover:text-rose-500 transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-200 focus:border-indigo-500 transition-colors text-gray-700"
                placeholder="New property name" 
                value={newPropName} 
                onChange={e => setNewPropName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddProperty(); } }}
              />
              <select 
                className="rounded-xl px-3 py-2.5 text-sm outline-none border border-gray-200 bg-white focus:border-indigo-500 text-gray-700 appearance-auto"
                value={newPropType} 
                onChange={e => setNewPropType(e.target.value as any)}
              >
                {PROP_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
              <button type="button" onClick={handleAddProperty} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                Add
              </button>
            </div>
          </div>

          <div>
            <button 
              type="button" 
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {showImport ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} 
              Import tasks from Schedule {importIds.length > 0 && `(${importIds.length} selected)`}
            </button>
            {showImport && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 custom-scrollbar space-y-1">
                {scheduleTasks.length === 0 ? (
                   <div className="text-xs text-gray-400 p-2 text-center">No tasks available to import.</div>
                ) : (
                  scheduleTasks.map(task => (
                    <label key={task.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <input 
                        type="checkbox" 
                        checked={importIds.includes(task.id)}
                        onChange={e => setImportIds(ids => e.target.checked ? [...ids, task.id] : ids.filter(id => id !== task.id))}
                        className="accent-indigo-600 w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700 flex-1 truncate">{task.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-gray-200 text-gray-500">{task.status}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Board
            </button>
        </div>
      </motion.div>
    </div>
  );
}
