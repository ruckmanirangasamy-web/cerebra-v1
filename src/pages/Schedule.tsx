import React from 'react';
import ScheduleBoard from '../components/schedule/manager/ScheduleBoard';

export default function Schedule() {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="flex-1 min-h-0 bg-white border-gray-100 overflow-hidden">
         <ScheduleBoard />
      </div>
    </div>
  );
}
