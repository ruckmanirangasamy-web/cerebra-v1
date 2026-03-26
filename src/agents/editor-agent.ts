/**
 * EDITOR AGENT
 * ScholarSync - Part 10: The Memory Engine
 *
 * The Editor Agent exclusively processes Tiptap document content.
 * It never engages in conversation - every call is a document transformation.
 *
 * Two main operations:
 * 1. Auto-Weave Reformat: Large paste (200+ chars) → structured Tiptap JSON
 * 2. Improve/Rewrite: Selected text → clearer, more precise version
 *
 * Model: gemini-1.5-flash (faster for document operations)
 * Temperature: 0.2 (reformat) | 0.3 (improve)
 * Max Tokens: 4000 (reformat) | 600 (improve)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export interface TiptapDocument {
  type: 'doc';
  content: TiptapNode[];
}

export interface EditorOperation {
  type: 'reformat' | 'improve' | 'summarize' | 'expand';
  inputText: string;
  context?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ══════════════════════════════════════════════════════════════════════════════

const AUTO_WEAVE_REFORMAT_PROMPT = `You are a document formatter. Reformat the student's notes into a structured Tiptap JSON document.

Rules:
1. H1 for the main topic, H2 for sections, H3 for sub-sections
2. Bullet lists for enumerable items
3. Wrap equations in KaTeX: inline $..$ or block $$..$$
4. Wrap definitions in blockquotes: > Definition: ...
5. Insert mnemonic callouts where helpful: > REMEMBER: ...
6. NEVER change factual content. Only restructure.
7. Return ONLY valid Tiptap JSON. No prose. No backticks.

Tiptap JSON structure example:
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Main Topic" }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Section" }] },
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Item 1" }] }] }
    ]},
    { "type": "blockquote", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Definition: ..." }] }] }
  ]
}`;

const IMPROVE_TEXT_PROMPT = `Rewrite the following study note to be clearer and more precise.

Rules:
- Preserve ALL factual content exactly
- Improve: sentence structure, technical vocabulary, logical flow
- Keep the same approximate length
- Return the rewritten text only — no explanation, no commentary
- Maintain the original tone (academic/casual)`;

const SUMMARIZE_PROMPT = `Summarize the following study notes into key bullet points.

Rules:
- Extract ONLY the essential facts and concepts
- Maximum 5 bullet points
- Each bullet: one clear sentence
- Preserve technical terms exactly
- No preamble, start with bullets immediately`;

const EXPAND_PROMPT = `Expand this brief note into a more detailed explanation.

Rules:
- Add context and examples where appropriate
- Maintain factual accuracy - don't add information you're uncertain about
- Use clear, academic language
- Maximum 200 words
- Structure: definition → mechanism → significance`;

// ══════════════════════════════════════════════════════════════════════════════
// EDITOR AGENT CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class EditorAgent {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor(geminiApiKey: string) {
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });
  }

  /**
   * AUTO-WEAVE REFORMAT
   * Triggered by: paste of 200+ chars, or manual [Reformat] button
   */
  async reformat(inputText: string): Promise<TiptapDocument> {
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `${AUTO_WEAVE_REFORMAT_PROMPT}\n\nInput text to reformat:\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000
        }
      });

      const responseText = result.response.text()
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const tiptapDoc = JSON.parse(responseText) as TiptapDocument;

      // Validate it's a proper Tiptap document
      if (tiptapDoc.type !== 'doc' || !Array.isArray(tiptapDoc.content)) {
        throw new Error('Invalid Tiptap document structure');
      }

      return tiptapDoc;

    } catch (error) {
      console.error('[EDITOR_AGENT] Reformat failed:', error);

      // Fallback: wrap input in basic paragraph structure
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: inputText }]
        }]
      };
    }
  }

  /**
   * IMPROVE / REWRITE
   * Triggered by: selecting text and tapping [Improve] in Tiptap toolbar
   */
  async improve(inputText: string): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `${IMPROVE_TEXT_PROMPT}\n\nText to improve:\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600
        }
      });

      return result.response.text().trim();

    } catch (error) {
      console.error('[EDITOR_AGENT] Improve failed:', error);
      return inputText; // Fallback: return original
    }
  }

  /**
   * SUMMARIZE
   * Extract key bullet points from longer text
   */
  async summarize(inputText: string): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `${SUMMARIZE_PROMPT}\n\nText to summarize:\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 400
        }
      });

      return result.response.text().trim();

    } catch (error) {
      console.error('[EDITOR_AGENT] Summarize failed:', error);
      return inputText;
    }
  }

  /**
   * EXPAND
   * Turn brief note into detailed explanation
   */
  async expand(inputText: string): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `${EXPAND_PROMPT}\n\nBrief note to expand:\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800
        }
      });

      return result.response.text().trim();

    } catch (error) {
      console.error('[EDITOR_AGENT] Expand failed:', error);
      return inputText;
    }
  }

  /**
   * FORMAT SELECTION
   * Apply specific formatting to selected text
   */
  formatSelection(
    inputText: string,
    format: 'bold' | 'italic' | 'code' | 'highlight' | 'heading'
  ): TiptapNode {
    const baseNode: TiptapNode = {
      type: 'text',
      text: inputText
    };

    switch (format) {
      case 'bold':
        baseNode.marks = [{ type: 'bold' }];
        break;
      case 'italic':
        baseNode.marks = [{ type: 'italic' }];
        break;
      case 'code':
        baseNode.marks = [{ type: 'code' }];
        break;
      case 'highlight':
        baseNode.marks = [{ type: 'highlight' }];
        break;
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: [baseNode]
        };
    }

    return baseNode;
  }

  /**
   * INSERT CALLOUT
   * Create a formatted callout block
   */
  createCallout(text: string, type: 'info' | 'warning' | 'tip' | 'remember'): TiptapNode {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      tip: '💡',
      remember: '🧠'
    }[type];

    return {
      type: 'blockquote',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: `${emoji} ${text}`
        }]
      }]
    };
  }

  /**
   * INSERT EQUATION
   * Create a KaTeX equation node
   */
  createEquation(latex: string, inline: boolean = false): TiptapNode {
    if (inline) {
      return {
        type: 'text',
        text: `$${latex}$`,
        marks: [{ type: 'code' }]
      };
    }

    return {
      type: 'paragraph',
      content: [{
        type: 'text',
        text: `$$${latex}$$`,
        marks: [{ type: 'code' }]
      }]
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert plain text to basic Tiptap document
 */
export function textToTiptapDoc(text: string): TiptapDocument {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

  return {
    type: 'doc',
    content: paragraphs.map(p => ({
      type: 'paragraph',
      content: [{
        type: 'text',
        text: p.trim()
      }]
    }))
  };
}

/**
 * Convert Tiptap document to plain text
 */
export function tiptapDocToText(doc: TiptapDocument): string {
  function nodeToText(node: TiptapNode): string {
    if (node.text) return node.text;
    if (node.content) {
      return node.content.map(nodeToText).join('');
    }
    return '';
  }

  return doc.content.map(nodeToText).join('\n\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT CREATOR FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

export function createEditorAgent(geminiApiKey: string): EditorAgent {
  return new EditorAgent(geminiApiKey);
}
