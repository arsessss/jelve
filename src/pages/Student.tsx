import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { customAuth, AuthSession } from "@/lib/auth";
import { secureApi } from "@/lib/secure-api";
import { ChatPanel } from "@/components/ChatPanel";
import { useAkhbar, renderFormattedText } from "@/hooks/use-akhbar";
import { 
  LogOut, GraduationCap, Video, Camera, Lock, ExternalLink, User, 
  BookOpen, FileText, Download, MessageSquare, ChevronDown, ChevronUp,
  Settings, Home, Pencil, Newspaper, ClipboardList
} from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
}

interface GradePeriod {
  id: string;
  title: string;
  grade: string;
}

interface PeriodGrade {
  id: string;
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

interface CustomUser {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture: string | null;
}

interface PishSabtenamData {
  id: string;
  unit_number: number;
  title: string;
  content: string;
  image_url: string | null;
  is_enabled: boolean;
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

type ActiveSection = "account" | "grades" | "jozveh" | "main" | "akhbar" | "pish_sabtenam";

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
  const [pishSabtenamList, setPishSabtenamList] = useState<PishSabtenamData[]>([]);
  
  // Account settings state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Username change
  const [newUsername, setNewUsername] = useState("");
  const [changingUsername, setChangingUsername] = useState(false);
  
