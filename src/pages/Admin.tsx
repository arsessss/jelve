import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Save, MessageSquare } from "lucide-react";

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
    fetchMessages();
  }, [navigate]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" dir="rtl">
              پنل مدیریت
            </h1>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>

          <Tabs defaultValue="content" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">ویرایش محتوا</TabsTrigger>
              <TabsTrigger value="addresses">آدرس‌ها</TabsTrigger>
              <TabsTrigger value="messages">پیام‌ها</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <Card className="p-6">
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
                <Button onClick={handleSave} className="mt-4 gradient-primary text-white">
                  <Save className="w-4 h-4 ml-2" />
                  ذخیره تغییرات
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4">
              {["دوره اول پسرانه", "دوره دوم پسرانه", "دوره دوم دخترانه"].map((title, idx) => (
                <Card key={idx} className="p-6">
                  <h3 className="text-lg font-bold mb-4">{title}</h3>
                  <Input 
                    placeholder="آدرس"
                    className="text-right mb-3"
                  />
                  <Input 
                    placeholder="شماره تماس"
                    className="text-right"
                    dir="ltr"
                  />
                  <Button onClick={handleSave} className="mt-4 gradient-primary text-white">
                    <Save className="w-4 h-4 ml-2" />
                    ذخیره
                  </Button>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="messages">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <Card className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">هیچ پیامی وجود ندارد</p>
                  </Card>
                ) : (
                  messages.map((msg) => (
                    <Card key={msg.id} className="p-6" dir="rtl">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold">{msg.name}</h4>
                          <p className="text-sm text-muted-foreground" dir="ltr">{msg.phone}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{msg.message}</p>
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
