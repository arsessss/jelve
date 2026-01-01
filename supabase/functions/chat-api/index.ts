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

    // Helper to check if user is group admin
    const isGroupAdmin = async (conversationId: string, checkUserId: string): Promise<boolean> => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('created_by')
        .eq('id', conversationId)
        .single();
      
      if (conv?.created_by === checkUserId) return true;

      const { data: admin } = await supabase
        .from('group_admins')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', checkUserId)
        .single();
      
      return !!admin;
    };

    // Helper to get participant count
    const getParticipantCount = async (conversationId: string): Promise<number> => {
      const { count } = await supabase
        .from('conversation_participants')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      return count || 0;
    };

    switch (action) {
      case 'get_conversations': {
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

        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (convError) throw convError;

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

            const { data: admins } = await supabase
              .from('group_admins')
              .select('user_id')
              .eq('conversation_id', conv.id);

            const adminIds = admins?.map(a => a.user_id) || [];
            if (!adminIds.includes(conv.created_by)) {
              adminIds.push(conv.created_by);
            }

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
              admin_ids: adminIds,
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

        if (!isGroup && participantIds.length === 1) {
          const otherId = participantIds[0];
          
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

      case 'delete_message': {
        const messageId = data?.message_id as string;
        const conversationId = data?.conversation_id as string;

        if (!messageId || !conversationId) {
          return new Response(
            JSON.stringify({ error: 'Message ID and conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get message
        const { data: message } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('id', messageId)
          .single();

        if (!message) {
          return new Response(
            JSON.stringify({ error: 'Message not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Users can delete their own messages, admins can delete any
        const isAdmin = await isGroupAdmin(conversationId, userId);
        if (message.sender_id !== userId && !isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to delete this message' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase.from('messages').delete().eq('id', messageId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_conversation': {
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

        // Delete all messages, participants, admins, then conversation
        await supabase.from('messages').delete().eq('conversation_id', conversationId);
        await supabase.from('group_admins').delete().eq('conversation_id', conversationId);
        await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
        await supabase.from('conversations').delete().eq('id', conversationId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'leave_group': {
        const conversationId = data?.conversation_id as string;

        if (!conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: conv } = await supabase
          .from('conversations')
          .select('created_by, is_group')
          .eq('id', conversationId)
          .single();

        if (!conv) {
          return new Response(
            JSON.stringify({ error: 'Conversation not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const participantCount = await getParticipantCount(conversationId);

        // If only 1 member, delete the group
        if (participantCount <= 1) {
          await supabase.from('messages').delete().eq('conversation_id', conversationId);
          await supabase.from('group_admins').delete().eq('conversation_id', conversationId);
          await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
          await supabase.from('conversations').delete().eq('id', conversationId);

          return new Response(
            JSON.stringify({ success: true, deleted: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If owner is leaving, transfer ownership
        if (conv.created_by === userId) {
          // Get random remaining member
          const { data: remainingMembers } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', userId)
            .limit(1);

          if (remainingMembers && remainingMembers.length > 0) {
            const newOwnerId = remainingMembers[0].user_id;
            await supabase
              .from('conversations')
              .update({ created_by: newOwnerId })
              .eq('id', conversationId);
          }
        }

        // Remove user from participants and admins
        await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);

        await supabase
          .from('group_admins')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_group_picture': {
        const conversationId = data?.conversation_id as string;
        const pictureUrl = data?.picture_url as string;

        if (!conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user is group admin
        const isAdmin = await isGroupAdmin(conversationId, userId);
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only group admins can update group picture' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('conversations')
          .update({ group_picture: pictureUrl || null })
          .eq('id', conversationId);

        return new Response(
          JSON.stringify({ success: true }),
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

        const { data: conv } = await supabase
          .from('conversations')
          .select('is_group')
          .eq('id', conversationId)
          .single();

        if (!conv?.is_group) {
          return new Response(
            JSON.stringify({ error: 'Can only add participants to groups' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isAdmin = await isGroupAdmin(conversationId, userId);
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only group admins can add participants' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      case 'rename_group': {
        const conversationId = data?.conversation_id as string;
        const newName = data?.name as string;

        if (!conversationId || !newName) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and name required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isAdmin = await isGroupAdmin(conversationId, userId);
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only group admins can rename the group' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('conversations')
          .update({ name: newName })
          .eq('id', conversationId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'make_admin': {
        const conversationId = data?.conversation_id as string;
        const targetUserId = data?.user_id as string;

        if (!conversationId || !targetUserId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and user ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isAdmin = await isGroupAdmin(conversationId, userId);
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only group admins can make others admin' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const targetIsAdmin = await isGroupAdmin(conversationId, targetUserId);
        if (targetIsAdmin) {
          return new Response(
            JSON.stringify({ error: 'User is already an admin' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('group_admins')
          .insert({
            conversation_id: conversationId,
            user_id: targetUserId,
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove_admin': {
        const conversationId = data?.conversation_id as string;
        const targetUserId = data?.user_id as string;

        if (!conversationId || !targetUserId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and user ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isAdmin = await isGroupAdmin(conversationId, userId);
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only group admins can remove admin status' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: conv } = await supabase
          .from('conversations')
          .select('created_by')
          .eq('id', conversationId)
          .single();

        if (conv?.created_by === targetUserId) {
          return new Response(
            JSON.stringify({ error: 'Cannot remove admin status from group creator' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('group_admins')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', targetUserId);

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
