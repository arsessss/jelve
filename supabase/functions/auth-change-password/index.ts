import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const passwordAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(token: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = passwordAttempts.get(token);
  if (!record || now > record.resetAt) {
    passwordAttempts.set(token, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count++;
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, currentPassword, newPassword, target_user_id, new_password } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'توکن الزامی است' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rateCheck = checkRateLimit(token);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: `تعداد درخواست‌ها بیش از حد مجاز است. ${rateCheck.retryAfter} ثانیه صبر کنید` }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !session || new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'نشست نامعتبر است' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin changing another user's password
    if (target_user_id && new_password) {
      // Check if requester is admin
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user_id).single();
      if (!roleData || roleData.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'دسترسی غیرمجاز' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (new_password.length < 6) {
        return new Response(JSON.stringify({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const hashedPassword = await bcrypt.hash(new_password);
      const { error: updateError } = await supabase.from('custom_users').update({ password_hash: hashedPassword }).eq('id', target_user_id);
      if (updateError) {
        return new Response(JSON.stringify({ error: 'خطا در تغییر رمز عبور' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Self password change
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'تمام فیلدها الزامی است' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: user, error: userError } = await supabase.from('custom_users').select('id, password_hash').eq('id', session.user_id).single();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'کاربر یافت نشد' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let isValidPassword = false;
    if (user.password_hash.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    } else {
      isValidPassword = user.password_hash === currentPassword;
    }

    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'رمز عبور فعلی اشتباه است' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const hashedPassword = await bcrypt.hash(newPassword);
    const { error: updateError } = await supabase.from('custom_users').update({ password_hash: hashedPassword }).eq('id', user.id);
    if (updateError) {
      return new Response(JSON.stringify({ error: 'خطا در تغییر رمز عبور' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(JSON.stringify({ error: 'خطای سرور' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
