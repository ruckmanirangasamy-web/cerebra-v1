/**
 * DISPATCHER AGENT
 * ScholarSync - Part 10: The Memory Engine
 *
 * The Dispatcher is the central routing intelligence for all AI interactions.
 * It classifies user intent and routes to the appropriate specialist agent.
 *
 * Model: gemini-1.5-flash
 * Temperature: 0.0 (deterministic routing)
 * Max Tokens: 150
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface AppContext {
  currentPage: string;
  missionActive: boolean;
  subject: string | null;
  topic: string | null;
  uid: string;
  vaultIds: string[];
  cognitiveMode: 'sniper' | 'scholar';
  sourceLock: 'strict' | 'hybrid';
  baseline: 'novice' | 'intermediate' | 'advanced';
  sessionActive: boolean;
}

export interface DispatcherRouting {
  primaryAgent: 'exam_solver' | 'temporal_agent' | 'editor_agent' | 'librarian_agent' | 'general';
  secondaryAgent: 'exam_solver' | 'temporal_agent' | 'editor_agent' | 'librarian_agent' | null;
  intent: string;
  contextNeeded: ('mission' | 'vault' | 'schedule' | 'session' | 'prophecy' | 'history')[];
  urgency: 'immediate' | 'background';
}

export interface DispatcherConfig {
  geminiApiKey: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPATCHER AGENT CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class DispatcherAgent {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor(config: DispatcherConfig) {
    this.gemini = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });
  }

  /**
   * MAIN DISPATCH METHOD
   * Classifies user input and returns routing decision
   */
  async dispatch(userInput: string, appContext: AppContext): Promise<DispatcherRouting> {
    const classificationPrompt = this.buildClassificationPrompt(userInput, appContext);

    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: classificationPrompt }]
        }],
        generationConfig: {
          temperature: 0.0,      // Deterministic routing - CRITICAL
          maxOutputTokens: 150
        }
      });

      const responseText = result.response.text();
      return this.parseRoutingResponse(responseText);

    } catch (error) {
      console.error('[DISPATCHER] Classification failed:', error);
      // Fallback to general agent
      return {
        primaryAgent: 'general',
        secondaryAgent: null,
        intent: 'general conversation',
        contextNeeded: [],
        urgency: 'immediate'
      };
    }
  }

  /**
   * BUILD CLASSIFICATION PROMPT
   * System prompt for intent classification
   */
  private buildClassificationPrompt(userInput: string, appContext: AppContext): string {
    return `You are the Dispatcher for ScholarSync, an AI study app.
Classify the user's intent and route it to the correct agent.

AGENTS AVAILABLE:
- exam_solver: answering study questions, explaining concepts, PYQ practice
- temporal_agent: scheduling, planning, calendar management, time estimates
- editor_agent: formatting text, restructuring notes, improving writing
- librarian_agent: finding connected notes, cross-referencing vault content
- compound: requires two agents in sequence
- general: simple conversation or request that needs no specialist agent

APP CONTEXT:
- Active page: ${appContext.currentPage}
- Mission active: ${appContext.missionActive}
- Subject: ${appContext.subject || 'none'}
- Topic: ${appContext.topic || 'none'}
- Cognitive mode: ${appContext.cognitiveMode}
- Source lock: ${appContext.sourceLock}
- Session active: ${appContext.sessionActive}
- Student input: '${userInput}'

CONTEXT INJECTION OPTIONS:
- 'mission': mission context (subject, examDate, daysRemaining, cognitiveMode, sourceLock, baseline)
- 'vault': top 5 matching vault chunks via vector search (RAG)
- 'schedule': next 7 days of calendar blocks
- 'session': active study session details
- 'prophecy': top 5 Prophecy Engine topics from frequency matrix
- 'history': last 5 messages from conversation history

Return ONLY a JSON object with NO markdown formatting, NO backticks:
{
  "primaryAgent": "exam_solver" | "temporal_agent" | "editor_agent" | "librarian_agent" | "general",
  "secondaryAgent": null | "exam_solver" | "temporal_agent" | "editor_agent" | "librarian_agent",
  "intent": "1-4 word description of what the student wants",
  "contextNeeded": ["mission", "vault", "schedule", "session", "prophecy", "history"],
  "urgency": "immediate" | "background"
}`;
  }

  /**
   * PARSE ROUTING RESPONSE
   * Extract JSON from model response
   */
  private parseRoutingResponse(responseText: string): DispatcherRouting {
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const routing = JSON.parse(cleanedText);

      // Validate required fields
      if (!routing.primaryAgent || !routing.intent || !routing.urgency) {
        throw new Error('Missing required routing fields');
      }

      return {
        primaryAgent: routing.primaryAgent,
        secondaryAgent: routing.secondaryAgent || null,
        intent: routing.intent,
        contextNeeded: routing.contextNeeded || [],
        urgency: routing.urgency
      };

    } catch (error) {
      console.error('[DISPATCHER] Failed to parse routing response:', error);
      console.error('[DISPATCHER] Raw response:', responseText);

      // Fallback routing
      return {
        primaryAgent: 'general',
        secondaryAgent: null,
        intent: 'general conversation',
        contextNeeded: [],
        urgency: 'immediate'
      };
    }
  }

  /**
   * COMPOUND INTENT HANDLER
   * Executes two agents in sequence for compound intents
   */
  async handleCompoundIntent(
    routing: DispatcherRouting,
    userInput: string,
    context: any,
    agentExecutors: {
      exam_solver: (input: string, ctx: any) => Promise<any>;
      temporal_agent: (input: string, ctx: any) => Promise<any>;
      editor_agent: (input: string, ctx: any) => Promise<any>;
      librarian_agent: (input: string, ctx: any) => Promise<any>;
    }
  ): Promise<{ primary: any; secondary: any | null }> {

    // Execute primary agent
    const primaryExecutor = agentExecutors[routing.primaryAgent as keyof typeof agentExecutors];
    if (!primaryExecutor) {
      throw new Error(`No executor found for agent: ${routing.primaryAgent}`);
    }

    const primaryResult = await primaryExecutor(userInput, context);

    // Execute secondary agent if exists
    let secondaryResult = null;
    if (routing.secondaryAgent) {
      const secondaryExecutor = agentExecutors[routing.secondaryAgent as keyof typeof agentExecutors];
      if (secondaryExecutor) {
        // Use primary result as context for secondary agent
        const enrichedContext = {
          ...context,
          primaryAgentResult: primaryResult
        };
        secondaryResult = await secondaryExecutor(userInput, enrichedContext);
      }
    }

    return {
      primary: primaryResult,
      secondary: secondaryResult
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT ASSEMBLY UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Assemble context based on what the Dispatcher requested
 */
export async function assembleContext(
  contextNeeded: DispatcherRouting['contextNeeded'],
  appContext: AppContext,
  dataFetchers: {
    getMissionContext?: () => Promise<any>;
    getVaultChunks?: (query: string) => Promise<any[]>;
    getSchedule?: () => Promise<any[]>;
    getSession?: () => Promise<any>;
    getProphecyTopics?: () => Promise<any[]>;
    getHistory?: () => Promise<any[]>;
  }
): Promise<Record<string, any>> {
  const assembledContext: Record<string, any> = {};

  for (const contextType of contextNeeded) {
    try {
      switch (contextType) {
        case 'mission':
          if (dataFetchers.getMissionContext) {
            assembledContext.mission = await dataFetchers.getMissionContext();
          }
          break;

        case 'vault':
          if (dataFetchers.getVaultChunks) {
            assembledContext.vaultChunks = await dataFetchers.getVaultChunks('');
          }
          break;

        case 'schedule':
          if (dataFetchers.getSchedule) {
            assembledContext.schedule = await dataFetchers.getSchedule();
          }
          break;

        case 'session':
          if (dataFetchers.getSession) {
            assembledContext.session = await dataFetchers.getSession();
          }
          break;

        case 'prophecy':
          if (dataFetchers.getProphecyTopics) {
            assembledContext.prophecyTopics = await dataFetchers.getProphecyTopics();
          }
          break;

        case 'history':
          if (dataFetchers.getHistory) {
            assembledContext.conversationHistory = await dataFetchers.getHistory();
          }
          break;
      }
    } catch (error) {
      console.error(`[DISPATCHER] Failed to fetch ${contextType} context:`, error);
    }
  }

  return assembledContext;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT INSTANCE CREATOR
// ══════════════════════════════════════════════════════════════════════════════

export function createDispatcher(geminiApiKey: string): DispatcherAgent {
  return new DispatcherAgent({ geminiApiKey });
}
