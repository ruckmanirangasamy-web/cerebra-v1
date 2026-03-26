/**
 * AGENT CONFIGURATION & INITIALIZATION SYSTEM
 * ScholarSync - Central Agent Management
 *
 * This file provides:
 * - Single entry point for all agents
 * - Configuration management
 * - Agent initialization
 * - Shared utilities
 */

import { DispatcherAgent, createDispatcher } from './dispatcher';
import { ExamSolverAgent, createExamSolver } from './exam-solver';
import { TemporalAgent, createTemporalAgent, QuickTodoParser, createQuickTodoParser } from './temporal-agent';
import { EditorAgent, createEditorAgent } from './editor-agent';
import { LibrarianAgent, createLibrarianAgent, LIBRARIAN_THRESHOLDS } from './librarian-agent';
import { PYQSniperAgent, createPYQSniper } from './pyq-sniper';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface AgentConfig {
  geminiApiKey: string;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  enableLogging?: boolean;
}

export interface AgentManager {
  dispatcher: DispatcherAgent;
  examSolver: ExamSolverAgent;
  temporal: TemporalAgent;
  editor: EditorAgent;
  librarian: LibrarianAgent;
  pyqSniper: PYQSniperAgent;
  quickTodoParser: QuickTodoParser;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT MANAGER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class ScholarSyncAgents {
  private config: AgentConfig;
  public agents: AgentManager;

  constructor(config: AgentConfig) {
    this.config = config;

    if (this.config.enableLogging) {
      console.log('[AGENTS] Initializing ScholarSync AI Agents...');
    }

    // Initialize all agents
    this.agents = {
      dispatcher: createDispatcher(config.geminiApiKey),
      examSolver: createExamSolver(config.geminiApiKey),
      temporal: createTemporalAgent(config.geminiApiKey),
      editor: createEditorAgent(config.geminiApiKey),
      librarian: createLibrarianAgent(config.geminiApiKey),
      pyqSniper: createPYQSniper(config.geminiApiKey),
      quickTodoParser: createQuickTodoParser(config.geminiApiKey)
    };

    if (this.config.enableLogging) {
      console.log('[AGENTS] ✅ All agents initialized successfully');
      this.logAgentInfo();
    }
  }

  /**
   * Get specific agent by name
   */
  getAgent<T extends keyof AgentManager>(agentName: T): AgentManager[T] {
    return this.agents[agentName];
  }

  /**
   * Log agent information
   */
  private logAgentInfo(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                  ScholarSync AI Agents Loaded                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🧭 Dispatcher Agent      → Intent routing & context assembly    ║
║  🎓 Exam Solver Agent     → Oracle (Sniper + Scholar modes)      ║
║  ⏰ Temporal Agent        → Schedule planning & task parsing     ║
║  ✨ Editor Agent          → Auto-Weave, improve, summarize       ║
║  📚 Librarian Agent       → Ghost Mode, cross-ref, auto-sort     ║
║  🎯 PYQ Sniper Agent      → Source-locked exam answers           ║
║  ✅ Quick Todo Parser     → Natural language task extraction     ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  System Prompts: SP-01 through SP-14 (versioned)                ║
║  Similarity Thresholds:                                          ║
║    • Ghost Mode: ${LIBRARIAN_THRESHOLDS.GHOST_MODE}                                    ║
║    • Cross-reference: ${LIBRARIAN_THRESHOLDS.CROSS_REFERENCE}                                 ║
║    • Auto-sort: ${LIBRARIAN_THRESHOLDS.AUTO_SORT}                                    ║
║    • Duplicate: ${LIBRARIAN_THRESHOLDS.DUPLICATE}                                    ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Health check - verify all agents are responsive
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'error';
    agents: Record<string, boolean>;
  }> {
    const agentStatus: Record<string, boolean> = {};

    // Simple check: verify each agent exists and is initialized
    Object.entries(this.agents).forEach(([name, agent]) => {
      agentStatus[name] = agent !== null && agent !== undefined;
    });

    const allHealthy = Object.values(agentStatus).every(status => status);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      agents: agentStatus
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION HELPER
// ══════════════════════════════════════════════════════════════════════════════

let agentManagerInstance: ScholarSyncAgents | null = null;

/**
 * Initialize the agent system (call once at app startup)
 */
export function initializeAgents(config: AgentConfig): ScholarSyncAgents {
  if (agentManagerInstance) {
    console.warn('[AGENTS] Agent system already initialized. Returning existing instance.');
    return agentManagerInstance;
  }

  agentManagerInstance = new ScholarSyncAgents(config);
  return agentManagerInstance;
}

/**
 * Get the agent manager instance
 */
export function getAgentManager(): ScholarSyncAgents {
  if (!agentManagerInstance) {
    throw new Error('[AGENTS] Agent system not initialized. Call initializeAgents() first.');
  }
  return agentManagerInstance;
}

/**
 * Quick access to specific agents
 */
export function getDispatcher(): DispatcherAgent {
  return getAgentManager().agents.dispatcher;
}

export function getExamSolver(): ExamSolverAgent {
  return getAgentManager().agents.examSolver;
}

export function getTemporal(): TemporalAgent {
  return getAgentManager().agents.temporal;
}

export function getEditor(): EditorAgent {
  return getAgentManager().agents.editor;
}

export function getLibrarian(): LibrarianAgent {
  return getAgentManager().agents.librarian;
}

export function getPYQSniper(): PYQSniperAgent {
  return getAgentManager().agents.pyqSniper;
}

export function getQuickTodoParser(): QuickTodoParser {
  return getAgentManager().agents.quickTodoParser;
}

// ══════════════════════════════════════════════════════════════════════════════
// RE-EXPORT ALL AGENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type {
  AppContext,
  DispatcherRouting
} from './dispatcher';

export type {
  OracleMessage,
  OracleOptions,
  RetrievedChunk,
  ParsedOracleResponse
} from './exam-solver';

export type {
  CalendarAction,
  TemporalProposal,
  TemporalContext,
  ParsedTask
} from './temporal-agent';

export type {
  TiptapNode,
  TiptapDocument,
  EditorOperation
} from './editor-agent';

export type {
  VaultMatch,
  CrossReference,
  PYQQuestion
} from './librarian-agent';

export type {
  PYQResult
} from './pyq-sniper';

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT REGISTRY (SP-01 through SP-14)
// ══════════════════════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT_REGISTRY = {
  'SP-01': 'Oracle Sniper v3.1',
  'SP-02': 'Oracle Scholar v2.4',
  'SP-03': 'Concept Primer',
  'SP-04': 'Command Dock Open Web',
  'SP-05': 'Command Dock Strict Tutor',
  'SP-06': 'Temporal Agent',
  'SP-07': 'PYQ Sniper',
  'SP-08': 'Vision Solve',
  'SP-09': 'Vision Scan',
  'SP-10': 'Dispatcher',
  'SP-11': 'PYQ Extractor',
  'SP-12': 'Cross-ref Description',
  'SP-13': 'Auto-title',
  'SP-14': 'Codex Type Inference'
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export default {
  initializeAgents,
  getAgentManager,
  getDispatcher,
  getExamSolver,
  getTemporal,
  getEditor,
  getLibrarian,
  getPYQSniper,
  getQuickTodoParser,
  ScholarSyncAgents,
  SYSTEM_PROMPT_REGISTRY,
  LIBRARIAN_THRESHOLDS
};
