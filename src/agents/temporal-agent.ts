// @ts-nocheck
/**
 * TEMPORAL AGENT
 * ScholarSync - Part 11: RAG Agent Full Implementation
 *
 * The Temporal Agent handles all schedule and calendar operations.
 * It parses natural language commands and proposes structured calendar changes.
 *
 * CRITICAL UX CONTRACT: NEVER execute without student confirmation.
 * Always propose first → student confirms → then execute.
 *
 * Model: gemini-1.5-pro
 * Temperature: 0.3 (structured output needs low variance)
 * Max Tokens: 1200
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface CalendarAction {
  type: 'create' | 'update' | 'delete';
  blockId: string | null;
  subject: string;
  topic: string;
  date: string;          // 'YYYY-MM-DD'
  startTime: string;     // 'HH:MM'
  endTime: string;       // 'HH:MM'
  mode: 'sniper' | 'scholar';
  reason: string;        // Why this slot was chosen
}

export interface TemporalProposal {
  summary: string;                  // One sentence describing the change
  agentBatchId: string;            // For undo grouping
  actions: CalendarAction[];
}

export interface TemporalContext {
  scheduleBlocks: Array<{
    blockId: string;
    subject: string;
    topic: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  missionContext: {
    subject: string;
    examDate: string;
    daysRemaining: number;
    cognitiveMode: 'sniper' | 'scholar';
    overallMastery: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT (SP-06)
// ══════════════════════════════════════════════════════════════════════════════

function TEMPORAL_SYSTEM(scheduleContext: string, missionContext: string): string {
  return `You are the Temporal Agent for ScholarSync — a scheduling AI assistant.

CAPABILITIES: Schedule/move/resize/delete study blocks. Suggest optimal arrangements.
CONSTRAINT: NEVER execute without a confirmed proposal. Always propose first.

CURRENT SCHEDULE:
${scheduleContext}

STATUS VALUES: Backlog, Unstarted, In Progress, Completed, Cancelled

MISSION CONTEXT:
${missionContext}

PROPOSAL FORMAT — return this JSON inside triple backticks on every response:
\`\`\`json
{
  "summary": "one sentence describing the change",
  "agentBatchId": "uuid",
  "actions": [
    {
      "type": "create|update|delete",
      "blockId": "id-or-null",
      "subject": "...",
      "topic": "...",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "status": "Backlog|Unstarted|In Progress|Completed|Cancelled",
      "mode": "sniper|scholar",
      "reason": "why this slot"
    }
  ]
}
\`\`\`
Add one sentence of plain English after the JSON. Never execute unilaterally.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPORAL AGENT CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class TemporalAgent {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor(geminiApiKey: string) {
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
  }

  /**
   * MAIN PROPOSE METHOD
   * Parses natural language command and returns structured proposal
   */
  async propose(
    command: string,
    context: TemporalContext,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<{ proposal: TemporalProposal | null; rawText: string }> {

    const systemPrompt = TEMPORAL_SYSTEM(
      JSON.stringify(context.scheduleBlocks.slice(0, 30), null, 2),
      JSON.stringify(context.missionContext, null, 2)
    );

    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: systemPrompt
    });

    try {
      const messages = [
        ...conversationHistory.map(m => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: m.content }]
        })),
        { role: 'user' as const, parts: [{ text: command }] }
      ];

      const result = await this.model.generateContent({
        contents: messages,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200
        }
      });

      const rawText = result.response.text();
      const proposal = this.extractProposal(rawText);

      return { proposal, rawText };

    } catch (error) {
      console.error('[TEMPORAL_AGENT] Proposal generation failed:', error);
      throw error;
    }
  }

  /**
   * EXTRACT PROPOSAL
   * Parse JSON proposal from model response
   */
  private extractProposal(rawText: string): TemporalProposal | null {
    const match = rawText.match(/```json\s*([\s\S]*?)```/);
    if (!match) {
      console.warn('[TEMPORAL_AGENT] No JSON block found in response');
      return null;
    }

    try {
      const proposal = JSON.parse(match[1].trim()) as TemporalProposal;

      // Ensure agentBatchId exists
      if (!proposal.agentBatchId) {
        proposal.agentBatchId = crypto.randomUUID();
      }

      // Validate required fields
      if (!proposal.summary || !proposal.actions || proposal.actions.length === 0) {
        console.warn('[TEMPORAL_AGENT] Invalid proposal structure');
        return null;
      }

      return proposal;

    } catch (error) {
      console.error('[TEMPORAL_AGENT] Failed to parse proposal JSON:', error);
      return null;
    }
  }

  /**
   * EXECUTE PROPOSAL
   * Writes calendar changes to Firebase (only after confirmation)
   */
  async executeProposal(
    proposal: TemporalProposal,
    uid: string,
    firebaseWriter: {
      createBlock: (block: any) => Promise<void>;
      updateBlock: (blockId: string, updates: any) => Promise<void>;
      deleteBlock: (blockId: string) => Promise<void>;
    }
  ): Promise<void> {
    console.log('[TEMPORAL_AGENT] Executing proposal:', proposal.agentBatchId);

    try {
      await Promise.all(
        proposal.actions.map(async (action) => {
          if (action.type === 'delete' && action.blockId) {
            await firebaseWriter.deleteBlock(action.blockId);
            return;
          }

          const blockId = action.blockId ?? crypto.randomUUID();
          const [startHour, startMin] = action.startTime.split(':').map(Number);
          const [endHour, endMin] = action.endTime.split(':').map(Number);
          const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

          const blockData = {
            subject: action.subject,
            topic: action.topic,
            date: action.date,
            startTime: action.startTime,
            endTime: action.endTime,
            duration,
            mode: action.mode,
            isAIPlaced: true,
            status: 'scheduled',
            agentBatchId: proposal.agentBatchId,
            agentAction: action.type,
            uid,
            createdAt: new Date()
          };

          if (action.type === 'create') {
            await firebaseWriter.createBlock(blockData);
          } else if (action.type === 'update' && action.blockId) {
            await firebaseWriter.updateBlock(action.blockId, blockData);
          }
        })
      );

      console.log('[TEMPORAL_AGENT] Proposal executed successfully');

    } catch (error) {
      console.error('[TEMPORAL_AGENT] Execution failed:', error);
      throw error;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUICK TODO PARSER (SP-06 variant for Quick To-Do tool)
// ══════════════════════════════════════════════════════════════════════════════

export interface ParsedTask {
  title: string;
  subject: string | null;
  dueDate: string | null;      // 'YYYY-MM-DD'
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  mode: 'sniper' | 'scholar';
  confidence: {
    subject: number;
    dueDate: number;
    estimatedMinutes: number;
  };
}

export class QuickTodoParser {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor(geminiApiKey: string) {
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });
  }

  /**
   * PARSE TASK INPUT
   * Extract structured task data from natural language
   * Called with 500ms debounce as student types
   */
  async parseTask(rawInput: string): Promise<ParsedTask> {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Today's date: ${today}
Extract structured task data from this natural language input.
Return ONLY a JSON object with no additional text:
{
  "title": "the core task description, clean",
  "subject": "inferred subject name, null if not mentioned",
  "dueDate": "ISO date 'YYYY-MM-DD', null if not mentioned",
  "priority": "high" | "medium" | "low",
  "estimatedMinutes": "inferred from task type and any mentions",
  "mode": "sniper" | "scholar",
  "confidence": {
    "subject": 0.0-1.0,
    "dueDate": 0.0-1.0,
    "estimatedMinutes": 0.0-1.0
  }
}

Priority inference rules:
- 'urgent', 'critical', 'must', 'before exam' → high
- 'should', 'need to' → medium
- everything else → low

Time estimation rules:
- 'revise', 'review' → 60 minutes
- 'practice MCQs', 'drill' → 30 minutes
- 'read chapter', 'understand' → 45 minutes
- Explicit time mentions override these defaults

Mode inference rules:
- 'practice', 'drill', 'MCQs', 'test' → sniper
- 'understand', 'summarise', 'notes', 'explain' → scholar

Input: '${rawInput}'`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,        // Deterministic extraction
          maxOutputTokens: 200
        }
      });

      const responseText = result.response.text()
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      return JSON.parse(responseText);

    } catch (error) {
      console.error('[QUICK_TODO_PARSER] Parse failed:', error);

      // Fallback: basic parsing
      return {
        title: rawInput,
        subject: null,
        dueDate: null,
        priority: 'medium',
        estimatedMinutes: 60,
        mode: 'scholar',
        confidence: {
          subject: 0.0,
          dueDate: 0.0,
          estimatedMinutes: 0.5
        }
      };
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT CREATOR FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export function createTemporalAgent(geminiApiKey: string): TemporalAgent {
  return new TemporalAgent(geminiApiKey);
}

export function createQuickTodoParser(geminiApiKey: string): QuickTodoParser {
  return new QuickTodoParser(geminiApiKey);
}
