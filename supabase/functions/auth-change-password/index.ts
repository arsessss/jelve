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
    const { token, currentPassword, newPassword } = await req.json();

    if (!token || !currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'تمام فیلدها الزامی است' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ error: 'نشست نامعتبر است' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's current password hash
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('id, password_hash')
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'کاربر یافت نشد' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify current password
    let isValidPassword = false;
    if (user.password_hash.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    } else {
      isValidPassword = user.password_hash === currentPassword;
    }

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'رمز عبور فعلی اشتباه است' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword);
    const { error: updateError } = await supabase
      .from('custom_users')
      .update({ password_hash: hashedPassword })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return new Response(
        JSON.stringify({ error: 'خطا در تغییر رمز عبور' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(
      JSON.stringify({ error: 'خطای سرور' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
