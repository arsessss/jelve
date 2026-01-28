import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "@/lib/auth";
import { secureApi } from "@/lib/secure-api";
import { useAkhbar, renderFormattedText, Akhbar } from "@/hooks/use-akhbar";
import { 
  LogOut, MessageSquare, UserPlus, Trash2, Users, Video, Plus, Settings, 
  BookOpen, Upload, FileText, Send, ShieldCheck, GraduationCap, Calendar, 
  Edit2, Home, Newspaper, Image as ImageIcon
} from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";

interface Student {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
  user_id: string;
}

interface AdminUser {
  id: string;
  username: string;
  full_name: string | null;
}

interface GradePeriod {
  id: string;
  title: string;
  grade: string;
}

interface StudentPeriodGrade {
  id: string;
  student_id: string;
  period_id: string;
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

interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  created_at: string;
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
  { value: "zaban", label: "زبان" },
  { value: "riazi", label: "ریاضی" },
  { value: "farsi", label: "فارسی" },
  { value: "dini", label: "دینی" },
  { value: "quran", label: "قرآن" },
  { value: "arabi", label: "عربی" },
  { value: "tafakor", label: "تفکر و سبک زندگی" },
  { value: "fizik", label: "فیزیک" },
  { value: "shimi", label: "شیمی" },
  { value: "zist", label: "زیست" },
];

const JOZVEH_SUBJECT_OPTIONS = [
  { value: "olom", label: "علوم" },
  { value: "riazi", label: "ریاضی" },
  { value: "tafakor", label: "تفکر" },
];

