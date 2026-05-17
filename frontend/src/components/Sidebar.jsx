import React, { useContext, useState, useMemo, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Folder, Home, Settings, LogOut, Plus, FileText, Menu, X, Trash2,
  ChevronDown, ChevronRight, File as FileIcon, Image as ImageIcon, Video
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CreateFolderModal from './CreateFolderModal';
import ConfirmModal from './ConfirmModal';

// Recursive Explorer Tree Item
const TreeItem = ({ item, depth = 0, activeFolderId, onToggle, isExpanded, onDeleteFolder, navigate }) => {
  const paddingLeft = `${depth * 12 + 8}px`;

  if (item.type === 'folder') {
    const expanded = !!isExpanded[item._id];
    
    return (
      <div className="w-full">
        <div 
          style={{ paddingLeft }}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-white/5 ${activeFolderId === item._id ? 'bg-primary-500/10 text-primary-400 font-semibold' : 'text-dark-subtext hover:text-white'}`}
          onClick={() => {
            onToggle(item._id);
            navigate(`/folder/${item._id}`);
          }}
        >
          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
            <span className="shrink-0 text-dark-subtext/40 group-hover:text-white/60 p-0.5">
              {expanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </span>
            <Folder size={14} style={{ color: item.color }} className="shrink-0" />
            <span className="truncate">{item.folderName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.fileCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-dark-subtext group-hover:bg-white/15 group-hover:text-white transition-all shrink-0">
                {item.fileCount}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(e, item._id, item.folderName);
              }}
              className="p-1 text-dark-subtext hover:text-red-400 rounded-md transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
              title="Delete Folder"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {expanded && item.children && item.children.length > 0 && (
          <div className="mt-0.5">
            {item.children.map(child => (
              <TreeItem 
                key={child._id} 
                item={child} 
                depth={depth + 1} 
                activeFolderId={activeFolderId}
                onToggle={onToggle}
                isExpanded={isExpanded}
                onDeleteFolder={onDeleteFolder}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    const getFileIcon = (fileType) => {
      if (fileType.includes('image')) return <ImageIcon size={12} className="text-blue-400 shrink-0" />;
      if (fileType.includes('pdf')) return <FileText size={12} className="text-red-400 shrink-0" />;
      if (fileType.includes('video')) return <Video size={12} className="text-purple-400 shrink-0" />;
      return <FileIcon size={12} className="text-gray-400 shrink-0" />;
    };

    const getBaseUrl = () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      return apiUrl.replace('/api', '');
    };

    const handleFileClick = (e) => {
      e.stopPropagation();
      window.open(`${getBaseUrl()}${item.fileUrl}`, '_blank', 'noreferrer');
    };

    return (
      <div 
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
        className="flex items-center justify-between py-1 pr-2 rounded-lg text-xs text-dark-subtext/75 hover:text-white cursor-pointer hover:bg-white/5 transition-colors"
        onClick={handleFileClick}
      >
        <div className="flex items-center gap-1.5 truncate">
          {getFileIcon(item.fileType)}
          <span className="truncate">{item.title}</span>
        </div>
      </div>
    );
  }
};

// Tree Constructor
const buildTree = (foldersList = [], filesList = []) => {
  const folderMap = {};
  const rootItems = [];

  foldersList.forEach(folder => {
    folderMap[folder._id] = {
      ...folder,
      type: 'folder',
      children: []
    };
  });

  foldersList.forEach(folder => {
    const mapped = folderMap[folder._id];
    if (folder.parentFolder && folderMap[folder.parentFolder]) {
      folderMap[folder.parentFolder].children.push(mapped);
    } else if (!folder.parentFolder) {
      rootItems.push(mapped);
    }
  });

  filesList.forEach(file => {
    const mappedFile = {
      ...file,
      type: 'file'
    };
    if (file.folderId && folderMap[file.folderId]) {
      folderMap[file.folderId].children.push(mappedFile);
    } else if (!file.folderId) {
      rootItems.push(mappedFile);
    }
  });

  const sortTree = (items) => {
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      const nameA = a.type === 'folder' ? a.folderName : a.title;
      const nameB = b.type === 'folder' ? b.folderName : b.title;
      return nameA.localeCompare(nameB);
    });
    items.forEach(item => {
      if (item.type === 'folder' && item.children) {
        sortTree(item.children);
      }
    });
  };

  sortTree(rootItems);
  return rootItems;
};

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState({});
  const [deleteConfirmState, setDeleteConfirmState] = useState({ isOpen: false, folderId: null, folderName: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const activeFolderId = window.location.pathname.startsWith('/folder/') 
    ? window.location.pathname.split('/folder/')[1] 
    : null;

  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data } = await api.get('/folders?all=true');
      return data;
    }
  });

  const { data: files } = useQuery({
    queryKey: ['allFiles'],
    queryFn: async () => {
      const { data } = await api.get('/files?all=true');
      return data;
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId) => {
      await api.delete(`/folders/${folderId}`);
      return folderId;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      if (window.location.pathname === `/folder/${deletedId}`) {
        navigate('/');
      }
    }
  });

  const handleDeleteFolder = (e, folderId, folderName) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmState({
      isOpen: true,
      folderId,
      folderName
    });
  };

  const handleToggle = (folderId) => {
    setIsExpanded(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Auto-expand parent folders when active folder changes
  useEffect(() => {
    if (activeFolderId && folders) {
      const parentIdsToExpand = [];
      let currentId = activeFolderId;
      
      while (currentId) {
        const folderObj = folders.find(f => f._id === currentId);
        if (folderObj && folderObj.parentFolder) {
          parentIdsToExpand.push(folderObj.parentFolder);
          currentId = folderObj.parentFolder;
        } else {
          break;
        }
      }

      if (parentIdsToExpand.length > 0) {
        setIsExpanded(prev => {
          const updated = { ...prev };
          parentIdsToExpand.forEach(id => {
            updated[id] = true;
          });
          return updated;
        });
      }
    }
  }, [activeFolderId, folders]);

  const treeData = useMemo(() => {
    return buildTree(folders || [], files || []);
  }, [folders, files]);

  return (
    <>
      {/* Floating Hamburger Toggle Button for Mobile */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-dark-card/80 hover:bg-dark-card border border-dark-border rounded-xl text-white hover:text-primary-400 transition-colors backdrop-blur-md shadow-lg shadow-black/20"
        title={isOpen ? "Close Menu" : "Open Menu"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop Overlay for Mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 md:relative z-40 w-64 h-screen bg-dark-card border-r border-dark-border flex flex-col page-transition shrink-0 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-400">
            StudyVault
          </h2>
        </div>

        <div className="px-4 pb-4 space-y-2">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary-500/10 text-primary-400' : 'text-dark-subtext hover:bg-white/5 hover:text-white'}`}>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/all-files" className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-dark-subtext hover:bg-white/5 hover:text-white'}`}>
            <FileText size={20} />
            <span>All Files</span>
          </NavLink>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <div className="flex items-center justify-between text-xs font-semibold text-dark-subtext uppercase tracking-wider mb-2 px-2">
            <span>Explorer</span>
            <button 
              className="hover:text-white transition-colors" 
              title="New Folder"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {treeData && treeData.length > 0 ? (
              treeData.map(item => (
                <TreeItem 
                  key={item._id} 
                  item={item} 
                  activeFolderId={activeFolderId}
                  onToggle={handleToggle}
                  isExpanded={isExpanded}
                  onDeleteFolder={handleDeleteFolder}
                  navigate={navigate}
                />
              ))
            ) : (
              <div className="text-xs text-dark-subtext/40 text-center py-4">
                No folders or files yet.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-dark-subtext hover:bg-white/5 hover:text-red-400 rounded-lg transition-colors">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
        <CreateFolderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>

      {/* Custom Deletion Modal */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => deleteFolderMutation.mutate(deleteConfirmState.folderId)}
        title="Delete Folder"
        message={`Are you sure you want to delete the folder "${deleteConfirmState.folderName}"? All nested subfolders, files, and notes inside it will be permanently deleted from local disk and database.`}
        confirmText="Delete Folder"
      />
    </>
  );
};

export default Sidebar;
