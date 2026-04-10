'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { socket, fetchAPI } from '@/lib/api';
import { 
  Zap, Hash, Plus, Loader2, X, ArrowRight, Settings, 
  Search, History, Globe, LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { SettingsModal } from './SettingsModal';

interface Group {
  id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroupId: string | null;
  onGroupSelect: (groupId: string) => void;
  userId: string | null;
}

export function Sidebar({ isOpen, onClose, activeGroupId, onGroupSelect, userId }: SidebarProps) {
  const { profile, refreshProfile, isLoaded } = useAnonymousUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [newBoothName, setNewBoothName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [recencyMap, setRecencyMap] = useState<Record<string, number>>({});
  
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
    const storedRecency = localStorage.getItem('freedom_recency');
    if (storedRecency) {
      try {
        setRecencyMap(JSON.parse(storedRecency));
      } catch (e) {
        console.error('Failed to parse recency map', e);
      }
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await fetchAPI('/api/groups');
      if (data) setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups via API:", err);
    }
  }, []);

  useEffect(() => {
    fetchGroups();

    const handleGroupsChanged = () => {
      fetchGroups();
    };

    socket.on('groups_changed', handleGroupsChanged);

    return () => {
      socket.off('groups_changed', handleGroupsChanged);
    };
  }, [fetchGroups]);

  useEffect(() => {
    if (!userId) return;

    async function fetchHistory() {
      try {
        const data = await fetchAPI(`/api/history?userId=${userId}`);
        if (data) setHistory(data);
      } catch (err) {
        console.error("Failed to fetch history via API:", err);
      }
    }

    fetchHistory();

    const handleHistoryRefresh = () => {
      fetchHistory();
    };

    socket.on('refresh_posts', handleHistoryRefresh);

    return () => {
      socket.off('refresh_posts', handleHistoryRefresh);
    };
  }, [userId]);

  const filteredGroups = useMemo(() => {
    return groups
      .filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.slug.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const timeA = recencyMap[a.id] || 0;
        const timeB = recencyMap[b.id] || 0;
        if (timeA !== timeB) return timeB - timeA;
        return a.name.localeCompare(b.name);
      });
  }, [groups, searchTerm, recencyMap]);

  const handleGroupClick = (groupId: string) => {
    onGroupSelect(groupId);
    const newRecency = { ...recencyMap, [groupId]: Date.now() };
    setRecencyMap(newRecency);
    localStorage.setItem('freedom_recency', JSON.stringify(newRecency));
  };

  const handleCreateBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoothName.trim() || isCreating) return;

    setIsCreating(true);
    setError(null);

    const slug = newBoothName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (!slug) {
      setError("Invalid name");
      setIsCreating(false);
      return;
    }

    try {
      const data = await fetchAPI('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: newBoothName.trim(),
          slug: slug,
          description: `Shared area for ${newBoothName.trim()}`
        })
      });

      if (data) {
        setNewBoothName('');
        setIsInputVisible(false);
        handleGroupClick(data.id);
      }
    } catch (err) {
      setError("Creation failed. Please try again.");
    }
    
    setIsCreating(false);
  };

  const sidebarContent = (
    <div className="w-80 h-full flex flex-col bg-card border-r border-border md:bg-card/50 md:backdrop-blur-xl pointer-events-auto shadow-2xl md:shadow-none">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="text-primary fill-primary" />
          <span className="gradient-text tracking-tight">FreedomSpeech</span>
        </h1>
        <button onClick={onClose} className="md:hidden p-2 text-muted-foreground hover:bg-secondary rounded-full">
          <X size={20} />
        </button>
      </div>

      <div className="px-6 mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search communities..."
            className="w-full bg-secondary/30 hover:bg-secondary/50 border border-border/50 rounded-xl pl-10 pr-10 py-2.5 text-xs focus:ring-1 focus:ring-primary/50 transition-all outline-none"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-secondary rounded-md"
            >
              <X size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-8 custom-scrollbar">
        <div>
          <div className="flex items-center justify-between px-2 mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Communities
            </h2>
            <button
              onClick={() => setIsInputVisible(!isInputVisible)}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                isInputVisible ? "bg-destructive/10 text-destructive rotate-90" : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
              )}
            >
              {isInputVisible ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>

          <AnimatePresence>
            {isInputVisible && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden px-2"
              >
                <form onSubmit={handleCreateBooth} className="space-y-2">
                  <div className="relative group">
                    <input
                      autoFocus
                      type="text"
                      value={newBoothName}
                      onChange={(e) => {
                        setNewBoothName(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="New Community Name..."
                      className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newBoothName.trim() || isCreating}
                      className="absolute right-2 top-2 p-1 bg-primary text-white rounded-md hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight size={12} strokeWidth={3} />}
                    </button>
                  </div>
                  {error && (
                    <p className="text-[10px] text-destructive px-1 font-medium">{error}</p>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            {filteredGroups.length === 0 ? (
              <div className="px-4 py-12 text-center rounded-2xl border border-dashed border-border/50 bg-secondary/10">
                <Globe className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                   {searchTerm ? "No matches" : "Empty"}
                </p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                    activeGroupId === group.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Hash className={cn("w-4 h-4", activeGroupId === group.id ? "text-white" : "text-primary")} />
                  <span className="font-medium truncate text-sm">{group.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
           <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-4">Sync History</h2>
           <div className="space-y-4 px-2">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="text-[10px] text-muted-foreground truncate opacity-50">
                 {item.action_type.replace('_', ' ')}
              </div>
            ))}
           </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border bg-card/8base overflow-hidden">
        {!hasMounted ? (
           <div className="h-14 bg-secondary/20 animate-pulse rounded-xl" />
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 shadow-inner active:scale-95 transition-transform">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-[8px] font-black text-white shadow-lg shrink-0">
              {profile?.username.slice(0, 3).toUpperCase() || "..."}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black italic truncate tracking-tight">
                {profile?.username || "Syncing..."}
              </p>
              <p className="text-[9px] text-muted-foreground font-mono truncate">{userId?.slice(0, 12)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-colors">
                <Settings size={14} />
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('freedom_user_id');
                  window.location.href = '/login';
                }} 
                className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile View */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative p-0"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {hasMounted && userId && profile && (
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userId={userId}
          initialUsername={profile.username}
          onUpdate={refreshProfile}
        />
      )}
    </>
  );
}
