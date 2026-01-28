import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "./auth";
import { withRetry } from "./network-resilience";

interface ChatApiResponse<T = unknown> {
  data?: T;
  error?: string;
  existing?: boolean;
  deleted?: boolean;
}

async function chatApiCall<T = unknown>(action: string, data?: Record<string, unknown>): Promise<ChatApiResponse<T>> {
  const session = customAuth.getSession();
  if (!session) {
    return { error: 'Not authenticated' };
  }

  try {
    const result = await withRetry(async () => {
      const { data: result, error } = await supabase.functions.invoke('chat-api', {
        body: {
          token: session.token,
          action,
          data,
        },
      });

      if (error) {
        throw error;
      }

      return result;
    });

    if (result.error) {
      return { error: result.error };
    }

    return { data: result.data as T, existing: result.existing, deleted: result.deleted };
  } catch (err) {
    console.error('Chat API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'خطای شبکه';
    return { error: errorMessage };
  }
}

export interface ChatUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  sender?: ChatUser;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  group_picture?: string | null;
  participants?: ChatUser[];
  admin_ids?: string[];
  last_message?: {
    content: string | null;
    created_at: string;
    sender_id: string;
  };
}

export const chatApi = {
  getConversations: () => chatApiCall<Conversation[]>('get_conversations'),
  
  getMessages: (conversationId: string) => 
    chatApiCall<ChatMessage[]>('get_messages', { conversation_id: conversationId }),
  
  sendMessage: (conversationId: string, content?: string, fileUrl?: string, fileName?: string) =>
    chatApiCall<ChatMessage>('send_message', { 
      conversation_id: conversationId, 
      content, 
      file_url: fileUrl,
      file_name: fileName,
    }),
  
  createConversation: (participantIds: string[], name?: string, isGroup?: boolean) =>
    chatApiCall<Conversation>('create_conversation', { 
      participant_ids: participantIds, 
      name, 
      is_group: isGroup || false,
    }),
  
  searchUsers: (query: string) =>
    chatApiCall<ChatUser[]>('search_users', { query }),
  
  deleteMessage: (conversationId: string, messageId: string) =>
    chatApiCall<{ success: boolean }>('delete_message', { 
      conversation_id: conversationId,
      message_id: messageId,
    }),
  
  deleteConversation: (conversationId: string) =>
    chatApiCall<{ success: boolean }>('delete_conversation', { 
      conversation_id: conversationId,
    }),
  
  leaveGroup: (conversationId: string) =>
    chatApiCall<{ success: boolean; deleted?: boolean }>('leave_group', { 
      conversation_id: conversationId,
    }),
  
  updateGroupPicture: (conversationId: string, pictureUrl: string | null) =>
    chatApiCall<{ success: boolean }>('update_group_picture', { 
      conversation_id: conversationId, 
      picture_url: pictureUrl,
    }),
  
  addParticipants: (conversationId: string, participantIds: string[]) =>
    chatApiCall<{ success: boolean }>('add_participants', { 
      conversation_id: conversationId, 
      participant_ids: participantIds,
    }),
  
  renameGroup: (conversationId: string, name: string) =>
    chatApiCall<{ success: boolean }>('rename_group', { 
      conversation_id: conversationId, 
      name,
    }),
  
  makeAdmin: (conversationId: string, userId: string) =>
    chatApiCall<{ success: boolean }>('make_admin', { 
      conversation_id: conversationId, 
      user_id: userId,
    }),
  
  removeAdmin: (conversationId: string, userId: string) =>
    chatApiCall<{ success: boolean }>('remove_admin', { 
      conversation_id: conversationId, 
      user_id: userId,
    }),
  
  kickMember: (conversationId: string, userId: string) =>
    chatApiCall<{ success: boolean }>('kick_member', { 
      conversation_id: conversationId, 
      user_id: userId,
    }),
};