'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { socket, fetchAPI } from '@/lib/api';
import { Send, Smile, User, Loader2, Plus, Menu, Reply, X, Image as ImageIcon, ImagePlus, Maximize2, Trash2, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_urls?: string[] | null;
  reply_to_id?: string | null;
  reply_to?: {
    content: string;
    profiles: { username: string };
  } | null;
  reactions?: Record<string, number>;
  user_reaction?: string | null;
  profiles?: { username: string };
}

interface ChatRoomProps {
  groupId: string;
  userId: string | null;
  onMenuClick?: () => void;
}

export function ChatRoom({ groupId, userId, onMenuClick }: ChatRoomProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const { profile } = useAnonymousUser();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [groupName, setGroupName] = useState('Global');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image Selection State
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Advanced Scroll & Unread State
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCountInSession, setUnreadCountInSession] = useState(0);
  const initialLastSeen = useRef<number>(0);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const lastPostCount = useRef(0);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const fetchPosts = useCallback(async () => {
    if (!groupId) return;
    
    try {
      // Fetch group details via API
      const gData = await fetchAPI(`/api/groups/${groupId}`);
      if (gData) setGroupName(gData.name);

      const data = await fetchAPI(`/api/posts?groupId=${groupId}&userId=${userId}`);
      if (data) setPosts(data);
    } catch (err) {
      console.error("Failed to fetch data via API:", err);
    }
  }, [groupId, userId]);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCountInSession(0);
    }
  };

  useEffect(() => {
    if (!groupId) return;
    
    // Capture previous visit timestamp
    const recencyStr = localStorage.getItem('freedom_recency');
    if (recencyStr) {
      try {
        const recencyMap = JSON.parse(recencyStr);
        initialLastSeen.current = recencyMap[groupId] || 0;
      } catch (e) {
        initialLastSeen.current = 0;
      }
    }
    
    isInitialLoad.current = true;
    setUnreadCountInSession(0);
  }, [groupId]);

  useEffect(() => {
    if (posts.length === 0) return;

    // Initial Load Logic
    if (isInitialLoad.current) {
      const hasUnread = posts.some(p => p.user_id !== userId && new Date(p.created_at).getTime() > initialLastSeen.current);
      if (hasUnread) {
        // Direct jump to first unread message without animation
        setTimeout(() => {
          if (firstUnreadRef.current) {
            firstUnreadRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
          } else {
            scrollToBottom(false);
          }
        }, 50);
      } else {
        scrollToBottom(false);
      }
      isInitialLoad.current = false;
      lastPostCount.current = posts.length;
      return;
    }

    // New Message Logic
    if (posts.length > lastPostCount.current) {
      const lastPost = posts[posts.length - 1];
      const isMyMessage = lastPost.user_id === userId;

      if (isMyMessage || isAtBottom) {
        scrollToBottom(true);
      } else {
        setUnreadCountInSession(prev => prev + (posts.length - lastPostCount.current));
      }
    }

    lastPostCount.current = posts.length;
  }, [posts, userId, isAtBottom, scrollToBottom]);

  useEffect(() => {
    fetchPosts();
    socket.emit('join_room', groupId);

    const handleRefresh = () => {
      fetchPosts();
    };

    const handleUserTyping = ({ groupId: incomingGroupId, username, isTyping }: { groupId: string, username: string, isTyping: boolean }) => {
      if (incomingGroupId !== groupId) return;
      setTypingUsers(prev => {
        if (isTyping && !prev.includes(username)) return [...prev, username];
        if (!isTyping) return prev.filter(u => u !== username);
        return prev;
      });
    };

    socket.on('refresh_posts', handleRefresh);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('refresh_posts', handleRefresh);
      socket.off('user_typing', handleUserTyping);
    };
  }, [groupId, userId, fetchPosts]);

  // Image Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadMedia = async () => {
    if (!selectedFiles.length) return [];
    
    setUploadProgress(0);
    const urls: string[] = [];
    
    for (const item of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('userId', userId || 'anonymous');

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        if (data.publicUrl) {
          urls.push(data.publicUrl);
        }
      } catch (err) {
        console.error("Upload error via API:", err);
      }
    }
    
    setUploadProgress(null);
    return urls;
  };

  async function handleSend() {
    if ((!newPost.trim() && !selectedFiles.length) || !userId || loading) return;
    setLoading(true);
    
    try {
      const mediaUrls = await uploadMedia();
      
      const body = { 
        group_id: groupId, 
        user_id: userId, 
        content: newPost.trim(),
        media_urls: mediaUrls,
        reply_to_id: replyingTo ? replyingTo.id : undefined
      };

      const postData = await fetchAPI('/api/posts', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (postData) {
        setNewPost('');
        setReplyingTo(null);
        setSelectedFiles([]);
      }
    } catch (err) { 
      console.error("Failed to send post via API:", err); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleToggleReaction(postId: string, emoji: string) {
    if (!userId) return;
    setActiveReactionPicker(null);
    
    try {
      await fetchAPI('/api/reactions', {
        method: 'POST',
        body: JSON.stringify({
          post_id: postId,
          user_id: userId,
          emoji,
          group_id: groupId
        })
      });
    } catch (err) {
      console.error("Failed to toggle reaction via API:", err);
    }
  }

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  if (!hasMounted) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all">
              <X size={24} className="text-white" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={lightboxImage} className="max-w-full max-h-full rounded-2xl shadow-2xl" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <Menu size={20} className="text-primary" />
          </button>
          <h2 className="text-sm font-black italic tracking-tighter uppercase">{groupName}</h2>
        </div>
      </header>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] md:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary blur-[120px] rounded-full" />
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
        <AnimatePresence initial={false}>
          {posts.map((post, index) => {
            const currentDate = new Date(post.created_at).toDateString();
            const prevDate = index > 0 ? new Date(posts[index - 1].created_at).toDateString() : null;
            const showDateHeader = currentDate !== prevDate;
            const isSameUserAsPrev = index > 0 && posts[index - 1].user_id === post.user_id && !showDateHeader;
            
            const isNew = new Date(post.created_at).getTime() > initialLastSeen.current && post.user_id !== userId;
            const isFirstNew = isNew && (index === 0 || new Date(posts[index - 1].created_at).getTime() <= initialLastSeen.current);

            return (
              <div key={`post-container-${post.id}`} className={cn("flex flex-col", index > 0 ? (isSameUserAsPrev ? "mt-1.5" : "mt-6") : "")}>
                {isFirstNew && (
                  <div ref={firstUnreadRef} className="flex justify-center my-8 relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-primary/30"></div></div>
                    <span className="relative px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-primary/20 shadow-sm">
                      Unread Messages
                    </span>
                  </div>
                )}
                {showDateHeader && (
                  <div className="flex justify-center mb-6 mt-2">
                    <span className="px-4 py-1.5 rounded-full bg-secondary/50 backdrop-blur-md border border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{formatDateLabel(post.created_at)}</span>
                  </div>
                )}
                
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("max-w-[85%] md:max-w-xl group flex flex-col relative", post.user_id === userId ? "ml-auto items-end" : "mr-auto items-start")}>
                  {post.user_id !== userId && !isSameUserAsPrev && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 px-2 drop-shadow-sm">{post.profiles?.username}</span>}

                  <div className="relative group/bubble max-w-full">
                    <div className={cn("px-3 py-2.5 rounded-2xl shadow-lg text-sm transition-all min-w-[100px] overflow-hidden", post.user_id === userId ? "bg-primary text-white shadow-primary/20 rounded-tr-sm border border-white/10" : "bg-[#1E293B] text-slate-200 border border-white/5 rounded-tl-sm shadow-black/40")}>
                      
                      {/* Quoted Content */}
                      {post.reply_to && (
                        <div className={cn("mb-3 p-2 rounded-lg border-l-2 text-[11px] bg-black/10 flex flex-col gap-1", post.user_id === userId ? "border-white/30" : "border-primary/50")}>
                          <span className="font-bold opacity-80 uppercase text-[9px]">{post.reply_to.profiles?.username}</span>
                          <p className="line-clamp-2 italic opacity-70">{post.reply_to.content}</p>
                        </div>
                      )}

                      {/* Image Gallery */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className={cn(
                          "mb-3 grid gap-1 rounded-xl overflow-hidden cursor-pointer max-w-[200px]",
                          post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        )}>
                          {post.media_urls.map((url, i) => (
                            <div key={i} onClick={() => setLightboxImage(url)} className={cn("relative group/img", post.media_urls!.length === 3 && i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square")}>
                              <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Maximize2 size={20} className="text-white drop-shadow-lg" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="leading-relaxed whitespace-pre-wrap pr-10">{post.content}</p>
                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1.5 opacity-60">
                        {isNew && <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
                        <span className="text-[10px] font-medium leading-none">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={cn("absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-20", post.user_id === userId ? "-left-20 flex-row-reverse" : "-right-20")}>
                      <button onClick={() => setActiveReactionPicker(activeReactionPicker === post.id ? null : post.id)} className="p-2 rounded-full bg-card border border-border shadow-md hover:bg-secondary"><Smile size={14} /></button>
                      <button onClick={() => setReplyingTo(post)} className="p-2 rounded-full bg-card border border-border shadow-md hover:bg-secondary"><Reply size={14} /></button>
                    </div>

                    <AnimatePresence>
                      {activeReactionPicker === post.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }} className={cn("absolute bottom-full mb-3 z-50 flex gap-1 p-1 bg-card border border-border rounded-xl shadow-2xl", post.user_id === userId ? "right-0" : "left-0")}>
                          {EMOJI_OPTIONS.map(emoji => <button key={emoji} onClick={() => handleToggleReaction(post.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-primary/10">{emoji}</button>)}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {post.reactions && Object.keys(post.reactions).length > 0 && (
                      <div className={cn("flex flex-wrap gap-1 mt-1.5", post.user_id === userId ? "justify-end mr-10" : "justify-start")}>
                        {Object.entries(post.reactions).map(([emoji, count]) => (
                          <button key={emoji} onClick={() => handleToggleReaction(post.id, emoji)} className={cn("px-1.5 py-0.5 rounded-full border text-[9px] font-bold", post.user_reaction === emoji ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/50 border-border")}>{emoji} {count}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-28 right-6 z-40 p-3 bg-primary text-white rounded-full shadow-2xl hover:bg-primary/90 transition-all group flex items-center gap-2"
          >
            {unreadCountInSession > 0 && (
              <span className="bg-white text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] shadow-sm">
                {unreadCountInSession}
              </span>
            )}
            <ArrowDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-6 border-t border-border bg-card/50 backdrop-blur-xl relative z-20 flex flex-col gap-3">
        {/* Attachment Previews */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative group shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-border shadow-lg">
                  <img src={f.preview} className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary transition-all"
              >
                <Plus size={20} />
                <span className="text-[10px] font-bold uppercase">Add</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/5 rounded-xl overflow-hidden border-l-4 border-primary p-3 flex justify-between items-center">
              <div className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-primary">Replying to {replyingTo.profiles?.username}</span><p className="text-xs text-muted-foreground truncate italic">{replyingTo.content}</p></div>
              <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full mb-3 left-6 flex items-center gap-2 bg-secondary/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 shadow-lg text-[10px] text-muted-foreground font-medium uppercase tracking-widest z-30">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce"></span>
              </span>
              {typingUsers.length === 1 ? `${typingUsers[0]} is typing` : `${typingUsers.length} ghosts typing`}...
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl w-full mx-auto flex items-end gap-2 bg-secondary/30 p-2 rounded-2xl border border-border/50 relative">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={cn("p-3 rounded-xl transition-all", selectedFiles.length > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary")}
          >
            <ImagePlus size={20} />
          </button>
         <textarea
  value={newPost}
  onChange={(e) => {
    setNewPost(e.target.value);
    if (groupId && profile?.username) {
      socket.emit('typing', { groupId, username: profile.username, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { groupId, username: profile.username, isTyping: false });
      }, 2000);
    }
  }}
  disabled={!userId}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }}
  placeholder={selectedFiles.length > 0 ? "Add a caption..." : "Ghost says..."}
  className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none text-sm py-2 px-1 resize-none h-10 min-h-[44px] max-h-[120px]"
/>
          <button onClick={handleSend} disabled={(!newPost.trim() && !selectedFiles.length) || loading || !userId} className="p-3 bg-primary text-white rounded-xl shadow-lg disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
