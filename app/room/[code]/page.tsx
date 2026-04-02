"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getColor, initials } from "@/lib/utils";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: '0.02em' };
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 };

export default function RoomPage() {
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [myName, setMyName] = useState("");
  const [tab, setTab] = useState("transcript");
  const [turns, setTurns] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("Assembling the council...");
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
    if (memberList.filter(m => m.vote === true).length >= Math.ceil(total / 2)) {
      hasTriggered.current = true;
      triggerDebate(memberList, currentRoom);
    }
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
    const prompt = `You are facilitating a synthetic boardroom debate between ${memberList.length} distinct personalities. Each person has real opinions — they disagree, push back, change their mind when convinced.\n\nCouncil members:\n${profiles}\n\nChallenge:\n${currentRoom.topic}\n\nRules:\n- Format every line as: Name: dialogue\n- Each person speaks at least 4-5 times\n- Real disagreement\n- At least one person changes their position\n- Raw, sharp, late-night founder energy\n\nOutput ONLY the transcript.`;
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, code }) });
      const { transcript } = await res.json();
      await supabase.from("rooms").update({ transcript }).eq("code", code);
      parseAndSetTurns(transcript);
    } catch (e) { setGenStatus("Could not reach the API."); }
    setGenerating(false);
  }

  function parseAndSetTurns(text) {
    const lines = text.split("\n").filter(l => l.trim());
    const parsed = [];
    lines.forEach(line => { const match = line.match(/^([A-Za-z ]+?):\s*(.+)/); if (match) parsed.push({ name: match[1].trim(), text: match[2].trim() }); });
    setTurns(parsed);
  }

  const yesVotes = members.filter(m => m.vote === true).length;
  const total = members.length;
  const myVote = members.find(m => m.name === myName)?.vote;
  const votePct = total > 0 ? Math.round((yesVotes / total) * 100) : 0;

  if (notFound) return (
    <main className="wood-grain min-h-screen flex items-center justify-center relative z-10">
      <div className="text-center relative z-10">
        <div className="text-[#5c3010] text-sm mb-3">Room not found</div>
        <a href="/" className="text-[#5c0403] text-sm hover:underline">← Back to boardroom</a>
      </div>
    </main>
  );

  if (!room) return (
    <main className="wood-grain min-h-screen flex items-center justify-center relative z-10">
      <div className="text-[#5c3010] text-sm relative z-10">Unlocking the chamber...</div>
    </main>
  );

  return (
    <main className="wood-grain min-h-screen px-4 py-10 relative z-10 overflow-x-hidden">
      <div className="max-w-2xl mx-auto relative z-10">

        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <a href="/" className="text-[#5c3010] hover:text-[#1a0e08] text-xs mb-2 block transition-colors">← Synthetic Boardroom</a>
            <h1 className="text-xl text-[#1a0e08] mb-1 leading-tight" style={OSWALD}>{room.topic}</h1>
            <div className="text-[#5c3010] text-sm" style={PLAYFAIR}>{room.started ? "Session in progress" : `${total} member${total !== 1 ? "s" : ""} · Awaiting quorum`}</div>
          </div>
          <div className="font-mono text-sm font-medium text-[#5c0403] tracking-widest border border-[#5c0403]/50 bg-white/40 px-3 py-1.5 rounded-lg flex-shrink-0 backdrop-blur-sm">
            {code}
          </div>
        </div>

        {!room.started && (
          <>
            <div className="border border-[#5c0403]/25 bg-white/30 rounded-xl p-4 mb-4 backdrop-blur-sm">
              <div className="text-xs font-medium text-[#5c0403] uppercase tracking-widest mb-1.5" style={OSWALD}>Invite Others</div>
              <div className="text-sm text-[#3d2010]" style={PLAYFAIR}>Share room code: <span className="font-mono font-medium text-[#1a0e08]">{code}</span></div>
            </div>

            <div className="mb-4">
              <div className="text-xs font-medium text-[#5c0403] uppercase tracking-widest mb-3" style={OSWALD}>Council Members</div>
              <div className="space-y-2">
                {members.map(m => {
                  const c = getColor(m.color_index);
                  return (
                    <div key={m.id} className="flex items-center justify-between border border-[#5c0403]/20 bg-white/35 rounded-xl px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{background:c.bg,color:c.fg}}>{initials(m.name)}</div>
                        <div>
                          <div className="text-[#1a0e08] text-sm font-medium">{m.name} {m.name === myName && <span className="text-[#5c3010] font-normal text-xs">(you)</span>}</div>
                          <div className="text-[#5c3010] text-xs" style={PLAYFAIR}>{m.is_creator ? "Room creator" : "Member"}</div>
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${m.vote === true ? "bg-[#5c0403] text-[#f5e6d3]" : m.vote === false ? "bg-[#3d2010]/20 text-[#3d2010]" : "bg-black/10 text-[#5c3010]"}`} style={PLAYFAIR}>
                        {m.vote === true ? "✓ Ready" : m.vote === false ? "Not yet" : "Waiting"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-[#5c0403]/25 bg-white/30 rounded-xl p-5 mb-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[#1a0e08] text-base" style={OSWALD}>Call the session to order?</div>
                  <div className="text-[#5c3010] text-xs mt-0.5" style={PLAYFAIR}>Majority vote convenes the council</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full border ${yesVotes >= Math.ceil(total/2) && total >= 2 ? "border-[#5c0403] bg-[#5c0403]/10 text-[#5c0403]" : "border-[#5c3010]/30 text-[#5c3010]"}`} style={PLAYFAIR}>
                  {yesVotes >= Math.ceil(total/2) && total >= 2 ? "Convening..." : `${yesVotes}/${total} ready`}
                </div>
              </div>
              <div className="h-px bg-[#5c0403]/15 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-[#5c0403] rounded-full transition-all duration-500" style={{width:`${votePct}%`}} />
              </div>
              <div className="text-[#5c3010] text-xs mb-4" style={PLAYFAIR}>{yesVotes} of {total} voted · need {Math.ceil(total/2)} to convene</div>
              {myName && (
                <div className="flex gap-2">
                  <button onClick={() => castVote(true)} className={`flex-1 py-2.5 rounded-lg text-sm transition-all ${myVote === true ? "bg-[#5c0403] text-[#f5e6d3]" : "border border-[#5c0403]/40 text-[#3d2010] hover:bg-[#5c0403]/10"}`} style={OSWALD}>
                    AYE, CONVENE
                  </button>
                  <button onClick={() => castVote(false)} className={`flex-1 py-2.5 rounded-lg text-sm transition-all ${myVote === false ? "bg-[#3d2010]/20 text-[#1a0e08] border border-[#3d2010]/30" : "border border-[#3d2010]/30 text-[#5c3010] hover:bg-[#3d2010]/10"}`} style={OSWALD}>
                    NOT YET
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {room.started && (
          <>
            <div className="flex gap-1 border-b border-[#5c0403]/20 mb-6">
              {["transcript","members"].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm capitalize transition-colors ${tab === t ? "text-[#1a0e08] border-b-2 border-[#5c0403] font-medium" : "text-[#5c3010] hover:text-[#1a0e08]"}`}
                  style={{...OSWALD, marginBottom:"-1px", fontSize:'0.8rem'}}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {tab === "transcript" && (
              <div>
                {generating && (
                  <div className="flex items-center gap-3 text-[#5c3010] text-sm mb-6">
                    <div className="w-4 h-4 border-2 border-[#c99a58] border-t-[#5c0403] rounded-full animate-spin flex-shrink-0" />
                    <span style={PLAYFAIR}>{genStatus}</span>
                  </div>
                )}
                <div className="space-y-6">
                  {turns.map((turn, i) => {
                    const m = members.find(x => x.name.toLowerCase() === turn.name.toLowerCase());
                    const c = getColor(m?.color_index ?? i % 8);
                    return (
                      <div key={i} className="flex gap-4 fade-up">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5" style={{background:c.bg,color:c.fg}}>{initials(turn.name)}</div>
                        <div>
                          <div className="text-xs text-[#5c0403] mb-1.5 uppercase tracking-wider" style={OSWALD}>{turn.name}</div>
                          <div className="text-[#2a1408] text-sm leading-relaxed" style={PLAYFAIR}>{turn.text}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}

            {tab === "members" && (
              <div className="space-y-3">
                {members.map(m => {
                  const c = getColor(m.color_index);
                  return (
                    <div key={m.id} className="border border-[#5c0403]/20 bg-white/35 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium" style={{background:c.bg,color:c.fg}}>{initials(m.name)}</div>
                        <div>
                          <div className="text-[#1a0e08] text-sm font-medium">{m.name} {m.name === myName && <span className="text-[#5c3010] text-xs">(you)</span>}</div>
                          <div className="text-[#5c3010] text-xs" style={PLAYFAIR}>{m.is_creator ? "Room creator" : "Member"}</div>
                        </div>
                      </div>
                      <div className="text-[#3d2010] text-xs leading-relaxed border-l-2 border-[#5c0403]/30 pl-3" style={PLAYFAIR}>"{m.personality.slice(0,160)}{m.personality.length > 160 ? "..." : ""}"</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}