"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Ghost,
  MessageSquare,
  ArrowRight,
  Globe,
} from "lucide-react";

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
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.webp"
            alt="FreedomSpeech Logo"
            className="w-12 scale-[2.5] h-12 object-contain rounded-xl shadow-2xl group-hover:scale-110 transition-transform shadow-primary/20"
          />
          <h1 className="text-2xl relative top-0 left-[-16px] font-black tracking-tighter gradient-text">
            FreedomSpeech
          </h1>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pb-32 text-center">
        <motion.div
          // initial={{ opacity: 1, md:opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-8xl font-black mb-8 ">
            <span className="text-[28px] md:text-[48px]">
              Unfiltered thoughts.
            </span>
            <span className="block gradient-text text-[44px] md:text-[90px]">Zero identity.</span>
          </h1>
          <h2
            className="text-6xl md:text-9xl font-black mb-12 tracking-tighter text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.7)" }}
          >
            শূন্য পরিচয়।
          </h2>

          <div className="max-w-4xl mx-auto space-y-6 mb-12 px-4">
            <p className="text-[13px] md:text-4xl font-bold tracking-tight text-foreground/90 leading-tight">
              No identity. Just truth. And your voice.
            </p>
            <p className="text-[13px] md:text-2xl text-muted-foreground/80 font-medium italic">
              কোনো পরিচয় নয় — শুধু সত্য, শুধু আপনার কণ্ঠস্বর।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
                boxShadow: [
                  "0 0 0px var(--primary)",
                  "0 0 20px var(--primary)",
                  "0 0 0px var(--primary)"
                ]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="rounded-2xl"
            >
              <Link
                href="/login"
                className="px-10 py-5 bg-primary text-white rounded-2xl font-bold flex flex-col items-center gap-1 hover:bg-primary/90 transition-all shadow-2xl shadow-primary/40 group text-lg relative overflow-hidden"
              >
                <div className="flex items-center gap-2 relative z-10">
                  Start Speaking{" "}
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-xs opacity-80 font-medium relative z-10">
                  কথা বলা শুরু করুন
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </Link>
            </motion.div>
            <Link
              href="#features"
              className="px-10 py-5 hidden md:block bg-secondary/50 backdrop-blur-md rounded-2xl font-bold hover:bg-secondary transition-all text-lg flex flex-col items-center gap-1"
            >
              <span>How it works</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 container mx-auto px-6 py-32 "
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Ghost className="w-8 h-8 text-primary" />,
              title: "Ghost Protocol",
              titleBn: "ঘোস্ট প্রোটোকল",
              desc: "No accounts. No passwords. No identity. You exist only through your shadow session.",
              descBn:
                "কোনো অ্যাকাউন্ট নেই। পরিচয়হীনতা। আপনি কেবল আপনার সেশনের মাধ্যমেই উপস্থিত।",
            },
            {
              icon: <Shield className="w-8 h-8 text-purple-500" />,
              title: "Encrypted Rails",
              titleBn: "সুরক্ষিত এনক্রিপশন",
              desc: "Every post and comment is secured via Supabase's high-performance encryption layer.",
              descBn:
                "প্রতিটি পোস্ট এবং মন্তব্য শক্তিশালী এনক্রিপশন স্তরের মাধ্যমে সম্পূর্ণ সুরক্ষিত।",
            },
            {
              icon: <Globe className="w-8 h-8 text-blue-400" />,
              title: "Global Booths",
              titleBn: "গ্লোবাল বুথ",
              desc: "Join location-based or topic-specific areas to discuss what matters in real-time.",
              descBn:
                "গুরুত্বপূর্ণ বিষয়গুলো নিয়ে রিয়েল-টাইমে আলোচনা করতে বুথগুলোতে যোগ দিন।",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-secondary/20 border border-border/50 backdrop-blur-sm group"
            >
              <div className="mb-6 bg-background/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <div className="mb-4">
                <h3 className="text-2xl font-bold">{f.title}</h3>
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {f.desc}
                </p>
                <p className="text-muted-foreground/70 leading-relaxed text-sm italic">
                  {f.descBn}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-border/30 text-center space-y-2">
        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
          FreedomSpeech
        </p>
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Protected by the Void
        </p>
      </footer>
    </div>
  );
}
