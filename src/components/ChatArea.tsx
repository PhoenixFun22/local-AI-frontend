import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Cpu, Copy, Check, Sparkles, MessageSquare, ArrowRight, CornerDownLeft, AlertCircle, Edit2, Trash2, RotateCw } from 'lucide-react';
import { Chat, Message } from '../types';
import { splitMessageContent } from '../utils/canvasParser';

interface ChatAreaProps {
  chat: Chat | null;
  selectedModel: string;
  onSendPrompt: (prompt: string) => void;
  isGenerating: boolean;
  onOpenSettings: () => void;
  demoMode: boolean;
  modelsCount: number;
  onOpenCanvas: (title: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onRerunMessage: (messageId: string) => void;
}

// Clean formatting helper to safely render basic markdown structures
function FormattedMessage({ content, onOpenCanvas }: { content: string; onOpenCanvas: (title: string) => void }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content) return null;

  // Split by Canvas Macro using the balanced bracket parser
  const canvasParts = splitMessageContent(content);

  return (
    <div className="space-y-3 leading-relaxed text-[13px] md:text-sm text-zinc-200">
      {canvasParts.map((part, canvasIndex) => {
        if (part.type === 'canvas') {
          const isEdit = part.command && part.command !== 'create';
          const title = part.title || 'Untitled Canvas';
          
          let actionLabel = 'Created new canvas';
          if (part.command === 'edit') actionLabel = 'Canvas updated';
          else if (part.command === 'append') actionLabel = 'Appended to canvas';

          return (
            <div 
              key={`canvas-${canvasIndex}`} 
              onClick={() => onOpenCanvas(title.trim())}
              className="my-2 p-2.5 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/30 hover:border-indigo-500/30 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm max-w-sm inline-flex w-full select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <span className="text-xs">🎨</span>
                </div>
                <div className="min-w-0 flex flex-col text-left">
                  <span className="text-[11px] font-semibold text-zinc-200 truncate group-hover:text-indigo-300 transition font-sans">{title.trim()}</span>
                  <span className="text-[9px] text-zinc-500 truncate font-mono">
                    {actionLabel}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-zinc-500 group-hover:text-indigo-400 transition font-semibold">Open</span>
                <span className="text-[10px] text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all font-bold">&rarr;</span>
              </div>
            </div>
          );
        }

        const textPart = part.content;

        // Split by code blocks for the text portion
        const parts = textPart.split(/(```[\s\S]*?```)/g);

        return (
          <React.Fragment key={`text-block-${canvasIndex}`}>
            {parts.map((subPartString, index) => {
              const isCodeBlock = subPartString.startsWith('```') && subPartString.endsWith('```');

              if (isCodeBlock) {
                const match = subPartString.match(/```(\w*)\n([\s\S]*?)```/);
                const lang = match ? match[1] : '';
                const code = match ? match[2] : subPartString.slice(3, -3);

                return (
                  <div 
                    key={index} 
                    className="my-3 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs shadow-md"
                  >
                    <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-2 border-b border-zinc-800/80 text-[10px] text-zinc-400 uppercase font-semibold tracking-wider select-none">
                      <span>{lang || 'code'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(code, index);
                        }}
                        className="flex items-center gap-1 hover:text-white transition px-1.5 py-0.5 rounded hover:bg-zinc-800/60"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-zinc-300 leading-normal whitespace-pre">
                      <code>{code.trim()}</code>
                    </pre>
                  </div>
                );
              }

              const inlineParts = subPartString.split(/(`[^`]+`)/g);

              return (
                <p key={index} className="whitespace-pre-line leading-relaxed mb-3 last:mb-0">
                  {inlineParts.map((subPart, subIndex) => {
                    const isInlineCode = subPart.startsWith('`') && subPart.endsWith('`');
                    if (isInlineCode) {
                      return (
                        <code 
                          key={subIndex} 
                          className="mx-0.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[12px] text-indigo-300 border border-zinc-700/30"
                        >
                          {subPart.slice(1, -1)}
                        </code>
                      );
                    }

                    const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g);
                    return boldParts.map((boldPart, boldIndex) => {
                      const isBold = boldPart.startsWith('**') && boldPart.endsWith('**');
                      if (isBold) {
                        return (
                          <strong key={boldIndex} className="font-semibold text-white">
                            {boldPart.slice(2, -2)}
                          </strong>
                        );
                      }
                      return boldPart;
                    });
                  })}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const STARTER_PROMPTS = [
  {
    title: 'Explain Rayleigh scattering',
    desc: 'Why is the sky blue?',
    prompt: 'Why is the sky blue? Break it down step-by-step.',
  },
  {
    title: 'Write a TypeScript helper',
    desc: 'Create a clean debounce function',
    prompt: 'Write a typescript debounce helper function and explain how to use it.',
  },
  {
    title: 'Write a Fibonacci sequence',
    desc: 'Implement in JS or Python',
    prompt: 'Can you show me a function to calculate the fibonacci sequence up to N terms in TypeScript?',
  },
  {
    title: 'What are you capable of?',
    desc: 'Discover features and helper utilities',
    prompt: 'What are you capable of? What kind of software development or writing tasks do you do best?',
  },
];

export default function ChatArea({
  chat,
  selectedModel,
  onSendPrompt,
  isGenerating,
  onOpenSettings,
  demoMode,
  modelsCount,
  onOpenCanvas,
  onEditMessage,
  onDeleteMessage,
  onRerunMessage,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Auto-scroll on new message chunks or completions
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages, isGenerating]);

  // Welcome state rendering
  if (!chat || chat.messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 flex items-center justify-center bg-zinc-900/20">
        <div className="max-w-2xl w-full text-center space-y-8 select-none">
          
          {/* Main Title Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-xs text-indigo-300">
            {demoMode ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <Cpu className="h-3.5 w-3.5" />
            )}
            <span>
              {demoMode ? 'Virtual Sandbox Mode Activated' : 'Local Ollama Client Active'}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-sans">
              Ollama Model Interface
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
              Interact directly with offline LLMs running on your local machine. Fully private, lightning-fast inference, zero cloud dependencies.
            </p>
          </div>

          {/* Model Status Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 max-w-md mx-auto space-y-3">
            <div className="flex items-center gap-3 justify-center text-left">
              <div className="rounded-xl bg-zinc-900 p-2 border border-zinc-800">
                <Bot className={`h-6 w-6 ${demoMode ? 'text-amber-400' : 'text-indigo-400'}`} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active Generation Model</p>
                <p className="text-sm font-semibold text-zinc-100 truncate max-w-[200px]">
                  {selectedModel || (demoMode ? 'Simulating models...' : 'No model selected')}
                </p>
              </div>
            </div>

            {!demoMode && modelsCount === 0 && (
              <div className="pt-2 text-left">
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">No Ollama Models Found</span>
                    We couldn't detect any installed models. Pull model names like <strong>llama3</strong>, <strong>mistral</strong>, or <strong>gemma</strong> to start chatting.
                  </div>
                </div>
                <button
                  id="open-settings-from-warning"
                  onClick={onOpenSettings}
                  className="w-full mt-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-semibold text-white transition active:scale-98 cursor-pointer"
                >
                  Manage Models & Configuration
                </button>
              </div>
            )}
          </div>

          {/* Suggestions Grid */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested Prompts</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {STARTER_PROMPTS.map((starter, i) => (
                <button
                  key={i}
                  id={`starter-prompt-${i}`}
                  onClick={() => onSendPrompt(starter.prompt)}
                  className="group rounded-xl border border-zinc-800 bg-zinc-950/40 p-3.5 hover:bg-zinc-900/40 hover:border-zinc-700 transition cursor-pointer text-left flex flex-col justify-between h-24"
                >
                  <div>
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition">{starter.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{starter.desc}</p>
                  </div>
                  <div className="flex items-center justify-end w-full">
                    <span className="rounded-full bg-zinc-900 p-1 group-hover:bg-indigo-600/10 text-zinc-500 group-hover:text-indigo-400 transition">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div 
      id="chat-messages-container"
      ref={scrollRef} 
      className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scroll-smooth bg-zinc-950/20"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {chat.messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEditing = editingMessageId === msg.id;
          
          return (
            <div 
              key={msg.id}
              id={`message-bubble-${msg.id}`}
              className={`flex gap-4 items-start ${isUser ? 'flex-row-reverse' : ''} group/msg animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {/* Profile Avatar */}
              <div className={`rounded-xl p-2 shrink-0 border select-none ${
                isUser 
                  ? 'bg-zinc-800 border-zinc-700' 
                  : 'bg-indigo-600/10 border-indigo-500/25'
              }`}>
                {isUser ? (
                  <User className="h-4 w-4 text-zinc-300" />
                ) : (
                  <Bot className="h-4 w-4 text-indigo-400" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div className="flex flex-col max-w-[85%] space-y-1">
                {/* Meta details (sender name and dynamic model label) */}
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 tracking-wide select-none ${isUser ? 'justify-end' : ''}`}>
                  <span>{isUser ? 'You' : chat.model}</span>
                  {!isUser && (
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-[9px] px-1 py-0.2 rounded font-normal uppercase">Ollama</span>
                  )}
                </div>

                {/* Bubble content row with inline hover actions */}
                <div className={`relative flex items-center gap-2 group/bubble ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Content card */}
                  <div className={`rounded-2xl px-4 py-3 border shadow-xs max-w-full ${
                    isUser 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-none' 
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-200 rounded-tl-none'
                  }`}>
                    {isEditing ? (
                      <div className="flex flex-col gap-2 w-full min-w-[280px] sm:min-w-[400px]">
                        <textarea
                          id={`edit-message-textarea-${msg.id}`}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/80 font-mono focus:ring-1 focus:ring-indigo-500/30 min-h-[80px]"
                          rows={Math.max(3, editContent.split('\n').length)}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 text-[10px]">
                          <button
                            id={`cancel-edit-${msg.id}`}
                            onClick={() => setEditingMessageId(null)}
                            className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            id={`save-edit-${msg.id}`}
                            onClick={() => {
                              if (editContent.trim()) {
                                onEditMessage(msg.id, editContent);
                              }
                              setEditingMessageId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <FormattedMessage content={msg.content} onOpenCanvas={onOpenCanvas} />
                    )}
                  </div>

                  {/* Message Actions (Edit & Delete) on Hover */}
                  {!isEditing && (
                    <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 flex items-center gap-1 shrink-0 self-center">
                      <button
                        id={`edit-msg-btn-${msg.id}`}
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditContent(msg.content);
                        }}
                        className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700/80 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                        title="Edit Message"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-msg-btn-${msg.id}`}
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this message?')) {
                            onDeleteMessage(msg.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900/60 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Actions (Copy/Rerun) below bubble */}
                <div className={`flex items-center gap-3 pt-1 text-[10px] text-zinc-500 font-semibold select-none ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {isUser ? (
                    <button
                      id={`copy-prompt-btn-${msg.id}`}
                      type="button"
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="flex items-center gap-1 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Copy User Prompt"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        id={`copy-response-btn-${msg.id}`}
                        type="button"
                        onClick={() => handleCopyMessage(msg.content, msg.id)}
                        className="flex items-center gap-1 hover:text-zinc-300 transition-colors cursor-pointer"
                        title="Copy Assistant Response"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Response</span>
                          </>
                        )}
                      </button>
                      {!isGenerating && (
                        <button
                          id={`rerun-response-btn-${msg.id}`}
                          type="button"
                          onClick={() => onRerunMessage(msg.id)}
                          className="flex items-center gap-1 hover:text-zinc-300 transition-colors cursor-pointer"
                          title="Rerun from this point"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>Rerun</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Dynamic streaming state loader */}
        {isGenerating && (
          <div className="flex gap-4 items-start animate-pulse">
            <div className="rounded-xl p-2 shrink-0 border bg-indigo-600/10 border-indigo-500/25">
              <Bot className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex flex-col max-w-[85%] space-y-1">
              <div className="text-[11px] font-semibold text-zinc-500 tracking-wide select-none">
                <span>{chat.model}</span>
                <span className="ml-1.5 text-indigo-400 font-normal">generating...</span>
              </div>
              <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-zinc-950/40 border border-zinc-900 text-zinc-200 shadow-xs flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce duration-1000" />
                <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s] duration-1000" />
                <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s] duration-1000" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
