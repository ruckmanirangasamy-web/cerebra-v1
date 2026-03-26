import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { KanbanTask, TaskStatus } from '../../../services/scheduleTypes';

interface ScheduleListViewProps {
  tasks: KanbanTask[];
  onTaskClick: (task: KanbanTask) => void;
  onCreateTask: (title: string) => void;
  onUpdateTask: (id: string, updates: Partial<KanbanTask>) => void;
}

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-500 border-slate-200",
  "In Progress": "bg-blue-100 text-blue-600 border-blue-200",
  "Paused": "bg-yellow-100 text-yellow-600 border-yellow-200",
  "Done": "bg-emerald-100 text-emerald-600 border-emerald-200",
};

const STATUS_OPTIONS: TaskStatus[] = ['Not Started', 'In Progress', 'Paused', 'Done'];

export default function ScheduleListView({ tasks, onTaskClick, onCreateTask, onUpdateTask }: ScheduleListViewProps) {
  const [filter, setFilter] = useState<string>('All');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = filter === "All" ? tasks : tasks.filter(c => c.status === filter);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] h-full custom-scrollbar">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Schedule List</h1>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl p-1 bg-gray-100 border border-gray-200">
              {['All', ...STATUS_OPTIONS].map(s => (
                <button 
                  key={s} 
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filter === s ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setAdding(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Task
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {adding && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white border-2 border-indigo-500 shadow-sm"
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-300" />
              <input 
                className="flex-1 text-sm font-bold text-gray-900 outline-none bg-transparent placeholder:text-gray-400"
                placeholder="Task title..."
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newTitle.trim()) { 
                    onCreateTask(newTitle.trim()); 
                    setNewTitle(""); 
                    setAdding(false); 
                  }
                  if (e.key === "Escape") setAdding(false);
                }} 
                autoFocus
              />
              <button 
                onClick={() => {
                  if(newTitle.trim()) { 
                    onCreateTask(newTitle.trim()); 
                    setNewTitle(""); 
                    setAdding(false);
                  }
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
              <button onClick={() => setAdding(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1.5">✕</button>
            </motion.div>
          )}

          {filtered.map(task => (
            <div 
              key={task.id} 
              className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer group transition-all bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm"
              onClick={() => onTaskClick(task)}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateTask(task.id, { status: task.status === 'Done' ? 'Not Started' : 'Done' });
                }}
                className="text-gray-300 hover:text-indigo-500 transition-colors"
              >
                {task.status === 'Done' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
              </button>
              
              {editId === task.id ? (
                <input 
                  className="flex-1 text-sm font-bold text-gray-900 outline-none bg-transparent"
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={() => {
                    if(editTitle.trim() && editTitle !== task.title) {
                      onUpdateTask(task.id, { title: editTitle });
                    }
                    setEditId(null);
                  }}
                  onKeyDown={e => { if(e.key === "Enter") e.currentTarget.blur(); }} 
                  autoFocus 
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span 
                  className={cn("flex-1 text-sm font-bold transition-all", task.status === "Done" ? "line-through text-gray-400" : "text-gray-700")}
                  onDoubleClick={e => { e.stopPropagation(); setEditId(task.id); setEditTitle(task.title); }}
                >
                  {task.title}
                </span>
              )}

              {task.totalTime && task.totalTime > 0 ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">
                   <Clock size={12} /> {Math.floor(task.totalTime / 60)}m
                </div>
              ) : null}

              <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border", STATUS_COLORS[task.status] || STATUS_COLORS["Not Started"])}>
                {task.status}
              </span>
            </div>
          ))}

          {filtered.length === 0 && !adding && (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <div className="text-4xl mb-3 opacity-50">📋</div>
              <p className="text-sm font-medium text-gray-500">No tasks found. Click <strong>+ Task</strong> to create one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}