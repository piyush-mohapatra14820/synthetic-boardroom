"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { genCode } from "@/lib/utils";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: '0.02em' };
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 };

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
    if (!cName.trim() || !cTopic.trim() || !cPersonality.trim()) { setError("Fill in your name, topic, and personality."); return; }
    setLoading(true); setError("");
    try {
      const code = genCode();
      const { error: roomErr } = await supabase.from("rooms").insert({ code, topic: cTopic.trim(), created_by: cName.trim(), started: false });
      if (roomErr) throw roomErr;
      await supabase.from("members").insert({ room_code: code, name: cName.trim(), personality: cPersonality.trim(), color_index: 0, is_creator: true, vote: null });
      localStorage.setItem(`boardroom_${code}_user`, cName.trim());
      router.push(`/room/${code}`);
    } catch (e) { setError(e.message || "Failed."); setLoading(false); }
  }

  async function joinRoom() {
    const code = jCode.trim().toUpperCase();
    if (!code || !jName.trim() || !jPersonality.trim()) { setError("Enter the room code, your name, and personality."); return; }
    setLoading(true); setError("");
    try {
      const { data: room, error: roomErr } = await supabase.from("rooms").select("*").eq("code", code).single();
      if (roomErr || !room) throw new Error("Room not found.");
      if (room.started) throw new Error("Session already started.");
      const { data: existing } = await supabase.from("members").select("name").eq("room_code", code).eq("name", jName.trim());
      if (existing && existing.length > 0) throw new Error("Name already taken.");
      const { data: members } = await supabase.from("members").select("color_index").eq("room_code", code);
      await supabase.from("members").insert({ room_code: code, name: jName.trim(), personality: jPersonality.trim(), color_index: (members?.length || 0) % 8, is_creator: false, vote: null });
      localStorage.setItem(`boardroom_${code}_user`, jName.trim());
      router.push(`/room/${code}`);
    } catch (e) { setError(e.message || "Failed."); setLoading(false); }
  }

  const inputCls = "w-full bg-black/8 border border-[#5c0403]/30 rounded-lg px-4 py-3 text-[#1a0e08] text-sm placeholder-[#8a6a4a] focus:outline-none focus:border-[#5c0403] focus:bg-white/40 transition-colors";
  const labelCls = "block text-xs font-medium text-[#5c0403] uppercase tracking-widest mb-2";

  return (
    <main className="wood-grain min-h-screen flex items-center justify-center px-6 py-16 relative z-10 overflow-x-hidden">
      <div className="w-full max-w-md relative z-10">

        {mode === "home" && (
          <div className="fade-up text-center">
            <div className="mb-3">
              <span className="text-[#5c0403]/70 text-xs uppercase tracking-[0.3em]" style={PLAYFAIR}>Private Beta</span>
            </div>

            <h1 className="text-[clamp(2.8rem,13vw,5.5rem)] text-[#1a0e08] leading-none mb-1" style={OSWALD}>
              SYNTHETIC
            </h1>
            <h1 className="text-[clamp(2.8rem,13vw,5.5rem)] text-[#5c0403] leading-none mb-5" style={OSWALD}>
              BOARDROOM
            </h1>

            <div className="w-12 h-px bg-[#5c0403]/60 mx-auto mb-5"></div>

            <p className="text-[#3d2010] text-sm leading-relaxed mb-10 max-w-xs mx-auto" style={PLAYFAIR}>
              Upload your personality. Your digital self debates with the sharpest minds in your network — no calendars, no egos. Just signal.
            </p>

            <div className="space-y-3">
              <button onClick={() => { setMode("create"); setError(""); }}
                className="w-full text-left px-5 py-4 rounded-xl border border-[#5c0403]/40 bg-white/25 hover:bg-white/40 hover:border-[#5c0403]/70 transition-all group backdrop-blur-sm shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[#1a0e08] text-base mb-0.5" style={OSWALD}>CONVENE A ROOM</div>
                    <div className="text-[#5c3010] text-xs" style={PLAYFAIR}>Start a boardroom. Share the code with your people.</div>
                  </div>
                  <div className="text-[#5c0403] group-hover:translate-x-0.5 transition-transform flex-shrink-0 text-lg">→</div>
                </div>
              </button>

              <button onClick={() => { setMode("join"); setError(""); }}
                className="w-full text-left px-5 py-4 rounded-xl border border-[#3d2010]/30 bg-white/20 hover:bg-white/35 hover:border-[#3d2010]/50 transition-all group backdrop-blur-sm shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[#1a0e08] text-base mb-0.5" style={OSWALD}>JOIN A ROOM</div>
                    <div className="text-[#5c3010] text-xs" style={PLAYFAIR}>Enter a code and upload your personality.</div>
                  </div>
                  <div className="text-[#3d2010] group-hover:translate-x-0.5 transition-transform flex-shrink-0 text-lg">→</div>
                </div>
              </button>
            </div>

            <div className="mt-8 flex items-center gap-3 justify-center">
              <div className="h-px flex-1 bg-[#5c0403]/20"></div>
              <span className="text-[#5c0403]/50 text-xs uppercase tracking-widest flex-shrink-0" style={PLAYFAIR}>Built for founders</span>
              <div className="h-px flex-1 bg-[#5c0403]/20"></div>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="fade-up">
            <button onClick={() => { setMode("home"); setError(""); }} className="text-[#5c3010] hover:text-[#1a0e08] text-sm mb-6 transition-colors">← Back</button>
            <h2 className="text-3xl text-[#1a0e08] mb-1 leading-tight" style={OSWALD}>CONVENE A ROOM</h2>
            <div className="w-8 h-px bg-[#5c0403] mb-6"></div>
            <div className="space-y-4">
              <div><label className={labelCls}>Your name</label><input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Piyush" className={inputCls} /></div>
              <div><label className={labelCls}>The challenge</label><textarea value={cTopic} onChange={e => setCTopic(e.target.value)} placeholder="e.g. How do we position Tagda Raho against legacy gym culture?" rows={3} className={inputCls + " resize-none"} /></div>
              <div>
                <label className={labelCls}>Personality file</label>
                <label className="flex flex-col items-center border border-dashed border-[#5c0403]/40 rounded-lg p-4 cursor-pointer hover:border-[#5c0403] hover:bg-white/20 transition-colors">
                  <div className="text-[#5c3010] text-sm mb-0.5" style={OSWALD}>{cFileName || "UPLOAD .MD FILE"}</div>
                  <div className="text-[#5c0403]/60 text-xs" style={PLAYFAIR}>{cFileName ? "✓ Loaded" : "Click to browse"}</div>
                  <input type="file" accept=".md,.txt" className="hidden" onChange={e => handleFile(e, setCPersonality, setCFileName)} />
                </label>
              </div>
              <div><label className={labelCls}>Or paste personality</label><textarea value={cPersonality} onChange={e => setCPersonality(e.target.value)} placeholder="How you think, what you prioritize, your blind spots..." rows={4} className={inputCls + " resize-none"} /></div>
              {error && <p className="text-red-700 text-sm">{error}</p>}
              <button onClick={createRoom} disabled={loading} className="w-full bg-[#5c0403] hover:bg-[#7a0504] text-[#f5e6d3] py-3.5 rounded-lg text-sm transition-colors disabled:opacity-40 shadow-md" style={OSWALD}>
                {loading ? "CREATING..." : "OPEN THE BOARDROOM →"}
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="fade-up">
            <button onClick={() => { setMode("home"); setError(""); }} className="text-[#5c3010] hover:text-[#1a0e08] text-sm mb-6 transition-colors">← Back</button>
            <h2 className="text-3xl text-[#1a0e08] mb-1 leading-tight" style={OSWALD}>JOIN A ROOM</h2>
            <div className="w-8 h-px bg-[#5c0403] mb-6"></div>
            <div className="space-y-4">
              <div><label className={labelCls}>Room code</label><input value={jCode} onChange={e => setJCode(e.target.value.toUpperCase())} placeholder="ALPHA" className={inputCls + " font-mono tracking-widest uppercase"} /></div>
              <div><label className={labelCls}>Your name</label><input value={jName} onChange={e => setJName(e.target.value)} placeholder="Your name" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Personality file</label>
                <label className="flex flex-col items-center border border-dashed border-[#5c0403]/40 rounded-lg p-4 cursor-pointer hover:border-[#5c0403] hover:bg-white/20 transition-colors">
                  <div className="text-[#5c3010] text-sm mb-0.5" style={OSWALD}>{jFileName || "UPLOAD .MD FILE"}</div>
                  <div className="text-[#5c0403]/60 text-xs" style={PLAYFAIR}>{jFileName ? "✓ Loaded" : "Click to browse"}</div>
                  <input type="file" accept=".md,.txt" className="hidden" onChange={e => handleFile(e, setJPersonality, setJFileName)} />
                </label>
              </div>
              <div><label className={labelCls}>Or paste personality</label><textarea value={jPersonality} onChange={e => setJPersonality(e.target.value)} placeholder="How you think, your communication style..." rows={4} className={inputCls + " resize-none"} /></div>
              {error && <p className="text-red-700 text-sm">{error}</p>}
              <button onClick={joinRoom} disabled={loading} className="w-full bg-[#5c0403] hover:bg-[#7a0504] text-[#f5e6d3] py-3.5 rounded-lg text-sm transition-colors disabled:opacity-40 shadow-md" style={OSWALD}>
                {loading ? "JOINING..." : "TAKE YOUR SEAT →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}