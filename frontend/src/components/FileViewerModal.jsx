import React from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FileViewerModal = ({ file, onClose }) => {
  if (!file) return null;

  const fileUrl = `https://personalstudyapp.onrender.com/uploads/${file.filename}`;
  const isImage = file.fileType.includes('image');
  const isPdf = file.fileType.includes('pdf');
  const isVideo = file.fileType.includes('video');

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div 
          className="bg-dark-card border border-dark-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-bg/50">
            <h2 className="text-lg font-semibold text-white truncate max-w-[70%]">{file.title}</h2>
            <div className="flex items-center gap-3">
              <a 
                href={fileUrl} 
                download
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/20 text-primary-400 hover:bg-primary-600/40 rounded-lg transition-colors text-sm font-medium"
              >
                <Download size={16} />
                Download
              </a>
              <button 
                onClick={onClose} 
                className="p-1.5 text-dark-subtext hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-dark-bg overflow-auto flex items-center justify-center p-4">
            {isImage ? (
              <img src={fileUrl} alt={file.title} className="max-w-full max-h-full object-contain rounded-lg" />
            ) : isPdf ? (
              <iframe src={fileUrl} className="w-full h-full rounded-lg" title={file.title} />
            ) : isVideo ? (
              <video src={fileUrl} controls className="max-w-full max-h-full rounded-lg" />
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Download size={32} className="text-dark-subtext" />
                </div>
                <p className="text-white font-medium mb-2">Preview not available</p>
                <p className="text-dark-subtext text-sm mb-6">This file type cannot be previewed in the browser.</p>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors inline-block"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FileViewerModal;
