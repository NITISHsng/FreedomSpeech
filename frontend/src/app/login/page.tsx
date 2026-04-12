'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, ArrowRight, Zap, Loader2, AlertCircle, Key, UserPlus, ChevronLeft } from 'lucide-react';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { userId, registerGhost, reclaimGhost, getTimestampedId } = useAnonymousUser({ autoRegister: false });
  const [activeTab, setActiveTab] = useState<'new' | 'reclaim'>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [displayId, setDisplayId] = useState<string>('');
  const [reclaimId, setReclaimId] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem('freedom_user_id');
    if (storedId) {
      router.push('/dashboard');
      return;
    }
    if (userId) setDisplayId(userId);
    else setDisplayId(getTimestampedId());
  }, [userId, getTimestampedId, router]);

  const handleJoinNew = async () => {
    setLoading(true);
    setError(null);
    try {
      await registerGhost(displayId);
      router.push('/dashboard');
    } catch (err: any) {
      setError("Handshake Failed. Node unreachable.");
      setLoading(false);
    }
  };

  const handleReclaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reclaimId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await reclaimGhost(reclaimId, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || "Reclaim failed. Check ID/Password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 md:p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Back to Home Button */}
      <motion.button
        initial={{ opacity: 1, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-secondary/30 backdrop-blur-xl border border-border/50 rounded-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all z-50 group"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Home</span>
      </motion.button>

      <motion.div
        // initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card/40 backdrop-blur-3xl border border-border/50 rounded-[2rem] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="p-6 md:p-10 space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-secondary/20 rounded-[1rem] flex items-center justify-center mx-auto transition-transform hover:scale-110 duration-500">
              <img 
                src="/logo.webp" 
                alt="FreedomSpeech Logo" 
                className="w-full h-full object-contain p-2"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase gradient-text">
                FreedomSpeech
              </h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold opacity-70">
                Secure Anonymous Handshake
              </p>
            </div>
          </div>

          <div className="flex p-1 bg-secondary/50 rounded-2xl border border-border/50">
            <button
              onClick={() => { setActiveTab('new'); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === 'new' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserPlus size={14} />
              New Ghost
            </button>
            <button
              onClick={() => { setActiveTab('reclaim'); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === 'reclaim' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Key size={14} />
              Reclaim
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'new' ? (
              <motion.div key="new" initial={{ opacity: 1, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/30 space-y-3 font-mono">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Ghost Identity</span>
                  <div className="text-[9px] md:text-[10px] bg-background/50 p-3 rounded-lg border border-border/20 break-all leading-relaxed text-primary">
                    {displayId || "GENERATING..."}
                  </div>
                </div>
                <button onClick={handleJoinNew} disabled={loading} className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enter Portal <ArrowRight size={18} /></>}
                </button>
              </motion.div>
            ) : (
              <motion.form key="reclaim" initial={{ opacity: 1, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onSubmit={handleReclaim} className="space-y-4">
                <div className="space-y-3">
                  <input required placeholder="Ghost ID" value={reclaimId} onChange={(e) => setReclaimId(e.target.value)} className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
                  <input type="password" placeholder="Password (if set)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-2xl font-bold transition-all shadow-xl">
                   {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Reclaim Identity"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[10px] font-medium">{error}</div>}

          <p className="text-[9px] text-muted-foreground text-center px-4 leading-relaxed uppercase tracking-widest opacity-60">
             Zero Registry • Full Anonymity
          </p>
        </div>
      </motion.div>

      <div className="fixed bottom-6 flex items-center gap-2 opacity-50 text-[9px] font-bold uppercase tracking-widest">
        <Zap size={10} className="text-primary fill-primary" />
        Freedom Node 2.0
      </div>
    </div>
  );
}
