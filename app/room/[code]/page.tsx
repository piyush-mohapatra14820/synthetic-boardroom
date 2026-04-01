"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getColor, initials } from "@/lib/utils";

export default function RoomPage() {
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [myName, setMyName] = useState("");
  const [tab, setTab] = useState("transcript");
  const [turns, setTurns] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("Calling the council to order...");
  const [notFound, setNotFound] = useState(false);
  const bottomRef = useRef(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(`boardroom_${code}_user`);
    if (stored) setMyName(stored);
    loadRoom();
  }, [code]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  async function loadRoom() {
    const { data: r, error } = await supabase.from("rooms").select("*").eq("code", code).single();
    if (error || !r) { setNotFound(true); return; }
    setRoom(r);
    if (r.transcript) parseAndSetTurns(r.transcript);
    const { data: m } = await supabase.from("members").select("*").eq("room_code", code).order("joined_at");
    if (m) setMembers(m);
    supabase.channel(`room-${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (payload) => {
        setRoom(payload.new);
        if (payload.new.transcript) parseAndSetTurns(payload.new.transcript);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `room_code=eq.${code}` }, async () => {
        const { data: m2 } = await supabase.from("members").select("*").eq("room_code", code).order("joined_at");
        if (m2) { setMembers(m2); checkMajority(m2, r); }
      })
      .subscribe();
  }

  function checkMajority(memberList, currentRoom) {
    if (currentRoom?.started || hasTriggered.current) return;
    const total = memberList.length;
    if (total < 2) return;
    const yesVotes = memberList.filter(m => m.vote === true).length;
    if (yesVotes >= Math.ceil(total / 2)) { hasTriggered.current = true; triggerDebate(memberList, currentRoom); }
  }

  async function castVote(val) {
    if (!myName || room?.started) return;
    await supabase.from("members").update({ vote: val }).eq("room_code", code).eq("name", myName);
    const { data: m } = await supabase.from("members").select("*").eq("room_code", code).order("joined_at");
    if (m && room) { setMembers(m); checkMajority(m, room); }
  }

  async function triggerDebate(memberList, currentRoom) {
    await supabase.from("rooms").update({ started: true }).eq("code", code);
    setGenerating(true);
    const profiles = memberList.map(m => `**${m.name}**: ${m.personality}`).join("\n\n");
    const prompt = `You are facilitating a synthetic boardroom debate between ${memberList.length} distinct personalities. Each person has real opinions — they disagree, push back, change their mind when convinced, and arrive at something useful together.\n\nCouncil members:\n${profiles}\n\nChallenge:\n${currentRoom.topic}\n\nRules:\n- Format every line as: Name: dialogue\n- Each person speaks at least 4-5 times\n- Real disagreement — no one agrees immediately\n- At least one person must change their position\n- No filler phrases\n- Raw, sharp, direct — like a late-night founder session\n\nOutput ONLY the transcript. No preamble.`;
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, code }) });
      if (!res.ok) throw new Error("API error");
      const { transcript } = await res.json();
      await supabase.from("rooms").update({ transcript }).eq("code", code);
      parseAndSetTurns(transcript);
    } catch (e) { setGenStatus("Could not reach the API. Check your Anthropic key."); }
    setGenerating(false);
  }

  function parseAndSetTurns(text) {
    const lines = text.split("\n").filter(l => l.trim());
    const parsed = [];
    lines.forEach(line => { const match = line.match(/^([A-Za-z ]+?):\s*(.+)/); if (match) parsed.push({ name: match[1].trim(), text: match[2].trim() }); });
    setTurns(parsed);
  }

  const myVote = members.find(m => m.name === myName)?.vote;
  const yesVotes = members.filter(m => m.vote === true).length;
  const total = members.length;
  const votePct = total > 0 ? Math.round((yesVotes / total) * 100) : 0;

  if (notFound) return <main className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-zinc-500 text-sm mb-2">Room not found</div><a href="/" className="text-white text-sm underline">Back to home</a></div></main>;
  if (!room) return <main className="min-h-screen flex items-center justify-center"><div className="text-zinc-500 text-sm">Loading...</div></main>;

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div><a href="/" className="text-zinc-600 hover:text-zinc-400 text-xs mb-3 block">← Synthetic Boardroom</a><h1 className="text-xl font-medium text-white mb-1">{room.topic}</h1><div className="text-zinc-500 text-sm">{room.started ? "Session in progress" : `${total} member${total !== 1 ? "s" : ""} · Waiting to convene`}</div></div>
          <div className="font-mono text-lg font-medium text-zinc-400 tracking-widest bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">{code}</div>
        </div>

        {!room.started && (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Invite others</div>
              <div className="font-mono text-sm text-zinc-400">Room code: <span className="text-white font-medium">{code}</span></div>
            </div>
            <div className="mb-6">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Council members</div>
              <div className="space-y-2">
                {members.map(m => { const c = getColor(m.color_index); return (
                  <div key={m.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{background:c.bg,color:c.fg}}>{initials(m.name)}</div>
                      <div><div className="text-white text-sm font-medium">{m.name}{m.name === myName && <span className="text-zinc-600 font-normal text-xs"> (you)</span>}</div><div className="text-zinc-600 text-xs">{m.is_creator ? "Room creator" : "Member"}</div></div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${m.vote === true ? "bg-emerald-950 text-emerald-400" : m.vote === false ? "bg-red-950 text-red-400" : "bg-zinc-800 text-zinc-500"}`}>{m.vote === true ? "✓ Ready" : m.vote === false ? "Not ready" : "Waiting"}</div>
                  </div>
                ); })}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div><div className="text-white text-sm font-medium">Ready to convene?</div><div className="text-zinc-500 text-xs mt-1">Majority vote starts the session</div></div>
                <div className={`text-xs px-2 py-1 rounded-full ${yesVotes >= Math.ceil(total/2) && total >= 2 ? "bg-emerald-950 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>{yesVotes >= Math.ceil(total/2) && total >= 2 ? "Starting..." : `${yesVotes}/${total} ready`}</div>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{width:`${votePct}%`}} /></div>
              <div className="text-zinc-500 text-xs mb-4">{yesVotes} of {total} voted · need {Math.ceil(total/2)} to convene</div>
              {myName && <div className="flex gap-2">
                <button onClick={() => castVote(true)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${myVote === true ? "bg-emerald-900 text-emerald-300 border border-emerald-700" : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>Vote to start</button>
                <button onClick={() => castVote(false)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${myVote === false ? "bg-red-950 text-red-400 border border-red-900" : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>Not ready</button>
              </div>}
            </div>
          </>
        )}

        {room.started && (
          <>
            <div className="flex gap-1 border-b border-zinc-800 mb-6">
              {["transcript","members"].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm capitalize transition-colors ${tab === t ? "text-white border-b-2 border-white font-medium" : "text-zinc-500 hover:text-zinc-300"}`} style={{marginBottom:"-1px"}}>{t}</button>)}
            </div>
            {tab === "transcript" && (
              <div>
                {generating && <div className="flex items-center gap-3 text-zinc-500 text-sm mb-6"><div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />{genStatus}</div>}
                <div className="space-y-6">
                  {turns.map((turn, i) => { const m = members.find(x => x.name.toLowerCase() === turn.name.toLowerCase()); const c = getColor(m?.color_index ?? i % 8); return (
                    <div key={i} className="flex gap-4 fade-up">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5" style={{background:c.bg,color:c.fg}}>{initials(turn.name)}</div>
                      <div><div className="text-xs text-zinc-500 mb-1.5 font-medium">{turn.name}</div><div className="text-zinc-200 text-sm leading-relaxed">{turn.text}</div></div>
                    </div>
                  ); })}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
            {tab === "members" && (
              <div className="space-y-3">
                {members.map(m => { const c = getColor(m.color_index); return (
                  <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium" style={{background:c.bg,color:c.fg}}>{initials(m.name)}</div><div><div className="text-white text-sm font-medium">{m.name}{m.name === myName && <span className="text-zinc-600 text-xs"> (you)</span>}</div><div className="text-zinc-600 text-xs">{m.is_creator ? "Room creator" : "Member"}</div></div></div>
                    <div className="text-zinc-500 text-xs leading-relaxed italic">"{m.personality.slice(0,160)}{m.personality.length > 160 ? "..." : ""}"</div>
                  </div>
                ); })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}