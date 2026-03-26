import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type SortConfig = {
  field: 'date' | 'duration' | 'priority' | 'status' | 'kanbanOrder';
  order: 'asc' | 'desc';
};

interface SortModalProps {
  currentSort: SortConfig;
  onClose: () => void;
  onApply: (sort: SortConfig) => void;
}

const SortModal = ({ currentSort, onClose, onApply }: SortModalProps) => {
  const [config, setConfig] = useState<SortConfig>(currentSort);

  const fields: { value: SortConfig['field']; label: string }[] = [
    { value: 'kanbanOrder', label: 'Custom Order' },
    { value: 'date', label: 'Date (Due Date)' },
    { value: 'duration', label: 'Duration Timer' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' }
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="font-bold text-gray-900 text-base">Sort Tasks</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-2 text-gray-500">Sort By Property</label>
            <div className="space-y-1.5">
              {fields.map(f => (
                <button
                  key={f.value}
                  onClick={() => setConfig({ ...config, field: f.value })}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                    config.field === f.value 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-2 text-gray-500">Order</label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfig({ ...config, order: 'asc' })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                  config.order === 'asc'
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <ArrowUp className="w-4 h-4" /> Ascending
              </button>
              <button
                onClick={() => setConfig({ ...config, order: 'desc' })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                  config.order === 'desc'
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <ArrowDown className="w-4 h-4" /> Descending
              </button>
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
              onClick={() => { onApply(config); onClose(); }}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              Apply Sort
            </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SortModal;
