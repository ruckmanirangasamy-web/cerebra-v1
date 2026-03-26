import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  TouchSensor, 
  MouseSensor,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  CheckCircle2, 
  MoreVertical, 
  Layout, 
  PlusCircle,
  Clock,
  MessageSquare,
  Paperclip,
  Layers,
  ChevronDown,
  ChevronRight,
  Target,
  GraduationCap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { 
  KanbanTask, 
  TaskStatus, 
  KanbanBoard, 
  TaskPriority, 
  TaskLabel 
} from '../../services/scheduleTypes';

interface AdvancedKanbanBoardProps {
  tasks: KanbanTask[];
  labels?: TaskLabel[];
  currentBoard: KanbanBoard;
  onDragEnd: (e: any) => void;
  onDeleteTask?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
  onTaskClick?: (task: KanbanTask) => void;
  onCreateTask?: (columnId: string, title: string) => void;
  onAddColumn?: (title: string) => void;
}

const PRIORITY_META: Record<TaskPriority, { color: string, bg: string, icon: string }> = {
  critical: { color: 'text-purple-600', bg: 'bg-purple-50', icon: '🚨' },
  high: { color: 'text-rose-600', bg: 'bg-rose-50', icon: '🔴' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' },
  low: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' },
};

const TaskCard = ({ task, labels = [], onClick, onDelete, onStatusChange, displayProperties }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const taskLabels = labels.filter(l => task.labelIds?.includes(l.id));
  const doneSubtasks = task.subtasks?.filter((s: any) => s.done).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layoutId={`task-${task.id}`}
      onClick={() => onClick?.(task)}
      className={cn(
        "bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col gap-2 relative cursor-pointer",
        isDragging && "shadow-2xl border-indigo-500 z-50"
      )}
    >
      {/* Header: Priority & Subject */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 mr-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider", PRIORITY_META[task.priority as TaskPriority]?.bg, PRIORITY_META[task.priority as TaskPriority]?.color)}>
            {task.priority}
          </span>
          <span className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-tight">{task.subject}</span>
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400">
           <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Labels */}
      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {taskLabels.map(label => (
            <span key={label.id} className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Progress Bar (if subtasks exist) */}
      {totalSubtasks > 0 && (
        <div className="mt-1">
          <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-bold">
            <span>Progress</span>
            <span>{doneSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div className="bg-indigo-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Footer: Metadata */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{new Date(task.dueDate.seconds ? task.dueDate.seconds * 1000 : task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          {task.attachmentCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachmentCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
           {task.mode && (
             <div className="p-1 rounded bg-gray-50 text-gray-400">
               {task.mode === 'scholar' ? <GraduationCap className="w-3 h-3" /> : <Target className="w-3 h-3" />}
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};

const KanbanColumn = ({ column, tasks, labels, creatingTaskIn, setCreatingTaskIn, newTaskTitle, setNewTaskTitle, onCreateTask, onTaskClick, onDeleteTask, onStatusChange }: any) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col shrink-0 transition-all duration-300", 
        isCollapsed ? "w-12" : "w-[300px]",
        isOver && !isCollapsed ? "bg-indigo-50/30 ring-2 ring-indigo-100 ring-inset rounded-2xl" : ""
      )}
    >
      <div className={cn("flex items-center justify-between mb-3 px-2 py-2 sticky top-0 bg-[#f8fafc]/80 backdrop-blur-sm z-10", isCollapsed && "flex-col gap-4")}>
        <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          {!isCollapsed && (
            <h3 className="text-[11px] font-black text-gray-500 flex items-center gap-2 uppercase tracking-widest">
              <span>{column.icon}</span> {column.title}
              <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[9px]">{tasks.length}</span>
            </h3>
          )}
          {isCollapsed && (
             <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[9px] rotate-90">{tasks.length}</span>
          )}
        </div>
        {!isCollapsed && (
          <button onClick={() => setCreatingTaskIn(column.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm bg-white border border-gray-100">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-4 min-h-[200px] custom-scrollbar">
            {creatingTaskIn === column.id && (
              <div className="bg-white p-3 rounded-xl border-2 border-indigo-500 shadow-lg mb-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                      onCreateTask(column.id, newTaskTitle);
                      setCreatingTaskIn(null);
                      setNewTaskTitle('');
                    } else if (e.key === 'Escape') {
                      setCreatingTaskIn(null);
                      setNewTaskTitle('');
                    }
                  }}
                  className="w-full text-xs outline-none font-bold text-gray-900 placeholder:text-gray-300"
                />
              </div>
            )}

            {tasks.map((task: any) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                labels={labels} 
                onClick={onTaskClick} 
                onDelete={onDeleteTask} 
                onStatusChange={onStatusChange} 
              />
            ))}
            
            <button 
              onClick={() => setCreatingTaskIn(column.id)} 
              className="w-full py-3 border border-dashed border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-white transition-all flex items-center justify-center gap-2 bg-white/50"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add New Card
            </button>
          </div>
        </SortableContext>
      )}

      {isCollapsed && (
         <div className="flex-1 border-l border-gray-100 ml-5" />
      )}
    </div>
  );
};

export default function AdvancedKanbanBoard(props: AdvancedKanbanBoardProps) {
  const { tasks, labels = [], currentBoard, onDragEnd, onDeleteTask, onStatusChange, onTaskClick, onCreateTask, onAddColumn } = props;
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [creatingTaskIn, setCreatingTaskIn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Grouping Logic - DUB Style
  const columns = useMemo(() => {
    const prop = currentBoard.groupByProperty || 'status';
    const distinctValues = Array.from(new Set(tasks.map(t => (t as any)[prop] || (t.customProperties as any)?.[prop] || 'None')));
    
    // If grouping by status, use standard order
    if (prop === 'status') {
      return [
        { id: 'Backlog', title: 'Backlog', icon: '📋' },
        { id: 'Unstarted', title: 'Unstarted', icon: '⏳' },
        { id: 'In Progress', title: 'In Progress', icon: '🔥' },
        { id: 'Completed', title: 'Completed', icon: '✅' },
        { id: 'Cancelled', title: 'Cancelled', icon: '🚫' }
      ];
    }

    return distinctValues.map(val => ({
      id: val,
      title: String(val).toUpperCase(),
      icon: '📁'
    }));
  }, [tasks, currentBoard.groupByProperty]);

  const groupedTasks = useMemo(() => {
    const prop = currentBoard.groupByProperty || 'status';
    const groups: Record<string, KanbanTask[]> = {};
    
    columns.forEach(col => groups[col.id] = []);
    
    tasks.forEach(task => {
      const val = (task as any)[prop] || (task.customProperties as any)?.[prop] || 'None';
      if (groups[val]) groups[val].push(task);
      else {
        // Fallback for status if column exists
        if (prop === 'status' && groups[task.status]) groups[task.status].push(task);
      }
    });

    return groups;
  }, [tasks, columns, currentBoard.groupByProperty]);

  const handleDragStart = (e: any) => {
    setActiveTaskId(e.active.id as string);
  };

  const handleDragEndLocal = (e: any) => {
    const { active, over } = e;
    setActiveTaskId(null);
    if (over && active.id !== over.id) {
      onDragEnd(e);
    }
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEndLocal}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-4 px-4 custom-scrollbar h-full w-full bg-[#f8fafc]">
        {columns.map(col => (
          <KanbanColumn 
            key={col.id} 
            column={col} 
            tasks={groupedTasks[col.id] || []} 
            labels={labels}
            creatingTaskIn={creatingTaskIn}
            setCreatingTaskIn={setCreatingTaskIn}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            onCreateTask={onCreateTask}
            onTaskClick={onTaskClick}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
            displayProperties={currentBoard.displayProperties}
          />
        ))}
        
        {/* Add Column Button */}
        <div className="flex flex-col shrink-0 w-[300px] transition-all duration-300">
           {isAddingColumn ? (
             <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <input
                  autoFocus
                  type="text"
                  placeholder="Column title..."
                  value={newColumnTitle}
                  onChange={e => setNewColumnTitle(e.target.value)}
                  onKeyDown={e => {
                     if (e.key === 'Enter' && newColumnTitle.trim() && onAddColumn) {
                       onAddColumn(newColumnTitle.trim());
                       setNewColumnTitle('');
                       setIsAddingColumn(false);
                     } else if (e.key === 'Escape') {
                       setIsAddingColumn(false);
                       setNewColumnTitle('');
                     }
                  }}
                  className="w-full text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                />
                <div className="flex gap-2 mt-2">
                   <button 
                     onClick={() => {
                        if (newColumnTitle.trim() && onAddColumn) {
                          onAddColumn(newColumnTitle.trim());
                          setNewColumnTitle('');
                          setIsAddingColumn(false);
                        }
                     }}
                     className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                   >
                     Add
                   </button>
                   <button 
                     onClick={() => { setIsAddingColumn(false); setNewColumnTitle(''); }}
                     className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors"
                   >
                     Cancel
                   </button>
                </div>
             </div>
           ) : (
             <button 
               onClick={() => setIsAddingColumn(true)}
               className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all border border-dashed border-gray-300 hover:border-gray-400"
             >
               <Plus className="w-4 h-4" /> Add Column
             </button>
           )}
        </div>

      </div>
      <DragOverlay dropAnimation={null}>
        {activeTaskId && activeTask ? (
          <div className="w-[300px] pointer-events-none rotate-2">
             <TaskCard task={activeTask} labels={labels} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
