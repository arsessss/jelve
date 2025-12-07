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
import { customAuth } from "@/lib/auth";
import { LogOut, Save, MessageSquare, UserPlus, Trash2, Users, Video, Plus } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  grade: string;
  student_id: string | null;
  user_id: string;
}

interface Address {
  id: string;
  title: string;
  address: string;
  phone: string;
  sort_order: number;
}

interface SiteContent {
  id: string;
  key: string;
  value: string;
}

interface OnlineClass {
  id: string;
  grade: string;
  title: string;
  link: string;
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

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", username: "", password: "", grade: "7/1" });
  const [newClass, setNewClass] = useState({ grade: "7/1", title: "", link: "" });
  
  const [mainTitle, setMainTitle] = useState("");
  const [mainDescription, setMainDescription] = useState("");
  const [editedAddresses, setEditedAddresses] = useState<Record<string, { address: string; phone: string }>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchMessages();
    fetchStudents();
    fetchAddresses();
    fetchSiteContent();
    fetchOnlineClasses();
  }, []);

  const checkAuth = () => {
    const session = customAuth.getSession();
    if (!session) {
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

  const fetchAddresses = async () => {
    const { data, error } = await (supabase as any)
      .from("addresses")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setAddresses(data);
      const initial: Record<string, { address: string; phone: string }> = {};
      data.forEach((addr: Address) => {
        initial[addr.id] = { address: addr.address, phone: addr.phone };
      });
      setEditedAddresses(initial);
    }
  };

  const fetchSiteContent = async () => {
    const { data, error } = await (supabase as any)
      .from("site_content")
      .select("*");

    if (!error && data) {
      setSiteContent(data);
      const title = data.find((c: SiteContent) => c.key === "main_title");
      const desc = data.find((c: SiteContent) => c.key === "main_description");
      if (title) setMainTitle(title.value);
      if (desc) setMainDescription(desc.value);
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

  const handleLogout = () => {
    customAuth.logout();
    navigate("/login");
  };

  const saveContent = async () => {
    setLoading(true);
    try {
      await (supabase as any)
        .from("site_content")
        .update({ value: mainTitle, updated_at: new Date().toISOString() })
        .eq("key", "main_title");

      await (supabase as any)
        .from("site_content")
        .update({ value: mainDescription, updated_at: new Date().toISOString() })
        .eq("key", "main_description");

      toast({
        title: "ذخیره شد",
        description: "محتوا با موفقیت ذخیره شد",
      });
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "ذخیره محتوا با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = async (addressId: string) => {
    setLoading(true);
    try {
      const edited = editedAddresses[addressId];
      await (supabase as any)
        .from("addresses")
        .update({ 
          address: edited.address, 
          phone: edited.phone,
          updated_at: new Date().toISOString() 
        })
        .eq("id", addressId);

      toast({
        title: "ذخیره شد",
        description: "آدرس با موفقیت ذخیره شد",
      });
      fetchAddresses();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: "ذخیره آدرس با مشکل مواجه شد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const getGradeLabel = (grade: string) => {
    const found = GRADE_OPTIONS.find(g => g.value === grade);
    return found ? found.label : grade;
  };

  const updateAddressField = (id: string, field: "address" | "phone", value: string) => {
    setEditedAddresses(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 pb-12 px-4">
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

          <Tabs defaultValue="students" className="w-full animate-slide-up" dir="rtl">
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="students" className="gap-2 text-xs sm:text-sm">
                <Users className="w-4 h-4 hidden sm:block" />
                دانش‌آموزان
              </TabsTrigger>
              <TabsTrigger value="classes" className="gap-2 text-xs sm:text-sm">
                <Video className="w-4 h-4 hidden sm:block" />
                کلاس‌ها
              </TabsTrigger>
              <TabsTrigger value="content" className="text-xs sm:text-sm">محتوا</TabsTrigger>
              <TabsTrigger value="addresses" className="text-xs sm:text-sm">آدرس‌ها</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs sm:text-sm">پیام‌ها</TabsTrigger>
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
                        onClick={() => deleteStudent(student.id, student.user_id)}
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

            <TabsContent value="classes" className="space-y-6">
              <Card className="p-6 border-2 hover:border-foreground/20 transition-colors">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  افزودن کلاس آنلاین
                </h3>
                <form onSubmit={createOnlineClass} className="space-y-4">
                  <Input
                    placeholder="عنوان کلاس (مثال: کلاس آقای صابوری)"
                    value={newClass.title}
                    onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                    required
                    className="text-right"
                  />
                  <Input
                    placeholder="لینک کلاس (مثال: meet.google.com/xxx)"
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
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "در حال ایجاد..." : "ایجاد کلاس"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 border-2">
                <h3 className="text-xl font-bold mb-4">لیست کلاس‌های آنلاین</h3>
                <div className="space-y-3">
                  {onlineClasses.map((cls) => (
                    <div key={cls.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border border-border hover:border-foreground/20 transition-all duration-300">
                      <div>
                        <p className="font-bold">{cls.title}</p>
                        <p className="text-sm text-muted-foreground">پایه: {getGradeLabel(cls.grade)}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{cls.link}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteOnlineClass(cls.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {onlineClasses.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">هیچ کلاسی وجود ندارد</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card className="p-6 border-2">
                <h3 className="text-lg font-bold mb-4">عنوان صفحه اصلی</h3>
                <Input 
                  value={mainTitle}
                  onChange={(e) => setMainTitle(e.target.value)}
                  className="text-right mb-4"
                />
                <h3 className="text-lg font-bold mb-4">توضیحات</h3>
                <Textarea 
                  value={mainDescription}
                  onChange={(e) => setMainDescription(e.target.value)}
                  className="text-right"
                  rows={3}
                />
                <Button onClick={saveContent} disabled={loading} className="mt-4">
                  <Save className="w-4 h-4 ml-2" />
                  {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4">
              {addresses.map((addr) => (
                <Card key={addr.id} className="p-6 border-2">
                  <h3 className="text-lg font-bold mb-4">{addr.title}</h3>
                  <Input 
                    placeholder="آدرس"
                    value={editedAddresses[addr.id]?.address || ""}
                    onChange={(e) => updateAddressField(addr.id, "address", e.target.value)}
                    className="text-right mb-3"
                  />
                  <Input 
                    placeholder="شماره تماس"
                    value={editedAddresses[addr.id]?.phone || ""}
                    onChange={(e) => updateAddressField(addr.id, "phone", e.target.value)}
                    className="text-right"
                    dir="ltr"
                  />
                  <Button onClick={() => saveAddress(addr.id)} disabled={loading} className="mt-4">
                    <Save className="w-4 h-4 ml-2" />
                    {loading ? "در حال ذخیره..." : "ذخیره"}
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
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleDateString('fa-IR')}
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;