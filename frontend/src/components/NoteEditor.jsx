import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Code } from 'lucide-react';
import api from '../services/api';

const NoteEditor = ({ isOpen, onClose, folderId, existingNote = null }) => {
  const [title, setTitle] = useState('');
  const editorRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      if (existingNote) {
        setTitle(existingNote.title);
        // Wait a short tick for the DOM ref to bind
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = existingNote.content || '';
          }
        }, 50);
      } else {
        setTitle('Untitled Note');
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = '';
          }
        }, 50);
      }
    }
  }, [existingNote, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = editorRef.current ? editorRef.current.innerHTML : '';
      if (existingNote) {
        await api.put(`/notes/${existingNote._id}`, { title, content });
      } else {
        await api.post('/notes', { title, content, folderId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', folderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      onClose();
    }
  });

  if (!isOpen) return null;

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-bg/50">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-xl font-bold text-white focus:outline-none w-1/2 border-b border-transparent focus:border-cyan-500 pb-1 transition-colors"
            placeholder="Note Title..."
          />
          <div className="flex items-center gap-3">
            <button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-primary-600 hover:from-cyan-500 hover:to-primary-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 shadow-lg shadow-cyan-500/10"
            >
              <Save size={18} />
              {saveMutation.isPending ? 'Saving...' : 'Save Note'}
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-dark-subtext hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* WYSIWYG Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-3 border-b border-dark-border bg-dark-card/50">
          <button 
            type="button"
            onClick={() => execCommand('bold')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button 
            type="button"
            onClick={() => execCommand('italic')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <div className="w-[1px] h-5 bg-dark-border mx-1" />
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', '<h1>')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', '<h2>')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <div className="w-[1px] h-5 bg-dark-border mx-1" />
          <button 
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', '<pre>')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Code Block"
          >
            <Code size={16} />
          </button>
          <div className="w-[1px] h-5 bg-dark-border mx-1" />
          <button 
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button 
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button 
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors"
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 bg-dark-bg p-6 overflow-y-auto outline-none">
          <div 
            ref={editorRef}
            contentEditable
            className="w-full h-full text-white prose prose-invert max-w-none outline-none focus:outline-none min-h-[300px] text-base"
            placeholder="Write something awesome..."
            style={{ minHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
