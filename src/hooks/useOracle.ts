import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { vectorRetrieve } from '../services/rag/retrieval';
import { assembleAugmentedPrompt, AugmentedPrompt } from '../services/rag/augmentation';
import { useAuth } from '../lib/AuthContext';

const AI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

export interface OracleMessage {
    id: string; role: 'user' | 'assistant'; content: string;
    citations: number[];
    isStreaming?: boolean;
}

export function useOracle(vaultId: string) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<OracleMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    const _gemini = new GoogleGenerativeAI(AI_API_KEY!);

    const send = async (text: string) => {
        if (!text.trim() || !user) return;
        const msgId = crypto.randomUUID();
        const assistantId = crypto.randomUUID();

        const newMsgs: OracleMessage[] = [...messages, { id: msgId, role: 'user', content: text, citations: [] }];
        setMessages([...newMsgs, { id: assistantId, role: 'assistant', content: '', citations: [], isStreaming: true }]);
        setIsTyping(true);

        try {
            // 1. Retrieve
            const chunks = await vectorRetrieve(text, [vaultId], user.uid, 5);

            // 2. Augment
            const prompt: AugmentedPrompt = assembleAugmentedPrompt(
                chunks,
                'You are the Oracle, a Socratic guide bound by the Vault texts. Do NOT give answers directly. Prod the user. Cite pages [Px].',
                newMsgs, text
            );

            // 3. Generate
            const model = _gemini.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: prompt.systemInstruction });
            const stream = await model.generateContentStream({ contents: prompt.messages });

            let txt = '';
            for await (const chunk of stream.stream) {
                txt += chunk.text();
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: txt } : m));
            }

            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false, citations: prompt.citablePages } : m));

        } catch (e) {
            console.error(e);
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false, content: 'Oracle Error: Network disrupted.' } : m));
        } finally {
            setIsTyping(false);
        }
    };

    return { messages, isTyping, send, clear: () => setMessages([]) };
}
