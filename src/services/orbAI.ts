/**
 * orbAI.ts
 * AI helper functions for the Radial Orb tools.
 */
import { generateText, generateWithImage } from './gemini';

/** Structured result from the Temporal Parser */
export interface ParsedTask {
    title: string;
    subject: string | null;
    dueDate: string | null; // ISO 'YYYY-MM-DD'
    priority: 'high' | 'medium' | 'low';
    estimatedMinutes: number;
    mode: 'sniper' | 'scholar';
    confidence: { subject: number; dueDate: number; estimatedMinutes: number };
}

/**
 * Temporal Parser — extract structured task data from natural language.
 * Called with 500ms debounce from Quick To-Do.
 */
export async function parseTaskInput(rawInput: string): Promise<ParsedTask> {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Today's date: ${today}
Extract structured task data from this natural language input.
Return ONLY a valid JSON object with no extra text:
{
  "title": string,
  "subject": string | null,
  "dueDate": string | null,
  "priority": "high" | "medium" | "low",
  "estimatedMinutes": number,
  "mode": "sniper" | "scholar",
  "confidence": { "subject": number, "dueDate": number, "estimatedMinutes": number }
}

Priority rules: "urgent"/"critical"/"must"/"before exam" → high; "should"/"need to" → medium; else → low.
Mode rules: "practice"/"drill"/"MCQs" → sniper; else → scholar.
Time estimation if not mentioned: "revise" → 60, "practice MCQs" → 30, "read chapter" → 45, else → 45.
Confidence values: 0.0–1.0 per field.

Input: "${rawInput}"`;

    try {
        const raw = await generateText(prompt);
        // Strip markdown fences if present
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned) as ParsedTask;
    } catch {
        // Fallback on parse error
        return {
            title: rawInput.trim(),
            subject: null,
            dueDate: null,
            priority: 'medium',
            estimatedMinutes: 45,
            mode: 'scholar',
            confidence: { subject: 0, dueDate: 0, estimatedMinutes: 0 },
        };
    }
}

/** Codex entry category types */
export type CodexEntryType =
    | 'Formula' | 'Mnemonic' | 'Date' | 'Dosage'
    | 'Definition' | 'Code' | 'Note' | 'Other';

/**
 * Infer the best Micro-Codex entry type for a piece of content.
 * Uses gemini-flash for speed and cost.
 */
export async function inferCodexEntryType(content: string): Promise<CodexEntryType> {
    const validTypes: CodexEntryType[] = [
        'Formula', 'Mnemonic', 'Date', 'Dosage',
        'Definition', 'Code', 'Note', 'Other',
    ];

    const prompt = `Classify this study note into exactly one category.
Return ONLY the category name, nothing else.
Categories: ${validTypes.join(', ')}

Rules:
- Formula: contains mathematical or scientific equations
- Mnemonic: contains a memory aid, acronym, or rhyme
- Date: primarily about a historical date or timeline
- Dosage: contains drug names and dosage amounts
- Definition: defines a specific term or concept
- Code: contains programming syntax
- Note: general explanatory text
- Other: anything else

Content: "${content.slice(0, 300)}"`;

    try {
        const result = (await generateText(prompt)).trim();
        return validTypes.includes(result as CodexEntryType) ? (result as CodexEntryType) : 'Note';
    } catch {
        return 'Note';
    }
}

/**
 * Vision Solver — analyse an image.
 * mode: 'solve' → step-by-step solution, 'scan' → whiteboard transcription.
 */
export async function analyseImage(base64Jpeg: string, mode: 'solve' | 'scan'): Promise<string> {
    const systemInstruction = mode === 'solve'
        ? `You are an expert tutor. Analyse the problem in this image.
Provide a complete, step-by-step solution.
Use LaTeX notation: inline $..$ and block $$..$$ for all mathematical expressions.
Number each step. Explain the reasoning behind each step.`
        : `Extract all content from this whiteboard or handwritten notes image.
Format as structured markdown: # for main headings, ## for sub-headings, - for bullet points.
Convert any mathematical notation to LaTeX ($..$ inline, $$..$$ block).
For diagrams: describe the structure and label visible components.
Preserve the original information hierarchy exactly.`;

    return generateWithImage(
        mode === 'solve'
            ? 'Solve this problem step by step.'
            : 'Transcribe and structure all content from this image.',
        base64Jpeg,
        'image/jpeg',
        systemInstruction
    );
}

/**
 * PYQ Sniper — source-locked exam answer.
 */
export async function sniperAnswer(question: string, context: string): Promise<string> {
    const systemInstruction = `You are an expert exam tutor giving source-locked answers.
You ONLY use the provided source material. Never use general knowledge not present in the sources.
Always structure your answer exactly as:
ANSWER: [one-sentence direct answer]
STEPS: [numbered steps or bullet points]
SOURCE: [cite specific sections from the provided material]
EXAM TIP: [one sentence about what examiners typically expect]`;

    const prompt = `Source material:
${context}

Exam question:
${question}`;

    return generateText(prompt, systemInstruction);
}
