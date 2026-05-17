import React from 'react';
import { motion } from 'framer-motion';
import { FileIcon, Image as ImageIcon, FileText, Download, Trash2, Video } from 'lucide-react';

const FileCard = ({ file, onDelete }) => {
  const getIcon = () => {
    if (file.fileType.includes('image')) return <ImageIcon className="text-blue-400" size={32} />;
    if (file.fileType.includes('pdf')) return <FileText className="text-red-400" size={32} />;
    if (file.fileType.includes('video')) return <Video className="text-purple-400" size={32} />;
    return <FileIcon className="text-gray-400" size={32} />;
  };

  const getBaseUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace('/api', '');
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    window.open(`${getBaseUrl()}${file.fileUrl}`, '_blank', 'noreferrer');
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `${getBaseUrl()}${file.fileUrl}`;
    link.download = file.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card group flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      <div className="absolute top-2 right-2 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={handlePreview} className="p-1.5 bg-dark-bg/80 rounded-md hover:bg-primary-500/50 text-white transition-colors" title="Preview">
          <FileText size={14} />
        </button>
        <button onClick={handleDownload} className="p-1.5 bg-dark-bg/80 rounded-md hover:bg-green-500/50 text-green-400 hover:text-white transition-colors" title="Download">
          <Download size={14} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(file._id); }} className="p-1.5 bg-dark-bg/80 rounded-md hover:bg-red-500/50 text-red-400 hover:text-white transition-colors" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      <div 
        className="mb-3 cursor-pointer hover:scale-110 transition-transform"
        onClick={handlePreview}
      >
        {getIcon()}
      </div>
      <p 
        className="text-sm font-medium text-white text-center w-full truncate px-2 cursor-pointer hover:text-primary-400 transition-colors" 
        title={file.title}
        onClick={handlePreview}
      >
        {file.title}
      </p>
      <div className="mt-2 flex flex-col items-center">
        {file.size && (
          <p className="text-[10px] uppercase tracking-tighter text-dark-subtext font-bold">{formatBytes(file.size)}</p>
        )}
        <p className="text-[10px] text-dark-subtext/60">
          {new Date(file.createdAt).toLocaleDateString()}
        </p>
      </div>
    </motion.div>
  );
};

export default FileCard;
