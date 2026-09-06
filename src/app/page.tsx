"use client";

import { ArrowRight, BookOpen, FileText, GraduationCap, Link2, PlayCircle, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  { icon: FileText, title: "PDFs that matter", text: "Keep notes, past papers, and guides in one searchable place." },
  { icon: PlayCircle, title: "Learn by watching", text: "Share the best YouTube explainers with your classmates." },
  { icon: BookOpen, title: "Notes, your way", text: "Post quick text notes and study guides for everyone." },
  { icon: GraduationCap, title: "Built for your course", text: "Filter everything by branch, semester, and subject." },
];

function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (result.error) throw result.error;
      if (mode === "signup") setMessage("Check your email to verify your account.");
      else router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) setMessage(error.message);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        <div className="mb-7">
          <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600"><Sparkles size={20} /></div>
          <h2 className="font-display text-3xl font-bold text-slate-900">Welcome to your study circle.</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to save, share, and discover better resources.</p>
        </div>
        <button onClick={continueWithGoogle} className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 font-semibold text-slate-700 transition hover:bg-slate-50"><span className="text-lg font-bold">G</span> Continue with Google</button>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or email<span className="h-px flex-1 bg-slate-200" /></div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Email address</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@college.edu" className="mb-4 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none ring-indigo-500 focus:ring-2" />
        <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="At least 8 characters" className="mb-5 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none ring-indigo-500 focus:ring-2" />
        <button disabled={busy} onClick={submit} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">{busy ? "Working..." : mode === "login" ? "Enter Drive" : "Create account"} <ArrowRight size={17} /></button>
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 w-full text-center text-sm font-semibold text-indigo-600">{mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button>
        {message && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-600">{message}</p>}
        <p className="mt-5 text-center text-xs text-slate-400">By continuing, you agree to our community guidelines.</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfbfd] text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><BookOpen size={19} /></span> drive<span className="text-indigo-600">.</span></Link>
        <div className="hidden items-center gap-5 text-sm font-medium text-slate-500 md:flex"><a href="#features" className="hover:text-slate-900">How it works</a><a href="#community" className="hover:text-slate-900">Community</a><ThemeToggle /><button onClick={() => setAuthOpen(true)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-slate-700 hover:bg-white">Log in</button></div>
        <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 md:hidden">Join free</button>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-12 lg:px-10 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute -right-40 -top-32 h-[32rem] w-[32rem] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-indigo-600 shadow-sm"><Sparkles size={14} /> Made for students, by students</div>
            <h1 className="max-w-2xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">Share. Learn.<br /><span className="text-indigo-600">Succeed together.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-500">Your campus&apos;s open shelf for the resources that make studying a little lighter. Find the right PDF, video, or note — right when you need it.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={() => setAuthOpen(true)} className="flex h-13 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 font-semibold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">Start learning free <ArrowRight size={18} /></button><a href="#features" className="flex h-13 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 transition hover:border-slate-300">Explore the shelf</a></div>
            <div className="mt-10 flex items-center gap-3 text-sm text-slate-500"><div className="flex -space-x-2"><span className="avatar bg-rose-200">AS</span><span className="avatar bg-amber-200">MK</span><span className="avatar bg-emerald-200">RN</span></div><span><strong className="text-slate-700">2,400+</strong> students sharing knowledge</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -left-4 top-16 z-10 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/70 sm:-left-10"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> TRENDING NOW</div><p className="max-w-[170px] text-sm font-semibold leading-5 text-slate-800">Data Structures — last minute revision</p><div className="mt-3 text-xs text-slate-400">142 students saved this</div></div>
            <div className="rounded-[2.5rem] bg-indigo-600 p-3 shadow-2xl shadow-indigo-200"><div className="rounded-[2rem] bg-[#f7f8fc] p-5 sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Good morning, Arjun</p><h3 className="mt-1 font-display text-2xl font-bold">Your study shelf</h3></div><div className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">AK</div></div><div className="mb-5 flex gap-2 overflow-hidden"><span className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">For you</span><span className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500">Saved</span><span className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500">My branch</span></div><div className="space-y-3"><div className="material-card"><div className="icon-box bg-rose-100 text-rose-600"><FileText size={18} /></div><div><p className="text-sm font-bold">Operating Systems Notes</p><p className="mt-1 text-xs text-slate-400">CSE · 4th semester · PDF</p></div><span className="ml-auto text-xs text-slate-400">♥ 24</span></div><div className="material-card"><div className="icon-box bg-sky-100 text-sky-600"><PlayCircle size={18} /></div><div><p className="text-sm font-bold">Graphs in 15 minutes</p><p className="mt-1 text-xs text-slate-400">Algorithms · Video</p></div><span className="ml-auto text-xs text-slate-400">♥ 18</span></div><div className="material-card"><div className="icon-box bg-amber-100 text-amber-600"><Link2 size={18} /></div><div><p className="text-sm font-bold">DBMS Interview Prep</p><p className="mt-1 text-xs text-slate-400">Community note</p></div><span className="ml-auto text-xs text-slate-400">♥ 31</span></div></div></div></div>
            <div className="absolute -bottom-5 -right-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl sm:-right-8"><p className="text-xs text-slate-400">This week</p><p className="mt-1 text-lg font-bold">+18 resources</p></div>
          </div>
        </div>
      </section>
      <section id="features" className="border-y border-slate-100 bg-white px-6 py-20 lg:px-10"><div className="mx-auto max-w-7xl"><div className="mb-12 max-w-xl"><p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-indigo-600">Everything in one place</p><h2 className="font-display text-4xl font-bold tracking-tight">Less searching.<br />More learning.</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-slate-100 bg-[#fbfbfd] p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100"><div className="mb-10 grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={21} /></div><h3 className="font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></div></section>
      <section id="community" className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-10"><Users className="mx-auto mb-5 text-indigo-600" /><h2 className="font-display text-3xl font-bold">Knowledge grows when it&apos;s shared.</h2><p className="mx-auto mt-3 max-w-lg text-slate-500">Join a community where your notes help someone pass an exam — and someone else&apos;s notes help you do the same.</p><button onClick={() => setAuthOpen(true)} className="mt-7 font-semibold text-indigo-600 hover:text-indigo-700">Find your study circle <ArrowRight className="ml-1 inline" size={16} /></button></section>
      <footer className="border-t border-slate-100 px-6 py-8 text-center text-sm text-slate-400">© 2025 drive. A better way to study together.</footer>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </main>
  );
}
