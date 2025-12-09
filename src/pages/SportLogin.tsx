import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Home, Dumbbell, Construction } from "lucide-react";

const SportLogin = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/sport" className="flex items-center gap-3">
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
        <section className="py-24 px-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="max-w-md w-full p-8 border-2 animate-fade-in text-center">
            <div className="flex justify-center gap-4 mb-6">
              <Dumbbell className="w-12 h-12 text-foreground/70" />
              <Construction className="w-12 h-12 text-foreground/70" />
            </div>
            <h1 className="text-2xl font-bold mb-4" dir="rtl">
              ورود به جلوه اسپورت
            </h1>
            <p className="text-lg text-muted-foreground mb-4" dir="rtl">
              این بخش در حال توسعه است
            </p>
            <p className="text-muted-foreground mb-8" dir="rtl">
              لطفاً بعداً مراجعه کنید
            </p>
            <Link to="/">
              <Button className="gap-2">
                <Home className="w-4 h-4" />
                صفحه اصلی
              </Button>
            </Link>
          </Card>
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

export default SportLogin;
