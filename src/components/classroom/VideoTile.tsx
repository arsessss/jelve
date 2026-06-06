import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, VideoOff, MonitorUp, Crown, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  micOn: boolean;
  camOn: boolean;
  sharing?: boolean;
  isTeacher?: boolean;
  highlight?: boolean;
  compact?: boolean;
  featured?: boolean;
  handRaised?: boolean;
  /** Audio-only sink (don't render video). Used for camera tiles that are off but still carry mic audio. */
  audioOnly?: boolean;
}

export function VideoTile({ stream, name, isLocal, micOn, camOn, sharing, isTeacher, highlight, compact, featured, handRaised, audioOnly }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [appeared, setAppeared] = useState(false);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 10);
    return () => clearTimeout(t);
  }, []);

  const showVideo = !audioOnly && stream && (camOn || sharing);

  return (
    <div className={cn(
      "relative bg-gradient-to-br from-muted to-muted/60 rounded-xl overflow-hidden border-2 group",
      featured ? "h-full w-full" : "aspect-video",
      highlight ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.25)]" : "border-border/60",
      "transition-all duration-300 ease-out",
      appeared ? "opacity-100 scale-100" : "opacity-0 scale-95"
    )}>
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full animate-fade-in",
            sharing ? "object-contain bg-black" : "object-cover",
            isLocal && !sharing && "scale-x-[-1]"
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <div className={cn(
            "rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-primary animate-scale-in shadow-lg",
            featured ? "w-32 h-32 text-5xl" : compact ? "w-10 h-10 text-base" : "w-16 h-16 text-2xl"
          )}>
            {name.charAt(0)}
          </div>
        </div>
      )}
      {/* Always-on audio sink for remote peers */}
      {!isLocal && stream && (audioOnly || !showVideo) && (
        <audio autoPlay ref={audioRef} />
      )}
      {handRaised && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500 text-white text-[10px] font-bold shadow-lg animate-scale-in">
          <Hand className="w-3 h-3" /> دست
        </div>
      )}
      <div className={cn(
        "absolute bottom-1.5 right-1.5 left-1.5 flex items-center justify-between gap-2 px-2 py-1 bg-background/85 backdrop-blur-md rounded-lg border border-border/40",
        compact && "text-[10px] py-0.5 px-1.5"
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          {isTeacher && <Crown className={cn("text-primary shrink-0", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />}
          <span className={cn("font-medium truncate", compact ? "text-[10px]" : "text-xs")}>{name}{isLocal && " (شما)"}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {sharing && <MonitorUp className={cn("text-primary", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />}
          {!camOn && !sharing && <VideoOff className={cn("text-muted-foreground", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />}
          {micOn
            ? <Mic className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
            : <MicOff className={cn("text-destructive", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />}
        </div>
      </div>
      {featured && sharing && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-lg animate-scale-in">
          <MonitorUp className="w-3.5 h-3.5" /> در حال اشتراک صفحه
        </div>
      )}
    </div>
  );
}