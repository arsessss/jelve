import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  token: string;
  action: string;
  table: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action, table, data, filters, id }: RequestBody = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('user_sessions').delete().eq('token', token);
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user_id)
      .single();

    console.log('Role lookup for user:', session.user_id, 'Result:', roleData, 'Error:', roleError);

    const userRole: string | null = roleData?.role || null;
    const isAdmin = userRole === 'admin';

    console.log('User role:', userRole, 'isAdmin:', isAdmin, 'Action:', action, 'Table:', table);

    // Define allowed operations per table and role
    const permissions: Record<string, { read: string[]; write: string[]; delete: string[] }> = {
      students: { read: ['admin', 'student'], write: ['admin'], delete: ['admin'] },
      student_grades: { read: ['admin', 'student'], write: ['admin'], delete: ['admin'] },
      online_classes: { read: ['admin', 'student'], write: ['admin'], delete: ['admin'] },
      jozveh: { read: ['admin', 'student'], write: ['admin'], delete: ['admin'] },
      contact_messages: { read: ['admin'], write: [], delete: ['admin'] },
      custom_users: { read: ['admin'], write: ['admin'], delete: ['admin'] },
      user_roles: { read: ['admin'], write: ['admin'], delete: ['admin'] },
    };

    const tablePerms = permissions[table];
    if (!tablePerms) {
      return new Response(
        JSON.stringify({ error: 'Invalid table' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions - handle null role
    const canRead = userRole !== null && (tablePerms.read.includes(userRole) || tablePerms.read.includes('*'));
    const canWrite = userRole !== null && tablePerms.write.includes(userRole);
    const canDelete = userRole !== null && tablePerms.delete.includes(userRole);

    console.log('Permissions check:', { canRead, canWrite, canDelete, tablePerms });

    let result;
    let error;

    switch (action) {
      case 'select': {
        if (!canRead) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let query = supabase.from(table).select('*');
        
        // Apply filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }

        // For students, filter by their own data unless admin
        if (!isAdmin && table === 'students') {
          query = query.eq('user_id', session.user_id);
        }
        if (!isAdmin && table === 'student_grades') {
          // Get student ID first
          const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', session.user_id)
            .single();
          if (studentData) {
            query = query.eq('student_id', studentData.id);
          }
        }

        const { data: selectData, error: selectError } = await query.order('created_at', { ascending: false });
        result = selectData;
        error = selectError;
        break;
      }

      case 'insert': {
        if (!canWrite) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: insertData, error: insertError } = await supabase.from(table).insert(data).select();
        result = insertData;
        error = insertError;
        break;
      }

      case 'update': {
        if (!canWrite) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID is required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: updateData, error: updateError } = await supabase.from(table).update(data).eq('id', id).select();
        result = updateData;
        error = updateError;
        break;
      }

      case 'upsert': {
        if (!canWrite) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: upsertData, error: upsertError } = await supabase.from(table).upsert(data).select();
        result = upsertData;
        error = upsertError;
        break;
      }

      case 'delete': {
        if (!canDelete) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID is required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
        error = deleteError;
        result = { deleted: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
