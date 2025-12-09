import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "./auth";

interface ChatApiResponse<T = unknown> {
  data?: T;
  error?: string;
  existing?: boolean;
}

async function chatApiCall<T = unknown>(action: string, data?: Record<string, unknown>): Promise<ChatApiResponse<T>> {
  const session = customAuth.getSession();
  if (!session) {
    return { error: 'Not authenticated' };
  }

  try {
    const { data: result, error } = await supabase.functions.invoke('chat-api', {
      body: {
        token: session.token,
        action,
        data,
      },
    });

    if (error) {
      console.error('Chat API error:', error);
      return { error: error.message || 'API error' };
    }

    if (result.error) {
      return { error: result.error };
    }

    return { data: result.data as T, existing: result.existing };
  } catch (err) {
    console.error('Chat API error:', err);
    return { error: 'Network error' };
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
  participants?: ChatUser[];
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
  
  addParticipants: (conversationId: string, participantIds: string[]) =>
    chatApiCall<{ success: boolean }>('add_participants', { 
      conversation_id: conversationId, 
      participant_ids: participantIds,
    }),
};
