import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Columns, 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Settings2,
  Plus,
  Bot,
  X,
  MessageSquare,
  ChevronDown,
  List as ListIcon
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { 
  subscribeTasks, 
  subscribeCalendarBlocks, 
  subscribeLabels,
  updateTask,
  createTask,
  deleteTask
} from '../../../services/scheduleService';
import { generateText } from '../../../services/gemini';
import type { 
  KanbanTask, 
  CalendarBlock, 
  TaskLabel, 
  TaskStatus, 
  KanbanBoard 
} from '../../../services/scheduleTypes';
import AdvancedKanbanBoard from '../AdvancedKanbanBoard';
import AdvancedCalendarView from '../AdvancedCalendarView';
import TaskDetailSidebar from '../../TaskDetailSidebar';
import CreateBoardModal from './CreateBoardModal';
import CreatePropModal from './CreatePropModal';
import BoardPropsModal from './BoardPropsModal';
import ScheduleListView from './ScheduleListView';
import SortModal, { SortConfig } from './SortModal';
import FilterModal from './FilterModal';

interface ScheduleBoardProps {
  missionId?: string | null;
  initialView?: 'kanban' | 'calendar' | 'list';
}

const AGENT_SYS = `You are Temporal Agent — an intelligent assistant embedded in a project management app. You help users manage tasks, boards, columns, and workflow through natural language.

You have access to:
- Multiple kanban boards (each with columns and cards)
- Tasks and their states
- Card properties, statuses (Not Started / In Progress / Paused / Done), groups (column names)

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no code blocks, no extra text. Format:
{
  "message": "Short friendly confirmation of what you did",
  "actions": []
}

Available action types (use exact field names):
- Create card on board:       {"type":"create_card","boardId":"<id>","columnId":"<id>","title":"<str>","status":"Not Started|In Progress|Paused|Done"}
- Update card on board:       {"type":"update_card","boardId":"<id>","columnId":"<id>","cardId":"<id>","updates":{"title":"","status":"","description":""}}
- Delete card on board:       {"type":"delete_card","boardId":"<id>","columnId":"<id>","cardId":"<id>"}
- Create column on board:     {"type":"create_column","boardId":"<id>","name":"<str>","emoji":"<emoji>"}
- Create new board:           {"type":"create_board","name":"<str>","columns":[{"name":"","emoji":""}]}
- Create schedule task:       {"type":"create_schedule_task","title":"<str>","status":"Not Started|In Progress|Paused|Done"}
- Update schedule task:       {"type":"update_schedule_task","taskId":"<id>","updates":{"title":"","status":""}}

Rules:
- Use the app state provided to find exact IDs — never guess or make up IDs
- Default to the active board when boardId is ambiguous
- Create multiple actions for multiple items
- If the request is unclear, set actions:[] and ask in message`;