  // Image popup
  const [imagePopupUrl, setImagePopupUrl] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const validateAndLoadData = async () => {
      const localSession = customAuth.getSession();
      if (!localSession) { navigate("/login"); return; }
      const { valid, session: validatedSession } = await customAuth.validateSession();
      if (!valid || !validatedSession) { toast({ title: "نشست نامعتبر", description: "لطفا دوباره وارد شوید", variant: "destructive" }); navigate("/login"); return; }
      if (validatedSession.role !== "student") { toast({ title: "دسترسی غیرمجاز", description: "شما دسترسی به این صفحه ندارید", variant: "destructive" }); navigate("/"); return; }
      setSession(validatedSession);
      fetchStudentData(validatedSession.user.id);
      fetchUserData(validatedSession.user.id);
      fetchPishSabtenam();
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

  const fetchStudentData = async (userId: string) => {
    const { data, error } = await secureApi.select<StudentData>('students', { user_id: userId });
    if (!error && data && data.length > 0) setStudentData(data[0]);
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    const { data, error } = await secureApi.select<CustomUser>('custom_users', { id: userId });
    if (!error && data && data.length > 0) setUserData(data[0]);
  };

  const fetchOnlineClasses = async (grade: string) => {
    const { data, error } = await secureApi.select<OnlineClass>('online_classes', { grade });
    if (!error && data) setOnlineClasses(data);
  };

  const fetchJozveh = async (grade: string) => {
    const { data, error } = await secureApi.select<Jozveh>('jozveh', { grade });
    if (!error && data) setJozvehList(data);
  };

  const fetchGradePeriods = async (grade: string) => {
    const { data, error } = await secureApi.select<GradePeriod>('grade_periods', { grade });
    if (!error && data) setGradePeriods(data);
  };

  const fetchPeriodGrades = async (studentId: string) => {
    const { data, error } = await secureApi.select<PeriodGrade>('student_period_grades', { student_id: studentId });
    if (!error && data) setPeriodGrades(data);
  };

  const fetchPishSabtenam = async () => {
    const { data, error } = await secureApi.select<PishSabtenamData>('pish_sabtenam');
    if (!error && data) setPishSabtenamList(data.filter(p => p.is_enabled).sort((a, b) => a.unit_number - b.unit_number));
  };

  const handleLogout = () => { customAuth.logout(); navigate("/login"); };

  const getGradeLabel = (grade: string) => GRADE_OPTIONS.find(g => g.value === grade)?.label || grade;
  const getSubjectLabel = (subject: string) => SUBJECT_OPTIONS.find(s => s.value === subject)?.label || subject;
  const getGradeForPeriodSubject = (periodId: string, subject: string) => periodGrades.find(g => g.period_id === periodId && g.subject === subject)?.grade || "---";
  const togglePeriod = (periodId: string) => setOpenPeriods(prev => ({ ...prev, [periodId]: !prev[periodId] }));

  const handlePasswordChange = async () => {
    if (!currentPassword) { toast({ title: "خطا", description: "رمز عبور فعلی الزامی است", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "خطا", description: "رمزهای عبور مطابقت ندارند", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "خطا", description: "رمز عبور باید حداقل ۶ کاراکتر باشد", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { success, error } = await customAuth.changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (error) { toast({ title: "خطا", description: error, variant: "destructive" }); return; }
    if (success) {
      toast({ title: "موفقیت‌آمیز", description: "رمز عبور با موفقیت تغییر کرد" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setSettingsDialogOpen(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) { toast({ title: "خطا", description: "نام کاربری جدید را وارد کنید", variant: "destructive" }); return; }
    setChangingUsername(true);
    const { error } = await secureApi.update('custom_users', session?.user.id || '', { username: newUsername });
    setChangingUsername(false);
    if (error) { toast({ title: "خطا", description: error, variant: "destructive" }); return; }
    toast({ title: "موفقیت‌آمیز", description: "نام کاربری تغییر کرد" });
    setNewUsername("");
    fetchUserData(session?.user.id || '');
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "خطا", description: "فقط فایل‌های تصویری مجاز هستند", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-pictures").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
      const { error: updateError } = await secureApi.update('custom_users', session?.user.id || '', { profile_picture: urlData.publicUrl });
      if (updateError) throw new Error(updateError);
      setUserData(prev => prev ? { ...prev, profile_picture: urlData.publicUrl } : null);
      toast({ title: "موفقیت‌آمیز", description: "تصویر پروفایل با موفقیت آپلود شد" });
    } catch { toast({ title: "خطا", description: "آپلود تصویر با مشکل مواجه شد", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleLinkClick = (link: string) => {
    let url = link;
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse"></div>
          <p className="text-lg text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: "akhbar" as ActiveSection, icon: Newspaper, label: "اخبار" },
    { id: "pish_sabtenam" as ActiveSection, icon: ClipboardList, label: "پیش ثبت‌نام" },
    { id: "main" as ActiveSection, icon: Home, label: "پیام‌ها" },
    { id: "account" as ActiveSection, icon: User, label: "حساب" },
    { id: "grades" as ActiveSection, icon: GraduationCap, label: "نمرات" },
    { id: "jozveh" as ActiveSection, icon: BookOpen, label: "جزوه" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)]">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 bg-card border-b lg:border-b-0 lg:border-l border-border p-3 lg:p-6 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]" dir="rtl">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg transition-all duration-300 whitespace-nowrap text-sm lg:text-base ${
                    activeSection === item.id ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive transition-all duration-300 whitespace-nowrap lg:mt-auto text-sm lg:text-base">
                <LogOut className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
                <span className="font-medium">خروج</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-8" dir="rtl">
            {/* Account Section */}
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
                      <input type="file" ref={fileInputRef} onChange={handleProfilePictureUpload} accept="image/*" className="hidden" />
                      <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 rounded-full w-8 h-8">
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-center sm:text-right">
                      <h2 className="text-2xl font-bold">{studentData?.full_name}</h2>
                      <p className="text-muted-foreground">@{userData?.username}</p>
                      <p className="text-muted-foreground">پایه تحصیلی: {getGradeLabel(studentData?.grade || "")}</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-6 border-2 cursor-pointer hover:border-primary/50 transition-all duration-300" onClick={() => setSettingsDialogOpen(true)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Lock className="w-6 h-6 text-primary" /></div>
                      <div><h3 className="font-bold">تغییر رمز عبور</h3><p className="text-sm text-muted-foreground">رمز عبور خود را تغییر دهید</p></div>
                    </div>
                  </Card>
                  <Card className="p-6 border-2 cursor-pointer hover:border-primary/50 transition-all duration-300" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center"><Pencil className="w-6 h-6 text-accent" /></div>
                      <div><h3 className="font-bold">ویرایش پروفایل</h3><p className="text-sm text-muted-foreground">تصویر پروفایل خود را تغییر دهید</p></div>
                    </div>
                  </Card>
                </div>

                {/* Username Change */}
                <Card className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pencil className="w-5 h-5" /> تغییر نام کاربری</h3>
                  <div className="flex gap-2">
                    <Input placeholder="نام کاربری جدید" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="flex-1 text-right" />
                    <Button onClick={handleUsernameChange} disabled={changingUsername || !newUsername.trim()}>{changingUsername ? "..." : "تغییر"}</Button>
                  </div>
                </Card>

                {/* Online Classes */}
                <Card className="p-6 border-2">
                  <div className="flex items-center gap-3 mb-4"><Video className="w-6 h-6 text-primary" /><h3 className="text-lg font-bold">کلاس‌های آنلاین</h3></div>
                  {onlineClasses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">هیچ کلاس آنلاینی وجود ندارد</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {onlineClasses.map((cls) => (
                        <div key={cls.id} onClick={() => handleLinkClick(cls.link)} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted cursor-pointer transition-all duration-300">
                          <div className="flex items-center gap-3"><Video className="w-5 h-5 text-primary" /><span className="font-medium">{cls.title}</span></div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Grades Section */}
            {activeSection === "grades" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><GraduationCap className="w-8 h-8 text-primary" /> نمرات من</h1>
                {gradePeriods.length === 0 ? (
                  <Card className="p-12 text-center border-2">
                    <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-lg">هیچ دوره نمره‌ای برای پایه شما وجود ندارد</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {gradePeriods.map((period) => (
                      <Collapsible key={period.id} open={openPeriods[period.id]} onOpenChange={() => togglePeriod(period.id)}>
                        <Card className="border-2 overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-all duration-300">
                              <span className="text-lg font-bold">{period.title}</span>
                              {openPeriods[period.id] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-5 pt-0">
                              {SUBJECT_OPTIONS.map((subject) => {
                                const grade = getGradeForPeriodSubject(period.id, subject.value);
                                return (
                                  <div key={subject.value} className="p-4 bg-muted/50 rounded-lg border border-border text-center animate-fade-in">
                                    <p className="text-xs text-muted-foreground mb-2">{subject.label}</p>
                                    <p className={`text-xl font-bold ${grade === "---" ? "text-muted-foreground" : "text-primary"}`}>{grade}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Jozveh Section */}
            {activeSection === "jozveh" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><BookOpen className="w-8 h-8 text-primary" /> جزوه‌ها</h1>
                {jozvehList.length === 0 ? (
                  <Card className="p-12 text-center border-2"><FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground text-lg">هیچ جزوه‌ای برای پایه شما وجود ندارد</p></Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jozvehList.map((jozveh) => (
                      <Card key={jozveh.id} className="p-5 border-2 hover:border-primary/30 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-6 h-6 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{jozveh.title}</h3>
                            <p className="text-sm text-muted-foreground">{getSubjectLabel(jozveh.subject)}</p>
                            <Button variant="outline" size="sm" onClick={() => handleLinkClick(jozveh.file_url || jozveh.link)} className="mt-3 gap-2"><Download className="w-4 h-4" /> دانلود</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main/Chat Section */}
            {activeSection === "main" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold flex items-center gap-3"><MessageSquare className="w-8 h-8 text-primary" /> پیام‌ها</h1>
                </div>
                {session && <ChatPanel currentUserId={session.user.id} />}
              </div>
            )}

            {/* Akhbar Section */}
            {activeSection === "akhbar" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><Newspaper className="w-8 h-8 text-primary" /> اخبار و اطلاعیه‌ها</h1>
                {akhbarList.length === 0 ? (
                  <Card className="p-12 text-center border-2"><Newspaper className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground text-lg">هیچ خبری وجود ندارد</p></Card>
                ) : (
                  <div className="space-y-4">
                    {akhbarList.map((item) => (
                      <Card key={item.id} className="p-6 border-2">
                        <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{new Date(item.created_at).toLocaleDateString('fa-IR')}</p>
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.title} 
                            className="w-full max-h-64 object-contain rounded-lg mb-4 cursor-pointer"
                            onClick={() => setImagePopupUrl(item.image_url)}
                          />
                        )}
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderFormattedText(item.content)}</div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pish Sabtenam Section */}
            {activeSection === "pish_sabtenam" && (
              <div className="space-y-6 animate-fade-in">
                <h1 className="text-2xl font-bold flex items-center gap-3"><ClipboardList className="w-8 h-8 text-primary" /> پیش ثبت‌نام</h1>
                {pishSabtenamList.length === 0 ? (
                  <Card className="p-12 text-center border-2"><ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground text-lg">هیچ پیش ثبت‌نامی فعال نیست</p></Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {pishSabtenamList.map((pish) => (
                      <Card 
                        key={pish.id} 
                        className="p-6 border-2 hover:border-primary/50 cursor-pointer transition-all duration-300"
                        onClick={() => navigate(`/pish-sabtenam/${pish.unit_number}`)}
                      >
                        <ClipboardList className="w-10 h-10 text-primary mb-3" />
                        <h3 className="font-bold text-lg">{pish.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">برای مشاهده اطلاعات کلیک کنید</p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Password Change Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> تغییر رمز عبور</DialogTitle>
            <DialogDescription>رمز عبور جدید خود را وارد کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="password" placeholder="رمز عبور فعلی" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="text-right" />
            <Input type="password" placeholder="رمز عبور جدید" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="text-right" />
            <Input type="password" placeholder="تکرار رمز عبور جدید" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="text-right" />
            <Button onClick={handlePasswordChange} className="w-full" disabled={changingPassword}>{changingPassword ? "در حال ذخیره..." : "ذخیره رمز عبور"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Popup */}
      <Dialog open={!!imagePopupUrl} onOpenChange={() => setImagePopupUrl(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {imagePopupUrl && <img src={imagePopupUrl} alt="تصویر" className="w-full h-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Student;
