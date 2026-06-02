import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedAvatarImage, SignedImage } from "@/components/SignedImage";
import { getSignedUrl } from "@/lib/signed-url";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customAuth, AuthSession } from "@/lib/auth";
import { secureApi } from "@/lib/secure-api";
import { ChatPanel } from "@/components/ChatPanel";
import { useAkhbar, renderFormattedText } from "@/hooks/use-akhbar";
import { 
  LogOut, GraduationCap, Video, Camera, Lock, ExternalLink, User, 
  BookOpen, FileText, Download, MessageSquare, ChevronDown, ChevronUp,
  Home, Pencil, Newspaper, Upload
} from "lucide-react";

interface StudentData { id: string; full_name: string; grade: string; student_id: string | null; }
interface GradePeriod { id: string; title: string; grade: string; }
interface PeriodGrade { id: string; period_id: string; subject: string; grade: string | null; }
interface OnlineClass { id: string; grade: string; title: string; link: string | null; mode: 'internal' | 'external'; is_live: boolean; subject?: string | null; description?: string | null; }
interface Jozveh { id: string; grade: string; subject: string; title: string; link: string; file_url: string | null; }
interface CustomUser { id: string; username: string; full_name: string | null; profile_picture: string | null; }
interface TaklifData { id: string; student_id: string; subject: string; file_url: string; file_name: string; grade: string; status: string; created_at: string; }

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

type ActiveSection = "account" | "main" | "grades" | "jozveh" | "akhbar" | "taklif";

