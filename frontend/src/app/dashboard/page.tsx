'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatRoom } from '@/components/ChatRoom';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { Plus, AlertCircle } from 'lucide-react';
import { fetchAPI } from '@/lib/api';

export default function Dashboard() {
  const { userId } = useAnonymousUser();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchInitialGroup = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const recencyStr = localStorage.getItem('freedom_recency');
      let recencyMap: Record<string, number> = {};
      if (recencyStr) {
        try { recencyMap = JSON.parse(recencyStr); } catch(e) {}
      }

      const groups = await fetchAPI('/api/groups');
      
      if (!groups || groups.length === 0) {
        setError('No communities found. Please create your first community below.');
        setIsInitializing(false);
        return;
      }

      let lastVisitedId: string | null = null;
      let maxTime = 0;
      
      Object.entries(recencyMap).forEach(([id, time]) => {
        if (time > maxTime) {
          maxTime = time;
          lastVisitedId = id;
        }
      });

      if (lastVisitedId && groups.some((g: any) => g.id === lastVisitedId)) {
        setActiveGroupId(lastVisitedId);
      } else {
        setActiveGroupId(null);
      }
    } catch (err: any) {
      console.error('Initial fetch error:', err);
      setError('Database connection error. Ensure your Supabase keys are correct.');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialGroup();
  }, [fetchInitialGroup]);

  const handleCreateFirst = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const newGroup = await fetchAPI('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'General',
          slug: 'general',
          description: 'The main community for everyone to speak freely.'
        })
      });

      if (newGroup) {
        setActiveGroupId(newGroup.id);
      }
    } catch (err: any) {
      console.error('Failed to create first group:', err);
      setError('Creation failed. Ensure your Database schema is fully applied.');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground relative">
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeGroupId={activeGroupId} 
        onGroupSelect={(id) => {
          setActiveGroupId(id);
          setIsSidebarOpen(false); // Auto-close on mobile
        }} 
        userId={userId} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-destructive/5 via-background to-background">
            <div className="max-w-md space-y-8 relative z-10">
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto ring-4 ring-destructive/5 animate-pulse">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase">Initialization Required</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The application is connected but no discussion areas were found or accessible.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCreateFirst}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                >
                  <Plus size={18} />
                  Create General Community
                </button>
                <div className="p-4 bg-secondary/50 rounded-xl border border-border text-[10px] text-left font-mono truncate">
                  Error Detail: {error}
                </div>
              </div>
            </div>
          </div>
        ) : isInitializing ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase animate-pulse">Connecting to Freedom Node...</p>
            </div>
          </div>
        ) : activeGroupId ? (
          <ChatRoom 
            groupId={activeGroupId} 
            userId={userId} 
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
            <div className="max-w-md w-full space-y-8 glass-card p-10 rounded-3xl shadow-2xl border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 bg-secondary/30 backdrop-blur-xl rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-white/10 rotate-3 transition-transform duration-500 group-hover:rotate-6">
                  <img 
                    src="/logo.webp" 
                    alt="FreedomSpeech Logo" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-3xl font-black tracking-tight text-foreground">Welcome to <span className="gradient-text pr-1">FreedomSpeech</span></h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    A completely decentralized, secure, and anonymous communication node. Your unique ghost identity is ready.
                  </p>
                </div>

                <div className="pt-4 flex justify-center">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden px-8 py-3.5 bg-white text-black font-bold uppercase tracking-widest text-[11px] rounded-full shadow-xl hover:scale-105 transition-transform"
                  >
                    Open Menu
                  </button>
                  <div className="hidden md:flex items-center gap-3 bg-secondary/50 rounded-full px-6 py-3 border border-border">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">&larr; Select a community</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
