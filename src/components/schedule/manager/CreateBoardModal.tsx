import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { KanbanBoard, CustomColumn } from '../../../services/scheduleTypes';

interface CreateBoardModalProps {
  onClose: () => void;
  onCreate: (board: KanbanBoard) => void;
}

export default function CreateBoardModal({ onClose, onCreate }: CreateBoardModalProps) {
  const [title, setTitle] = useState('');
  const [groupByProperty, setGroupByProperty] = useState('status');
  const [columns, setColumns] = useState<CustomColumn[]>([
    { id: 'todo', title: 'To Do', order: 1, icon: '📋' },
    { id: 'doing', title: 'Doing', order: 2, icon: '🔥' },
    { id: 'done', title: 'Done', order: 3, icon: '✅' }
  ]);
  const [importAll, setImportAll] = useState(true);

  const handleAddColumn = () => {
    setColumns([...columns, { id: `col_${Date.now()}`, title: 'New Column', order: columns.length + 1, icon: '📁' }]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, field: keyof CustomColumn, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    if (field === 'title') {
       newColumns[index].id = value.toLowerCase().replace(/\s+/g, '_');
    }
    setColumns(newColumns);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBoardId = `board_${Date.now()}`;
    const newBoard: KanbanBoard = {
      id: newBoardId,
      title: title || 'New Board',
      groupByProperty,
      columns: columns.map((col, index) => ({ ...col, order: index + 1 })),
      // optionally store importAll flag logic if backend supports it, for now we just create the board
    };
    onCreate(newBoard);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-gray-900">Create New Board</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          <form id="create-board-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Board Name</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Marketing Sprint"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Group By Property</label>
              <input 
                type="text" 
                value={groupByProperty} 
                onChange={e => setGroupByProperty(e.target.value)} 
                placeholder="e.g. status, priority, phase"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
              <p className="text-[10px] text-gray-500 mt-1.5">Property used to group cards into columns (default: 'status').</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-gray-700">Columns</label>
                  <button type="button" onClick={handleAddColumn} className="text-[10px] uppercase tracking-wider bg-white text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-700 px-2 py-1 rounded border border-indigo-100 shadow-sm transition-all hover:shadow">
                    <Plus className="w-3 h-3" /> Add Column
                  </button>
              </div>
              <div className="space-y-2">
                {columns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={col.icon || ''} 
                      onChange={e => handleColumnChange(idx, 'icon', e.target.value)} 
                      placeholder="Icon"
                      className="w-12 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-500 text-center bg-white"
                    />
                    <input 
                      type="text" 
                      value={col.title} 
                      onChange={e => handleColumnChange(idx, 'title', e.target.value)} 
                      placeholder="Column Title"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 bg-white"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveColumn(idx)}
                      disabled={columns.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors bg-white border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1">
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={importAll} 
                      onChange={e => setImportAll(e.target.checked)}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-600"
                    />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  </div>
                  <span className="font-medium group-hover:text-gray-900 transition-colors">Import all existing tasks to this board</span>
                </label>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="create-board-form"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Board
            </button>
        </div>
      </motion.div>
    </div>
  );
}
