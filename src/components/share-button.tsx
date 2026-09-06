"use client";

import { Check, Copy, MessageCircle, Send, Share2, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ShareButtonProps = {
  uploadId: string;
  title: string;
  count?: number;
  onShared?: () => void;
  compact?: boolean;
};

export function ShareButton({ uploadId, title, count = 0, onShared, compact = false }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  async function share(channel: "native" | "copy" | "whatsapp" | "telegram") {
    const url = `${window.location.origin}/material/${uploadId}`;
    const text = `Check out “${title}” on drive.`;
    setOpen(false);
    try {
      if (channel === "native" && navigator.share) {
        await navigator.share({ title, text, url });
      } else if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
      } else if (channel === "telegram") {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      } else {
        if (!navigator.clipboard) throw new Error("Clipboard access is unavailable in this browser.");
        await navigator.clipboard.writeText(url);
        setMessage("Link copied!");
        window.setTimeout(() => setMessage(""), 1800);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Sharing failed. Please try again.");
      window.setTimeout(() => setMessage(""), 2500);
      return;
    }
    if (channel === "copy") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
    try {
      await createClient().rpc("increment_upload_shares", { target_upload_id: uploadId });
    } catch {
      // Sharing should still work when an older database has not run the migration.
    }
    onShared?.();
  }

  return <div className="relative">
    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value); }} className={`flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 ${compact ? "text-xs" : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"}`} aria-label={`Share ${title}`}>
      <Share2 size={compact ? 16 : 17} />{!compact && "Share"}{count > 0 && <span>{count}</span>}
    </button>
    {message && <div role="status" className="absolute right-0 top-10 z-30 w-56 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xl">{message}</div>}
    {open && <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-100 bg-white p-2 text-left shadow-xl" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => share("native")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Share2 size={15} /> Share…</button>
      <button type="button" onClick={() => share("copy")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy link"}</button>
      <button type="button" onClick={() => share("whatsapp")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><MessageCircle size={15} /> WhatsApp</button>
      <button type="button" onClick={() => share("telegram")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Send size={15} /> Telegram</button>
      <button type="button" onClick={() => setOpen(false)} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-50"><X size={14} /> Close</button>
    </div>}
  </div>;
}
