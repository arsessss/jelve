import { useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff, MonitorUp, Crown } from "lucide-react";
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
}

export function VideoTile({ stream, name, isLocal, micOn, camOn, sharing, isTeacher, highlight }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn(
      "relative bg-muted rounded-lg overflow-hidden border-2 aspect-video",
      highlight ? "border-primary" : "border-border",
      "transition-all duration-300"
    )}>
      {stream && camOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn("w-full h-full object-cover", isLocal && !sharing && "scale-x-[-1]")}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {name.charAt(0)}
            </div>
            <VideoOff className="w-5 h-5" />
          </div>
        </div>
      )}
      <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between gap-2 px-2 py-1 bg-background/80 backdrop-blur rounded-md">
        <div className="flex items-center gap-1.5 min-w-0">
          {isTeacher && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
          <span className="text-xs font-medium truncate">{name}{isLocal && " (شما)"}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {sharing && <MonitorUp className="w-3.5 h-3.5 text-primary" />}
          {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-destructive" />}
        </div>
      </div>
    </div>
  );
}