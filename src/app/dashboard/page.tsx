"use client";

import { Bell, Bookmark, ChevronDown, FileText, Filter, Home, LayoutGrid, Link2, LogOut, Menu, Plus, Search, Share2, Sparkles, StickyNote, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountSettings } from "@/components/account-settings";
import { ShareButton } from "@/components/share-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const materials = [
  { title: "Operating Systems — Unit 1 to 5", subject: "Operating Systems", meta: "CSE · 4th sem · PDF", type: "pdf", color: "rose", author: "Priya Shah", time: "2h ago", saves: 24, attachment_count: 1, shares_count: 0 },
  { title: "Graphs in 15 minutes", subject: "Algorithms", meta: "CSE · 4th sem · Video", type: "youtube", color: "sky", author: "Aditya Menon", time: "5h ago", saves: 18, attachment_count: 1, shares_count: 0 },
  { title: "DBMS Interview Prep Guide", subject: "Database Systems", meta: "CSE · 4th sem · Note", type: "note", color: "amber", author: "Neha Kulkarni", time: "Yesterday", saves: 31, attachment_count: 1, shares_count: 0 },
  { title: "Computer Networks — PYQs", subject: "Computer Networks", meta: "CSE · 4th sem · PDF", type: "pdf", color: "violet", author: "Rahul Verma", time: "Yesterday", saves: 12, attachment_count: 1, shares_count: 0 },
];

type Profile = { username: string; full_name: string; college: string; branch: string; semester: number | null; avatar_url: string | null };
type Attachment = { id: string; upload_id?: string; kind: "pdf" | "youtube" | "note"; file_path?: string | null; external_url?: string | null; content?: string | null; metadata?: Record<string, string>; sort_order?: number };
type UploadRecord = { id: string; title: string; subject: string; description?: string; branch?: string; semester?: number | null; type: string; is_public: boolean; created_at: string; uploader_id: string; attachment_count: number; attachment_summary?: string; shares_count: number; file_paths: string[]; attachments?: Attachment[]; legacy?: boolean };
type MaterialCard = { id?: string; title: string; subject: string; meta: string; type: string; color: string; author: string; time: string; saves: number; attachment_count: number; shares_count: number; is_public?: boolean; file_paths?: string[] };
type Draft = { id: string; kind: "pdf" | "youtube" | "note"; file?: File; filePath?: string | null; attachmentId?: string; external_url?: string; content?: string; metadata?: Record<string, string> };
type EditableMaterial = { id: string; uploader_id: string; title: string; description: string; subject: string; branch: string; semester: number | null; is_public: boolean; attachments: Attachment[] };

