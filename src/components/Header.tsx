import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { useEffect, useState } from "react";

export const Header = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src={theme === "dark" ? logoDark : logoLight} 
              alt="Jelve Logo" 
              className="h-12 w-12 object-contain transition-transform duration-300 hover:scale-110"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              جلوه
            </span>
          </Link>

          <div className="flex items-center gap-6" dir="rtl">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors duration-300 font-medium"
            >
              صفحه اصلی
            </Link>
            <Link 
              to="/contact" 
              className="text-foreground hover:text-primary transition-colors duration-300 font-medium"
            >
              ارتباط با ما
            </Link>
            <Link 
              to="/login" 
              className="text-foreground hover:text-primary transition-colors duration-300 font-medium"
            >
              ورود
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};
