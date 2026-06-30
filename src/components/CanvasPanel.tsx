import React, { useState, useEffect } from 'react';
import { X, Edit3, Eye, Trash2, Save } from 'lucide-react';
import { Canvas } from '../types';

interface CanvasPanelProps {
  canvas: Canvas | null;
  onClose: () => void;
  onUpdateCanvas: (id: string, updates: Partial<Canvas>) => void;
  onDeleteCanvas: (id: string) => void;
  
  // Custom kid prop
  isKidMode?: boolean;
}

export default function CanvasPanel({
  canvas,
  onClose,
  onUpdateCanvas,
  onDeleteCanvas,
  isKidMode = false,
}: CanvasPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Sync state with active canvas prop changes
  useEffect(() => {
    if (canvas) {
      setTitle(canvas.title);
      setContent(canvas.content);
      setIsEditing(false); // Default to preview/read mode
    }
  }, [canvas]);

  if (!canvas) return null;

  const handleSave = () => {
    if (title.trim()) {
      onUpdateCanvas(canvas.id, {
        title: title.trim(),
        content,
      });
      setIsEditing(false);
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== canvas.title) {
      onUpdateCanvas(canvas.id, { title: title.trim() });
    }
  };

  return (
    <div 
      id="canvas-side-panel"
      className={`w-full lg:w-[480px] xl:w-[560px] h-screen border-l flex flex-col shrink-0 shadow-2xl relative animate-in slide-in-from-right duration-200 ${
        isKidMode
          ? 'bg-pink-950 border-pink-850 text-white font-sans'
          : 'bg-zinc-950 border-zinc-900 text-zinc-100'
      }`}
    >
      {/* Panel Header */}
      <div className={`p-4 border-b flex items-center justify-between gap-4 ${isKidMode ? 'border-pink-850 bg-pink-900/20' : 'border-zinc-900 bg-zinc-950/80'}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl">🎨</span>
          <input
            id="canvas-panel-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder={isKidMode ? "My Wonderful Board" : "Untitled Document"}
            className={`bg-transparent border-b border-transparent focus:outline-none px-1 py-0.5 text-sm font-black flex-1 truncate transition ${
              isKidMode 
                ? 'hover:border-pink-500 focus:border-pink-400 text-pink-100' 
                : 'hover:border-zinc-800 focus:border-indigo-500 text-white'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="canvas-panel-toggle-edit"
            onClick={() => setIsEditing(!isEditing)}
            className={`rounded-xl p-2 border transition cursor-pointer ${
              isEditing 
                ? isKidMode 
                  ? 'bg-pink-500 border-pink-400 text-white' 
                  : 'bg-indigo-600/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-600/20' 
                : isKidMode
                  ? 'bg-pink-900 border-pink-800 text-pink-200 hover:text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-750'
            }`}
            title={isEditing ? isKidMode ? 'Show Story' : 'Switch to Preview' : isKidMode ? 'Edit Story' : 'Edit Canvas'}
          >
            {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          </button>

          <button
            id="canvas-panel-delete"
            onClick={() => {
              if (confirm(isKidMode ? 'Are you sure you want to delete this drawing board?' : 'Are you sure you want to delete this canvas?')) {
                onDeleteCanvas(canvas.id);
              }
            }}
            className={`rounded-xl p-2 border transition cursor-pointer ${
              isKidMode
                ? 'bg-pink-900 border-pink-800 hover:bg-pink-850 hover:text-rose-400 text-pink-300'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 hover:text-rose-400 text-zinc-400'
            }`}
            title="Delete Board"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            id="canvas-panel-close"
            onClick={onClose}
            className={`rounded-xl p-2 transition cursor-pointer ${
              isKidMode ? 'hover:bg-pink-800 text-pink-300' : 'hover:bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
            title="Close Panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className={`flex-1 overflow-y-auto p-6 ${isKidMode ? 'bg-pink-950/10' : 'bg-zinc-950/20'}`}>
        {isEditing ? (
          <textarea
            id="canvas-panel-content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isKidMode ? "Write your fun story or list items here..." : "Type canvas content here..."}
            className={`w-full h-full min-h-[400px] resize-none bg-transparent placeholder-zinc-600 text-xs md:text-sm leading-relaxed focus:outline-none ${
              isKidMode ? 'text-pink-100 font-sans' : 'text-zinc-200 font-mono'
            }`}
            autoFocus
          />
        ) : (
          <div className={`prose prose-invert max-w-none space-y-4 text-xs md:text-sm ${
            isKidMode ? 'text-pink-100 font-sans selection:bg-pink-500/30' : 'text-zinc-300 font-sans selection:bg-indigo-500/30'
          }`}>
            {content ? (
              content.split('\n\n').map((para, i) => {
                // Detect lists
                if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
                  return (
                    <ul key={i} className={`list-disc pl-5 space-y-1.5 my-3 ${isKidMode ? 'marker:text-pink-400' : ''}`}>
                      {para.split('\n').map((li, j) => (
                        <li key={j} className="leading-relaxed">
                          {li.replace(/^[-*]\s+/, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }
                
                // Render code blocks or highlights nicely
                if (para.trim().startsWith('```')) {
                  const lines = para.split('\n');
                  const codeText = lines.slice(1, -1).join('\n');
                  return (
                    <pre key={i} className={`p-4 rounded-xl border font-mono text-xs overflow-x-auto my-3 ${
                      isKidMode 
                        ? 'bg-pink-900/50 border-pink-800 text-pink-100' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                    }`}>
                      <code>{codeText}</code>
                    </pre>
                  );
                }

                return (
                  <p key={i} className="leading-relaxed whitespace-pre-wrap">
                    {para}
                  </p>
                );
              })
            ) : (
              <p className={`italic text-center py-12 ${isKidMode ? 'text-pink-400' : 'text-zinc-600'}`}>
                {isKidMode ? 'Draw or write something amazing with your AI buddy! 🐾🌟' : 'No content. Start editing to write content!'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      {isEditing && (
        <div className={`p-4 border-t flex justify-end gap-2 ${isKidMode ? 'border-pink-850 bg-pink-900/10' : 'border-zinc-900 bg-zinc-950/40'}`}>
          <button
            id="canvas-panel-cancel-edit"
            onClick={() => {
              setContent(canvas.content);
              setIsEditing(false);
            }}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition cursor-pointer ${
              isKidMode
                ? 'bg-pink-900 border-pink-800 hover:bg-pink-850 text-pink-200'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
            }`}
          >
            {isKidMode ? 'Cancel' : 'Cancel'}
          </button>
          <button
            id="canvas-panel-save"
            onClick={handleSave}
            className={`rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
              isKidMode
                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-950/20'
                : 'bg-indigo-600 hover:bg-indigo-550 text-white'
            }`}
          >
            <Save className="h-3.5 w-3.5" />
            {isKidMode ? 'Save Story' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
