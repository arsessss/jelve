import { supabase } from "@/integrations/supabase/client";

export interface CustomUser {
  id: string;
  username: string;
  full_name: string | null;
}

export interface AuthSession {
  token: string;
  user: CustomUser;
  role: "admin" | "student" | null;
  expires_at: string;
}

const SESSION_KEY = "jelve_session";

export const customAuth = {
  async login(username: string, password: string): Promise<{ session: AuthSession | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { username, password }
      });

      if (error) {
        console.error("Login edge function error:", error);
        return { session: null, error: "خطا در برقراری ارتباط با سرور" };
      }

      if (data.error) {
        return { session: null, error: data.error };
      }

      const session = data.session as AuthSession;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      window.dispatchEvent(new Event("auth-change"));

      return { session, error: null };
    } catch (err) {
      console.error("Login error:", err);
      return { session: null, error: "خطا در برقراری ارتباط با سرور" };
    }
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("auth-change"));
  },

  getSession(): AuthSession | null {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      const session = JSON.parse(stored) as AuthSession;
      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  async validateSession(): Promise<{ valid: boolean; session: AuthSession | null }> {
    const stored = this.getSession();
    if (!stored) return { valid: false, session: null };

    try {
      const { data, error } = await supabase.functions.invoke('auth-validate', {
        body: { token: stored.token }
      });

      if (error || !data.valid) {
        this.logout();
        return { valid: false, session: null };
      }

      // Update local session with server data
      const updatedSession: AuthSession = {
        ...stored,
        user: data.session.user,
        role: data.session.role,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));

      return { valid: true, session: updatedSession };
    } catch {
      return { valid: false, session: null };
    }
  },

  async createUser(username: string, password: string, fullName: string, role: "admin" | "student"): Promise<{ userId: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: { username, password, fullName, role }
      });

      if (error) {
        console.error("Signup edge function error:", error);
        return { userId: null, error: "خطا در برقراری ارتباط با سرور" };
      }

      if (data.error) {
        return { userId: null, error: data.error };
      }

      return { userId: data.userId, error: null };
    } catch (err) {
      console.error("Signup error:", err);
      return { userId: null, error: "خطا در برقراری ارتباط با سرور" };
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
    const session = this.getSession();
    if (!session) {
      return { success: false, error: "لطفا وارد شوید" };
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-change-password', {
        body: { token: session.token, currentPassword, newPassword }
      });

      if (error) {
        console.error("Change password edge function error:", error);
        return { success: false, error: "خطا در برقراری ارتباط با سرور" };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error("Change password error:", err);
      return { success: false, error: "خطا در برقراری ارتباط با سرور" };
    }
  },
};
