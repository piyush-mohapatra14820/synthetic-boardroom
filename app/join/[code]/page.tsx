"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
export default function JoinRedirect() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  useEffect(() => { router.push(`/?join=${code}`); }, [code]);
  return (<main className="min-h-screen flex items-center justify-center"><div className="text-zinc-500 text-sm">Redirecting...</div></main>);
}