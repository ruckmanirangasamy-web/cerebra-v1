import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { motion, AnimatePresence } from "motion/react";
import { 
  PenTool, 
  Sparkles, 
  Zap, 
  FileText, 
  Save, 
  Share2, 
  Maximize2, 
  Minimize2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
  Layout,
  Wand2,
  BrainCircuit,
  MessageCircle
} from "lucide-react";
import { cn } from "../lib/utils";

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive("bold") ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive("italic") ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive("underline") ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
      >
        <Type className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive("bulletList") ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive("orderedList") ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn("p-2 rounded-lg transition-colors", editor.isActive("blockquote") ? "bg-indigo-100 text-indigo-600" : "text-gray-500 hover:bg-gray-100")}
      >
        <Quote className="w-4 h-4" />
      </button>
      <div className="flex-1" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function Workspace() {
  const [isGhosting, setIsGhosting] = useState(false);
  const [showNeuralStream, setShowNeuralStream] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Placeholder.configure({
        placeholder: "Start writing your academic masterpiece...",
      }),
    ],
    content: `<h1>Quantum Mechanics: An Introduction</h1><p>Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.</p><p></p><blockquote>"I think I can safely say that nobody understands quantum mechanics." — Richard Feynman</blockquote>`,
    editorProps: {
      attributes: {
        class: "prose prose-sm md:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[500px] p-8",
      },
    },
  });

  const handleAutoWeave = () => {
    // Simulate AI formatting
    if (editor) {
      editor.chain().focus().setHighlight({ color: "#e0e7ff" }).run();
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 font-display">Fluid Workspace</h1>
            <p className="text-gray-500 text-sm">Aesthetic writing. Neural injection. Contextual ghosting.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button 
            onClick={handleAutoWeave}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4 text-indigo-600" />
            Auto-Weave
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save to Vault
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
          <MenuBar editor={editor} />
          <div className="flex-1 overflow-y-auto relative">
            <EditorContent editor={editor} />
            
            {/* Contextual Ghosting Overlay */}
            <AnimatePresence>
              {isGhosting && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none flex items-center justify-center"
                >
                  <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Contextual Ghosting Active
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating AI Toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10">
            <button 
              onClick={() => setIsGhosting(!isGhosting)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                isGhosting ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              <Zap className="w-3 h-3" />
              Ghost Mode
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button 
              onClick={() => setShowNeuralStream(!showNeuralStream)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                showNeuralStream ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              <BrainCircuit className="w-3 h-3" />
              Neural Stream
            </button>
          </div>
        </div>

        {/* Neural Injection Sidebar */}
        <AnimatePresence>
          {showNeuralStream && (
            <motion.aside 
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="flex flex-col bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-gray-900">Neural-Stream</h3>
                </div>
                <button 
                  onClick={() => setShowNeuralStream(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Suggested Injection</span>
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed italic">
                    "Based on your mention of 'Feynman', would you like to inject his explanation of the Double Slit Experiment here?"
                  </p>
                  <button className="w-full py-2 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-100 transition-colors">
                    Inject Stream
                  </button>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Related Vault Items</span>
                  <div className="space-y-2">
                    {[
                      { title: "2022 Physics Midterm", icon: FileText },
                      { title: "Quantum Chat Log", icon: MessageCircle },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
                        <item.icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                        <span className="text-xs text-gray-700 font-medium group-hover:text-indigo-600">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
