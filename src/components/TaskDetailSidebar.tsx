import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Clock, Play, Pause, Plus, Trash2, CheckCircle2, 
  Circle, Calendar, Flag, List, MessageSquare, 
  Paperclip, Link as LinkIcon, MoreHorizontal, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { KanbanTask, Timelog, BoardProperty, TaskStatus, TaskPriority } from '../services/scheduleTypes';
import { updateTask, deleteTask } from '../services/scheduleService';
import { cn } from '../lib/utils';

interface TaskDetailSidebarProps {
  task: KanbanTask;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedTask: KanbanTask) => void;
  boardProperties?: BoardProperty[];
  columnName?: string;
}

type Tab = 'details' | 'subtasks' | 'activity';

const STATUS_OPTIONS: TaskStatus[] = ['Not Started', 'In Progress', 'Paused', 'Done'];
const PROP_TYPES = ["text", "number", "dropdown", "link", "date"] as const;
const PROP_ICONS: Record<string, string> = { text: "Aa", number: "#", dropdown: "☰", link: "🔗", date: "📅" };

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

const SC: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-500 border border-slate-200",
  "In Progress": "bg-blue-100 text-blue-600 border border-blue-200",
  "Paused": "bg-yellow-100 text-yellow-600 border border-yellow-200",
  "Done": "bg-emerald-100 text-emerald-600 border border-emerald-200",
};

