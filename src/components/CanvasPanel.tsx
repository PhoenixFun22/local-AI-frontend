import React, { useState, useEffect } from 'react';
import { X, Edit3, Eye, Trash2, Save, FileText } from 'lucide-react';
import { Canvas } from '../types';

interface CanvasPanelProps {
  canvas: Canvas | null;
  onClose: () => void;
  onUpdateCanvas: (id: string, updates: Partial<Canvas>) => void;
  onDeleteCanvas: (id: string) => void;
}

export default function CanvasPanel({
  canvas,
  onClose,
  onUpdateCanvas,
  onDeleteCanvas,
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
      className="w-full lg:w-[480px] xl:w-[560px] h-screen bg-zinc-950 border-l border-zinc-900 flex flex-col shrink-0 text-zinc-100 shadow-2xl relative animate-in slide-in-from-right duration-200"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl">🎨</span>
          <input
            id="canvas-panel-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Untitled Document"
            className="bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-indigo-500 px-1 py-0.5 text-sm font-bold text-white focus:outline-none flex-1 truncate transition"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="canvas-panel-toggle-edit"
            onClick={() => setIsEditing(!isEditing)}
            className={`rounded-lg p-2 border transition ${
              isEditing 
                ? 'bg-indigo-600/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-600/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
            title={isEditing ? 'Switch to Preview' : 'Edit Canvas'}
          >
            {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          </button>

          <button
            id="canvas-panel-delete"
            onClick={() => {
              if (confirm('Are you sure you want to delete this canvas?')) {
                onDeleteCanvas(canvas.id);
              }
            }}
            className="rounded-lg p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 hover:text-rose-400 text-zinc-400 transition"
            title="Delete Canvas"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            id="canvas-panel-close"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white transition"
            title="Close Canvas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/20">
        {isEditing ? (
          <textarea
            id="canvas-panel-content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type canvas content here..."
            className="w-full h-full min-h-[400px] resize-none bg-transparent text-zinc-200 placeholder-zinc-600 font-mono text-xs md:text-sm leading-relaxed focus:outline-none"
            autoFocus
          />
        ) : (
          <div className="prose prose-invert max-w-none text-zinc-300 space-y-4 text-xs md:text-sm font-sans selection:bg-indigo-500/30">
            {content ? (
              content.split('\n\n').map((para, i) => {
                // Render paragraphs beautifully, detecting simple list items
                if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
                  return (
                    <ul key={i} className="list-disc pl-5 space-y-1.5 my-3">
                      {para.split('\n').map((li, j) => (
                        <li key={j} className="leading-relaxed">
                          {li.replace(/^[-*]\s+/, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }
                
                // Render code blocks inside canvas content nicely
                if (para.trim().startsWith('```')) {
                  const lines = para.split('\n');
                  const codeText = lines.slice(1, -1).join('\n');
                  return (
                    <pre key={i} className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-200 overflow-x-auto my-3">
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
              <p className="italic text-zinc-600 text-center py-12">No content. Start editing to write content!</p>
            )}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      {isEditing && (
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex justify-end gap-2">
          <button
            id="canvas-panel-cancel-edit"
            onClick={() => {
              setContent(canvas.content);
              setIsEditing(false);
            }}
            className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition"
          >
            Cancel
          </button>
          <button
            id="canvas-panel-save"
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
