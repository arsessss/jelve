import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Home, Dumbbell, LogIn } from "lucide-react";
import logo from "@/assets/logo.png";

const Sport = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border pwa-header-safe">
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/sport" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="جلوه اسپورت" 
              className="h-14 w-auto transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-bold text-xl hidden sm:block">جلوه اسپورت</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/sport/login">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="w-4 h-4" />
                ورود
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      
      <main className="pt-28 pb-12 px-4 animate-fade-in">
        <div className="container mx-auto max-w-lg">
          <Card className="p-8 border-2 border-primary/20 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground" dir="rtl">
              جلوه اسپورت
            </h1>
            <p className="text-lg text-muted-foreground mb-3" dir="rtl">
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
        </div>
      </main>

      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground" dir="rtl">
            © ۱۴۰۴ مجتمع آموزشی جلوه. تمامی حقوق محفوظ است.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Sport;
