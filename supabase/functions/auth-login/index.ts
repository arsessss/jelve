import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'نام کاربری و رمز عبور الزامی است' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user by username
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('id, username, password_hash, full_name')
      .eq('username', username)
      .single();

    if (userError || !user) {
      console.log('User not found:', username);
      return new Response(
        JSON.stringify({ error: 'نام کاربری یا رمز عبور اشتباه است' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if password is already hashed (starts with $2) or plaintext
    let isValidPassword = false;
    if (user.password_hash.startsWith('$2')) {
      // Password is hashed, use bcrypt compare
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy plaintext password - compare directly but then hash it
      isValidPassword = user.password_hash === password;
      
      if (isValidPassword) {
        // Migrate to hashed password
        const hashedPassword = await bcrypt.hash(password);
        await supabase
          .from('custom_users')
          .update({ password_hash: hashedPassword })
          .eq('id', user.id);
        console.log('Migrated password to bcrypt for user:', username);
      }
    }

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'نام کاربری یا رمز عبور اشتباه است' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const role = roles && roles.length > 0 ? roles[0].role : null;

    // Generate a session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store session in database
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        token: sessionToken,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'خطا در ایجاد نشست' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        session: {
          token: sessionToken,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
          },
          role,
          expires_at: expiresAt.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'خطای سرور' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
