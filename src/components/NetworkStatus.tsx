import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { isOnline, onOnlineChange } from "@/lib/network-resilience";

export const NetworkStatus = () => {
  const [online, setOnline] = useState(isOnline());
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = onOnlineChange((status) => {
      setOnline(status);
      if (!status) {
        setShowOffline(true);
      } else {
        // Hide after a delay when coming back online
        setTimeout(() => setShowOffline(false), 3000);
      }
    });

    // Initial check
    if (!isOnline()) {
      setShowOffline(true);
    }

    return unsubscribe;
  }, []);

  if (!showOffline) return null;

  return (
    <div 
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 ${
        online 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-destructive text-destructive-foreground'
      }`}
      dir="rtl"
    >
      {online ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">اتصال برقرار شد</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">اتصال اینترنت قطع است</span>
        </>
      )}
    </div>
  );
};