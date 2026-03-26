import { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '../lib/AuthContext';
import { hybridRetrieve } from './rag/retrieval';
import { assembleAugmentedPrompt } from './rag/augmentation';

const AI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Message[];
  persona: 'open_web' | 'strict_tutor';
}

const SYSTEM_PROMPTS = {
  open_web: `You are an Open Web Research Assistant. 
Your goal is to provide comprehensive, accurate, and helpful answers drawing on general knowledge. 
Be concise but thorough. Use markdown formatting (bold, italics, lists, tables) to make your answers easy to read.
If appropriate, suggest a few related follow-up topics the user might be interested in.`,

  strict_tutor: `You are a Strict, Socratic Medical/Academic Tutor.
Your goal is NEVER to just give the answer directly.
Instead, you must:
1. Ask probing questions to guide the student to the answer.
2. Point out logical flaws in their reasoning if they make a mistake.
3. Challenge them to explain *why* something is the case, not just *what* it is.
4. Keep your responses short and focused on making the user think.
Use a professional, demanding, but ultimately supportive tone.`
};

export function useCommandDockService() {
  const { user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Keep track of the current active streaming message ID to append chunks
  const streamingMessageIdRef = useRef<string | null>(null);

  // Load history overview when user signs in
  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, `users/${user.uid}/commandDock`),
          orderBy('updatedAt', 'desc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const fetchedConvs: Conversation[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedConvs.push({
            id: docSnap.id,
            title: data.title || "New Chat",
            persona: data.persona || "open_web",
            updatedAt: data.updatedAt?.toDate() || new Date(),
            messages: data.messages || [] // Assuming messages are grouped here, but normally subcollectons. Doing simple doc list here.
          });
        });
        setConversations(fetchedConvs);
      } catch (err) {
        console.error("Error fetching command dock history:", err);
      }
    };
    fetchHistory();
  }, [user, activeConversationId]);

  const sendMessage = useCallback(async (text: string, persona: 'open_web' | 'strict_tutor', contextContext?: string) => {
    if (!text.trim() || !user) return;

    // 1. Add User Message to local state
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // 2. Add empty Assistant Message to local state for streaming
    const assistantMsgId = crypto.randomUUID();
    streamingMessageIdRef.current = assistantMsgId;

    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }]);

    try {
      // 3. Initialize Gemini
      const genAI = new GoogleGenerativeAI(AI_API_KEY);
      // Retrieve Context if strict_tutor
      let finalPrompt = SYSTEM_PROMPTS[persona] + (contextContext ? `\n\nCurrent User Context:\n${contextContext}` : '');
      const historyForGemini = messages.map(msg => ({
        role: (msg.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
        parts: [{ text: msg.content }]
      }));

      const historyForAugment = messages.map(msg => ({
        role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.content
      }));

      if (persona === 'strict_tutor') {
        const vaultsQuery = query(collection(db, `users/${user.uid}/vaults`));
        const vaultsSnap = await getDocs(vaultsQuery);
        const vaultIds = vaultsSnap.docs.map(d => d.id);

        if (vaultIds.length > 0) {
          const chunks = await hybridRetrieve(text, vaultIds, user.uid, 5);
          const aug = assembleAugmentedPrompt(chunks, finalPrompt, historyForAugment, text);
          finalPrompt = aug.systemInstruction;
          // Note: we can map citablePages to message citations later
        }
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: finalPrompt
      });

      const chat = model.startChat({ history: historyForGemini });

      // 4. Start Streaming
      const result = await chat.sendMessageStream(text);

      let fullResponseText = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponseText += chunkText;

        // Update the specific streaming message in state
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageIdRef.current
            ? { ...msg, content: fullResponseText }
            : msg
        ));
      }

      // 5. Streaming completed - finalize local state
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageIdRef.current
          ? { ...msg, isStreaming: false }
          : msg
      ));

      setIsTyping(false);

      // 6. Save to Firebase (Debounced/Batch or End of turn)
      await _saveConversation(user.uid, activeConversationId, [...messages, userMsg, {
        id: assistantMsgId,
        role: 'assistant',
        content: fullResponseText,
        timestamp: new Date(),
        isStreaming: false
      }], persona, text);

    } catch (error) {
      console.error("Error streaming AI response:", error);
      setIsTyping(false);
      // Optional: Update streaming message with error state
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageIdRef.current
          ? { ...msg, content: "⚠️ Sorry, I encountered an error processing that request.", isStreaming: false }
          : msg
      ));
    }
  }, [messages, activeConversationId]);

  // Firebase Helper to Create/Update Conversation
  const _saveConversation = async (
    uid: string,
    currentConvId: string | null,
    newMessages: Message[],
    persona: 'open_web' | 'strict_tutor',
    latestUserText: string
  ) => {
    try {
      const convRef = collection(db, `users/${uid}/commandDock`);

      if (!currentConvId) {
        // Create new
        const newTitle = latestUserText.length > 30 ? latestUserText.substring(0, 30) + '...' : latestUserText;
        const docRef = await addDoc(convRef, {
          title: newTitle,
          persona,
          messages: newMessages,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        setActiveConversationId(docRef.id);
      } else {
        // Update existing
        const docRef = doc(db, `users/${uid}/commandDock`, currentConvId);
        await updateDoc(docRef, {
          messages: newMessages,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving conversation to Firebase:", error);
    }
  };

  // Create intentional New Chat
  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    streamingMessageIdRef.current = null;
  }, []);

  const loadConversation = useCallback(async (convId: string, loadedMessages: Message[]) => {
    setActiveConversationId(convId);
    setMessages(loadedMessages);
  }, []);

  // Delete Conversation
  const deleteConversation = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/commandDock`, id));
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        startNewChat();
      }
    } catch (e) {
      console.error("Error deleting conversation", e);
    }
  }, [user, activeConversationId, startNewChat]);

  return {
    messages,
    isTyping,
    sendMessage,
    startNewChat,
    loadConversation,
    deleteConversation,
    conversations,
    activeConversationId
  };
}
