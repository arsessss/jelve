import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "./auth";
import { withRetry, extractErrorBody } from "./network-resilience";

export interface JoinResult {
  class: {
    id: string;
    title: string;
    grade: string;
    subject: string | null;
    description: string | null;
    is_live: boolean;
    mode: string;
  };
  role: 'teacher' | 'student';
  displayName: string;
  userId: string;
}

async function call<T = unknown>(action: string, class_id: string): Promise<{ data?: T; error?: string }> {
  const session = customAuth.getSession();
  if (!session) return { error: 'لطفا وارد حساب کاربری شوید' };
  try {
    const result = await withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('online-class-api', {
        body: { token: session.token, action, class_id },
      });
      if (error) {
        const body = await extractErrorBody(error);
        if (body && (body.error || body.data !== undefined)) return body;
        throw error;
      }
      return data;
    });
    if (result.error) return { error: result.error };
    return { data: result.data as T };
  } catch (e) {
    const body = await extractErrorBody(e);
    if (body?.error) return { error: body.error };
    return { error: 'خطای شبکه. دوباره تلاش کنید' };
  }
}

export const onlineClassApi = {
  start: (id: string) => call('start', id),
  end: (id: string) => call('end', id),
  join: (id: string) => call<JoinResult>('join', id),
  leave: (id: string) => call('leave', id),
  status: (id: string) => call('status', id),
  report: (id: string) => call<{
    class: { id: string; title: string; grade: string; subject: string | null };
    participants: Array<{ user_id: string; display_name: string; is_teacher: boolean; joined_at: string; left_at: string | null }>;
  }>('report', id),
  attendanceMark: async (class_id: string, target_user_id: string, target_display_name: string, status_value: 'hazer' | 'ghayeb') => {
    const session = customAuth.getSession();
    if (!session) return { error: 'لطفا وارد حساب کاربری شوید' };
    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabase.functions.invoke('online-class-api', {
          body: { token: session.token, action: 'attendance_mark', class_id, target_user_id, target_display_name, status_value },
        });
        if (error) { const body = await extractErrorBody(error); if (body) return body; throw error; }
        return data;
      });
      if (result.error) return { error: result.error };
      return { data: result.data };
    } catch (e) {
      const body = await extractErrorBody(e);
      return { error: body?.error || 'خطای شبکه' };
    }
  },
  attendanceList: (id: string) => call<{
    attendance: Array<{ user_id: string; display_name: string; status: 'hazer' | 'ghayeb'; marked_at: string }>;
  }>('attendance_list', id),
  roster: (id: string) => call<{
    class: { id: string; title: string; grade: string };
    roster: Array<{ user_id: string; full_name: string }>;
  }>('roster', id),
};