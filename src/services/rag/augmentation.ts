import { RetrievedChunk } from './retrieval';

export interface AugmentedPrompt {
    systemInstruction: string;
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
    citablePages: number[];
}

export function assembleAugmentedPrompt(
    chunks: RetrievedChunk[],
    systemBase: string,
    history: Array<{ role: string; content: string }>,
    question: string
): AugmentedPrompt {
    // Deduplicate by page — same page twice wastes context tokens
    const seen = new Set<number>();
    const unique = chunks.filter(c => {
        if (seen.has(c.pageNumber)) return false;
        seen.add(c.pageNumber); return true;
    });

    const sourceSection = unique.length > 0
        ? '\n\nSOURCE MATERIAL (answer ONLY from passages below):\n' +
        unique.map(c => '[Page ' + c.pageNumber + ']: ' + c.text.trim()).join('\n\n---\n\n')
        : '\n\nNO SOURCE. State: "Not in your source — answering from general knowledge."';

    const messages = [
        ...history.map(m => ({
            role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
            parts: [{ text: m.content }]
        })),
        { role: 'user' as const, parts: [{ text: question }] }
    ];
    return { systemInstruction: systemBase + sourceSection, messages, citablePages: [...seen] };
}
