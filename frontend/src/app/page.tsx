'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Shield, Ghost, MessageSquare, ArrowRight, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-8 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-2">
          <Zap className="text-primary fill-primary" />
          <span className="text-xl font-bold tracking-tight">FreedomSpeech</span>
        </div>
        <Link 
          href="/login"
          className="px-6 py-2 rounded-full border border-border hover:bg-secondary transition-colors text-sm font-medium"
        >
          Enter the Void
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.2em] mb-6 inline-block">
            Decentralized Opinions • Real-time
          </span>
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tighter">
            Unfiltered thoughts. <br />
            <span className="gradient-text">Zero footprints.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-12 leading-relaxed">
            The world's premier anonymous discussion platform. Share your mind across moderated "Booths" without ever creating an account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login"
              className="px-10 py-4 bg-primary text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 group text-lg"
            >
              Start Speaking
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#features"
              className="px-10 py-4 bg-secondary/50 backdrop-blur-md rounded-2xl font-bold hover:bg-secondary transition-all text-lg"
            >
              How it works
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-32 border-t border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Ghost className="w-8 h-8 text-primary" />,
              title: "Ghost Protocol",
              desc: "No accounts. No passwords. No identity. You exist only through your shadow session."
            },
            {
              icon: <Shield className="w-8 h-8 text-purple-500" />,
              title: "Encrypted Rails",
              desc: "Every post and comment is secured via Supabase's high-performance encryption layer."
            },
            {
              icon: <Globe className="w-8 h-8 text-blue-400" />,
              title: "Global Booths",
              desc: "Join location-based or topic-specific areas to discuss what matters in real-time."
            }
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-secondary/20 border border-border/50 backdrop-blur-sm"
            >
              <div className="mb-6">{f.icon}</div>
              <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-border/30 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FreedomSpeech. Protected by the Void.
        </p>
      </footer>
    </div>
  );
}
