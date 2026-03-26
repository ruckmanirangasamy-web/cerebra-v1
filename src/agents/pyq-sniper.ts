/**
 * PYQ SNIPER AGENT
 * ScholarSync - Part 11: RAG Agent Full Implementation
 *
 * The PYQ Sniper is a source-locked exam answer engine.
 * Most rigid output contract of all agents.
 *
 * Fixed 4-section structure:
 * - ANSWER: Direct exam-worthy answer
 * - STEPS: Numbered breakdown
 * - SOURCE: Page citations
 * - EXAM TIP: What examiners look for
 *
 * Source lock is NON-NEGOTIABLE - cannot be disabled.
 * Top-7 retrieval (not 5) for broader context.
 *
 * Model: gemini-1.5-pro
 * Temperature: 0.1 (precision critical for exam answers)
 * Max Tokens: 600
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface PYQResult {
  answer: string;
  steps: Array<{ text: string; pages: number[] }>;
  sourcePages: number[];
  examTip: string;
  notInSource: boolean;
  rawText: string;
}

export interface RetrievedChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  itemId: string;
  vaultId: string;
  similarityScore: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT (SP-07)
// ══════════════════════════════════════════════════════════════════════════════

function PYQ_SNIPER_SYSTEM(subject: string): string {
  return `You are the PYQ Sniper for ScholarSync — exam-precision answer engine for ${subject}.
SOURCE LOCK: ALWAYS STRICT. Cannot be disabled.

MANDATORY OUTPUT STRUCTURE — in this exact order:

ANSWER: [Direct exam-worthy answer, one sentence] [p.X]

STEPS:
1. [Step or key point] [p.X]
2. [Step or key point] [p.X]
[up to 5 steps]

SOURCE: [p.X] [p.Y] [which pages have the core content]

EXAM TIP: [One sentence — what examiners specifically look for, no citation needed]

RULES:
- Maximum 250 words total.
- Multi-part questions: separate STEPS block per part.
- Not in source: output only "ANSWER: Not found in your source material." then SOURCE: None`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PYQ SNIPER AGENT CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class PYQSniperAgent {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor(geminiApiKey: string) {
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
  }

  /**
   * MAIN SNIPE METHOD
   * Answer a past exam question with source-locked precision
   */
  async snipe(
    question: string,
    chunks: RetrievedChunk[],
    subject: string
  ): Promise<PYQResult> {

    const systemPrompt = PYQ_SNIPER_SYSTEM(subject);
    const sourceSection = this.buildSourceSection(chunks);

    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: systemPrompt + sourceSection
    });

    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: question }]
        }],
        generationConfig: {
          temperature: 0.1,      // CRITICAL: Exam precision
          maxOutputTokens: 600
        }
      });

      const responseText = result.response.text();
      return this.parsePYQResponse(responseText);

    } catch (error) {
      console.error('[PYQ_SNIPER] Generation failed:', error);
      throw error;
    }
  }

  /**
   * BUILD SOURCE SECTION
   * Assemble context with page-numbered chunks
   */
  private buildSourceSection(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
      return '\n\nNO SOURCE MATERIAL AVAILABLE.';
    }

    // Deduplicate by page
    const seen = new Set<number>();
    const uniqueChunks = chunks.filter(c => {
      if (seen.has(c.pageNumber)) return false;
      seen.add(c.pageNumber);
      return true;
    });

    return '\n\nSOURCE MATERIAL (answer ONLY from these passages):\n\n' +
      uniqueChunks
        .map(c => `[Page ${c.pageNumber}]:\n${c.text.trim()}`)
        .join('\n\n---\n\n');
  }

  /**
   * PARSE PYQ RESPONSE
   * Extract structured answer components
   */
  private parsePYQResponse(raw: string): PYQResult {
    // Check for "not in source" response
    const notInSource = raw.includes('Not found in your source material');

    if (notInSource) {
      return {
        answer: 'Not found in your source material.',
        steps: [],
        sourcePages: [],
        examTip: 'Upload the relevant textbook chapter for source-locked answers.',
        notInSource: true,
        rawText: raw
      };
    }

    // Extract ANSWER section
    const answerMatch = raw.match(/^ANSWER:\s*(.+?)(?=\n\nSTEPS:|$)/ms);
    const answer = answerMatch?.[1]?.trim() ?? '';

    // Extract STEPS section
    const stepsMatch = raw.match(/STEPS:\s*([\s\S]+?)(?=\nSOURCE:|$)/m);
    const stepsText = stepsMatch?.[1]?.trim() ?? '';
    const steps = stepsText
      .split('\n')
      .filter(l => /^\d+\./.test(l.trim()))
      .map(l => {
        const text = l.replace(/^\d+\.\s*/, '').replace(/\[p\.\d+\]/g, '').trim();
        const pages = [...l.matchAll(/\[p\.(\d+)\]/g)].map(m => parseInt(m[1]));
        return { text, pages };
      });

    // Extract SOURCE section
    const sourceMatch = raw.match(/SOURCE:\s*(.+?)(?=\n|$)/m);
    const sourcePages = sourceMatch
      ? [...sourceMatch[1].matchAll(/\d+/g)].map(m => parseInt(m[0]))
      : [];

    // Extract EXAM TIP section
    const tipMatch = raw.match(/EXAM TIP:\s*(.+?)(?=\n|$)/m);
    const examTip = tipMatch?.[1]?.trim() ?? '';

    return {
      answer,
      steps,
      sourcePages,
      examTip,
      notInSource: false,
      rawText: raw
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT CREATOR FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

export function createPYQSniper(geminiApiKey: string): PYQSniperAgent {
  return new PYQSniperAgent(geminiApiKey);
}