type ActiveSection = "main" | "users" | "classes" | "jozveh" | "messages" | "chat" | "akhbar";

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [jozvehList, setJozvehList] = useState<Jozveh[]>([]);
  const [gradePeriods, setGradePeriods] = useState<GradePeriod[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", username: "", password: "", grade: "7/1", role: "student" as "student" | "admin" });
  const [newClass, setNewClass] = useState({ grade: "7/1", title: "", link: "" });
  const [newJozveh, setNewJozveh] = useState({ grade: "7/1", subject: "olom", title: "" });
  const [jozvehFile, setJozvehFile] = useState<File | null>(null);
  const jozvehFileRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("main");
  
  // Akhbar state
  const { akhbarList, createAkhbar, deleteAkhbar, uploadImage, refetch: refetchAkhbar } = useAkhbar();
  const [newAkhbar, setNewAkhbar] = useState({ title: "", content: "", targetGrades: [] as string[], isPublished: true });
  const [akhbarImage, setAkhbarImage] = useState<File | null>(null);
  const akhbarImageRef = useRef<HTMLInputElement>(null);
  const [akhbarLoading, setAkhbarLoading] = useState(false);
  
  // Student grades management
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
  const [studentPeriodsDialogOpen, setStudentPeriodsDialogOpen] = useState(false);
  const [newPeriodTitle, setNewPeriodTitle] = useState("");
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<GradePeriod | null>(null);
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const localSession = customAuth.getSession();
    if (!localSession) {
      navigate("/login");
      return;
    }

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
      return;
    }

    setCurrentUserId(session.user.id);
    fetchMessages();
    fetchStudents();
    fetchAdminUsers();
    fetchOnlineClasses();
    fetchJozveh();
    fetchGradePeriods();
  };

  const fetchMessages = async () => {
    const { data, error } = await secureApi.select<ContactMessage>('contact_messages');
    if (!error && data) setMessages(data);
  };

  const fetchStudents = async () => {
    const { data, error } = await secureApi.select<Student>('students');
    if (!error && data) setStudents(data);
  };

  const fetchAdminUsers = async () => {
    const { data: roles, error: rolesError } = await secureApi.select<{ user_id: string }>('user_roles', { role: 'admin' });
    if (rolesError || !roles) return;

    const userIds = roles.map(r => r.user_id);
    if (userIds.length === 0) {
      setAdminUsers([]);
      return;
    }

    const { data: users, error } = await secureApi.select<AdminUser>('custom_users');
    if (!error && users) {
      const admins = users.filter(u => userIds.includes(u.id));
      setAdminUsers(admins);
    }
  };

  const fetchOnlineClasses = async () => {
    const { data, error } = await secureApi.select<OnlineClass>('online_classes');
    if (!error && data) setOnlineClasses(data);
  };

  const fetchJozveh = async () => {
    const { data, error } = await secureApi.select<Jozveh>('jozveh');
    if (!error && data) setJozvehList(data);
  };

  const fetchGradePeriods = async () => {
    const { data, error } = await secureApi.select<GradePeriod>('grade_periods');
    if (!error && data) setGradePeriods(data);
  };

  const fetchStudentPeriodGrades = async (studentId: string, periodId: string) => {
    const { data, error } = await secureApi.select<StudentPeriodGrade>('student_period_grades', { 
      student_id: studentId, 
      period_id: periodId 
    });
    if (!error && data) {
      const grades: Record<string, string> = {};
      data.forEach((g: StudentPeriodGrade) => {
        grades[g.subject] = g.grade || "";
      });
      setStudentGrades(grades);
    } else {
      setStudentGrades({});
    }
  };

  const handleLogout = () => {
    customAuth.logout();
    navigate("/login");
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm("آیا از حذف این پیام اطمینان دارید؟")) return;
    const { error } = await secureApi.delete('contact_messages', messageId);
    if (error) {
      toast({ title: "خطا", description: "حذف پیام با مشکل مواجه شد", variant: "destructive" });
    } else {
      toast({ title: "حذف شد", description: "پیام با موفقیت حذف شد" });
      fetchMessages();
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { userId, error: authError } = await customAuth.createUser(
        newStudent.username,
        newStudent.password,
        newStudent.name,
        newStudent.role
      );

      if (authError) {
        toast({ title: "خطا", description: authError, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (userId) {
        if (newStudent.role === "student") {
          const { error: studentError } = await secureApi.insert('students', {
            user_id: userId,
            full_name: newStudent.name,
            grade: newStudent.grade,
          });

          if (studentError) {
            toast({ title: "خطا", description: studentError, variant: "destructive" });
            setLoading(false);
            return;
          }
        }

        toast({
          title: "موفقیت‌آمیز",
          description: newStudent.role === "admin" ? "ادمین با موفقیت ایجاد شد" : "دانش‌آموز با موفقیت ایجاد شد",
        });

        setNewStudent({ name: "", username: "", password: "", grade: "7/1", role: "student" });
        if (newStudent.role === "student") {
          fetchStudents();
        } else {
          fetchAdminUsers();
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "ایجاد کاربر با مشکل مواجه شد";
      toast({ title: "خطا", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (studentId: string, userId: string) => {
    if (!confirm("آیا از حذف این دانش‌آموز اطمینان دارید؟")) return;

    try {
      await secureApi.delete('students', studentId);
      await secureApi.delete('custom_users', userId);
      toast({ title: "حذف شد", description: "دانش‌آموز با موفقیت حذف شد" });
      fetchStudents();
    } catch {
      toast({ title: "خطا", description: "حذف دانش‌آموز با مشکل مواجه شد", variant: "destructive" });
    }
  };

  const openStudentGradesDialog = (student: Student) => {
    setSelectedStudentForGrades(student);
    setStudentPeriodsDialogOpen(true);
    setNewPeriodTitle("");
  };

  const createPeriodForStudent = async () => {
    if (!newPeriodTitle.trim() || !selectedStudentForGrades) {
      toast({ title: "خطا", description: "عنوان دوره الزامی است", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await secureApi.insert('grade_periods', {
      title: newPeriodTitle,
      grade: selectedStudentForGrades.grade,
    });

    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
    } else {
      toast({ title: "موفق", description: "دوره نمره جدید ایجاد شد" });
      setNewPeriodTitle("");
      fetchGradePeriods();
    }
    setLoading(false);
  };

  const deleteGradePeriod = async (periodId: string) => {
    if (!confirm("آیا از حذف این دوره و تمام نمرات مرتبط اطمینان دارید؟")) return;

    const { data: grades } = await secureApi.select<StudentPeriodGrade>('student_period_grades', { period_id: periodId });
    if (grades) {
      for (const g of grades) {
        await secureApi.delete('student_period_grades', g.id);
      }
    }

    const { error } = await secureApi.delete('grade_periods', periodId);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
    } else {
      toast({ title: "حذف شد", description: "دوره نمره حذف شد" });
      fetchGradePeriods();
    }
  };

  const openGradeDialog = async (period: GradePeriod) => {
    if (!selectedStudentForGrades) return;
    setSelectedPeriod(period);
    setStudentGrades({});
    await fetchStudentPeriodGrades(selectedStudentForGrades.id, period.id);
    setGradeDialogOpen(true);
  };

  const saveStudentPeriodGrades = async () => {
    if (!selectedStudentForGrades || !selectedPeriod) return;
    setLoading(true);

    try {
      for (const subject of SUBJECT_OPTIONS) {
        const gradeValue = studentGrades[subject.value] || "";
        
        const { error } = await secureApi.upsert('student_period_grades', {
          student_id: selectedStudentForGrades.id,
          period_id: selectedPeriod.id,
          subject: subject.value,
          grade: gradeValue || null,
        });

        if (error) throw new Error(error);
      }

      toast({ title: "موفق", description: "نمرات ذخیره شد" });
      setGradeDialogOpen(false);
    } catch {
      toast({ title: "خطا", description: "ذخیره نمرات با مشکل مواجه شد", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createOnlineClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await secureApi.insert('online_classes', {
        grade: newClass.grade,
        title: newClass.title,
        link: newClass.link,
      });

      if (error) throw new Error(error);

      toast({ title: "موفقیت‌آمیز", description: "کلاس آنلاین با موفقیت ایجاد شد" });
      setNewClass({ grade: "7/1", title: "", link: "" });
      fetchOnlineClasses();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "ایجاد کلاس با مشکل مواجه شد";
      toast({ title: "خطا", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteOnlineClass = async (classId: string) => {
    if (!confirm("آیا از حذف این کلاس اطمینان دارید؟")) return;

    const { error } = await secureApi.delete('online_classes', classId);
    if (error) {
      toast({ title: "خطا", description: "حذف کلاس با مشکل مواجه شد", variant: "destructive" });
    } else {
      toast({ title: "حذف شد", description: "کلاس با موفقیت حذف شد" });
      fetchOnlineClasses();
    }
  };

  const createJozveh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jozvehFile) {
      toast({ title: "خطا", description: "لطفاً یک فایل انتخاب کنید", variant: "destructive" });
      return;
    }
    
    setLoading(true);

    try {
      const fileExt = jozvehFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("jozveh-files")
        .upload(fileName, jozvehFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("jozveh-files")
        .getPublicUrl(fileName);

      const { error } = await secureApi.insert('jozveh', {
        grade: newJozveh.grade,
        subject: newJozveh.subject,
        title: newJozveh.title,
        link: urlData.publicUrl,
        file_url: urlData.publicUrl,
      });

      if (error) throw new Error(error);

      toast({ title: "موفقیت‌آمیز", description: "جزوه با موفقیت ایجاد شد" });
      setNewJozveh({ grade: "7/1", subject: "olom", title: "" });
      setJozvehFile(null);
      if (jozvehFileRef.current) jozvehFileRef.current.value = "";
      fetchJozveh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "ایجاد جزوه با مشکل مواجه شد";
      toast({ title: "خطا", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteJozveh = async (jozvehId: string) => {
    if (!confirm("آیا از حذف این جزوه اطمینان دارید؟")) return;

    const { error } = await secureApi.delete('jozveh', jozvehId);
    if (error) {
      toast({ title: "خطا", description: "حذف جزوه با مشکل مواجه شد", variant: "destructive" });
    } else {
      toast({ title: "حذف شد", description: "جزوه با موفقیت حذف شد" });
      fetchJozveh();
    }
  };

  const getGradeLabel = (grade: string) => {
    const found = GRADE_OPTIONS.find(g => g.value === grade);
    return found ? found.label : grade;
  };

  const getSubjectLabel = (subject: string) => {
    const found = [...SUBJECT_OPTIONS, ...JOZVEH_SUBJECT_OPTIONS].find(s => s.value === subject);
    return found ? found.label : subject;
  };

  const getPeriodsForStudentGrade = () => {
    if (!selectedStudentForGrades) return [];
    return gradePeriods.filter(p => p.grade === selectedStudentForGrades.grade);
  };

  const handleCreateAkhbar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAkhbar.title.trim() || !newAkhbar.content.trim() || !currentUserId) {
      toast({ title: "خطا", description: "عنوان و متن خبر الزامی است", variant: "destructive" });
      return;
    }
    
    setAkhbarLoading(true);
    
    let imageUrl: string | null = null;
    if (akhbarImage) {
      imageUrl = await uploadImage(akhbarImage);
    }
    
    const success = await createAkhbar(
      newAkhbar.title,
      newAkhbar.content,
      imageUrl,
      newAkhbar.targetGrades,
      newAkhbar.isPublished,
      currentUserId
    );
    
    if (success) {
      setNewAkhbar({ title: "", content: "", targetGrades: [], isPublished: true });
      setAkhbarImage(null);
      if (akhbarImageRef.current) akhbarImageRef.current.value = "";
    }
    
    setAkhbarLoading(false);
  };

  const handleDeleteAkhbar = async (id: string) => {
    if (!confirm("آیا از حذف این خبر اطمینان دارید؟")) return;
    await deleteAkhbar(id);
  };

  const toggleGradeInAkhbar = (grade: string) => {
    setNewAkhbar(prev => ({
      ...prev,
      targetGrades: prev.targetGrades.includes(grade)
        ? prev.targetGrades.filter(g => g !== grade)
        : [...prev.targetGrades, grade]
    }));
  };

  const sidebarItems = [
    { id: "main" as ActiveSection, icon: Home, label: "صفحه اصلی" },
    { id: "users" as ActiveSection, icon: Users, label: "کاربران" },
    { id: "classes" as ActiveSection, icon: Video, label: "کلاس‌ها" },
    { id: "jozveh" as ActiveSection, icon: FileText, label: "جزوه‌ها" },
    { id: "akhbar" as ActiveSection, icon: Newspaper, label: "اخبار" },
    { id: "messages" as ActiveSection, icon: MessageSquare, label: "پیام‌ها" },
    { id: "chat" as ActiveSection, icon: Send, label: "چت" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)]">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 bg-card border-b lg:border-b-0 lg:border-l border-border p-4 lg:p-6 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]" dir="rtl">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all duration-300 whitespace-nowrap lg:mt-auto"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="font-medium">خروج</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-8" dir="rtl">
            {/* Main/Dashboard Section */}
            {activeSection === "main" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold">پنل مدیریت</h1>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-6 border-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{students.length}</p>
                        <p className="text-sm text-muted-foreground">دانش‌آموز</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 border-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{adminUsers.length}</p>
                        <p className="text-sm text-muted-foreground">ادمین</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 border-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Video className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{onlineClasses.length}</p>
                        <p className="text-sm text-muted-foreground">کلاس</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-6 border-2">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{messages.length}</p>
                        <p className="text-sm text-muted-foreground">پیام</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Recent Messages */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    آخرین پیام‌ها
                  </h3>
                  {messages.slice(0, 3).map((msg) => (
                    <div key={msg.id} className="p-4 border-b border-border last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{msg.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{msg.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">هیچ پیامی وجود ندارد</p>
                  )}
                </Card>
              </div>
            )}

            {/* Users Section */}
            {activeSection === "users" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  مدیریت کاربران
                </h1>

                {/* Create User Form */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    افزودن کاربر جدید
                  </h3>
                  <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select value={newStudent.role} onValueChange={(value: "student" | "admin") => setNewStudent({ ...newStudent, role: value })}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="نوع کاربر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">دانش‌آموز</SelectItem>
                        <SelectItem value="admin">ادمین</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="نام و نام خانوادگی"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      required
                      className="text-right"
                    />
                    <Input
                      placeholder="نام کاربری"
                      value={newStudent.username}
                      onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
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
                    {newStudent.role === "student" && (
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
                    )}
                    <Button type="submit" disabled={loading} className={newStudent.role === "student" ? "" : "lg:col-span-2"}>
                      {loading ? "در حال ایجاد..." : newStudent.role === "admin" ? "ایجاد ادمین" : "ایجاد دانش‌آموز"}
                    </Button>
                  </form>
                </Card>

                {/* Admin Users List */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    لیست ادمین‌ها
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminUsers.map((admin) => (
                      <div key={admin.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold">{admin.full_name || admin.username}</p>
                            <p className="text-sm text-muted-foreground">@{admin.username}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {adminUsers.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 col-span-full">هیچ ادمینی وجود ندارد</p>
                    )}
                  </div>
                </Card>

                {/* Students List */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    لیست دانش‌آموزان
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                      <div key={student.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                              <GraduationCap className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <p className="font-bold">{student.full_name}</p>
                              <p className="text-sm text-muted-foreground">پایه: {getGradeLabel(student.grade)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStudentGradesDialog(student)}
                            title="مدیریت نمرات"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteStudent(student.id, student.user_id)}
                          className="w-full gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </Button>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 col-span-full">هیچ دانش‌آموزی وجود ندارد</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Classes Section */}
            {activeSection === "classes" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Video className="w-8 h-8 text-primary" />
                  مدیریت کلاس‌ها
                </h1>

                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    افزودن کلاس آنلاین
                  </h3>
                  <form onSubmit={createOnlineClass} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      placeholder="عنوان کلاس"
                      value={newClass.title}
                      onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                      required
                      className="text-right"
                    />
                    <Input
                      placeholder="لینک کلاس"
                      value={newClass.link}
                      onChange={(e) => setNewClass({ ...newClass, link: e.target.value })}
                      required
                      className="text-right"
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
                    <Button type="submit" disabled={loading}>
                      ایجاد کلاس
                    </Button>
                  </form>
                </Card>

                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">لیست کلاس‌های آنلاین</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {onlineClasses.map((cls) => (
                      <div key={cls.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{cls.title}</p>
                          <p className="text-sm text-muted-foreground">پایه: {getGradeLabel(cls.grade)}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteOnlineClass(cls.id)}
                          className="shrink-0 mr-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {onlineClasses.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 col-span-full">هیچ کلاسی وجود ندارد</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Jozveh Section */}
            {activeSection === "jozveh" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  مدیریت جزوه‌ها
                </h1>

                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    افزودن جزوه جدید
                  </h3>
                  <form onSubmit={createJozveh} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      placeholder="عنوان جزوه"
                      value={newJozveh.title}
                      onChange={(e) => setNewJozveh({ ...newJozveh, title: e.target.value })}
                      required
                      className="text-right"
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
                        {JOZVEH_SUBJECT_OPTIONS.map(s => (
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
                    <Button type="submit" disabled={loading || !jozvehFile} className="sm:col-span-2">
                      {loading ? "در حال آپلود..." : "ایجاد جزوه"}
                    </Button>
                  </form>
                </Card>

                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">لیست جزوه‌ها</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {jozvehList.map((jozveh) => (
                      <div key={jozveh.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border">
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
                          className="shrink-0 mr-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {jozvehList.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 col-span-full">هیچ جزوه‌ای وجود ندارد</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Akhbar Section */}
            {activeSection === "akhbar" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Newspaper className="w-8 h-8 text-primary" />
                  مدیریت اخبار
                </h1>

                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    افزودن خبر جدید
                  </h3>
                  <form onSubmit={handleCreateAkhbar} className="space-y-4">
                    <Input
                      placeholder="عنوان خبر"
                      value={newAkhbar.title}
                      onChange={(e) => setNewAkhbar({ ...newAkhbar, title: e.target.value })}
                      required
                      className="text-right"
                    />
                    <Textarea
                      placeholder="متن خبر (از ** برای بولد کردن استفاده کنید)"
                      value={newAkhbar.content}
                      onChange={(e) => setNewAkhbar({ ...newAkhbar, content: e.target.value })}
                      required
                      className="text-right min-h-[120px]"
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تصویر (اختیاری)</label>
                      <div className="relative">
                        <input
                          type="file"
                          ref={akhbarImageRef}
                          onChange={(e) => setAkhbarImage(e.target.files?.[0] || null)}
                          className="hidden"
                          accept="image/*"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => akhbarImageRef.current?.click()}
                          className="w-full gap-2 justify-start"
                        >
                          <ImageIcon className="w-4 h-4" />
                          {akhbarImage ? akhbarImage.name : "انتخاب تصویر"}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">پایه‌های هدف (خالی = همه)</label>
                      <div className="flex flex-wrap gap-2">
                        {GRADE_OPTIONS.map(g => (
                          <Button
                            key={g.value}
                            type="button"
                            variant={newAkhbar.targetGrades.includes(g.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleGradeInAkhbar(g.value)}
                          >
                            {g.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={newAkhbar.isPublished}
                        onCheckedChange={(checked) => setNewAkhbar({ ...newAkhbar, isPublished: checked })}
                      />
                      <label className="text-sm">منتشر شود</label>
                    </div>
                    <Button type="submit" disabled={akhbarLoading} className="w-full">
                      {akhbarLoading ? "در حال ایجاد..." : "ایجاد خبر"}
                    </Button>
                  </form>
                </Card>

                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">لیست اخبار</h3>
                  <div className="space-y-4">
                    {akhbarList.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">هیچ خبری وجود ندارد</p>
                    ) : (
                      akhbarList.map((item) => (
                        <div key={item.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg">{item.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString('fa-IR')}
                                {!item.is_published && " | پیش‌نویس"}
                                {item.target_grades.length > 0 && ` | پایه‌ها: ${item.target_grades.join(', ')}`}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteAkhbar(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {item.image_url && (
                            <img 
                              src={item.image_url} 
                              alt={item.title} 
                              className="w-full max-h-48 object-cover rounded-lg mb-3"
                            />
                          )}
                          <p className="text-sm whitespace-pre-wrap">
                            {renderFormattedText(item.content)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Messages Section */}
            {activeSection === "messages" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  پیام‌های تماس
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {messages.length === 0 ? (
                    <Card className="p-12 text-center border-2 col-span-full">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground text-lg">هیچ پیامی وجود ندارد</p>
                    </Card>
                  ) : (
                    messages.map((msg) => (
                      <Card key={msg.id} className="p-6 border-2">
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
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Chat Section */}
            {activeSection === "chat" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Send className="w-8 h-8 text-primary" />
                  چت
                </h1>
                
                {currentUserId && <ChatPanel currentUserId={currentUserId} />}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student Grades Dialog */}
      <Dialog open={studentPeriodsDialogOpen} onOpenChange={setStudentPeriodsDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              نمرات {selectedStudentForGrades?.full_name}
            </DialogTitle>
            <DialogDescription>
              افزودن دوره نمره و ویرایش نمرات دانش‌آموز
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="عنوان دوره (مثال: امتحان دی‌ماه)"
                value={newPeriodTitle}
                onChange={(e) => setNewPeriodTitle(e.target.value)}
                className="flex-1 text-right"
              />
              <Button onClick={createPeriodForStudent} disabled={loading || !newPeriodTitle.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                دوره‌های نمره
              </h4>
              {getPeriodsForStudentGrade().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">هیچ دوره‌ای وجود ندارد</p>
              ) : (
                getPeriodsForStudentGrade().map((period) => (
                  <div key={period.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <span className="font-medium">{period.title}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openGradeDialog(period)}
                        className="gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        نمرات
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteGradePeriod(period.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Grades Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              نمرات {selectedStudentForGrades?.full_name}
            </DialogTitle>
            <DialogDescription>
              دوره: {selectedPeriod?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {SUBJECT_OPTIONS.map((subject) => (
              <div key={subject.value} className="flex items-center gap-4">
                <label className="w-32 font-medium text-right text-sm">{subject.label}:</label>
                <Input
                  value={studentGrades[subject.value] || ""}
                  onChange={(e) => setStudentGrades({
                    ...studentGrades,
                    [subject.value]: e.target.value
                  })}
                  placeholder="نمره"
                  className="flex-1 text-right"
                />
              </div>
            ))}
            <Button 
              onClick={saveStudentPeriodGrades} 
              disabled={loading}
              className="w-full mt-4"
            >
              {loading ? "در حال ذخیره..." : "ذخیره نمرات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
