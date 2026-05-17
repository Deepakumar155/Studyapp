import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import api from '../services/api';

const TextEditorModal = ({ isOpen, onClose, folderId }) => {
  const [filename, setFilename] = useState('untitled.txt');
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      await api.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', folderId] });
      queryClient.invalidateQueries({ queryKey: ['allFiles'] });
      setFilename('untitled.txt');
      setContent('');
      onClose();
    }
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (!filename.trim()) return;
    
    // Determine mime type based on extension
    let mimeType = 'text/plain';
    if (filename.endsWith('.md')) mimeType = 'text/markdown';
    if (filename.endsWith('.json')) mimeType = 'application/json';
    if (filename.endsWith('.js')) mimeType = 'text/javascript';
    if (filename.endsWith('.html')) mimeType = 'text/html';
    if (filename.endsWith('.css')) mimeType = 'text/css';

    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId || '');
    
    uploadMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-[#1e1e1e] border border-dark-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-[#333] bg-[#252526]">
          <div className="flex items-center gap-2 w-full sm:w-1/2">
            <span className="text-dark-subtext text-xs sm:text-sm shrink-0">File Name:</span>
            <input 
              type="text" 
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-[#3c3c3c] text-xs sm:text-sm text-[#cccccc] focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 w-full max-w-[200px] sm:max-w-[250px] transition-all"
              placeholder="e.g., notes.txt"
            />
          </div>
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0">
            <button 
              onClick={handleSave}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs sm:text-sm transition-colors font-medium disabled:opacity-50"
            >
              <Save size={14} />
              {uploadMutation.isPending ? 'Saving...' : 'Save File'}
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 text-dark-subtext hover:text-white bg-transparent hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#1e1e1e]">
          {/* A simple Monaco/VSCode-like textarea */}
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed custom-scrollbar"
            placeholder="// Start typing here..."
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
};

export default TextEditorModal;
