import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);
export type Room = { id: string; code: string; topic: string; created_by: string; started: boolean; transcript: string | null; created_at: string; };
export type Member = { id: string; room_code: string; name: string; personality: string; color_index: number; is_creator: boolean; vote: boolean | null; joined_at: string; };