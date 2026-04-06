"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: "0.02em" } as const;
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 } as const;
const inp = "w-full bg-black/8 border border-[#5c0403]/30 rounded-lg px-4 py-3 text-[#1a0e08] text-sm placeholder-[#8a6a4a] focus:outline-none focus:border-[#5c0403] transition-colors";

interface Group { id: string; name: string; description: string | null; invite_code: string; session_count: number; created_at: string; }

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserEmail(user.email || "");
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
    if (!profile) {
      await supabase.from("profiles").insert({ id: user.id, name: user.user_metadata?.full_name || (user.email || "").split("@")[0], email: user.email || "" });
    }
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    if (memberships && memberships.length > 0) {
      const ids = memberships.map((m: any) => m.group_id);
      const { data: groupData } = await supabase.from("groups").select("*").in("id", ids).order("created_at", { ascending: false });
      setGroups((groupData as Group[]) || []);
    }
    setLoading(false);
  }

  async function createGroup() {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: group, error } = await supabase.from("groups").insert({ name: newName.trim(), description: newDesc.trim() || null, created_by: user.id }).select().single();
    if (error || !group) return;
    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });
    setGroups(prev => [group as Group, ...prev]);
    setCreating(false); setNewName(""); setNewDesc("");
    router.push("/group/" + group.id);
  }

  async function signOut() { await supabase.auth.signOut(); router.push("/login"); }

  return (
    <main className="wood-grain min-h-screen px-5 py-10 relative z-10 overflow-x-hidden">
      <div className="max-w-xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl text-[#1a0e08]" style={OSWALD}>YOUR BOARDROOMS</h1>
            <p className="text-[#5c3010] text-xs mt-0.5" style={PLAYFAIR}>{userEmail}</p>
          </div>
          <button onClick={signOut} className="text-[#5c3010] text-xs border border-[#5c0403]/20 px-3 py-1.5 rounded-lg hover:text-[#1a0e08]" style={PLAYFAIR}>Sign out</button>
        </div>
        {!creating ? (
          <button onClick={() => setCreating(true)} className="w-full mb-6 py-3.5 rounded-xl bg-[#5c0403] hover:bg-[#7a0504] text-[#f5e6d3] text-sm transition-colors shadow-md" style={OSWALD}>+ CREATE A BOARDROOM</button>
        ) : (
          <div className="border border-[#5c0403]/25 bg-white/40 rounded-xl p-5 mb-6 backdrop-blur-sm space-y-3">
            <div className="text-sm text-[#1a0e08]" style={OSWALD}>NEW BOARDROOM</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name (e.g. Tagda Raho Council)" className={inp} />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className={inp} />
            <div className="flex gap-2">
              <button onClick={createGroup} className="flex-1 bg-[#5c0403] text-[#f5e6d3] py-2.5 rounded-lg text-sm" style={OSWALD}>CREATE →</button>
              <button onClick={() => setCreating(false)} className="flex-1 border border-[#5c0403]/30 text-[#5c3010] py-2.5 rounded-lg text-sm" style={OSWALD}>CANCEL</button>
            </div>
          </div>
        )}
        {loading ? <div className="text-[#5c3010] text-sm" style={PLAYFAIR}>Loading...</div>
        : groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[#5c3010] text-sm mb-2" style={PLAYFAIR}>No boardrooms yet.</div>
            <div className="text-[#5c3010]/60 text-xs" style={PLAYFAIR}>Create one or accept an invite link.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <button key={g.id} onClick={() => router.push("/group/" + g.id)} className="w-full text-left border border-[#5c0403]/20 bg-white/35 rounded-xl px-5 py-4 hover:bg-white/50 hover:border-[#5c0403]/40 transition-all group backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[#1a0e08] font-medium mb-0.5" style={OSWALD}>{g.name.toUpperCase()}</div>
                    {g.description && <div className="text-[#5c3010] text-xs truncate" style={PLAYFAIR}>{g.description}</div>}
                    <div className="text-[#5c0403]/60 text-xs mt-1" style={PLAYFAIR}>{g.session_count || 0} sessions · <span className="font-mono">{g.invite_code}</span></div>
                  </div>
                  <div className="text-[#5c0403] group-hover:translate-x-0.5 transition-transform flex-shrink-0">→</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}