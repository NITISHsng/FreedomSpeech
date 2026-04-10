'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatRoom } from '@/components/ChatRoom';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { supabase } from '@/lib/supabase';
import { fetchAPI } from '@/lib/api';
import { Plus, Database, AlertCircle } from 'lucide-react';

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
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database Timeout')), 10000)
      );

      const fetchPromise = (async () => {
        let { data: globalGroup } = await supabase
          .from('groups')
          .select('id')
          .eq('slug', 'global')
          .maybeSingle();
        
        if (globalGroup) return globalGroup.id;

        const { data: anyGroup } = await supabase
          .from('groups')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        if (anyGroup) return anyGroup.id;
        
        return null;
      })();

      const result = await Promise.race([fetchPromise, timeoutPromise]) as string | null;

      if (result) {
        setActiveGroupId(result);
      } else {
        setError('No communities found. Please create your first community below.');
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
    
    // Verify our new Express API backend is reachable!
    fetchAPI('/api/health')
      .then(res => console.log('✅ Express Backend Connection:', res))
      .catch(err => console.error('❌ Express Backend Connection Failed:', err));
  }, [fetchInitialGroup]);

  const handleCreateFirst = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const { data: newGroup, error: createError } = await supabase
        .from('groups')
        .insert({
          name: 'Global Square',
          slug: 'global',
          description: 'The main community for everyone to speak freely.'
        })
        .select()
        .maybeSingle();

      if (createError) throw createError;

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
                  Create Global Community
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground italic text-sm p-8 text-center">
            Select a community in the sidebar menu to join the conversation
          </div>
        )}
      </div>
    </main>
  );
}
