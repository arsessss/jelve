import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  token: string;
  action: 'start' | 'end' | 'join' | 'leave' | 'status' | 'report';
  class_id: string;
}

const attempts = new Map<string, { count: number; resetAt: number }>();
const RL_MAX = 60;
const RL_WIN = 60_000;

function rl(token: string) {
  const now = Date.now();
  const r = attempts.get(token);
  if (!r || now > r.resetAt) {
    attempts.set(token, { count: 1, resetAt: now + RL_WIN });
    return true;
  }
  if (r.count >= RL_MAX) return false;
  r.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { token, action, class_id }: Body = await req.json();
    if (!token || !action || !class_id) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!rl(token)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: session, error: sErr } = await sb.from('user_sessions').select('user_id, expires_at').eq('token', token).single();
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (new Date(session.expires_at) < new Date()) {
      await sb.from('user_sessions').delete().eq('token', token);
      return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = session.user_id as string;

    const { data: roleRow } = await sb.from('user_roles').select('role').eq('user_id', userId).single();
    const role = roleRow?.role as string | undefined;
    const isAdmin = role === 'admin';

    const { data: cls, error: cErr } = await sb.from('online_classes').select('*').eq('id', class_id).single();
    if (cErr || !cls) {
      return new Response(JSON.stringify({ error: 'Class not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userRow } = await sb.from('custom_users').select('full_name, username').eq('id', userId).single();
    const displayName = userRow?.full_name || userRow?.username || 'کاربر';

    if (action === 'start') {
      if (!isAdmin) return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await sb.from('online_classes').update({ is_live: true, started_at: new Date().toISOString() }).eq('id', class_id);
      return new Response(JSON.stringify({ data: { ok: true } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'end') {
      if (!isAdmin) return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await sb.from('online_classes').update({ is_live: false }).eq('id', class_id);
      await sb.from('online_class_participants').update({ left_at: new Date().toISOString() }).eq('class_id', class_id).is('left_at', null);
      return new Response(JSON.stringify({ data: { ok: true } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'status') {
      const { data: parts } = await sb.from('online_class_participants').select('user_id, display_name, is_teacher, joined_at').eq('class_id', class_id).is('left_at', null);
      return new Response(JSON.stringify({ data: { class: cls, participants: parts || [] } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'report') {
      if (!isAdmin) return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: parts } = await sb.from('online_class_participants')
        .select('user_id, display_name, is_teacher, joined_at, left_at')
        .eq('class_id', class_id)
        .order('joined_at', { ascending: true });
      return new Response(JSON.stringify({ data: { class: cls, participants: parts || [] } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'join') {
      if (cls.mode !== 'internal') {
        return new Response(JSON.stringify({ error: 'این کلاس از نوع داخلی نیست' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!cls.is_live && !isAdmin) {
        return new Response(JSON.stringify({ error: 'کلاس هنوز شروع نشده' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      let isTeacher = false;
      if (isAdmin) {
        isTeacher = true;
      } else if (role === 'student') {
        const { data: student } = await sb.from('students').select('grade').eq('user_id', userId).single();
        if (!student) {
          return new Response(JSON.stringify({ error: 'دانش‌آموز یافت نشد' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (student.grade !== cls.grade) {
          return new Response(JSON.stringify({ error: 'این کلاس برای پایه‌ی شما نیست' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else {
        return new Response(JSON.stringify({ error: 'دسترسی غیرمجاز' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Close any prior open session for this user in this class
      await sb.from('online_class_participants').update({ left_at: new Date().toISOString() }).eq('class_id', class_id).eq('user_id', userId).is('left_at', null);
      await sb.from('online_class_participants').insert({ class_id, user_id: userId, display_name: displayName, is_teacher: isTeacher });

      return new Response(JSON.stringify({ data: { class: cls, role: isTeacher ? 'teacher' : 'student', displayName, userId } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'leave') {
      await sb.from('online_class_participants').update({ left_at: new Date().toISOString() }).eq('class_id', class_id).eq('user_id', userId).is('left_at', null);
      return new Response(JSON.stringify({ data: { ok: true } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('online-class-api error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});