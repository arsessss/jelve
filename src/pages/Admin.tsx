import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "@/lib/auth";
import { secureApi } from "@/lib/secure-api";
import { useAkhbar, renderFormattedText, Akhbar } from "@/hooks/use-akhbar";
import { LogOut, MessageSquare, UserPlus, Trash2, Users, Video, Plus, Settings, BookOpen, Upload, FileText, Send, ShieldCheck, GraduationCap, Calendar, Edit2, Home, Newspaper, Image as ImageIcon, Shield, ClipboardList, Eye, User, Lock, Download, Camera, Pencil } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { ConfirmDialog, useConfirm } from "@/components/ConfirmDialog";
import { playNotificationSound } from "@/lib/notification-sound";

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
interface CustomUserData {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture: string | null;
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
  target_grades?: string[];
}
interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  created_at: string;
}
interface PishSabtenamData {
  id: string;
  unit_number: number;
  title: string;
  content: string;
  image_url: string | null;
  is_enabled: boolean;
}
interface TaklifData {
  id: string;
  student_id: string;
  subject: string;
  file_url: string;
  file_name: string;
  grade: string;
  status: string;
  created_at: string;
}

const GRADE_OPTIONS = [
  { value: "7/1", label: "۷/۱" }, { value: "7/2", label: "۷/۲" }, { value: "7/3", label: "۷/۳" }, { value: "7/4", label: "۷/۴" },
  { value: "8/1", label: "۸/۱" }, { value: "8/2", label: "۸/۲" }, { value: "8/3", label: "۸/۳" }, { value: "8/4", label: "۸/۴" },
  { value: "9/1", label: "۹/۱" }, { value: "9/2", label: "۹/۲" }, { value: "9/3", label: "۹/۳" }, { value: "9/4", label: "۹/۴" },
];
const SUBJECT_OPTIONS = [
  { value: "zaban", label: "زبان" }, { value: "riazi", label: "ریاضی" }, { value: "farsi", label: "فارسی" },
  { value: "dini", label: "دینی" }, { value: "quran", label: "قرآن" }, { value: "arabi", label: "عربی" },
  { value: "tafakor", label: "تفکر و سبک زندگی" }, { value: "fizik", label: "فیزیک" }, { value: "shimi", label: "شیمی" },
  { value: "zist", label: "زیست" },
];
const JOZVEH_SUBJECT_OPTIONS = [
  { value: "olom", label: "علوم" }, { value: "riazi", label: "ریاضی" }, { value: "tafakor", label: "تفکر" },
  { value: "zaban", label: "زبان" }, { value: "farsi", label: "فارسی" }, { value: "dini", label: "دینی" },
  { value: "quran", label: "قرآن" }, { value: "arabi", label: "عربی" }, { value: "fizik", label: "فیزیک" },
  { value: "shimi", label: "شیمی" }, { value: "zist", label: "زیست" },
];

const IMAGE_SIZE_OPTIONS = [
  { value: "small", label: "کوچک" },
  { value: "medium", label: "متوسط" },
  { value: "large", label: "بزرگ" },
];