export default function TaskDetailSidebar({ task, isOpen, onClose, onUpdate, boardProperties = [], columnName = '—' }: TaskDetailSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [editedTask, setEditedTask] = useState<KanbanTask>({ ...task });
  
  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Property creation state
  const [showPropMenu, setShowPropMenu] = useState(false);
  const [addingTaskProp, setAddingTaskProp] = useState<{type: string} | null>(null);
  const [taskPropName, setTaskPropName] = useState("");
  const propMenuRef = useRef<HTMLDivElement>(null);

  // Links
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");

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

  // Handle auto-save on close if timer is running and > 1 minute
  useEffect(() => {
    const handleBeforeUnload = () => {
       if (isTimerRunning && elapsedTime >= 60) {
         handleStopTimer();
       }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
       window.removeEventListener('beforeunload', handleBeforeUnload);
       if (isTimerRunning && elapsedTime >= 60) {
           handleStopTimer();
       }
    };
  }, [isTimerRunning, elapsedTime]);

  const handleStopTimer = () => {
    if (elapsedTime >= 60) {
      const newLog: Timelog = {
        id: genId(),
        date: new Date().toISOString(),
        duration: elapsedTime
      };
      const updatedLogs = [...(editedTask.timelogs || []), newLog];
      const newTotal = (editedTask.totalTime || 0) + elapsedTime;
      handleUpdateField('timelogs', updatedLogs);
      handleUpdateField('totalTime', newTotal);
    }
    setElapsedTime(0);
    setIsTimerRunning(false);
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      handleStopTimer();
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

  const formatShortTime = (seconds: number) => {
    const h = Math.floor(seconds/3600), m = Math.floor((seconds%3600)/60), sec = seconds%60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const handleUpdateField = (field: keyof KanbanTask, value: any) => {
    const updated = { ...editedTask, [field]: value };
    setEditedTask(updated);
    updateTask(task.id, { [field]: value });
    if (onUpdate) onUpdate(updated);
  };

  const handleTaskPropertyChange = (propId: string, value: any) => {
    const currentProps = editedTask.taskProperties || {};
    const updatedProps = { ...currentProps, [propId]: value };
    handleUpdateField('taskProperties', updatedProps);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).map(f => ({
        id: genId(),
        name: f.name,
        size: f.size,
        url: URL.createObjectURL(f) // Mock URL for prototype
      }));
      handleUpdateField('attachments', [...(editedTask.attachments || []), ...files]);
      e.target.value = '';
    }
  };

  // Extract task-specific properties metadata
  const taskPropMetas = Object.entries(editedTask.taskProperties || {})
    .filter(([k]) => k.endsWith("_meta"))
    .map(([k, v]) => ({ id: k.replace("_meta", ""), meta: v as any }));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-[340px] bg-white border-l border-gray-200 z-[100] shadow-2xl flex flex-col font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Task Details</span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <MoreHorizontal size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Title Area */}
        <div className="px-4 pt-4 pb-2 shrink-0">
           <input
             type="text"
             value={editedTask.title}
             onChange={(e) => handleUpdateField('title', e.target.value)}
             className="w-full text-base font-semibold text-gray-900 border-b-2 border-transparent focus:border-indigo-600 outline-none pb-1 transition-colors"
             placeholder="Task Title"
           />
        </div>

        {/* Group + Status */}
        <div className="px-4 py-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs w-20 text-gray-400 shrink-0">Group</span>
            <div className="flex-1 flex justify-end">
              <span className="text-xs font-medium px-2 py-1 rounded-lg bg-gray-100 text-gray-700">{columnName}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs w-20 text-gray-400 shrink-0">Status</span>
            <div className="flex-1 flex justify-end">
              <select
                value={editedTask.status}
                onChange={(e) => handleUpdateField('status', e.target.value)}
                className={cn(
                  "text-xs px-2 py-1 rounded-lg font-medium outline-none cursor-pointer appearance-auto",
                  SC[editedTask.status] || SC["Not Started"]
                )}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mx-4 my-2 border-t border-gray-100" />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            <div className="px-4 space-y-4 pb-6">

              {/* Schedule */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Schedule</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs w-24 text-gray-400 shrink-0">Date</span>
                  <div className="flex-1 flex justify-end">
                    <input 
                      type="date"
                      value={editedTask.date || ''}
                      onChange={(e) => handleUpdateField('date', e.target.value)}
                      className="text-xs rounded-lg px-2 py-1 outline-none w-full border border-gray-200 text-gray-700 bg-gray-50 focus:bg-white focus:border-indigo-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs w-24 text-gray-400 shrink-0">Start Time</span>
                  <div className="flex-1 flex justify-end">
                    <input 
                      type="time"
                      value={editedTask.startTime || ''}
                      onChange={(e) => handleUpdateField('startTime', e.target.value)}
                      className="text-xs rounded-lg px-2 py-1 outline-none w-full border border-gray-200 text-gray-700 bg-gray-50 focus:bg-white focus:border-indigo-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs w-24 text-gray-400 shrink-0">End Time</span>
                  <div className="flex-1 flex justify-end">
                    <input 
                      type="time"
                      value={editedTask.endTime || ''}
                      onChange={(e) => handleUpdateField('endTime', e.target.value)}
                      className="text-xs rounded-lg px-2 py-1 outline-none w-full border border-gray-200 text-gray-700 bg-gray-50 focus:bg-white focus:border-indigo-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              {/* Board Properties */}
              {boardProperties.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Board Properties</span>
                  {boardProperties.map(prop => (
                    <div key={prop.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs w-24 text-gray-400 shrink-0 truncate">{prop.name}</span>
                      <div className="flex-1 flex justify-end">
                         <PropInput 
                           type={prop.type} 
                           options={prop.options || []}
                           value={editedTask.taskProperties?.[prop.id] || ""}
                           onChange={(v) => handleTaskPropertyChange(prop.id, v)}
                         />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Task Properties */}
              {taskPropMetas.length > 0 && (
                <div className="space-y-2 mt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Task Properties</span>
                  {taskPropMetas.map(({id, meta}) => (
                    <div key={id} className="flex items-center justify-between gap-2">
                      <span className="text-xs w-24 text-gray-400 shrink-0 truncate">{meta.name}</span>
                      <div className="flex-1 flex justify-end">
                         <PropInput 
                           type={meta.type} 
                           options={meta.options || []}
                           value={editedTask.taskProperties?.[id] || ""}
                           onChange={(v) => handleTaskPropertyChange(id, v)}
                         />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Property Button */}
              <div className="mt-2 relative" ref={propMenuRef}>
                 <button onClick={() => setShowPropMenu(!showPropMenu)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="text-base font-light">+</span> Add property
                 </button>
                 {showPropMenu && (
                    <div className="absolute top-full left-0 mt-1 rounded-xl shadow-lg z-30 overflow-hidden w-40 bg-white border border-gray-200">
                       {PROP_TYPES.map(t => (
                         <button key={t} onClick={() => { setAddingTaskProp({type: t}); setShowPropMenu(false); }}
                           className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 text-gray-700 capitalize">
                           <span className="font-mono text-xs w-4 text-center text-gray-400">{PROP_ICONS[t]}</span>{t}
                         </button>
                       ))}
                    </div>
                 )}
              </div>

              {addingTaskProp && (
                 <div className="mt-2 p-2.5 rounded-xl space-y-2 bg-gray-50 border border-gray-200">
                    <input className="w-full text-xs rounded-lg px-2 py-1.5 outline-none border border-gray-200 text-gray-700"
                      placeholder="Property name" value={taskPropName} onChange={e => setTaskPropName(e.target.value)} autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => {
                        if (taskPropName.trim()) {
                          const id = genId();
                          const updatedProps = {
                             ...editedTask.taskProperties,
                             [`${id}_meta`]: { name: taskPropName.trim(), type: addingTaskProp.type },
                             [id]: ""
                          };
                          handleUpdateField('taskProperties', updatedProps);
                          setAddingTaskProp(null);
                          setTaskPropName("");
                        }
                      }} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
                      <button onClick={() => setAddingTaskProp(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                 </div>
              )}

              <div className="my-4 border-t border-gray-100" />

              {/* Description */}
              <div>
                 <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Description</span>
                 <textarea
                   value={editedTask.description || ''}
                   onChange={(e) => handleUpdateField('description', e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-indigo-500 transition-all resize-none min-h-[80px] placeholder:text-gray-400"
                   placeholder="Add a description..."
                 />
              </div>

              <div className="my-4 border-t border-gray-100" />

              {/* Attachments */}
              <div>
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">Attachments</span>
                   <button onClick={() => fileRef.current?.click()} className="text-xs font-medium text-indigo-600">+ Add</button>
                 </div>
                 <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileUpload}/>
                 {!(editedTask.attachments || []).length && (
                   <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl py-3 text-xs text-center border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 transition-all">
                     Drop files or click to attach
                   </button>
                 )}
                 {(editedTask.attachments || []).map(att => (
                   <div key={att.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-1 bg-gray-50 border border-gray-100">
                     <Paperclip size={14} className="text-gray-400 shrink-0" />
                     <span className="text-xs truncate flex-1 text-gray-700">{att.name}</span>
                     <button onClick={() => handleUpdateField('attachments', editedTask.attachments?.filter(a => a.id !== att.id))} className="text-xs text-rose-500 hover:text-rose-600 shrink-0"><X size={14}/></button>
                   </div>
                 ))}
              </div>

              <div className="my-4 border-t border-gray-100" />

              {/* Links */}
              <div>
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">Links</span>
                   <button onClick={() => setAddingLink(!addingLink)} className="text-xs font-medium text-indigo-600">+ Add</button>
                 </div>
                 {addingLink && (
                   <div className="mb-3 space-y-2">
                     <input className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none border border-gray-200" placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} />
                     <input className="w-full text-xs rounded-lg px-2.5 py-1.5 outline-none border border-gray-200" placeholder="Label (optional)" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} />
                     <div className="flex gap-2">
                       <button onClick={() => {
                         if (newLinkUrl.trim()) {
                           const newLink = { id: genId(), url: newLinkUrl, label: newLinkLabel || newLinkUrl };
                           handleUpdateField('links', [...(editedTask.links || []), newLink]);
                           setNewLinkUrl(""); setNewLinkLabel(""); setAddingLink(false);
                         }
                       }} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-indigo-600">Add</button>
                       <button onClick={() => setAddingLink(false)} className="text-xs text-gray-400">Cancel</button>
                     </div>
                   </div>
                 )}
                 {(editedTask.links || []).map(link => (
                   <div key={link.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-1 bg-gray-50 border border-gray-100">
                     <LinkIcon size={14} className="text-gray-400 shrink-0" />
                     <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs truncate flex-1 text-indigo-600 hover:underline">{link.label}</a>
                     <button onClick={() => handleUpdateField('links', editedTask.links?.filter(l => l.id !== link.id))} className="text-xs text-rose-500 hover:text-rose-600 shrink-0"><X size={14}/></button>
                   </div>
                 ))}
              </div>

              <div className="my-4 border-t border-gray-100" />

              {/* Time Log */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Time Log</span>
                <div className="rounded-xl p-3 mt-2 text-center bg-indigo-50/50 border border-indigo-100">
                  <div className="text-2xl font-mono font-bold mb-2 text-gray-900 tracking-wider">
                    {formatTime(elapsedTime)}
                  </div>
                  {!isTimerRunning ? (
                    <button onClick={handleToggleTimer} className="px-5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm">
                      ▶ Start
                    </button>
                  ) : (
                    <button onClick={handleToggleTimer} className="px-5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sm">
                      ■ Stop
                    </button>
                  )}
                  {isTimerRunning && <p className="text-[10px] mt-2 text-indigo-500 font-medium">Auto-saves &gt; 1m. Stops on close.</p>}
                </div>

                {(editedTask.timelogs || []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    {editedTask.timelogs?.map((log, i) => (
                      <div key={log.id} className="flex justify-between items-center rounded-lg px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-100">
                        <span className="text-gray-500">Session {i+1}</span>
                        <span className="font-medium text-gray-700">{formatShortTime(log.duration)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-100 mt-2">
                      <span className="text-indigo-700">Total</span>
                      <span className="text-indigo-600">{formatShortTime(editedTask.totalTime || 0)}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PropInput({ type, value, options = [], onChange }: any) {
  const cls = "text-xs rounded-lg px-2 py-1 outline-none w-full border border-gray-200 text-gray-700 bg-gray-50 focus:bg-white focus:border-indigo-400 transition-colors";
  if (type === "text") return <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} />;
  if (type === "number") return <input type="number" className={cls} value={value} onChange={e => onChange(e.target.value)} />;
  if (type === "link") return <input type="url" className={cls} value={value} placeholder="https://…" onChange={e => onChange(e.target.value)} />;
  if (type === "date") return <input type="date" className={cls} value={value} onChange={e => onChange(e.target.value)} />;
  if (type === "dropdown") return (
    <select className={cn(cls, "appearance-auto")} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Select…</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return null;
}
