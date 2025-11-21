import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, User } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check user role and redirect accordingly
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (roles && roles.length > 0) {
          const role = roles[0].role;
          navigate(role === "admin" ? "/admin" : role === "student" ? "/student" : "/");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        // Check user role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        toast({
          title: "خوش آمدید",
          description: "ورود موفقیت‌آمیز بود",
        });

        if (roles && roles.length > 0) {
          const role = roles[0].role;
          if (role === "admin") {
            navigate("/admin");
          } else if (role === "student") {
            navigate("/student");
          } else {
            navigate("/");
          }
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message === "Invalid login credentials" 
          ? "نام کاربری یا رمز عبور اشتباه است" 
          : "ورود با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md p-8 animate-scale-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" dir="rtl">
                ورود به وبسایت
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
              <div>
                <label className="block text-sm font-medium mb-2">نام کاربری</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="pr-10 text-right"
                    placeholder="نام"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رمز عبور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type="password"
                    className="pr-10 text-right"
                    placeholder="رمز عبور"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gradient-primary text-white font-bold"
                disabled={loading}
              >
                {loading ? "در حال ورود..." : "ورود"}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
