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
