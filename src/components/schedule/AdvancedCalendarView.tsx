import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bot, 
  Plus, 
  Target, 
  GraduationCap,
  Clock,
  Layout,
  Calendar as CalendarIcon,
  CheckCircle2
} from 'lucide-react';
import { 
  format, startOfWeek, addWeeks, subWeeks, isSameDay, 
  startOfMonth, endOfMonth, endOfWeek, addDays, subDays, 
  subMonths, addMonths, isSameMonth 
} from 'date-fns';
import { cn } from '../../lib/utils';
import type { KanbanTask } from '../../services/scheduleTypes';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM

interface AdvancedCalendarViewProps {
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  tasks: KanbanTask[];
  onTaskClick?: (task: KanbanTask) => void;
  onCreateTask?: (dateStr: string, startStr: string, endStr: string) => void;
  onUpdateTask?: (id: string, updates: Partial<KanbanTask>) => void;
  onExport?: () => void;
  onAutoSchedule?: () => void;
}

export default function AdvancedCalendarView({
  currentDate = new Date(),
  setCurrentDate = () => {},
  tasks,
  onTaskClick,
  onCreateTask,
  onUpdateTask,
  onExport,
  onAutoSchedule
}: AdvancedCalendarViewProps) {
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');

  const currentMonthLabel = format(currentDate, 'MMMM yyyy');
  
  const handlePrev = () => {
    if (calendarView === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNext = () => {
    if (calendarView === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (calendarView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  
  const handleToday = () => setCurrentDate(new Date());

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      // Create date from string 'YYYY-MM-DD'
      const [y, m, d] = e.target.value.split('-');
      setCurrentDate(new Date(parseInt(y), parseInt(m)-1, parseInt(d)));
    }
  };

  const getIntensityColor = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100';
    if (minutes < 60) return 'bg-emerald-100';
    if (minutes < 180) return 'bg-emerald-300';
    if (minutes < 300) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  // Render Day/Week View
  const renderTimeGrid = () => {
    const dates = calendarView === 'day' 
      ? [currentDate] 
      : Array.from({ length: 7 }, (_, i) => {
          const date = new Date(startOfWeek(currentDate, { weekStartsOn: 1 }));
          date.setDate(date.getDate() + i);
          return date;
        });

    // Calculate Workload Intensity for Heatmap
    const dailyIntensity = useMemo(() => {
      const intensity: Record<string, number> = {};
      tasks.forEach(t => {
        if (t.date && t.estimatedDuration) {
          intensity[t.date] = (intensity[t.date] || 0) + t.estimatedDuration;
        }
      });
      return intensity;
    }, [tasks]);

    return (
      <div className="flex-1 flex flex-col min-w-[700px]">
        {/* Days Header */}
        <div className={cn("grid border-b border-gray-100 shrink-0 sticky top-0 bg-white z-20", calendarView === 'day' ? "grid-cols-[60px_1fr]" : "grid-cols-[60px_repeat(7,1fr)]")}>
          <div className="w-[60px] flex items-center justify-center border-r border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</div>
          {dates.map((date, i) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const intensity = dailyIntensity[dateStr] || 0;
            
            // All day tasks (tasks with date but no startTime/endTime)
            const allDayTasks = tasks.filter(t => t.date === dateStr && (!t.startTime || !t.endTime));

            return (
              <div key={i} className="pt-3 pb-2 flex flex-col border-l border-gray-100 first:border-l-0 relative group min-h-[60px]">
                {calendarView === 'week' && (
                  <div className="absolute top-0 left-0 right-0 h-1 flex gap-0.5 px-0.5 opacity-60">
                     <div className={cn("flex-1 h-full rounded-b-full transition-colors duration-500", getIntensityColor(intensity))} />
                  </div>
                )}
                
                <div className="text-center mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{format(date, 'EEE')}</span>
                  <div className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black transition-all", 
                    isSameDay(date, new Date()) ? "bg-indigo-600 text-white shadow-lg scale-110" : "text-gray-900 group-hover:bg-gray-50"
                  )}>
                    {format(date, 'd')}
                  </div>
                </div>

                {/* All-Day Tasks Section */}
                {allDayTasks.length > 0 && (
                  <div className="px-1 space-y-1 z-30 mb-2">
                    {allDayTasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => onTaskClick?.(task)}
                        className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded cursor-pointer truncate shadow-sm border-l-2 hover:bg-gray-50",
                          task.status === 'Done' ? "opacity-60 line-through bg-gray-50 border-gray-300" : "bg-white"
                        )}
                        style={{ borderLeftColor: task.status === 'Done' ? undefined : task.subjectColour || '#6366f1' }}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto relative min-h-[900px] custom-scrollbar">
          <div className={cn("grid absolute inset-0", calendarView === 'day' ? "grid-cols-[60px_1fr]" : "grid-cols-[60px_repeat(7,1fr)]")}>
            {/* Vertical Time Labels */}
            <div className="border-r border-gray-100 bg-gray-50/30">
              {HOURS.map(h => (
                <div key={h} className="h-20 border-b border-gray-50 flex flex-col items-center pt-2 group">
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-indigo-600 transition-colors">{h}:00</span>
                  <span className="text-[8px] font-bold text-gray-300 group-hover:text-indigo-300 transition-colors uppercase mt-0.5">{h >= 12 ? 'PM' : 'AM'}</span>
                </div>
              ))}
            </div>

            {/* Interaction Grid */}
            {dates.map((date, dIdx) => (
              <div key={dIdx} className="border-l border-gray-100 first:border-l-0 relative group">
                {HOURS.map(h => {
                  const timeStr = `${h.toString().padStart(2, '0')}:00`;
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const endStr = `${(h+1).toString().padStart(2, '0')}:00`;
                  return (
                    <div
                      key={h}
                      onClick={() => onCreateTask?.(dateStr, timeStr, endStr)}
                      className="h-20 border-b border-gray-50 hover:bg-indigo-50/20 transition-all cursor-pointer flex items-center justify-center group/cell"
                    >
                      <Plus className="w-5 h-5 text-indigo-300 opacity-0 group-hover/cell:opacity-100 transition-all scale-75 group-hover/cell:scale-100" />
                    </div>
                  );
                })}

                {/* Timed Tasks */}
                <AnimatePresence>
                  {tasks.filter(t => t.date === format(date, 'yyyy-MM-dd') && t.startTime && t.endTime).map(task => {
                    const [sH, sM] = (task.startTime || '00:00').split(':');
                    const [eH, eM] = (task.endTime || '00:00').split(':');
                    const startHour = parseInt(sH || '0') || 0;
                    const startMin = parseInt(sM || '0') || 0;
                    const endHour = parseInt(eH || '0') || 0;
                    const endMin = parseInt(eM || '0') || 0;
                    
                    const top = (startHour - 8) * 80 + (startMin / 60) * 80;
                    let height = ((endHour - startHour) * 60 + (endMin - startMin)) / 60 * 80;
                    if (height < 20) height = 20;

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2, zIndex: 10, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        key={task.id}
                        onClick={(e) => {
                           e.stopPropagation();
                           onTaskClick?.(task);
                        }}
                        className={cn(
                          "absolute left-1.5 right-1.5 rounded-2xl p-2.5 shadow-sm border-l-4 flex flex-col overflow-hidden cursor-pointer transition-all bg-white ring-1 ring-inset ring-gray-100 z-10",
                          task.status === 'Done' && "opacity-60"
                        )}
                        style={{
                          top: `${top}px`,
                          height: `${height - 4}px`,
                          borderLeftColor: task.subjectColour || '#6366f1'
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          {task.subject && (
                            <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{task.subject}</span>
                          )}
                          {task.mode === 'sniper' ? <Target className="w-3.5 h-3.5 text-emerald-600 ml-auto" /> : <GraduationCap className="w-3.5 h-3.5 text-indigo-600 ml-auto" />}
                        </div>
                        
                        <p className="text-[11px] font-bold text-gray-600 leading-tight line-clamp-2 mb-2">{task.title}</p>
                        
                        {height > 40 && (
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              <Clock className="w-3 h-3" />
                              {task.startTime}
                            </div>
                            {task.estimatedDuration && (
                              <div className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-500 uppercase">
                                {task.estimatedDuration}m
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status Indicator Bar */}
                        {task.status === 'Done' && (
                          <div className="absolute top-0 right-0 p-1">
                             <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const monthDates = [];
    let day = startDate;
    while (day <= endDate) {
      monthDates.push(day);
      day = addDays(day, 1);
    }

    const weeks = [];
    for (let i = 0; i < monthDates.length; i += 7) {
      weeks.push(monthDates.slice(i, i + 7));
    }

    return (
      <div className="flex-1 flex flex-col min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-gray-100 shrink-0 sticky top-0 bg-white z-20">
           {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
             <div key={dayName} className="py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100 first:border-l-0">
               {dayName}
             </div>
           ))}
        </div>
        <div className="flex-1 grid auto-rows-fr bg-gray-100 gap-px">
           {weeks.map((week, wIdx) => (
             <div key={wIdx} className="grid grid-cols-7 gap-px">
               {week.map((date, dIdx) => {
                 const dateStr = format(date, 'yyyy-MM-dd');
                 const isCurrentMonth = isSameMonth(date, currentDate);
                 const isToday = isSameDay(date, new Date());
                 const dayTasks = tasks.filter(t => t.date === dateStr);

                 return (
                   <div 
                     key={dIdx} 
                     className={cn(
                       "bg-white p-2 flex flex-col min-h-[100px] transition-colors hover:bg-gray-50 group cursor-pointer",
                       !isCurrentMonth && "opacity-50 bg-gray-50/50"
                     )}
                     onClick={() => onCreateTask?.(dateStr, "10:00", "11:00")}
                   >
                     <div className="flex items-center justify-between mb-2">
                       <span className={cn(
                         "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all",
                         isToday ? "bg-indigo-600 text-white" : "text-gray-700"
                       )}>
                         {format(date, 'd')}
                       </span>
                       <Plus className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                     </div>
                     <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={(e) => { e.stopPropagation(); onTaskClick?.(task); }}
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-1 rounded truncate shadow-sm border-l-2 transition-all hover:brightness-95",
                              task.status === 'Done' ? "opacity-60 line-through bg-gray-100 border-gray-300" : "bg-white border border-gray-100"
                            )}
                            style={{ borderLeftColor: task.status === 'Done' ? undefined : task.subjectColour || '#6366f1' }}
                            title={task.title}
                          >
                            {task.startTime && <span className="font-medium mr-1 opacity-70">{task.startTime}</span>}
                            {task.title}
                          </div>
                        ))}
                     </div>
                   </div>
                 );
               })}
             </div>
           ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] border border-gray-100 overflow-hidden w-full">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <CalendarIcon className="w-5 h-5 text-indigo-600" />
             <input 
                type="date"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={handleDateChange}
                className="text-base font-black text-gray-900 tracking-tight outline-none bg-transparent hover:bg-gray-50 rounded px-1 cursor-pointer"
             />
          </div>
          <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
            <button onClick={handleToday} className="px-3 py-1 text-[10px] font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest">Today</button>
            <button onClick={handleNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
             <button 
               onClick={() => setCalendarView('day')}
               className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-all", calendarView === 'day' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
             >
               Day
             </button>
             <button 
               onClick={() => setCalendarView('week')}
               className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-all", calendarView === 'week' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
             >
               Week
             </button>
             <button 
               onClick={() => setCalendarView('month')}
               className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-all", calendarView === 'month' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
             >
               Month
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex custom-scrollbar bg-white">
        {calendarView === 'month' ? renderMonthGrid() : renderTimeGrid()}
      </div>
    </div>
  );
}
