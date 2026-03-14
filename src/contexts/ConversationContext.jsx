import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

const ConversationContext = createContext();

function createNewConversation(model, systemPrompt) {
  return {
    id: uuidv4(),
    title: 'New Chat',
    pinned: false,
    folder: null,
    tags: [],
    systemPrompt: systemPrompt || null,
    model: model || '',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function ConversationProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const streamingRef = useRef('');
  const requestIdRef = useRef(null);
  const activeConversationIdRef = useRef(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Load conversations on mount
  useEffect(() => {
    async function load() {
      try {
        const convs = await window.electronAPI.getConversations();
        const validConvs = [];
        for (const c of (convs || [])) {
          if (c.messages.length === 0) {
            await window.electronAPI.deleteConversation(c.id);
          } else {
            validConvs.push(c);
          }
        }
        setConversations(validConvs);
      } catch { /* empty */ }
      setIsLoading(false);
    }
    load();
  }, []);

  // Chat streaming listeners
  useEffect(() => {
    const offChunk = window.electronAPI.onChatChunk(({ requestId, chunk }) => {
      if (requestId === requestIdRef.current) {
        streamingRef.current += chunk;
        setStreamingContent(streamingRef.current);
      }
    });

    const offDone = window.electronAPI.onChatDone(({ requestId, aborted }) => {
      if (requestId === requestIdRef.current) {
        if (!aborted && streamingRef.current) {
          // Finalize the message
          finalizeAssistantMessage(streamingRef.current);
        }
        streamingRef.current = '';
        setStreamingContent('');
        setIsStreaming(false);
        requestIdRef.current = null;
      }
    });

    const offError = window.electronAPI.onChatError(({ requestId, error }) => {
      if (requestId === requestIdRef.current) {
        finalizeAssistantMessage(`⚠️ Error: ${error}`);
        streamingRef.current = '';
        setStreamingContent('');
        setIsStreaming(false);
        requestIdRef.current = null;
      }
    });

    return () => { offChunk(); offDone(); offError(); };
  }, [activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  const finalizeAssistantMessage = useCallback((content) => {
    setConversations((prev) => {
      const convId = requestIdRef.current ? prev.find(c => c.id === (activeConversationId))?.id : null;
      if (!convId && !activeConversationId) return prev;
      return prev.map((c) => {
        if (c.id !== activeConversationId) return c;
        const updated = {
          ...c,
          messages: [
            ...c.messages,
            {
              id: uuidv4(),
              role: 'assistant',
              content,
              timestamp: Date.now(),
            },
          ],
          updatedAt: Date.now(),
        };
        // Auto-title from first exchange
        if (updated.title === 'New Chat' && updated.messages.length >= 2) {
          const firstMsg = updated.messages.find((m) => m.role === 'user');
          if (firstMsg) {
            updated.title = firstMsg.content.slice(0, 60) + (firstMsg.content.length > 60 ? '…' : '');
          }
        }
        window.electronAPI.saveConversation(updated);
        return updated;
      });
    });
  }, [activeConversationId]);

  const newChat = useCallback(async (model, systemPrompt) => {
    const conv = createNewConversation(model, systemPrompt);
    await window.electronAPI.saveConversation(conv);
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    return conv;
  }, []);

  const selectConversation = useCallback((id) => {
    setActiveConversationId((prevId) => {
      if (prevId !== id) {
        // Clean up the previous conversation if it's empty
        setConversations(prevConvs => {
          const prevConv = prevConvs.find(c => c.id === prevId);
          if (prevConv && prevConv.messages.length === 0) {
            window.electronAPI.deleteConversation(prevId);
            return prevConvs.filter(c => c.id !== prevId);
          }
          return prevConvs;
        });
      }
      return id;
    });
  }, []);

  const deleteConversation = useCallback(async (id) => {
    await window.electronAPI.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((prev) => (prev === id ? null : prev));
  }, []);

  const updateConversation = useCallback(async (id, updates) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates, updatedAt: Date.now() };
        window.electronAPI.saveConversation(updated);
        return updated;
      })
    );
  }, []);

  const sendMessage = useCallback(async (content, images, provider, model, settings) => {
    const convId = activeConversationIdRef.current;
    let conv = conversations.find((c) => c.id === convId);

    // Create new conversation if none active
    if (!conv) {
      conv = createNewConversation(model);
      await window.electronAPI.saveConversation(conv);
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
    }

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      images: images || [],
      timestamp: Date.now(),
    };

    // Add user message
    const updatedConv = {
      ...conv,
      messages: [...conv.messages, userMessage],
      model,
      updatedAt: Date.now(),
    };

    // Auto-title
    if (updatedConv.title === 'New Chat') {
      updatedConv.title = content.slice(0, 60) + (content.length > 60 ? '…' : '');
    }

    await window.electronAPI.saveConversation(updatedConv);
    setConversations((prev) => prev.map((c) => (c.id === convId ? updatedConv : c)));

    // Build messages payload
    const allMessages = [];
    const systemPrompt = updatedConv.systemPrompt || settings.globalSystemPrompt;
    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    }
    updatedConv.messages.forEach((m) => {
      allMessages.push({
        role: m.role,
        content: m.content,
        ...(m.images && m.images.length > 0 ? { images: m.images } : {}),
      });
    });

    // Start streaming
    const requestId = uuidv4();
    requestIdRef.current = requestId;
    streamingRef.current = '';
    setStreamingContent('');
    setIsStreaming(true);

    window.electronAPI.sendChatMessage({
      requestId,
      provider,
      model,
      messages: allMessages,
      settings: {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
      },
    });
  }, [activeConversationId, conversations]);

  const stopGeneration = useCallback(() => {
    if (requestIdRef.current) {
      window.electronAPI.stopGeneration(requestIdRef.current);
      if (streamingRef.current) {
        finalizeAssistantMessage(streamingRef.current);
      }
      streamingRef.current = '';
      setStreamingContent('');
      setIsStreaming(false);
      requestIdRef.current = null;
    }
  }, [finalizeAssistantMessage]);

  const togglePin = useCallback(async (id) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, pinned: !c.pinned, updatedAt: Date.now() };
        window.electronAPI.saveConversation(updated);
        return updated;
      })
    );
  }, []);

  const editMessage = useCallback(async (messageId, newContent, provider, model, settings) => {
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return;

    const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const updatedMessages = [...conv.messages];
    updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], content: newContent };

    const assistantIndex = updatedMessages.findIndex((m, i) => i > msgIndex && m.role === 'assistant');
    if (assistantIndex !== -1) {
      updatedMessages.splice(assistantIndex);
    }

    const updatedConv = { ...conv, messages: updatedMessages, updatedAt: Date.now() };
    await window.electronAPI.saveConversation(updatedConv);
    setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? updatedConv : c)));

    const allMessages = [];
    const systemPrompt = updatedConv.systemPrompt || settings.globalSystemPrompt;
    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt });
    }
    updatedConv.messages.forEach((m) => {
      allMessages.push({
        role: m.role,
        content: m.content,
        ...(m.images && m.images.length > 0 ? { images: m.images } : {}),
      });
    });

    const requestId = uuidv4();
    requestIdRef.current = requestId;
    streamingRef.current = '';
    setStreamingContent('');
    setIsStreaming(true);

    window.electronAPI.sendChatMessage({
      requestId,
      provider,
      model,
      messages: allMessages,
      settings: {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
      },
    });
  }, [conversations]);

  const contextValue = useMemo(() => ({
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    isStreaming,
    streamingContent,
    newChat,
    selectConversation,
    deleteConversation,
    updateConversation,
    sendMessage,
    stopGeneration,
    togglePin,
    editMessage,
  }), [conversations, activeConversation, activeConversationId, isLoading, isStreaming, streamingContent, newChat, selectConversation, deleteConversation, updateConversation, sendMessage, stopGeneration, togglePin, editMessage]);

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversations must be used within ConversationProvider');
  return ctx;
}
