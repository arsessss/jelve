import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, BookOpen, GraduationCap, FileText } from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
}

const Student = () => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    // Check if user is student
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (!roles || !roles.some(r => r.role === "student")) {
      toast({
        title: "دسترسی غیرمجاز",
        description: "شما دسترسی به این صفحه ندارید",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Fetch student data
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (student) {
      setStudentData(student);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getGradeLabel = (grade: string) => {
    const labels: Record<string, string> = {
      haftom: "هفتم",
      hashtom: "هشتم",
      nohom: "نهم",
    };
    return labels[grade] || grade;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <h1 className="text-5xl font-bold text-foreground" dir="rtl">
              پنل دانش‌آموز
            </h1>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="gap-2 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>

          {studentData && (
            <div className="space-y-6 animate-slide-up">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-colors" dir="rtl">
                <div className="flex items-center gap-4 mb-6">
                  <GraduationCap className="w-10 h-10 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold">{studentData.full_name}</h2>
                    <p className="text-muted-foreground">پایه تحصیلی: {getGradeLabel(studentData.grade)}</p>
                    {studentData.student_id && (
                      <p className="text-sm text-muted-foreground">شماره دانش‌آموزی: {studentData.student_id}</p>
                    )}
                  </div>
                </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300 hover:shadow-lg cursor-pointer" dir="rtl">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                    <h3 className="text-xl font-bold">نمرات من</h3>
                  </div>
                  <p className="text-muted-foreground">مشاهده نمرات و عملکرد تحصیلی</p>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">نمرات به زودی در دسترس خواهد بود</p>
                  </div>
                </Card>

                <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300 hover:shadow-lg cursor-pointer" dir="rtl">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                    <h3 className="text-xl font-bold">جزوه‌های من</h3>
                  </div>
                  <p className="text-muted-foreground">دسترسی به جزوه‌ها و منابع درسی</p>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">جزوه‌ها به زودی در دسترس خواهد بود</p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Student;
