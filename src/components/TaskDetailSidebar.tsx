import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Clock, Play, Pause, Square, Plus, Trash2, CheckCircle2, 
  Circle, ChevronDown, ChevronRight, Calendar, Flag, Tag, 
  MessageSquare, List, Activity, Info, Save, Link, Paperclip, 
  MoreHorizontal, PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { KanbanTask, TaskStatus, TaskPriority, Subtask, Timelog } from '../services/scheduleTypes';
import { updateTask, deleteTask } from '../services/scheduleService';
import { cn } from '../lib/utils';

interface TaskDetailSidebarProps {
  task: KanbanTask;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedTask: KanbanTask) => void;
}

type Tab = 'details' | 'subtasks' | 'activity';

export default function TaskDetailSidebar({ task, isOpen, onClose, onUpdate }: TaskDetailSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [editedTask, setEditedTask] = useState<KanbanTask>({ ...task });
  
  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditedTask({ ...task });
    setElapsedTime(0);
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [task.id]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // Pause/Stop: Log time
      const newLog: Timelog = {
        date: new Date().toISOString(),
        duration: Math.floor(elapsedTime / 60) // Store in minutes
      };
      
      const updatedLogs = [...(editedTask.timelogs || []), newLog];
      const updatedTask = { 
        ...editedTask, 
        timelogs: updatedLogs,
        actualDuration: (editedTask.actualDuration || 0) + newLog.duration
      };
      
      setEditedTask(updatedTask);
      updateTask(task.id, { 
        timelogs: updatedLogs, 
        actualDuration: updatedTask.actualDuration 
      });
      setElapsedTime(0);
      setIsTimerRunning(false);
    } else {
      setIsTimerRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpdateField = (field: keyof KanbanTask, value: any) => {
    const updated = { ...editedTask, [field]: value };
    setEditedTask(updated);
    updateTask(task.id, { [field]: value });
    if (onUpdate) onUpdate(updated);
  };

  const handleAddSubtask = (title: string) => {
    if (!title.trim()) return;
    const newSubtask: Subtask = {
      id: `sub-${Date.now()}`,
      title,
      done: false
    };
    const updatedSubtasks = [...(editedTask.subtasks || []), newSubtask];
    handleUpdateField('subtasks', updatedSubtasks);
  };

  const toggleSubtask = (id: string) => {
    const updatedSubtasks = editedTask.subtasks.map(st => 
      st.id === id ? { ...st, done: !st.done } : st
    );
    handleUpdateField('subtasks', updatedSubtasks);
  };

  const deleteSubtask = (id: string) => {
    const updatedSubtasks = editedTask.subtasks.filter(st => st.id !== id);
    handleUpdateField('subtasks', updatedSubtasks);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-[450px] bg-white border-l border-gray-200 z-[100] shadow-2xl flex flex-col"
      >
        {/* Header - DUB Style */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
             <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                {editedTask.subject}
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {task.id.slice(0, 8)}
             </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <MoreHorizontal size={18} />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Title Area */}
        <div className="px-6 pt-6 pb-2 shrink-0">
           <input
             type="text"
             value={editedTask.title}
             onChange={(e) => handleUpdateField('title', e.target.value)}
             className="w-full text-xl font-black text-gray-900 border-none outline-none focus:ring-0 p-0 placeholder:text-gray-300 leading-tight"
             placeholder="Task Title"
           />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0 mt-4">
          {(['details', 'subtasks', 'activity'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-xs font-bold transition-colors relative uppercase tracking-widest",
                activeTab === tab ? "text-indigo-600" : "text-gray-400 hover:text-gray-900"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              
              {/* Properties Grid - DUB Style */}
              <div className="grid grid-cols-[120px_1fr] gap-y-4 items-center text-sm">
                <div className="text-gray-500 font-medium flex items-center gap-2">
                  <Info size={14} /> Status
                </div>
                <div>
                  <select
                    value={editedTask.status}
                    onChange={(e) => handleUpdateField('status', e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="Unstarted">Unstarted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="text-gray-500 font-medium flex items-center gap-2">
                  <Flag size={14} /> Priority
                </div>
                <div>
                  <select
                    value={editedTask.priority}
                    onChange={(e) => handleUpdateField('priority', e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="text-gray-500 font-medium flex items-center gap-2">
                  <Calendar size={14} /> Due Date
                </div>
                <div>
                   <button className="text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors shadow-sm">
                     {editedTask.dueDate ? format(editedTask.dueDate.seconds ? editedTask.dueDate.seconds * 1000 : editedTask.dueDate, 'PPP') : 'Set due date'}
                   </button>
                </div>

                <div className="text-gray-500 font-medium flex items-center gap-2">
                  <Clock size={14} /> Estimated
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editedTask.estimatedDuration}
                    onChange={(e) => handleUpdateField('estimatedDuration', parseInt(e.target.value))}
                    className="w-16 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors shadow-sm"
                  />
                  <span className="text-xs text-gray-500 font-medium">minutes</span>
                </div>
              </div>

              <div className="h-px bg-gray-200 w-full" />

              {/* Description */}
              <div className="space-y-3">
                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <List size={14} className="text-gray-400" /> Description
                 </h3>
                 <textarea
                   value={editedTask.notes || ''}
                   onChange={(e) => handleUpdateField('notes', e.target.value)}
                   className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 outline-none focus:border-indigo-500 transition-all shadow-sm resize-none min-h-[120px] placeholder:text-gray-300"
                   placeholder="Add a description, notes, or links..."
                 />
              </div>

              {/* Timer Section */}
              <div className="p-5 bg-white border border-indigo-100 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 pointer-events-none" />
                <div className="relative flex items-center justify-between">
                   <div>
                      <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <PlayCircle size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Time Tracker</span>
                      </div>
                      <div className="text-3xl font-black text-gray-900 tracking-tighter">
                         {formatTime(elapsedTime)}
                      </div>
                   </div>
                   
                   <button
                     onClick={handleToggleTimer}
                     className={cn(
                       "flex items-center justify-center w-12 h-12 rounded-xl transition-all shadow-md",
                       isTimerRunning 
                         ? "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600" 
                         : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
                     )}
                   >
                     {isTimerRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subtasks' && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Checklist</h3>
                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  {editedTask.subtasks?.filter(s => s.done).length || 0} / {editedTask.subtasks?.length || 0}
                </span>
              </div>

              <div className="space-y-2">
                {editedTask.subtasks?.map((st) => (
                  <div key={st.id} className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors">
                    <button 
                      onClick={() => toggleSubtask(st.id)}
                      className={cn(
                        "transition-colors",
                        st.done ? "text-emerald-500" : "text-gray-300 hover:text-indigo-500"
                      )}
                    >
                      {st.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <span className={cn(
                      "flex-1 text-sm font-medium transition-all",
                      st.done ? "text-gray-400 line-through" : "text-gray-700"
                    )}>
                      {st.title}
                    </span>
                    <button 
                      onClick={() => deleteSubtask(st.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-all text-gray-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 relative">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                <input
                  type="text"
                  placeholder="Add a new sub-task..."
                  className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-indigo-300 placeholder:font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubtask(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <MessageSquare size={24} className="text-gray-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">No Activity Yet</h4>
                  <p className="text-xs font-medium text-gray-500 mt-1 max-w-[200px] mx-auto">Comments and status changes will appear here.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Paperclip size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Link size={18} />
            </button>
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                deleteTask(task.id);
                onClose();
              }
            }}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}