export default function ScheduleBoard({ missionId = null, initialView = 'kanban' }: ScheduleBoardProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar' | 'list'>(initialView);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  // Menus and view settings
  const [activeMenu, setActiveMenu] = useState<'display' | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'kanbanOrder', order: 'asc' });
  const [filterConfig, setFilterConfig] = useState<{ field: string | null; value: any }>({ field: null, value: '' });
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [displayProps, setDisplayProps] = useState<Record<string, boolean>>({
    dueDate: true,
    labels: true,
    assignees: true,
    estimatedPoints: false,
    priority: true,
    subtasks: true
  });

  // Plus Menu
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Temporal Agent State
  const [agentMessages, setAgentMessages] = useState<{role: 'user' | 'agent', text: string}[]>([
    { role: 'agent', text: "Hello! I'm your Temporal Agent. I can help you reorganize your schedule, balance your workload, or automatically map out your study plan. What would you like to do?" }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  // Modals
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isCreatePropOpen, setIsCreatePropOpen] = useState(false);
  const [isBoardPropsOpen, setIsBoardPropsOpen] = useState(false);

  // Multi-Board State
  const [boards, setBoards] = useState<KanbanBoard[]>([
    {
      id: 'default',
      title: 'Main Board',
      groupByProperty: 'status',
      columns: [
        { id: 'Not Started', title: 'Not Started', order: 1, icon: '📋' },
        { id: 'In Progress', title: 'In Progress', order: 2, icon: '⚡' },
        { id: 'Paused', title: 'Paused', order: 3, icon: '⏳' },
        { id: 'Done', title: 'Done', order: 4, icon: '✅' }
      ]
    }
  ]);
  const [currentBoardId, setCurrentBoardId] = useState('default');
  const currentBoard = boards.find(b => b.id === currentBoardId) || boards[0];

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

    const handleMouse = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleMouse);

    return () => {
      unsubTasks();
      unsubBlocks();
      unsubLabels();
      document.removeEventListener("mousedown", handleMouse);
    };
  }, [missionId]);

  const handleCreateTask = async (columnId: string, title: string) => {
    const today = new Date();
    const startStr = today.toTimeString().slice(0, 5);
    const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
    const endStr = nextHour.toTimeString().slice(0, 5);
    
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    const newTask: Omit<KanbanTask, 'id'> = {
      title,
      subject: missionId ? 'Mission Task' : '',
      topic: 'New Task',
      missionId,
      priority: 'medium',
      status: (currentBoard.groupByProperty === 'status' ? columnId : 'Not Started') as TaskStatus,
      dueDate: nextDay.toISOString(),
      date: today.toISOString().split('T')[0],
      startTime: startStr,
      endTime: endStr,
      estimatedDuration: 60,
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
      customProperties: currentBoard.groupByProperty !== 'status' ? { [currentBoard.groupByProperty]: columnId } : {},
      dependencies: [],
      timelogs: [],
      boardIds: [currentBoardId]
    };
    await createTask(newTask);
  };

  const handleAgentSubmit = async () => {
    if (!agentInput.trim() || isAgentThinking) return;
    
    const text = agentInput;
    setAgentInput('');
    setAgentMessages(prev => [...prev, { role: 'user', text }]);
    setIsAgentThinking(true);

    const ctx = {
      activeBoardId: currentBoardId,
      boards: boards.map(b => ({
        id: b.id, name: b.title,
        columns: b.columns?.map(c => ({ id: c.id, name: c.title, emoji: c.icon }))
      })),
      tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, properties: t.customProperties }))
    };

    try {
      const prompt = `Current app state:\n${JSON.stringify(ctx, null, 2)}\n\nUser request: ${text}`;
      const responseText = await generateText(prompt, AGENT_SYS);
      
      let parsed;
      try {
        parsed = JSON.parse(responseText.replace(/^```json|```$/gm, "").trim());
        if (parsed.actions?.length) {
          executeAgentActions(parsed.actions);
        }
        setAgentMessages(prev => [...prev, { role: 'agent', text: parsed.message || "Done!" }]);
      } catch (err) {
        setAgentMessages(prev => [...prev, { role: 'agent', text: responseText }]);
      }

    } catch (error) {
      console.error("Agent Error:", error);
      setAgentMessages(prev => [...prev, { role: 'agent', text: "I encountered an error while analyzing your schedule. Please try again." }]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const executeAgentActions = async (actions: any[]) => {
    for (const a of actions) {
      if (a.type === "create_card" || a.type === "create_schedule_task") {
         await handleCreateTask(a.columnId || 'Not Started', a.title);
      } else if (a.type === "update_card" || a.type === "update_schedule_task") {
         await updateTask(a.cardId || a.taskId, a.updates);
      } else if (a.type === "delete_card") {
         await deleteTask(a.cardId);
      } else if (a.type === "create_column") {
         handleAddColumn(a.name, a.emoji);
      } else if (a.type === "create_board") {
         const nb: KanbanBoard = {
           id: `board_${Date.now()}`,
           title: a.name,
           groupByProperty: 'status',
           columns: a.columns.map((c: any, i: number) => ({ id: c.name.toLowerCase().replace(/\s+/g, '_'), title: c.name, order: i + 1, icon: c.emoji || '📁' }))
         };
         setBoards(prev => [...prev, nb]);
         setCurrentBoardId(nb.id);
      }
    }
  };

  const handleAddColumn = (title: string, icon = '📁') => {
    const newColId = title.replace(/\s+/g, '_').toLowerCase();
    const newColumns = [
      ...(currentBoard.columns || []),
      { id: newColId, title, order: (currentBoard.columns?.length || 0) + 1, icon }
    ];
    setBoards(prev => prev.map(b => b.id === currentBoardId ? { ...b, columns: newColumns } : b));
  };

  const handleUpdateColumn = (columnId: string, updates: any) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== currentBoardId) return b;
      return {
        ...b,
        columns: b.columns?.map(c => c.id === columnId ? { ...c, ...updates } : c)
      };
    }));
  };

  const handleCreateBoard = (newBoard: KanbanBoard) => {
    setBoards(prev => [...prev, newBoard]);
    setCurrentBoardId(newBoard.id);
    setIsCreateBoardOpen(false);
  };

  const handleDragEnd = async (result: any) => {
    const { active, over } = result;
    if (!over || active.id === over.id) return;
    
    const activeId = active.id;
    const overId = over.id; // column ID
    
    if (currentBoard.groupByProperty === 'status') {
       await updateTask(activeId, { status: overId as TaskStatus });
    } else {
       const taskToUpdate = tasks.find(t => t.id === activeId);
       if (taskToUpdate) {
         const updatedCustomProps = { ...taskToUpdate.customProperties, [currentBoard.groupByProperty]: overId };
         await updateTask(activeId, { customProperties: updatedCustomProps });
       }
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchSearch = (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (t.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    if (!matchSearch) return false;

    if (filterConfig.field && filterConfig.value) {
      if (filterConfig.field === 'status') return t.status === filterConfig.value;
      if (filterConfig.field === 'priority') return t.priority === filterConfig.value;
      
      const val = (t as any)[filterConfig.field] || 
                  t.customProperties?.[filterConfig.field] || 
                  t.taskProperties?.[filterConfig.field];
      return String(val) === String(filterConfig.value);
    }

    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortConfig.field === 'kanbanOrder') cmp = a.kanbanOrder - b.kanbanOrder;
    else if (sortConfig.field === 'priority') {
      const pMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      cmp = (pMap[a.priority] || 0) - (pMap[b.priority] || 0);
    }
    else if (sortConfig.field === 'date') {
      const aTime = a.dueDate ? new Date(a.dueDate.seconds ? a.dueDate.toDate() : a.dueDate).getTime() : Infinity;
      const bTime = b.dueDate ? new Date(b.dueDate.seconds ? b.dueDate.toDate() : b.dueDate).getTime() : Infinity;
      cmp = aTime - bTime;
    }
    else if (sortConfig.field === 'duration') {
      cmp = (a.totalTime || 0) - (b.totalTime || 0);
    }
    else if (sortConfig.field === 'status') {
      cmp = a.status.localeCompare(b.status);
    }
    
    return sortConfig.order === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="flex w-full h-full bg-[#f8fafc] overflow-hidden">
      
      {/* Main Board Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 h-full transition-all duration-300", isAgentOpen ? "mr-[320px]" : "")}>
        {/* Toolbar */}
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

            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", 
                  viewMode === 'list' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ListIcon className="w-4 h-4" /> List
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", 
                  viewMode === 'kanban' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Columns className="w-4 h-4" /> Board
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
                 onClick={() => setIsFilterModalOpen(true)}
                 className={cn("p-2 rounded-lg transition-colors", filterConfig.field ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")} 
               >
                  <Filter className="w-4 h-4" />
               </button>

               <button 
                 onClick={() => setIsSortModalOpen(true)}
                 className={cn("p-2 rounded-lg transition-colors", sortConfig.field !== 'kanbanOrder' ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")} 
               >
                  <ArrowUpDown className="w-4 h-4" />
               </button>

               <button 
                 onClick={() => setActiveMenu(activeMenu === 'display' ? null : 'display')}
                 className={cn("p-2 rounded-lg transition-colors", activeMenu === 'display' ? "bg-gray-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")} 
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
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-indigo-100 transition-all outline-none"
              />
            </div>

            <button 
              onClick={() => setIsBoardPropsOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
            >
              Properties
            </button>

            <button 
              onClick={() => setIsAgentOpen(!isAgentOpen)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm border",
                isAgentOpen ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
              )}
            >
              <Bot className="w-4 h-4" /> <span className="hidden sm:inline">Agent</span>
            </button>

            <div className="relative" ref={plusMenuRef}>
              <button 
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-white font-black bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                +
              </button>
              {showPlusMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50">
                   {[
                     { icon: "📋", label: "New Board", action: () => { setIsCreateBoardOpen(true); setShowPlusMenu(false); } },
                     { icon: "📁", label: "New Column", action: () => { 
                       const name = prompt("Enter column name:");
                       if (name) handleAddColumn(name);
                       setShowPlusMenu(false); 
                     }},
                     { icon: "🏷️", label: "New Property", action: () => { setIsCreatePropOpen(true); setShowPlusMenu(false); } }
                   ].map(item => (
                     <button 
                       key={item.label}
                       onClick={item.action}
                       className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                     >
                       <span>{item.icon}</span> {item.label}
                     </button>
                   ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Board Content */}
        <div className="flex-1 overflow-hidden relative bg-white">
          <AnimatePresence mode="wait">
            {viewMode === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-hidden"
              >
                <ScheduleListView 
                  tasks={filteredTasks}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onCreateTask={(title) => handleCreateTask('Not Started', title)}
                  onUpdateTask={async (id, updates) => { await updateTask(id, updates as any); }}
                />
              </motion.div>
            )}

            {viewMode === 'kanban' && (
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
                  onAddColumn={(title) => handleAddColumn(title)}
                  onUpdateColumn={handleUpdateColumn}
                />
              </motion.div>
            )}
            
            {viewMode === 'calendar' && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-hidden"
              >
                <AdvancedCalendarView 
                  tasks={filteredTasks}
                  onTaskClick={(task) => setSelectedTask(task)}
                  onCreateTask={async (dateStr, startStr, endStr) => {
                     const newTask: Omit<KanbanTask, 'id'> = {
                        title: 'New Task',
                        subject: missionId ? 'Mission Task' : '',
                        topic: 'New Task',
                        missionId,
                        priority: 'medium',
                        status: 'Not Started',
                        dueDate: null,
                        date: dateStr,
                        startTime: startStr,
                        endTime: endStr,
                        estimatedDuration: 60,
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
                        customProperties: {},
                        dependencies: [],
                        timelogs: [],
                        boardIds: [currentBoardId]
                      };
                      await createTask(newTask);
                  }}
                  onUpdateTask={async (id, updates) => {
                    await updateTask(id, updates);
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
                   placeholder="Ask me to manage your board..." 
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
          boardProperties={currentBoard.properties}
          columnName={
            currentBoard.groupByProperty === 'status' 
              ? selectedTask.status 
              : ((selectedTask as any)[currentBoard.groupByProperty] || selectedTask.customProperties?.[currentBoard.groupByProperty] || "—")
          }
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {isCreateBoardOpen && (
          <CreateBoardModal 
            onClose={() => setIsCreateBoardOpen(false)} 
            onCreate={handleCreateBoard} 
            scheduleTasks={tasks}
          />
        )}
      </AnimatePresence>

      {isSortModalOpen && (
        <SortModal 
          currentSort={sortConfig}
          onClose={() => setIsSortModalOpen(false)}
          onApply={setSortConfig}
        />
      )}

      {isFilterModalOpen && (
        <FilterModal 
          currentGroupProp={currentBoard.groupByProperty || 'status'}
          boardProperties={currentBoard.properties || []}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(prop) => {
             setBoards(prev => prev.map(b => b.id === currentBoardId ? { ...b, groupByProperty: prop } : b));
          }}
        />
      )}

      {isCreatePropOpen && (
        <CreatePropModal 
          onClose={() => setIsCreatePropOpen(false)}
          onCreate={(prop) => {
             setBoards(prev => prev.map(b => b.id === currentBoardId ? { ...b, properties: [...(b.properties || []), prop] } : b));
             setIsCreatePropOpen(false);
          }}
        />
      )}

      {isBoardPropsOpen && currentBoard && (
        <BoardPropsModal 
          board={currentBoard}
          onClose={() => setIsBoardPropsOpen(false)}
          onSave={(props) => {
            setBoards(prev => prev.map(b => b.id === currentBoardId ? { ...b, properties: props } : b));
          }}
        />
      )}

    </div>
  );
}
