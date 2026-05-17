import React from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Folder as FolderIcon, FileText, Upload, Clock } from 'lucide-react';
import api from '../services/api';

const StatCard = ({ icon: Icon, title, value, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card flex items-center gap-4"
  >
    <div className={`p-4 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-dark-subtext text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const [foldersRes, filesRes, notesRes] = await Promise.all([
        api.get('/folders'),
        api.get('/files?all=true'),
        api.get('/notes')
      ]);
      return {
        folders: foldersRes.data.length,
        files: filesRes.data.length,
        notes: notesRes.data.length
      };
    }
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto page-transition p-4 md:p-8 pt-20 md:pt-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to StudyVault</h1>
          <p className="text-dark-subtext">Here's an overview of your learning materials.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            icon={FolderIcon} 
            title="Total Folders" 
            value={stats?.folders || 0} 
            color="bg-primary-500/20 text-primary-400 border border-primary-500/30" 
          />
          <StatCard 
            icon={FileText} 
            title="Total Files" 
            value={stats?.files || 0} 
            color="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
          />
          <StatCard 
            icon={Upload} 
            title="Notes Created" 
            value={stats?.notes || 0} 
            color="bg-purple-500/20 text-purple-400 border border-purple-500/30" 
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Clock size={20} className="text-primary-400" /> Recent Activity
          </h2>
          <div className="glass-card p-0 overflow-hidden">
            <div className="p-6 text-center text-dark-subtext">
              No recent activity to show yet. Start by creating a folder!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
