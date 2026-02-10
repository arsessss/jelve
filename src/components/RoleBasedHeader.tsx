import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { customAuth, AuthSession } from "@/lib/auth";
import { LogOut } from "lucide-react";

export const RoleBasedHeader = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentSession = customAuth.getSession();
    setSession(currentSession);

    const handleAuthChange = () => {
      const newSession = customAuth.getSession();
      setSession(newSession);
    };

    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  const handleLogout = () => {
    customAuth.logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border pwa-header-safe">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <img 
              src={logo} 
              alt="Jelve Logo" 
              className="h-14 w-14 object-contain transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
            />
          </Link>

          <div className="flex items-center gap-4 sm:gap-6" dir="rtl">
            <Link 
              to="/" 
              className="nav-link text-foreground/80 hover:text-foreground font-medium py-1 touch-target flex items-center"
            >
              صفحه اصلی
            </Link>
            <Link 
              to="/contact" 
              className="nav-link text-foreground/80 hover:text-foreground font-medium py-1 touch-target flex items-center"
            >
              ارتباط با ما
            </Link>
            
            {session?.role === "admin" && (
              <Link 
                to="/admin" 
                className="nav-link text-foreground/80 hover:text-foreground font-medium py-1 touch-target flex items-center"
              >
                پنل
              </Link>
            )}
            
            {session?.role === "student" && (
              <Link 
                to="/student" 
                className="nav-link text-foreground/80 hover:text-foreground font-medium py-1 touch-target flex items-center"
              >
                دانش‌آموز
              </Link>
            )}

            {session?.role === "parent" && (
              <Link 
                to="/parent" 
                className="nav-link text-foreground/80 hover:text-foreground font-medium py-1 touch-target flex items-center"
              >
                والدین
              </Link>
            )}
            
            {!session && (
              <Link 
                to="/login" 
                className="nav-link text-foreground/80 hover:text-foreground font-medium py-1 touch-target flex items-center"
              >
                ورود
              </Link>
            )}

            {session && !session.role && (
              <button 
                onClick={handleLogout}
                className="text-foreground/80 hover:text-foreground transition-all duration-300 font-medium flex items-center gap-1 hover:scale-105 active:scale-95 touch-target"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};