type ActiveSection = "main" | "users" | "classes" | "jozveh" | "messages" | "chat" | "akhbar" | "roles" | "pish_sabtenam" | "account" | "taklif";

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [jozvehList, setJozvehList] = useState<Jozveh[]>([]);
  const [gradePeriods, setGradePeriods] = useState<GradePeriod[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", username: "", password: "", grade: "7/1", role: "student" as "student" | "admin" | "parent", nationalId: "" });
  const [newClass, setNewClass] = useState({ grade: "7/1", title: "", link: "" });
  const [newJozveh, setNewJozveh] = useState({ grade: "7/1", subject: "olom", title: "", targetGrades: [] as string[] });
  const [jozvehFile, setJozvehFile] = useState<File | null>(null);
  const jozvehFileRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("main");
  const [isModir, setIsModir] = useState(false);

  // User data for account section
  const [userData, setUserData] = useState<CustomUserData | null>(null);
  const [uploading, setUploading] = useState(false);
  const profileFileRef = useRef<HTMLInputElement>(null);

  // Akhbar state
  const { akhbarList, createAkhbar, deleteAkhbar, uploadImage, refetch: refetchAkhbar } = useAkhbar();
  const [newAkhbar, setNewAkhbar] = useState({ title: "", content: "", targetGrades: [] as string[], isPublished: true, imageSize: "large" });
  const [akhbarImage, setAkhbarImage] = useState<File | null>(null);
  const akhbarImageRef = useRef<HTMLInputElement>(null);
  const [akhbarLoading, setAkhbarLoading] = useState(false);
  const [akhbarImagePreview, setAkhbarImagePreview] = useState<string | null>(null);

  // Student grades
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
  const [studentPeriodsDialogOpen, setStudentPeriodsDialogOpen] = useState(false);
  const [newPeriodTitle, setNewPeriodTitle] = useState("");
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<GradePeriod | null>(null);
  const [studentGrades, setStudentGrades] = useState<Record<string, string>>({});

  // Edit user
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ full_name: "", username: "", password: "" });
  const [editUserLoading, setEditUserLoading] = useState(false);

  // Pish Sabtenam
  const [pishSabtenamList, setPishSabtenamList] = useState<PishSabtenamData[]>([]);
  const [editingPish, setEditingPish] = useState<PishSabtenamData | null>(null);
  const [pishForm, setPishForm] = useState({ title: "", content: "" });
  const [pishImage, setPishImage] = useState<File | null>(null);
  const pishImageRef = useRef<HTMLInputElement>(null);
  const [pishLoading, setPishLoading] = useState(false);

  // Account
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [changingUsername, setChangingUsername] = useState(false);

  // Taklif
  const [taklifList, setTaklifList] = useState<TaklifData[]>([]);
  const [taklifGradeFilter, setTaklifGradeFilter] = useState("all");
  const [taklifSubjectFilter, setTaklifSubjectFilter] = useState("all");

  // Notification badges
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({ messages: 0, chat: 0, taklif: 0 });
  const lastSeenRef = useRef<Record<string, number>>({ messages: 0, chat: 0, taklif: 0 });
  const [fadingBadges, setFadingBadges] = useState<Record<string, boolean>>({});

  const confirm = useConfirm();

  const navigate = useNavigate();

  // Clear badge when viewing a tab (with fade-out)
  useEffect(() => {
    if (activeSection === "messages" || activeSection === "chat" || activeSection === "taklif") {
      const key = activeSection;
      if (badgeCounts[key] > 0) {
        setFadingBadges(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
          const currentTotal = key === "messages" ? messages.length : key === "taklif" ? taklifList.filter(t => t.status === "pending").length : 0;
          lastSeenRef.current[key] = currentTotal;
          setBadgeCounts(prev => ({ ...prev, [key]: 0 }));
          setFadingBadges(prev => ({ ...prev, [key]: false }));
        }, 300);
      } else {
        const currentTotal = key === "messages" ? messages.length : key === "taklif" ? taklifList.filter(t => t.status === "pending").length : 0;
        lastSeenRef.current[key] = currentTotal;
      }
    }
  }, [activeSection]);

  // Note: Badge updates for messages and taklif are now handled by realtime subscriptions below

  // Realtime chat notifications
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel('admin-chat-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string };
        if (msg.sender_id !== currentUserId && activeSection !== "chat") {
          setBadgeCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
          playNotificationSound();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, activeSection]);

  // Realtime contact_messages notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-contact-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => {
        fetchMessages();
        if (activeSection !== "messages") {
          setBadgeCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
          playNotificationSound();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'contact_messages' }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSection]);

  // Realtime taklif notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-taklif-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'taklif' }, () => {
        fetchTaklif();
        if (activeSection !== "taklif") {
          setBadgeCounts(prev => ({ ...prev, taklif: prev.taklif + 1 }));
          playNotificationSound();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'taklif' }, () => {
        fetchTaklif();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'taklif' }, () => {
        fetchTaklif();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSection]);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const localSession = customAuth.getSession();
    if (!localSession) { navigate("/login"); return; }
    const { valid, session } = await customAuth.validateSession();
    if (!valid || !session) { toast.error("لطفا دوباره وارد شوید"); navigate("/login"); return; }
    if (session.role !== "admin") { toast.error("دسترسی غیرمجاز"); navigate("/"); return; }
    setCurrentUserId(session.user.id);
    setIsModir(session.user.username === "@Modir");
    fetchMessages(); fetchStudents(); fetchAdminUsers(); fetchOnlineClasses(); fetchJozveh(); fetchGradePeriods(); fetchPishSabtenam(); fetchTaklif();
    fetchUserData(session.user.id);
  };

  const fetchMessages = async () => { const { data } = await secureApi.select<ContactMessage>('contact_messages'); if (data) setMessages(data); };
  const fetchStudents = async () => { const { data } = await secureApi.select<Student>('students'); if (data) setStudents(data); };
  const fetchAdminUsers = async () => {
    const { data: roles } = await secureApi.select<{ user_id: string }>('user_roles', { role: 'admin' });
    if (!roles) return;
    const userIds = roles.map(r => r.user_id);
    if (userIds.length === 0) { setAdminUsers([]); return; }
    const { data: users } = await secureApi.select<AdminUser>('custom_users');
    if (users) setAdminUsers(users.filter(u => userIds.includes(u.id)));
  };
  const fetchOnlineClasses = async () => { const { data } = await secureApi.select<OnlineClass>('online_classes'); if (data) setOnlineClasses(data); };
  const fetchJozveh = async () => { const { data } = await secureApi.select<Jozveh>('jozveh'); if (data) setJozvehList(data); };
  const fetchGradePeriods = async () => { const { data } = await secureApi.select<GradePeriod>('grade_periods'); if (data) setGradePeriods(data); };
  const fetchPishSabtenam = async () => { const { data } = await secureApi.select<PishSabtenamData>('pish_sabtenam'); if (data) setPishSabtenamList(data.sort((a, b) => a.unit_number - b.unit_number)); };
  const fetchTaklif = async () => { const { data } = await secureApi.select<TaklifData>('taklif'); if (data) setTaklifList(data); };
  const fetchUserData = async (userId: string) => { const { data } = await secureApi.select<CustomUserData>('custom_users', { id: userId }); if (data && data.length > 0) setUserData(data[0]); };
  const fetchStudentPeriodGrades = async (studentId: string, periodId: string) => {
    const { data } = await secureApi.select<StudentPeriodGrade>('student_period_grades', { student_id: studentId, period_id: periodId });
    if (data) {
      const grades: Record<string, string> = {};
      data.forEach(g => { grades[g.subject] = g.grade || ""; });
      setStudentGrades(grades);
    } else { setStudentGrades({}); }
  };

  const handleLogout = () => { customAuth.logout(); navigate("/login"); };

  const deleteMessage = async (id: string) => {
    if (!(await confirm("آیا از حذف این پیام اطمینان دارید؟"))) return;
    const { error } = await secureApi.delete('contact_messages', id);
    if (error) toast.error("حذف پیام ناموفق بود"); else { toast.success("پیام حذف شد"); fetchMessages(); }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudent.password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if ((newStudent.role === "student" || newStudent.role === "parent") && !newStudent.nationalId.trim()) {
      toast.error("شماره ملی الزامی است");
      return;
    }
    setLoading(true);
    try {
      if (newStudent.role === "parent") {
        const { data: matchingStudents } = await secureApi.select<Student>('students', { student_id: newStudent.nationalId.trim() });
        if (!matchingStudents || matchingStudents.length === 0) {
          toast.error("دانش‌آموزی با این شماره ملی یافت نشد");
          setLoading(false);
          return;
        }
      }

      const { userId, error: authError } = await customAuth.createUser(newStudent.username, newStudent.password, newStudent.name, newStudent.role as "admin" | "student");
      if (authError) { toast.error(authError); setLoading(false); return; }
      if (userId) {
        if (newStudent.role === "student") {
          const { error } = await secureApi.insert('students', { user_id: userId, full_name: newStudent.name, grade: newStudent.grade, student_id: newStudent.nationalId.trim() });
          if (error) { toast.error(error); setLoading(false); return; }
        }
        if (newStudent.role === "parent") {
          const { data: matchingStudents } = await secureApi.select<Student>('students', { student_id: newStudent.nationalId.trim() });
          if (matchingStudents) {
            for (const student of matchingStudents) {
              await secureApi.insert('parent_students', { parent_id: userId, student_id: student.id });
            }
          }
        }
        toast.success(newStudent.role === "admin" ? "ادمین ایجاد شد" : newStudent.role === "parent" ? "حساب والدین ایجاد شد" : "دانش‌آموز ایجاد شد");
        setNewStudent({ name: "", username: "", password: "", grade: "7/1", role: "student", nationalId: "" });
        if (newStudent.role === "student") fetchStudents(); else fetchAdminUsers();
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "ایجاد کاربر ناموفق بود");
    } finally { setLoading(false); }
  };

  const deleteStudent = async (studentId: string, userId: string) => {
    if (!(await confirm("آیا از حذف اطمینان دارید؟"))) return;
    try {
      await secureApi.delete('students', studentId);
      await secureApi.delete('custom_users', userId);
      toast.success("حذف شد");
      fetchStudents();
    } catch { toast.error("حذف ناموفق بود"); }
  };

  const deleteAdminUser = async (adminUser: AdminUser) => {
    if (!(await confirm(`آیا از حذف ادمین ${adminUser.full_name || adminUser.username} اطمینان دارید؟`))) return;
    try {
      const { data: roles } = await secureApi.select<{ id: string; user_id: string }>('user_roles', { user_id: adminUser.id });
      if (roles) {
        for (const role of roles) {
          await secureApi.delete('user_roles', role.id);
        }
      }
      await secureApi.delete('custom_users', adminUser.id);
      toast.success("ادمین حذف شد");
      fetchAdminUsers();
    } catch { toast.error("حذف ناموفق بود"); }
  };

  const openEditUserDialog = (student: Student) => {
    setEditingStudent(student);
    setEditingAdminUser(null);
    setEditUserForm({ full_name: student.full_name, username: "", password: "" });
    setEditUserDialogOpen(true);
  };

  const openEditAdminDialog = (admin: AdminUser) => {
    setEditingAdminUser(admin);
    setEditingStudent(null);
    setEditUserForm({ full_name: admin.full_name || "", username: "", password: "" });
    setEditUserDialogOpen(true);
  };

  const handleEditUser = async () => {
    const targetUserId = editingStudent?.user_id || editingAdminUser?.id;
    if (!targetUserId) return;
    setEditUserLoading(true);
    try {
      if (editingStudent) {
        if (editUserForm.full_name && editUserForm.full_name !== editingStudent.full_name) {
          await secureApi.update('students', editingStudent.id, { full_name: editUserForm.full_name });
          await secureApi.update('custom_users', editingStudent.user_id, { full_name: editUserForm.full_name });
        }
      } else if (editingAdminUser && editUserForm.full_name) {
        await secureApi.update('custom_users', editingAdminUser.id, { full_name: editUserForm.full_name });
      }
      if (editUserForm.username.trim()) {
        await secureApi.update('custom_users', targetUserId, { username: editUserForm.username });
      }
      if (editUserForm.password.trim()) {
        const session = customAuth.getSession();
        if (session) {
          const { data: result, error } = await supabase.functions.invoke('auth-change-password', {
            body: { token: session.token, target_user_id: targetUserId, new_password: editUserForm.password }
          });
          if (error || result?.error) { toast.error(result?.error || "تغییر رمز ناموفق بود"); setEditUserLoading(false); return; }
        }
      }
      toast.success("اطلاعات ویرایش شد");
      setEditUserDialogOpen(false);
      fetchStudents(); fetchAdminUsers();
    } catch { toast.error("ویرایش ناموفق بود"); }
    finally { setEditUserLoading(false); }
  };

  const openStudentGradesDialog = (student: Student) => { setSelectedStudentForGrades(student); setStudentPeriodsDialogOpen(true); setNewPeriodTitle(""); };

  const createPeriodForStudent = async () => {
    if (!newPeriodTitle.trim() || !selectedStudentForGrades) { toast.error("عنوان دوره الزامی است"); return; }
    setLoading(true);
    const { error } = await secureApi.insert('grade_periods', { title: newPeriodTitle, grade: selectedStudentForGrades.grade });
    if (error) toast.error(error); else { toast.success("دوره ایجاد شد"); setNewPeriodTitle(""); fetchGradePeriods(); }
    setLoading(false);
  };

  const deleteGradePeriod = async (periodId: string) => {
    if (!(await confirm("آیا از حذف اطمینان دارید؟"))) return;
    const { data: grades } = await secureApi.select<StudentPeriodGrade>('student_period_grades', { period_id: periodId });
    if (grades) { for (const g of grades) await secureApi.delete('student_period_grades', g.id); }
    const { error } = await secureApi.delete('grade_periods', periodId);
    if (error) toast.error(error); else { toast.success("حذف شد"); fetchGradePeriods(); }
  };

  const openGradeDialog = async (period: GradePeriod) => {
    if (!selectedStudentForGrades) return;
    setSelectedPeriod(period); setStudentGrades({});
    await fetchStudentPeriodGrades(selectedStudentForGrades.id, period.id);
    setGradeDialogOpen(true);
  };

  const saveStudentPeriodGrades = async () => {
    if (!selectedStudentForGrades || !selectedPeriod) return;
    setLoading(true);
    try {
      for (const subject of SUBJECT_OPTIONS) {
        await secureApi.upsert('student_period_grades', { student_id: selectedStudentForGrades.id, period_id: selectedPeriod.id, subject: subject.value, grade: studentGrades[subject.value] || null });
      }
      toast.success("نمرات ذخیره شد"); setGradeDialogOpen(false);
    } catch { toast.error("ذخیره ناموفق بود"); }
    finally { setLoading(false); }
  };

  const createOnlineClass = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { error } = await secureApi.insert('online_classes', { grade: newClass.grade, title: newClass.title, link: newClass.link });
      if (error) throw new Error(error);
      toast.success("کلاس ایجاد شد"); setNewClass({ grade: "7/1", title: "", link: "" }); fetchOnlineClasses();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(false); }
  };

  const deleteOnlineClass = async (id: string) => {
    if (!(await confirm("حذف؟"))) return;
    const { error } = await secureApi.delete('online_classes', id);
    if (error) toast.error("خطا"); else { toast.success("حذف شد"); fetchOnlineClasses(); }
  };

  const createJozveh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jozvehFile) { toast.error("فایل انتخاب کنید"); return; }
    setLoading(true);
    try {
      const fileExt = jozvehFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("jozveh-files").upload(fileName, jozvehFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("jozveh-files").getPublicUrl(fileName);
      const { error } = await secureApi.insert('jozveh', {
        grade: newJozveh.grade, subject: newJozveh.subject, title: newJozveh.title,
        link: urlData.publicUrl, file_url: urlData.publicUrl,
        target_grades: newJozveh.targetGrades.length > 0 ? newJozveh.targetGrades : []
      });
      if (error) throw new Error(error);
      toast.success("جزوه ایجاد شد");
      setNewJozveh({ grade: "7/1", subject: "olom", title: "", targetGrades: [] });
      setJozvehFile(null);
      if (jozvehFileRef.current) jozvehFileRef.current.value = "";
      fetchJozveh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(false); }
  };

  const deleteJozveh = async (id: string) => {
    if (!(await confirm("حذف؟"))) return;
    const { error } = await secureApi.delete('jozveh', id);
    if (error) toast.error("خطا"); else { toast.success("حذف شد"); fetchJozveh(); }
  };

  const getGradeLabel = (grade: string) => GRADE_OPTIONS.find(g => g.value === grade)?.label || grade;
  const getSubjectLabel = (subject: string) => [...SUBJECT_OPTIONS, ...JOZVEH_SUBJECT_OPTIONS].find(s => s.value === subject)?.label || subject;
  const getPeriodsForStudentGrade = () => selectedStudentForGrades ? gradePeriods.filter(p => p.grade === selectedStudentForGrades.grade) : [];

  const handleCreateAkhbar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAkhbar.title.trim() || !newAkhbar.content.trim() || !currentUserId) { toast.error("عنوان و متن الزامی است"); return; }
    setAkhbarLoading(true);
    let imageUrl: string | null = null;
    if (akhbarImage) imageUrl = await uploadImage(akhbarImage);
    const success = await createAkhbar(newAkhbar.title, newAkhbar.content, imageUrl, newAkhbar.targetGrades, newAkhbar.isPublished, currentUserId, newAkhbar.imageSize);
    if (success) { setNewAkhbar({ title: "", content: "", targetGrades: [], isPublished: true, imageSize: "large" }); setAkhbarImage(null); setAkhbarImagePreview(null); }
    setAkhbarLoading(false);
  };

  const handleDeleteAkhbar = async (id: string) => { if (!(await confirm("حذف؟"))) return; await deleteAkhbar(id); };
  const toggleGradeInAkhbar = (grade: string) => setNewAkhbar(prev => ({ ...prev, targetGrades: prev.targetGrades.includes(grade) ? prev.targetGrades.filter(g => g !== grade) : [...prev.targetGrades, grade] }));
  const toggleGradeInJozveh = (grade: string) => setNewJozveh(prev => ({ ...prev, targetGrades: prev.targetGrades.includes(grade) ? prev.targetGrades.filter(g => g !== grade) : [...prev.targetGrades, grade] }));
  const handleAkhbarImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0] || null; setAkhbarImage(file); setAkhbarImagePreview(file ? URL.createObjectURL(file) : null); };

  const handleEditPish = (pish: PishSabtenamData) => { setEditingPish(pish); setPishForm({ title: pish.title, content: pish.content }); setPishImage(null); };
  const handleSavePish = async () => {
    if (!editingPish) return; setPishLoading(true);
    try {
      let imageUrl = editingPish.image_url;
      if (pishImage) {
        const fileName = `pish-${Date.now()}.${pishImage.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("profile-pictures").upload(fileName, pishImage);
        if (error) throw error;
        imageUrl = supabase.storage.from("profile-pictures").getPublicUrl(fileName).data.publicUrl;
      }
      await secureApi.update('pish_sabtenam', editingPish.id, { title: pishForm.title, content: pishForm.content, image_url: imageUrl });
      toast.success("ذخیره شد"); setEditingPish(null); fetchPishSabtenam();
    } catch { toast.error("خطا"); } finally { setPishLoading(false); }
  };
  const togglePishEnabled = async (pish: PishSabtenamData) => {
    const newVal = !pish.is_enabled;
    await secureApi.update('pish_sabtenam', pish.id, { is_enabled: newVal });
    toast.success(newVal ? "فعال شد" : "غیرفعال شد");
    fetchPishSabtenam();
  };

  // Account handlers
  const handlePasswordChange = async () => {
    if (!currentPassword) { toast.error("رمز فعلی الزامی است"); return; }
    if (newPassword !== confirmPassword) { toast.error("رمزها مطابقت ندارند"); return; }
    if (newPassword.length < 6) { toast.error("رمز باید حداقل ۶ کاراکتر باشد"); return; }
    setChangingPassword(true);
    const { success, error } = await customAuth.changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (error) { toast.error(error); return; }
    if (success) { toast.success("رمز عبور تغییر کرد"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  };
  const handleUsernameChange = async () => {
    if (!newUsername.trim()) { toast.error("نام کاربری جدید وارد کنید"); return; }
    setChangingUsername(true);
    const { error } = await secureApi.update('custom_users', currentUserId || '', { username: newUsername });
    setChangingUsername(false);
    if (error) { toast.error(error); return; }
    toast.success("نام کاربری تغییر کرد"); setNewUsername("");
    fetchUserData(currentUserId || '');
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("فقط تصویر مجاز است"); return; }
    setUploading(true);
    try {
      const fileName = `${currentUserId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("profile-pictures").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
      await secureApi.update('custom_users', currentUserId || '', { profile_picture: urlData.publicUrl });
      setUserData(prev => prev ? { ...prev, profile_picture: urlData.publicUrl } : null);
      toast.success("تصویر آپلود شد");
    } catch { toast.error("خطا در آپلود"); }
    finally { setUploading(false); }
  };

  // Taklif handlers
  const updateTaklifStatus = async (id: string, status: string) => {
    const { error } = await secureApi.update('taklif', id, { status });
    if (error) toast.error("خطا"); else { toast.success("وضعیت تغییر کرد"); fetchTaklif(); }
  };

  const deleteTaklif = async (id: string) => {
    if (!(await confirm("آیا از حذف تکلیف اطمینان دارید؟"))) return;
    const { error } = await secureApi.delete('taklif', id);
    if (error) toast.error("خطا"); else { toast.success("حذف شد"); fetchTaklif(); }
  };

  const filteredTaklif = taklifList.filter(t => {
    if (taklifGradeFilter !== "all" && t.grade !== taklifGradeFilter) return false;
    if (taklifSubjectFilter !== "all" && t.subject !== taklifSubjectFilter) return false;
    return true;
  });

  const getStudentName = (studentId: string) => students.find(s => s.id === studentId)?.full_name || "ناشناس";

  const getImageSizeClass = (size: string) => {
    switch (size) {
      case "small": return "max-h-24 max-w-[120px]";
      case "medium": return "max-h-48 max-w-[300px]";
      case "large": return "w-full max-h-64";
      default: return "w-full max-h-48";
    }
  };

  const sidebarItems = [
    { id: "main" as ActiveSection, icon: Home, label: "صفحه اصلی" },
    { id: "account" as ActiveSection, icon: User, label: "حساب" },
    { id: "users" as ActiveSection, icon: Users, label: "کاربران" },
    { id: "classes" as ActiveSection, icon: Video, label: "کلاس‌ها" },
    { id: "jozveh" as ActiveSection, icon: FileText, label: "جزوه‌ها" },
    { id: "akhbar" as ActiveSection, icon: Newspaper, label: "اخبار" },
    { id: "taklif" as ActiveSection, icon: BookOpen, label: "تکلیف" },
    { id: "pish_sabtenam" as ActiveSection, icon: ClipboardList, label: "پیش ثبت‌نام" },
    { id: "roles" as ActiveSection, icon: Shield, label: "نقش‌ها", disabled: true },
    { id: "messages" as ActiveSection, icon: MessageSquare, label: "پیام‌ها" },
    { id: "chat" as ActiveSection, icon: Send, label: "چت" },
  ];

  return (
    <>
    <ConfirmDialog />
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      <main className="pt-24 pb-12">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)]">
          <aside className="w-full lg:w-64 bg-card border-b lg:border-b-0 lg:border-l border-border p-3 lg:p-6 sticky top-24 z-30 lg:h-[calc(100vh-6rem)]" dir="rtl">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
              {sidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => !item.disabled && setActiveSection(item.id)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg transition-all duration-300 whitespace-nowrap text-sm lg:text-base ${
                    item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" :
                    activeSection === item.id ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                  {(badgeCounts[item.id] > 0 || fadingBadges[item.id]) && (
                    <span className={`absolute top-1 left-1 lg:top-1.5 lg:left-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 ${fadingBadges[item.id] ? 'badge-exit' : 'badge-enter'}`}>
                      {badgeCounts[item.id] || ""}
                    </span>
                  )}
                </button>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all duration-300 whitespace-nowrap lg:mt-auto text-sm lg:text-base">
                <LogOut className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" /><span className="font-medium">خروج</span>
              </button>
            </div>
          </aside>

          <div className="flex-1 p-4 lg:p-8" dir="rtl">
            {/* Dashboard */}
            {activeSection === "main" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold">پنل مدیریت</h1>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 lg:p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveSection("users")}>
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary" /></div><div><p className="text-xl font-bold">{students.length}</p><p className="text-xs text-muted-foreground">دانش‌آموز</p></div></div>
                  </Card>
                  <Card className="p-4 lg:p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveSection("users")}>
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-accent" /></div><div><p className="text-xl font-bold">{adminUsers.length}</p><p className="text-xs text-muted-foreground">ادمین</p></div></div>
                  </Card>
                  <Card className="p-4 lg:p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveSection("messages")}>
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-primary" /></div><div><p className="text-xl font-bold">{messages.length}</p><p className="text-xs text-muted-foreground">پیام</p></div></div>
                  </Card>
                  <Card className="p-4 lg:p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveSection("taklif")}>
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-accent" /></div><div><p className="text-xl font-bold">{taklifList.filter(t => t.status === "pending").length}</p><p className="text-xs text-muted-foreground">تکلیف جدید</p></div></div>
                  </Card>
                </div>
                {/* Quick notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {messages.length > 0 && (
                    <Card className="p-6 border-2">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> آخرین پیام‌ها</h3>
                      <div className="space-y-2">
                        {messages.slice(0, 3).map(msg => (
                          <div key={msg.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="flex justify-between items-start"><span className="font-medium text-sm">{msg.name}</span><span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleDateString('fa-IR')}</span></div>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setActiveSection("messages")}>مشاهده همه</Button>
                    </Card>
                  )}
                  {taklifList.filter(t => t.status === "pending").length > 0 && (
                    <Card className="p-6 border-2">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> تکالیف جدید</h3>
                      <div className="space-y-2">
                        {taklifList.filter(t => t.status === "pending").slice(0, 3).map(t => (
                          <div key={t.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="flex justify-between items-start"><span className="font-medium text-sm">{getStudentName(t.student_id)}</span><span className="text-xs text-muted-foreground">{getSubjectLabel(t.subject)}</span></div>
                            <p className="text-xs text-muted-foreground mt-1">پایه: {getGradeLabel(t.grade)}</p>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setActiveSection("taklif")}>مشاهده همه</Button>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Account - styled like student account */}
            {activeSection === "account" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold">حساب کاربری</h1>
                <Card className="p-6 border-2">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-border">
                        <AvatarImage src={userData?.profile_picture || undefined} />
                        <AvatarFallback><User className="w-12 h-12 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <input type="file" ref={profileFileRef} onChange={handleProfilePictureUpload} accept="image/*" className="hidden" />
                      <Button variant="outline" size="icon" onClick={() => profileFileRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 rounded-full w-8 h-8">
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-center sm:text-right">
                      <h2 className="text-2xl font-bold">{userData?.full_name || "ادمین"}</h2>
                      <p className="text-muted-foreground">@{userData?.username}</p>
                      <p className="text-muted-foreground text-sm">مدیر سیستم</p>
                    </div>
                  </div>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-6 border-2">
                    <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Lock className="w-6 h-6 text-primary" /></div><h3 className="font-bold">تغییر رمز عبور</h3></div>
                    <div className="space-y-3">
                      <Input type="password" placeholder="رمز فعلی" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="text-right" />
                      <Input type="password" placeholder="رمز جدید" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="text-right" />
                      <Input type="password" placeholder="تکرار رمز جدید" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="text-right" />
                      <Button onClick={handlePasswordChange} disabled={changingPassword} className="w-full">{changingPassword ? "..." : "ذخیره رمز"}</Button>
                    </div>
                  </Card>
                  <div className="space-y-4">
                    <Card className="p-6 border-2">
                      <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center"><Pencil className="w-6 h-6 text-accent" /></div><h3 className="font-bold">تغییر نام کاربری</h3></div>
                      <div className="flex gap-2"><Input placeholder="نام کاربری جدید" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="flex-1 text-right" /><Button onClick={handleUsernameChange} disabled={changingUsername || !newUsername.trim()}>{changingUsername ? "..." : "تغییر"}</Button></div>
                    </Card>
                    <Card className="p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => profileFileRef.current?.click()}>
                      <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Camera className="w-6 h-6 text-primary" /></div><div><h3 className="font-bold">ویرایش تصویر پروفایل</h3><p className="text-sm text-muted-foreground">کلیک کنید برای آپلود تصویر</p></div></div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {activeSection === "users" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Users className="w-8 h-8 text-primary" /> مدیریت کاربران</h1>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5" /> ایجاد کاربر جدید</h3>
                  <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select value={newStudent.role} onValueChange={(v: "student" | "admin" | "parent") => setNewStudent({ ...newStudent, role: v })}>
                      <SelectTrigger className="text-right"><SelectValue placeholder="نوع کاربر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">دانش‌آموز</SelectItem>
                        <SelectItem value="admin">ادمین</SelectItem>
                        <SelectItem value="parent">والدین</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="نام و نام خانوادگی" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} required className="text-right" />
                    <Input placeholder="نام کاربری" value={newStudent.username} onChange={e => setNewStudent({ ...newStudent, username: e.target.value })} required className="text-right" />
                    <Input placeholder="رمز عبور" type="password" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })} required className="text-right" />
                    {newStudent.role === "student" && (
                      <Select value={newStudent.grade} onValueChange={v => setNewStudent({ ...newStudent, grade: v })}>
                        <SelectTrigger className="text-right"><SelectValue placeholder="پایه" /></SelectTrigger>
                        <SelectContent>{GRADE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {(newStudent.role === "student" || newStudent.role === "parent") && (
                      <Input placeholder="شماره ملی" value={newStudent.nationalId} onChange={e => setNewStudent({ ...newStudent, nationalId: e.target.value })} required className="text-right" dir="ltr" />
                    )}
                    <Button type="submit" disabled={loading}>{loading ? "..." : "ایجاد"}</Button>
                  </form>
                </Card>

                {/* Admin list */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> ادمین‌ها</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminUsers.map(admin => (
                      <div key={admin.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{admin.full_name || admin.username}</p>
                            <p className="text-sm text-muted-foreground">@{admin.username}</p>
                          </div>
                        </div>
                        {isModir && admin.username !== "@Modir" && (
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={() => openEditAdminDialog(admin)} className="flex-1 gap-1"><Edit2 className="w-3 h-3" /> ویرایش</Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteAdminUser(admin)} className="gap-1"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {adminUsers.length === 0 && <p className="text-center text-muted-foreground py-4 col-span-full">ادمینی وجود ندارد</p>}
                  </div>
                </Card>

                {/* Student list */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5" /> دانش‌آموزان</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map(student => (
                      <div key={student.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-accent" /></div>
                            <div><p className="font-bold">{student.full_name}</p><p className="text-sm text-muted-foreground">پایه: {getGradeLabel(student.grade)}</p></div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditUserDialog(student)} title="ویرایش"><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openStudentGradesDialog(student)} title="نمرات"><Settings className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => deleteStudent(student.id, student.user_id)} className="w-full gap-1"><Trash2 className="w-4 h-4" /> حذف</Button>
                      </div>
                    ))}
                    {students.length === 0 && <p className="text-center text-muted-foreground py-4 col-span-full">دانش‌آموزی وجود ندارد</p>}
                  </div>
                </Card>
              </div>
            )}

            {/* Classes */}
            {activeSection === "classes" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Video className="w-8 h-8 text-primary" /> مدیریت کلاس‌ها</h1>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4"><Plus className="w-5 h-5 inline" /> افزودن کلاس</h3>
                  <form onSubmit={createOnlineClass} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input placeholder="عنوان" value={newClass.title} onChange={e => setNewClass({ ...newClass, title: e.target.value })} required className="text-right" />
                    <Input placeholder="لینک" value={newClass.link} onChange={e => setNewClass({ ...newClass, link: e.target.value })} required dir="ltr" />
                    <Select value={newClass.grade} onValueChange={v => setNewClass({ ...newClass, grade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
                    <Button type="submit" disabled={loading}>ایجاد</Button>
                  </form>
                </Card>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">لیست کلاس‌ها</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {onlineClasses.map(cls => (
                      <div key={cls.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex-1 min-w-0"><p className="font-bold truncate">{cls.title}</p><p className="text-sm text-muted-foreground">پایه: {getGradeLabel(cls.grade)}</p></div>
                        <Button variant="destructive" size="icon" onClick={() => deleteOnlineClass(cls.id)} className="shrink-0 mr-3"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {onlineClasses.length === 0 && <p className="text-center text-muted-foreground py-4 col-span-full">کلاسی وجود ندارد</p>}
                  </div>
                </Card>
              </div>
            )}

            {/* Jozveh */}
            {activeSection === "jozveh" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><FileText className="w-8 h-8 text-primary" /> مدیریت جزوه‌ها</h1>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4"><Plus className="w-5 h-5 inline" /> افزودن جزوه</h3>
                  <form onSubmit={createJozveh} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input placeholder="عنوان" value={newJozveh.title} onChange={e => setNewJozveh({ ...newJozveh, title: e.target.value })} required className="text-right" />
                      <div>
                        <input type="file" ref={jozvehFileRef} onChange={e => setJozvehFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png,.jpeg" />
                        <Button type="button" variant="outline" onClick={() => jozvehFileRef.current?.click()} className="w-full gap-2 justify-start"><Upload className="w-4 h-4" /> {jozvehFile ? jozvehFile.name : "انتخاب فایل"}</Button>
                      </div>
                      <Select value={newJozveh.subject} onValueChange={v => setNewJozveh({ ...newJozveh, subject: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{JOZVEH_SUBJECT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
                      <Select value={newJozveh.grade} onValueChange={v => setNewJozveh({ ...newJozveh, grade: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">پایه‌های هدف (خالی = همه)</label>
                      <div className="flex flex-wrap gap-2">{GRADE_OPTIONS.map(g => <Button key={g.value} type="button" variant={newJozveh.targetGrades.includes(g.value) ? "default" : "outline"} size="sm" onClick={() => toggleGradeInJozveh(g.value)}>{g.label}</Button>)}</div>
                    </div>
                    <Button type="submit" disabled={loading || !jozvehFile} className="w-full">{loading ? "آپلود..." : "ایجاد جزوه"}</Button>
                  </form>
                </Card>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">لیست جزوه‌ها</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {jozvehList.map(j => (
                      <div key={j.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3 flex-1 min-w-0"><FileText className="w-8 h-8 text-muted-foreground shrink-0" /><div className="min-w-0"><p className="font-bold truncate">{j.title}</p><p className="text-sm text-muted-foreground">پایه: {getGradeLabel(j.grade)} | {getSubjectLabel(j.subject)}</p></div></div>
                        <Button variant="destructive" size="icon" onClick={() => deleteJozveh(j.id)} className="shrink-0 mr-3"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {jozvehList.length === 0 && <p className="text-center text-muted-foreground py-4 col-span-full">جزوه‌ای وجود ندارد</p>}
                  </div>
                </Card>
              </div>
            )}

            {/* Akhbar */}
            {activeSection === "akhbar" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Newspaper className="w-8 h-8 text-primary" /> مدیریت اخبار</h1>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4"><Plus className="w-5 h-5 inline" /> خبر جدید</h3>
                  <form onSubmit={handleCreateAkhbar} className="space-y-4">
                    <Input placeholder="عنوان" value={newAkhbar.title} onChange={e => setNewAkhbar({ ...newAkhbar, title: e.target.value })} required className="text-right" />
                    <Textarea placeholder="متن (** برای بولد)" value={newAkhbar.content} onChange={e => setNewAkhbar({ ...newAkhbar, content: e.target.value })} required className="text-right min-h-[120px]" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تصویر</label>
                      <input type="file" ref={akhbarImageRef} onChange={handleAkhbarImageSelect} className="hidden" accept="image/*" />
                      <Button type="button" variant="outline" onClick={() => akhbarImageRef.current?.click()} className="w-full gap-2 justify-start"><ImageIcon className="w-4 h-4" /> {akhbarImage ? akhbarImage.name : "انتخاب تصویر"}</Button>
                      {akhbarImagePreview && <img src={akhbarImagePreview} alt="preview" className="w-full max-h-48 object-contain rounded" />}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">اندازه تصویر</label>
                      <div className="flex gap-2">
                        {IMAGE_SIZE_OPTIONS.map(opt => (
                          <Button key={opt.value} type="button" variant={newAkhbar.imageSize === opt.value ? "default" : "outline"} size="sm" onClick={() => setNewAkhbar({ ...newAkhbar, imageSize: opt.value })}>
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">پایه‌ها (خالی = همه)</label>
                      <div className="flex flex-wrap gap-2">{GRADE_OPTIONS.map(g => <Button key={g.value} type="button" variant={newAkhbar.targetGrades.includes(g.value) ? "default" : "outline"} size="sm" onClick={() => toggleGradeInAkhbar(g.value)}>{g.label}</Button>)}</div>
                    </div>
                    <div className="flex items-center gap-3"><Switch checked={newAkhbar.isPublished} onCheckedChange={c => setNewAkhbar({ ...newAkhbar, isPublished: c })} /><label className="text-sm">منتشر شود</label></div>
                    <Button type="submit" disabled={akhbarLoading} className="w-full">{akhbarLoading ? "..." : "ایجاد خبر"}</Button>
                  </form>
                </Card>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">لیست اخبار</h3>
                  <div className="space-y-4">
                    {akhbarList.length === 0 ? <p className="text-center text-muted-foreground py-4">خبری نیست</p> : akhbarList.map(item => (
                      <div key={item.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1"><h4 className="font-bold text-lg">{item.title}</h4><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('fa-IR')}{!item.is_published && " | پیش‌نویس"}{item.target_grades.length > 0 && ` | ${item.target_grades.join(', ')}`}</p></div>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteAkhbar(item.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        {item.image_url && <img src={item.image_url} alt={item.title} className={`${getImageSizeClass((item as any).image_size || "large")} object-contain rounded-lg mb-3`} />}
                        <p className="text-sm whitespace-pre-wrap">{renderFormattedText(item.content)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Taklif */}
            {activeSection === "taklif" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-8 h-8 text-primary" /> تکالیف</h1>
                <Card className="p-6 border-2">
                  <div className="flex flex-wrap gap-4 mb-4">
                    <Select value={taklifGradeFilter} onValueChange={setTaklifGradeFilter}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="همه پایه‌ها" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">همه</SelectItem>{GRADE_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={taklifSubjectFilter} onValueChange={setTaklifSubjectFilter}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="همه دروس" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">همه</SelectItem>{SUBJECT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {filteredTaklif.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">تکلیفی وجود ندارد</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTaklif.map(t => (
                        <div key={t.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="flex justify-between items-start mb-2">
                            <div><p className="font-bold">{getStudentName(t.student_id)}</p><p className="text-sm text-muted-foreground">{getSubjectLabel(t.subject)} | پایه: {getGradeLabel(t.grade)}</p></div>
                            <span className={`text-xs px-2 py-1 rounded ${t.status === 'reviewed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{t.status === 'reviewed' ? 'بررسی شده' : 'در انتظار'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{new Date(t.created_at).toLocaleDateString('fa-IR')}</p>
                          <div className="flex gap-2">
                            <a href={t.file_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="gap-1"><Download className="w-3 h-3" /> دانلود</Button></a>
                            {t.status !== 'reviewed' && <Button size="sm" onClick={() => updateTaklifStatus(t.id, 'reviewed')}>بررسی شد</Button>}
                            <Button variant="destructive" size="sm" onClick={() => deleteTaklif(t.id)} className="gap-1"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Pish Sabtenam */}
            {activeSection === "pish_sabtenam" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><ClipboardList className="w-8 h-8 text-primary" /> پیش ثبت‌نام</h1>
                {editingPish ? (
                  <Card className="p-6 border-2">
                    <h3 className="text-lg font-bold mb-4">ویرایش واحد {editingPish.unit_number}</h3>
                    <div className="space-y-4">
                      <Input placeholder="عنوان" value={pishForm.title} onChange={e => setPishForm({ ...pishForm, title: e.target.value })} className="text-right" />
                      <Textarea placeholder="متن" value={pishForm.content} onChange={e => setPishForm({ ...pishForm, content: e.target.value })} className="text-right min-h-[120px]" />
                      <div>
                        <input type="file" ref={pishImageRef} onChange={e => setPishImage(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                        <Button type="button" variant="outline" onClick={() => pishImageRef.current?.click()} className="w-full gap-2 justify-start"><ImageIcon className="w-4 h-4" /> {pishImage ? pishImage.name : "تصویر"}</Button>
                      </div>
                      <div className="flex gap-2"><Button onClick={handleSavePish} disabled={pishLoading} className="flex-1">{pishLoading ? "..." : "ذخیره"}</Button><Button variant="outline" onClick={() => setEditingPish(null)}>انصراف</Button></div>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {pishSabtenamList.map(pish => (
                      <Card key={pish.id} className="p-6 border-2">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg">{pish.title || `واحد ${pish.unit_number}`}</h3>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pish.is_enabled}
                              onCheckedChange={() => togglePishEnabled(pish)}
                            />
                            <span className={`text-xs font-medium ${pish.is_enabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                              {pish.is_enabled ? "فعال" : "غیرفعال"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{pish.content || "بدون محتوا"}</p>
                        <Button variant="outline" className="w-full gap-2" onClick={() => handleEditPish(pish)}><Edit2 className="w-4 h-4" /> ویرایش</Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Roles (grayed out content) */}
            {activeSection === "roles" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Shield className="w-8 h-8 text-primary" /> نقش‌ها</h1>
                <Card className="p-8 border-2 text-center"><Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><h3 className="text-lg font-bold mb-2">به زودی</h3></Card>
              </div>
            )}

            {/* Messages */}
            {activeSection === "messages" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><MessageSquare className="w-8 h-8 text-primary" /> پیام‌های تماس</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {messages.length === 0 ? <Card className="p-12 text-center border-2 col-span-full"><p className="text-muted-foreground">پیامی نیست</p></Card> : messages.map(msg => (
                    <Card key={msg.id} className="p-6 border-2">
                      <div className="flex justify-between items-start mb-4">
                        <div><h4 className="font-bold">{msg.name}</h4><p className="text-sm text-muted-foreground font-mono" dir="ltr">{msg.phone}</p></div>
                        <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleDateString('fa-IR')}</span><Button variant="destructive" size="icon" onClick={() => deleteMessage(msg.id)}><Trash2 className="w-4 h-4" /></Button></div>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Chat */}
            {activeSection === "chat" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Send className="w-8 h-8 text-primary" /> چت</h1>
                {currentUserId && <ChatPanel currentUserId={currentUserId} />}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student Grades Dialog */}
      <Dialog open={studentPeriodsDialogOpen} onOpenChange={setStudentPeriodsDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle><BookOpen className="w-5 h-5 inline" /> نمرات {selectedStudentForGrades?.full_name}</DialogTitle><DialogDescription>مدیریت دوره‌ها و نمرات</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2"><Input placeholder="عنوان دوره" value={newPeriodTitle} onChange={e => setNewPeriodTitle(e.target.value)} className="flex-1 text-right" /><Button onClick={createPeriodForStudent} disabled={loading || !newPeriodTitle.trim()}><Plus className="w-4 h-4" /></Button></div>
            <div className="space-y-2">
              {getPeriodsForStudentGrade().length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">دوره‌ای نیست</p> : getPeriodsForStudentGrade().map(period => (
                <div key={period.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <span className="font-medium">{period.title}</span>
                  <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openGradeDialog(period)} className="gap-1"><Edit2 className="w-3 h-3" /> نمرات</Button><Button variant="destructive" size="sm" onClick={() => deleteGradePeriod(period.id)}><Trash2 className="w-3 h-3" /></Button></div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Grades Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>نمرات {selectedStudentForGrades?.full_name}</DialogTitle><DialogDescription>دوره: {selectedPeriod?.title}</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            {SUBJECT_OPTIONS.map(subject => (
              <div key={subject.value} className="flex items-center gap-4">
                <label className="w-32 font-medium text-right text-sm">{subject.label}:</label>
                <Input value={studentGrades[subject.value] || ""} onChange={e => setStudentGrades({ ...studentGrades, [subject.value]: e.target.value })} placeholder="نمره" className="flex-1 text-right" />
              </div>
            ))}
            <Button onClick={saveStudentPeriodGrades} disabled={loading} className="w-full mt-4">{loading ? "..." : "ذخیره"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader><DialogTitle><Edit2 className="w-5 h-5 inline" /> ویرایش {editingStudent?.full_name || editingAdminUser?.full_name || editingAdminUser?.username}</DialogTitle><DialogDescription>فیلدهای خالی تغییر نمی‌کنند</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="block text-sm font-medium mb-1">نام</label><Input value={editUserForm.full_name} onChange={e => setEditUserForm({ ...editUserForm, full_name: e.target.value })} className="text-right" /></div>
            <div><label className="block text-sm font-medium mb-1">نام کاربری</label><Input value={editUserForm.username} onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })} className="text-right" placeholder="بدون تغییر" /></div>
            <div><label className="block text-sm font-medium mb-1">رمز عبور</label><Input type="password" value={editUserForm.password} onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })} className="text-right" placeholder="بدون تغییر" /></div>
            <Button onClick={handleEditUser} disabled={editUserLoading} className="w-full">{editUserLoading ? "..." : "ذخیره"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};
export default Admin;
