import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Save, MessageSquare, UserPlus, Trash2, Users } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
  user_id: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", email: "", password: "", grade: "haftom" });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchMessages();
    fetchStudents();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (!roles || !roles.some(r => r.role === "admin")) {
      toast({
        title: "دسترسی غیرمجاز",
        description: "شما دسترسی به این صفحه ندارید",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data);
    }
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStudents(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSave = () => {
    toast({
      title: "ذخیره شد",
      description: "تغییرات با موفقیت ذخیره شد",
    });
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStudent.email,
        password: newStudent.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "student",
        });

        await supabase.from("students").insert({
          user_id: authData.user.id,
          full_name: newStudent.name,
          grade: newStudent.grade,
        });

        toast({
          title: "موفقیت‌آمیز",
          description: "دانش‌آموز با موفقیت ایجاد شد",
        });

        setNewStudent({ name: "", email: "", password: "", grade: "haftom" });
        fetchStudents();
      }
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "ایجاد دانش‌آموز با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm("آیا از حذف این دانش‌آموز اطمینان دارید؟")) return;

    try {
      await supabase.from("students").delete().eq("id", studentId);
      
      toast({
        title: "حذف شد",
        description: "دانش‌آموز با موفقیت حذف شد",
      });
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "حذف دانش‌آموز با مشکل مواجه شد",
        variant: "destructive",
      });
    }
  };

  const getGradeLabel = (grade: string) => {
    const labels: Record<string, string> = {
      haftom: "هفتم",
      hashtom: "هشتم",
      nohom: "نهم",
    };
    return labels[grade] || grade;
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <h1 className="text-5xl font-bold text-foreground" dir="rtl">
              پنل مدیریت
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

          <Tabs defaultValue="students" className="w-full animate-slide-up" dir="rtl">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="students" className="gap-2">
                <Users className="w-4 h-4" />
                دانش‌آموزان
              </TabsTrigger>
              <TabsTrigger value="content">ویرایش محتوا</TabsTrigger>
              <TabsTrigger value="addresses">آدرس‌ها</TabsTrigger>
              <TabsTrigger value="messages">پیام‌ها</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-6">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-colors">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  افزودن دانش‌آموز جدید
                </h3>
                <form onSubmit={createStudent} className="space-y-4">
                  <Input
                    placeholder="نام و نام خانوادگی"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    required
                    className="text-right"
                  />
                  <Input
                    placeholder="ایمیل"
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    required
                    className="text-right"
                  />
                  <Input
                    placeholder="رمز عبور"
                    type="password"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    required
                    className="text-right"
                  />
                  <Select value={newStudent.grade} onValueChange={(value) => setNewStudent({ ...newStudent, grade: value })}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="پایه تحصیلی" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="haftom">هفتم</SelectItem>
                      <SelectItem value="hashtom">هشتم</SelectItem>
                      <SelectItem value="nohom">نهم</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "در حال ایجاد..." : "ایجاد دانش‌آموز"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 border-2">
                <h3 className="text-xl font-bold mb-4">لیست دانش‌آموزان</h3>
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 transition-all duration-300">
                      <div>
                        <p className="font-bold">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground">پایه: {getGradeLabel(student.grade)}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteStudent(student.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">هیچ دانش‌آموزی وجود ندارد</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card className="p-6 border-2">
                <h3 className="text-lg font-bold mb-4">عنوان صفحه اصلی</h3>
                <Input 
                  defaultValue="مجتمع آموزشی جلوه"
                  className="text-right mb-4"
                />
                <h3 className="text-lg font-bold mb-4">توضیحات</h3>
                <Textarea 
                  defaultValue="تربیت نسلی موفق با آموزش باکیفیت"
                  className="text-right"
                  rows={3}
                />
                <Button onClick={handleSave} className="mt-4">
                  <Save className="w-4 h-4 ml-2" />
                  ذخیره تغییرات
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4">
              {[
                { title: "دوره اول پسرانه", address: "مهرشهر، بلوار شهرداری، خ 110، پلاک 890", phone: "026-33423481" },
                { title: "دوره دوم پسرانه", address: "مهرشهر، بلوار شهرداری، خ 206، پلاک 485", phone: "026-33408785" },
                { title: "دوره دوم دخترانه", address: "مهرشهر، بلوار شهرداری، خ 209، پلاک 165", phone: "026-33400994" }
              ].map((item, idx) => (
                <Card key={idx} className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">{item.title}</h3>
                  <Input 
                    placeholder="آدرس"
                    defaultValue={item.address}
                    className="text-right mb-3"
                  />
                  <Input 
                    placeholder="شماره تماس"
                    defaultValue={item.phone}
                    className="text-right"
                    dir="ltr"
                  />
                  <Button onClick={handleSave} className="mt-4">
                    <Save className="w-4 h-4 ml-2" />
                    ذخیره
                  </Button>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="messages">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <Card className="p-12 text-center border-2">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-lg">هیچ پیامی وجود ندارد</p>
                  </Card>
                ) : (
                  messages.map((msg) => (
                    <Card key={msg.id} className="p-6 hover-lift border-2 hover:border-foreground/20" dir="rtl">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{msg.name}</h4>
                          <p className="text-sm text-muted-foreground font-mono" dir="ltr">{msg.phone}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{msg.message}</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
