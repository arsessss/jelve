import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "./auth";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

interface ApiParams {
  table: string;
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  id?: string;
}

async function apiCall<T = unknown>({ table, action, data, filters, id }: ApiParams): Promise<ApiResponse<T>> {
  const session = customAuth.getSession();
  if (!session) {
    return { error: 'Not authenticated' };
  }

  try {
    const { data: result, error } = await supabase.functions.invoke('data-api', {
      body: {
        token: session.token,
        table,
        action,
        data,
        filters,
        id,
      },
    });

    if (error) {
      console.error('API call error:', error);
      return { error: error.message || 'API error' };
    }

    if (result.error) {
      return { error: result.error };
    }

    return { data: result.data as T };
  } catch (err) {
    console.error('API error:', err);
    return { error: 'Network error' };
  }
}

export const secureApi = {
  call: apiCall,

  async select<T = unknown>(table: string, filters?: Record<string, unknown>): Promise<ApiResponse<T[]>> {
    return apiCall<T[]>({ table, action: 'select', filters });
  },

  async insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<ApiResponse<T[]>> {
    return apiCall<T[]>({ table, action: 'insert', data });
  },

  async update<T = unknown>(table: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<T[]>> {
    return apiCall<T[]>({ table, action: 'update', id, data });
  },

  async upsert<T = unknown>(table: string, data: Record<string, unknown>): Promise<ApiResponse<T[]>> {
    return apiCall<T[]>({ table, action: 'upsert', data });
  },

  async delete(table: string, id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiCall<{ deleted: boolean }>({ table, action: 'delete', id });
  },
};
