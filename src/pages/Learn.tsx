import React, { useState, useEffect, useRef, Component, ErrorInfo } from 'react';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#fee' }}>
          <h2>Something went wrong in Learn.tsx.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            {'\n'}
            {this.state.error && this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import { 
  Lock, Unlock, Play, Pause, Square, Maximize2, 
  ChevronDown, Search, FileText, Network, 
  Zap, BookOpen, Puzzle, FileEdit, Mic,
  CheckCircle2, Circle, X, Menu,
  Layers, Target, Flame, Camera, Sparkles, Send, Sigma, Ghost,
  MessageSquare, LayoutDashboard, Clock, Activity, Brain, Users,
  Link as LinkIcon, Calendar, Droplets, History, ArrowRight,
  Plus, Upload, Flag, CheckSquare, ChevronRight, ChevronUp, HelpCircle, Paperclip,
  Edit2, Trash2, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Markdown from 'react-markdown';
import AgentWritingPanel from '../components/learn/AgentWritingPanel';
import { useAuth } from '../lib/AuthContext';
import { useMission } from '../lib/MissionContext';
import { uploadVaultFile, validateFile, subscribeToVaultItems } from '../services/vaultService';
import { createTask, updateTask, deleteTask, subscribeTasks, subscribeCalendarBlocks, createCalendarBlock, updateCalendarBlock, deleteCalendarBlock } from '../services/scheduleService';
import { KanbanTask, CalendarBlock } from '../services/scheduleTypes';
import { subscribeToTopicCoverage, updateTopicCoverage, addTopicCoverage, deleteTopicCoverage, subscribeToConversations, createConversation, addOracleMessage, subscribeToMessages, subscribeToResources, addResource, deleteResource } from '../services/learnService';
import { OracleConversation, OracleMessage as OracleMsg } from '../services/learnTypes';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function Learn() {
  const { user } = useAuth();
  const { missionId, missionData } = useMission();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isLectureMode, setIsLectureMode] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isPYQOpen, setIsPYQOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'source' | 'chat' | 'manage'>('chat');
  const [activeBottomTab, setActiveBottomTab] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [triggerSend, setTriggerSend] = useState(0);
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [conversations, setConversations] = useState<OracleConversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OracleMsg[]>([]);
  const [sourceText, setSourceText] = useState(`3.4 Synaptic Transmission\n\nWhen an action potential reaches the axon terminal, it depolarizes the membrane and opens voltage-gated Na+ channels. Na+ ions enter the cell, further depolarizing the presynaptic membrane. This depolarization causes voltage-gated Ca2+ channels to open.\n\nCalcium ions entering the cell initiate a signaling cascade that causes synaptic vesicles, containing neurotransmitter molecules, to fuse with the presynaptic membrane.\n\nThe fusion of vesicles releases neurotransmitters into the synaptic cleft via exocytosis.\n\nOnce in the synaptic cleft, neurotransmitters bind to specific receptors on the postsynaptic membrane, leading to either excitatory or inhibitory postsynaptic potentials (EPSPs or IPSPs).`);
  const [dynamicQuestions, setDynamicQuestions] = useState<any>({});
  const [resources, setResources] = useState<any[]>([]);

  // Subscribe to Tasks
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeTasks((data) => setTasks(data));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to Today's Calendar Blocks
  useEffect(() => {
    if (!user?.uid) return;
    const today = new Date().toISOString().split('T')[0];
    const unsub = subscribeCalendarBlocks(today, today, (data) => setCalendarBlocks(data));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to Topic Coverage
  useEffect(() => {
    if (!user?.uid || !missionId) return;
    const unsub = subscribeToTopicCoverage(user.uid, missionId, (data) => setTopics(data));
    return () => unsub();
  }, [user?.uid, missionId]);

  // Subscribe to Resource Links
  useEffect(() => {
    if (!user?.uid || !missionId) return;
    const unsub = subscribeToResources(user.uid, missionId, (data) => setResources(data));
    return () => unsub();
  }, [user?.uid, missionId]);

  // Subscribe to Vault Items (Sources) for Resource Links
  // Guard: missionId must be non-null and non-empty to form a valid Firestore path
  const [vaultSources, setVaultSources] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.uid || !missionId || missionId === 'null') return;
    // missionData.vaultId is the actual vault folder ID; fall back to missionId if not set
    const vaultFolderId = missionData.vaultId || missionId;
    if (!vaultFolderId || vaultFolderId === 'null') return;
    const unsub = subscribeToVaultItems(user.uid, vaultFolderId, 'source', (items) => {
      setVaultSources(items);
    });
    return () => unsub();
  }, [user?.uid, missionId, missionData.vaultId]);

  // Subscribe to Conversations
  useEffect(() => {
    if (!user?.uid || !missionData.subject || missionData.subject.trim() === '') return;
    const unsub = subscribeToConversations(user.uid, missionData.subject, (data) => {
      setConversations(data);
      if (data.length > 0 && !currentConvId) {
        setCurrentConvId(data[0].id);
      }
    });
    return () => unsub();
  }, [user?.uid, missionData.subject]);

  // Subscribe to Messages
  useEffect(() => {
    if (!user?.uid || !currentConvId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToMessages(user.uid, currentConvId, (data) => setMessages(data));
    return () => unsub();
  }, [user?.uid, currentConvId]);

  const handleTopicToggle = async (topicId: string, status: string) => {
    if (!user?.uid || !missionId) return;
    await updateTopicCoverage(user.uid, missionId, topicId, { status });
  };

  const handleAddTopic = async (title: string) => {
    if (!user?.uid || !missionId) return;
    await addTopicCoverage(user.uid, missionId, { 
      title, 
      status: 'pending', 
      order: topics.length,
      warning: false 
    });
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!user?.uid || !missionId) return;
    await deleteTopicCoverage(user.uid, missionId, topicId);
  };

  const handleOracleMessage = async (content: string, role: 'user' | 'assistant') => {
    if (!user?.uid || !missionData.subject) return;
    
    let convId = currentConvId;
    if (!convId) {
      const newConv = await createConversation(user.uid, {
        userId: user.uid,
        subjectId: missionData.subject,
        topicName: missionData.subject, // Or current chapter
        title: `Chat — ${missionData.subject}`,
        mode: (missionData.cognitiveMode as any) || 'scholar',
        sourceLock: 'hybrid',
        messageCount: 0,
        lastMessageAt: null,
        createdAt: null
      });
      convId = newConv.id;
      setCurrentConvId(convId);
    }

    await addOracleMessage(user.uid, convId, {
      role,
      content,
      citedPages: [],
      timestamp: null
    });
  };

  // Dynamic Question Generation
  useEffect(() => {
    const generateQuestions = async () => {
      if (!sourceText || !import.meta.env.VITE_GEMINI_API_KEY) return;
      
      try {
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `Based on the following source text, generate exactly 3 short, engaging study questions for each of these 4 modes: 'Scholar' (deep understanding), 'Sniper' (factual/precise), 'Assessment' (testing), and 'Blank Page' (prompting free-writing).
        
        Source Text: ${sourceText.substring(0, 2000)}
        
        Format the output as a valid JSON object with keys: scholar, sniper, assessment, blank. Each value should be an array of 3 strings.`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setDynamicQuestions(JSON.parse(jsonMatch[0]));
        }
      } catch (err) {
        console.error('Failed to generate dynamic questions:', err);
      }
    };

    const timer = setTimeout(generateQuestions, 2000); // Debounce
    return () => clearTimeout(timer);
  }, [sourceText]);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!user?.uid) return;
    await updateTask(taskId, {
      completedAt: completed ? new Date().toISOString() : null,
      status: completed ? 'Done' : 'In Progress'
    });
  };

  const handleTaskAdd = async (text: string) => {
    if (!user?.uid || !text.trim()) return;
    await createTask({
      title: text,
      subject: missionData.subject || 'Learn Hub',
      topic: `Learn Hub > ${missionData.subject || 'General'}`,
      missionId: missionId || '',
      priority: 'medium',
      status: 'In Progress',
      dueDate: new Date() as any,
      estimatedDuration: 30,
      actualDuration: 0,
      kanbanOrder: tasks.length + 1,
      completedAt: null,
      subtasks: [],
      linkedPYQIds: [],
      mode: 'scholar',
      subjectColour: '#10D9A0',
      createdFrom: 'manual',
      linkedCalendarBlockId: null,
      sourceReference: null,
      customProperties: {},
      dependencies: [],
      timelogs: [],
      labelIds: [],
      assigneeIds: [],
      attachmentCount: 0,
      linkCount: 0,
      parentTaskId: null
    });
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!user?.uid) return;
    await deleteTask(taskId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !missionId) return;

    // Optional: validation
    // const error = validateFile(file, 0); // Need to get current usage if we want strict enforcement
    // if (error) { alert(error.message); return; }

    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadVaultFile(
        user.uid,
        missionData.vaultId || 'default', // Fallback if vaultId isn't set yet
        missionData.subject || 'General',
        file,
        (progress) => setUploadProgress(progress)
      );
      // alert('File uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      // alert('Upload failed. Please try again.');
    }
  };

  const handleAddBlock = async (time: string, topic?: string) => {
    if (!user?.uid) return;
    await createCalendarBlock({
      subject: missionData.subject || 'Learn Hub',
      topic: topic || `Learn Hub > ${missionData.subject || 'General'}`,
      startTime: time,
      endTime: '',
      duration: 30,
      status: 'scheduled',
      date: new Date().toISOString().split('T')[0],
      sourceReference: '',
      missionId: missionId || '',
      taskId: '',
      mode: 'scholar',
      subjectColour: '#10D9A0',
      isAIPlaced: false,
      agentBatchId: null
    });
  };

  const handleDeleteBlock = async (id: string) => {
    if (!user?.uid) return;
    await deleteCalendarBlock(id);
  };

  const handleEditBlock = async (id: string, updates: any) => {
    if (!user?.uid) return;
    await updateCalendarBlock(id, updates);
  };

  const handleResourceAdd = async (title: string, url: string) => {
    if (!user?.uid || !missionId) return;
    await addResource(user.uid, missionId, { title, url });
  };

  const handleResourceDelete = async (resourceId: string) => {
    if (!user?.uid || !missionId) return;
    await deleteResource(user.uid, missionId, resourceId);
  };

  const handleSnipe = (q: string) => {
    setChatInput(q);
    setIsPYQOpen(false);
    setMobileTab('chat');
    setTriggerSend(prev => prev + 1);
  };

  return (
    <ErrorBoundary>
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col selection:bg-[#10D9A0]/30">
      <TopBar 
        isTimerRunning={isTimerRunning} 
        setIsTimerRunning={setIsTimerRunning} 
        timer={timer} 
        setTimer={setTimer} 
        activeBottomTab={activeBottomTab}
        setActiveBottomTab={setActiveBottomTab}
      />
      
      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex border-b border-slate-200 bg-white shrink-0">
        <button 
          onClick={() => setMobileTab('source')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileTab === 'source' ? 'text-[#10D9A0] border-b-2 border-[#10D9A0]' : 'text-slate-500'}`}
        >
          <FileText size={16} /> Source
        </button>
        <button 
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileTab === 'chat' ? 'text-[#A78BFA] border-b-2 border-[#A78BFA]' : 'text-slate-500'}`}
        >
          <MessageSquare size={16} /> Oracle
        </button>
        <button 
          onClick={() => setMobileTab('manage')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileTab === 'manage' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-500'}`}
        >
          <LayoutDashboard size={16} /> Manage
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`w-full lg:w-[30%] lg:flex flex-col border-r border-slate-200 bg-white/50 ${mobileTab === 'source' ? 'flex' : 'hidden'}`}>
          <LeftPanel 
            onUploadClick={() => fileInputRef.current?.click()} 
            onScanClick={() => cameraInputRef.current?.click()}
            sourceText={sourceText}
            setSourceText={setSourceText}
          />
        </div>
        
        <div className={`w-full lg:flex-1 lg:flex flex-col relative ${mobileTab === 'chat' ? 'flex' : 'hidden'}`}>
          <CenterPanel 
            chatInput={chatInput} 
            setChatInput={setChatInput} 
            triggerSend={triggerSend} 
            setTriggerSend={setTriggerSend} 
            onUploadClick={() => fileInputRef.current?.click()}
            messages={messages}
            onSendMessage={handleOracleMessage}
            conversations={conversations}
            currentConvId={currentConvId}
            onSelectConv={setCurrentConvId}
            uploading={uploading}
            uploadProgress={uploadProgress}
            dynamicQuestions={dynamicQuestions}
          />
        </div>
        
        <div className={`w-full lg:w-[30%] lg:flex flex-col border-l border-slate-200 bg-slate-50/50 overflow-y-auto custom-scrollbar ${mobileTab === 'manage' ? 'flex' : 'hidden'}`}>
          <RightPanel 
            setActiveBottomTab={setActiveBottomTab} 
            tasks={tasks} 
            onTaskToggle={handleTaskToggle}
            onTaskAdd={handleTaskAdd}
            onTaskDelete={handleTaskDelete}
            calendarBlocks={calendarBlocks}
            topics={topics}
            onTopicToggle={handleTopicToggle}
            onTopicAdd={handleAddTopic}
            onTopicDelete={handleDeleteTopic}
            onBlockAdd={handleAddBlock}
            onBlockDelete={handleDeleteBlock}
            onBlockEdit={handleEditBlock}
            sourceText={sourceText}
            onSnipe={handleSnipe}
            resources={resources}
            vaultSources={vaultSources}
            onResourceAdd={handleResourceAdd}
            onResourceDelete={handleResourceDelete}
          />
        </div>

        <MicroCodexDrawer isOpen={activeBottomTab === 'codex'} onClose={() => setActiveBottomTab(null)} />
        <FlagReviseDrawer isOpen={activeBottomTab === 'revise'} onClose={() => setActiveBottomTab(null)} />
        <PYQMatrixDrawer isOpen={activeBottomTab === 'pyq'} onClose={() => setActiveBottomTab(null)} />
        <CreateTaskDrawer isOpen={activeBottomTab === 'task'} onClose={() => setActiveBottomTab(null)} tasks={tasks} setTasks={setTasks} />
        <PYQAnalysisModal isOpen={isPYQOpen} onClose={() => setIsPYQOpen(false)} onSnipe={handleSnipe} />
      </div>

      {/* Hidden File Input for Vault Uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.txt,image/*,audio/*"
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="image/*"
        capture="environment"
      />

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {uploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-xs text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Upload className="text-blue-500 animate-bounce" size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">Uploading to Vault</h4>
              <p className="text-[10px] text-slate-500 mb-4">{Math.round(uploadProgress)}% Complete</p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

const TopBar = ({ isTimerRunning, setIsTimerRunning, timer, setTimer, activeBottomTab, setActiveBottomTab }: any) => {
  const [isLocked, setIsLocked] = useState(true);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  return (
    <div className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-2 sm:px-4 shrink-0 z-20">
      <div className="relative">
        <div 
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10D9A0] to-[#A78BFA] flex items-center justify-center font-bold text-white shadow-[0_2px_10px_rgba(16,217,160,0.2)] group-hover:shadow-[0_4px_15px_rgba(16,217,160,0.3)] transition-shadow">
            S
          </div>
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 group-hover:bg-slate-200 transition-colors">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-800">Neuroscience 101</span>
              <span className="text-[10px] text-[#059669] font-mono hidden sm:block">14 Days to Exam</span>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </div>
        </div>

        <AnimatePresence>
          {isProjectDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold text-slate-800">Quantum Physics</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#A78BFA]/10 text-[#7C3AED]">PHY</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Mastery</span>
                    <span className="font-mono text-[#059669]">68%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => setIsLocked(!isLocked)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors hidden sm:block" title="Source Lock">
          {isLocked ? <Lock size={16} className="text-[#059669]" /> : <Unlock size={16} />}
        </button>
        
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-sm shadow-inner">
          <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="text-slate-500 hover:text-[#059669] transition-colors">
            {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <AnimatePresence>
            {(isTimerRunning || timer < 25 * 60) && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
              >
                <span className="text-[#059669] font-bold">{formatTime(timer)}</span>
                <button onClick={() => { setTimer(25*60); setIsTimerRunning(false); }} className="text-slate-500 hover:text-red-500 transition-colors">
                  <Square size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Action Button */}
        <div className="relative">
          <button 
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className="p-2 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-colors shadow-sm"
            title="Quick Actions"
          >
            <Zap size={16} className="fill-yellow-500" />
          </button>
          
          <AnimatePresence>
            {isQuickActionOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
              >
                <button onClick={() => { setActiveBottomTab('revise'); setIsQuickActionOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center"><Flag size={14} className="text-red-500" /></div>
                  <span className="text-xs font-bold text-slate-700">Flag Revise</span>
                </button>
                <button onClick={() => { setActiveBottomTab('pyq'); setIsQuickActionOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><Flame size={14} className="text-orange-500" /></div>
                  <span className="text-xs font-bold text-slate-700">PYQ Matrix</span>
                </button>
                <button onClick={() => { setActiveBottomTab('task'); setIsQuickActionOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><CheckSquare size={14} className="text-blue-500" /></div>
                  <span className="text-xs font-bold text-slate-700">Create Task</span>
                </button>
                <button onClick={() => { setActiveBottomTab('codex'); setIsQuickActionOpen(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center"><Layers size={14} className="text-emerald-500" /></div>
                  <span className="text-xs font-bold text-slate-700">Micro Codex</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-3 hidden md:flex">
        <button className="px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium hover:bg-slate-200 flex items-center gap-2 transition-colors text-slate-700">
          <Maximize2 size={14} />
          <span>Lecture Mode</span>
        </button>
      </div>
    </div>
  );
};

const LeftPanel = ({ onUploadClick, onScanClick, sourceText, setSourceText }: any) => {
  const [activeTab, setActiveTab] = useState<'source' | 'graph'>('source');

  return (
    <>
      <div className="flex p-2 gap-1 border-b border-slate-200 bg-white">
        <button 
          onClick={() => setActiveTab('source')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${activeTab === 'source' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <FileText size={14} /> Source
        </button>
        <button 
          onClick={() => setActiveTab('graph')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${activeTab === 'graph' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          <Network size={14} /> Graph
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative bg-white">
        {activeTab === 'source' ? (
          <div className="absolute inset-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-mono text-slate-400">Page 42 / 156</span>
              <div className="flex gap-2">
                <div className="relative group">
                  <button className="px-2 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs flex items-center gap-1 font-medium border border-blue-100 transition-colors">
                    <Plus size={12} /> Upload
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                      <Layers size={12} /> From Vault
                    </button>
                    <button 
                      onClick={onUploadClick}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <Upload size={12} /> From Computer
                    </button>
                  </div>
                </div>
                <button 
                  onClick={onScanClick}
                  className="px-2 py-1.5 rounded bg-[#10D9A0]/10 text-[#059669] hover:bg-[#10D9A0]/20 text-xs flex items-center gap-1 font-medium border border-[#10D9A0]/20 transition-colors"
                >
                  <Camera size={12} /> Scan
                </button>
              </div>
            </div>
            <div className="prose prose-slate prose-sm max-w-none">
              <h2 className="text-xl font-bold text-slate-900 font-sans mb-4">3.4 Synaptic Transmission</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                When an action potential reaches the axon terminal, it depolarizes the membrane and opens voltage-gated Na+ channels. Na+ ions enter the cell, further depolarizing the presynaptic membrane. This depolarization causes voltage-gated Ca2+ channels to open.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                Calcium ions entering the cell initiate a signaling cascade that causes synaptic vesicles, containing neurotransmitter molecules, to fuse with the presynaptic membrane.
              </p>
              <div className="bg-[#A78BFA]/10 border-l-4 border-[#8B5CF6] p-4 my-6 rounded-r-md">
                <p className="text-[#6D28D9] text-sm font-medium m-0">The fusion of vesicles releases neurotransmitters into the synaptic cleft via exocytosis.</p>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Once in the synaptic cleft, neurotransmitters bind to specific receptors on the postsynaptic membrane, leading to either excitatory or inhibitory postsynaptic potentials (EPSPs or IPSPs).
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
             <svg width="100%" height="100%" viewBox="0 0 400 400">
                <defs>
                  <linearGradient id="edge-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <line x1="200" y1="200" x2="100" y2="100" stroke="url(#edge-grad-light)" strokeWidth="2" />
                <line x1="200" y1="200" x2="320" y2="140" stroke="url(#edge-grad-light)" strokeWidth="2" />
                <line x1="200" y1="200" x2="250" y2="300" stroke="url(#edge-grad-light)" strokeWidth="2" />
                <line x1="100" y1="100" x2="80" y2="220" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4" />
                <circle cx="200" cy="200" r="28" fill="white" stroke="#059669" strokeWidth="2" className="drop-shadow-md" />
                <circle cx="200" cy="200" r="24" fill="#10D9A0" fillOpacity="0.1" />
                <text x="200" y="204" textAnchor="middle" fill="#064E3B" fontSize="10" className="font-mono font-bold">Synapse</text>
                <circle cx="100" cy="100" r="24" fill="white" stroke="#7C3AED" strokeWidth="2" className="drop-shadow-md" />
                <circle cx="100" cy="100" r="20" fill="#A78BFA" fillOpacity="0.1" />
                <text x="100" y="104" textAnchor="middle" fill="#4C1D95" fontSize="10" className="font-mono">Vesicle</text>
                <circle cx="320" cy="140" r="20" fill="white" stroke="#94A3B8" strokeWidth="2" className="drop-shadow-sm" />
                <text x="320" y="144" textAnchor="middle" fill="#334155" fontSize="10" className="font-mono">Ca2+</text>
                <circle cx="250" cy="300" r="24" fill="white" stroke="#94A3B8" strokeWidth="2" className="drop-shadow-sm" />
                <text x="250" y="304" textAnchor="middle" fill="#334155" fontSize="10" className="font-mono">Receptor</text>
                <circle cx="80" cy="220" r="16" fill="white" stroke="#CBD5E1" strokeWidth="1" />
                <text x="80" y="224" textAnchor="middle" fill="#64748B" fontSize="8" className="font-mono">SNARE</text>
             </svg>
          </div>
        )}
      </div>
    </>
  );
};

const CenterPanel = ({ 
  chatInput, setChatInput, triggerSend, setTriggerSend, onUploadClick,
  messages, onSendMessage, conversations, currentConvId, onSelectConv,
  dynamicQuestions, uploading, uploadProgress
}: any) => {
  const { missionId, missionData } = useMission();
  const [mode, setMode] = useState<'sniper'|'scholar'|'assessment'|'blank'>('scholar');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [blankContent, setBlankContent] = useState('');
  const [blankReview, setBlankReview] = useState<null | { score: number; covered: string[]; missed: string[] }>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(true);
  const blankRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Mode metadata ─────────────────────────────────────────────────────────
  const MODES = {
    scholar: {
      label: 'Scholar', icon: <BookOpen size={15}/>, color: 'text-[#7C3AED]',
      accent: '#7C3AED', bg: 'bg-violet-50', border: 'border-violet-200',
      tagline: 'Deep structured understanding',
      description: 'I break every concept into Definition → Mechanism → Application, then challenge your understanding with a Socratic question.',
      pills: ['Concept Breakdown','Socratic Challenge','Layered Explanations'],
      greeting: "Welcome to Scholar mode. I'll structure every answer as Definition → Mechanism → Application, then challenge your thinking. What concept shall we dissect?",
    },
    sniper: {
      label: 'Sniper', icon: <Zap size={15}/>, color: 'text-amber-500',
      accent: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200',
      tagline: 'Precise, citation-tagged facts only',
      description: 'I output only bullet-point facts tagged with source page numbers. Zero fluff — every line is a high-yield exam fact.',
      pills: ['Bullet Points Only','Citation Tags','Exam-Ready Facts'],
      greeting: "Sniper mode engaged. I'll extract precise, citation-tagged facts. No fluff — only what's examinable. Ask anything.",
    },
    assessment: {
      label: 'Assessment', icon: <HelpCircle size={15}/>, color: 'text-emerald-600',
      accent: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200',
      tagline: 'Test yourself, get scored instantly',
      description: 'I ask you exam-style questions. Answer correctly → harder question. Answer wrong → I explain and retest.',
      pills: ['Adaptive Difficulty','Instant Feedback','Examiner Style'],
      greeting: "Assessment mode active. Tell me what topic to test you on and I'll calibrate the difficulty to your level.",
    },
    blank: {
      label: 'Blank Page', icon: <FileEdit size={15}/>, color: 'text-slate-700',
      accent: '#64748B', bg: 'bg-slate-50', border: 'border-slate-200',
      tagline: 'Write → AI grades your recall',
      description: 'The ultimate recall test: write everything you know from memory, then I score your recall out of 100 and show what you missed.',
      pills: ['Free Recall','AI Scoring /100','Gap Analysis'],
      greeting: '',
    },
  } as const;
  type ModeKey = keyof typeof MODES;

  const modeChips: Record<ModeKey, Array<{icon: React.ReactNode; text: string}>> = {
    scholar: (dynamicQuestions.scholar || [
      'Explain the mechanism of Action Potentials',
      'Compare EPSPs and IPSPs',
      'How do neurotransmitters cross the synaptic cleft?'
    ]).slice(0, 3).map((text: string, i: number) => ({ text, icon: [<BookOpen size={13} key="b"/>, <Network size={13} key="n"/>, <Brain size={13} key="br"/>][i] })),
    sniper: (dynamicQuestions.sniper || [
      'What is the resting membrane potential?',
      'List the main types of neurotransmitters.',
      'Summarize synaptic plasticity from the source.'
    ]).slice(0, 3).map((text: string, i: number) => ({ text, icon: [<Target size={13} key="t"/>, <Zap size={13} key="z"/>, <FileText size={13} key="f"/>][i] })),
    assessment: (dynamicQuestions.assessment || [
      'Quiz me on Synaptic Transmission',
      'Ask me a hard question about Neurotransmitters',
      'Give me a scenario-based question.'
    ]).slice(0, 3).map((text: string, i: number) => ({ text, icon: [<HelpCircle size={13} key="h"/>, <CheckCircle2 size={13} key="c"/>, <Layers size={13} key="l"/>][i] })),
    blank: [],
  };

  const cm = MODES[mode as ModeKey];
  const hasMessages = messages.length > 0;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);
  useEffect(() => { if (triggerSend > 0) handleSend(); }, [triggerSend]);

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    await onSendMessage(userMsg, 'user');
    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      let sys = '';
      if (mode === 'sniper') sys = 'You are Sniper mode. Output ONLY citation-tagged bullet points. Format: - Fact [p.XX]. NO paragraphs.';
      else if (mode === 'scholar') sys = 'You are Scholar mode. Respond STRICTLY: **1. Definition** → **2. Mechanism** → **3. Application**. End with a Socratic question prefixed "Now: ".';
      else if (mode === 'assessment') sys = 'You are an Assessment examiner. Ask exam-style questions. Escalate if correct, explain and retest if wrong. Always end with a new question.';
      const result = await model.generateContent(sys ? sys + '\n\nUser: ' + userMsg : userMsg);
      await onSendMessage(result.response.text(), 'assistant');
    } catch (err) {
      console.error(err);
      await onSendMessage('Oracle connection error. Please check your API key.', 'assistant');
    } finally { setIsLoading(false); }
  };

  const handleBlankReview = async () => {
    if (blankContent.trim().length < 20) return;
    setIsReviewing(true); setBlankReview(null);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(
        `You are a Blank Page Test evaluator. The student free-wrote their knowledge from memory. Score their recall and return ONLY a raw JSON object (no markdown):\n{"score":<0-100>,"covered":[<up to 6 strings: things they got right>],"missed":[<up to 6 strings: key things they missed>]}\n\nStudent writing:\n${blankContent}`
      );
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) setBlankReview(JSON.parse(match[0]));
    } catch (err) { console.error(err); } finally { setIsReviewing(false); }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setChatInput('So, if I understand correctly, the action potential is just ions moving back and forth across the membrane?');
      setTimeout(() => setTriggerSend((p: number) => p + 1), 100);
    } else { setIsRecording(true); }
  };

  const insertMd = (prefix: string, suffix = '') => {
    const ta = blankRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = blankContent.substring(s, e) || 'text';
    const newVal = blankContent.substring(0, s) + prefix + sel + suffix + blankContent.substring(e);
    setBlankContent(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + prefix.length, s + prefix.length + sel.length); }, 0);
  };

  const TBtn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center gap-1 text-xs font-medium">
      {children}
    </button>
  );

  return (
    <>
      {/* ── Mode Selector ──────────────────────────────────────── */}
      <div className="p-2 border-b border-slate-200 flex items-center gap-2 bg-white shrink-0 shadow-sm">
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 flex-1 gap-0.5">
          {(Object.entries(MODES) as [ModeKey, typeof MODES[ModeKey]][]).map(([key, m]) => (
            <button key={key} onClick={() => { setMode(key as any); setBlankReview(null); }} title={m.tagline}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                mode === key ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-200'
              }`}>
              <span className={mode === key ? m.color : 'text-slate-400'}>{m.icon}</span>
              <span className="hidden sm:inline">{m.label}</span>
              {mode === key && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: m.accent }}/>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setShowHistory(!showHistory)} title="Session history"
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            showHistory ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100'
          }`}>
          <History size={16}/>
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* History sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 216, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }} className="border-r border-slate-200 bg-white flex flex-col overflow-hidden shrink-0">
              <div className="p-3 flex justify-between items-center border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><History size={12}/> Sessions</span>
                <button onClick={() => onSelectConv(null)} className="p-1 rounded hover:bg-slate-100 text-[#10D9A0]" title="New chat"><Plus size={14}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {conversations.map((conv: any) => (
                  <div key={conv.id} onClick={() => { onSelectConv(conv.id); setShowHistory(false); }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      currentConvId === conv.id ? 'bg-[#10D9A0]/10 border-[#10D9A0]/40 text-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'
                    }`}>
                    <p className="text-xs font-semibold truncate">{conv.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{conv.messageCount || 0} messages</p>
                  </div>
                ))}
                {conversations.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-8">No past sessions</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BLANK PAGE MODE ──────────────────────────────────── */}
        {mode === 'blank' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* Info card */}
            <div className="p-3 border-b border-slate-200 bg-white shrink-0">
              <div className={`flex items-start gap-3 p-3 rounded-xl ${cm.bg} border ${cm.border}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cm.accent + '20' }}>
                  <span style={{ color: cm.accent }}><FileEdit size={17}/></span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-800">Blank Page Test</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">RECALL MODE</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{cm.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cm.pills.map(p => (
                      <span key={p} className="text-[9px] px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 font-medium bg-white">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 bg-white flex-wrap shrink-0">
                  <TBtn onClick={() => insertMd('**', '**')} title="Bold"><span className="font-extrabold">B</span></TBtn>
                  <TBtn onClick={() => insertMd('*', '*')} title="Italic"><span className="italic">I</span></TBtn>
                  <TBtn onClick={() => insertMd('__', '__')} title="Underline"><span className="underline">U</span></TBtn>
                  <div className="w-px h-4 bg-slate-200 mx-0.5"/>
                  <TBtn onClick={() => setBlankContent(c => c + '\n# ')} title="Heading 1"><span className="font-bold">H1</span></TBtn>
                  <TBtn onClick={() => setBlankContent(c => c + '\n## ')} title="Heading 2"><span className="font-bold">H2</span></TBtn>
                  <div className="w-px h-4 bg-slate-200 mx-0.5"/>
                  <TBtn onClick={() => setBlankContent(c => c + '\n- ')} title="Bullet list"><span>• list</span></TBtn>
                  <TBtn onClick={() => setBlankContent(c => c + '\n1. ')} title="Numbered list"><span>1. list</span></TBtn>
                  <div className="w-px h-4 bg-slate-200 mx-0.5"/>
                  <TBtn onClick={() => { setBlankContent(''); setBlankReview(null); }} title="Clear all"><Trash2 size={12}/><span>Clear</span></TBtn>
                  <div className="flex-1"/>
                  <span className="text-[9px] text-slate-400 font-mono">{blankContent.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <textarea ref={blankRef} value={blankContent} onChange={e => setBlankContent(e.target.value)}
                  placeholder="Write everything you know about the topic from memory...\nDon't look at your notes. This is a recall test."
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: '15px', lineHeight: '1.85' }}
                  className="flex-1 p-5 text-slate-800 bg-white resize-none outline-none custom-scrollbar"/>
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-3 shrink-0">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-slate-300 to-slate-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((blankContent.length / 400) * 100, 100)}%` }}/>
                  </div>
                  <button 
                    onClick={() => setIsAgentPanelOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <Sparkles size={13} className="text-indigo-500"/> Open AI Agent
                  </button>
                  <button onClick={handleBlankReview} disabled={blankContent.trim().length < 20 || isReviewing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#64748B,#334155)' }}>
                    {isReviewing
                      ? <><div className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin"/> Evaluating...</>
                      : <><ShieldCheck size={13}/> Submit for AI Review</>}
                  </button>
                </div>
              </div>

              {/* Agent Panel Overlay / Sidebar */}
              <AgentWritingPanel
                isOpen={isAgentPanelOpen}
                onClose={() => setIsAgentPanelOpen(false)}
                subject={missionData?.subject || "General"}
                topic={missionData?.missionName || "Study Topic"}
                editorContent={blankContent}
                onInsertText={(text) => {
                  setBlankContent(prev => prev + "\n\n" + text);
                }}
                missionId={missionId || ""}
              />

              {/* Review panel */}
              <AnimatePresence>
                {blankReview && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 264, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }} className="border-l border-slate-200 bg-white flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#10D9A0] to-[#A78BFA] flex items-center justify-center">
                          <Sparkles size={11} className="text-white"/>
                        </div>
                        <span className="text-xs font-bold text-slate-800">Oracle Review</span>
                      </div>
                      <div className="flex flex-col items-center py-3">
                        <div className="relative w-20 h-20">
                          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                            <circle cx="40" cy="40" r="34" fill="none"
                              stroke={blankReview.score >= 70 ? '#10D9A0' : blankReview.score >= 40 ? '#F59E0B' : '#EF4444'}
                              strokeWidth="8" strokeLinecap="round"
                              strokeDasharray={`${(blankReview.score / 100) * 213.6} 213.6`}/>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-slate-800">{blankReview.score}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">/100</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {blankReview.score >= 70 ? '🎯 Great recall!' : blankReview.score >= 40 ? '📚 Keep going' : '⚡ Study more'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {blankReview.covered.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle2 size={10}/> Covered</p>
                          {blankReview.covered.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2 mb-1.5">
                              <span className="text-emerald-500 shrink-0">✓</span> {item}
                            </div>
                          ))}
                        </div>
                      )}
                      {blankReview.missed.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Circle size={10}/> Missed</p>
                          {blankReview.missed.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700 bg-red-50 border border-red-100 rounded-lg p-2 mb-1.5">
                              <span className="text-red-400 shrink-0">○</span> {item}
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => { setBlankContent(''); setBlankReview(null); }}
                        className="w-full py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* ── CHAT MODES ──────────────────────────────────────── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50" style={{ padding: '20px 16px' }}>

              {/* Welcome card — only when no messages */}
              {!hasMessages && (
                <motion.div key={mode + '-welcome'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }} className="max-w-xl mx-auto space-y-5">

                  {/* Mode card */}
                  <div className={`rounded-2xl border p-4 ${cm.bg} ${cm.border}`}>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cm.accent + '18' }}>
                        <span style={{ color: cm.accent }}>{React.cloneElement(cm.icon as React.ReactElement<any>, { size: 20 })}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Oracle · {cm.label} Mode</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: cm.accent }}>ACTIVE</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{cm.tagline}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2.5">{cm.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cm.pills.map(p => (
                        <span key={p} className="text-[10px] px-2.5 py-0.5 rounded-full border font-semibold"
                          style={{ color: cm.accent, borderColor: cm.accent + '40', background: cm.accent + '10' }}>{p}</span>
                      ))}
                    </div>
                  </div>

                  {/* Oracle greeting */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10D9A0] to-[#A78BFA] flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                      <Sparkles size={12} className="text-white"/>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                      <span className="text-[10px] font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#7C3AED] uppercase block mb-1.5">Oracle</span>
                      <p className="text-sm text-slate-700 leading-relaxed">{cm.greeting}</p>
                    </div>
                  </div>

                  {/* Suggestion chips */}
                  {modeChips[mode as ModeKey].length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-10">Try asking</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                        {modeChips[mode as ModeKey].map((s, i) => (
                          <button key={i} onClick={() => { setChatInput(s.text); setTriggerSend((p: number) => p + 1); }}
                            className={`text-left p-3 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-all text-xs text-slate-700 flex items-start gap-2 group ${i === 2 ? 'sm:col-span-2' : ''}`}>
                            <span className="mt-0.5 shrink-0" style={{ color: cm.accent }}>{s.icon}</span>
                            <span className="font-medium leading-relaxed group-hover:text-slate-900 flex-1">{s.text}</span>
                            <ArrowRight size={11} className="ml-auto mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: cm.accent }}/>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Chat bubbles */}
              <div className="space-y-5 max-w-2xl mx-auto mt-4">
                {messages.map((msg: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2.5`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10D9A0] to-[#A78BFA] flex items-center justify-center shadow-sm shrink-0 mb-0.5">
                        <Sparkles size={12} className="text-white"/>
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-slate-800 text-white rounded-br-sm shadow-md'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.role === 'assistant' && (
                        <span className="text-[10px] font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#7C3AED] uppercase block mb-2">Oracle · {cm.label}</span>
                      )}
                      <div className={`prose prose-sm max-w-none font-sans ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-0.5">U</div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex items-end gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10D9A0] to-[#A78BFA] flex items-center justify-center shadow-sm shrink-0">
                      <Sparkles size={12} className="text-white"/>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-gradient-to-r from-[#10D9A0] to-[#7C3AED] animate-bounce" style={{ animationDelay: `${d}s` }}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef}/>
            </div>

            {/* ── Input Bar ─────────────────────────────────────── */}
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              {uploading && (
                <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2">
                  <Upload size={13} className="text-blue-500 animate-bounce shrink-0"/>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>Uploading to Vault...</span>
                      <span className="font-mono text-blue-600">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}/>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-[#A78BFA] focus-within:ring-2 focus-within:ring-[#A78BFA]/20 focus-within:bg-white transition-all shadow-sm">
                <button onClick={onUploadClick} className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors shrink-0 rounded-lg hover:bg-slate-100" title="Attach file">
                  <Paperclip size={17}/>
                </button>
                <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={mode === 'sniper' ? 'Enter concept for bullet-point facts...' : mode === 'assessment' ? 'Tell me what topic to test you on...' : 'Ask the Oracle a question...'}
                  className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] p-2 text-sm text-slate-800 placeholder-slate-400 font-sans custom-scrollbar" rows={1}/>
                <button onClick={toggleRecording}
                  className={`p-2.5 rounded-lg transition-colors shrink-0 ${isRecording ? 'bg-red-100 text-red-500' : 'text-slate-400 hover:bg-slate-100'}`} title="Voice input">
                  <Mic size={17} className={isRecording ? 'animate-pulse' : ''}/>
                </button>
                <button onClick={handleSend} disabled={!chatInput.trim() || isLoading}
                  className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-all shrink-0 shadow-sm"
                  style={{ background: isLoading ? '#94A3B8' : `linear-gradient(135deg, ${cm.accent} 0%, #1e293b 100%)` }} title="Send">
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    : <ArrowRight size={17}/>}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                {cm.tagline} · Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};




const RightPanel = ({ 
  setActiveBottomTab, tasks, onTaskToggle, onTaskAdd, onTaskDelete, calendarBlocks,
  topics, onTopicToggle, onTopicAdd, onTopicDelete, onBlockAdd, onBlockDelete, onBlockEdit, sourceText,
  onSnipe, resources, vaultSources, onResourceAdd, onResourceDelete
}: any) => {
  const { user } = useAuth();
  const { missionData } = useMission();

  const sortedTasks = [...tasks].sort((a, b) => {
    const aDone = a.completedAt !== null;
    const bDone = b.completedAt !== null;
    if (aDone === bDone) return 0;
    return aDone ? 1 : -1;
  });

  const addTask = () => {
    if (newTask.trim()) {
      onTaskAdd(newTask);
      setNewTask('');
    }
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      onTopicAdd(newTopic);
      setNewTopic('');
    }
  };

  const [newTask, setNewTask] = useState('');
  const [newTopic, setNewTopic] = useState('');

  const [quizState, setQuizState] = useState<'idle' | 'playing'>('idle');
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const [newBlockTime, setNewBlockTime] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editTime, setEditTime] = useState('');

  const [prophecyData, setProphecyData] = useState<any[]>([]);
  const [isAnalyzingPYQ, setIsAnalyzingPYQ] = useState(false);

  const analyzePYQ = async (file: File) => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return;
    setIsAnalyzingPYQ(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analyze the following Previous Year Questions (PYQ) against the current study Source Text.
      
      PYQ Content: ${file.name} (Assume this is a placeholder or extract text if possible, but for now I will use a generic prompt to simulate analysis)
      Source Text: ${sourceText.substring(0, 3000)}
      
      Task:
      1. Identify 3 high-yield topics from the Source Text that are frequently asked in PYQs.
      2. For each topic, provide a risk level (HIGH, MED, LOW) and frequency percentage.
      3. For the HIGH risk topic, provide 1 specific ranked question from the PYQs.
      
      Format the output as a valid JSON array of objects for the topics.
      Each topic object should have:
      - 'title': Topic name.
      - 'risk': 'HIGH', 'MED', or 'LOW'.
      - 'freq': Percentage string (e.g., '92%').
      - 'questions': An array of 1 object with 'q' (question text) and 'years' (string of years).`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setProphecyData(JSON.parse(jsonMatch[0]));
      }
    } catch (err) {
      console.error('Failed to analyze PYQ:', err);
    } finally {
      setIsAnalyzingPYQ(false);
    }
  };

  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState('5');
  const [selectedTopic, setSelectedTopic] = useState('General');

  const generateQuiz = async () => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return;
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Generate a study quiz based on the following source text.
      Topic: ${selectedTopic}
      Difficulty: ${difficulty}
      Number of questions: ${numQuestions}
      
      Source Text: ${sourceText.substring(0, 3000)}
      
      Format the output as a valid JSON array of objects. Each object must have:
      - 'q': The question string.
      - 'type': 'mcq' or 'boolean'.
      - 'options': An array of 4 strings for mcq, or null for boolean.
      - 'a': The correct answer string.
      - 'reason': A short explanation for the answer.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setFlashcards(JSON.parse(jsonMatch[0]));
        setQuizState('playing');
        setCurrentCard(0);
        setIsFlipped(false);
        setSelectedAnswer(null);
      }
    } catch (err) {
      console.error('Failed to generate quiz:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setIsFlipped(true);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      setCurrentCard((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  return (
    <div className="p-4 sm:p-5 space-y-6 pb-20">
      
      {/* Session Analytics */}
      <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center gap-1"><Clock size={12}/> Session Analytics</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-2 rounded-lg border border-orange-100 shadow-sm">
            <p className="text-[10px] text-orange-500">Time on Task</p>
            <p className="text-sm font-bold text-slate-800">42m <span className="text-[10px] text-slate-400 font-normal">/ 60m</span></p>
          </div>
          <div className="bg-white p-2 rounded-lg border border-orange-100 shadow-sm">
            <p className="text-[10px] text-orange-500">Oracle Calls</p>
            <p className="text-sm font-bold text-slate-800">14</p>
          </div>
          <div className="bg-white p-2 rounded-lg border border-orange-100 shadow-sm">
            <p className="text-[10px] text-orange-500">Quiz Attended</p>
            <p className="text-sm font-bold text-slate-800">12</p>
          </div>
          <div className="bg-white p-2 rounded-lg border border-orange-100 shadow-sm">
            <p className="text-[10px] text-orange-500">Topics Covered</p>
            <p className="text-sm font-bold text-slate-800">3</p>
          </div>
        </div>
      </div>

      {/* MCQs Generator (Flashcard Quiz) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><HelpCircle size={12}/> Flashcard Quiz</h3>
          {quizState === 'playing' && (
            <button onClick={() => { setQuizState('idle'); setCurrentCard(0); setIsFlipped(false); setSelectedAnswer(null); }} className="text-[10px] text-slate-400 hover:text-slate-600">End Quiz</button>
          )}
        </div>
        
        {quizState === 'idle' ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Topic:</span>
              <select 
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-[#10D9A0]"
              >
                <option value="General">General</option>
                {topics.map((t: any) => <option key={t.id} value={t.title}>{t.title}</option>)}
              </select>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Difficulty:</span>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-[#10D9A0]"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Questions:</span>
              <select 
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-[#10D9A0]"
              >
                <option>5</option>
                <option>10</option>
                <option>15</option>
              </select>
            </div>
            <button 
              onClick={generateQuiz} 
              disabled={isGenerating}
              className={`w-full py-2 mt-2 rounded-lg ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-[#10D9A0]/10 hover:bg-[#10D9A0]/20 text-[#059669]'} text-xs font-bold transition-colors flex items-center justify-center gap-2`}
            >
              {isGenerating ? <><div className="w-3 h-3 border-2 border-[#059669] border-t-transparent animate-spin rounded-full"></div> Generating...</> : 'Start Quiz'}
            </button>
          </div>
        ) : (
          <div className="relative h-48 w-full perspective-1000">
            <motion.div 
              className="w-full h-full relative preserve-3d"
              animate={{ rotateX: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-blue-400 mb-2">Q {currentCard + 1}/{flashcards.length}</span>
                <p className="text-sm font-medium text-slate-800 flex-1">{flashcards[currentCard].q}</p>
                
                <div className="flex flex-col gap-2 mt-2">
                  {flashcards[currentCard].type === 'boolean' ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleAnswer('Yes')} className="flex-1 py-1.5 bg-white border border-blue-200 rounded text-xs font-medium text-slate-700 hover:bg-blue-100 transition-colors">Yes</button>
                      <button onClick={() => handleAnswer('No')} className="flex-1 py-1.5 bg-white border border-blue-200 rounded text-xs font-medium text-slate-700 hover:bg-blue-100 transition-colors">No</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {flashcards[currentCard].options?.map(opt => (
                        <button key={opt} onClick={() => handleAnswer(opt)} className="py-1.5 px-2 bg-white border border-blue-200 rounded text-[10px] font-medium text-slate-700 hover:bg-blue-100 transition-colors truncate">{opt}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-[#ECFDF5] to-white border border-[#A7F3D0] rounded-xl p-4 flex flex-col shadow-sm" style={{ transform: 'rotateX(180deg)' }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-[#059669]">Result</span>
                  {selectedAnswer === flashcards[currentCard].a ? (
                    <span className="text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded">Correct</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded">Incorrect</span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <p className="text-xs font-bold text-slate-800 mb-1">Answer: {flashcards[currentCard].a}</p>
                  <p className="text-[10px] text-slate-600 leading-relaxed">{flashcards[currentCard].reason}</p>
                </div>

                <div className="mt-2 flex justify-end">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (currentCard === flashcards.length - 1) {
                        setQuizState('idle');
                        setCurrentCard(0);
                        setIsFlipped(false);
                        setSelectedAnswer(null);
                        setActiveBottomTab('revise');
                      } else {
                        nextCard(); 
                      }
                    }}
                    className="px-4 py-1.5 bg-[#10D9A0] text-white rounded text-[10px] font-bold shadow-sm hover:bg-[#059669] transition-colors"
                  >
                    {currentCard === flashcards.length - 1 ? 'Finish & Flag' : 'Next'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><CheckSquare size={12}/> Task List</h3>
        </div>
        <div className="space-y-2">
          {sortedTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <input 
                type="checkbox" 
                checked={task.completedAt !== null}
                onChange={() => onTaskToggle(task.id, task.completedAt === null)}
                className="rounded border-slate-300 text-[#059669] focus:ring-[#059669]" 
              />
              <span className={`text-sm flex-1 ${task.completedAt !== null ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</span>
              <button onClick={() => onTaskDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <input 
              type="text" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add new task..." 
              className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-[#10D9A0]" 
            />
            <button onClick={addTask} className="px-2 py-1 bg-[#ECFDF5] text-[#059669] rounded text-xs font-medium">Add</button>
          </div>
        </div>
      </div>

      {/* Topic Coverage */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Target size={12}/> Topic Coverage</h3>
        </div>
        
        <div className="space-y-3">
          {topics.map((topic: any) => (
            <div key={topic.id} className="group border border-transparent hover:border-slate-200 rounded-lg p-1 -mx-1 transition-colors">
              <div className="flex items-center justify-between cursor-pointer">
                <ChecklistItem 
                  title={topic.title} 
                  status={topic.status} 
                  warning={topic.warning} 
                  onToggle={() => {
                    const nextStatus = topic.status === 'done' ? 'pending' : 'done';
                    onTopicToggle(topic.id, nextStatus);
                  }}
                />
                <button onClick={(e) => { e.stopPropagation(); onTopicDelete(topic.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all ml-2">
                  <Trash2 size={12} />
                </button>
                <ChevronDown size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
              </div>
...
              
              {/* Expanded View */}
              <div className="hidden group-hover:flex flex-col gap-2 mt-2 pl-6 pr-2 py-2 bg-slate-50 rounded-md border border-slate-100">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Time: 45m</span>
                  <span>Log: Read, Notes</span>
                </div>
                <div className="flex items-center gap-3 mt-1 pt-2 border-t border-slate-200">
                  <button className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors">
                    <Flag size={10} /> Revise
                  </button>
                  <button className="flex items-center gap-1 text-[10px] font-bold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
                    <HelpCircle size={10} /> Assess
                  </button>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-[#059669] cursor-pointer ml-auto">
                    <input type="checkbox" className="rounded-sm border-slate-300 text-[#059669] focus:ring-[#059669] w-3 h-3" /> Schedule
                  </label>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <input 
              type="text" 
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTopic()}
              placeholder="Add new topic..." 
              className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-[#10D9A0]" 
            />
            <button onClick={addTopic} className="px-2 py-1 bg-[#ECFDF5] text-[#059669] rounded text-xs font-medium">Add</button>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[10px] text-slate-500">Pace: 15m/topic</span>
          <span className="text-[10px] text-orange-500 font-medium">1 Carry-over</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={12}/> Schedule Overview</h3>
          <button className="text-[10px] text-blue-600 hover:underline">View All</button>
        </div>
        
        <div className="space-y-4">
          {/* Today's Timeline */}
          <div className="group cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Today's Focus</p>
              <ChevronDown size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 pb-2">
              {calendarBlocks.length > 0 ? (
                calendarBlocks.map((block: any, idx: number) => (
                  <div key={block.id} className="relative group/block hover:bg-slate-50 -ml-4 pl-4 pr-1 py-1 rounded-md transition-colors">
                    <div className={`absolute left-[3px] top-3 w-2.5 h-2.5 rounded-full border-2 border-white ${idx === 0 ? 'bg-[#10D9A0]' : 'bg-slate-300'}`}></div>
                    
                    {editingBlockId === block.id ? (
                      <div className="flex flex-col gap-2 bg-white p-2 rounded shadow-sm border border-slate-200">
                        <input 
                          type="text" 
                          value={editTopic} 
                          onChange={e => setEditTopic(e.target.value)}
                          className="text-xs px-2 py-1 border border-slate-200 rounded outline-none w-full"
                          placeholder="Topic"
                        />
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={editTime} 
                            onChange={e => setEditTime(e.target.value)}
                            className="text-xs px-2 py-1 border border-slate-200 rounded outline-none w-20"
                            placeholder="Time"
                          />
                          <button 
                            onClick={() => {
                              onBlockEdit(block.id, { topic: editTopic, startTime: editTime });
                              setEditingBlockId(null);
                            }}
                            className="text-[10px] bg-[#10D9A0] text-white px-2 py-1 rounded font-medium ml-auto hover:bg-[#059669]"
                          >Save</button>
                          <button 
                            onClick={() => setEditingBlockId(null)}
                            className="text-[10px] text-slate-500 hover:bg-slate-100 px-2 py-1 rounded"
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{block.subject}</p>
                          <p className="text-[10px] text-slate-500">{block.topic}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${idx === 0 ? 'text-[#059669] bg-[#ECFDF5]' : 'text-slate-500 bg-slate-50'}`}>
                            {block.startTime}
                          </span>
                          <span className="text-[8px] text-slate-400 mt-1">{block.duration}m</span>
                          
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                             <button onClick={(e) => { e.stopPropagation(); setEditTopic(block.topic); setEditTime(block.startTime); setEditingBlockId(block.id); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded"><Edit2 size={10} /></button>
                             <button onClick={(e) => { e.stopPropagation(); onBlockDelete(block.id); }} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded"><Trash2 size={10} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2 text-center">
                  <p className="text-[10px] text-slate-400 italic">No sessions scheduled for today</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="text" 
                  value={newBlockTime}
                  onChange={(e) => setNewBlockTime(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && newBlockTime.trim()) { onBlockAdd(newBlockTime); setNewBlockTime(''); } }}
                  placeholder="e.g. 10:00 AM" 
                  className="w-24 text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-[#10D9A0]" 
                />
                <button 
                  onClick={() => { if(newBlockTime.trim()) { onBlockAdd(newBlockTime); setNewBlockTime(''); } }}
                  className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-[10px] font-medium transition-colors"
                >Add Block</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#F3E8FF] to-white border border-[#E9D5FF] rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider flex items-center gap-1"><Sparkles size={12}/> Prophecy Engine</h3>
          <div className="flex gap-2">
            <label className="cursor-pointer text-[10px] text-[#7C3AED] hover:underline flex items-center gap-1">
              <Upload size={10} /> {isAnalyzingPYQ ? 'Analyzing...' : 'Upload PYQ'}
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) analyzePYQ(file);
                }}
                accept=".pdf,.doc,.docx,.txt"
              />
            </label>
            <button className="text-[10px] text-[#7C3AED] hover:underline flex items-center gap-1"><ArrowRight size={10}/> Sort: Risk</button>
          </div>
        </div>
        <div className="space-y-2">
          {prophecyData.length > 0 ? prophecyData.map((topic, idx) => (
            <div key={idx} className={`group border ${topic.risk === 'HIGH' ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : topic.risk === 'MED' ? 'border-orange-200 bg-orange-50/50 hover:bg-orange-50' : 'border-[#A7F3D0] bg-[#ECFDF5]/50 hover:bg-[#ECFDF5]'} rounded-lg p-2 transition-colors cursor-pointer relative overflow-hidden`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${topic.risk === 'HIGH' ? 'bg-red-500 animate-pulse' : topic.risk === 'MED' ? 'bg-orange-400' : 'bg-[#10D9A0]'}`}></div>
              <div className="flex justify-between items-center pl-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{topic.title}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${topic.risk === 'HIGH' ? 'bg-red-100 text-red-700' : topic.risk === 'MED' ? 'bg-orange-100 text-orange-700' : 'bg-[#D1FAE5] text-[#059669]'} font-bold`}>{topic.risk} RISK</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">Freq: {topic.freq}</span>
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {topic.questions && topic.questions.length > 0 && (
                <div className="hidden group-hover:block mt-3 pt-3 border-t border-slate-100 pl-2">
                  <p className="text-[10px] font-bold text-slate-500 mb-2">Ranked PYQs:</p>
                  <div className="space-y-2">
                    {topic.questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="bg-white p-2 rounded border border-slate-100 shadow-sm">
                        <p className="text-[10px] text-slate-700 font-medium">{q.q}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[8px] text-slate-400">{q.years}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSnipe(topic.questions[qIdx].q);
                            }}
                            className="text-[8px] bg-[#ECFDF5] text-[#059669] px-2 py-1 rounded border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors flex items-center gap-1"
                          >
                            <Target size={8}/> Snipe
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
              <p className="text-[10px] text-slate-400 italic">No PYQ analyzed yet. Upload a file above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Resource Links */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><LinkIcon size={12}/> Resource Links</h3>
        <div className="space-y-2">
          {vaultSources?.map((src: any) => (
            <div key={src.id} className="flex items-center justify-between group/link">
              <a href={src.downloadURL || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline cursor-pointer flex-1 truncate">
                <div className="w-4 h-4 bg-orange-100 rounded flex items-center justify-center shrink-0"><FileText size={10} className="text-orange-600"/></div>
                <span className="truncate">{src.title}.{src.subtype}</span>
              </a>
            </div>
          ))}
          {resources.map((res: any) => (
            <div key={res.id} className="flex items-center justify-between group/link">
              <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline cursor-pointer flex-1 truncate">
                <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center shrink-0"><LinkIcon size={10}/></div>
                <span className="truncate">{res.title}</span>
              </a>
              <button onClick={() => onResourceDelete(res.id)} className="opacity-0 group-hover/link:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-50">
            <input 
              type="text" 
              id="res-title"
              placeholder="Title (e.g. Khan Academy)" 
              className="text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-[#10D9A0]"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                id="res-url"
                placeholder="Paste URL..." 
                className="flex-1 text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-[#10D9A0]"
              />
              <button 
                onClick={() => {
                  const t = document.getElementById('res-title') as HTMLInputElement;
                  const u = document.getElementById('res-url') as HTMLInputElement;
                  if (t.value && u.value) {
                    onResourceAdd(t.value, u.value);
                    t.value = ''; u.value = '';
                  }
                }}
                className="px-2 py-1 bg-[#ECFDF5] text-[#059669] rounded text-[10px] font-bold"
              >Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Users size={12}/> Collaboration</h3>
        <div className="flex items-center gap-2 mb-3 opacity-50">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">?</div>
            <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">?</div>
          </div>
          <span className="text-[10px] text-slate-500">Coming Soon</span>
        </div>
        <button disabled className="w-full py-1.5 rounded bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
          Invite Collaborator (Soon)
        </button>
      </div>

    </div>
  );
};

const ChecklistItem = ({ title, status, warning }: any) => {
  return (
    <div className="flex flex-col gap-1 group cursor-pointer">
      <div className="flex items-center gap-2">
        {status === 'done' ? <CheckCircle2 size={14} className="text-[#059669]" /> : 
         status === 'current' ? <Circle size={14} className="text-[#7C3AED] fill-[#F3E8FF]" /> :
         <Circle size={14} className="text-slate-300" />}
        <span className={`text-sm font-medium ${status === 'pending' ? 'text-slate-400' : 'text-slate-700'}`}>{title}</span>
      </div>
      {warning && <span className="text-[10px] text-orange-500 ml-6">{warning}</span>}
    </div>
  );
};



const FlagReviseDrawer = ({ isOpen, onClose }: any) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const flashcards = [
    { q: "What is the resting membrane potential of a typical neuron?", a: "-70 mV" },
    { q: "Which ion is primarily responsible for depolarization?", a: "Sodium (Na+)" },
    { q: "What structure speeds up action potential conduction?", a: "Myelin Sheath" }
  ];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCard((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
          />
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-16 left-0 right-0 h-96 bg-white rounded-t-3xl shadow-2xl z-40 border-t border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Flag size={16} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Flagged for Revision</h3>
                  <p className="text-[10px] text-slate-500">Flashcard Mode</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={16}/></button>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50">
              <div className="relative h-48 w-full max-w-sm perspective-1000">
                <motion.div 
                  className="w-full h-full relative preserve-3d cursor-pointer"
                  animate={{ rotateX: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-md">
                    <span className="absolute top-3 left-3 text-xs font-bold text-slate-400">Q {currentCard + 1}/{flashcards.length}</span>
                    <p className="text-lg font-medium text-slate-800">{flashcards[currentCard].q}</p>
                    <span className="absolute bottom-3 text-xs text-slate-400 animate-pulse">Tap to flip</span>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-md" style={{ transform: 'rotateX(180deg)' }}>
                    <span className="absolute top-3 left-3 text-xs font-bold text-red-500">Answer</span>
                    <p className="text-xl font-bold text-red-600">{flashcards[currentCard].a}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); nextCard(); }}
                      className="absolute bottom-4 px-6 py-2 bg-red-500 text-white rounded-full text-sm font-bold shadow-md hover:bg-red-600 transition-colors"
                    >
                      Next Card
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const PYQMatrixDrawer = ({ isOpen, onClose }: any) => {
  const pyqs = [
    {
      id: 1,
      question: "Explain the mechanism of an action potential, detailing the roles of voltage-gated sodium and potassium channels.",
      topic: "Action Potentials",
      frequency: "High",
      years: ["2023", "2022", "2020", "2018"]
    },
    {
      id: 2,
      question: "Describe the process of synaptic transmission at a chemical synapse.",
      topic: "Synaptic Transmission",
      frequency: "Medium",
      years: ["2021", "2019"]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
          />
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[80vh] bg-white rounded-t-3xl shadow-2xl z-40 border-t border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Flame size={16} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">PYQ Matrix</h3>
                  <p className="text-[10px] text-slate-500">Previous Year Questions</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4">
                {pyqs.map((pyq) => (
                  <div key={pyq.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-orange-200 transition-colors">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{pyq.question}</p>
                      <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold ${pyq.frequency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                        {pyq.frequency} Freq
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Target size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-600">{pyq.topic}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-600">Repeated: {pyq.years.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const CreateTaskDrawer = ({ isOpen, onClose, tasks, setTasks }: any) => {
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([{ id: Date.now(), text: newTask, completed: false }, ...tasks]);
      setNewTask('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
          />
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-40 border-t border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckSquare size={16} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Create Task</h3>
                  <p className="text-[10px] text-slate-500">Add a new to-do item</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={16}/></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <input 
                type="text" 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="What needs to be done?"
                className="w-full text-sm px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-slate-50"
                autoFocus
              />
              <button 
                onClick={handleAddTask}
                disabled={!newTask.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                Add Task
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MicroCodexDrawer = ({ isOpen, onClose }: any) => {
  const [codexItems, setCodexItems] = useState([
    { id: 1, tag: 'Definition', title: 'Action Potential', content: 'A rapid sequence of changes in the voltage across a membrane, essential for neural communication.' }
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ tag: 'Definition', title: '', content: '' });

  const handleSave = () => {
    if (!newItem.title.trim() || !newItem.content.trim()) return;
    
    if (editingId) {
      setCodexItems(codexItems.map(item => item.id === editingId ? { ...item, ...newItem } : item));
      setEditingId(null);
    } else {
      setCodexItems([{ id: Date.now(), ...newItem }, ...codexItems]);
    }
    setIsAdding(false);
    setNewItem({ tag: 'Definition', title: '', content: '' });
  };

  const handleEdit = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewItem({ tag: item.tag, title: item.title, content: item.content });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCodexItems(codexItems.filter(item => item.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-30"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#059669]" />
                <h2 className="font-bold text-slate-800">Micro-Codex</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewItem({ tag: 'Definition', title: '', content: '' }); }} className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors">
                  <Plus size={16} />
                </button>
                <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800">
                  <X size={16} />
                </button>
              </div>
            </div>

            {isAdding ? (
              <div className="p-4 border-b border-slate-200 bg-emerald-50/30 space-y-3">
                <select 
                  value={newItem.tag}
                  onChange={(e) => setNewItem({...newItem, tag: e.target.value})}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#10D9A0] bg-white"
                >
                  <option>Definition</option>
                  <option>Mechanism</option>
                  <option>Formula</option>
                  <option>Analogy</option>
                  <option>Mistake</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Title" 
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:border-[#10D9A0] bg-white"
                />
                <textarea 
                  placeholder="Content" 
                  value={newItem.content}
                  onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#10D9A0] bg-white resize-none h-20"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex-1 py-2 bg-[#10D9A0] text-white rounded-lg text-xs font-bold hover:bg-[#059669] transition-colors">
                    {editingId ? 'Update' : 'Save'}
                  </button>
                  <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-200">
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search codex..." className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#10D9A0] focus:bg-white transition-colors" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Definitions', 'Mechanisms', 'Formulas', 'Analogies', 'Mistakes'].map(tag => (
                    <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-medium cursor-pointer hover:bg-slate-200 hover:text-slate-900 transition-colors">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
              {codexItems.map((item) => (
                <div key={item.id} className="group perspective-1000 h-32 w-full cursor-pointer relative">
                  <div className="relative w-full h-full transition-transform duration-500 transform-style-3d group-hover:rotate-y-180">
                    <div className="absolute inset-0 backface-hidden bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
                      <span className="text-xs font-bold text-[#7C3AED] mb-1">{item.tag}</span>
                      <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEdit(item, e)} className="p-1 text-slate-400 hover:text-blue-500 bg-slate-50 rounded"><Edit2 size={12}/></button>
                        <button onClick={(e) => handleDelete(item.id, e)} className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 rounded"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 flex flex-col justify-center overflow-y-auto custom-scrollbar shadow-sm">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {codexItems.length === 0 && !isAdding && (
                <div className="text-center text-slate-500 text-sm mt-10">
                  No codex items yet. Click + to add one.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const PYQAnalysisModal = ({ isOpen, onClose, onSnipe }: any) => {
  // ... (Keep existing PYQAnalysisModal implementation)
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-orange-500" />
                  <h2 className="font-bold text-slate-800 text-lg">PYQ Analysis</h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col md:flex-row gap-6 sm:gap-8">
                <div className="w-full md:w-1/3">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Target size={16} className="text-[#059669]" /> Frequency Heatmap
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({length: 25}).map((_, i) => {
                      const intensity = Math.random();
                      return (
                        <div key={i} className="aspect-square rounded-md border border-slate-100 shadow-sm" style={{ backgroundColor: `rgba(16, 217, 160, ${intensity * 0.9})` }} title={`Topic ${i+1}: ${Math.round(intensity*10)} questions`}></div>
                      )
                    })}
                  </div>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#7C3AED]" /> High-Yield Questions
                  </h3>
                  {[
                    { q: "Explain the role of Ca2+ in neurotransmitter release.", year: "2023, 2021", page: 42 },
                    { q: "Compare and contrast EPSPs and IPSPs.", year: "2022", page: 45 },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                      <p className="text-sm font-medium text-slate-800">{item.q}</p>
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="flex gap-4 text-xs font-mono text-slate-500">
                          <span className="bg-white px-2 py-1 rounded border border-slate-200">Years: {item.year}</span>
                          <span className="bg-[#F3E8FF] text-[#7C3AED] px-2 py-1 rounded border border-[#E9D5FF] cursor-pointer hover:underline">Source: p.{item.page}</span>
                        </div>
                        <button onClick={() => onSnipe(item.q)} className="px-3 py-1.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] text-xs font-bold border border-[#A7F3D0] transition-colors flex items-center gap-1.5 shadow-sm">
                          <Target size={14} /> Snipe This
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
