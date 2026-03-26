import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Plus, ZoomIn, ZoomOut, Maximize2, Share2, Trash2, StickyNote, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { NODE_COLORS, NODE_SIZES, type GraphNodeType } from "../../services/learnTypes";
import { generateText } from "../../services/gemini";

export interface KGNode { id: string; label: string; type: GraphNodeType; x: number; y: number; notes: string; }
export interface KGEdge { id: string; sourceNodeId: string; targetNodeId: string; label: string; }

interface Props {
    isOpen: boolean;
    onClose: () => void;
    nodes: KGNode[];
    edges: KGEdge[];
    onAddNode: (label: string, type: GraphNodeType, x: number, y: number) => void;
    onUpdatePosition: (nodeId: string, x: number, y: number) => void;
    onUpdateLabel: (nodeId: string, label: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onAddEdge: (source: string, target: string, label: string) => void;
}

export default function KnowledgeGraphCanvas({ isOpen, onClose, nodes, edges, onAddNode, onUpdatePosition, onUpdateLabel, onDeleteNode, onAddEdge }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0, offX: 0, offY: 0 });
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newType, setNewType] = useState<GraphNodeType>('concept');
    const [connectMode, setConnectMode] = useState(false);
    const [edgeLabelInput, setEdgeLabelInput] = useState("");
    const [pendingEdge, setPendingEdge] = useState<{ source: string; target: string } | null>(null);
    const [expandSuggestions, setExpandSuggestions] = useState<string[]>([]);
    const [isExpanding, setIsExpanding] = useState(false);
    const [nodeNotes, setNodeNotes] = useState("");

    const selected = nodes.find(n => n.id === selectedNode);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)));
    }, []);

    const handleBgMouseDown = (e: React.MouseEvent) => {
        if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'rect') {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY, offX: panOffset.x, offY: panOffset.y });
            setSelectedNode(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPanOffset({ x: panStart.offX + (e.clientX - panStart.x), y: panStart.offY + (e.clientY - panStart.y) });
        }
        if (dragging) {
            const dx = (e.clientX - dragStart.x) / zoom;
            const dy = (e.clientY - dragStart.y) / zoom;
            const node = nodes.find(n => n.id === dragging);
            if (node) onUpdatePosition(dragging, dragStart.nodeX + dx, dragStart.nodeY + dy);
        }
    };

    const handleMouseUp = () => { setIsPanning(false); setDragging(null); };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (connectMode && selectedNode && selectedNode !== nodeId) {
            setPendingEdge({ source: selectedNode, target: nodeId });
            setConnectMode(false);
            return;
        }
        const node = nodes.find(n => n.id === nodeId)!;
        setDragging(nodeId);
        setDragStart({ x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y });
        setSelectedNode(nodeId);
        setNodeNotes(node.notes || "");
        setExpandSuggestions([]);
    };

    const handleAddNode = () => {
        if (!newLabel.trim()) return;
        onAddNode(newLabel.trim(), newType, 400 + Math.random() * 200 - 100, 300 + Math.random() * 200 - 100);
        setNewLabel("");
        setShowAddForm(false);
    };

    const handleConfirmEdge = () => {
        if (pendingEdge && edgeLabelInput.trim()) {
            onAddEdge(pendingEdge.source, pendingEdge.target, edgeLabelInput.trim());
            setPendingEdge(null);
            setEdgeLabelInput("");
        }
    };

    const handleExpand = async () => {
        if (!selected) return;
        setIsExpanding(true);
        try {
            const res = await generateText(
                `Generate exactly 4 related sub-concepts for "${selected.label}". Return ONLY a JSON array of strings. Example: ["Concept A","Concept B","Concept C","Concept D"]`,
                'You are a knowledge graph assistant. Return only valid JSON arrays.'
            );
            const match = res.match(/\[.*\]/s);
            if (match) setExpandSuggestions(JSON.parse(match[0]));
        } catch { /* ignore */ }
        setIsExpanding(false);
    };

    const resetView = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

    if (!isOpen) return null;

    return (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
            {/* Header */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">Knowledge Graph</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">
                    {nodes.length} Nodes · {edges.length} Edges
                </span>
            </header>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-900" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                <svg ref={svgRef} className="w-full h-full" onWheel={handleWheel} onMouseDown={handleBgMouseDown} style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'grab' }}>
                    <rect width="100%" height="100%" fill="transparent" />
                    <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
                        {/* Edges */}
                        {edges.map(e => {
                            const src = nodes.find(n => n.id === e.sourceNodeId);
                            const tgt = nodes.find(n => n.id === e.targetNodeId);
                            if (!src || !tgt) return null;
                            const mx = (src.x + tgt.x) / 2, my = (src.y + tgt.y) / 2;
                            return (
                                <g key={e.id}>
                                    <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                                        stroke={selectedNode === e.sourceNodeId || selectedNode === e.targetNodeId ? '#10D9A0' : 'rgba(255,255,255,0.12)'}
                                        strokeWidth={selectedNode === e.sourceNodeId || selectedNode === e.targetNodeId ? 2 : 1.5} />
                                    {e.label && (
                                        <text x={mx} y={my - 6} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">{e.label}</text>
                                    )}
                                </g>
                            );
                        })}
                        {/* Nodes */}
                        {nodes.map(n => {
                            const r = NODE_SIZES[n.type];
                            const isSelected = selectedNode === n.id;
                            return (
                                <g key={n.id} onMouseDown={e => handleNodeMouseDown(e, n.id)} style={{ cursor: 'pointer' }}>
                                    <circle cx={n.x} cy={n.y} r={r + 4} fill="transparent" stroke={isSelected ? 'white' : 'transparent'} strokeWidth={isSelected ? 2 : 0} />
                                    <circle cx={n.x} cy={n.y} r={r} fill={NODE_COLORS[n.type]} opacity={isSelected ? 1 : 0.85}
                                        filter={n.type === 'core' ? 'url(#glow)' : undefined} />
                                    <text x={n.x} y={n.y + r + 14} fill="white" fontSize="11" textAnchor="middle" fontWeight={n.type === 'core' ? 'bold' : 'normal'}>
                                        {n.label.length > 18 ? n.label.slice(0, 16) + '...' : n.label}
                                    </text>
                                </g>
                            );
                        })}
                        {/* Expand suggestions (ghost nodes) */}
                        {selected && expandSuggestions.map((s, i) => {
                            const angle = (i / expandSuggestions.length) * Math.PI * 2 - Math.PI / 2;
                            const gx = selected.x + Math.cos(angle) * 140;
                            const gy = selected.y + Math.sin(angle) * 140;
                            return (
                                <g key={`ghost-${i}`} opacity={0.5} style={{ cursor: 'pointer' }}
                                    onClick={() => { onAddNode(s, 'concept', gx, gy); setExpandSuggestions(prev => prev.filter((_, j) => j !== i)); }}>
                                    <circle cx={gx} cy={gy} r={20} fill="#7C3AED" stroke="white" strokeWidth={1} strokeDasharray="4 2" />
                                    <text x={gx} y={gy + 30} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="middle">{s.length > 14 ? s.slice(0, 12) + '..' : s}</text>
                                    <text x={gx} y={gy + 4} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">+</text>
                                </g>
                            );
                        })}
                        <defs>
                            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                        </defs>
                    </g>
                </svg>

                {/* Edge label input */}
                {pendingEdge && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 border border-white/20 rounded-xl p-4 z-10 flex flex-col gap-2">
                        <p className="text-xs text-white font-bold">Name this connection:</p>
                        <input value={edgeLabelInput} onChange={e => setEdgeLabelInput(e.target.value)} autoFocus placeholder="e.g. catalysed by" className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none" />
                        <div className="flex gap-2">
                            <button onClick={handleConfirmEdge} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold">Create</button>
                            <button onClick={() => { setPendingEdge(null); setEdgeLabelInput(""); }} className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Selected node panel */}
                <AnimatePresence>
                    {selected && (
                        <motion.div initial={{ x: 240 }} animate={{ x: 0 }} exit={{ x: 240 }}
                            className="absolute right-0 top-14 bottom-16 w-[240px] bg-gray-800/90 backdrop-blur border-l border-white/10 p-4 flex flex-col gap-3 overflow-y-auto">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: NODE_COLORS[selected.type] }} />
                                <span className="text-xs font-bold text-white uppercase tracking-widest">{selected.type}</span>
                            </div>
                            <p className="text-sm font-bold text-white">{selected.label}</p>
                            <div>
                                <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Connected</p>
                                <div className="flex flex-wrap gap-1">
                                    {edges.filter(e => e.sourceNodeId === selected.id || e.targetNodeId === selected.id).map(e => {
                                        const otherId = e.sourceNodeId === selected.id ? e.targetNodeId : e.sourceNodeId;
                                        const other = nodes.find(n => n.id === otherId);
                                        return other ? (
                                            <button key={e.id} onClick={() => setSelectedNode(otherId)} className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: NODE_COLORS[other.type] + '30', color: NODE_COLORS[other.type] }}>
                                                {other.label}
                                            </button>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Notes</p>
                                <textarea value={nodeNotes} onChange={e => setNodeNotes(e.target.value)} placeholder="Add notes..." rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none resize-none" />
                            </div>
                            <button onClick={() => { setConnectMode(true); }} className="w-full py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors">
                                🔗 Connect to...
                            </button>
                            <button onClick={handleExpand} disabled={isExpanding} className="w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                {isExpanding ? 'Expanding...' : '🌱 Expand Concept'}
                            </button>
                            <button onClick={() => { onDeleteNode(selected.id); setSelectedNode(null); }} className="w-full py-1.5 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-colors">
                                🗑 Delete
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Toolbar */}
            <div className="h-14 border-t border-white/10 flex items-center justify-center gap-3 px-4">
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-[10px] font-mono text-white/50 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-white/10" />
                <button onClick={resetView} className="p-2 text-white hover:bg-white/10 rounded-lg"><Maximize2 className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-white/10" />
                <button onClick={() => setShowAddForm(true)} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Node
                </button>
                <div className="w-px h-5 bg-white/10" />
                {/* Legend */}
                <div className="flex items-center gap-2">
                    {(Object.entries(NODE_COLORS) as [GraphNodeType, string][]).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                            <span className="text-[8px] text-white/40 uppercase">{type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Node Modal */}
            {showAddForm && (
                <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center" onClick={() => setShowAddForm(false)}>
                    <div className="bg-gray-800 border border-white/20 rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-bold text-white mb-4">New Node</h3>
                        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Node label..." autoFocus
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-mono mb-3 focus:outline-none" />
                        <div className="flex gap-2 mb-4">
                            {(Object.entries(NODE_COLORS) as [GraphNodeType, string][]).map(([type, color]) => (
                                <button key={type} onClick={() => setNewType(type)}
                                    className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all", newType === type ? 'ring-2 ring-white' : '')}
                                    style={{ background: color + '30', color }}>
                                    {type}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddNode} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">Create</button>
                            <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 bg-white/10 text-white rounded-lg text-xs">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
