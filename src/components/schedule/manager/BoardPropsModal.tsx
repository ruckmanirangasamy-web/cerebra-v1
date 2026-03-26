import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BoardProperty, KanbanBoard } from '../../../services/scheduleTypes';
import CreatePropModal from './CreatePropModal';

interface BoardPropsModalProps {
  board: KanbanBoard;
  onClose: () => void;
  onSave: (properties: BoardProperty[]) => void;
}

const PROP_ICONS: Record<string, string> = { text: "Aa", number: "#", dropdown: "☰", link: "🔗", date: "📅" };

export default function BoardPropsModal({ board, onClose, onSave }: BoardPropsModalProps) {
  const [props, setProps] = useState<BoardProperty[]>(board.properties || []);
  const [showAdd, setShowAdd] = useState(false);

  const handleSave = () => {
    onSave(props);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-w-[440px] max-h-[88vh] border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-gray-100">
          <h3 className="font-semibold text-base text-gray-900">{board.title} — Board Properties</h3>
          <button onClick={onClose} className="p-1.5 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
             <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500">These properties apply to all tasks in this board. Changes are reflected across all cards.</p>

          {props.length === 0 && (
            <div className="text-center py-8 rounded-xl bg-gray-50 text-gray-400 border border-gray-100">
              <div className="text-2xl mb-1">🏷️</div>
              <p className="text-sm font-medium">No board properties yet</p>
            </div>
          )}

          <div className="space-y-2">
            {props.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-gray-50 border border-gray-200">
                <span className="font-mono text-xs w-5 text-center text-gray-400">{PROP_ICONS[p.type]}</span>
                <input 
                  className="flex-1 text-sm font-semibold bg-transparent outline-none text-gray-700" 
                  value={p.name} 
                  onChange={e => setProps(ps => ps.map((pp, j) => j === i ? { ...pp, name: e.target.value } : pp))}
                />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-gray-200 text-gray-500">{p.type}</span>
                <button onClick={() => setProps(ps => ps.filter((_, j) => j !== i))} className="text-gray-400 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setShowAdd(true)} 
            className="w-full py-3 rounded-xl text-sm font-bold border-2 border-dashed border-gray-200 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
          >
            + Add Property
          </button>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 font-medium text-gray-500 hover:bg-gray-50 transition-colors">Discard</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Save Changes</button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="absolute inset-0 z-[210] flex items-center justify-center p-4">
          <CreatePropModal
            onClose={() => setShowAdd(false)}
            onCreate={p => { setProps(ps => [...ps, p]); setShowAdd(false); }}
          />
        </div>
      )}
    </div>
  );
}
