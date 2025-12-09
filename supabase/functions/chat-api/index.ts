import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  token: string;
  action: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action, data }: RequestBody = await req.json();

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

    const userId = session.user_id;

    switch (action) {
      case 'get_conversations': {
        // Get all conversations where user is a participant
        const { data: participants, error } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);

        if (error) throw error;

        const conversationIds = participants?.map(p => p.conversation_id) || [];
        
        if (conversationIds.length === 0) {
          return new Response(
            JSON.stringify({ data: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get conversation details with participants
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (convError) throw convError;

        // Get participants for each conversation
        const enrichedConversations = await Promise.all(
          (conversations || []).map(async (conv) => {
            const { data: parts } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conv.id);

            const userIds = parts?.map(p => p.user_id) || [];
            
            const { data: users } = await supabase
              .from('custom_users')
              .select('id, username, full_name, profile_picture')
              .in('id', userIds);

            // Get last message
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...conv,
              participants: users || [],
              last_message: lastMsg,
            };
          })
        );

        return new Response(
          JSON.stringify({ data: enrichedConversations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_messages': {
        const conversationId = data?.conversation_id as string;
        if (!conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user is participant
        const { data: participant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .single();

        if (!participant) {
          return new Response(
            JSON.stringify({ error: 'Not a participant' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get sender info for each message
        const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
        const { data: senders } = await supabase
          .from('custom_users')
          .select('id, username, full_name, profile_picture')
          .in('id', senderIds);

        const senderMap = new Map(senders?.map(s => [s.id, s]) || []);

        const enrichedMessages = messages?.map(msg => ({
          ...msg,
          sender: senderMap.get(msg.sender_id) || null,
        }));

        return new Response(
          JSON.stringify({ data: enrichedMessages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_message': {
        const conversationId = data?.conversation_id as string;
        const content = data?.content as string;
        const fileUrl = data?.file_url as string | undefined;
        const fileName = data?.file_name as string | undefined;

        if (!conversationId || (!content && !fileUrl)) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and content/file required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user is participant
        const { data: participant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .single();

        if (!participant) {
          return new Response(
            JSON.stringify({ error: 'Not a participant' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content: content || null,
            file_url: fileUrl || null,
            file_name: fileName || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Update conversation updated_at
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        return new Response(
          JSON.stringify({ data: message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_conversation': {
        const participantIds = data?.participant_ids as string[];
        const name = data?.name as string | undefined;
        const isGroup = data?.is_group as boolean || false;

        if (!participantIds || participantIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Participants required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For direct messages, check if conversation already exists
        if (!isGroup && participantIds.length === 1) {
          const otherId = participantIds[0];
          
          // Find existing DM
          const { data: myConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);

          const { data: theirConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', otherId);

          const myIds = new Set(myConvs?.map(c => c.conversation_id) || []);
          const sharedConvIds = theirConvs?.filter(c => myIds.has(c.conversation_id)).map(c => c.conversation_id) || [];

          if (sharedConvIds.length > 0) {
            // Check if any of these are DMs (not groups)
            const { data: existingDm } = await supabase
              .from('conversations')
              .select('*')
              .in('id', sharedConvIds)
              .eq('is_group', false)
              .limit(1)
              .single();

            if (existingDm) {
              return new Response(
                JSON.stringify({ data: existingDm, existing: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }

        // Create new conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            name: isGroup ? name : null,
            is_group: isGroup,
            created_by: userId,
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add participants (including creator)
        const allParticipants = [...new Set([userId, ...participantIds])];
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert(
            allParticipants.map(pId => ({
              conversation_id: conversation.id,
              user_id: pId,
            }))
          );

        if (partError) throw partError;

        return new Response(
          JSON.stringify({ data: conversation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'search_users': {
        const query = data?.query as string;
        if (!query || query.length < 2) {
          return new Response(
            JSON.stringify({ data: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: users, error } = await supabase
          .from('custom_users')
          .select('id, username, full_name, profile_picture')
          .neq('id', userId)
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(10);

        if (error) throw error;

        return new Response(
          JSON.stringify({ data: users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'add_participants': {
        const conversationId = data?.conversation_id as string;
        const newParticipantIds = data?.participant_ids as string[];

        if (!conversationId || !newParticipantIds || newParticipantIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and participants required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user is participant and it's a group
        const { data: conv } = await supabase
          .from('conversations')
          .select('is_group, created_by')
          .eq('id', conversationId)
          .single();

        if (!conv?.is_group) {
          return new Response(
            JSON.stringify({ error: 'Can only add participants to groups' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('conversation_participants')
          .insert(
            newParticipantIds.map(pId => ({
              conversation_id: conversationId,
              user_id: pId,
            }))
          );

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
