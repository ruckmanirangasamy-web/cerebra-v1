import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LayoutDashboard } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BoardProperty } from '../../../services/scheduleTypes';

export type FilterConfig = {
  field: string | null;
  value: any;
};

interface FilterModalProps {
  currentGroupProp: string;
  boardProperties: BoardProperty[];
  onClose: () => void;
  onApply: (groupProp: string) => void;
}

const FilterModal = ({ currentGroupProp, boardProperties, onClose, onApply }: FilterModalProps) => {
  const [selectedProp, setSelectedProp] = useState<string>(currentGroupProp);

  const defaultFields = [
    { id: 'status', name: 'Status' },
    { id: 'priority', name: 'Priority' }
  ];

  const allFields = [...defaultFields, ...boardProperties];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-indigo-600" />
            Group Tasks (Column View)
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4 min-h-[150px]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-3 text-gray-500">Group Columns By</label>
            <div className="space-y-2">
              {allFields.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedProp(f.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                    selectedProp === f.id 
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" 
                      : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => { onApply(selectedProp); onClose(); }}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              Apply View
            </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FilterModal;
