import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "No prompt" }, { status: 400 });
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