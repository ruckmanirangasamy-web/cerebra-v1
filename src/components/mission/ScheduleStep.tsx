import React from 'react';
import { useMission } from '../../lib/MissionContext';
import ScheduleBoard from '../schedule/manager/ScheduleBoard';
import { Bot, Play } from 'lucide-react';

export function ScheduleStep() {
  const { missionData, missionId, setStep, lockSchedule } = useMission();

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Mission Specific Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl shadow-inner">2</div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">Mission Schedule</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              Scheduling for {missionData.subject} · {missionData.missionName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="text-right hidden sm:block mr-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Study Load</p>
              <p className="text-sm font-black text-indigo-600 font-mono">{missionData.weekdayHours}h / day</p>
           </div>
           <button 
             onClick={() => {}} // This will trigger the Temporal Agent inside ScheduleBoard
             className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-100 uppercase tracking-widest shadow-sm"
           >
             <Bot className="w-4 h-4" /> Optimise Mission
           </button>
        </div>
      </header>

      {/* The Shared Schedule Board */}
      <div className="flex-1 min-h-0 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-2">
         <ScheduleBoard missionId={missionId} initialView="kanban" />
      </div>

      {/* Navigation Footer */}
      <footer className="flex items-center justify-between pt-2 shrink-0">
        <button 
          onClick={() => setStep(1)}
          className="px-6 py-2.5 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
        >
          ← Back to Plan
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setStep(3)}
            className="px-6 py-2.5 rounded-2xl text-xs font-black text-gray-400 hover:bg-gray-100 transition-all uppercase tracking-widest"
          >
            Skip to Learn →
          </button>
          <button 
            onClick={() => lockSchedule()}
            className="px-10 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
          >
            Lock & Begin Mission →
          </button>
        </div>
      </footer>
    </div>
  );
}
