import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit3, Settings, Search, ChevronLeft, Check, X, Sparkles, Cpu } from 'lucide-react';
import { Chat, OllamaStatus, Canvas } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  status: OllamaStatus;
  demoMode: boolean;
  canvases: Canvas[];
  activeCanvasId: string | null;
  onSelectCanvas: (id: string) => void;
  onDeleteCanvas: (id: string) => void;
  onRenameCanvas: (id: string, title: string) => void;
  selectedModel: string;
  ollamaUrl: string;
}

export default function Sidebar({
  isOpen,
  onToggle,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onOpenSettings,
  status,
  demoMode,
  canvases,
  activeCanvasId,
  onSelectCanvas,
  onDeleteCanvas,
  onRenameCanvas,
  selectedModel,
  ollamaUrl,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'canvases' | 'continuation'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // Continuation State
  const [continuationText, setContinuationText] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const continuationAbortRef = React.useRef<AbortController | null>(null);

  const handleContinuation = async () => {
    if (!continuationText.trim() || !selectedModel) return;

    if (isContinuing) {
      if (continuationAbortRef.current) {
        continuationAbortRef.current.abort();
      }
      setIsContinuing(false);
      return;
    }

    setIsContinuing(true);
    const controller = new AbortController();
    continuationAbortRef.current = controller;

    try {
      if (demoMode) {
        // Simulation for Demo Mode
        let simulatedAddedText = `\n\n[Continuation response from ${selectedModel}]:\nThis is a simulated completion based on your input. In a real environment with Ollama, the model will continue your text seamlessly from here, building on your context and writing style!`;
        let index = 0;
        const interval = setInterval(() => {
          index += 5;
          setContinuationText(prev => prev + simulatedAddedText.slice(index - 5, index));
          if (index >= simulatedAddedText.length) {
            clearInterval(interval);
            setIsContinuing(false);
          }
        }, 40);

        continuationAbortRef.current = {
          abort: () => {
            clearInterval(interval);
            setIsContinuing(false);
          }
        } as AbortController;

      } else {
                // Real Ollama streaming completion
        const { streamOllamaGenerate } = await import('../utils/ollama');
        await streamOllamaGenerate(
          ollamaUrl,
          selectedModel,
          continuationText,
          (chunk) => {
            setContinuationText(prev => prev + chunk);
          },
          controller.signal,
          true
        );
        setIsContinuing(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Continuation aborted');
      } else {
        console.error('Continuation failed:', err);
        setContinuationText(prev => prev + `\n\n[Error: ${err.message}]`);
      }
      setIsContinuing(false);
    }
  };

  // Auto-switch to canvases tab if a canvas becomes active
  React.useEffect(() => {
    if (activeCanvasId) {
      setActiveTab('canvases');
    }
  }, [activeCanvasId]);

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCanvases = canvases.filter((canvas) =>
    canvas.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    canvas.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleRenameSave = (chatId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  return (
    <div 
      id="sidebar-container"
      className={`h-screen bg-zinc-950 border-r border-zinc-800 text-zinc-200 transition-all duration-300 flex flex-col shrink-0 relative ${
        isOpen ? 'w-68' : 'w-0 overflow-hidden border-r-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-zinc-900">
        <button
          id="new-chat-btn"
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700 py-2.5 px-3 text-xs font-medium text-white transition cursor-pointer active:scale-98"
        >
          <Plus className="h-4 w-4 text-indigo-400" />
          New Chat
        </button>
        
        {/* Collapse Button inside Sidebar */}
        <button
          id="collapse-sidebar-btn"
          onClick={onToggle}
          className="ml-2 rounded-lg p-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Sidebar Tabs */}
      <div className="flex border-b border-zinc-900/60 p-1 bg-zinc-950/20 gap-1 select-none">
        <button
          id="sidebar-tab-chats"
          onClick={() => {
            setActiveTab('chats');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg transition-all ${
            activeTab === 'chats' 
              ? 'text-indigo-400 bg-indigo-500/10 font-bold' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
          }`}
        >
          <span>Chats</span>
        </button>
        <button
          id="sidebar-tab-canvases"
          onClick={() => {
            setActiveTab('canvases');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg transition-all ${
            activeTab === 'canvases' 
              ? 'text-indigo-400 bg-indigo-500/10 font-bold' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
          }`}
        >
          <span>Canvases</span>
          {canvases.length > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono transition-all ${
              activeTab === 'canvases'
                ? 'bg-indigo-500/20 text-indigo-400 font-bold'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {canvases.length}
            </span>
          )}
        </button>
        <button
          id="sidebar-tab-continuation"
          onClick={() => {
            setActiveTab('continuation');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg transition-all ${
            activeTab === 'continuation' 
              ? 'text-indigo-400 bg-indigo-500/10 font-bold' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
          }`}
        >
          <span>Continuation</span>
        </button>
      </div>

      {/* Search Input */}
      {((activeTab === 'chats' && chats.length > 3) || (activeTab === 'canvases' && canvases.length > 3)) && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              id="search-chats-input"
              type="text"
              placeholder={activeTab === 'chats' ? "Search conversations..." : "Search canvases..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-900 bg-zinc-900/40 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {activeTab === 'continuation' ? (
          <div className="flex flex-col h-full p-2.5 space-y-3 select-text">
            <div className="flex flex-col text-left select-none">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Continuation Editor</span>
              <span className="text-[9px] text-zinc-500 mt-0.5">Write some text and let the model complete/continue it.</span>
            </div>

            <textarea
              id="continuation-textarea-editor"
              value={continuationText}
              onChange={(e) => setContinuationText(e.target.value)}
              placeholder="Type your story, outline, or code snippet here, and let Ollama continue writing..."
              disabled={isContinuing}
              className="w-full flex-1 min-h-[300px] bg-zinc-900 border border-zinc-850 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-sans resize-none leading-relaxed disabled:opacity-80"
            />

            <button
              id="generate-continuation-btn"
              type="button"
              onClick={handleContinuation}
              disabled={!continuationText.trim() || !selectedModel}
              className={`w-full py-2.5 rounded-lg text-xs font-bold tracking-wide select-none cursor-pointer transition active:scale-98 ${
                isContinuing
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-550 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:cursor-not-allowed text-white'
              }`}
            >
              {isContinuing ? 'Stop Continuation' : `Continue with ${selectedModel || 'Model'}`}
            </button>
          </div>
        ) : activeTab === 'chats' ? (
          <>
            <div className="px-2 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Recent Chats</span>
              <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 font-mono">{filteredChats.length}</span>
            </div>

            {filteredChats.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-zinc-500 italic">
                {searchQuery ? 'No matching chats' : 'No chats yet'}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === currentChatId;
                const isEditing = chat.id === editingChatId;

                return (
                  <div
                    key={chat.id}
                    id={`chat-item-${chat.id}`}
                    onClick={() => onSelectChat(chat.id)}
                    className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition relative ${
                      isSelected 
                        ? 'bg-zinc-900 text-white border-l-2 border-indigo-500' 
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    {isEditing ? (
                      <form 
                        onSubmit={(e) => handleRenameSave(chat.id, e)}
                        className="flex-1 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          id={`edit-chat-input-${chat.id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          autoFocus
                        />
                        <button 
                          id={`save-rename-${chat.id}`}
                          type="submit" 
                          className="p-0.5 hover:text-indigo-400 text-zinc-400"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button 
                          id={`cancel-rename-${chat.id}`}
                          type="button" 
                          onClick={handleRenameCancel} 
                          className="p-0.5 hover:text-rose-400 text-zinc-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate flex-1 pr-4">
                          <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                          <div className="truncate flex flex-col">
                            <span className="truncate text-zinc-200 font-medium">{chat.title}</span>
                            <span className="text-[9px] text-zinc-500 truncate font-mono opacity-80">{chat.model}</span>
                          </div>
                        </div>

                        {/* Chat Item Actions */}
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`rename-chat-btn-${chat.id}`}
                            onClick={(e) => startRename(chat, e)}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                            title="Rename Chat"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            id={`delete-chat-btn-${chat.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition"
                            title="Delete Chat"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            <div className="px-2 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Stored Canvases</span>
              <span className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 font-mono">{filteredCanvases.length}</span>
            </div>

            {filteredCanvases.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-zinc-500 italic">
                {searchQuery ? 'No matching canvases' : 'No canvases created yet.'}
              </div>
            ) : (
              filteredCanvases.map((canvas) => {
                const isSelected = canvas.id === activeCanvasId;
                const isEditing = canvas.id === editingChatId;

                return (
                  <div
                    key={canvas.id}
                    id={`canvas-item-${canvas.id}`}
                    onClick={() => onSelectCanvas(canvas.id)}
                    className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition relative ${
                      isSelected 
                        ? 'bg-zinc-900 text-white border-l-2 border-indigo-500' 
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    {isEditing ? (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editTitle.trim()) {
                            onRenameCanvas(canvas.id, editTitle.trim());
                          }
                          setEditingChatId(null);
                        }}
                        className="flex-1 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          id={`edit-canvas-input-${canvas.id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          autoFocus
                        />
                        <button 
                          id={`save-rename-canvas-${canvas.id}`}
                          type="submit" 
                          className="p-0.5 hover:text-indigo-400 text-zinc-400"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button 
                          id={`cancel-rename-canvas-${canvas.id}`}
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(null);
                          }} 
                          className="p-0.5 hover:text-rose-400 text-zinc-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate flex-1 pr-4">
                          <span className="text-zinc-500 group-hover:text-zinc-400 select-none">📄</span>
                          <div className="truncate flex flex-col">
                            <span className="truncate text-zinc-200 font-medium">{canvas.title}</span>
                            {canvas.chatId ? (
                              <span className="text-[9px] text-zinc-500 truncate font-mono">Linked to chat</span>
                            ) : (
                              <span className="text-[9px] text-amber-500/80 truncate font-mono font-semibold">Detached</span>
                            )}
                          </div>
                        </div>

                        {/* Canvas Item Actions */}
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`rename-canvas-btn-${canvas.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(canvas.id);
                              setEditTitle(canvas.title);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition"
                            title="Rename Canvas"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            id={`delete-canvas-btn-${canvas.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCanvas(canvas.id);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition"
                            title="Delete Canvas"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Sidebar Footer with Status and Settings */}
      <div className="p-3.5 border-t border-zinc-900 bg-zinc-950/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Cpu className={`h-4 w-4 ${demoMode ? 'text-amber-400' : status.connected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
              <span className={`absolute -bottom-0.5 -right-0.5 block h-1.5 w-1.5 rounded-full ring-1 ring-zinc-950 ${
                demoMode ? 'bg-amber-400' : status.connected ? 'bg-emerald-400' : 'bg-rose-500'
              }`} />
            </div>
            
            <div className="truncate flex flex-col text-left">
              <span className="text-[10px] font-semibold text-zinc-300">
                {demoMode ? 'Demo Server' : 'Ollama Server'}
              </span>
              <span className="text-[9px] text-zinc-500 truncate font-mono">
                {demoMode ? 'Local Simulation' : status.url.replace(/^https?:\/\//, '')}
              </span>
            </div>
          </div>

          <button
            id="settings-trigger-btn"
            onClick={onOpenSettings}
            className="rounded-lg p-2 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-800 text-zinc-400 hover:text-indigo-400 transition cursor-pointer"
            title="Configure Ollama"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
