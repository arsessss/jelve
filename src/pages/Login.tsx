import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { customAuth } from "@/lib/auth";
import { Lock, User, UserCog } from "lucide-react";

type Role = "student" | "admin" | "";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const session = customAuth.getSession();
    if (session) {
      navigate(session.role === "admin" ? "/admin" : session.role === "student" ? "/student" : "/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast({
        title: "خطا",
        description: "لطفاً نوع کاربری خود را انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { session, error } = await customAuth.login(username, password);

    if (error) {
      toast({
        title: "خطا",
        description: error,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (session) {
      // Verify that the user's actual role matches what they selected
      if (session.role !== selectedRole) {
        toast({
          title: "خطا",
          description: selectedRole === "admin" 
            ? "شما دسترسی ادمین ندارید" 
            : "این حساب کاربری ادمین است",
          variant: "destructive",
        });
        customAuth.logout();
        setLoading(false);
        return;
      }

      toast({
        title: "خوش آمدید",
        description: "ورود موفقیت‌آمیز بود",
      });

      if (session.role === "admin") {
        navigate("/admin");
      } else if (session.role === "student") {
        navigate("/student");
      } else {
        navigate("/");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md p-8 animate-scale-in transition-all duration-500 hover:shadow-lg">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center transition-transform duration-500 hover:scale-110">
                <Lock className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent" dir="rtl">
                ورود به وبسایت
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
              <div>
                <label className="block text-sm font-medium mb-2">نوع کاربری</label>
                <Select value={selectedRole} onValueChange={(value: Role) => setSelectedRole(value)}>
                  <SelectTrigger className="text-right transition-all duration-200 focus:scale-[1.01]">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-muted-foreground" />
                      <SelectValue placeholder="نوع کاربری را انتخاب کنید" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span>دانش‌آموز</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span>ادمین</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">نام کاربری</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors duration-200" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="pr-10 text-right transition-all duration-200 focus:scale-[1.01]"
                    placeholder="نام کاربری"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رمز عبور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors duration-200" />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type="password"
                    className="pr-10 text-right transition-all duration-200 focus:scale-[1.01]"
                    placeholder="رمز عبور"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gradient-primary text-primary-foreground font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>در حال ورود...</span>
                  </div>
                ) : (
                  "ورود"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
