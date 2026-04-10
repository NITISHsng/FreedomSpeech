'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Save, Loader2, CheckCircle2, Shield, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialUsername: string;
  onUpdate: () => void;
}

export function SettingsModal({ isOpen, onClose, userId, initialUsername, onUpdate }: SettingsModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updates: any = { username: username.trim() };
      if (password.trim()) {
        updates.password = password.trim();
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess(true);
      onUpdate();
      setTimeout(() => {
        setSuccess(false);
        if (!password.trim()) onClose(); // Close if just name changed
      }, 2000);
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border/50 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase">Ghost Settings</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Identity & Protection</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/30 space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Permanent Ghost ID</span>
                  <button 
                    onClick={handleCopyId}
                    className="flex items-center gap-1.5 text-[9px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy Full ID"}
                  </button>
                </div>
                <div className="font-mono text-[9px] bg-background/50 p-3 rounded-lg border border-border/20 break-all leading-relaxed opacity-60">
                  {userId}
                </div>
                <p className="text-[9px] text-muted-foreground italic leading-tight">
                  Save this ID to reclaim your profile on other devices.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                      <User size={12} />
                      Ghost Name
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      placeholder="Enter new ghost name..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                      <Lock size={12} />
                      Access Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      placeholder="Set or update password..."
                    />
                    <p className="text-[9px] text-muted-foreground italic px-1">
                      Passwords allow you to reclaim this ID on other browsers.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[10px] font-medium animate-shake">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all",
                    success 
                      ? "bg-green-500 text-white" 
                      : "bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : success ? (
                    <>
                      <CheckCircle2 size={18} />
                      Identity Updated
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="p-4 bg-secondary/30 border-t border-border flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>GHOST_NODE_V2</span>
              <span>NODE_OK</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
