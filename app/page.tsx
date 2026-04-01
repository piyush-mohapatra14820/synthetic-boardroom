"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { genCode, getColor } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cName, setCName] = useState("");
  const [cTopic, setCTopic] = useState("");
  const [cPersonality, setCPersonality] = useState("");
  const [cFileName, setCFileName] = useState("");
  const [jCode, setJCode] = useState("");
  const [jName, setJName] = useState("");
  const [jPersonality, setJPersonality] = useState("");
  const [jFileName, setJFileName] = useState("");

  function handleFile(e, setter, nameSetter) {
    const file = e.target.files?.[0];
    if (!file) return;
    nameSetter(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result);
    reader.readAsText(file);
  }

  async function createRoom() {
    if (!cName.trim() || !cTopic.trim() || !cPersonality.trim()) { setError("Please fill in your name, the topic, and your personality."); return; }
    setLoading(true); setError("");
    try {
      const code = genCode();
      const { error: roomErr } = await supabase.from("rooms").insert({ code, topic: cTopic.trim(), created_by: cName.trim(), started: false });
      if (roomErr) throw roomErr;
      const { error: memErr } = await supabase.from("members").insert({ room_code: code, name: cName.trim(), personality: cPersonality.trim(), color_index: 0, is_creator: true, vote: null });
      if (memErr) throw memErr;
      localStorage.setItem(`boardroom_${code}_user`, cName.trim());
      router.push(`/room/${code}`);
    } catch (e) { setError(e.message || "Failed to create room."); setLoading(false); }
  }

  async function joinRoom() {
    const code = jCode.trim().toUpperCase();
    if (!code || !jName.trim() || !jPersonality.trim()) { setError("Please enter the room code, your name, and your personality."); return; }
    setLoading(true); setError("");
    try {
      const { data: room, error: roomErr } = await supabase.from("rooms").select("*").eq("code", code).single();
      if (roomErr || !room) throw new Error("Room not found. Check the code.");
      if (room.started) throw new Error("This session has already started.");
      const { data: existing } = await supabase.from("members").select("name").eq("room_code", code).eq("name", jName.trim());
      if (existing && existing.length > 0) throw new Error("That name is already taken in this room.");
      const { data: members } = await supabase.from("members").select("color_index").eq("room_code", code);
      const colorIndex = (members?.length || 0) % 8;
      const { error: memErr } = await supabase.from("members").insert({ room_code: code, name: jName.trim(), personality: jPersonality.trim(), color_index: colorIndex, is_creator: false, vote: null });
      if (memErr) throw memErr;
      localStorage.setItem(`boardroom_${code}_user`, jName.trim());
      router.push(`/room/${code}`);
    } catch (e) { setError(e.message || "Failed to join room."); setLoading(false); }
  }

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600";
  const btnPrimary = "w-full bg-white text-black font-medium py-3 rounded-lg text-sm hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {mode === "home" && (
          <div className="fade-up">
            <div className="mb-10">
              <div className="flex gap-2 mb-6">
                {[0,1,2,3].map(i => { const c = getColor(i); return <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{background:c.bg,color:c.fg}}>{["PM","MZ","SK","AR"][i]}</div>; })}
              </div>
              <h1 className="text-3xl font-medium text-white tracking-tight mb-3">Synthetic Boardroom</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">Upload your personality file. Your digital self debates with others — no calendar invite, no ego, no scheduling. Just signal.</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => { setMode("create"); setError(""); }} className="w-full text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-all group">
                <div className="flex items-center justify-between"><div><div className="text-white font-medium mb-1">Create a room</div><div className="text-zinc-500 text-sm">Start a boardroom. Share the code with your people.</div></div><div className="text-zinc-600 group-hover:text-zinc-400 text-lg">→</div></div>
              </button>
              <button onClick={() => { setMode("join"); setError(""); }} className="w-full text-left p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-all group">
                <div className="flex items-center justify-between"><div><div className="text-white font-medium mb-1">Join a room</div><div className="text-zinc-500 text-sm">Enter a code and upload your personality to join.</div></div><div className="text-zinc-600 group-hover:text-zinc-400 text-lg">→</div></div>
              </button>
            </div>
            <p className="text-center text-zinc-700 text-xs mt-8">Private beta · Built for founders</p>
          </div>
        )}
        {mode === "create" && (
          <div className="fade-up">
            <button onClick={() => { setMode("home"); setError(""); }} className="text-zinc-500 hover:text-zinc-300 text-sm mb-8 transition-colors">← Back</button>
            <h2 className="text-xl font-medium text-white mb-6">Create a boardroom</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Your name</label><input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Piyush" className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Room topic</label><textarea value={cTopic} onChange={e => setCTopic(e.target.value)} placeholder="e.g. How should we position Tagda Raho against legacy gym culture?" rows={3} className={inputCls + " resize-none"} /></div>
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Personality file</label><label className="flex flex-col items-center border border-dashed border-zinc-700 rounded-lg p-6 cursor-pointer hover:border-zinc-500 transition-colors"><div className="text-zinc-400 text-sm font-medium mb-1">{cFileName || "Upload .md file"}</div><div className="text-zinc-600 text-xs">{cFileName ? "Loaded ✓" : "Click to browse"}</div><input type="file" accept=".md,.txt" className="hidden" onChange={e => handleFile(e, setCPersonality, setCFileName)} /></label></div>
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Or paste personality</label><textarea value={cPersonality} onChange={e => setCPersonality(e.target.value)} placeholder="Describe how you think, what you prioritize, your decision-making style..." rows={5} className={inputCls + " resize-none"} /></div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={createRoom} disabled={loading} className={btnPrimary}>{loading ? "Creating..." : "Create boardroom →"}</button>
            </div>
          </div>
        )}
        {mode === "join" && (
          <div className="fade-up">
            <button onClick={() => { setMode("home"); setError(""); }} className="text-zinc-500 hover:text-zinc-300 text-sm mb-8 transition-colors">← Back</button>
            <h2 className="text-xl font-medium text-white mb-6">Join a boardroom</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Room code</label><input value={jCode} onChange={e => setJCode(e.target.value.toUpperCase())} placeholder="e.g. ALPHA" className={inputCls + " font-mono tracking-widest uppercase"} /></div>
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Your name</label><input value={jName} onChange={e => setJName(e.target.value)} placeholder="Your name" className={inputCls} /></div>
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Personality file</label><label className="flex flex-col items-center border border-dashed border-zinc-700 rounded-lg p-6 cursor-pointer hover:border-zinc-500 transition-colors"><div className="text-zinc-400 text-sm font-medium mb-1">{jFileName || "Upload .md file"}</div><div className="text-zinc-600 text-xs">{jFileName ? "Loaded ✓" : "Click to browse"}</div><input type="file" accept=".md,.txt" className="hidden" onChange={e => handleFile(e, setJPersonality, setJFileName)} /></label></div>
              <div><label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Or paste personality</label><textarea value={jPersonality} onChange={e => setJPersonality(e.target.value)} placeholder="Describe how you think..." rows={5} className={inputCls + " resize-none"} /></div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={joinRoom} disabled={loading} className={btnPrimary}>{loading ? "Joining..." : "Join boardroom →"}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}