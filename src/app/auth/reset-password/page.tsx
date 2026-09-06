"use client";

import { ArrowLeft, Check, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit() {
    if (password.length < 8) { setMessage("Password must be at least 8 characters."); return; }
    const { error } = await createClient().auth.updateUser({ password });
    if (error) setMessage(error.message); else { setSaved(true); setMessage("Password updated. You can return to your dashboard."); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#fbfbfd] p-5"><div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/60"><Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> Back to home</Link><div className="mt-10 grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><KeyRound size={21} /></div><h1 className="mt-5 font-display text-3xl font-bold">Set a new password</h1><p className="mt-2 text-sm leading-6 text-slate-500">Choose a strong password you have not used elsewhere.</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-7 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500" /><button onClick={submit} disabled={saved} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white disabled:opacity-60">{saved && <Check size={17} />} {saved ? "Password updated" : "Update password"}</button>{message && <p className="mt-4 text-sm text-slate-500">{message}</p>}</div></main>;
}
