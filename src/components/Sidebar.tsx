import React, { useState } from 'react';
import { X, Search, Cpu, Settings, Trash2, Edit3, Plus, Menu, Check, Sparkles, MessageSquare, BookOpen, PenTool, Flame } from 'lucide-react';
import { Chat, Canvas, OllamaStatus } from '../types';
import { checkContentSafety } from '../utils/ollama';
import { getKidTheme } from '../utils/theme';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
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
  
  // Custom Kid UI and Safety Props
  isKidMode?: boolean;
  isFilterActive?: boolean;
  kidStyle?: string;
  ageGroup?: string;
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
  isKidMode = false,
  isFilterActive = false,
  kidStyle = 'candy',
  ageGroup,
}: SidebarProps) {
  const currentKidTheme = getKidTheme(kidStyle);

  const [activeTab, setActiveTab] = useState<'chats' | 'canvases' | 'continuation'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Continuation States
  const [continuationText, setContinuationText] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const [continuationStatus, setContinuationStatus] = useState<'idle' | 'generating' | 'checking'>('idle');
  const continuationAbortRef = React.useRef<AbortController | null>(null);

  const handleContinuation = async () => {
    if (!continuationText.trim() || !selectedModel) return;

    if (isContinuing) {
      if (continuationAbortRef.current) {
        continuationAbortRef.current.abort();
      }
      setIsContinuing(false);
      setContinuationStatus('idle');
      return;
    }

    setIsContinuing(true);
    setContinuationStatus('generating');
    const controller = new AbortController();
    continuationAbortRef.current = controller;

    try {
      const hasSafetyFilter = isFilterActive || isKidMode || ageGroup === 'teen' || ageGroup === 'kid';
      if (hasSafetyFilter) {
        // --- NON-STREAMING SAFETY CHECK FLOW ---
        let generatedText = '';

        if (demoMode) {
          await new Promise((resolve) => setTimeout(resolve, 1800));
          const { getSimulatedReply } = await import('../utils/ollama');
          generatedText = getSimulatedReply(selectedModel, continuationText);
        } else {
          // Fetch complete non-streamed text from Ollama
          const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel,
              prompt: continuationText,
              raw: true,
              stream: false,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
          }
          const data = await response.json();
          generatedText = data.response || '';
        }

        setContinuationStatus('checking');

        // Verify Safety
        const isSafe = await checkContentSafety(ollamaUrl, selectedModel, generatedText, demoMode, ageGroup);

        if (isSafe) {
          setContinuationText((prev) => prev + (generatedText.startsWith('\n') ? '' : '\n\n') + generatedText);
        } else {
          const warning = isKidMode
            ? "\n\n[Oops! 🌟 That part of the story wasn't super safe for kids, so I blocked it! Let's write something else!]"
            : "\n\n[This continuation triggered the model to be unsafe]";
          setContinuationText((prev) => prev + warning);
        }

        setIsContinuing(false);
        setContinuationStatus('idle');

      } else {
        // --- STANDARD ADULT STREAMING FLOW ---
        if (demoMode) {
          let simulatedAddedText = `\n\n[Continuation response from ${selectedModel}]:\nThis is a simulated completion based on your input. In a real environment with Ollama, the model will continue your text seamlessly from here, building on your context and writing style!`;
          let index = 0;
          const interval = setInterval(() => {
            index += 5;
            setContinuationText((prev) => prev + simulatedAddedText.slice(index - 5, index));
            if (index >= simulatedAddedText.length) {
              clearInterval(interval);
              setIsContinuing(false);
              setContinuationStatus('idle');
            }
          }, 40);

          continuationAbortRef.current = {
            abort: () => {
              clearInterval(interval);
              setIsContinuing(false);
              setContinuationStatus('idle');
            },
          } as AbortController;

        } else {
          const { streamOllamaGenerate } = await import('../utils/ollama');
          await streamOllamaGenerate(
            ollamaUrl,
            selectedModel,
            continuationText,
            (chunk) => {
              setContinuationText((prev) => prev + chunk);
            },
            controller.signal,
            true
          );
          setIsContinuing(false);
          setContinuationStatus('idle');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Continuation aborted');
      } else {
        console.error('Continuation failed:', err);
        setContinuationText((prev) => prev + `\n\n[Error: ${err.message}]`);
      }
      setIsContinuing(false);
      setContinuationStatus('idle');
    }
  };

  // Auto-switch to canvases tab if a canvas becomes active
  React.useEffect(() => {
    if (activeCanvasId) {
      setActiveTab('canvases');
    }
  }, [activeCanvasId]);

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCanvases = canvases.filter((canvas) =>
    canvas.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        id="open-sidebar-drawer-btn"
        onClick={onToggle}
        className={`fixed top-3 left-3 z-40 p-2 border rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center ${
          isKidMode 
            ? `${currentKidTheme.buttonAccent} shadow-lg shadow-black/25` 
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
        }`}
        title="Open Sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      id="app-sidebar-drawer"
      className={`h-screen w-64 border-r flex flex-col shrink-0 z-40 transition-all duration-300 select-none relative ${
        isKidMode
          ? `${currentKidTheme.sidebarBg} ${currentKidTheme.sidebarBorder} text-white font-sans`
          : 'bg-zinc-950 border-zinc-900 text-zinc-200'
      }`}
    >
      {/* Sidebar Header */}
      <div className={`p-4 flex items-center justify-between border-b ${isKidMode ? `${currentKidTheme.sidebarBorder} ${currentKidTheme.sidebarHeaderBg}` : 'border-zinc-900'}`}>
        <div className="flex items-center gap-2">
          {isKidMode ? (
            <>
              <span className="text-xl">🎈</span>
              <span className="text-sm font-black tracking-tight uppercase text-white">Playground Rail</span>
            </>
          ) : (
            <>
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-black tracking-widest uppercase text-zinc-300">Workspace Rail</span>
            </>
          )}
        </div>
        <button
          id="close-sidebar-drawer-btn"
          onClick={onToggle}
          className={`rounded-lg p-1 transition cursor-pointer ${
            isKidMode ? 'hover:bg-black/30 text-white' : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300'
          }`}
          title="Collapse Sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className={`p-2 flex gap-1 border-b ${isKidMode ? `${currentKidTheme.sidebarBorder} ${currentKidTheme.sidebarHeaderBg}` : 'border-zinc-900 bg-zinc-900/10'}`}>
        <button
          id="sidebar-tab-chats"
          onClick={() => {
            setActiveTab('chats');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all duration-200 ${
            activeTab === 'chats'
              ? isKidMode
                ? `${currentKidTheme.sidebarTabActive} font-bold shadow-md shadow-black/20`
                : 'text-indigo-400 bg-indigo-500/10 font-bold'
              : isKidMode
                ? currentKidTheme.sidebarTabInactive
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
          }`}
        >
          <span>{isKidMode ? '💬 Rooms' : 'Chats'}</span>
        </button>
        <button
          id="sidebar-tab-canvases"
          onClick={() => {
            setActiveTab('canvases');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all duration-200 ${
            activeTab === 'canvases'
              ? isKidMode
                ? `${currentKidTheme.sidebarTabActive} font-bold shadow-md shadow-black/20`
                : 'text-indigo-400 bg-indigo-500/10 font-bold'
              : isKidMode
                ? currentKidTheme.sidebarTabInactive
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
          }`}
        >
          <span>{isKidMode ? '🎨 Boards' : 'Canvases'}</span>
        </button>
        <button
          id="sidebar-tab-continuation"
          onClick={() => {
            setActiveTab('continuation');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all duration-200 ${
            activeTab === 'continuation'
              ? isKidMode
                ? `${currentKidTheme.sidebarTabActive} font-bold shadow-md shadow-black/20`
                : 'text-indigo-400 bg-indigo-500/10 font-bold'
              : isKidMode
                ? currentKidTheme.sidebarTabInactive
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
          }`}
        >
          <span>{isKidMode ? '✨ Stories' : 'Continuation'}</span>
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
              placeholder={
                activeTab === 'chats' 
                  ? isKidMode ? "Find your rooms..." : "Search conversations..." 
                  : isKidMode ? "Find your boards..." : "Search canvases..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl border py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none ${
                isKidMode 
                  ? `${currentKidTheme.inputBg} ${currentKidTheme.sidebarBorder}` 
                  : 'border-zinc-900 bg-zinc-900/40 focus:border-zinc-700'
              }`}
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
          /* --- CONTINUATION TAB --- */
          <div className="flex flex-col h-full p-2.5 space-y-3 select-text">
            <div className="flex flex-col text-left select-none">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isKidMode ? currentKidTheme.textMuted : 'text-zinc-400'}`}>
                {isKidMode ? 'Magic Story Writer ✨📖' : 'Continuation Editor'}
              </span>
              <span className="text-[9px] text-zinc-500 mt-0.5 leading-normal">
                {isKidMode 
                  ? 'Type a fun story, and your AI buddy will keep writing it!'
                  : 'Write some text and let the model complete/continue it.'}
              </span>
            </div>

            <textarea
              id="continuation-textarea-editor"
              value={continuationText}
              onChange={(e) => setContinuationText(e.target.value)}
              placeholder={
                isKidMode 
                  ? "Once upon a time, in a magical land far away, a little puppy found a golden key..." 
                  : "Type your story, outline, or code snippet here, and let Ollama continue writing..."
              }
              disabled={isContinuing}
              className={`w-full flex-1 min-h-[220px] rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none font-sans resize-none leading-relaxed disabled:opacity-80 border ${
                isKidMode 
                  ? `${currentKidTheme.inputBg} ${currentKidTheme.sidebarBorder} text-zinc-100` 
                  : 'bg-zinc-900 border-zinc-850 focus:border-indigo-500'
              }`}
            />

            <button
              id="generate-continuation-btn"
              type="button"
              onClick={handleContinuation}
              disabled={!continuationText.trim() || !selectedModel}
              className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wide select-none cursor-pointer transition active:scale-98 ${
                isContinuing
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : isKidMode
                    ? `${currentKidTheme.buttonAccent} shadow-lg shadow-black/20`
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isContinuing ? (
                <span>
                  {continuationStatus === 'generating' ? 'Generating...' : 'Checking...'}
                </span>
              ) : isKidMode ? (
                '✨ Continue My Story ✨'
              ) : (
                `Continue with ${selectedModel.split(':')[0]}`
              )}
            </button>
          </div>
        ) : activeTab === 'chats' ? (
          /* --- CHATS TAB --- */
          <>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isKidMode ? currentKidTheme.textMuted : 'text-zinc-500'}`}>
                {isKidMode ? 'My Saved Rooms 🎈' : 'Recent Chats'}
              </span>
              <button
                id="new-chat-plus-btn"
                onClick={onNewChat}
                className={`rounded-lg p-1 transition cursor-pointer border ${
                  isKidMode 
                    ? `${currentKidTheme.buttonAccent} shadow-md shadow-black/20` 
                    : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={isKidMode ? "New Room" : "Create New Chat"}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {filteredChats.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs italic">
                {searchQuery ? 'No matching rooms' : isKidMode ? 'No story rooms yet! Click + to start!' : 'No chats found.'}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === currentChatId;
                const isEditing = chat.id === editingChatId;

                return (
                  <div
                    key={chat.id}
                    id={`chat-history-item-${chat.id}`}
                    onClick={() => onSelectChat(chat.id)}
                    className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer transition-all duration-200 relative ${
                      isSelected
                        ? isKidMode
                          ? `${currentKidTheme.activeItemBg} shadow-inner`
                          : 'bg-zinc-900 text-white border-l-2 border-indigo-500'
                        : isKidMode
                          ? `${currentKidTheme.inactiveItemBg}`
                          : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editTitle.trim()) {
                            onRenameChat(chat.id, editTitle.trim());
                          }
                          setEditingChatId(null);
                        }}
                        className="flex-1 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          id={`edit-chat-title-${chat.id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={`flex-1 rounded border px-1 py-0.5 text-xs text-white focus:outline-none ${
                            isKidMode ? 'border-pink-500 bg-pink-950' : 'border-zinc-700 bg-zinc-950'
                          }`}
                          autoFocus
                        />
                        <button type="submit" className="p-0.5 text-zinc-400 hover:text-indigo-400">
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(null);
                          }}
                          className="p-0.5 text-zinc-400 hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate flex-1 pr-4">
                          <span className="text-zinc-500 group-hover:text-zinc-400 select-none">
                            {isKidMode ? '🐾' : '💬'}
                          </span>
                          <div className="truncate flex flex-col text-left">
                            <span className="truncate text-zinc-200 font-medium">{chat.title}</span>
                            <span className="text-[9px] text-zinc-500 truncate font-mono">{chat.model}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`rename-chat-btn-${chat.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditTitle(chat.title);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                            title="Rename"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            id={`delete-chat-btn-${chat.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400"
                            title="Delete"
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
          /* --- CANVASES TAB --- */
          <>
            <div className="flex items-center justify-between px-2 mb-1.5 text-left">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isKidMode ? currentKidTheme.textMuted : 'text-zinc-500'}`}>
                {isKidMode ? 'My Drawing Boards 🎨' : 'Active Canvases'}
              </span>
            </div>

            {filteredCanvases.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs italic">
                {searchQuery ? 'No matching boards' : isKidMode ? 'No drawing boards yet! Send messages to make them!' : 'No canvases yet.'}
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
                    className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer transition-all duration-200 relative ${
                      isSelected
                        ? isKidMode
                          ? `${currentKidTheme.activeItemBg} shadow-inner`
                          : 'bg-zinc-900 text-white border-l-2 border-indigo-500'
                        : isKidMode
                          ? `${currentKidTheme.inactiveItemBg}`
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
                          className={`flex-1 rounded border px-1 py-0.5 text-xs text-white focus:outline-none ${
                            isKidMode ? `${currentKidTheme.sidebarBorder} ${currentKidTheme.inputBg}` : 'border-zinc-700 bg-zinc-950'
                          }`}
                          autoFocus
                        />
                        <button type="submit" className="p-0.5 text-zinc-400 hover:text-indigo-400">
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(null);
                          }}
                          className="p-0.5 text-zinc-400 hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate flex-1 pr-4">
                          <span className="text-zinc-500 group-hover:text-zinc-400 select-none">
                            {isKidMode ? '🖍️' : '📄'}
                          </span>
                          <div className="truncate flex flex-col text-left">
                            <span className="truncate text-zinc-200 font-medium">{canvas.title}</span>
                            {canvas.chatId ? (
                              <span className="text-[9px] text-zinc-500 truncate font-mono">Linked to room</span>
                            ) : (
                              <span className="text-[9px] text-amber-500/80 truncate font-mono font-semibold">Detached</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`rename-canvas-btn-${canvas.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(canvas.id);
                              setEditTitle(canvas.title);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                            title="Rename"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            id={`delete-canvas-btn-${canvas.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCanvas(canvas.id);
                            }}
                            className="rounded p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400"
                            title="Delete"
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

      {/* Sidebar Footer */}
      <div className={`p-3.5 border-t bg-zinc-950/80 flex flex-col gap-2 ${isKidMode ? `${currentKidTheme.sidebarBorder} ${currentKidTheme.sidebarHeaderBg}` : 'border-zinc-900'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Cpu className={`h-4 w-4 ${demoMode ? 'text-amber-400' : status.connected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
              <span className={`absolute -bottom-0.5 -right-0.5 block h-1.5 w-1.5 rounded-full ring-1 ring-zinc-950 ${
                demoMode ? 'bg-amber-400' : status.connected ? 'bg-emerald-400' : 'bg-rose-500'
              }`} />
            </div>

            <div className="truncate flex flex-col text-left">
              <span className="text-[10px] font-bold text-zinc-300">
                {demoMode ? isKidMode ? 'Safe Sandbox 🛡️' : 'Demo Server' : 'Ollama Server'}
              </span>
              <span className="text-[9px] text-zinc-500 truncate font-mono">
                {demoMode ? 'Local Simulation' : status.url.replace(/^https?:\/\//, '')}
              </span>
            </div>
          </div>

          <button
            id="settings-trigger-btn"
            onClick={onOpenSettings}
            className={`rounded-xl p-2 border transition cursor-pointer ${
              isKidMode 
                ? `${currentKidTheme.buttonAccent} shadow-md shadow-black/20` 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-indigo-400'
            }`}
            title={isKidMode ? "Open Control Panel" : "Configure Ollama"}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
