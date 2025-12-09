import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "@/lib/auth";
import { LogOut, MessageSquare, UserPlus, Trash2, Users, Video, Plus, Settings, BookOpen, Upload, FileText } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
  user_id: string;
}

interface StudentGrade {
  id: string;
  student_id: string;
  subject: string;
  grade: string | null;
}

interface OnlineClass {
  id: string;
  grade: string;
  title: string;
  link: string;
}

interface Jozveh {
  id: string;
  grade: string;
  subject: string;
  title: string;
  link: string;
  file_url: string | null;
}

const GRADE_OPTIONS = [
  { value: "7/1", label: "۷/۱" },
  { value: "7/2", label: "۷/۲" },
  { value: "7/3", label: "۷/۳" },
  { value: "7/4", label: "۷/۴" },
  { value: "8/1", label: "۸/۱" },
  { value: "8/2", label: "۸/۲" },
  { value: "8/3", label: "۸/۳" },
  { value: "8/4", label: "۸/۴" },
  { value: "9/1", label: "۹/۱" },
  { value: "9/2", label: "۹/۲" },
  { value: "9/3", label: "۹/۳" },
  { value: "9/4", label: "۹/۴" },
];

const SUBJECT_OPTIONS = [
  { value: "olom", label: "علوم" },
  { value: "riazi", label: "ریاضی" },
  { value: "tafakor", label: "تفکر" },
];

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [jozvehList, setJozvehList] = useState<Jozveh[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", username: "", password: "", grade: "7/1" });
  const [newClass, setNewClass] = useState({ grade: "7/1", title: "", link: "" });
  const [newJozveh, setNewJozveh] = useState({ grade: "7/1", subject: "olom", title: "" });
  const [jozvehFile, setJozvehFile] = useState<File | null>(null);
  const jozvehFileRef = useRef<HTMLInputElement>(null);
  
  // Student grades dialog
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchMessages();
    fetchStudents();
    fetchOnlineClasses();
    fetchJozveh();
  }, []);

  const checkAuth = async () => {
    const localSession = customAuth.getSession();
    if (!localSession) {
      navigate("/login");
      return;
    }

    // Validate session server-side to prevent localStorage manipulation
    const { valid, session } = await customAuth.validateSession();
    
    if (!valid || !session) {
      toast({
        title: "نشست نامعتبر",
        description: "لطفا دوباره وارد شوید",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (session.role !== "admin") {
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

  const fetchOnlineClasses = async () => {
    const { data, error } = await (supabase as any)
      .from("online_classes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOnlineClasses(data);
    }
  };

  const fetchJozveh = async () => {
    const { data, error } = await (supabase as any)
      .from("jozveh")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setJozvehList(data);
    }
  };

  const fetchStudentGrades = async (studentId: string) => {
    const { data, error } = await (supabase as any)
      .from("student_grades")
      .select("*")
      .eq("student_id", studentId);

    if (!error && data) {
      const grades: Record<string, string> = {};
      data.forEach((g: StudentGrade) => {
        grades[g.subject] = g.grade || "";
      });
      setStudentGrades(grades);
    }
  };

  const handleLogout = () => {
    customAuth.logout();
    navigate("/login");
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm("آیا از حذف این پیام اطمینان دارید؟")) return;

    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast({
        title: "حذف شد",
        description: "پیام با موفقیت حذف شد",
      });
      fetchMessages();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "حذف پیام با مشکل مواجه شد",
        variant: "destructive",
      });
    }
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { userId, error: authError } = await customAuth.createUser(
        newStudent.username,
        newStudent.password,
        newStudent.name,
        "student"
      );

      if (authError) {
        toast({
          title: "خطا",
          description: authError,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (userId) {
        const { error: studentError } = await supabase.from("students").insert({
          user_id: userId,
          full_name: newStudent.name,
          grade: newStudent.grade,
        });

        if (studentError) {
          toast({
            title: "خطا",
            description: studentError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "موفقیت‌آمیز",
          description: "دانش‌آموز با موفقیت ایجاد شد",
        });

        setNewStudent({ name: "", username: "", password: "", grade: "7/1" });
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

  const deleteStudent = async (studentId: string, userId: string) => {
    if (!confirm("آیا از حذف این دانش‌آموز اطمینان دارید؟")) return;

    try {
      await supabase.from("students").delete().eq("id", studentId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await (supabase as any).from("custom_users").delete().eq("id", userId);
      
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

  const openEditStudent = async (student: Student) => {
    setEditingStudent(student);
    setStudentGrades({});
    await fetchStudentGrades(student.id);
    setEditDialogOpen(true);
  };

  const saveStudentGrades = async () => {
    if (!editingStudent) return;
    setLoading(true);

    try {
      for (const subject of SUBJECT_OPTIONS) {
        const gradeValue = studentGrades[subject.value] || "";
        
        // Upsert the grade
        const { error } = await (supabase as any)
          .from("student_grades")
          .upsert({
            student_id: editingStudent.id,
            subject: subject.value,
            grade: gradeValue || null,
          }, {
            onConflict: 'student_id,subject'
          });

        if (error) throw error;
      }

      toast({
        title: "موفقیت‌آمیز",
        description: "نمرات دانش‌آموز ذخیره شد",
      });
      setEditDialogOpen(false);
      setEditingStudent(null);
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "ذخیره نمرات با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOnlineClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await (supabase as any)
        .from("online_classes")
        .insert({
          grade: newClass.grade,
          title: newClass.title,
          link: newClass.link,
        });

      if (error) throw error;

      toast({
        title: "موفقیت‌آمیز",
        description: "کلاس آنلاین با موفقیت ایجاد شد",
      });

      setNewClass({ grade: "7/1", title: "", link: "" });
      fetchOnlineClasses();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "ایجاد کلاس با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteOnlineClass = async (classId: string) => {
    if (!confirm("آیا از حذف این کلاس اطمینان دارید؟")) return;

    try {
      const { error } = await (supabase as any)
        .from("online_classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;

      toast({
        title: "حذف شد",
        description: "کلاس با موفقیت حذف شد",
      });
      fetchOnlineClasses();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "حذف کلاس با مشکل مواجه شد",
        variant: "destructive",
      });
    }
  };

  const createJozveh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jozvehFile) {
      toast({
        title: "خطا",
        description: "لطفاً یک فایل انتخاب کنید",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Upload file
      const fileExt = jozvehFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("jozveh-files")
        .upload(fileName, jozvehFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("jozveh-files")
        .getPublicUrl(fileName);

      const { error } = await (supabase as any)
        .from("jozveh")
        .insert({
          grade: newJozveh.grade,
          subject: newJozveh.subject,
          title: newJozveh.title,
          link: urlData.publicUrl,
          file_url: urlData.publicUrl,
        });

      if (error) throw error;

      toast({
        title: "موفقیت‌آمیز",
        description: "جزوه با موفقیت ایجاد شد",
      });

      setNewJozveh({ grade: "7/1", subject: "olom", title: "" });
      setJozvehFile(null);
      if (jozvehFileRef.current) jozvehFileRef.current.value = "";
      fetchJozveh();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "ایجاد جزوه با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteJozveh = async (jozvehId: string) => {
    if (!confirm("آیا از حذف این جزوه اطمینان دارید؟")) return;

    try {
      const { error } = await (supabase as any)
        .from("jozveh")
        .delete()
        .eq("id", jozvehId);

      if (error) throw error;

      toast({
        title: "حذف شد",
        description: "جزوه با موفقیت حذف شد",
      });
      fetchJozveh();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "حذف جزوه با مشکل مواجه شد",
        variant: "destructive",
      });
    }
  };

  const getGradeLabel = (grade: string) => {
    const found = GRADE_OPTIONS.find(g => g.value === grade);
    return found ? found.label : grade;
  };

  const getSubjectLabel = (subject: string) => {
    const found = SUBJECT_OPTIONS.find(s => s.value === subject);
    return found ? found.label : subject;
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-28 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in" dir="rtl">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
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

          <Tabs defaultValue="students" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1">
              <TabsTrigger value="students" className="gap-2 text-xs sm:text-sm py-3 data-[state=active]:animate-scale-in">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">دانش‌آموزان</span>
              </TabsTrigger>
              <TabsTrigger value="classes" className="gap-2 text-xs sm:text-sm py-3 data-[state=active]:animate-scale-in">
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">کلاس‌ها</span>
              </TabsTrigger>
              <TabsTrigger value="jozveh" className="gap-2 text-xs sm:text-sm py-3 data-[state=active]:animate-scale-in">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">جزوه‌ها</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2 text-xs sm:text-sm py-3 data-[state=active]:animate-scale-in">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">پیام‌ها</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="space-y-6 animate-fade-in">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300 hover:shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  افزودن دانش‌آموز جدید
                </h3>
                <form onSubmit={createStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="نام و نام خانوادگی"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                  />
                  <Input
                    placeholder="نام کاربری"
                    value={newStudent.username}
                    onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                  />
                  <Input
                    placeholder="رمز عبور"
                    type="password"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                  />
                  <Select value={newStudent.grade} onValueChange={(value) => setNewStudent({ ...newStudent, grade: value })}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="پایه تحصیلی" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={loading} className="sm:col-span-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? "در حال ایجاد..." : "ایجاد دانش‌آموز"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 border-2">
                <h3 className="text-xl font-bold mb-4">لیست دانش‌آموزان</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student, index) => (
                    <div 
                      key={student.id} 
                      className="p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 hover:bg-muted transition-all duration-300 hover:scale-[1.02]"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-lg">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">پایه: {getGradeLabel(student.grade)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditStudent(student)}
                          className="flex-1 gap-1 transition-all duration-200 hover:scale-105"
                        >
                          <Settings className="w-4 h-4" />
                          نمرات
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteStudent(student.id, student.user_id)}
                          className="transition-all duration-200 hover:scale-110"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 col-span-full">هیچ دانش‌آموزی وجود ندارد</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="classes" className="space-y-6 animate-fade-in">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300 hover:shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  افزودن کلاس آنلاین
                </h3>
                <form onSubmit={createOnlineClass} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="عنوان کلاس (مثال: کلاس آقای صابوری)"
                    value={newClass.title}
                    onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                  />
                  <Input
                    placeholder="لینک کلاس (مثال: meet.google.com/xxx)"
                    value={newClass.link}
                    onChange={(e) => setNewClass({ ...newClass, link: e.target.value })}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                    dir="ltr"
                  />
                  <Select value={newClass.grade} onValueChange={(value) => setNewClass({ ...newClass, grade: value })}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="پایه تحصیلی" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={loading} className="transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? "در حال ایجاد..." : "ایجاد کلاس"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 border-2">
                <h3 className="text-xl font-bold mb-4">لیست کلاس‌های آنلاین</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {onlineClasses.map((cls, index) => (
                    <div 
                      key={cls.id} 
                      className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 hover:bg-muted transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{cls.title}</p>
                        <p className="text-sm text-muted-foreground">پایه: {getGradeLabel(cls.grade)}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{cls.link}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteOnlineClass(cls.id)}
                        className="shrink-0 ml-3 transition-all duration-200 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {onlineClasses.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 col-span-full">هیچ کلاسی وجود ندارد</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="jozveh" className="space-y-6 animate-fade-in">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300 hover:shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  افزودن جزوه جدید
                </h3>
                <form onSubmit={createJozveh} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="عنوان جزوه"
                    value={newJozveh.title}
                    onChange={(e) => setNewJozveh({ ...newJozveh, title: e.target.value })}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      ref={jozvehFileRef}
                      onChange={(e) => setJozvehFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png,.jpeg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => jozvehFileRef.current?.click()}
                      className="w-full gap-2 justify-start"
                    >
                      <Upload className="w-4 h-4" />
                      {jozvehFile ? jozvehFile.name : "انتخاب فایل"}
                    </Button>
                  </div>
                  <Select value={newJozveh.subject} onValueChange={(value) => setNewJozveh({ ...newJozveh, subject: value })}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="موضوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newJozveh.grade} onValueChange={(value) => setNewJozveh({ ...newJozveh, grade: value })}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="پایه تحصیلی" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={loading || !jozvehFile} className="sm:col-span-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                    {loading ? "در حال آپلود..." : "ایجاد جزوه"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 border-2">
                <h3 className="text-xl font-bold mb-4">لیست جزوه‌ها</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {jozvehList.map((jozveh, index) => (
                    <div 
                      key={jozveh.id} 
                      className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 hover:bg-muted transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold truncate">{jozveh.title}</p>
                          <p className="text-sm text-muted-foreground">
                            پایه: {getGradeLabel(jozveh.grade)} | {getSubjectLabel(jozveh.subject)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteJozveh(jozveh.id)}
                        className="shrink-0 ml-3 transition-all duration-200 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {jozvehList.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 col-span-full">هیچ جزوه‌ای وجود ندارد</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {messages.length === 0 ? (
                  <Card className="p-12 text-center border-2 col-span-full">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-lg">هیچ پیامی وجود ندارد</p>
                  </Card>
                ) : (
                  messages.map((msg, index) => (
                    <Card 
                      key={msg.id} 
                      className="p-6 hover-lift border-2 hover:border-foreground/20 transition-all duration-300" 
                      dir="rtl"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{msg.name}</h4>
                          <p className="text-sm text-muted-foreground font-mono" dir="ltr">{msg.phone}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleDateString('fa-IR')}
                          </span>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteMessage(msg.id)}
                            className="transition-all duration-200 hover:scale-110"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-3">{msg.message}</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Student Grades Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              نمرات دانش‌آموز
            </DialogTitle>
            <DialogDescription>
              نمرات دروس مختلف را برای {editingStudent?.full_name} وارد کنید
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4 py-4">
              {SUBJECT_OPTIONS.map((subject) => (
                <div key={subject.value} className="flex items-center gap-4">
                  <label className="text-sm font-medium w-20">{subject.label}:</label>
                  <Input
                    placeholder="نمره"
                    value={studentGrades[subject.value] || ""}
                    onChange={(e) => setStudentGrades(prev => ({
                      ...prev,
                      [subject.value]: e.target.value
                    }))}
                    className="flex-1 text-right"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={saveStudentGrades} 
                  disabled={loading}
                  className="flex-1 transition-all duration-300 hover:scale-[1.02]"
                >
                  {loading ? "در حال ذخیره..." : "ذخیره نمرات"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;