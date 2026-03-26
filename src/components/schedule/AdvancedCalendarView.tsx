import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Bot, 
  Plus, 
  Target, 
  GraduationCap,
  Clock,
  Layout,
  Calendar as CalendarIcon,
  CheckCircle2
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { cn } from '../../lib/utils';
import type { CalendarBlock } from '../../services/scheduleTypes';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM

interface AdvancedCalendarViewProps {
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  blocks: CalendarBlock[];
  onBlockClick?: (block: CalendarBlock) => void;
  onCreateBlock?: (dateStr: string, startStr: string, endStr: string) => void;
  onUpdateBlock?: (id: string, updates: Partial<CalendarBlock>) => void;
  onExport?: () => void;
  onAutoSchedule?: () => void;
}

export default function AdvancedCalendarView({
  currentDate = new Date(),
  setCurrentDate = () => {},
  blocks,
  onBlockClick,
  onCreateBlock,
  onUpdateBlock,
  onExport,
  onAutoSchedule
}: AdvancedCalendarViewProps) {
  const currentMonthLabel = format(currentDate, 'MMMM yyyy');
  const weekStartObj = startOfWeek(currentDate, { weekStartsOn: 1 });
  
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStartObj);
    date.setDate(date.getDate() + i);
    return date;
  });

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Calculate Workload Intensity for Heatmap
  const dailyIntensity = useMemo(() => {
    const intensity: Record<string, number> = {};
    blocks.forEach(b => {
      intensity[b.date] = (intensity[b.date] || 0) + b.duration;
    });
    return intensity;
  }, [blocks]);

  const getIntensityColor = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100';
    if (minutes < 60) return 'bg-emerald-100';
    if (minutes < 180) return 'bg-emerald-300';
    if (minutes < 300) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] md:rounded-3xl border border-gray-100 md:shadow-sm overflow-hidden w-full">
      {/* Calendar Header - DUB Style */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <CalendarIcon className="w-5 h-5 text-indigo-600" />
             <h3 className="text-base font-black text-gray-900 tracking-tight">{currentMonthLabel}</h3>
          </div>
          <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
            <button onClick={handlePrevWeek} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
            <button onClick={handleToday} className="px-3 py-1 text-[10px] font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest">Today</button>
            <button onClick={handleNextWeek} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-4 mr-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" /> Light
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> Medium
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" /> Heavy
            </div>
          </div>
          <button onClick={onExport} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all border border-gray-100 bg-white shadow-sm">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex custom-scrollbar bg-white">
        <div className="flex-1 flex flex-col min-w-[700px]">
          {/* Days Header with Heatmap Overlay */}
          <div className="grid grid-cols-[60px_1fr] border-b border-gray-100 shrink-0 sticky top-0 bg-white z-20">
            <div className="w-[60px] flex items-center justify-center border-r border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</div>
            <div className="grid grid-cols-7">
              {weekDates.map((date, i) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const intensity = dailyIntensity[dateStr] || 0;
                return (
                  <div key={i} className="pt-3 pb-2 text-center border-l border-gray-100 first:border-l-0 relative group">
                    {/* Intensity Bar (DUB Style Workload Overlay) */}
                    <div className="absolute top-0 left-0 right-0 h-1 flex gap-0.5 px-0.5 opacity-60">
                       <div className={cn("flex-1 h-full rounded-b-full transition-colors duration-500", getIntensityColor(intensity))} />
                    </div>
                    
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{format(date, 'EEE')}</span>
                    <div className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black transition-all", 
                      isSameDay(date, new Date()) ? "bg-indigo-600 text-white shadow-lg scale-110" : "text-gray-900 group-hover:bg-gray-50"
                    )}>
                      {format(date, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative min-h-[900px] custom-scrollbar">
            <div className="grid grid-cols-[60px_1fr] absolute inset-0">
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
              <div className="grid grid-cols-7 relative">
                {weekDates.map((date, dIdx) => (
                  <div key={dIdx} className="border-l border-gray-100 first:border-l-0 relative group">
                    {HOURS.map(h => {
                      const timeStr = `${h.toString().padStart(2, '0')}:00`;
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const endStr = `${(h+1).toString().padStart(2, '0')}:00`;
                      return (
                        <div
                          key={h}
                          onClick={() => onCreateBlock?.(dateStr, timeStr, endStr)}
                          className="h-20 border-b border-gray-50 hover:bg-indigo-50/20 transition-all cursor-pointer flex items-center justify-center group/cell"
                        >
                          <Plus className="w-5 h-5 text-indigo-300 opacity-0 group-hover/cell:opacity-100 transition-all scale-75 group-hover/cell:scale-100" />
                        </div>
                      );
                    })}

                    {/* Study Blocks - DUB Detailed Style */}
                    <AnimatePresence>
                      {blocks.filter(b => b.date === format(date, 'yyyy-MM-dd')).map(block => {
                        const startHour = parseInt(block.startTime.split(':')[0]);
                        const startMin = parseInt(block.startTime.split(':')[1]);
                        const endHour = parseInt(block.endTime.split(':')[0]);
                        const endMin = parseInt(block.endTime.split(':')[1]);
                        
                        const top = (startHour - 8) * 80 + (startMin / 60) * 80;
                        const height = ((endHour - startHour) * 60 + (endMin - startMin)) / 60 * 80;

                        return (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            key={block.id}
                            onClick={(e) => {
                               e.stopPropagation();
                               onBlockClick?.(block);
                            }}
                            className={cn(
                              "absolute left-1.5 right-1.5 rounded-2xl p-2.5 shadow-sm border-l-4 flex flex-col overflow-hidden cursor-pointer transition-all bg-white ring-1 ring-inset ring-gray-100",
                              block.status === 'completed' && "opacity-60"
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height - 4}px`,
                              borderLeftColor: block.subjectColour || '#6366f1'
                            }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{block.subject}</span>
                              {block.mode === 'sniper' ? <Target className="w-3.5 h-3.5 text-emerald-600" /> : <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />}
                            </div>
                            
                            <p className="text-[11px] font-bold text-gray-600 leading-tight line-clamp-2 mb-2">{block.topic}</p>
                            
                            <div className="mt-auto flex items-center justify-between">
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                 <Clock className="w-3 h-3" />
                                 {block.startTime}
                               </div>
                               <div className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-500 uppercase">
                                 {block.duration}m
                               </div>
                            </div>

                            {/* Status Indicator Bar */}
                            {block.status === 'completed' && (
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
        </div>
      </div>
    </div>
  );
}
