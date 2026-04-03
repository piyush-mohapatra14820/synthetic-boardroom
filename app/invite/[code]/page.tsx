"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: '0.02em' };
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 };

export default function InvitePage() {
  const { code } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => { loadGroup(); }, [code]);

  async function loadGroup() {
    const { data } = await supabase.from('groups').select('*').eq('invite_code', code).single();
    if (!data) { setStatus("notfound"); return; }
    setGroup(data);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("needslogin"); return; }
    setStatus("ready");
  }

  async function acceptInvite() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/login?next=/invite/${code}`); return; }
    setStatus("joining");
    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'member' });
    if (error && !error.message.includes('duplicate')) { setError(error.message); setStatus("ready"); return; }
    router.push(`/group/${group.id}`);
  }

  function goLogin() { router.push(`/login?next=/invite/${code}`); }

  if (status === "loading") return (
    <main className="wood-grain min-h-screen flex items-center justify-center relative z-10">
      <div className="text-[#5c3010] text-sm" style={PLAYFAIR}>Finding boardroom...</div>
    </main>
  );

  if (status === "notfound") return (
    <main className="wood-grain min-h-screen flex items-center justify-center relative z-10">
      <div className="text-center"><div className="text-[#1a0e08] font-medium mb-2" style={OSWALD}>INVITE NOT FOUND</div>
      <div className="text-[#5c3010] text-sm" style={PLAYFAIR}>This invite link may be invalid or expired.</div></div>
    </main>
  );

  return (
    <main className="wood-grain min-h-screen flex items-center justify-center px-6 relative z-10">
      <div className="w-full max-w-sm relative z-10 fade-up text-center">
        <div className="text-[#5c0403]/70 text-xs uppercase tracking-[0.3em] mb-4" style={PLAYFAIR}>You've been invited to</div>
        <h1 className="text-4xl text-[#1a0e08] mb-2" style={OSWALD}>{group?.name?.toUpperCase()}</h1>
        {group?.description && <p className="text-[#5c3010] text-sm mb-6" style={PLAYFAIR}>{group.description}</p>}
        <div className="w-10 h-px bg-[#5c0403]/40 mx-auto mb-8"></div>

        {error && <p className="text-red-700 text-sm mb-4">{error}</p>}

        {status === "needslogin" ? (
          <div className="space-y-3">
            <p className="text-[#5c3010] text-sm mb-4" style={PLAYFAIR}>Sign in to join this boardroom.</p>
            <button onClick={goLogin} className="w-full bg-[#5c0403] text-[#f5e6d3] py-3.5 rounded-lg text-sm" style={OSWALD}>SIGN IN TO JOIN →</button>
          </div>
        ) : (
          <button onClick={acceptInvite} disabled={status === "joining"}
            className="w-full bg-[#5c0403] hover:bg-[#7a0504] text-[#f5e6d3] py-3.5 rounded-lg text-sm transition-colors disabled:opacity-40 shadow-md" style={OSWALD}>
            {status === "joining" ? "JOINING..." : "ACCEPT INVITE →"}
          </button>
        )}
      </div>
    </main>
  );
}