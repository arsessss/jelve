import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Home, Dumbbell } from "lucide-react";

const Sport = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/8f1d12c0-c67f-4a64-be6f-2314e54ef498.png" 
              alt="جلوه اسپورت" 
              className="h-14 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </nav>
      </header>
      
      <main className="pt-24">
        <section className="py-24 px-4 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-foreground/5 via-transparent to-transparent" />
          
          <div className="container mx-auto text-center relative z-10">
            <Dumbbell className="w-20 h-20 mx-auto mb-8 text-foreground/70 animate-fade-in" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 animate-fade-in" dir="rtl">
              جلوه اسپورت
            </h1>
            <Card className="max-w-lg mx-auto p-8 border-2 animate-slide-up">
              <p className="text-xl text-muted-foreground mb-6" dir="rtl">
                این بخش در حال توسعه است
              </p>
              <p className="text-lg text-muted-foreground mb-8" dir="rtl">
                لطفاً بعداً مراجعه کنید
              </p>
              <Link to="/">
                <Button className="gap-2">
                  <Home className="w-4 h-4" />
                  صفحه اصلی
                </Button>
              </Link>
            </Card>
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

export default Sport;
