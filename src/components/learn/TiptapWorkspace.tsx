import React, { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { X, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Code, Minus, Wand2, Sparkles, Ghost, Save, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { generateText } from "../../services/gemini";

interface Props { isOpen: boolean; onClose: () => void; }

export default function TiptapWorkspace({ isOpen, onClose }: Props) {
    const [title, setTitle] = useState("Untitled Document");
    const [isReformatting, setIsReformatting] = useState(false);
    const [ghostMode, setGhostMode] = useState(false);
    const [saved, setSaved] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Underline,
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({ placeholder: 'Start writing, or paste text to reformat with the Editor Agent...' }),
        ],
        editorProps: {
            attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[60vh] text-gray-800 leading-relaxed' },
        },
    });

    const handleReformat = useCallback(async () => {
        if (!editor) return;
        const selectedText = editor.state.doc.textBetween(
            editor.state.selection.from, editor.state.selection.to, '\n'
        );
        if (!selectedText || selectedText.length < 20) return;
        setIsReformatting(true);
        try {
            const result = await generateText(selectedText,
                `You are the Editor Agent. Reformat these student notes into a well-structured study document:
1. Add proper heading hierarchy (# for main topic, ## for sections, ### for sub-sections)
2. Convert items to bullet points
3. Wrap key definitions with > Definition:
4. Add mnemonic callouts where helpful: > 💡 Remember:
5. Preserve ALL factual content — only change structure
Return ONLY the reformatted markdown text.`
            );
            editor.chain().focus().deleteSelection().insertContent(
                result.split('\n').map(line => `<p>${line}</p>`).join('')
            ).run();
        } catch { /* keep original */ }
        setIsReformatting(false);
    }, [editor]);

    const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

    if (!isOpen || !editor) return null;

    const ToolBtn = ({ active, onClick, children, title: t }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
        <button onClick={onClick} title={t} className={cn("p-1.5 rounded-lg transition-colors", active ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700")}>
            {children}
        </button>
    );

    return (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                        className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:border-b-2 focus:border-indigo-500" />
                </div>
                <div className="flex items-center gap-2">
                    {saved && <span className="text-[10px] font-bold text-emerald-500 animate-pulse">Saved ✓</span>}
                    <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
                        <Save className="w-3.5 h-3.5" /> Save to Vault
                    </button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="border-b border-gray-100 px-4 py-1.5 flex items-center gap-0.5 flex-wrap bg-gray-50/50">
                <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike"><Strikethrough className="w-4 h-4" /></ToolBtn>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="w-4 h-4" /></ToolBtn>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet"><List className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered"><ListOrdered className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="w-4 h-4" /></ToolBtn>
                <ToolBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code"><Code className="w-4 h-4" /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="w-4 h-4" /></ToolBtn>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button onClick={handleReformat} disabled={isReformatting}
                    className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors", isReformatting ? "bg-indigo-100 text-indigo-500" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100")}>
                    {isReformatting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Reformat
                </button>
                <button onClick={() => setGhostMode(!ghostMode)}
                    className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors", ghostMode ? "bg-purple-100 text-purple-600" : "text-gray-400 hover:bg-gray-100")}>
                    <Ghost className="w-3 h-3" /> Ghost {ghostMode ? 'ON' : 'OFF'}
                </button>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </motion.div>
    );
}
