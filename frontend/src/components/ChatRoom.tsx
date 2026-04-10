'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { socket } from '@/lib/api';
import { Send, Smile, User, Loader2, Plus, Menu, Reply, X, Image as ImageIcon, ImagePlus, Maximize2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const fetchPosts = async () => {
    if (!groupId) return;
    const { data: gData } = await supabase.from('groups').select('name').eq('id', groupId).maybeSingle();
    if (gData) setGroupName(gData.name);

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username),
        reply_to:reply_to_id (
          content,
          profiles (username)
        ),
        reactions (
          emoji,
          user_id
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) {
      const processedPosts = data.map((post: any) => {
        const reactionsMap: Record<string, number> = {};
        post.reactions?.forEach((r: any) => {
          reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
        });
        const userReaction = post.reactions?.find((r: any) => r.user_id === userId)?.emoji || null;
        return { ...post, reactions: reactionsMap, user_reaction: userReaction };
      });
      setPosts(processedPosts);
    }
  };

  useEffect(() => {
    fetchPosts();
    socket.emit('join_room', groupId);

    const handleRefresh = () => {
      fetchPosts();
    };

    socket.on('refresh_posts', handleRefresh);

    return () => {
      socket.off('refresh_posts', handleRefresh);
    };
  }, [groupId, userId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [posts]);

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
      const fileExt = item.file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, item.file);

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
      
      urls.push(publicUrl);
    }
    
    setUploadProgress(null);
    return urls;
  };

  async function handleSend() {
    if ((!newPost.trim() && !selectedFiles.length) || !userId || loading) return;
    setLoading(true);
    
    try {
      const mediaUrls = await uploadMedia();
      
      const insertData: any = { 
        group_id: groupId, 
        user_id: userId, 
        content: newPost.trim(),
        media_urls: mediaUrls
      };
      
      if (replyingTo) insertData.reply_to_id = replyingTo.id;

      const { data: postData } = await supabase.from('posts').insert(insertData).select().maybeSingle();
      if (postData) {
        await supabase.from('history').insert({ user_id: userId, action_type: 'post_created', action_id: postData.id, metadata: { group_id: groupId } });
        
        socket.emit('new_post', groupId);
        
        setNewPost('');
        setReplyingTo(null);
        setSelectedFiles([]);
      }
    } catch (err) { 
      console.error("Failed to send post:", err); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleToggleReaction(postId: string, emoji: string) {
    if (!userId) return;
    setActiveReactionPicker(null);
    const { data: existing } = await supabase.from('reactions').select('*').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) {
      if (existing.emoji === emoji) await supabase.from('reactions').delete().eq('id', existing.id);
      else await supabase.from('reactions').update({ emoji }).eq('id', existing.id);
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: userId, emoji });
      await supabase.from('history').insert({ user_id: userId, action_type: 'reacted_to_post', action_id: postId, metadata: { emoji } });
    }
    
    socket.emit('new_reaction', groupId);
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10 custom-scrollbar">
        <AnimatePresence initial={false}>
          {posts.map((post, index) => {
            const currentDate = new Date(post.created_at).toDateString();
            const prevDate = index > 0 ? new Date(posts[index - 1].created_at).toDateString() : null;
            const showDateHeader = currentDate !== prevDate;

            return (
              <div key={`post-container-${post.id}`} className="space-y-4">
                {showDateHeader && (
                  <div className="flex justify-center my-6">
                    <span className="px-4 py-1.5 rounded-full bg-secondary/50 backdrop-blur-md border border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{formatDateLabel(post.created_at)}</span>
                  </div>
                )}
                
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("max-w-[85%] md:max-w-xl group flex flex-col relative", post.user_id === userId ? "ml-auto items-end" : "mr-auto items-start")}>
                  {post.user_id !== userId && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 px-1">{post.profiles?.username}</span>}

                  <div className="relative group/bubble max-w-full">
                    <div className={cn("px-2 py-2 rounded-xl shadow-lg border text-sm transition-all min-w-[100px] overflow-hidden", post.user_id === userId ? "bg-[#1F1F1F] text-white border-white/5 rounded-tr-none" : "bg-card border-border rounded-tl-none")}>
                      
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
                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1 opacity-60">
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

        <div className="max-w-4xl w-full mx-auto flex items-end gap-2 bg-secondary/30 p-2 rounded-2xl border border-border/50">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={cn("p-3 rounded-xl transition-all", selectedFiles.length > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary")}
          >
            <ImagePlus size={20} />
          </button>
          {/* <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} disabled={!userId} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={selectedFiles.length > 0 ? "Add a caption..." : "Ghost says..."} className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-1 resize-none min-h-[44px] max-h-[120px]" /> */}
         <textarea
  value={newPost}
  onChange={(e) => setNewPost(e.target.value)}
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
