import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { customAuth, AuthSession } from "@/lib/auth";
import { secureApi } from "@/lib/secure-api";
import { ChatPanel } from "@/components/ChatPanel";
import { LogOut, GraduationCap, Video, Settings, Camera, Lock, ExternalLink, User, BookOpen, FileText, Download, MessageSquare } from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
}

interface StudentGrade {
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

const Student = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [userData, setUserData] = useState<CustomUser | null>(null);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [jozvehList, setJozvehList] = useState<Jozveh[]>([]);
  const [myGrades, setMyGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const validateAndLoadData = async () => {
      const localSession = customAuth.getSession();
      if (!localSession) {
        navigate("/login");
        return;
      }

      // Validate session server-side to prevent localStorage manipulation
      const { valid, session: validatedSession } = await customAuth.validateSession();
      
      if (!valid || !validatedSession) {
        toast({
          title: "نشست نامعتبر",
          description: "لطفا دوباره وارد شوید",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (validatedSession.role !== "student") {
        toast({
          title: "دسترسی غیرمجاز",
          description: "شما دسترسی به این صفحه ندارید",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setSession(validatedSession);
      fetchStudentData(validatedSession.user.id);
      fetchUserData(validatedSession.user.id);
    };

    validateAndLoadData();
  }, [navigate]);

  useEffect(() => {
    if (studentData) {
      fetchOnlineClasses(studentData.grade);
      fetchJozveh(studentData.grade);
      fetchMyGrades(studentData.id);
    }
  }, [studentData]);

  const fetchStudentData = async (userId: string) => {
    const { data, error } = await secureApi.select<StudentData>('students', { user_id: userId });
    if (!error && data && data.length > 0) {
      setStudentData(data[0]);
    }
    setLoading(false);
  };

  const fetchUserData = async (userId: string) => {
    const { data, error } = await secureApi.select<CustomUser>('custom_users', { id: userId });
    if (!error && data && data.length > 0) {
      setUserData(data[0]);
    }
  };

  const fetchOnlineClasses = async (grade: string) => {
    const { data, error } = await secureApi.select<OnlineClass>('online_classes', { grade });
    if (!error && data) {
      setOnlineClasses(data);
    }
  };

  const fetchJozveh = async (grade: string) => {
    const { data, error } = await secureApi.select<Jozveh>('jozveh', { grade });
    if (!error && data) {
      setJozvehList(data);
    }
  };

  const fetchMyGrades = async (studentId: string) => {
    const { data, error } = await secureApi.select<StudentGrade>('student_grades', { student_id: studentId });
    if (!error && data) {
      setMyGrades(data);
    }
  };

  const handleLogout = () => {
    customAuth.logout();
    navigate("/login");
  };

  const getGradeLabel = (grade: string) => {
    const found = GRADE_OPTIONS.find(g => g.value === grade);
    return found ? found.label : grade;
  };

  const getSubjectLabel = (subject: string) => {
    const found = SUBJECT_OPTIONS.find(s => s.value === subject);
    return found ? found.label : subject;
  };

  const getMyGradeForSubject = (subject: string) => {
    const found = myGrades.find(g => g.subject === subject);
    return found?.grade || "—";
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast({
        title: "خطا",
        description: "رمز عبور فعلی الزامی است",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "خطا",
        description: "رمزهای عبور مطابقت ندارند",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "خطا",
        description: "رمز عبور باید حداقل ۶ کاراکتر باشد",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    const { success, error } = await customAuth.changePassword(currentPassword, newPassword);
    setChangingPassword(false);

    if (error) {
      toast({
        title: "خطا",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (success) {
      toast({
        title: "موفقیت‌آمیز",
        description: "رمز عبور با موفقیت تغییر کرد",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSettingsOpen(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطا",
        description: "فقط فایل‌های تصویری مجاز هستند",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Storage upload uses direct Supabase client (public bucket)
      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      // Update user profile via secure API
      const { error: updateError } = await secureApi.update('custom_users', session?.user.id || '', { 
        profile_picture: urlData.publicUrl 
      });

      if (updateError) throw new Error(updateError);

      setUserData(prev => prev ? { ...prev, profile_picture: urlData.publicUrl } : null);

      toast({
        title: "موفقیت‌آمیز",
        description: "تصویر پروفایل با موفقیت آپلود شد",
      });
    } catch {
      toast({
        title: "خطا",
        description: "آپلود تصویر با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLinkClick = (link: string) => {
    let url = link;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted"></div>
          <p className="text-lg text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-28 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in" dir="rtl">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              پنل دانش‌آموز
            </h1>
            <div className="flex items-center gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 transition-all duration-300 hover:scale-105">
                    <Settings className="w-4 h-4" />
                    تنظیمات
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl" className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>تنظیمات حساب</DialogTitle>
                    <DialogDescription>تصویر پروفایل و رمز عبور خود را تغییر دهید</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="w-24 h-24 border-2 border-border transition-all duration-300 hover:scale-105">
                        <AvatarImage src={userData?.profile_picture || undefined} />
                        <AvatarFallback>
                          <User className="w-12 h-12 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleProfilePictureUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="gap-2 transition-all duration-300 hover:scale-105"
                      >
                        <Camera className="w-4 h-4" />
                        {uploading ? "در حال آپلود..." : "تغییر تصویر"}
                      </Button>
                    </div>

                    {/* Password Change */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        تغییر رمز عبور
                      </h4>
                      <Input
                        type="password"
                        placeholder="رمز عبور فعلی"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="text-right transition-all duration-200 focus:scale-[1.01]"
                      />
                      <Input
                        type="password"
                        placeholder="رمز عبور جدید"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="text-right transition-all duration-200 focus:scale-[1.01]"
                      />
                      <Input
                        type="password"
                        placeholder="تکرار رمز عبور جدید"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="text-right transition-all duration-200 focus:scale-[1.01]"
                      />
                      <Button 
                        onClick={handlePasswordChange} 
                        className="w-full transition-all duration-300 hover:scale-[1.02]"
                        disabled={changingPassword}
                      >
                        {changingPassword ? "در حال ذخیره..." : "ذخیره رمز عبور"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="gap-2 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </Button>
            </div>
          </div>

          {studentData && (
            <div className="space-y-6">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300 animate-fade-in" dir="rtl">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-border transition-all duration-300 hover:scale-105">
                    <AvatarImage src={userData?.profile_picture || undefined} />
                    <AvatarFallback>
                      <GraduationCap className="w-8 h-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{studentData.full_name}</h2>
                    <p className="text-muted-foreground">پایه تحصیلی: {getGradeLabel(studentData.grade)}</p>
                    {studentData.student_id && (
                      <p className="text-sm text-muted-foreground">شماره دانش‌آموزی: {studentData.student_id}</p>
                    )}
                  </div>
                </div>
              </Card>

              <Tabs defaultValue="classes" className="w-full" dir="rtl">
                <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1">
                  <TabsTrigger value="classes" className="gap-2 py-3 text-sm">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">کلاس‌ها</span>
                  </TabsTrigger>
                  <TabsTrigger value="jozveh" className="gap-2 py-3 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">جزوه</span>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2 py-3 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">پیام‌ها</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat">
                  <ChatPanel currentUserId={session?.user.id || ''} />
                </TabsContent>

                <TabsContent value="classes">
                  <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <Video className="w-8 h-8 text-foreground" />
                      <h3 className="text-xl font-bold">کلاس‌های آنلاین</h3>
                    </div>
                    
                    {onlineClasses.length === 0 ? (
                      <div className="p-8 bg-muted/50 rounded-lg text-center">
                        <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">هیچ کلاس آنلاینی برای پایه شما وجود ندارد</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {onlineClasses.map((cls, index) => (
                          <div
                            key={cls.id}
                            onClick={() => handleLinkClick(cls.link)}
                            className="p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 hover:bg-muted cursor-pointer transition-all duration-300 hover:scale-[1.02] group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Video className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                                <span className="font-medium">{cls.title}</span>
                              </div>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="jozveh" className="space-y-6">
                  {/* Jozveh List */}
                  <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <FileText className="w-8 h-8 text-foreground" />
                      <h3 className="text-xl font-bold">جزوه‌ها</h3>
                    </div>
                    
                    {jozvehList.length === 0 ? (
                      <div className="p-8 bg-muted/50 rounded-lg text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">هیچ جزوه‌ای برای پایه شما وجود ندارد</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {jozvehList.map((jozveh, index) => (
                          <div
                            key={jozveh.id}
                            className="p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 hover:bg-muted transition-all duration-300 hover:scale-[1.02]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{jozveh.title}</p>
                                  <p className="text-sm text-muted-foreground">{getSubjectLabel(jozveh.subject)}</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLinkClick(jozveh.file_url || jozveh.link)}
                                className="shrink-0 gap-1"
                              >
                                <Download className="w-4 h-4" />
                                دانلود
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Grades */}
                  <Card className="p-6 border-2 hover:border-foreground/20 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <BookOpen className="w-8 h-8 text-foreground" />
                      <h3 className="text-xl font-bold">نمرات من</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {SUBJECT_OPTIONS.map((subject, index) => (
                        <div 
                          key={subject.value} 
                          className="p-4 bg-muted/50 rounded-lg border border-border text-center hover:border-foreground/20 transition-all duration-300 hover:scale-105"
                        >
                          <p className="text-sm text-muted-foreground mb-1">{subject.label}</p>
                          <p className="text-2xl font-bold">{getMyGradeForSubject(subject.value)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Student;
