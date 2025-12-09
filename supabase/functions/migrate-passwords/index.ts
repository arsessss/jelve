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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with plaintext passwords (not starting with $2)
    const { data: users, error: fetchError } = await supabase
      .from('custom_users')
      .select('id, username, password_hash');

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let migratedCount = 0;
    let alreadyHashedCount = 0;
    const errors: string[] = [];

    for (const user of users || []) {
      // Check if password is already hashed (bcrypt hashes start with $2)
      if (user.password_hash.startsWith('$2')) {
        alreadyHashedCount++;
        continue;
      }

      try {
        // Hash the plaintext password
        const hashedPassword = await bcrypt.hash(user.password_hash);
        
        // Update the user's password
        const { error: updateError } = await supabase
          .from('custom_users')
          .update({ password_hash: hashedPassword })
          .eq('id', user.id);

        if (updateError) {
          errors.push(`Failed to update ${user.username}: ${updateError.message}`);
        } else {
          migratedCount++;
          console.log(`Migrated password for user: ${user.username}`);
        }
      } catch (hashError) {
        errors.push(`Failed to hash password for ${user.username}: ${hashError}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated: migratedCount,
        alreadyHashed: alreadyHashedCount,
        total: users?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error during migration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
