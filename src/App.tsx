/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Sparkles, AlertCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ModelSelector from './components/ModelSelector';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import SettingsModal from './components/SettingsModal';
import CanvasPanel from './components/CanvasPanel';
import { Chat, Message, OllamaModel, OllamaStatus, Canvas } from './types';
import { parseCanvasBlocks } from './utils/canvasParser';
import { 
  DEFAULT_OLLAMA_URL, 
  testOllamaConnection, 
  fetchOllamaModels, 
  fetchLoadedModels,
  generateChatTitle, 
  getSimulatedReply 
} from './utils/ollama';
import AuthScreen from './components/AuthScreen';
import UserProfileMenu from './components/UserProfileMenu';
import { encryptJSON, decryptJSON } from './utils/crypto';

export default function App() {
  // Persistence Loading Helpers
  const getSavedUrl = () => localStorage.getItem('ollama_url') || DEFAULT_OLLAMA_URL;

  // Auth & Encryption State (Strictly in RAM)
  const [user, setUser] = useState<{ username: string; firstName: string; lastName: string; role: string } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // State Declarations
  const [ollamaUrl, setOllamaUrl] = useState<string>(getSavedUrl);
  const [demoMode, setDemoModeState] = useState<boolean>(true);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  // Canvas State
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [canvasModeActive, setCanvasModeActive] = useState<boolean>(false);

  // Memories & Custom System Prompts State
  const [memories, setMemories] = useState<string>('');
  const [systemPrompts, setSystemPrompts] = useState<Record<string, string>>({});
  const [nextChatPersonalizationEnabled, setNextChatPersonalizationEnabled] = useState<boolean>(true);

  // UI Panels
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [status, setStatus] = useState<OllamaStatus>({ connected: false, url: getSavedUrl() });

  // Refs for background stream abortion
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatsRef = useRef<Chat[]>(chats);
  const canvasesRef = useRef<Canvas[]>(canvases);
  const processedMessagesRef = useRef<Record<string, string>>({});
  const messageBaseCanvasesRef = useRef<Record<string, Canvas[]>>({});
  const lastChatIdRef = useRef<string | null>(null);

  // Helper to encrypt and save data to server
  const saveUserData = async (
    updatedChats?: Chat[],
    updatedCanvases?: Canvas[],
    updatedSettings?: { memories: string; systemPrompts: Record<string, string>; demoMode: boolean }
  ) => {
    if (!sessionToken || !encryptionKey) return;

    const payload: {
      encryptedChats?: string;
      encryptedCanvases?: string;
      encryptedSettings?: string;
    } = {};

    if (updatedChats !== undefined) {
      payload.encryptedChats = encryptJSON(updatedChats, encryptionKey);
    }
    if (updatedCanvases !== undefined) {
      payload.encryptedCanvases = encryptJSON(updatedCanvases, encryptionKey);
    }

    const settingsToEncrypt = {
      memories: updatedSettings?.memories ?? memories,
      systemPrompts: updatedSettings?.systemPrompts ?? systemPrompts,
      demoMode: updatedSettings?.demoMode ?? demoMode,
    };
    payload.encryptedSettings = encryptJSON(settingsToEncrypt, encryptionKey);

    try {
      await fetch('/api/user/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to save user data:', err);
    }
  };

  const handleAuthSuccess = async (authData: {
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    sessionToken: string;
    encryptionKey: string;
  }) => {
    setUser({
      username: authData.username,
      firstName: authData.firstName,
      lastName: authData.lastName,
      role: authData.role
    });
    setSessionToken(authData.sessionToken);
    setEncryptionKey(authData.encryptionKey);

    // Fetch encrypted files from the server
    try {
      const res = await fetch('/api/user/data', {
        headers: {
          'Authorization': `Bearer ${authData.sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        
        let loadedChats: Chat[] = [];
        let loadedCanvases: Canvas[] = [];
        let loadedSettings: { memories?: string; systemPrompts?: Record<string, string>; demoMode?: boolean } | null = null;

        if (data.encryptedChats) {
          try {
            loadedChats = decryptJSON<Chat[]>(data.encryptedChats, authData.encryptionKey) || [];
          } catch (e) {
            console.error('Failed to decrypt chats:', e);
          }
        }
        if (data.encryptedCanvases) {
          try {
            loadedCanvases = decryptJSON<Canvas[]>(data.encryptedCanvases, authData.encryptionKey) || [];
          } catch (e) {
            console.error('Failed to decrypt canvases:', e);
          }
        }
        if (data.encryptedSettings) {
          try {
            loadedSettings = decryptJSON<typeof loadedSettings>(data.encryptedSettings, authData.encryptionKey);
          } catch (e) {
            console.error('Failed to decrypt settings:', e);
          }
        }

        setChats(loadedChats);
        setCanvases(loadedCanvases);
        if (loadedChats.length > 0) {
          setCurrentChatId(loadedChats[0].id);
        } else {
          setCurrentChatId(null);
        }
        
        if (loadedSettings) {
          setMemories(loadedSettings.memories || '');
          setSystemPrompts(loadedSettings.systemPrompts || {});
          setDemoModeState(loadedSettings.demoMode ?? true);
        } else {
          setMemories('');
          setSystemPrompts({});
          setDemoModeState(true);
        }
      }
    } catch (err) {
      console.error('Failed to load user data from server:', err);
    } finally {
      setIsDataLoaded(true);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setSessionToken(null);
    setEncryptionKey(null);
    setIsDataLoaded(false);
    setChats([]);
    setCanvases([]);
    setMemories('');
    setSystemPrompts({});
    setDemoModeState(true);
    setCurrentChatId(null);
    setActiveCanvasId(null);
  };

  // Sync chats to server
  useEffect(() => {
    chatsRef.current = chats;
    if (isDataLoaded && sessionToken && encryptionKey) {
      saveUserData(chats, undefined, undefined);
    }
  }, [chats, isDataLoaded, sessionToken, encryptionKey]);

  // Sync canvases to server
  useEffect(() => {
    canvasesRef.current = canvases;
    if (isDataLoaded && sessionToken && encryptionKey) {
      saveUserData(undefined, canvases, undefined);
    }
  }, [canvases, isDataLoaded, sessionToken, encryptionKey]);

  // Sync settings (memories, systemPrompts, demoMode) to server
  useEffect(() => {
    if (isDataLoaded && sessionToken && encryptionKey) {
      saveUserData(undefined, undefined, { memories, systemPrompts, demoMode });
    }
  }, [memories, systemPrompts, demoMode, isDataLoaded, sessionToken, encryptionKey]);

  // Demo mode setter
  const setDemoMode = (val: boolean) => {
    setDemoModeState(val);
  };

  // Select first available model automatically when list updates
  useEffect(() => {
    if (demoMode) {
      setSelectedModel('llama3:8b');
    } else if (models.length > 0) {
      // Find model currently selected or select the first one
      const exists = models.some(m => m.name === selectedModel);
      if (!exists) {
        setSelectedModel(models[0].name);
      }
    } else {
      setSelectedModel('');
    }
  }, [models, demoMode]);

  // Fetch loaded models from Ollama
  const refreshLoadedModels = async () => {
    if (demoMode) {
      setLoadedModels(prev => prev.length === 0 ? ['llama3:8b'] : prev);
      return;
    }
    try {
      const list = await fetchLoadedModels(ollamaUrl);
      setLoadedModels(list.map(m => m.name));
    } catch (err) {
      console.warn('Failed to fetch loaded models:', err);
    }
  };

  const handleUnloadModel = async (modelName: string) => {
    if (demoMode) {
      setLoadedModels(prev => prev.filter(m => m !== modelName));
      return;
    }
    try {
      const { unloadOllamaModel } = await import('./utils/ollama');
      const ok = await unloadOllamaModel(ollamaUrl, modelName);
      if (ok) {
        await refreshLoadedModels();
      } else {
        alert(`Failed to unload model "${modelName}".`);
      }
    } catch (err) {
      console.error('Failed to unload model:', err);
    }
  };

  // Run loaded models check periodically
  useEffect(() => {
    refreshLoadedModels();
    const interval = setInterval(() => {
      refreshLoadedModels();
    }, 10000);
    return () => clearInterval(interval);
  }, [ollamaUrl, demoMode]);

  // Handle server status checking on load or URL changes
  const checkConnectionAndLoadModels = async () => {
    if (demoMode) {
      setStatus({ connected: true, url: ollamaUrl });
      refreshLoadedModels();
      return;
    }

    try {
      const isConnected = await testOllamaConnection(ollamaUrl);
      if (isConnected) {
        const list = await fetchOllamaModels(ollamaUrl);
        setModels(list);
        setStatus({ connected: true, url: ollamaUrl });
        refreshLoadedModels();
      } else {
        setModels([]);
        setStatus({ connected: false, url: ollamaUrl, error: 'Cannot reach Ollama' });
      }
    } catch (err: any) {
      setModels([]);
      setStatus({ connected: false, url: ollamaUrl, error: err.message });
    }
  };

  // Run connection trigger on startup or url/mode change
  useEffect(() => {
    checkConnectionAndLoadModels();
  }, [ollamaUrl, demoMode]);

  const activeChat = chats.find(c => c.id === currentChatId) || null;
  const activeCanvas = canvases.find(c => c.id === activeCanvasId) || null;

  // Sidebar Controls
  const handleToggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const handleOpenSettings = () => setSettingsOpen(true);
  const handleCloseSettings = () => setSettingsOpen(false);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      model: selectedModel || 'No Model',
      messages: [],
      createdAt: Date.now(),
      personalizationEnabled: nextChatPersonalizationEnabled,
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    const target = chats.find(c => c.id === id);
    if (target && target.model) {
      setSelectedModel(target.model);
    }
  };

  const handleDeleteChat = (id: string) => {
    // Detach canvases from deleted chat, but keep them in left sidebar "Canvases" list
    setCanvases(prev => {
      const updated = prev.map(c => c.chatId === id ? { ...c, chatId: null } : c);
      localStorage.setItem('ollama_canvases', JSON.stringify(updated));
      return updated;
    });

    setChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) {
      const remaining = chats.filter(c => c.id !== id);
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const targetChat = chats.find(c => c.id === currentChatId);
    if (!targetChat) return;

    const msgIndex = targetChat.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const messageToEdit = targetChat.messages[msgIndex];

    if (messageToEdit.role === 'user') {
      // User prompt message was edited -> Truncate/branch and Rerun!
      const truncatedMessages = targetChat.messages.slice(0, msgIndex);
      
      const editedUserMessage: Message = {
        ...messageToEdit,
        content: newContent,
        timestamp: Date.now()
      };

      const assistantDraftMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now() + 1,
      };

      const updatedChatMessages = [...truncatedMessages, editedUserMessage, assistantDraftMessage];

      // Update the chat state with the new message list
      setChats(prev => prev.map(c => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: updatedChatMessages,
          };
        }
        return c;
      }));

      setIsGenerating(true);

      const activeModel = selectedModel || targetChat.model;

      // Injected system instructions if canvasModeActive is true
      const finalPromptText = canvasModeActive
        ? `[SYSTEM INSTRUCTION FOR CANVAS PANEL CREATION & EDITS]
You have access to an interactive "Canvas" visual container. To present long-form text, recipes, code files, articles, lists, or summaries, you MUST write them inside a CANVAS macro.

Available Format Rules:
1. To CREATE a new canvas (or completely overwrite an existing one):
   @CANVAS-[Title Of Canvas]-[Content of Canvas]
   Example:
   @CANVAS-[Cats Eating Habits]-[Cats are obligate carnivores. They eat small meals throughout the day.]

2. To APPEND content to the end of an existing canvas (without deleting or rewriting it):
   @CANVAS_APPEND-[Title Of Canvas]-[Text to append]
   Example:
   @CANVAS_APPEND-[Cats Eating Habits]-[ Always provide fresh water alongside their food.]

CRITICAL RULES:
- Always wrap each parameter in separate square brackets, e.g., @CANVAS-[Title]-[Content], or @CANVAS_APPEND-[Title]-[Text].
- Do not repeat the full content in the regular chat if it is already in the Canvas. Provide a brief introduction in the chat, then output the @CANVAS macro.
[END OF SYSTEM INSTRUCTION]

${newContent}`
        : newContent;

      if (demoMode) {
        // Run Simulated Completion
        const simulatedReply = getSimulatedReply(activeModel, newContent);
        let index = 0;
        
        const interval = setInterval(() => {
          index += Math.floor(Math.random() * 4) + 2; 
          const currentSlice = simulatedReply.substring(0, index);

          setChats(prev => prev.map(c => {
            if (c.id === currentChatId) {
              const updatedMessages = c.messages.map(m => 
                m.id === assistantDraftMessage.id 
                  ? { ...m, content: currentSlice } 
                  : m
              );

              return {
                ...c,
                messages: updatedMessages,
              };
            }
            return c;
          }));

          if (index >= simulatedReply.length) {
            clearInterval(interval);
            setIsGenerating(false);
            triggerAutoTitleHeuristic(currentChatId, newContent, simulatedReply, activeModel);
          }
        }, 30);

        abortControllerRef.current = {
          abort: () => {
            clearInterval(interval);
            setIsGenerating(false);
          }
        } as AbortController;

      } else {
        // Run Real Ollama Completion
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
          const systemPromptMessages: { role: 'system' | 'user' | 'assistant', content: string }[] = [];
          
          // Custom system prompt per model
          const modelSystemPrompt = systemPrompts[activeModel] || '';
          if (modelSystemPrompt.trim()) {
            systemPromptMessages.push({ role: 'system', content: modelSystemPrompt });
          }

          // Dynamic Personalization Injection
          const isPersonalized = targetChat.personalizationEnabled ?? true;
          if (isPersonalized && memories.trim()) {
            systemPromptMessages.push({
              role: 'system',
              content: `[User Memory Profile - Personalization Active]\nThe following details are memories stored about the user. Please customize your communication and style according to these preferences:\n${memories}`
            });
          }

          const previousHistory = truncatedMessages.map(m => ({ role: m.role, content: m.content }));

          const fullHistory = [
            ...systemPromptMessages,
            ...previousHistory,
            { role: 'user', content: finalPromptText }
          ];

          let accumulatedText = '';
          const { streamOllamaChat } = await import('./utils/ollama');
          await streamOllamaChat(
            ollamaUrl,
            activeModel,
            fullHistory,
            (chunk) => {
              accumulatedText += chunk;
              setChats(prev => prev.map(c => {
                if (c.id === currentChatId) {
                  const updatedMessages = c.messages.map(m => 
                    m.id === assistantDraftMessage.id 
                      ? { ...m, content: accumulatedText } 
                      : m
                  );

                  return {
                    ...c,
                    messages: updatedMessages,
                  };
                }
                return c;
              }));
            },
            abortController.signal
          );

          setIsGenerating(false);
          triggerAutoTitleHeuristic(currentChatId, newContent, accumulatedText, activeModel);

        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log('User aborted generation stream');
          } else {
            console.error('Ollama stream failed:', err);
            setChats(prev => prev.map(c => {
              if (c.id === currentChatId) {
                return {
                  ...c,
                  messages: c.messages.map(m => 
                    m.id === assistantDraftMessage.id 
                      ? { ...m, content: `⚠️ **Ollama Connection Error**: ${err.message || 'The connection was reset. Ensure your local Ollama app is running and your server accepts remote origins.'}` } 
                      : m
                  ),
                };
              }
              return c;
            }));
          }
          setIsGenerating(false);
        } finally {
          abortControllerRef.current = null;
        }
      }

    } else {
      // Just editing an assistant message text (keep it simple/local)
      setChats(prev => prev.map(c => {
        if (c.id === currentChatId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === messageId ? { ...m, content: newContent } : m)
          };
        }
        return c;
      }));
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === currentChatId) {
        return {
          ...c,
          messages: c.messages.filter(m => m.id !== messageId)
        };
      }
      return c;
    }));
  };

  const handleRerunMessage = async (messageId: string) => {
    const targetChat = chats.find(c => c.id === currentChatId);
    if (!targetChat || isGenerating) return;

    const msgIndex = targetChat.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Find the user prompt message right before it
    const userPromptIndex = msgIndex - 1;
    if (userPromptIndex < 0) return;

    const userPromptMessage = targetChat.messages[userPromptIndex];
    if (userPromptMessage.role !== 'user') return;

    await handleEditMessage(userPromptMessage.id, userPromptMessage.content);
  };

  // Synchronize canvases from assistant messages in a safe state-driven effect
  useEffect(() => {
    if (!currentChatId || !activeChat) return;

    // 1. If we switched chats, initialize processed messages and base canvases
    if (currentChatId !== lastChatIdRef.current) {
      lastChatIdRef.current = currentChatId;
      processedMessagesRef.current = {};
      messageBaseCanvasesRef.current = {};
      // Mark existing messages as fully processed so switching chats doesn't trigger unexpected updates
      for (const msg of activeChat.messages) {
        processedMessagesRef.current[msg.id] = msg.content;
      }
      return;
    }

    const assistantMsgs = activeChat.messages.filter(m => m.role === 'assistant');

    // Check if any previously processed message has been deleted/removed
    const currentMsgIds = new Set(assistantMsgs.map(m => m.id));
    let messageWasDeleted = false;
    for (const id of Object.keys(processedMessagesRef.current)) {
      if (!currentMsgIds.has(id)) {
        messageWasDeleted = true;
        break;
      }
    }

    let currentCanvasesState = [...canvasesRef.current];

    if (messageWasDeleted) {
      processedMessagesRef.current = {};
      messageBaseCanvasesRef.current = {};
      // Start fresh, keeping canvases of other chats intact
      currentCanvasesState = canvasesRef.current.filter(c => c.chatId !== currentChatId);
    }

    if (assistantMsgs.length === 0) {
      if (messageWasDeleted) {
        setCanvases(currentCanvasesState);
        canvasesRef.current = currentCanvasesState;
      }
      return;
    }

    let updatedAny = false;

    // 2. Process messages in chronological order
    for (const msg of assistantMsgs) {
      const prevContent = processedMessagesRef.current[msg.id];
      if (prevContent === msg.content) {
        continue; // Already processed this exact version of this message
      }

      // If we see this message for the first time, save the current canvases state as base
      if (prevContent === undefined) {
        messageBaseCanvasesRef.current[msg.id] = [...currentCanvasesState];
      }

      // Start applying operations sequentially on top of the base canvases state for this message
      let workingCanvases = [...(messageBaseCanvasesRef.current[msg.id] || [])];
      const blocks = parseCanvasBlocks(msg.content);

      for (const block of blocks) {
        const { command, title, content = '' } = block;

        if (command === 'create' || command === 'edit') {
          // Full creation or complete overwrite
          const existingIndex = workingCanvases.findIndex(
            c => c.title.toLowerCase() === title.toLowerCase() && c.chatId === currentChatId
          );

          if (existingIndex > -1) {
            workingCanvases[existingIndex] = {
              ...workingCanvases[existingIndex],
              content,
              updatedAt: Date.now()
            };
          } else {
            const newCanvas: Canvas = {
              id: crypto.randomUUID(),
              title,
              content,
              updatedAt: Date.now(),
              chatId: currentChatId
            };
            workingCanvases.push(newCanvas);
            setActiveCanvasId(newCanvas.id); // Auto open
          }
        } else if (command === 'append') {
          // Append content to existing canvas
          const existingIndex = workingCanvases.findIndex(
            c => c.title.toLowerCase() === title.toLowerCase() && c.chatId === currentChatId
          );

          if (existingIndex > -1) {
            const existing = workingCanvases[existingIndex];
            workingCanvases[existingIndex] = {
              ...existing,
              content: existing.content + content,
              updatedAt: Date.now()
            };
          }
        }
      }

      // Update currentCanvasesState with the result of this message's application
      currentCanvasesState = workingCanvases;
      processedMessagesRef.current[msg.id] = msg.content;
      updatedAny = true;
    }

    if (updatedAny) {
      setCanvases(currentCanvasesState);
      canvasesRef.current = currentCanvasesState;
    }
  }, [activeChat?.messages, currentChatId]);

  const handleSelectCanvas = (canvasId: string) => {
    setActiveCanvasId(canvasId);
  };

  const handleDeleteCanvas = (canvasId: string) => {
    setCanvases(prev => {
      const updated = prev.filter(c => c.id !== canvasId);
      return updated;
    });
    if (activeCanvasId === canvasId) {
      setActiveCanvasId(null);
    }
  };

  const handleUpdateCanvas = (canvasId: string, updates: Partial<Canvas>) => {
    setCanvases(prev => {
      const updated = prev.map(c => c.id === canvasId ? { ...c, ...updates, updatedAt: Date.now() } : c);
      return updated;
    });
  };

  const handleRenameCanvas = (canvasId: string, title: string) => {
    handleUpdateCanvas(canvasId, { title });
  };

  const handleAttachCanvas = (canvas: Canvas) => {
    const targetChatId = currentChatId || crypto.randomUUID();
    
    // Ensure we have a chat first
    if (!currentChatId) {
      const newChat: Chat = {
        id: targetChatId,
        title: `Chat with ${canvas.title}`,
        model: selectedModel || 'No Model',
        messages: [],
        createdAt: Date.now(),
        personalizationEnabled: nextChatPersonalizationEnabled,
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(targetChatId);
    }

    setCanvases(prev => {
      const updated = prev.map(c => c.id === canvas.id ? { ...c, chatId: targetChatId } : c);
      return updated;
    });

    const attachMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `[Attached Canvas Context]\n\n@CANVAS-[${canvas.title}]-[${canvas.content}]\n\nI have added this canvas to our chat session. Please refer to this context or edit it using @CANVAS! if requested.`,
      timestamp: Date.now()
    };

    setChats(prev => prev.map(c => {
      if (c.id === targetChatId) {
        return {
          ...c,
          messages: [...c.messages, attachMessage]
        };
      }
      return c;
    }));

    setActiveCanvasId(canvas.id);
  };

  const handleTetherCanvasToNewChat = (canvas: Canvas) => {
    const targetChatId = crypto.randomUUID();
    
    const newChat: Chat = {
      id: targetChatId,
      title: `Chat with ${canvas.title}`,
      model: selectedModel || 'No Model',
      messages: [],
      createdAt: Date.now(),
      personalizationEnabled: nextChatPersonalizationEnabled,
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(targetChatId);

    setCanvases(prev => {
      const updated = prev.map(c => c.id === canvas.id ? { ...c, chatId: targetChatId } : c);
      return updated;
    });

    const attachMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `[Attached Canvas Context]\n\n@CANVAS-[${canvas.title}]-[${canvas.content}]\n\nI have added this canvas to our chat session. Please refer to this context or edit it using @CANVAS! if requested.`,
      timestamp: Date.now()
    };

    setChats(prev => prev.map(c => {
      if (c.id === targetChatId) {
        return {
          ...c,
          messages: [attachMessage]
        };
      }
      return c;
    }));

    setActiveCanvasId(canvas.id);
  };

  const handleTogglePersonalization = () => {
    if (currentChatId) {
      setChats(prev => prev.map(c => {
        if (c.id === currentChatId) {
          const currentVal = c.personalizationEnabled ?? true;
          return {
            ...c,
            personalizationEnabled: !currentVal
          };
        }
        return c;
      }));
    } else {
      setNextChatPersonalizationEnabled(prev => !prev);
    }
  };

  // Abort ongoing response generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  // Core Prompt Sending Logic
  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isGenerating) return;

    let chatId = currentChatId;
    let currentActiveChat = activeChat;

    // Create a new chat if none exists or is active
    if (!chatId || !currentActiveChat) {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        model: selectedModel,
        messages: [],
        createdAt: Date.now(),
        personalizationEnabled: nextChatPersonalizationEnabled,
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      chatId = newChat.id;
      currentActiveChat = newChat;
    }

    // Prepare fresh messages list
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: promptText,
      timestamp: Date.now(),
    };

    const assistantDraftMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
    };

    // Update state to render user's prompt and a placeholder draft
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: [...c.messages, userMessage, assistantDraftMessage],
        };
      }
      return c;
    }));

    setIsGenerating(true);

    const activeModel = selectedModel;

    // Injected system prompt if canvasModeActive is true
    const finalPromptText = canvasModeActive
      ? `[SYSTEM INSTRUCTION FOR CANVAS PANEL CREATION & EDITS]
You have access to an interactive "Canvas" visual container. To present long-form text, recipes, code files, articles, lists, or summaries, you MUST write them inside a CANVAS macro.

Available Format Rules:
1. To CREATE a new canvas (or completely overwrite an existing one):
   @CANVAS-[Title Of Canvas]-[Content of Canvas]
   Example:
   @CANVAS-[Cats Eating Habits]-[Cats are obligate carnivores. They eat small meals throughout the day.]

2. To APPEND content to the end of an existing canvas (without deleting or rewriting it):
   @CANVAS_APPEND-[Title Of Canvas]-[Text to append]
   Example:
   @CANVAS_APPEND-[Cats Eating Habits]-[ Always provide fresh water alongside their food.]

CRITICAL RULES:
- Always wrap each parameter in separate square brackets, e.g., @CANVAS-[Title]-[Content], or @CANVAS_APPEND-[Title]-[Text].
- Do not repeat the full content in the regular chat if it is already in the Canvas. Provide a brief introduction in the chat, then output the @CANVAS macro.
[END OF SYSTEM INSTRUCTION]

${promptText}`
      : promptText;

    // 1. Simulated Demo Mode Response Stream
    if (demoMode) {
      const simulatedReply = getSimulatedReply(activeModel, promptText);
      let index = 0;
      
      const interval = setInterval(() => {
        // Increment chunk size to simulate fast text stream
        index += Math.floor(Math.random() * 4) + 2; 
        const currentSlice = simulatedReply.substring(0, index);

        setChats(prev => prev.map(c => {
          if (c.id === chatId) {
            const updatedMessages = c.messages.map(m => 
              m.id === assistantDraftMessage.id 
                ? { ...m, content: currentSlice } 
                : m
            );

            return {
              ...c,
              messages: updatedMessages,
            };
          }
          return c;
        }));

        if (index >= simulatedReply.length) {
          clearInterval(interval);
          setIsGenerating(false);
          // Trigger Auto-Title logic after completion
          triggerAutoTitleHeuristic(chatId!, promptText, simulatedReply, activeModel);
        }
      }, 30);

      // Store interval cleanup mechanism inside abort state
      abortControllerRef.current = {
        abort: () => {
          clearInterval(interval);
          setIsGenerating(false);
        }
      } as AbortController;

    } else {
      // 2. Real Local Ollama Connection Stream
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const systemPromptMessages: { role: 'system' | 'user' | 'assistant', content: string }[] = [];

        // 1. Model specific system prompt (injected first)
        const modelSystemPrompt = systemPrompts[activeModel] || '';
        if (modelSystemPrompt.trim()) {
          systemPromptMessages.push({ role: 'system', content: modelSystemPrompt });
        }

        // 2. Global Memories (injected right after, if personalization is enabled)
        const isPersonalized = currentActiveChat?.personalizationEnabled ?? true;
        if (isPersonalized && memories.trim()) {
          systemPromptMessages.push({
            role: 'system',
            content: `[User Memory Profile - Personalization Active]\nThe following details are memories stored about the user. Please customize your communication and style according to these preferences:\n${memories}`
          });
        }

        const previousHistory = (currentActiveChat?.messages || []).map(m => ({ role: m.role, content: m.content }));

        const fullHistory = [
          ...systemPromptMessages,
          ...previousHistory,
          { role: 'user', content: finalPromptText }
        ];

        let accumulatedText = '';

        // Call the streaming utility with dynamic fetch chunks
        const { streamOllamaChat } = await import('./utils/ollama');
        await streamOllamaChat(
          ollamaUrl,
          activeModel,
          fullHistory,
          (chunk) => {
            accumulatedText += chunk;
            setChats(prev => prev.map(c => {
              if (c.id === chatId) {
                const updatedMessages = c.messages.map(m => 
                  m.id === assistantDraftMessage.id 
                    ? { ...m, content: accumulatedText } 
                    : m
                );

                return {
                  ...c,
                  messages: updatedMessages,
                };
              }
              return c;
            }));
          },
          abortController.signal
        );

        setIsGenerating(false);
        triggerAutoTitleHeuristic(chatId!, promptText, accumulatedText, activeModel);

      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('User aborted generation stream');
        } else {
          console.error('Ollama stream failed:', err);
          // Provide an error block feedback to user in chat area
          setChats(prev => prev.map(c => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: c.messages.map(m => 
                  m.id === assistantDraftMessage.id 
                    ? { ...m, content: `⚠️ **Ollama Connection Error**: ${err.message || 'The connection was reset. Ensure your local Ollama app is running and your server accepts remote origins.'}` } 
                    : m
                ),
              };
            }
            return c;
          }));
        }
        setIsGenerating(false);
      } finally {
        abortControllerRef.current = null;
      }
    }
  };

  // Handles naming the chat based on the first user-model exchange
  const triggerAutoTitleHeuristic = async (
    chatId: string, 
    userPrompt: string, 
    modelResponse: string,
    modelName: string
  ) => {
    const targetChat = chatsRef.current.find(c => c.id === chatId);
    if (!targetChat) return;

    // Condition: Check if this is the first exchange of the conversation (exactly 2 messages)
    // AND the title is still the placeholder "New Chat"
    if (targetChat.messages.length === 2 && targetChat.title === 'New Chat') {
      if (demoMode) {
        // Heuristic fallback for demo mode
        const words = userPrompt.split(/\s+/).filter(Boolean);
        let titleCandidate = '';
        if (words.length <= 3) {
          titleCandidate = userPrompt;
        } else {
          titleCandidate = words.slice(0, 3).join(' ') + '...';
        }
        
        // Capitalize first letter
        titleCandidate = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);
        handleRenameChat(chatId, titleCandidate);
      } else {
        // Real Ollama LLM generated summary
        try {
          const generatedTitle = await generateChatTitle(ollamaUrl, modelName, userPrompt, modelResponse);
          if (generatedTitle) {
            handleRenameChat(chatId, generatedTitle);
          }
        } catch (e) {
          console.warn('Auto-title generation failed, using fallback heuristic:', e);
        }
      }
    }
  };

  if (!sessionToken || !encryptionKey || !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div id="ollama-app-root" className="h-screen flex bg-zinc-900 text-zinc-100 overflow-hidden font-sans animate-in fade-in duration-300">
      
      {/* Sidebar (Collapsible drawer with chats & quick settings trigger) */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onOpenSettings={handleOpenSettings}
        status={status}
        demoMode={demoMode}
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onSelectCanvas={handleSelectCanvas}
        onDeleteCanvas={handleDeleteCanvas}
        onRenameCanvas={handleRenameCanvas}
        selectedModel={selectedModel}
        ollamaUrl={ollamaUrl}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-zinc-900/40 relative">
        
        {/* Navigation / Header bar */}
        <header className="h-14 border-b border-zinc-900 px-4 flex items-center justify-between select-none bg-zinc-950/20 backdrop-blur-md">
          {/* Top Left: Expand Sidebar + Model Selector */}
          <ModelSelector
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onOpenSettings={handleOpenSettings}
            status={status}
            demoMode={demoMode}
            loadedModels={loadedModels}
            onUnloadModel={handleUnloadModel}
          />

          {/* Top Right: Settings shortcut & Mode badge */}
          <div className="flex items-center gap-3">
            <div 
              onClick={handleOpenSettings}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold cursor-pointer transition select-none ${
                demoMode 
                  ? 'border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10' 
                  : status.connected 
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'
                    : 'border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                demoMode ? 'bg-amber-400' : status.connected ? 'bg-emerald-400' : 'bg-rose-500'
              }`} />
              <span>{demoMode ? 'Sandbox Active' : status.connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <UserProfileMenu 
              user={user}
              sessionToken={sessionToken}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        {/* Scrollable messages and blank-state cards */}
        <ChatArea
          chat={activeChat}
          selectedModel={selectedModel}
          onSendPrompt={handleSendPrompt}
          isGenerating={isGenerating}
          onOpenSettings={handleOpenSettings}
          demoMode={demoMode}
          modelsCount={models.length}
          onOpenCanvas={(title) => {
            const found = canvases.find(c => c.title.toLowerCase() === title.trim().toLowerCase());
            if (found) {
              setActiveCanvasId(found.id);
            }
          }}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onRerunMessage={handleRerunMessage}
        />

        {/* Bottom prompt input messaging bar */}
        <ChatInput
          onSendPrompt={handleSendPrompt}
          isGenerating={isGenerating}
          onStopGeneration={handleStopGeneration}
          selectedModel={selectedModel}
          canvasModeActive={canvasModeActive}
          onToggleCanvasMode={setCanvasModeActive}
          availableCanvases={canvases.filter(c => c.chatId !== currentChatId)}
          onAttachCanvas={handleAttachCanvas}
          personalizationEnabled={activeChat ? (activeChat.personalizationEnabled ?? true) : nextChatPersonalizationEnabled}
          onTogglePersonalization={handleTogglePersonalization}
          onTetherCanvasToNewChat={handleTetherCanvasToNewChat}
          ollamaUrl={ollamaUrl}
          demoMode={demoMode}
        />

      </div>

      {/* Side Canvas panel */}
      {activeCanvas && (
        <CanvasPanel
          canvas={activeCanvas}
          onClose={() => setActiveCanvasId(null)}
          onUpdateCanvas={handleUpdateCanvas}
          onDeleteCanvas={handleDeleteCanvas}
        />
      )}

      {/* Settings Dialog (Connection panel, Model pull download agent) */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={handleCloseSettings}
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        onRefreshModels={checkConnectionAndLoadModels}
        models={models}
        loadedModels={loadedModels}
        onUnloadModel={handleUnloadModel}
        memories={memories}
        setMemories={setMemories}
        systemPrompts={systemPrompts}
        setSystemPrompts={setSystemPrompts}
      />
    </div>
  );
}
