import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { SchoolBlock } from "@/components/SchoolBlock";
import { Link } from "react-router-dom";
import { Dumbbell, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface PishSabtenamData {
  id: string;
  unit_number: number;
  title: string;
  is_enabled: boolean;
}

const Home = () => {
  const [pishData, setPishData] = useState<PishSabtenamData[]>([]);

  useEffect(() => {
    const fetchPish = async () => {
      const { data } = await supabase.from("pish_sabtenam").select("id, unit_number, title, is_enabled");
      if (data) setPishData(data.filter((p: PishSabtenamData) => p.is_enabled));
    };
    fetchPish();
  }, []);

  const getPishForUnit = (unit: number) => pishData.find(p => p.unit_number === unit);

  const schoolBlocks = [
    { title: "دوره اول پسرانه", description: "دوره ابتدایی با تمرکز بر پایه‌های آموزشی قوی و توسعه شخصیت", delay: 0, unit: 1 },
    { title: "دوره دوم پسرانه", description: "دوره متوسطه با برنامه‌های آموزشی پیشرفته و هدفمند", delay: 200, unit: 2 },
    { title: "دوره دوم دخترانه", description: "دوره متوسطه با محیطی امن، پرورشی و الهام‌بخش", delay: 400, unit: 3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      
      <main className="pt-24 animate-fade-in">
        {/* Hero Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-foreground/5 via-transparent to-transparent" />
          
          <div className="container mx-auto text-center relative z-10">
            <h1 
              className="text-5xl md:text-6xl lg:text-7xl font-koodak font-bold mb-8 px-4" 
              dir="rtl" 
              style={{
                backgroundImage: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: '1.3'
              }}
            >
              مجتمع آموزشی جلوه
            </h1>
            <p className="text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed" dir="rtl">
              تربیت نسلی موفق با آموزش باکیفیت
            </p>
            <Link 
              to="/sport" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-bold text-lg rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 touch-target"
            >
              <Dumbbell className="w-6 h-6" />
              جلوه اسپورت
            </Link>
          </div>
        </section>

        {/* School Blocks Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16" dir="rtl">
              واحدهای آموزشی
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {schoolBlocks.map((block) => {
                const pish = getPishForUnit(block.unit);
                return (
                  <div key={block.unit} className="flex flex-col gap-3">
                    {pish && (
                      <Link to={`/pish-sabtenam/${pish.unit_number}`}>
                        <Button variant="outline" className="w-full gap-2 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                          <ClipboardList className="w-4 h-4" />
                          {pish.title || "پیش ثبت‌نام"}
                        </Button>
                      </Link>
                    )}
                    <SchoolBlock 
                      title={block.title} 
                      description={block.description} 
                      delay={block.delay} 
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-lg" dir="rtl">
            © ۱۴۰۴ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;