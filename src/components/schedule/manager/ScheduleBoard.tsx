import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Columns, 
  Calendar as CalendarIcon, 
  SplitSquareHorizontal, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Layers, 
  Settings2,
  Plus,
  Bot,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { 
  subscribeTasks, 
  subscribeCalendarBlocks, 
  subscribeLabels,
  updateTask,
  bulkUpdateTasks,
  createTask,
  applyAgentActions
} from '../../../services/scheduleService';
import { generateText } from '../../../services/gemini';
import type { 
  KanbanTask, 
  CalendarBlock, 
  TaskLabel, 
  TaskStatus, 
  TaskPriority,
  KanbanBoard 
} from '../../../services/scheduleTypes';
import AdvancedKanbanBoard from '../AdvancedKanbanBoard';
import AdvancedCalendarView from '../AdvancedCalendarView';
import TaskDetailSidebar from '../../TaskDetailSidebar';
import CreateBoardModal from './CreateBoardModal';

interface ScheduleBoardProps {
  missionId?: string | null;
  initialView?: 'kanban' | 'calendar';
}

export default function ScheduleBoard({ missionId = null, initialView = 'kanban' }: ScheduleBoardProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>(initialView);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  // Menus and view settings
  const [activeMenu, setActiveMenu] = useState<'filter' | 'sort' | 'display' | null>(null);
  const [sortBy, setSortBy] = useState<string>('kanbanOrder');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [displayProps, setDisplayProps] = useState<Record<string, boolean>>({
    dueDate: true,
    labels: true,
    assignees: true,
    estimatedPoints: false,
    priority: true,
    subtasks: true
  });

  // Temporal Agent State
  const [agentMessages, setAgentMessages] = useState<{role: 'user' | 'agent', text: string}[]>([
    { role: 'agent', text: "Hello! I'm your Temporal Agent. I can help you reorganize your schedule, balance your workload, or automatically map out your study plan. What would you like to do?" }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  // Advanced Controls
  const [groupBy, setGroupBy] = useState<string>('status');
  const [subGroupBy, setSubGroupBy] = useState<string | null>(null);

  // Multi-Board State
  const [boards, setBoards] = useState<KanbanBoard[]>([
    {
      id: 'default',
      title: 'Main Board',
      groupByProperty: 'status',
      columns: [
        { id: 'Backlog', title: 'Backlog', order: 1, icon: '📋' },
        { id: 'Unstarted', title: 'Unstarted', order: 2, icon: '⏳' },
        { id: 'In Progress', title: 'In Progress', order: 3, icon: '🔥' },
        { id: 'Completed', title: 'Completed', order: 4, icon: '✅' },
        { id: 'Cancelled', title: 'Cancelled', order: 5, icon: '🚫' }
      ]
    },
    {
      id: 'urgent',
      title: 'Urgent Issues',
      groupByProperty: 'status',
      columns: [
        { id: 'To Do', title: 'To Do', order: 1, icon: '🔴' },
        { id: 'Doing', title: 'Doing', order: 2, icon: '⚡' },
        { id: 'Done', title: 'Done', order: 3, icon: '✅' }
      ]
    }
  ]);
  const [currentBoardId, setCurrentBoardId] = useState('default');
  const currentBoard = boards.find(b => b.id === currentBoardId) || boards[0];

  const handleAgentSubmit = async () => {
    if (!agentInput.trim() || isAgentThinking) return;
    
    const userPrompt = agentInput;
    setAgentInput('');
    setAgentMessages(prev => [...prev, { role: 'user', text: userPrompt }]);
    setIsAgentThinking(true);

    try {
      const systemInstruction = `You are the Temporal Agent for Memree (Digital Study Assistant).
      Your goal is to help students manage their time, schedules, and study plans.
      You have access to their tasks and calendar blocks.
      
      Current Tasks: ${JSON.stringify(tasks.slice(0, 10))}
      Current Calendar: ${JSON.stringify(blocks.slice(0, 10))}
      
      Respond helpfully and suggest concrete scheduling changes if appropriate.
      If you need to move tasks, describe what you would do.`;

      const responseText = await generateText(userPrompt, systemInstruction);
      setAgentMessages(prev => [...prev, { role: 'agent', text: responseText }]);
    } catch (error) {
      console.error("Agent Error:", error);
      setAgentMessages(prev => [...prev, { role: 'agent', text: "I encountered an error while analyzing your schedule. Please try again." }]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleAddColumn = (title: string) => {
    const newColId = title.replace(/\s+/g, '_').toLowerCase();
    const newColumns = [
      ...(currentBoard.columns || []),
      { id: newColId, title, order: (currentBoard.columns?.length || 0) + 1, icon: '📁' }
    ];
    setBoards(prev => prev.map(b => b.id === currentBoardId ? { ...b, columns: newColumns } : b));
  };

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  const handleCreateBoard = (newBoard: KanbanBoard) => {
    setBoards(prev => [...prev, newBoard]);
    setCurrentBoardId(newBoard.id);
    setIsCreateBoardOpen(false);
  };

  useEffect(() => {
    const unsubTasks = subscribeTasks(setTasks, missionId);
    
    // Default week range for calendar
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const unsubBlocks = subscribeCalendarBlocks(formatDate(start), formatDate(end), setBlocks, missionId);
    const unsubLabels = subscribeLabels(setLabels);

    return () => {
      unsubTasks();
      unsubBlocks();
      unsubLabels();
    };
  }, [missionId]);

  const filteredTasks = tasks.filter(t => 
    (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (t.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'kanbanOrder') return a.kanbanOrder - b.kanbanOrder;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'priority') {
      const pMap = { critical: 4, high: 3, medium: 2, low: 1 };
      return pMap[b.priority] - pMap[a.priority];
    }
    if (sortBy === 'dueDate') {
      const aTime = a.dueDate ? new Date(a.dueDate.seconds ? a.dueDate.toDate() : a.dueDate).getTime() : Infinity;
      const bTime = b.dueDate ? new Date(b.dueDate.seconds ? b.dueDate.toDate() : b.dueDate).getTime() : Infinity;
      return aTime - bTime;
    }
    return 0;
  });

  const handleCreateTask = async (columnId: string, title: string) => {
    const newTask: Omit<KanbanTask, 'id'> = {
      title,
      subject: missionId ? 'Mission Task' : 'General',
      topic: 'New Task',
      missionId,
      priority: 'medium',
      status: (groupBy === 'status' ? columnId : 'Unstarted') as TaskStatus,
      dueDate: null,
      estimatedDuration: 30,
      actualDuration: 0,
      kanbanOrder: tasks.length + 1,
      completedAt: null,
      linkedCalendarBlockId: null,
      sourceReference: null,
      subtasks: [],
      linkedPYQIds: [],
      labelIds: [],
      assigneeIds: [],
      attachmentCount: 0,
      linkCount: 0,
      parentTaskId: null,
      mode: 'scholar',
      subjectColour: '#6366f1',
      createdFrom: 'manual',
      customProperties: groupBy !== 'status' ? { [groupBy]: columnId } : {},
      dependencies: [],
      timelogs: []
    };
    await createTask(newTask);
  };

  const handleDragEnd = async (result: any) => {
    const { active, over } = result;
    if (!over || active.id === over.id) return;
    
    // Simplistic DND for now: Update the group property
    const activeId = active.id;
    const overId = over.id; // column ID
    
    if (groupBy === 'status') {
       await updateTask(activeId, { status: overId as TaskStatus });
    } else {
       // Update custom property
       const taskToUpdate = tasks.find(t => t.id === activeId);
       if (taskToUpdate) {
         const updatedCustomProps = { ...taskToUpdate.customProperties, [groupBy]: overId };
         await updateTask(activeId, { customProperties: updatedCustomProps });
       }
    }
  };

  return (
    <div className="flex w-full h-full bg-[#f8fafc] overflow-hidden">
      
      {/* Main Board Area */}
      <div className={cn("flex-1 flex flex-col h-full transition-all duration-300", isAgentOpen ? "mr-[320px]" : "")}>
        {/* Toolbar - DUB Style */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-3 rounded-t-xl md:rounded-tl-none border-b border-gray-100 shadow-sm shrink-0 z-10 relative">
          <div className="flex items-center gap-2">
            
            {/* Board Switcher */}
            <div className="relative group">
               <select 
                 value={currentBoardId}
                 onChange={(e) => setCurrentBoardId(e.target.value)}
                 className="appearance-none bg-white border border-gray-200 text-gray-900 font-black text-sm rounded-xl pl-4 pr-10 py-2 outline-none hover:bg-gray-50 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
               >
                 {boards.map(b => (
                   <option key={b.id} value={b.id}>{b.title}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            <button 
              onClick={() => setIsCreateBoardOpen(true)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
              title="Create New Board"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1" />

            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", 
                  viewMode === 'kanban' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Columns className="w-4 h-4" /> Kanban
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", 
                  viewMode === 'calendar' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <CalendarIcon className="w-4 h-4" /> Calendar
              </button>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1" />

            <div className="flex items-center gap-1 relative">
               <button 
                 onClick={() => setActiveMenu(activeMenu === 'filter' ? null : 'filter')}
                 className={cn("p-2 rounded-lg transition-colors", activeMenu === 'filter' ? "bg-gray-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")} 
                 title="Filter"
               >
                  <Filter className="w-4 h-4" />
               </button>
               {activeMenu === 'filter' && (
                 <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-xl p-3 z-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filters</h4>
                    <p className="text-xs text-gray-400">Filters coming soon.</p>
                 </div>
               )}

               <button 
                 onClick={() => setActiveMenu(activeMenu === 'sort' ? null : 'sort')}
                 className={cn("p-2 rounded-lg transition-colors", activeMenu === 'sort' ? "bg-gray-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")} 
                 title="Sort"
               >
                  <ArrowUpDown className="w-4 h-4" />
               </button>
               {activeMenu === 'sort' && (
                 <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-xl p-3 z-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sort By</h4>
                    <div className="space-y-1">
                      {['kanbanOrder', 'dueDate', 'priority', 'title'].map(field => (
                        <button 
                          key={field}
                          onClick={() => { setSortBy(field); setActiveMenu(null); }}
                          className={cn("w-full text-left px-2 py-1.5 rounded-lg text-sm", sortBy === field ? "bg-indigo-50 text-indigo-600 font-medium" : "hover:bg-gray-50 text-gray-700")}
                        >
                          {field === 'kanbanOrder' ? 'Custom Order' : field.charAt(0).toUpperCase() + field.slice(1)}
                        </button>
                      ))}
                    </div>
                 </div>
               )}

               <button 
                 onClick={() => setActiveMenu(activeMenu === 'display' ? null : 'display')}
                 className={cn("p-2 rounded-lg transition-colors", activeMenu === 'display' ? "bg-gray-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")} 
                 title="Display Properties"
               >
                  <Settings2 className="w-4 h-4" />
               </button>
               {activeMenu === 'display' && (
                 <div className="absolute top-full mt-2 left-0 w-56 bg-white border border-gray-100 shadow-xl rounded-xl p-3 z-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Display Properties</h4>
                    <div className="space-y-2">
                      {Object.keys(displayProps).map(prop => (
                        <label key={prop} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={displayProps[prop]} 
                            onChange={(e) => setDisplayProps(prev => ({ ...prev, [prop]: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">{prop.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-indigo-100 transition-all outline-none"
              />
            </div>
            
            <button 
              onClick={() => setIsAgentOpen(!isAgentOpen)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm border",
                isAgentOpen ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
              )}
            >
              <Bot className="w-4 h-4" /> <span className="hidden sm:inline">Temporal Agent</span>
            </button>
          </div>
        </header>

        {/* Board Content */}
        <div className="flex-1 overflow-hidden relative bg-white">
          <AnimatePresence mode="wait">
            {viewMode === 'kanban' ? (
              <motion.div 
                key="kanban"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-hidden"
              >
                <AdvancedKanbanBoard 
                  tasks={filteredTasks}
                  labels={labels}
                  currentBoard={{
                    ...currentBoard,
                    displayProperties: displayProps
                  }}
                  onDragEnd={handleDragEnd}
                  onCreateTask={handleCreateTask}
                  onStatusChange={async (id, status) => {
                    await updateTask(id, { status });
                  }}
                  onTaskClick={(task) => setSelectedTask(task)}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-hidden"
              >
                <AdvancedCalendarView 
                  blocks={blocks}
                  onUpdateBlock={async (id, updates) => {
                    // Update calendar block logic here
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Temporal Agent Sidebar */}
      <AnimatePresence>
        {isAgentOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Bot className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-sm">Temporal Agent</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Schedule Optimizer</p>
                 </div>
               </div>
               <button onClick={() => setIsAgentOpen(false)} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500">
                 <X className="w-4 h-4" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 custom-scrollbar">
               {agentMessages.map((msg, i) => (
                 <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                   {msg.role === 'agent' && (
                     <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                     </div>
                   )}
                   <div className={cn(
                     "p-3 text-sm shadow-sm",
                     msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                        : "bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-tl-sm"
                   )}>
                      {msg.text}
                   </div>
                 </div>
               ))}
               
               {isAgentThinking && (
                 <div className="flex gap-3">
                   <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" />
                   </div>
                   <div className="bg-white p-3 border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
               <div className="relative">
                 <input 
                   type="text" 
                   placeholder="E.g. 'Move all skipped tasks to tomorrow'" 
                   value={agentInput}
                   onChange={e => setAgentInput(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter') handleAgentSubmit();
                   }}
                   disabled={isAgentThinking}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner disabled:opacity-50"
                 />
                 <button 
                   onClick={handleAgentSubmit}
                   disabled={isAgentThinking || !agentInput.trim()}
                   className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
                 >
                   <MessageSquare className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <TaskDetailSidebar 
          task={selectedTask} 
          isOpen={true} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            setSelectedTask(updatedTask);
          }}
        />
      )}

      <AnimatePresence>
        {isCreateBoardOpen && (
          <CreateBoardModal 
            onClose={() => setIsCreateBoardOpen(false)} 
            onCreate={handleCreateBoard} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
