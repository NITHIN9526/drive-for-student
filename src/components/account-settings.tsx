"use client";

import { Check, KeyRound, Loader2, LogOut, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = { username: string; full_name: string; college: string; branch: string; semester: number | null; avatar_url: string | null };

export function AccountSettings({ profile, userEmail, close, onSaved, onLogout }: { profile: Profile; userEmail: string; close: () => void; onSaved: (profile: Profile) => void; onLogout: () => void }) {
  const [form, setForm] = useState(profile);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const update = (key: keyof Profile, value: string | number | null) => setForm((current) => ({ ...current, [key]: value }));

  async function saveProfile() {
    setBusy(true); setMessage("");
    const { data, error } = await supabase.from("profiles").update(form).eq("id", (await supabase.auth.getUser()).data.user?.id).select().single();
    if (error) setMessage(error.message.includes("username") ? "That username is already taken." : error.message);
    else if (data) { onSaved(data); setMessage("Profile saved."); }
    setBusy(false);
  }

  async function changePassword() {
    if (password.length < 8) { setMessage("Use at least 8 characters for your password."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : "Password changed successfully.");
    if (!error) setPassword("");
    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    onLogout();
    router.push("/");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between">
          <div><p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Account settings</p><h2 className="mt-2 font-display text-3xl font-bold">Make your profile yours.</h2><p className="mt-2 text-sm text-slate-500">Personalize your identity and sign-in security.</p></div>
          <button onClick={close} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close settings"><X size={19} /></button>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Username<input value={form.username} onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-indigo-500" placeholder="your_username" /><span className="mt-1 block text-xs font-normal text-slate-400">Your unique public handle.</span></label>
          <label className="text-sm font-semibold">Email address<input value={userEmail} disabled className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-normal text-slate-400" /></label>
          <label className="text-sm font-semibold">Display name<input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-indigo-500" /></label>
          <label className="text-sm font-semibold">College / institution<input value={form.college} onChange={(e) => update("college", e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-indigo-500" placeholder="Your college" /></label>
          <label className="text-sm font-semibold">Branch / department<input value={form.branch} onChange={(e) => update("branch", e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-indigo-500" placeholder="Computer Science" /></label>
          <label className="text-sm font-semibold">Semester<select value={form.semester ?? ""} onChange={(e) => update("semester", e.target.value ? Number(e.target.value) : null)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-indigo-500"><option value="">Choose semester</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}{i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} semester</option>)}</select></label>
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6"><div><h3 className="font-display font-bold">Password</h3><p className="mt-1 text-sm text-slate-500">Set a new password for email sign-in.</p></div><a href="/auth/reset-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</a></div>
        <div className="mt-3 flex gap-3"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500" /><button onClick={changePassword} disabled={busy || !password} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><KeyRound size={16} /> Change</button></div>
        {message && <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message.includes("success") || message === "Profile saved." ? <Check size={16} className="text-emerald-600" /> : null}{message}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between"><button onClick={logout} className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Log out</button><div className="flex justify-end gap-3"><button onClick={close} className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-500">Cancel</button><button onClick={saveProfile} disabled={busy} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save profile</button></div></div>
      </div>
    </div>
  );
}
