"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const OSWALD = { fontFamily: "'Oswald', sans-serif", fontWeight: 700, letterSpacing: '0.02em' };
const PLAYFAIR = { fontFamily: "'Playfair Display', serif", fontWeight: 500 };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) setError(error.message);
  }

  async function signInWithEmail() {
    if (!email.trim()) { setError("Enter your email."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) { setError(error.message); setLoading(false); }
    else setSent(true);
    setLoading(false);
  }

  const inputCls = "w-full bg-black/8 border border-[#5c0403]/30 rounded-lg px-4 py-3 text-[#1a0e08] text-sm placeholder-[#8a6a4a] focus:outline-none focus:border-[#5c0403] focus:bg-white/40 transition-colors";

  return (
    <main className="wood-grain min-h-screen flex items-center justify-center px-6 relative z-10 overflow-x-hidden">
      <div className="w-full max-w-sm relative z-10 fade-up text-center">
        <div className="mb-3">
          <span className="text-[#5c0403]/70 text-xs uppercase tracking-[0.3em]" style={PLAYFAIR}>Private Beta</span>
        </div>
        <h1 className="text-[clamp(2.5rem,11vw,4.5rem)] text-[#1a0e08] leading-none mb-1" style={OSWALD}>SYNTHETIC</h1>
        <h1 className="text-[clamp(2.5rem,11vw,4.5rem)] text-[#5c0403] leading-none mb-6" style={OSWALD}>BOARDROOM</h1>
        <div className="w-12 h-px bg-[#5c0403]/60 mx-auto mb-8"></div>

        {sent ? (
          <div className="border border-[#5c0403]/25 bg-white/40 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-2xl mb-3">✉️</div>
            <div className="text-[#1a0e08] font-medium mb-2" style={OSWALD}>CHECK YOUR EMAIL</div>
            <p className="text-[#5c3010] text-sm" style={PLAYFAIR}>Magic link sent to <strong>{email}</strong>. Click it to enter the boardroom.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-[#5c0403]/40 bg-white/40 hover:bg-white/60 transition-all text-[#1a0e08] text-sm font-medium backdrop-blur-sm shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#5c0403]/20"></div>
              <span className="text-[#5c0403]/50 text-xs" style={PLAYFAIR}>or</span>
              <div className="h-px flex-1 bg-[#5c0403]/20"></div>
            </div>

            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && signInWithEmail()}
              placeholder="your@email.com" type="email" className={inputCls} />
            {error && <p className="text-red-700 text-xs text-left">{error}</p>}
            <button onClick={signInWithEmail} disabled={loading}
              className="w-full bg-[#5c0403] hover:bg-[#7a0504] text-[#f5e6d3] py-3.5 rounded-lg text-sm transition-colors disabled:opacity-40 shadow-md" style={OSWALD}>
              {loading ? "SENDING..." : "SEND MAGIC LINK →"}
            </button>
          </div>
        )}

        <p className="text-[#5c3010]/60 text-xs mt-6" style={PLAYFAIR}>By continuing you accept our terms of use.</p>
      </div>
    </main>
  );
}