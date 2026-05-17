import React from 'react';
import { motion } from 'framer-motion';
import { FileEdit, Trash2, Calendar } from 'lucide-react';

const NoteCard = ({ note, onEdit, onDelete }) => {
  const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Strip HTML tags to get a clean text snippet
  const snippet = note.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card group flex flex-col p-5 relative overflow-hidden cursor-pointer hover:border-primary-500/50 transition-colors"
      onClick={() => onEdit(note)}
    >
      <div className="absolute top-3 right-3 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(note._id); }} 
          className="p-1.5 bg-dark-bg/80 rounded-md hover:bg-red-500/50 text-red-400 hover:text-white transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
          <FileEdit size={24} />
        </div>
        <h3 className="font-semibold text-white truncate pr-8" title={note.title}>{note.title}</h3>
      </div>
      
      <p className="text-dark-subtext text-sm mb-4 line-clamp-3 flex-1">
        {snippet !== '...' ? snippet : 'No content'}
      </p>
      
      <div className="flex items-center gap-2 text-xs text-dark-subtext mt-auto pt-4 border-t border-dark-border/50">
        <Calendar size={14} />
        <span>{formattedDate}</span>
      </div>
    </motion.div>
  );
};

export default NoteCard;
