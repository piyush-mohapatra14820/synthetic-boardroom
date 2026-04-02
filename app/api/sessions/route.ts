import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt, code, mode } = await req.json();
    if (!prompt) return NextResponse.json({ error: "No prompt" }, { status: 400 });

    if (mode === 'brief') {
      // Generate structured brief from transcript
      const message = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      const text = message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const brief = JSON.parse(clean);
        return NextResponse.json({ brief });
      } catch {
        return NextResponse.json({ brief: null, raw: text });
      }
    }

    // Normal debate transcript
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const transcript = message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    return NextResponse.json({ transcript });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}