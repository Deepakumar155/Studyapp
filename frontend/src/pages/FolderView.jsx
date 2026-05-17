import React, { useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Folder, FileText, Plus, FileEdit, Download, Trash2 } from 'lucide-react';
import api from '../services/api';
import CreateFolderModal from '../components/CreateFolderModal';
import TextEditorModal from '../components/TextEditorModal';
import ConfirmModal from '../components/ConfirmModal';
import NoteCard from '../components/NoteCard';
import NoteEditor from '../components/NoteEditor';

const FolderView = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [sortOption, setSortOption] = useState('date-desc');
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteConfirmState, setDeleteConfirmState] = useState({ isOpen: false, type: '', id: null, name: '' });

  const deleteFolderMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      navigate('/');
    }
  });

  const handleDeleteFolder = () => {
    setDeleteConfirmState({
      isOpen: true,
      type: 'folder',
      id: id,
      name: folder?.folderName || 'this folder'
    });
  };

  const { data: folder } = useQuery({
    queryKey: ['folder', id],
    queryFn: async () => {
      const { data } = await api.get(`/folders/${id}`);
      return data;
    }
  });

  const { data: subfolders } = useQuery({
    queryKey: ['folders', id],
    queryFn: async () => {
      const { data } = await api.get(`/folders?parentId=${id}`);
      return data;
    }
  });

  const { data: files } = useQuery({
    queryKey: ['files', id],
    queryFn: async () => {
      const { data } = await api.get(`/files?folderId=${id}`);
      return data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      await api.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId) => {
      await api.delete(`/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', id] });
      queryClient.invalidateQueries({ queryKey: ['allFiles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const { data: notes } = useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const { data } = await api.get(`/notes?folderId=${id}`);
      return data;
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      await api.delete(`/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const [isUploading, setIsUploading] = useState(false);

  const processAndUploadFiles = async (filesToUpload) => {
    setIsUploading(true);
    try {
      const createdFolders = {}; // Cache to store newly created folder IDs
      const uploadPromises = [];

      for (const file of filesToUpload) {
        let targetFolderId = id;
        const relativePath = file.webkitRelativePath || file.path || '';

        if (relativePath && relativePath.includes('/')) {
          const pathParts = relativePath.split('/').filter(Boolean);
          pathParts.pop(); // Remove the filename

          let currentPath = '';
          let currentParentId = id;

          for (const part of pathParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (createdFolders[currentPath]) {
              currentParentId = createdFolders[currentPath];
            } else {
              try {
                const { data } = await api.post('/folders', {
                  folderName: part,
                  parentFolder: currentParentId || null,
                  color: '#4F46E5'
                });
                createdFolders[currentPath] = data._id;
                currentParentId = data._id;
              } catch (err) {
                console.error("Folder creation error:", err);
              }
            }
          }
          targetFolderId = currentParentId;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', targetFolderId);
        
        uploadPromises.push(
          api.post('/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        );
      }

      await Promise.all(uploadPromises);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['files', id] });
      queryClient.invalidateQueries({ queryKey: ['allFiles'] });
      queryClient.invalidateQueries({ queryKey: ['folders', id] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFolder = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/folders/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${folder?.folderName || 'folder'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const sortedFiles = useMemo(() => {
    if (!files) return [];
    return [...files].sort((a, b) => {
      if (sortOption === 'name-asc') return a.title.localeCompare(b.title);
      if (sortOption === 'name-desc') return b.title.localeCompare(a.title);
      if (sortOption === 'size-asc') return (a.size || 0) - (b.size || 0);
      if (sortOption === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (sortOption === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortOption === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  }, [files, sortOption]);

  const onDrop = useCallback((acceptedFiles) => {
    processAndUploadFiles(acceptedFiles);
  }, [id, uploadMutation]);

  const handleFolderSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndUploadFiles(Array.from(e.target.files));
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    noClick: true
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden page-transition">
        
        <header className="p-4 md:p-8 pt-20 md:pt-8 border-b border-dark-border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Folder size={32} style={{ color: folder?.color || '#4F46E5' }} />
            <div>
              <h1 className="text-2xl font-bold text-white">{folder?.folderName || 'Loading...'}</h1>
              <p className="text-dark-subtext text-sm">
                Manage files and notes for this subject • {files?.length || 0} {files?.length === 1 ? 'file' : 'files'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button 
              onClick={handleDownloadFolder}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-dark-border disabled:opacity-50 text-sm md:text-base flex-1 sm:flex-none justify-center"
            >
              <Download size={18} />
              <span>{isDownloading ? 'Downloading...' : 'Download Folder'}</span>
            </button>
            <button 
              onClick={() => setIsTextEditorOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-primary-500/20 text-sm md:text-base flex-1 sm:flex-none justify-center"
            >
              <FileEdit size={18} />
              <span>New File</span>
            </button>
            <button 
              onClick={() => {
                setSelectedNote(null);
                setIsNoteEditorOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-cyan-500/20 text-sm md:text-base flex-1 sm:flex-none justify-center"
            >
              <FileEdit size={18} />
              <span>New Note</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-dark-border text-sm md:text-base flex-1 sm:flex-none justify-center"
            >
              <Plus size={18} />
              <span>New Subfolder</span>
            </button>
            <button 
              onClick={handleDeleteFolder}
              disabled={deleteFolderMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors border border-red-500/20 text-sm md:text-base flex-1 sm:flex-none justify-center disabled:opacity-50"
              title="Delete Folder"
            >
              <Trash2 size={18} />
              <span>{deleteFolderMutation.isPending ? 'Deleting...' : 'Delete Folder'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-8 mb-8 text-center transition-colors cursor-pointer ${
              isDragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-border hover:border-primary-500/50 bg-dark-card/30'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto text-dark-subtext mb-3" size={40} />
            <p className="text-dark-subtext font-medium mb-4">
              {isDragActive ? "Drop files here..." : "Drag & drop files or folders here"}
            </p>
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={open}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-dark-border text-sm"
              >
                Select Files
              </button>
              
              <label className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors text-sm cursor-pointer">
                Select Folder
                <input 
                  type="file" 
                  webkitdirectory="true" 
                  directory="true" 
                  multiple 
                  onChange={handleFolderSelect} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {subfolders && subfolders.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Folder size={18} className="text-primary-400" /> Subfolders
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {subfolders.map(sub => (
                  <Link 
                    key={sub._id} 
                    to={`/folder/${sub._id}`}
                    className="glass-card hover:-translate-y-1 transition-transform cursor-pointer flex flex-col items-start gap-1 p-4"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Folder size={24} style={{ color: sub.color }} className="shrink-0" />
                      <span className="font-medium text-white truncate">{sub.folderName}</span>
                    </div>
                    <span className="text-xs text-dark-subtext pl-9">
                      {sub.fileCount || 0} {sub.fileCount === 1 ? 'file' : 'files'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileEdit size={18} className="text-cyan-400" /> Rich Study Notes
              </h2>
              <button 
                onClick={() => {
                  setSelectedNote(null);
                  setIsNoteEditorOpen(true);
                }}
                className="text-xs px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-lg transition-colors border border-cyan-500/20 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>New Note</span>
              </button>
            </div>

            {notes && notes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {notes.map(note => (
                  <NoteCard 
                    key={note._id} 
                    note={note} 
                    onEdit={(n) => {
                      setSelectedNote(n);
                      setIsNoteEditorOpen(true);
                    }}
                    onDelete={(nid) => {
                      setDeleteConfirmState({
                        isOpen: true,
                        type: 'note',
                        id: nid,
                        name: note.title
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-subtext glass-card text-sm">
                No rich text notes created yet. Click "New Note" to start writing!
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText size={18} className="text-primary-400" /> Files
              </h2>
              <select 
                value={sortOption} 
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-dark-card border border-dark-border text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>
            </div>
            
            {sortedFiles?.length === 0 ? (
              <div className="text-center py-10 text-dark-subtext glass-card">
                No files uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sortedFiles?.map(file => (
                  <FileCard 
                    key={file._id} 
                    file={file} 
                    onDelete={(fid) => {
                      const fileObj = files?.find(f => f._id === fid);
                      setDeleteConfirmState({
                        isOpen: true,
                        type: 'file',
                        id: fid,
                        name: fileObj?.title || 'this file'
                      });
                    }} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <CreateFolderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} parentId={id} />
      <TextEditorModal isOpen={isTextEditorOpen} onClose={() => setIsTextEditorOpen(false)} folderId={id} />
      <NoteEditor isOpen={isNoteEditorOpen} onClose={() => setIsNoteEditorOpen(false)} folderId={id} existingNote={selectedNote} />
      
      {isUploading && (
        <div className="fixed inset-0 bg-dark-bg/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="glass-card max-w-sm w-full flex flex-col items-center text-center shadow-2xl border border-primary-500/20 p-8">
            <div className="relative mb-6">
              {/* Spinning outer ring */}
              <div className="w-16 h-16 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
              {/* Centered bouncing upload icon */}
              <div className="absolute inset-0 flex items-center justify-center text-primary-400">
                <UploadCloud size={24} className="animate-bounce" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Uploading folder contents</h3>
            <p className="text-dark-subtext text-sm">
              Please wait while your files are being processed and securely stored...
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (deleteConfirmState.type === 'folder') {
            deleteFolderMutation.mutate();
          } else if (deleteConfirmState.type === 'note') {
            deleteNoteMutation.mutate(deleteConfirmState.id);
          } else {
            deleteMutation.mutate(deleteConfirmState.id);
          }
        }}
        title={
          deleteConfirmState.type === 'folder' 
            ? 'Delete Subject Folder' 
            : deleteConfirmState.type === 'note'
            ? 'Delete Study Note'
            : 'Delete File'
        }
        message={
          deleteConfirmState.type === 'folder'
            ? `Are you sure you want to delete the folder "${deleteConfirmState.name}"? All subfolders, files, and notes inside it will be permanently deleted from database and local disk.`
            : deleteConfirmState.type === 'note'
            ? `Are you sure you want to delete the rich study note "${deleteConfirmState.name}"? This action cannot be undone.`
            : `Are you sure you want to permanently delete the file "${deleteConfirmState.name}"? This action cannot be undone.`
        }
        confirmText={
          deleteConfirmState.type === 'folder' 
            ? 'Delete Folder' 
            : deleteConfirmState.type === 'note'
            ? 'Delete Note'
            : 'Delete File'
        }
      />
    </div>
  );
};

export default FolderView;
