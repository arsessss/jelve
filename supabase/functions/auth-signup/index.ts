import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting using in-memory store
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = signupAttempts.get(identifier);
  
  if (!record || now > record.resetAt) {
    signupAttempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
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
    // Rate limit by IP to prevent mass account creation
    const clientIP = getClientIP(req);
    const rateCheck = checkRateLimit(clientIP);
    if (!rateCheck.allowed) {
      console.log('Signup rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ error: `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const { username, password, fullName, role } = await req.json();

    if (!username || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'تمام فیلدها الزامی است' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('custom_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'این نام کاربری قبلاً استفاده شده است' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password);

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('custom_users')
      .insert({
        username,
        password_hash: hashedPassword,
        full_name: fullName,
      })
      .select('id')
      .single();

    if (userError) {
      console.error('Failed to create user:', userError);
      return new Response(
        JSON.stringify({ error: 'خطا در ایجاد کاربر' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUser.id,
        role,
      });

    if (roleError) {
      console.error('Failed to create role:', roleError);
      // Clean up user if role creation failed
      await supabase.from('custom_users').delete().eq('id', newUser.id);
      return new Response(
        JSON.stringify({ error: 'خطا در تنظیم نقش کاربر' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ userId: newUser.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'خطای سرور' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
