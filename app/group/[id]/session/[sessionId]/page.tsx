"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getColor, initials } from "@/lib/utils";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: '0.02em' };
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 };

export default function SessionPage() {
  const { id, sessionId } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [turns, setTurns] = useState([]);
  const [brief, setBrief] = useState(null);
  const [tab, setTab] = useState("transcript");
  const [generating, setGenerating] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const bottomRef = useRef(null);
  const hasRun = useRef(false);
  const hasBriefed = useRef(false);

  useEffect(() => { loadAll(); }, [sessionId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns]);

  async function loadAll() {
    const { data: s } = await supabase.from('group_sessions').select('*').eq('id', sessionId).single();
    if (!s) { router.push(`/group/${id}`); return; }
    setSession(s);
    if (s.transcript) { parseAndSetTurns(s.transcript); if (!hasRun.current) hasRun.current = true; }
    if (s.brief) { try { setBrief(JSON.parse(s.brief)); hasBriefed.current = true; } catch {} }
    const { data: g } = await supabase.from('groups').select('*').eq('id', id).single();
    setGroup(g);
    const { data: m } = await supabase.from('group_members').select('*, profiles(id, name, personality)').eq('group_id', id);
    setMembers(m || []);
    if (!s.transcript && !hasRun.current) {
      hasRun.current = true;
      runDebate(s, g, m || []);
    }
    supabase.channel(`session-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_sessions', filter: `id=eq.${sessionId}` }, payload => {
        if (payload.new.transcript) parseAndSetTurns(payload.new.transcript);
        if (payload.new.brief) { try { setBrief(JSON.parse(payload.new.brief)); } catch {} }
      }).subscribe();
  }

  async function runDebate(s, g, memberList) {
    setGenerating(true);
    const profiles = memberList.map(m => `**${m.profiles?.name || 'Member'}**: ${m.profiles?.personality || 'No personality set yet — debate as a thoughtful generalist.'}`).join('\n\n');
    const contextBlock = g?.context ? `\n\n[GROUP CONTEXT — from ${g.session_count || 0} previous sessions]\n${g.context}\n` : '';
    const prompt = `You are facilitating a synthetic boardroom debate between ${memberList.length} distinct personalities. Real opinions, real disagreement, raw founder energy.${contextBlock}\n\nCouncil:\n${profiles}\n\nChallenge:\n${s.topic}\n\nRules:\n- Format every line as: Name: dialogue\n- Each person speaks 4+ times\n- Real pushback — no immediate agreement\n- At least one person changes their position based on the argument\n- If group context is provided, have members reference past decisions naturally\n\nOutput ONLY the transcript.`;
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, code: sessionId }) });
      const data = await res.json();
      if (data.transcript) {
        await supabase.from('group_sessions').update({ transcript: data.transcript, completed_at: new Date().toISOString() }).eq('id', sessionId);
        parseAndSetTurns(data.transcript);
        generateBrief(data.transcript, s.topic, g);
      }
    } catch {}
    setGenerating(false);
  }

  async function generateBrief(transcript, topic, g) {
    if (hasBriefed.current) return;
    hasBriefed.current = true;
    setGeneratingBrief(true);
    const prompt = `You observed a boardroom debate on: "${topic}"\n\nTranscript:\n${transcript}\n\nGenerate a structured action brief. Return ONLY valid JSON:\n{"summary":"2-3 sentence synthesis","conclusions":[{"number":1,"title":"Short title max 8 words","action":"Specific action starting with a verb","rationale":"One sentence why","owner":"Who owns this","urgency":"immediate|this week|this month"}]}\n\nGenerate 3-5 concrete conclusions. No markdown, ONLY JSON.`;
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, code: sessionId, mode: 'brief' }) });
      const data = await res.json();
      if (data.brief) {
        setBrief(data.brief);
        await supabase.from('group_sessions').update({ brief: JSON.stringify(data.brief) }).eq('id', sessionId);
        updateGroupContext(transcript, data.brief, g);
      }
    } catch {}
    setGeneratingBrief(false);
  }

  async function updateGroupContext(transcript, brief, g) {
    const contextPrompt = `After this debate, extract key insights for group memory. Return ONLY JSON: {"member_insights":[{"name":"string","position":"their key stance in this debate"}],"group_insight":"One sentence on what this debate revealed about the group","key_decision":"The main conclusion or direction agreed on"}`;
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Debate transcript:\n${transcript.slice(0, 2000)}\n\n${contextPrompt}`, code: sessionId, mode: 'brief' }) });
      const data = await res.json();
      if (data.brief) {
        const existing = g?.context ? g.context + '\n\n' : '';
        const sessionDate = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
        const newCtx = `[${sessionDate}] Topic: ${session?.topic}\nKey decision: ${data.brief.key_decision || 'See brief'}\n${(data.brief.member_insights || []).map(m => `${m.name}: ${m.position}`).join(' | ')}`;
        const updatedContext = (existing + newCtx).slice(-3000);
        await supabase.from('groups').update({ context: updatedContext }).eq('id', id);
      }
    } catch {}
  }

  function parseAndSetTurns(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const parsed = [];
    lines.forEach(line => { const match = line.match(/^([A-Za-z ]+?):\s*(.+)/); if (match) parsed.push({ name: match[1].trim(), text: match[2].trim() }); });
    setTurns(parsed);
  }

  const urgencyColor = u => u === 'immediate' ? 'bg-[#5c0403] text-[#f5e6d3]' : u === 'this week' ? 'bg-[#3d2010]/20 text-[#3d2010]' : 'bg-black/10 text-[#5c3010]';

  if (!session) return (
    <main className="wood-grain min-h-screen flex items-center justify-center relative z-10">
      <div className="text-[#5c3010] text-sm" style={PLAYFAIR}>Convening the council...</div>
    </main>
  );

  return (
    <main className="wood-grain min-h-screen px-4 py-10 relative z-10 overflow-x-hidden">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <a href={`/group/${id}`} className="text-[#5c3010] text-xs hover:text-[#1a0e08] transition-colors block mb-2">← {group?.name || 'Boardroom'}</a>
            <h1 className="text-xl text-[#1a0e08] leading-tight" style={OSWALD}>{session.topic}</h1>
            <div className="text-[#5c3010] text-sm mt-0.5" style={PLAYFAIR}>{new Date(session.created_at).toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
          {group?.context && (
            <div className="flex-shrink-0 text-xs text-[#5c0403] border border-[#5c0403]/30 bg-[#5c0403]/5 px-2 py-1 rounded-lg" style={PLAYFAIR}>Memory active</div>
          )}
        </div>

        <div className="flex gap-1 border-b border-[#5c0403]/20 mb-6">
          {['transcript','brief','members'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs relative transition-colors ${tab === t ? 'text-[#1a0e08] font-medium' : 'text-[#5c3010] hover:text-[#1a0e08]'}`}
              style={{...OSWALD, marginBottom:'-1px'}}>
              {t.toUpperCase()}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5c0403]" />}
              {t === 'brief' && generatingBrief && <span className="ml-1 inline-block w-1.5 h-1.5 bg-[#5c0403] rounded-full animate-pulse" />}
            </button>
          ))}
        </div>

        {tab === 'transcript' && (
          <div>
            {generating && (
              <div className="flex items-center gap-3 text-[#5c3010] text-sm mb-6">
                <div className="w-4 h-4 border-2 border-[#c99a58] border-t-[#5c0403] rounded-full animate-spin flex-shrink-0" />
                <span style={PLAYFAIR}>The council is deliberating...</span>
              </div>
            )}
            <div className="space-y-6">
              {turns.map((turn, i) => {
                const m = members.find(x => (x.profiles?.name || '').toLowerCase() === turn.name.toLowerCase());
                const c = getColor(m ? members.indexOf(m) : i % 8);
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

        {tab === 'brief' && (
          <div>
            {generatingBrief && !brief && (
              <div className="flex items-center gap-3 text-[#5c3010] text-sm mb-6">
                <div className="w-4 h-4 border-2 border-[#c99a58] border-t-[#5c0403] rounded-full animate-spin flex-shrink-0" />
                <span style={PLAYFAIR}>Synthesising the debate...</span>
              </div>
            )}
            {brief && (
              <div className="space-y-4 fade-up">
                <div className="border border-[#5c0403]/25 bg-white/40 rounded-xl p-5 backdrop-blur-sm">
                  <div className="text-xs text-[#5c0403] uppercase tracking-widest mb-2" style={OSWALD}>Where the council landed</div>
                  <p className="text-[#1a0e08] text-sm leading-relaxed" style={PLAYFAIR}>{brief.summary}</p>
                </div>
                <div className="text-xs text-[#5c0403] uppercase tracking-widest mb-2" style={OSWALD}>Action conclusions</div>
                <div className="space-y-3">
                  {brief.conclusions?.map((c, i) => (
                    <div key={i} className="border border-[#5c0403]/20 bg-white/35 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#5c0403] text-[#f5e6d3] flex items-center justify-center text-xs font-medium flex-shrink-0" style={OSWALD}>{c.number}</div>
                          <div className="text-[#1a0e08] text-sm font-medium" style={OSWALD}>{c.title?.toUpperCase()}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyColor(c.urgency)}`} style={PLAYFAIR}>{c.urgency}</span>
                      </div>
                      <div className="text-[#1a0e08] text-sm leading-relaxed mb-1.5 border-l-2 border-[#5c0403]/40 pl-3" style={PLAYFAIR}>{c.action}</div>
                      <div className="text-[#5c3010] text-xs mb-1" style={PLAYFAIR}>{c.rationale}</div>
                      <div className="text-xs text-[#5c0403]/70 uppercase tracking-wider" style={OSWALD}>Owner: {c.owner}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-3">
            {members.map((m, i) => {
              const c = getColor(i);
              return (
                <div key={m.id} className="border border-[#5c0403]/20 bg-white/35 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{background:c.bg,color:c.fg}}>{initials(m.profiles?.name || '?')}</div>
                    <div className="text-[#1a0e08] text-sm font-medium">{m.profiles?.name}</div>
                  </div>
                  {m.profiles?.personality && (
                    <div className="text-[#3d2010] text-xs leading-relaxed border-l-2 border-[#5c0403]/30 pl-3" style={PLAYFAIR}>"{m.profiles.personality.slice(0,150)}{m.profiles.personality.length > 150 ? '...' : ''}"</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}