const Student = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [userData, setUserData] = useState<CustomUser | null>(null);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [jozvehList, setJozvehList] = useState<Jozveh[]>([]);
  const [gradePeriods, setGradePeriods] = useState<GradePeriod[]>([]);
  const [periodGrades, setPeriodGrades] = useState<PeriodGrade[]>([]);
  const [openPeriods, setOpenPeriods] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>("akhbar");

  // Account
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newUsername, setNewUsername] = useState("");
  const [changingUsername, setChangingUsername] = useState(false);
  const [imagePopupUrl, setImagePopupUrl] = useState<string | null>(null);

  // Taklif
  const [taklifList, setTaklifList] = useState<TaklifData[]>([]);
  const [taklifSubject, setTaklifSubject] = useState("riazi");
  const [taklifFile, setTaklifFile] = useState<File | null>(null);
  const taklifFileRef = useRef<HTMLInputElement>(null);
  const [taklifUploading, setTaklifUploading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const validateAndLoadData = async () => {
      const localSession = customAuth.getSession();
      if (!localSession) { navigate("/login"); return; }
      const { valid, session: s } = await customAuth.validateSession();
      if (!valid || !s) { toast.error("لطفا دوباره وارد شوید"); navigate("/login"); return; }
      if (s.role !== "student") { toast.error("دسترسی غیرمجاز"); navigate("/"); return; }
      setSession(s);
      fetchStudentData(s.user.id);
      fetchUserData(s.user.id);
      fetchTaklif();
    };
    validateAndLoadData();
  }, [navigate]);

  const { akhbarList } = useAkhbar({ filterByGrade: studentData?.grade, onlyPublished: true });

  useEffect(() => {
    if (studentData) {
      fetchOnlineClasses(studentData.grade);
      fetchJozveh(studentData.grade);
      fetchGradePeriods(studentData.grade);
      fetchPeriodGrades(studentData.id);
    }
  }, [studentData]);

  const fetchStudentData = async (userId: string) => { const { data } = await secureApi.select<StudentData>('students', { user_id: userId }); if (data && data.length > 0) setStudentData(data[0]); setLoading(false); };
  const fetchUserData = async (userId: string) => { const { data } = await secureApi.select<CustomUser>('custom_users', { id: userId }); if (data && data.length > 0) setUserData(data[0]); };
  const fetchOnlineClasses = async (grade: string) => { const { data } = await secureApi.select<OnlineClass>('online_classes', { grade }); if (data) setOnlineClasses(data); };
  const fetchJozveh = async (grade: string) => { const { data } = await secureApi.select<Jozveh>('jozveh', { grade }); if (data) setJozvehList(data); };
  const fetchGradePeriods = async (grade: string) => { const { data } = await secureApi.select<GradePeriod>('grade_periods', { grade }); if (data) setGradePeriods(data); };
  const fetchPeriodGrades = async (studentId: string) => { const { data } = await secureApi.select<PeriodGrade>('student_period_grades', { student_id: studentId }); if (data) setPeriodGrades(data); };
  const fetchTaklif = async () => { const { data } = await secureApi.select<TaklifData>('taklif'); if (data) setTaklifList(data); };

  const handleLogout = () => { customAuth.logout(); navigate("/login"); };
  const getGradeLabel = (g: string) => GRADE_OPTIONS.find(o => o.value === g)?.label || g;
  const getSubjectLabel = (s: string) => SUBJECT_OPTIONS.find(o => o.value === s)?.label || s;
  const getGradeForPeriodSubject = (periodId: string, subject: string) => periodGrades.find(g => g.period_id === periodId && g.subject === subject)?.grade || "---";
  const togglePeriod = (id: string) => setOpenPeriods(prev => ({ ...prev, [id]: !prev[id] }));

  const handlePasswordChange = async () => {
    if (!currentPassword) { toast.error("رمز فعلی الزامی است"); return; }
    if (newPassword !== confirmPassword) { toast.error("رمزها مطابقت ندارند"); return; }
    if (newPassword.length < 6) { toast.error("حداقل ۶ کاراکتر"); return; }
    setChangingPassword(true);
    const { success, error } = await customAuth.changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (error) { toast.error(error); return; }
    if (success) { toast.success("رمز تغییر کرد"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setSettingsDialogOpen(false); }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) { toast.error("نام کاربری وارد کنید"); return; }
    setChangingUsername(true);
    const { error } = await secureApi.update('custom_users', session?.user.id || '', { username: newUsername });
    setChangingUsername(false);
    if (error) { toast.error(error); return; }
    toast.success("نام کاربری تغییر کرد"); setNewUsername(""); fetchUserData(session?.user.id || '');
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("فقط تصویر مجاز است"); return; }
    setUploading(true);
    try {
      const fileName = `${session?.user.id}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("profile-pictures").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
      await secureApi.update('custom_users', session?.user.id || '', { profile_picture: urlData.publicUrl });
      setUserData(prev => prev ? { ...prev, profile_picture: urlData.publicUrl } : null);
      toast.success("تصویر آپلود شد");
    } catch { toast.error("خطا در آپلود"); }
    finally { setUploading(false); }
  };

  const handleLinkClick = (link: string) => { let url = link; if (!url.startsWith("http")) url = "https://" + url; window.open(url, "_blank"); };
  const openJozveh = async (j: Jozveh) => {
    if (j.file_url) {
      const u = await getSignedUrl("jozveh-files", j.file_url);
      if (u) window.open(u, "_blank", "noopener,noreferrer");
      return;
    }
    handleLinkClick(j.link);
  };
  const openAkhbarImage = async (img: string) => {
    const u = await getSignedUrl("profile-pictures", img);
    if (u) setImagePopupUrl(u);
  };

  const handleTaklifUpload = async () => {
    if (!taklifFile || !studentData) { toast.error("فایل انتخاب کنید"); return; }
    setTaklifUploading(true);
    try {
      const fileName = `taklif-${Date.now()}-${Math.random().toString(36).substring(7)}.${taklifFile.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(fileName, taklifFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(fileName);
      const { error } = await secureApi.insert('taklif', { student_id: studentData.id, grade: studentData.grade, subject: taklifSubject, file_url: urlData.publicUrl, file_name: taklifFile.name });
      if (error) throw new Error(error);
      toast.success("تکلیف ارسال شد");
      setTaklifFile(null);
      if (taklifFileRef.current) taklifFileRef.current.value = "";
      fetchTaklif();
    } catch { toast.error("خطا در ارسال"); }
    finally { setTaklifUploading(false); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-muted animate-pulse" /></div>;
  }

  const sidebarItems = [
    { id: "account" as ActiveSection, icon: User, label: "حساب" },
    { id: "main" as ActiveSection, icon: MessageSquare, label: "پیام‌ها" },
    { id: "grades" as ActiveSection, icon: GraduationCap, label: "نمرات" },
    { id: "jozveh" as ActiveSection, icon: BookOpen, label: "جزوه" },
    { id: "akhbar" as ActiveSection, icon: Newspaper, label: "اخبار" },
    { id: "taklif" as ActiveSection, icon: FileText, label: "تکلیف" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      <main className="pt-24 pb-12">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)]">
          <aside className="w-full lg:w-64 bg-card border-b lg:border-b-0 lg:border-l border-border p-3 lg:p-6 sticky top-24 z-30 lg:h-[calc(100vh-6rem)]" dir="rtl">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
              {sidebarItems.map(item => (
                <button key={item.id} onClick={() => setActiveSection(item.id)} className={`flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg transition-all duration-300 whitespace-nowrap text-sm lg:text-base ${activeSection === item.id ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted text-foreground"}`}>
                  <item.icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" /><span className="font-medium">{item.label}</span>
                </button>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all duration-300 whitespace-nowrap lg:mt-auto text-sm lg:text-base">
                <LogOut className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" /><span className="font-medium">خروج</span>
              </button>
            </div>
          </aside>

          <div className="flex-1 p-4 lg:p-8" dir="rtl">
            {/* Account */}
            {activeSection === "account" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold">حساب کاربری</h1>
                <Card className="p-6 border-2">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-border"><SignedAvatarImage source={userData?.profile_picture} /><AvatarFallback><User className="w-12 h-12 text-muted-foreground" /></AvatarFallback></Avatar>
                      <input type="file" ref={fileInputRef} onChange={handleProfilePictureUpload} accept="image/*" className="hidden" />
                      <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"><Camera className="w-4 h-4" /></Button>
                    </div>
                    <div className="text-center sm:text-right">
                      <h2 className="text-2xl font-bold">{studentData?.full_name}</h2>
                      <p className="text-muted-foreground">@{userData?.username}</p>
                      <p className="text-muted-foreground">پایه: {getGradeLabel(studentData?.grade || "")}</p>
                    </div>
                  </div>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setSettingsDialogOpen(true)}>
                    <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Lock className="w-6 h-6 text-primary" /></div><div><h3 className="font-bold">تغییر رمز عبور</h3></div></div>
                  </Card>
                  <Card className="p-6 border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center"><Pencil className="w-6 h-6 text-accent" /></div><div><h3 className="font-bold">ویرایش پروفایل</h3></div></div>
                  </Card>
                </div>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pencil className="w-5 h-5" /> تغییر نام کاربری</h3>
                  <div className="flex gap-2"><Input placeholder="نام کاربری جدید" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="flex-1 text-right" /><Button onClick={handleUsernameChange} disabled={changingUsername || !newUsername.trim()}>{changingUsername ? "..." : "تغییر"}</Button></div>
                </Card>
                <Card className="p-6 border-2">
                  <div className="flex items-center gap-3 mb-4"><Video className="w-6 h-6 text-primary" /><h3 className="text-lg font-bold">کلاس‌های آنلاین</h3></div>
                  {onlineClasses.length === 0 ? <p className="text-muted-foreground text-center py-4">کلاسی وجود ندارد</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {onlineClasses.map(cls => (
                        <div key={cls.id} onClick={() => handleLinkClick(cls.link)} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted cursor-pointer transition-all">
                          <div className="flex items-center gap-3"><Video className="w-5 h-5 text-primary" /><span className="font-medium">{cls.title}</span></div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Grades */}
            {activeSection === "grades" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><GraduationCap className="w-8 h-8 text-primary" /> نمرات</h1>
                {gradePeriods.length === 0 ? <Card className="p-12 text-center border-2"><p className="text-muted-foreground text-lg">نمره‌ای نیست</p></Card> : (
                  <div className="space-y-4">
                    {gradePeriods.map(period => (
                      <Collapsible key={period.id} open={openPeriods[period.id]} onOpenChange={() => togglePeriod(period.id)}>
                        <Card className="border-2 overflow-hidden">
                          <CollapsibleTrigger asChild><button className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-all"><span className="text-lg font-bold">{period.title}</span>{openPeriods[period.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button></CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-5 pt-0">
                              {SUBJECT_OPTIONS.map(subject => { const grade = getGradeForPeriodSubject(period.id, subject.value); return (
                                <div key={subject.value} className="p-4 bg-muted/50 rounded-lg border border-border text-center"><p className="text-xs text-muted-foreground mb-2">{subject.label}</p><p className={`text-xl font-bold ${grade === "---" ? "text-muted-foreground" : "text-primary"}`}>{grade}</p></div>
                              ); })}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Jozveh */}
            {activeSection === "jozveh" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-8 h-8 text-primary" /> جزوه‌ها</h1>
                {jozvehList.length === 0 ? <Card className="p-12 text-center border-2"><p className="text-muted-foreground text-lg">جزوه‌ای نیست</p></Card> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jozvehList.map(j => (
                      <Card key={j.id} className="p-5 border-2 hover:border-primary/30 transition-all">
                        <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-6 h-6 text-primary" /></div>
                          <div className="flex-1 min-w-0"><h3 className="font-bold truncate">{j.title}</h3><p className="text-sm text-muted-foreground">{getSubjectLabel(j.subject)}</p><Button variant="outline" size="sm" onClick={() => openJozveh(j)} className="mt-3 gap-2"><Download className="w-4 h-4" /> دانلود</Button></div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat */}
            {activeSection === "main" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><MessageSquare className="w-8 h-8 text-primary" /> پیام‌ها</h1>
                {session && <ChatPanel currentUserId={session.user.id} />}
              </div>
            )}

            {/* Akhbar */}
            {activeSection === "akhbar" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Newspaper className="w-8 h-8 text-primary" /> اخبار</h1>
                {akhbarList.length === 0 ? <Card className="p-12 text-center border-2"><p className="text-muted-foreground text-lg">خبری نیست</p></Card> : (
                  <div className="space-y-4">
                    {akhbarList.map(item => (
                      <Card key={item.id} className="p-6 border-2">
                        <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{new Date(item.created_at).toLocaleDateString('fa-IR')}</p>
                        {item.image_url && <SignedImage bucket="profile-pictures" source={item.image_url} alt={item.title} className={`${item.image_size === 'small' ? 'max-h-24 max-w-[120px]' : item.image_size === 'medium' ? 'max-h-48 max-w-[300px]' : 'w-full max-h-64'} object-contain rounded-lg mb-4 cursor-pointer`} onClick={() => openAkhbarImage(item.image_url!)} />}
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderFormattedText(item.content)}</div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Taklif */}
            {activeSection === "taklif" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><FileText className="w-8 h-8 text-primary" /> تکلیف</h1>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">ارسال تکلیف جدید</h3>
                  <div className="space-y-4">
                    <Select value={taklifSubject} onValueChange={setTaklifSubject}>
                      <SelectTrigger><SelectValue placeholder="درس" /></SelectTrigger>
                      <SelectContent>{SUBJECT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <div>
                      <input type="file" ref={taklifFileRef} onChange={e => setTaklifFile(e.target.files?.[0] || null)} className="hidden" />
                      <Button variant="outline" onClick={() => taklifFileRef.current?.click()} className="w-full gap-2 justify-start"><Upload className="w-4 h-4" /> {taklifFile ? taklifFile.name : "انتخاب فایل"}</Button>
                    </div>
                    <Button onClick={handleTaklifUpload} disabled={taklifUploading || !taklifFile} className="w-full">{taklifUploading ? "ارسال..." : "ارسال تکلیف"}</Button>
                  </div>
                </Card>
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">تکالیف ارسال شده</h3>
                  {taklifList.length === 0 ? <p className="text-center text-muted-foreground py-4">تکلیفی ارسال نشده</p> : (
                    <div className="space-y-3">
                      {taklifList.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                          <div><p className="font-medium">{getSubjectLabel(t.subject)}</p><p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('fa-IR')}</p></div>
                          <span className={`text-xs px-2 py-1 rounded ${t.status === 'reviewed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{t.status === 'reviewed' ? 'بررسی شده' : 'در انتظار'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> تغییر رمز عبور</DialogTitle><DialogDescription>رمز جدید وارد کنید</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="password" placeholder="رمز فعلی" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="text-right" />
            <Input type="password" placeholder="رمز جدید" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="text-right" />
            <Input type="password" placeholder="تکرار رمز" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="text-right" />
            <Button onClick={handlePasswordChange} className="w-full" disabled={changingPassword}>{changingPassword ? "..." : "ذخیره"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imagePopupUrl} onOpenChange={() => setImagePopupUrl(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">{imagePopupUrl && <img src={imagePopupUrl} alt="تصویر" className="w-full h-full object-contain" />}</DialogContent>
      </Dialog>
    </div>
  );
};

export default Student;