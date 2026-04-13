'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { socket, fetchAPI } from '@/lib/api';
import { Send, Smile, User, Loader2, Plus, Menu, Reply, X, Image as ImageIcon, ImagePlus, Maximize2, Trash2, ArrowDown, MessageSquare, Pencil, Check, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';


const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const USER_COLORS = [
  'text-rose-400',
  'text-emerald-400',
  'text-amber-400',
  'text-sky-400',
  'text-violet-400',
  'text-orange-400',
  'text-fuchsia-400',
  'text-lime-400',
  'text-cyan-400',
  'text-indigo-400'
];

const getUserColor = (userId: string) => {
  if (!userId) return 'text-indigo-400';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
};


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
  is_deleted?: boolean;
  is_edited?: boolean;
}

interface ChatRoomProps {
  groupId: string;
  userId: string | null;
  onMenuClick?: () => void;
}

export function ChatRoom({ groupId, userId, onMenuClick }: ChatRoomProps) {
  const searchParams = useSearchParams();
  const sharedMessageId = searchParams?.get('messageId');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const { profile } = useAnonymousUser();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [commentingTo, setCommentingTo] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('Global');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Check if we clicked the trigger button itself to avoid double-toggling
        if (!target.closest('.reaction-trigger')) {
          setActiveReactionPicker(null);
        }
      }
    };

    if (activeReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeReactionPicker]);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newPost]);
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

  const [highlightedPost, setHighlightedPost] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const jumpToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`post-${messageId}`);
    if (element) {
      // Small delay to ensure any layout changes are settled
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setHighlightedPost(messageId);
      // Clear highlight after animation
      setTimeout(() => setHighlightedPost(null), 2500);
    } else {
      console.warn(`Message with ID ${messageId} not found in the current view.`);
    }
  }, []);

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
      if (sharedMessageId && posts.some(p => p.id === sharedMessageId)) {
        setTimeout(() => jumpToMessage(sharedMessageId), 100);
      } else {
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
      }
      isInitialLoad.current = false;
      lastPostCount.current = posts.length;
      return;
    }

    // New Message Logic
    if (posts.length > lastPostCount.current) {
      const lastPost = posts[posts.length - 1];
      const isMyMessage = lastPost.user_id === userId;
      const isThread = lastPost.content?.startsWith('[THREAD]');

      if ((isMyMessage || isAtBottom) && !isThread) {
        scrollToBottom(true);
      } else if (!isAtBottom && !isThread) {
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
      if (editingPost) {
        let finalContent = newPost.trim();
        if (editingPost.content.startsWith('[THREAD]')) {
          finalContent = `[THREAD] ${finalContent}`;
        }

        const body = { 
          content: finalContent
        };

        const postData = await fetchAPI(`/api/posts/${editingPost.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body)
        });

        if (postData) {
          setNewPost('');
          setEditingPost(null);
          fetchPosts(); // Re-fetch immediately to ensure UI is in sync
        }
        return;
      }

      const mediaUrls = await uploadMedia();
      
      let finalContent = newPost.trim();
      const targetId = replyingTo?.id || commentingTo?.id;

      if (commentingTo) {
        finalContent = `[THREAD] ${finalContent}`;
      }

      const body = { 
        group_id: groupId, 
        user_id: userId, 
        content: finalContent,
        media_urls: mediaUrls,
        reply_to_id: targetId
      };

      const postData = await fetchAPI('/api/posts', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (postData) {
        setNewPost('');
        setReplyingTo(null);
        setCommentingTo(null);
        setEditingPost(null);
        setSelectedFiles([]);
      }
    } catch (err) { 
      console.error("Failed to send/update post via API:", err); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleDelete(postId: string) {
    setPostToDelete(postId);
  }

  async function confirmDelete() {
    if (!userId || loading || !postToDelete) return;
    
    setLoading(true);
    try {
      await fetchAPI(`/api/posts/${postToDelete}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_deleted: true })
      });
      fetchPosts();
      setPostToDelete(null);
    } catch (err) {
      console.error("Failed to delete post via API:", err);
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

  const THREAD_COLORS = [
    'border-primary/60',
    'border-indigo-400/60',
    'border-violet-400/60',
    'border-fuchsia-400/60',
    'border-rose-400/60',
    'border-amber-400/60',
    'border-emerald-400/60',
  ];

  const buildTree = (posts: Post[]) => {
    const map: Record<string, any> = {};
    const rootNodes: any[] = [];

    posts.forEach(post => {
      map[post.id] = { ...post, children: [] };
    });

    posts.forEach(post => {
      const isThread = post.content?.startsWith('[THREAD]');
      if (post.reply_to_id && isThread && map[post.reply_to_id]) {
        map[post.reply_to_id].children.push(map[post.id]);
      } else {
        rootNodes.push(map[post.id]);
      }
    });

    return rootNodes;
  };

  const renderPost = (post: any, index: number, depth = 0, isSameUserAsPrev = false, showDateHeader = false, parentOnRight = false) => {
    const isOnRight = depth === 0 ? post.user_id === userId : parentOnRight;
    const isNew = new Date(post.created_at).getTime() > initialLastSeen.current && post.user_id !== userId;
    const isFirstNew = isNew && (index === 0 || new Date(posts[index - 1]?.created_at).getTime() <= initialLastSeen.current);
    const hasThreadFlag = post.content?.startsWith('[THREAD]');
    const content = hasThreadFlag ? post.content.replace('[THREAD]', '').trim() : post.content;
    const isDeleted = post.is_deleted || content === '[DELETED]';

    const threadColor = THREAD_COLORS[depth % THREAD_COLORS.length];

    return (
      <div key={`post-container-${post.id}`} className={cn("flex flex-col", depth > 0 ? (isOnRight ? `mr-2 md:mr-4 border-r-2 ${threadColor} pr-2.5 py-0.5 mt-0.5` : `ml-2 md:ml-4 border-l-2 ${threadColor} pl-2.5 py-0.5 mt-0.5`) : (index > 0 ? (isSameUserAsPrev ? "mt-0.5" : "mt-2.5") : ""), isOnRight && "items-end")}>
        {showDateHeader && depth === 0 && (
           <div className="flex justify-center mb-4 mt-1 w-full">
            <span className="px-3 py-1 rounded-full bg-secondary/50 backdrop-blur-md border border-border/50 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{formatDateLabel(post.created_at)}</span>
          </div>
        )}
        {isFirstNew && depth === 0 && (
          <div ref={firstUnreadRef} className="flex justify-center my-4 relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-primary/30"></div></div>
            <span className="relative px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-primary/20 shadow-sm">
              Unread Messages
            </span>
          </div>
        )}
        
        <motion.div 
          id={`post-${post.id}`}
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          whileHover={{ scale: 1.005 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 40) {
              setCommentingTo(null);
              setReplyingTo(post);
              scrollToBottom(true);
              document.querySelector('textarea')?.focus();
            }
          }}
          className={cn(
            depth > 0 ? "max-w-full" : "max-w-[85%] md:max-w-xl group flex flex-col relative transition-all duration-300", 
            isOnRight ? "ml-auto items-end text-left" : "mr-auto items-start text-left",
            highlightedPost === post.id && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg scale-[1.02] z-50 shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-primary/5"
          )}
        >
          {/* Username removed from here and moved inside the bubble below */}


          <div 
            className={cn("relative group/bubble", depth > 0 ? "w-full" : "max-w-full")}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setActiveMessageId(activeMessageId === post.id ? null : post.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveMessageId(activeMessageId === post.id ? null : post.id);
            }}
          >
            <div className={cn("px-3 py-2 rounded-2xl shadow-md text-[13px] transition-all overflow-hidden relative", post.user_id === userId ? "bg-[#0F172D] w-fit text-white shadow-primary/20 rounded-tr-none border border-white/10 ml-auto" : "bg-[#0F172A] text-slate-200 border border-white/5 rounded-tl-none shadow-black/40 mr-auto")}>
              {(post.user_id !== userId || depth > 0) && !isSameUserAsPrev && (
                <div className={cn(
                  "text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 select-none",
                  post.user_id === userId ? "text-yellow-500" : getUserColor(post.user_id)
                )}>
                  {post.user_id === userId ? "You" : post.profiles?.username}
                </div>
              )}
              {post.is_edited && !isDeleted && (
                <span className={cn(
                  "absolute top-1 right-1.5 text-[7px] font-black uppercase tracking-tighter",
                  post.user_id === userId ? "text-white/40" : "text-slate-500/60"
                )}>
                  Edited
                </span>
              )}
              
              {isDeleted ? (
                <div className="flex items-center gap-3 py-1.5 opacity-40 italic select-none">
                  <Trash2 size={14} className="shrink-0 text-slate-400" />
                  <span className="text-[11px] font-medium leading-tight text-slate-300 tracking-tight">
                    Message was deleted by {post.user_id === userId ? "You" : (post.profiles?.username || 'Ghost')}
                  </span>
                </div>
              ) : (
                <>
                  {/* Quoted Content (Only for non-threaded citation replies) */}
                  {post.reply_to && !hasThreadFlag && (
                    <div 
                      onClick={() => post.reply_to_id && jumpToMessage(post.reply_to_id)}
                      className={cn(
                        "mb-2 p-1.5 rounded-lg border-l-2 text-[10px] bg-black/10 flex flex-col gap-0.5 cursor-pointer hover:bg-black/20 transition-all text-left", 
                        post.user_id === userId ? "border-white/30" : "border-primary/50"
                      )}
                    >
                      <span className="font-bold text-sky-400 uppercase text-[8px]">{post.reply_to.profiles?.username}</span>
                      <p className="line-clamp-1 italic opacity-70">{post.reply_to.content}</p>
                    </div>
                  )}

                  {/* Image Gallery */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className={cn(
                      "mb-2 grid gap-1 rounded-lg overflow-hidden cursor-pointer max-w-[150px]",
                      post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    )}>
                      {post.media_urls.map((url: string, i: number) => (
                        <div key={i} onClick={() => setLightboxImage(url)} className={cn("relative group/img", post.media_urls!.length === 3 && i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square")}>
                          <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Maximize2 size={16} className="text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="leading-snug whitespace-pre-wrap pr-8 w-fit">{content}</p>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    (commentingTo?.id === post.id || replyingTo?.id === post.id || activeMessageId === post.id) 
                      ? "max-h-12 opacity-100 mt-1.5" 
                      : "max-h-0 opacity-0 group-hover/bubble:max-h-12 group-hover/bubble:opacity-100 group-hover/bubble:mt-1.5"
                  )}>
                    
                    <div className="pt-1.5 border-t border-white/5 flex items-center gap-0.5">
                        <button 
                          title="React"
                          onClick={() => setActiveReactionPicker(activeReactionPicker === post.id ? null : post.id)} 
                          className={cn(
                            "p-1.5 rounded-lg transition-all reaction-trigger",
                            post.user_reaction ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5 hover:text-primary"
                          )}
                        >
                        <Smile size={12} />
                      </button>
                      <button 
                        title="Reply"
                        onClick={() => { setCommentingTo(null); setReplyingTo(post); scrollToBottom(true); }} 
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-primary transition-all"
                      >
                        <Reply size={12} />
                      </button>
                      <button 
                        title="Comment"
                        onClick={() => { setReplyingTo(null); setCommentingTo(post); }} 
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-primary transition-all"
                      >
                        <MessageSquare size={12} />
                      </button>
                      <button 
                        title="Share"
                        onClick={async () => {
                          const url = `${window.location.origin}/dashboard?groupId=${groupId}&messageId=${post.id}`;
                          const shareData = {
                            title: 'Freedom Speech',
                            text: 'Check out this message on Freedom Speech:',
                            url: url,
                          };
                          try {
                            if (navigator.share) {
                              await navigator.share(shareData);
                            } else {
                              await navigator.clipboard.writeText(url);
                            }
                          } catch (err) {
                            console.error('Error sharing', err);
                          }
                        }} 
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-emerald-400 transition-all"
                      >
                        <Share2 size={12} />
                      </button>
                      {post.user_id === userId && (
                        <button 
                          title="Edit"
                          onClick={() => { 
                            setReplyingTo(null); 
                            setCommentingTo(null); 
                            setEditingPost(post); 
                            setNewPost(content);
                            document.querySelector('textarea')?.focus();
                          }} 
                          className="p-1.5 rounded-lg text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      {post.user_id === userId && (
                        <button 
                          title="Delete"
                          onClick={() => handleDelete(post.id)} 
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                  </div>
                </>
              )}

              <div className="absolute bottom-1 right-1.5 flex items-center gap-1 opacity-60">
                {isNew && <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
                <span className="text-[9px] font-medium leading-none text-slate-400">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              </div>
            </div>

            <AnimatePresence>
              {activeReactionPicker === post.id && (
                <motion.div 
                  ref={reactionPickerRef}
                  initial={{ opacity: 0, scale: 0.9, y: 5 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.9, y: 5 }} 
                  className={cn("absolute bottom-full mb-3 z-50 flex gap-1 p-1 bg-card border border-border rounded-xl shadow-2xl", post.user_id === userId && depth === 0 ? "right-0" : "left-0")}
                >
                  {EMOJI_OPTIONS.map(emoji => <button key={emoji} onClick={() => handleToggleReaction(post.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-primary/10">{emoji}</button>)}
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-primary/10 overflow-hidden cursor-pointer" title="Add custom device emoji">
                    <Plus size={16} className="text-muted-foreground pointer-events-none" />
                    <input 
                      type="text" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => {
                        const val = Array.from(e.target.value);
                        if (val.length > 0) {
                           const emoji = val[val.length - 1];
                           handleToggleReaction(post.id, emoji);
                           e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {post.reactions && Object.keys(post.reactions).length > 0 && (
              <div className={cn("flex flex-wrap gap-1 mt-1.5", post.user_id === userId && depth === 0 ? "justify-end pr-10" : "justify-start")}>
                {Object.entries(post.reactions).map(([emoji, count]: [string, any]) => (
                  <button key={emoji} onClick={() => handleToggleReaction(post.id, emoji)} className={cn("px-1.5 py-0.5 rounded-full border text-[9px] font-bold", post.user_reaction === emoji ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/50 border-border")}>{emoji} {count}</button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Child Comments */}
        {post.children && post.children.length > 0 && (
          <div className="flex flex-col w-full">
            {post.children.map((child: any, idx: number) => renderPost(child, idx, depth + 1, false, false, isOnRight))}
          </div>
        )}
      </div>
    );
  };

  const threadedPosts = buildTree(posts);

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
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-destructive/20">
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.3 }} className="h-full bg-destructive" />
              </div>
              
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Delete Message?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">This will mark your ghost thought as deleted forever. Other ghosts will see the deletion placeholder.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  <button 
                    onClick={() => setPostToDelete(null)}
                    className="p-3 rounded-2xl bg-secondary text-secondary-foreground font-bold text-xs uppercase tracking-widest hover:bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    disabled={loading}
                    className="p-3 rounded-2xl bg-destructive text-white font-bold text-xs uppercase tracking-widest hover:bg-destructive/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-destructive/20"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <Menu size={20} className="text-primary" />
          </button>
          <h2 className="text-sm font-black tracking-tighter uppercase">{groupName}</h2>
        </div>
      </header>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] md:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary blur-[120px] rounded-full" />
      </div>

      <div ref={scrollRef} onScroll={handleScroll} onClick={() => setActiveMessageId(null)} className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
        <AnimatePresence initial={false}>
          {threadedPosts.map((post, index) => {
            const currentDate = new Date(post.created_at).toDateString();
            const prevDate = index > 0 ? new Date(threadedPosts[index - 1].created_at).toDateString() : null;
            const showDateHeader = currentDate !== prevDate;
            const isSameUserAsPrev = index > 0 && threadedPosts[index - 1].user_id === post.user_id && !showDateHeader;
            
            return renderPost(post, index, 0, isSameUserAsPrev, showDateHeader);
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
          {commentingTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-indigo-500/5 rounded-xl overflow-hidden border-l-4 border-indigo-500 p-3 flex justify-between items-center shadow-inner gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-indigo-500 flex items-center gap-1">
                  <MessageSquare size={10} /> Commenting on {commentingTo.profiles?.username}
                </span>
                <p className="text-xs text-muted-foreground truncate italic">{commentingTo.content.replace('[THREAD]', '')}</p>
              </div>
              <button onClick={() => setCommentingTo(null)} className="p-1.5 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive shrink-0"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {replyingTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/5 rounded-xl overflow-hidden border-l-4 border-primary p-3 flex justify-between items-center gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-primary">Replying to {replyingTo.profiles?.username}</span>
                <p className="text-xs text-muted-foreground truncate italic">{replyingTo.content}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive shrink-0"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingPost && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-amber-500/5 rounded-xl overflow-hidden border-l-4 border-amber-500 p-3 flex justify-between items-center gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-amber-500">Editing Message</span>
                <p className="text-xs text-muted-foreground truncate italic">{editingPost.content.replace('[THREAD]', '')}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingPost(null);
                  setNewPost('');
                }} 
                className="p-1.5 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive shrink-0"
              >
                <X size={14} />
              </button>
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

        <div className="max-w-4xl w-full mx-auto flex items-end gap-2 bg-secondary/30 p-2 rounded-2xl border border-border/50 min-h-[60px] relative">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={cn("p-3 rounded-xl transition-all", selectedFiles.length > 0 ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary")}
          >
            <ImagePlus size={20} />
          </button>
          <textarea
            ref={textareaRef}
            value={newPost}
            rows={1}
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
            placeholder={selectedFiles.length > 0 ? "Add a caption..." : "Ghost says..."}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none text-sm py-3 px-2 resize-none min-h-[44px] transition-all duration-200 custom-scrollbar"
          />
          <button 
            onClick={handleSend} 
            disabled={(!newPost.trim() && !selectedFiles.length) || loading || !userId} 
            className={cn(
              "p-3 rounded-xl shadow-lg disabled:opacity-50 flex items-center gap-2",
              editingPost ? "bg-amber-500 text-white" : "bg-primary text-white"
            )}
           >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (editingPost ? <Check size={18} /> : <Send size={18} />)}
          </button>
        </div>
      </div>


    </div>
  );
}
