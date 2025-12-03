import { supabase } from "@/integrations/supabase/client";

export interface CustomUser {
  id: string;
  username: string;
  full_name: string | null;
}

export interface AuthSession {
  user: CustomUser;
  role: "admin" | "student" | null;
}

const SESSION_KEY = "jelve_session";

export const customAuth = {
  async login(username: string, password: string): Promise<{ session: AuthSession | null; error: string | null }> {
    const { data: users, error } = await supabase
      .from("custom_users")
      .select("id, username, password_hash, full_name")
      .eq("username", username)
      .single();

    if (error || !users) {
      return { session: null, error: "نام کاربری یا رمز عبور اشتباه است" };
    }

    if (users.password_hash !== password) {
      return { session: null, error: "نام کاربری یا رمز عبور اشتباه است" };
    }

    // Get user role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", users.id);

    const role = roles && roles.length > 0 ? roles[0].role as "admin" | "student" : null;

    const session: AuthSession = {
      user: {
        id: users.id,
        username: users.username,
        full_name: users.full_name,
      },
      role,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event("auth-change"));

    return { session, error: null };
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("auth-change"));
  },

  getSession(): AuthSession | null {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthSession;
    } catch {
      return null;
    }
  },

  async createUser(username: string, password: string, fullName: string, role: "admin" | "student"): Promise<{ userId: string | null; error: string | null }> {
    // Insert into custom_users
    const { data: newUser, error: userError } = await supabase
      .from("custom_users")
      .insert({
        username,
        password_hash: password,
        full_name: fullName,
      })
      .select("id")
      .single();

    if (userError) {
      if (userError.code === "23505") {
        return { userId: null, error: "این نام کاربری قبلاً استفاده شده است" };
      }
      return { userId: null, error: userError.message };
    }

    // Insert role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.id,
        role,
      });

    if (roleError) {
      return { userId: null, error: roleError.message };
    }

    return { userId: newUser.id, error: null };
  },
};
