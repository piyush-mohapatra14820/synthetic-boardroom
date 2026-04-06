"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getColor, initials } from "@/lib/utils";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: "0.02em" } as const;
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 } as const;

interface Session {
  id: string;
  topic: string;
  transcript: string | null;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: { id: string; name: string; email: string; personality: string | null } | { id: string; name: string; email: string; personality: string | null }[] | null;
}

const inputCls = "w-full bg-black/8 border border-[#5c0403]/30 rounded-lg px-4 py-3 text-[#1a0e08] text-sm placeholder-[#8a6a4a] focus:outline-none focus:border-[#5c0403] transition-colors";

export default function GroupPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupContext, setGroupContext] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [topic, setTopic] = useState("");
  const [launching, setLaunching] = useState(false);
  const [tab, setTab] = useState("sessions");
  const [copied, setCopied] = useState(false);
  const [personality, setPersonality] = useState("");
  const [savingPersonality, setSavingPersonality] = useState(false);

  useEffect(() => { if (id) loadAll(); }, [id]);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    const { data: g } = await supabase.from("groups").select("*").eq("id", id).single();
    if (!g) { router.push("/dashboard"); return; }
    setGroupName(g.name);
    setGroupDesc(g.description || "");
    setGroupContext(g.context || "");
    setInviteCode(g.invite_code);
    setSessionCount(g.session_count || 0);

    const { data: m } = await supabase
      .from("group_members")
      .select("id, user_id, role, profiles(id, name, email, personality)")
      .eq("group_id", id);
    const memberList = (m || []) as any[];
    setMembers(memberList as any);

    const me = memberList.find((x: any) => x.user_id === user.id);
    if (me?.profiles) { const p = Array.isArray(me.profiles) ? me.profiles[0] : me.profiles; if (p?.personality) setPersonality(p.personality); }

    const { data: s } = await supabase
      .from("group_sessions")
      .select("id, topic, transcript, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: false });
    setSessions((s as Session[]) || []);

    supabase.channel(`group-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_sessions", filter: `group_id=eq.${id}` },
        (payload) => setSessions((prev) => [payload.new as Session, ...prev])
      ).subscribe();
  }

  async function launchSession() {
    if (!topic.trim() || launching) return;
    setLaunching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: session } = await supabase
      .from("group_sessions")
      .insert({ group_id: id, topic: topic.trim(), started_by: user.id })
      .select()
      .single();
    if (!session) { setLaunching(false); return; }
    await supabase.from("groups").update({ session_count: sessionCount + 1 }).eq("id", id);
    setTopic("");
    setLaunching(false);
    router.push(`/group/${id}/session/${session.id}`);
  }

  async function savePersonality() {
    setSavingPersonality(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ personality }).eq("id", user.id);
    setSavingPersonality(false);
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!groupName) return (
    <main className="wood-grain min-h-screen flex items-center justify-center relative z-10">
      <div className="text-[#5c3010] text-sm" style={PLAYFAIR}>Loading boardroom...</div>
    </main>
  );

  return (
    <main className="wood-grain min-h-screen px-5 py-10 relative z-10 overflow-x-hidden">
      <div className="max-w-xl mx-auto relative z-10">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <a href="/dashboard" className="text-[#5c3010] text-xs hover:text-[#1a0e08] transition-colors block mb-1">â Dashboard</a>
            <h1 className="text-2xl text-[#1a0e08] leading-tight" style={OSWALD}>{groupName.toUpperCase()}</h1>
            {groupDesc && <p className="text-[#5c3010] text-xs mt-0.5" style={PLAYFAIR}>{groupDesc}</p>}
          </div>
          <button onClick={copyInvite}
            className="flex-shrink-0 border border-[#5c0403]/40 text-[#5c0403] text-xs px-3 py-1.5 rounded-lg hover:bg-[#5c0403]/10 transition-colors"
            style={OSWALD}>
            {copied ? "COPIED â" : "COPY INVITE"}
          </button>
        </div>

        <div className="border border-[#5c0403]/25 bg-white/40 rounded-xl p-4 mb-6 backdrop-blur-sm">
          <div className="text-xs text-[#5c0403] uppercase tracking-widest mb-3" style={OSWALD}>Drop a topic â convene the council</div>
          <div className="flex gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && launchSession()}
              placeholder="What should the council debate?"
              className={inputCls} />
            <button onClick={launchSession} disabled={!topic.trim() || launching}
              className="flex-shrink-0 bg-[#5c0403] hover:bg-[#7a0504] text-[#f5e6d3] px-4 py-3 rounded-lg text-sm transition-colors disabled:opacity-40 shadow-sm"
              style={OSWALD}>
              {launching ? "..." : "â"}
            </button>
          </div>
          {groupContext && (
            <div className="mt-3 text-xs text-[#5c3010] border-l-2 border-[#5c0403]/30 pl-3" style={PLAYFAIR}>
              <span className="font-medium">Group memory active</span> Â· {sessionCount} sessions
            </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-[#5c0403]/20 mb-5">
          {["sessions", "members", "personality"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs relative transition-colors ${tab === t ? "text-[#1a0e08] font-medium" : "text-[#5c3010] hover:text-[#1a0e08]"}`}
              style={{ ...OSWALD, marginBottom: "-1px" }}>
              {t.toUpperCase()}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5c0403]" />}
            </button>
          ))}
        </div>

        {tab === "sessions" && (
          sessions.length === 0 ? (
            <div className="text-center py-12 text-[#5c3010] text-sm" style={PLAYFAIR}>
              No sessions yet. Drop a topic above to start the first one.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => router.push(`/group/${id}/session/${s.id}`)}
                  className="w-full text-left border border-[#5c0403]/20 bg-white/35 rounded-xl px-4 py-3.5 hover:bg-white/50 transition-all group backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[#1a0e08] text-sm font-medium" style={PLAYFAIR}>{s.topic}</div>
                      <div className="text-[#5c3010] text-xs mt-0.5" style={PLAYFAIR}>
                        {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {" Â· "}{s.transcript ? "Complete" : "In progress"}
                      </div>
                    </div>
                    <div className="text-[#5c0403] flex-shrink-0 group-hover:translate-x-0.5 transition-transform">â</div>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {tab === "members" && (
          <div className="space-y-2">
            {members.map((m, i) => {
              const c = getColor(i);
              const name = m.profiles?.name || m.profiles?.email || "Member";
              return (
                <div key={m.id} className="border border-[#5c0403]/20 bg-white/35 rounded-xl px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: c.bg, color: c.fg }}>
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[#1a0e08] text-sm font-medium">
                        {name} {m.user_id === userId && <span className="text-[#5c3010] text-xs font-normal">(you)</span>}
                      </div>
                      <div className="text-[#5c3010] text-xs" style={PLAYFAIR}>{m.role === "owner" ? "Boardroom owner" : "Council member"}</div>
                    </div>
                  </div>
                  {m.profiles?.personality && (
                    <div className="mt-2 text-xs text-[#5c3010] border-l-2 border-[#5c0403]/25 pl-3" style={PLAYFAIR}>
                      "{m.profiles.personality.slice(0, 100)}{m.profiles.personality.length > 100 ? "..." : ""}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "personality" && (
          <div className="space-y-3">
            <p className="text-[#5c3010] text-sm" style={PLAYFAIR}>
              Your personality shapes how your digital self debates. Be specific â decision style, values, blind spots, what you optimise for.
            </p>
            <textarea value={personality} onChange={(e) => setPersonality(e.target.value)}
              rows={8}
              placeholder="E.g. Thinks in systems. Moves fast with strong taste. Prioritises distribution. Blind spot: sometimes moves before full validation..."
              className={inputCls + " resize-none"} />
            <button onClick={savePersonality} disabled={savingPersonality}
              className="w-full bg-[#5c0403] text-[#f5e6d3] py-3 rounded-lg text-sm disabled:opacity-40 transition-colors"
              style={OSWALD}>
              {savingPersonality ? "SAVING..." : "SAVE PERSONALITY â"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
