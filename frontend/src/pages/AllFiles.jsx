import React from 'react';
import Sidebar from '../components/Sidebar';
import FileCard from '../components/FileCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const AllFiles = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortOption, setSortOption] = React.useState('date-desc');
  const [deleteConfirmState, setDeleteConfirmState] = React.useState({ isOpen: false, fileId: null, fileName: '' });

  const { data: files, isLoading } = useQuery({
    queryKey: ['allFiles'],
    queryFn: async () => {
      const { data } = await api.get(`/files?all=true`);
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId) => {
      await api.delete(`/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFiles'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const filteredAndSortedFiles = React.useMemo(() => {
    let result = files || [];
    if (searchQuery) {
       result = result.filter(file => file.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [...result].sort((a, b) => {
      if (sortOption === 'name-asc') return a.title.localeCompare(b.title);
      if (sortOption === 'name-desc') return b.title.localeCompare(a.title);
      if (sortOption === 'size-asc') return (a.size || 0) - (b.size || 0);
      if (sortOption === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (sortOption === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortOption === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  }, [files, searchQuery, sortOption]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden page-transition">
        
        <header className="p-4 md:p-8 pt-20 md:pt-8 border-b border-dark-border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <FileText size={28} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">All Files</h1>
              <p className="text-dark-subtext text-sm">View and manage all your uploaded files across all folders</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-dark-card border border-dark-border text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2 w-full sm:w-auto"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
            </select>
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-card border border-dark-border rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <Search className="absolute left-3 top-2.5 text-dark-subtext" size={18} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-10 text-dark-subtext">Loading files...</div>
          ) : filteredAndSortedFiles?.length === 0 ? (
            <div className="text-center py-10 text-dark-subtext glass-card">
              {searchQuery ? "No files match your search." : "You haven't uploaded any files yet."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAndSortedFiles?.map(file => (
                <FileCard 
                  key={file._id} 
                  file={file} 
                  onDelete={(fid) => {
                    const fileObj = files?.find(f => f._id === fid);
                    setDeleteConfirmState({
                      isOpen: true,
                      fileId: fid,
                      fileName: fileObj?.title || 'this file'
                    });
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => deleteMutation.mutate(deleteConfirmState.fileId)}
        title="Delete File"
        message={`Are you sure you want to permanently delete the file "${deleteConfirmState.fileName}"? This action cannot be undone.`}
        confirmText="Delete File"
      />
    </div>
  );
};

export default AllFiles;
