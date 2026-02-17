import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "./auth";
import { withRetry } from "./network-resilience";

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

// Map common English error messages to Persian
const ERROR_TRANSLATIONS: Record<string, string> = {
  'Not authenticated': 'لطفا وارد حساب کاربری شوید',
  'Permission denied': 'دسترسی غیرمجاز',
  'Invalid session': 'نشست نامعتبر است. لطفا دوباره وارد شوید',
  'Session expired': 'نشست منقضی شده. لطفا دوباره وارد شوید',
  'Invalid table': 'جدول نامعتبر',
  'Invalid action': 'عملیات نامعتبر',
  'ID is required for update': 'شناسه برای ویرایش الزامی است',
  'ID is required for delete': 'شناسه برای حذف الزامی است',
  'Token is required': 'توکن الزامی است',
  'Too many requests': 'تعداد درخواست‌ها بیش از حد مجاز. کمی صبر کنید',
  'Server error': 'خطای سرور. لطفا دوباره تلاش کنید',
  'Student not found': 'دانش‌آموز یافت نشد',
};

function translateError(msg: string): string {
  if (ERROR_TRANSLATIONS[msg]) return ERROR_TRANSLATIONS[msg];
  // If already Persian, return as-is
  if (/[\u0600-\u06FF]/.test(msg)) return msg;
  // Generic fallback for unknown English errors
  return 'خطایی رخ داد. لطفا دوباره تلاش کنید';
}

async function apiCall<T = unknown>({ table, action, data, filters, id }: ApiParams): Promise<ApiResponse<T>> {
  const session = customAuth.getSession();
  if (!session) {
    return { error: translateError('Not authenticated') };
  }

  try {
    const result = await withRetry(async () => {
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

      // If we got data with an error field, return it (don't throw)
      if (error && result?.error) {
        return result;
      }

      // If it's a network-level error (no response body), throw for retry
      if (error && !result) {
        throw error;
      }

      return result;
    });

    if (result.error) {
      return { error: translateError(result.error) };
    }

    return { data: result.data as T };
  } catch (err) {
    console.error('API error:', err);
    // Translate the error message
    const rawMessage = err instanceof Error ? err.message : '';
    if (rawMessage.includes('non-2xx') || rawMessage.includes('Edge Function')) {
      return { error: 'خطای سرور. لطفا دوباره تلاش کنید' };
    }
    return { error: translateError(rawMessage || 'خطای شبکه') };
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