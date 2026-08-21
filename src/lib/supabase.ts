import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-siredom.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-siredom.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export async function broadcastRoundCommitted(matchId: string, payload: any) {
  try {
    const channel = supabase.channel(`match:${matchId}`);
    await channel.send({
      type: 'broadcast',
      event: 'ROUND_COMMITTED',
      payload,
    });
  } catch (err) {
    console.error('Failed to broadcast realtime event:', err);
  }
}

