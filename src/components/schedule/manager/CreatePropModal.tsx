import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BoardProperty } from '../../../services/scheduleTypes';
import { cn } from '../../../lib/utils';

interface CreatePropModalProps {
  onClose: () => void;
  onCreate: (prop: BoardProperty) => void;
}

const PROP_TYPES = ["text", "number", "dropdown", "link", "date"] as const;
const PROP_ICONS: Record<string, string> = { text: "Aa", number: "#", dropdown: "☰", link: "🔗", date: "📅" };

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

export default function CreatePropModal({ onClose, onCreate }: CreatePropModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BoardProperty['type']>("text");
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [newOpt, setNewOpt] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate({
        id: genId(),
        name: name.trim(),
        type,
        options: type === "dropdown" ? options : []
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-w-[440px] max-h-[88vh] border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-gray-100">
          <h3 className="font-semibold text-base text-gray-900">New Board Property</h3>
          <button onClick={onClose} className="p-1.5 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
             <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5 text-gray-400">Property Name</label>
            <input 
              className="w-full rounded-xl px-3 py-2 text-sm outline-none border border-gray-200 text-gray-700 focus:border-indigo-500 transition-colors"
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Priority"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-2 text-gray-400">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {PROP_TYPES.map(t => (
                <button 
                  key={t} 
                  onClick={() => setType(t as any)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-medium capitalize transition-all flex items-center justify-center gap-1.5",
                    type === t 
                      ? "bg-indigo-50 text-indigo-600 border-2 border-indigo-300" 
                      : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span className="font-mono text-xs">{PROP_ICONS[t]}</span>{t}
                </button>
              ))}
            </div>
          </div>

          {type === "dropdown" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-2 text-gray-400">Options</label>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <input 
                    className="flex-1 rounded-lg px-2.5 py-1.5 text-sm outline-none border border-gray-200 text-gray-700"
                    value={o} 
                    onChange={e => setOptions(os => os.map((oo, j) => j === i ? e.target.value : oo))}
                  />
                  <button onClick={() => setOptions(os => os.filter((_, j) => j !== i))} className="text-gray-400 hover:text-rose-500">
                     <X size={16} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input 
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-sm outline-none border border-gray-200 text-gray-700 focus:border-indigo-500"
                  placeholder="New option" 
                  value={newOpt} 
                  onChange={e => setNewOpt(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newOpt.trim()) { setOptions(os => [...os, newOpt.trim()]); setNewOpt(""); } }}
                />
                <button 
                  onClick={() => { if (newOpt.trim()) { setOptions(os => [...os, newOpt.trim()]); setNewOpt(""); } }}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 font-medium text-gray-500 hover:bg-gray-50">Cancel</button>
            <button 
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Add Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
