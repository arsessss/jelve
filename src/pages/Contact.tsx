import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { ContactSection } from "@/components/ContactSection";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Send } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(2, "نام باید حداقل ۲ حرف باشد").max(100, "نام نباید بیش از ۱۰۰ حرف باشد"),
  phone: z.string().regex(/^09\d{9}$/, "شماره تلفن باید به فرمت ۰۹۱۲۳۴۵۶۷۸۹ باشد"),
  message: z.string().trim().min(10, "پیام باید حداقل ۱۰ حرف باشد").max(1000, "پیام نباید بیش از ۱۰۰۰ حرف باشد")
});

const Contact = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = contactSchema.parse({
        name,
        phone,
        message
      });

      const { error } = await supabase
        .from("contact_messages")
        .insert([validatedData]);

      if (error) throw error;

      toast({
        title: "پیام شما ارسال شد",
        description: "به زودی با شما تماس خواهیم گرفت",
      });

      setName("");
      setPhone("");
      setMessage("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطا در اعتبارسنجی",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطا",
          description: "ارسال پیام با مشکل مواجه شد. لطفا دوباره تلاش کنید.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24">
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <h1 
              className="text-4xl md:text-5xl font-bold text-center mb-4 animate-fade-in"
              dir="rtl"
              style={{
                backgroundImage: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ارتباط با ما
            </h1>
            <p className="text-center text-muted-foreground mb-12 animate-slide-up" dir="rtl">
              پیام خود را برای ما ارسال کنید
            </p>

            <Card className="max-w-2xl mx-auto p-8 animate-scale-in transition-all duration-500 hover:shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
                <div>
                  <label className="block text-sm font-medium mb-2">نام و نام خانوادگی</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="text-right transition-all duration-200 focus:scale-[1.01]"
                    placeholder="نام خود را وارد کنید"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">شماره تماس</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    type="tel"
                    className="text-left transition-all duration-200 focus:scale-[1.01]"
                    placeholder="09123456789"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">پیام</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={6}
                    className="text-right resize-none transition-all duration-200 focus:scale-[1.01]"
                    placeholder="پیام خود را بنویسید..."
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground font-bold gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>در حال ارسال...</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      ارسال پیام
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </section>

        <ContactSection />
      </main>

      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground animate-fade-in" dir="rtl">
            © ۱۴۰۴ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