function EditMaterialModal({ material, close, saved }: { material: EditableMaterial; close: () => void; saved: (material: EditableMaterial & { created_at?: string; shares_count?: number }) => void }) {
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description);
  const [subject, setSubject] = useState(material.subject);
  const [branch, setBranch] = useState(material.branch);
  const [semester, setSemester] = useState(material.semester ? String(material.semester) : "");
  const [isPublic, setIsPublic] = useState(material.is_public);
  const [kind, setKind] = useState<Draft["kind"]>("pdf");
  const [drafts, setDrafts] = useState<Draft[]>(() => material.attachments.map((attachment) => ({ id: crypto.randomUUID(), attachmentId: attachment.id, kind: attachment.kind, filePath: attachment.file_path, external_url: attachment.external_url ?? undefined, content: attachment.content ?? undefined, metadata: attachment.metadata })));
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeMetadata, setYoutubeMetadata] = useState<Record<string, string> | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function addFiles(files: FileList | null) {
    const valid = Array.from(files ?? []).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (valid.some((file) => file.size > 20 * 1024 * 1024)) { setMessage("Each PDF must be smaller than 20 MB."); return; }
    setDrafts((items) => [...items, ...valid.map((file) => ({ id: crypto.randomUUID(), kind: "pdf" as const, file }))]);
    setMessage("");
  }
  async function fetchOembed(url: string) {
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) { setYoutubeMetadata(null); return; }
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (response.ok) setYoutubeMetadata(await response.json());
      else setYoutubeMetadata(null);
    } catch { setYoutubeMetadata(null); }
  }
  function addYoutube() {
    if (!youtubeUrl.trim()) { setMessage("Add a YouTube URL first."); return; }
    if (!youtubeMetadata) { setMessage("Use a valid YouTube URL and wait for its preview."); return; }
    setDrafts((items) => [...items, { id: crypto.randomUUID(), kind: "youtube", external_url: youtubeUrl.trim(), metadata: youtubeMetadata }]);
    setYoutubeUrl(""); setYoutubeMetadata(null); setMessage("");
  }
  function addNote() {
    if (!note.trim()) { setMessage("Write something in the note first."); return; }
    setDrafts((items) => [...items, { id: crypto.randomUUID(), kind: "note", content: note.trim() }]);
    setNote(""); setMessage("");
  }
  async function updateMaterial() {
    if (title.trim().length < 3) { setMessage("Add a title with at least 3 characters."); return; }
    if (!drafts.length) { setMessage("Keep at least one PDF, YouTube link, or note."); return; }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const uploadedPaths: string[] = [];
    const newAttachmentIds: string[] = [];
    const removedAttachments = material.attachments.filter((attachment) => !drafts.some((draft) => draft.attachmentId === attachment.id));
    try {
      const attachmentRows = await Promise.all(drafts.map(async (draft, index) => {
        setProgress((items) => ({ ...items, [draft.id]: 10 }));
        let row: Record<string, unknown> = { id: draft.attachmentId ?? crypto.randomUUID(), upload_id: material.id, kind: draft.kind, sort_order: index };
        if (!draft.attachmentId) newAttachmentIds.push(row.id as string);
        if (draft.kind === "pdf") {
          let filePath = draft.filePath;
          if (draft.file) {
            filePath = `${material.uploader_id}/${crypto.randomUUID()}-${draft.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error } = await supabase.storage.from("materials").upload(filePath, draft.file, { contentType: "application/pdf", upsert: false });
            if (error) throw new Error(`${draft.file.name}: ${error.message}`);
            uploadedPaths.push(filePath);
          }
          if (!filePath) throw new Error("A PDF attachment is missing its file.");
          row = { ...row, file_path: filePath, metadata: draft.metadata ?? {} };
        } else if (draft.kind === "youtube") {
          row = { ...row, external_url: draft.external_url, metadata: draft.metadata ?? {} };
        } else {
          row = { ...row, content: draft.content };
        }
        setProgress((items) => ({ ...items, [draft.id]: 100 }));
        return row;
      }));
      const { error: attachmentError } = await supabase.from("attachments").upsert(attachmentRows, { onConflict: "id" });
      if (attachmentError) {
        const policyMessage = attachmentError.message.includes("row-level security")
          ? "Supabase permissions are missing for editing attachments. Run the latest supabase/migrations/20250906_upload_attachments.sql migration, then try again."
          : attachmentError.message;
        throw new Error(`Attachments could not be saved: ${policyMessage}`);
      }
      const removedPaths = removedAttachments.flatMap((attachment) => attachment.file_path ? [attachment.file_path] : []);
      if (removedAttachments.length) {
        const { error: deleteError } = await supabase.from("attachments").delete().in("id", removedAttachments.map((attachment) => attachment.id));
        if (deleteError) throw new Error(`Removed attachments could not be updated: ${deleteError.message}`);
        if (removedPaths.length) {
          const { error: storageError } = await supabase.storage.from("materials").remove(removedPaths);
          if (storageError) throw new Error(`The removed files could not be cleaned up: ${storageError.message}`);
        }
      }
      const { data, error } = await supabase.from("uploads").update({ title: title.trim(), description: description.trim(), subject: subject.trim(), branch: branch.trim(), semester: semester ? Number(semester) : null, is_public: isPublic }).eq("id", material.id).select("id, title, description, subject, branch, semester, is_public, created_at, shares_count").single();
      if (error || !data) throw new Error(error?.message ?? "The upload could not be updated.");
      saved({ ...data, uploader_id: material.uploader_id, attachments: attachmentRows as Attachment[] });
    } catch (error) {
      if (newAttachmentIds.length) await supabase.from("attachments").delete().in("id", newAttachmentIds);
      if (uploadedPaths.length) await supabase.storage.from("materials").remove(uploadedPaths);
      setMessage(error instanceof Error ? error.message : "The upload could not be updated.");
      setBusy(false);
    }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"><div className="mx-auto my-6 w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"><div className="mb-7 flex items-start justify-between"><div><p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Edit upload</p><h2 className="mt-2 font-display text-2xl font-bold">Update your resource</h2><p className="mt-1 text-sm text-slate-500">Keep the metadata and attachments in sync.</p></div><button onClick={close} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={19} /></button></div><label className="block text-sm font-semibold">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500" /></label><label className="mt-4 block text-sm font-semibold">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students find in this upload?" className="mt-2 h-20 w-full resize-none rounded-xl border border-slate-200 p-4 outline-none focus:border-indigo-500" /></label><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="block text-sm font-semibold">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold">Branch<input value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold">Semester<select value={semester} onChange={(e) => setSemester(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-600"><option value="">Any</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value} value={value}>{value}th</option>)}</select></label></div><div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-semibold">Visibility</p><p className="mt-1 text-xs text-slate-500">{isPublic ? "Anyone with the link can preview this." : "Only you can view this upload."}</p></div><button onClick={() => setIsPublic((value) => !value)} className={`rounded-full px-3 py-2 text-xs font-bold ${isPublic ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{isPublic ? "Public" : "Private"}</button></div><div className="mt-6 grid grid-cols-3 gap-2">{[["pdf", FileText, "PDFs"], ["youtube", Link2, "YouTube"], ["note", StickyNote, "Notes"]].map(([value, Icon, label]) => <button type="button" key={value as string} onClick={() => setKind(value as Draft["kind"])} className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${kind === value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}><Icon size={16} />{label as string}</button>)}</div>{kind === "pdf" && <label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-indigo-400"><input type="file" multiple accept="application/pdf,.pdf" className="sr-only" onChange={(event) => addFiles(event.target.files)} /><FileText className="mx-auto text-indigo-500" /><p className="mt-2 text-sm font-semibold">Choose one or more PDFs</p><p className="mt-1 text-xs text-slate-400">Maximum 20 MB per file</p></label>}{kind === "youtube" && <div className="mt-4"><input value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); void fetchOembed(event.target.value); }} placeholder="https://youtube.com/watch?v=..." className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500" />{youtubeMetadata && <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Found: <strong>{youtubeMetadata.title}</strong> · {youtubeMetadata.author_name}</div>}<button type="button" onClick={addYoutube} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Add YouTube link</button></div>}{kind === "note" && <div className="mt-4"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a note for your study group..." className="h-28 w-full resize-none rounded-xl border border-slate-200 p-4 outline-none focus:border-indigo-500" /><button type="button" onClick={addNote} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Add note</button></div>}{drafts.length > 0 && <div className="mt-5 space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{drafts.length} attachment{drafts.length === 1 ? "" : "s"} ready</p>{drafts.map((draft) => <div key={draft.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-indigo-600">{draft.kind === "pdf" ? <FileText size={18} /> : draft.kind === "youtube" ? <Link2 size={18} /> : <StickyNote size={18} />}</div><p className="min-w-0 flex-1 truncate text-sm font-semibold">{draft.file?.name ?? draft.metadata?.title ?? (draft.content ? draft.content.slice(0, 45) : draft.kind === "pdf" ? "PDF attachment" : "YouTube link")}</p>{draft.attachmentId && <span className="text-[10px] font-semibold uppercase text-slate-400">Saved</span>}{progress[draft.id] !== undefined && <div className="w-16"><div className="h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress[draft.id]}%` }} /></div><span className="mt-1 block text-right text-[10px] text-indigo-600">{progress[draft.id]}%</span></div>}<button type="button" onClick={() => { setDrafts((items) => items.filter((item) => item.id !== draft.id)); setProgress((items) => { const next = { ...items }; delete next[draft.id]; return next; }); }} className="text-slate-400 hover:text-rose-600" aria-label="Remove attachment"><X size={16} /></button></div>)}</div>}{message && <p className="mt-3 text-sm text-rose-600">{message}</p>}<button disabled={busy} onClick={updateMaterial} className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{busy ? "Saving changes..." : "Save changes"}</button></div></div>;
}

function DeleteMaterialModal({ material, close, removed }: { material: { id: string; title: string; file_paths: string[]; legacy?: boolean }; close: () => void; removed: (id: string) => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function deleteUpload() {
    setBusy(true);
    const supabase = createClient();
    if (material.file_paths.length) {
      const { error } = await supabase.storage.from("materials").remove(material.file_paths);
      if (error) { setMessage(`The files could not be removed: ${error.message}`); setBusy(false); return; }
    }
    const { error } = material.legacy
      ? await supabase.from("materials").delete().eq("id", material.id)
      : await supabase.from("uploads").delete().eq("id", material.id);
    if (error) { setMessage(`The upload could not be removed: ${error.message}`); setBusy(false); return; }
    removed(material.id);
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600"><Trash2 size={20} /></div><h2 className="mt-5 font-display text-2xl font-bold">Remove upload?</h2><p className="mt-2 text-sm leading-6 text-slate-500">This permanently removes <strong className="text-slate-700">{material.title}</strong> and all its attachments.</p></div><button onClick={close} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>{message && <p className="mt-4 text-sm text-rose-600">{message}</p>}<div className="mt-6 grid grid-cols-2 gap-3"><button disabled={busy} onClick={close} className="h-12 rounded-xl border border-slate-200 font-semibold text-slate-600">Cancel</button><button disabled={busy} onClick={deleteUpload} className="h-12 rounded-xl bg-rose-600 font-semibold text-white disabled:opacity-60">{busy ? "Removing..." : "Remove"}</button></div></div></div>;
}

function UploadModal({ close, published }: { close: () => void; published: (upload: UploadRecord) => void }) {
  const [isPublic, setIsPublic] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [kind, setKind] = useState<Draft["kind"]>("pdf");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeMetadata, setYoutubeMetadata] = useState<Record<string, string> | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);

  function addFiles(files: FileList | null) {
    const valid = Array.from(files ?? []).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (valid.some((file) => file.size > 20 * 1024 * 1024)) { setMessage("Each PDF must be smaller than 20 MB."); return; }
    setDrafts((items) => [...items, ...valid.map((file) => ({ id: crypto.randomUUID(), kind: "pdf" as const, file }))]);
    setMessage("");
  }
  async function fetchOembed(url: string) {
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) { setYoutubeMetadata(null); return; }
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (response.ok) setYoutubeMetadata(await response.json());
    } catch { setYoutubeMetadata(null); }
  }
  function addYoutube() {
    if (!youtubeUrl.trim()) { setMessage("Add a YouTube URL first."); return; }
    if (!youtubeMetadata) { setMessage("Use a valid YouTube URL and wait for its preview."); return; }
    setDrafts((items) => [...items, { id: crypto.randomUUID(), kind: "youtube", external_url: youtubeUrl.trim(), metadata: youtubeMetadata }]);
    setYoutubeUrl(""); setYoutubeMetadata(null); setMessage("");
  }
  function addNote() {
    if (!note.trim()) { setMessage("Write something in the note first."); return; }
    setDrafts((items) => [...items, { id: crypto.randomUUID(), kind: "note", content: note.trim() }]);
    setNote(""); setMessage("");
  }
  async function publish() {
    setPublishing(true); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Your session has expired. Please log in again."); setPublishing(false); return; }
    if (title.trim().length < 3) { setMessage("Add a title with at least 3 characters."); setPublishing(false); return; }
    if (!drafts.length) { setMessage("Add at least one PDF, YouTube link, or note."); setPublishing(false); return; }
    const metadata = user.user_metadata;
    const fallbackName = metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Student";
    const fallbackUsername = `${fallbackName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "student"}_${user.id.replace(/-/g, "").slice(-6)}`;
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, username: fallbackUsername, full_name: fallbackName, avatar_url: metadata.avatar_url ?? null }, { onConflict: "id" });
    if (profileError) { setMessage(`Profile setup failed: ${profileError.message}`); setPublishing(false); return; }
    const { data: upload, error: uploadError } = await supabase.from("uploads").insert({ uploader_id: user.id, title: title.trim(), description: description.trim(), subject: subject.trim(), branch: branch.trim(), semester: semester ? Number(semester) : null, is_public: isPublic }).select("id, title, description, subject, branch, semester, is_public, created_at, uploader_id, shares_count").single();
    if (uploadError || !upload) {
      const missingUploadsTable = uploadError?.message.includes("public.uploads") || uploadError?.message.includes("schema cache");
      setMessage(missingUploadsTable
        ? "Batch uploads are not enabled in Supabase yet. In Supabase SQL Editor, run supabase/migrations/20250906_upload_attachments.sql, then reload this page."
        : uploadError?.message ?? "The upload could not be created.");
      setPublishing(false);
      return;
    }
    const uploadedPaths: string[] = [];
    let attachmentRows: Array<Record<string, unknown>>;
    try {
      attachmentRows = await Promise.all(drafts.map(async (draft, index) => {
        setProgress((items) => ({ ...items, [draft.id]: 10 }));
        if (draft.kind === "pdf" && draft.file) {
          const filePath = `${user.id}/${crypto.randomUUID()}-${draft.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error } = await supabase.storage.from("materials").upload(filePath, draft.file, { contentType: "application/pdf", upsert: false });
          if (error) throw new Error(`${draft.file.name}: ${error.message}`);
          uploadedPaths.push(filePath);
          setProgress((items) => ({ ...items, [draft.id]: 100 }));
          return { upload_id: upload.id, kind: "pdf", file_path: filePath, sort_order: index };
        }
        setProgress((items) => ({ ...items, [draft.id]: 100 }));
        return draft.kind === "youtube"
          ? { upload_id: upload.id, kind: "youtube", external_url: draft.external_url, metadata: draft.metadata ?? {}, sort_order: index }
          : { upload_id: upload.id, kind: "note", content: draft.content, sort_order: index };
      }));
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from("materials").remove(uploadedPaths);
      await supabase.from("uploads").delete().eq("id", upload.id);
      setMessage(`Attachment upload failed: ${error instanceof Error ? error.message : "Please try again."}`); setPublishing(false); return;
    }
    const { data: savedAttachments, error: attachmentError } = await supabase.from("attachments").insert(attachmentRows).select("id, upload_id, kind, file_path, external_url, content, metadata, sort_order");
    if (attachmentError) {
      if (uploadedPaths.length) await supabase.storage.from("materials").remove(uploadedPaths);
      await supabase.from("uploads").delete().eq("id", upload.id);
      setMessage(`Attachments could not be saved: ${attachmentError.message}`); setPublishing(false); return;
    }
    published({ ...upload, type: drafts[0].kind, attachment_count: drafts.length, file_paths: uploadedPaths, attachments: savedAttachments as Attachment[] });
    close(); setPublishing(false);
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"><div className="mx-auto my-6 w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"><div className="mb-7 flex items-start justify-between"><div><div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600"><Sparkles size={19} /></div><h2 className="font-display text-2xl font-bold">Add to the shelf</h2><p className="mt-1 text-sm text-slate-500">Batch PDFs, links, and notes into one shareable upload.</p></div><button onClick={close} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={19} /></button></div><label className="block text-sm font-semibold">Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 2 revision pack" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500" /></label><label className="mt-4 block text-sm font-semibold">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students find in this upload?" className="mt-2 h-20 w-full resize-none rounded-xl border border-slate-200 p-4 outline-none focus:border-indigo-500" /></label><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="block text-sm font-semibold">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Operating Systems" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold">Branch<input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold">Semester<select value={semester} onChange={(e) => setSemester(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-600"><option value="">Any</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value} value={value}>{value}th</option>)}</select></label></div><div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-semibold">Visibility</p><p className="mt-1 text-xs text-slate-500">{isPublic ? "Anyone with the link can preview this." : "Only you can view this upload."}</p></div><button onClick={() => setIsPublic((value) => !value)} className={`rounded-full px-3 py-2 text-xs font-bold ${isPublic ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{isPublic ? "Public" : "Private"}</button></div><div className="mt-6 grid grid-cols-3 gap-2">{[["pdf", FileText, "PDFs"], ["youtube", Link2, "YouTube"], ["note", StickyNote, "Notes"]].map(([value, Icon, label]) => <button type="button" key={value as string} onClick={() => setKind(value as Draft["kind"])} className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${kind === value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"}`}><Icon size={16} />{label as string}</button>)}</div>{kind === "pdf" && <label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-indigo-400"><input type="file" multiple accept="application/pdf,.pdf" className="sr-only" onChange={(event) => addFiles(event.target.files)} /><FileText className="mx-auto text-indigo-500" /><p className="mt-2 text-sm font-semibold">Choose one or more PDFs</p><p className="mt-1 text-xs text-slate-400">Maximum 20 MB per file</p></label>}{kind === "youtube" && <div className="mt-4"><input value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); void fetchOembed(event.target.value); }} placeholder="https://youtube.com/watch?v=..." className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500" />{youtubeMetadata && <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Found: <strong>{youtubeMetadata.title}</strong> · {youtubeMetadata.author_name}</div>}<button type="button" onClick={addYoutube} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Add YouTube link</button></div>}{kind === "note" && <div className="mt-4"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a note for your study group..." className="h-28 w-full resize-none rounded-xl border border-slate-200 p-4 outline-none focus:border-indigo-500" /><button type="button" onClick={addNote} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Add note</button></div>}{drafts.length > 0 && <div className="mt-5 space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{drafts.length} attachment{drafts.length === 1 ? "" : "s"} ready</p>{drafts.map((draft) => <div key={draft.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-indigo-600">{draft.kind === "pdf" ? <FileText size={18} /> : draft.kind === "youtube" ? <Link2 size={18} /> : <StickyNote size={18} />}</div><p className="min-w-0 flex-1 truncate text-sm font-semibold">{draft.file?.name ?? draft.metadata?.title ?? (draft.content ? draft.content.slice(0, 45) : "YouTube link")}</p>  {progress[draft.id] !== undefined && <div className="w-16"><div className="h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress[draft.id]}%` }} /></div><span className="mt-1 block text-right text-[10px] text-indigo-600">{progress[draft.id]}%</span></div>}<button type="button" onClick={() => { setDrafts((items) => items.filter((item) => item.id !== draft.id)); setProgress((items) => { const next = { ...items }; delete next[draft.id]; return next; }); }} className="text-slate-400 hover:text-rose-600" aria-label="Remove attachment"><X size={16} /></button></div>)}</div>}{message && <p className="mt-3 text-sm text-rose-600">{message}</p>}<button disabled={publishing} onClick={publish} className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{publishing ? "Uploading attachments..." : "Publish upload"}</button></div></div>;
}

export default function Dashboard() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "saved" | "uploads" | "profile">("home");
  const [profile, setProfile] = useState<Profile>({ username: "student", full_name: "Student", college: "", branch: "", semester: null, avatar_url: null });
  const [userEmail, setUserEmail] = useState("");
  const [userMaterials, setUserMaterials] = useState<UploadRecord[]>([]);
  const [editingMaterial, setEditingMaterial] = useState<EditableMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<{ id: string; title: string; file_paths: string[] } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? "");
      const metadata = user.user_metadata;
      const fallbackName = metadata.full_name ?? metadata.name ?? user.email?.split("@")[0] ?? "Student";
      const fallbackUsername = `${fallbackName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "student"}_${user.id.replace(/-/g, "").slice(-6)}`;
      const { data: profileData } = await supabase.from("profiles").select("username, full_name, college, branch, semester, avatar_url").eq("id", user.id).maybeSingle();
      if (profileData) setProfile(profileData);
      else {
        const { data: created } = await supabase.from("profiles").upsert({ id: user.id, username: fallbackUsername, full_name: fallbackName, avatar_url: metadata.avatar_url ?? null }).select().single();
        if (created) setProfile(created);
      }
      const { data: uploads, error } = await supabase.from("uploads").select("id, title, description, subject, branch, semester, is_public, created_at, uploader_id, shares_count").eq("uploader_id", user.id).order("created_at", { ascending: false });
      if (!error && uploads) {
        const { data: attachments } = await supabase.from("attachments").select("id, upload_id, kind, file_path, external_url, content, metadata, sort_order").in("upload_id", uploads.map((item) => item.id)).order("sort_order");
        setUserMaterials(uploads.map((item) => {
          const children = attachments?.filter((attachment) => attachment.upload_id === item.id) ?? [];
          const counts = children.reduce<Record<string, number>>((result, attachment) => ({ ...result, [attachment.kind]: (result[attachment.kind] ?? 0) + 1 }), {});
          const summary = [["pdf", "PDF"], ["youtube", "video"], ["note", "note"]].filter(([kind]) => counts[kind]).map(([kind, label]) => `${counts[kind]} ${label}${counts[kind] === 1 ? "" : kind === "pdf" ? "s" : "s"}`).join(", ");
          return { ...item, type: children[0]?.kind ?? "note", attachment_count: children.length, attachment_summary: summary, shares_count: item.shares_count ?? 0, file_paths: children.flatMap((child) => child.file_path ? [child.file_path] : []), attachments: children as Attachment[] };
        }));
      } else {
        const { data: legacy } = await supabase.from("materials").select("id, title, description, subject, branch, semester, type, is_public, created_at, uploader_id, file_path, shares_count").eq("uploader_id", user.id).order("created_at", { ascending: false });
        if (legacy) setUserMaterials(legacy.map((item) => ({ ...item, attachment_count: 1, shares_count: item.shares_count ?? 0, file_paths: item.file_path ? [item.file_path] : [], attachments: [{ id: `${item.id}-legacy`, kind: item.type, file_path: item.file_path } as Attachment], legacy: true })));
      }
    }
    void loadProfile();
  }, []);
  const viewTitle = activeView === "saved" ? "Saved materials" : activeView === "uploads" ? "My uploads" : activeView === "profile" ? "My profile" : "Your study shelf";
  const viewDescription = activeView === "saved" ? "Everything you bookmarked for later." : activeView === "uploads" ? "Resources you have shared with your community." : activeView === "profile" ? "Manage your public profile and account details." : "A little progress is still progress. Let's make some today.";
  const uploadedCards: MaterialCard[] = userMaterials.map((item) => ({ title: item.title, subject: item.subject, meta: `${item.attachment_summary ?? `${item.type === "pdf" ? "PDF" : item.type === "youtube" ? "Video" : "Note"} · ${item.attachment_count} attachment${item.attachment_count === 1 ? "" : "s"}`} · ${item.is_public ? "Public" : "Private"}`, type: item.type, color: item.type === "pdf" ? "rose" : item.type === "youtube" ? "sky" : "amber", author: profile.full_name, time: new Date(item.created_at).toLocaleDateString(), saves: 0, attachment_count: item.attachment_count, shares_count: item.shares_count, id: item.id, is_public: item.is_public, file_paths: item.file_paths }));
  const viewMaterials: MaterialCard[] = activeView === "saved" ? materials : activeView === "uploads" ? uploadedCards : [...uploadedCards, ...materials];
  function updateShareCount(id: string) { setUserMaterials((items) => items.map((item) => item.id === id ? { ...item, shares_count: item.shares_count + 1 } : item)); }
  return <main className="min-h-screen bg-[#f7f8fc] text-slate-900"><aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-100 bg-white p-5 transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}><div className="mb-12 flex items-center gap-2.5 px-2 font-display text-xl font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white"><LayoutGrid size={18} /></span>drive<span className="text-indigo-600">.</span><button onClick={() => setMobileNav(false)} className="ml-auto lg:hidden"><X size={18} /></button></div><p className="px-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</p><nav className="mt-3 space-y-1">{[[Home, "Home", "home"], [Bookmark, "Saved materials", "saved"], [FileText, "My uploads", "uploads"], [UserRound, "My profile", "profile"]].map(([Icon, label, view]) => <button onClick={() => view === "profile" ? setSettingsOpen(true) : setActiveView(view as "home" | "saved" | "uploads")} key={label as string} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeView === view ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><Icon size={18} />{label as string}</button>)}</nav><p className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Your space</p><div className="mt-3 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm font-semibold">Share knowledge</p><p className="mt-1 text-xs leading-5 text-slate-400">Help your course-mates find their next breakthrough.</p><button onClick={() => setUploadOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 py-2 text-xs font-bold"><Plus size={15} /> Upload</button></div><Link href="/" className="absolute bottom-6 left-8 flex items-center gap-3 text-sm font-semibold text-slate-400 hover:text-slate-700"><LogOut size={17} /> Log out</Link></aside><div className="lg:pl-64"><header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-8"><button onClick={() => setMobileNav(true)} className="lg:hidden"><Menu /></button><div className="hidden items-center gap-3 text-sm text-slate-400 sm:flex"><span>Workspace</span><span>/</span><span className="font-semibold text-slate-700">Home</span></div><div className="flex items-center gap-3"><ThemeToggle /><button className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-50" aria-label="Notifications"><Bell size={19} /></button><button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 border-l border-slate-100 pl-3"><div className="grid h-9 w-9 rounded-full bg-amber-100 place-items-center text-xs font-bold text-amber-700">{profile.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{profile.full_name}</span><ChevronDown size={15} className="text-slate-400" /></button></div></header><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-indigo-600">Tuesday, 12 November</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{viewTitle}<span className="text-indigo-600">.</span></h1><p className="mt-2 text-slate-500">{viewDescription}</p></div><button onClick={() => setUploadOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"><Plus size={18} /> Upload material</button></section><div className="mt-8 grid gap-4 rounded-2xl bg-indigo-600 p-5 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-7"><div><p className="text-sm font-semibold text-indigo-200">Quick find</p><h2 className="mt-1 font-display text-xl font-bold">What are you looking for?</h2></div><div className="relative sm:w-80"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input placeholder="Search materials, subjects..." className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400" /></div></div><div className="mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-display text-xl font-bold">Made for your semester</h2><p className="mt-1 text-sm text-slate-500">Fresh resources from your study community.</p></div><div className="flex gap-2"><button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><Filter size={14} /> Filters</button><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Recent <ChevronDown className="ml-1 inline" size={13} /></button></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{viewMaterials.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center md:col-span-2"><p className="font-display font-bold">Nothing here yet.</p><p className="mt-1 text-sm text-slate-500">Upload your first resource to start building your study shelf.</p></div>}{viewMaterials.map((m) => <a href={m.id ? `/material/${m.id}` : "#"} key={m.id ?? m.title} onClick={(event) => { if (!m.id) event.preventDefault(); }} className="group rounded-2xl border border-slate-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-100"><div className="flex items-start justify-between"><div className={`icon-box bg-${m.color}-100 text-${m.color}-600`}><FileText size={19} /></div><div className="flex items-center gap-3"><button className="text-slate-300 hover:text-indigo-600" aria-label="Save material" onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}><Bookmark size={19} /></button>{m.id && <><ShareButton uploadId={m.id} title={m.title} count={m.shares_count} compact onShared={() => updateShareCount(m.id as string)} /><button onClick={(event) => { event.preventDefault(); event.stopPropagation(); const upload = userMaterials.find((item) => item.id === m.id); if (upload) setEditingMaterial({ id: upload.id, uploader_id: upload.uploader_id, title: upload.title, description: upload.description ?? "", subject: upload.subject, branch: upload.branch ?? "", semester: upload.semester ?? null, is_public: upload.is_public, attachments: upload.attachments ?? [] }); }} className="text-xs font-semibold text-slate-400 hover:text-indigo-600">Edit</button><button onClick={(event) => { event.preventDefault(); event.stopPropagation(); setDeletingMaterial({ id: m.id as string, title: m.title, file_paths: m.file_paths ?? [] }); }} className="text-slate-400 hover:text-rose-600" aria-label={`Remove ${m.title}`}><Trash2 size={16} /></button></>}</div></div><h3 className="mt-5 font-display font-bold group-hover:text-indigo-600">{m.title}</h3><p className="mt-1 text-sm text-slate-400">{m.meta} · {m.attachment_count} attachment{m.attachment_count === 1 ? "" : "s"}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400"><span>By <strong className="text-slate-600">{m.author}</strong> · {m.time}</span><span className="flex items-center gap-1"><Bookmark size={13} /> {m.saves}</span></div></a>)}</div><div className="mt-10 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Study circles</h2><a href="#" className="text-sm font-semibold text-indigo-600">View all <Share2 className="ml-1 inline" size={14} /></a></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Most active</p><p className="mt-3 font-display font-bold text-amber-950">Computer Science</p><p className="mt-1 text-sm text-amber-800/70">428 resources shared</p></div><div className="rounded-2xl bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">New circle</p><p className="mt-3 font-display font-bold text-emerald-950">Design &amp; HCI</p><p className="mt-1 text-sm text-emerald-800/70">63 students learning</p></div><div className="rounded-2xl bg-violet-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Your branch</p><p className="mt-3 font-display font-bold text-violet-950">4th Semester CSE</p><p className="mt-1 text-sm text-violet-800/70">92 new this week</p></div></div></div></div>{uploadOpen && <UploadModal close={() => setUploadOpen(false)} published={(upload) => setUserMaterials((items) => [upload, ...items])} />}  {editingMaterial && <EditMaterialModal material={editingMaterial} close={() => setEditingMaterial(null)} saved={(updated) => { setUserMaterials((items) => items.map((item) => { if (item.id !== updated.id) return item; const attachments = updated.attachments ?? []; const counts = attachments.reduce<Record<string, number>>((result, attachment) => ({ ...result, [attachment.kind]: (result[attachment.kind] ?? 0) + 1 }), {}); const attachmentSummary = [["pdf", "PDF"], ["youtube", "video"], ["note", "note"]].filter(([attachmentKind]) => counts[attachmentKind]).map(([attachmentKind, label]) => `${counts[attachmentKind]} ${label}${counts[attachmentKind] === 1 ? "" : "s"}`).join(", "); return { ...item, ...updated, type: attachments[0]?.kind ?? "note", attachment_count: attachments.length, attachment_summary: attachmentSummary, file_paths: attachments.flatMap((attachment) => attachment.file_path ? [attachment.file_path] : []) }; })); setEditingMaterial(null); }} />}{deletingMaterial && <DeleteMaterialModal material={deletingMaterial} close={() => setDeletingMaterial(null)} removed={(id) => { setUserMaterials((items) => items.filter((item) => item.id !== id)); setDeletingMaterial(null); }} />}{settingsOpen && <AccountSettings profile={profile} userEmail={userEmail} close={() => setSettingsOpen(false)} onSaved={(nextProfile) => { setProfile(nextProfile); setSettingsOpen(false); }} onLogout={() => setSettingsOpen(false)} />}</main>;
}
