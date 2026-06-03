import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { customAuth, AuthSession } from "@/lib/auth";
import { onlineClassApi, JoinResult } from "@/lib/online-class";
import { useClassRoom } from "@/hooks/useClassRoom";
import { VideoTile } from "@/components/classroom/VideoTile";
import { Whiteboard } from "@/components/classroom/Whiteboard";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, MonitorX,
  MessageSquare, Pencil, Users, PhoneOff, X, Send, Loader2, Power, Hand
} from "lucide-react";

type SidePanel = 'chat' | 'people' | null;
type MainView = 'grid' | 'whiteboard';

const ClassRoom = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [joinData, setJoinData] = useState<JoinResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [mainView, setMainView] = useState<MainView>('grid');
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth + join
  useEffect(() => {
    (async () => {
      const local = customAuth.getSession();
      if (!local) { navigate('/login'); return; }
      const { valid, session: s } = await customAuth.validateSession();
      if (!valid || !s) { toast.error('لطفا دوباره وارد شوید'); navigate('/login'); return; }
      setSession(s);
      if (!classId) { setJoinError('کلاس نامعتبر'); setLoading(false); return; }
      const { data, error } = await onlineClassApi.join(classId);
      if (error || !data) { setJoinError(error || 'ورود ناموفق'); setLoading(false); return; }
      setJoinData(data);
      setLoading(false);
    })();
  }, [classId, navigate]);

  const isTeacher = joinData?.role === 'teacher';

  const room = useClassRoom({
    classId: classId || '',
    userId: joinData?.userId || '',
    displayName: joinData?.displayName || '',
    isTeacher: !!isTeacher,
  });

  // Auto-leave on unload
  useEffect(() => {
    const handler = () => {
      if (classId) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/online-class-api`;
        navigator.sendBeacon?.(
          url,
          new Blob([JSON.stringify({ token: session?.token, action: 'leave', class_id: classId })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [classId, session]);

  // Listen for class-ended broadcast from teacher
  useEffect(() => {
    const onEnded = () => {
      toast.info('کلاس توسط معلم پایان یافت');
      handleLeave();
    };
    window.addEventListener('class-ended', onEnded);
    return () => window.removeEventListener('class-ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.chat]);

  const handleLeave = async () => {
    room.cleanup();
    if (classId) await onlineClassApi.leave(classId);
    if (isTeacher) navigate('/admin'); else navigate('/student');
  };

  const handleEndClass = async () => {
    if (!classId) return;
    if (!confirm('کلاس برای همه پایان یابد؟')) return;
    room.announceEnd();
    await onlineClassApi.end(classId);
    toast.success('کلاس پایان یافت');
    handleLeave();
  };

  const handleSendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    room.sendChat(t);
    setChatInput("");
  };

  const handleShareClick = () => {
    if (!room.canShare) {
      toast.error('برای اشتراک صفحه باید معلم اجازه دهد');
      return;
    }
    room.sharing ? room.stopScreenShare() : room.startScreenShare();
  };

  const handleBoardClick = () => {
    setMainView(v => v === 'whiteboard' ? 'grid' : 'whiteboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">در حال اتصال به کلاس...</p>
        </div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border-2 border-border rounded-xl p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">امکان ورود به کلاس نیست</h1>
          <p className="text-muted-foreground">{joinError}</p>
          <Button onClick={() => navigate(-1)}>بازگشت</Button>
        </div>
      </div>
    );
  }

  if (room.mediaError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border-2 border-border rounded-xl p-8 text-center space-y-4">
          <h1 className="text-xl font-bold">دسترسی به دوربین/میکروفون لازم است</h1>
          <p className="text-muted-foreground">{room.mediaError}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>تلاش مجدد</Button>
            <Button variant="outline" onClick={handleLeave}>خروج</Button>
          </div>
        </div>
      </div>
    );
  }

  const peerList = Object.values(room.peers);
  const totalCount = peerList.length + 1;
  const raisedCount = peerList.filter(p => p.handRaised).length + (room.handRaised ? 1 : 0);

  // Build participant array including self for spotlight logic
  type Tile = {
    key: string;
    stream: MediaStream | null;
    name: string;
    isLocal: boolean;
    micOn: boolean;
    camOn: boolean;
    sharing: boolean;
    isTeacher: boolean;
  };
  const selfTile: Tile = {
    key: 'self',
    stream: room.localStream,
    name: joinData?.displayName || 'شما',
    isLocal: true,
    micOn: room.micOn,
    camOn: room.camOn,
    sharing: room.sharing,
    isTeacher: !!isTeacher,
  };
  const allTiles: Tile[] = [
    selfTile,
    ...peerList.map(p => ({
      key: p.userId,
      stream: p.stream,
      name: p.displayName,
      isLocal: false,
      micOn: p.micOn,
      camOn: p.camOn,
      sharing: p.sharing,
      isTeacher: p.isTeacher,
    })),
  ];
  // Spotlight: prefer screen sharer, else teacher, else self
  const sharer = allTiles.find(t => t.sharing);
  const teacherTile = allTiles.find(t => t.isTeacher);
  const spotlight = sharer || teacherTile || selfTile;
  const filmstrip = allTiles.filter(t => t.key !== spotlight.key);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/30">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-[11px] font-bold text-destructive">زنده</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold truncate text-sm leading-tight">{joinData?.class.title}</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              پایه {joinData?.class.grade}{joinData?.class.subject ? ` • ${joinData.class.subject}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-sm">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{totalCount}</span>
          </div>
          <div className={cn(
            "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            room.connected ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border/60"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", room.connected ? "bg-primary" : "bg-muted-foreground")} />
            {room.connected ? "متصل" : "در حال اتصال"}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex min-h-0 bg-gradient-to-b from-background to-muted/30">
        {/* Stage */}
        <main className="flex-1 flex flex-col p-3 gap-3 min-h-0 overflow-hidden">
          {/* Spotlight / Whiteboard */}
          <div className="flex-1 min-h-0">
            {mainView === 'whiteboard' ? (
              <Whiteboard
                strokes={room.strokes}
                onStroke={room.sendStroke}
                onClear={room.clearBoard}
                canDraw={room.canDraw}
              />
            ) : (
              <VideoTile
                stream={spotlight.stream}
                name={spotlight.name}
                isLocal={spotlight.isLocal}
                micOn={spotlight.micOn}
                camOn={spotlight.camOn}
                sharing={spotlight.sharing}
                isTeacher={spotlight.isTeacher}
                highlight={spotlight.isTeacher || spotlight.sharing}
                featured
              />
            )}
          </div>
          {/* Filmstrip */}
          {filmstrip.length > 0 && (
            <div className="shrink-0 h-24 sm:h-28">
              <div className="h-full flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {filmstrip.map(t => (
                  <div key={t.key} className="h-full aspect-video shrink-0">
                    <VideoTile
                      stream={t.stream}
                      name={t.name}
                      isLocal={t.isLocal}
                      micOn={t.micOn}
                      camOn={t.camOn}
                      sharing={t.sharing}
                      isTeacher={t.isTeacher}
                      highlight={t.isTeacher}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Side panel */}
        {sidePanel && (
          <aside className="w-80 border-l border-border/60 bg-card/70 backdrop-blur-xl flex flex-col shrink-0 animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold flex items-center gap-2">
                {sidePanel === 'chat' ? <><MessageSquare className="w-4 h-4" /> چت کلاس</> : <><Users className="w-4 h-4" /> شرکت‌کنندگان</>}
              </h2>
              <button onClick={() => setSidePanel(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidePanel === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                  {room.chat.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">پیامی نیست</p>
                  ) : room.chat.map(m => (
                    <div key={m.id} className={cn("p-2 rounded-lg max-w-[85%] break-words", m.userId === joinData?.userId ? "bg-primary/15 mr-auto" : "bg-muted ml-auto")}>
                      <p className="text-xs text-muted-foreground mb-0.5">{m.name}</p>
                      <p className="text-sm">{m.text}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t border-border flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="پیام..."
                    className="text-right"
                  />
                  <Button size="icon" onClick={handleSendChat}><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10">
                  <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center font-bold text-primary">
                    {(joinData?.displayName || 'ش').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{joinData?.displayName} (شما)</p>
                    {isTeacher && <p className="text-xs text-primary">معلم</p>}
                  </div>
                  {room.handRaised && <Hand className="w-4 h-4 text-yellow-500" />}
                </div>
                {peerList.map(p => (
                  <div key={p.userId} className={cn("flex items-center gap-2 p-2 rounded-lg", p.handRaised ? "bg-yellow-500/15 border border-yellow-500/40" : "bg-muted/50") }>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold shrink-0">
                      {p.displayName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{p.displayName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {p.isTeacher && <span className="text-primary">معلم</span>}
                        {p.handRaised && <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1"><Hand className="w-3 h-3" /> دست بلند</span>}
                      </div>
                    </div>
                    {p.micOn ? <Mic className="w-4 h-4 text-muted-foreground" /> : <MicOff className="w-4 h-4 text-destructive" />}
                    {isTeacher && !p.isTeacher && (
                      <div className="flex flex-col gap-1">
                        <button
                          title="اجازه‌ی وایت‌برد"
                          onClick={() => room.setUserDrawPerm(p.userId, !room.drawPerms[p.userId])}
                          className={cn("p-1 rounded-md transition-all", room.drawPerms[p.userId] ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="اجازه‌ی اشتراک صفحه"
                          onClick={() => room.setUserSharePerm(p.userId, !room.sharePerms[p.userId])}
                          className={cn("p-1 rounded-md transition-all", room.sharePerms[p.userId] ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}
                        >
                          <MonitorUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Control bar */}
      <footer className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 border-t border-border bg-card shrink-0">
        <ControlButton
          active={room.micOn}
          onClick={room.toggleMic}
          icon={room.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          label={room.micOn ? "میکروفون" : "بی‌صدا"}
          danger={!room.micOn}
        />
        <ControlButton
          active={room.camOn}
          onClick={room.toggleCam}
          icon={room.camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          label={room.camOn ? "دوربین" : "خاموش"}
          danger={!room.camOn}
        />
        <ControlButton
          active={room.sharing}
          onClick={handleShareClick}
          icon={room.sharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          label={room.sharing ? "توقف اشتراک" : (room.canShare ? "اشتراک صفحه" : "اشتراک صفحه (نیاز به اجازه)")}
          disabled={!room.canShare && !room.sharing}
        />
        <ControlButton
          active={mainView === 'whiteboard'}
          onClick={handleBoardClick}
          icon={<Pencil className="w-5 h-5" />}
          label="وایت‌برد"
        />
        {!isTeacher && (
          <ControlButton
            active={room.handRaised}
            onClick={room.toggleHand}
            icon={<Hand className="w-5 h-5" />}
            label={room.handRaised ? "پایین آوردن دست" : "بالا بردن دست"}
          />
        )}
        <ControlButton
          active={sidePanel === 'chat'}
          onClick={() => setSidePanel(p => p === 'chat' ? null : 'chat')}
          icon={<MessageSquare className="w-5 h-5" />}
          label="چت"
        />
        <div className="relative">
          <ControlButton
            active={sidePanel === 'people'}
            onClick={() => setSidePanel(p => p === 'people' ? null : 'people')}
            icon={<Users className="w-5 h-5" />}
            label="افراد"
          />
          {raisedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {raisedCount}
            </span>
          )}
        </div>
        <div className="w-px h-8 bg-border mx-1" />
        {isTeacher && (
          <Button variant="outline" onClick={handleEndClass} className="gap-2">
            <Power className="w-4 h-4" /> پایان کلاس
          </Button>
        )}
        <Button variant="destructive" onClick={handleLeave} className="gap-2">
          <PhoneOff className="w-4 h-4" /> خروج
        </Button>
      </footer>
    </div>
  );
};

function ControlButton({ active, onClick, icon, label, danger, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-300",
        disabled && "opacity-40 cursor-not-allowed",
        danger ? "bg-destructive/15 text-destructive hover:bg-destructive/25" :
        active ? "bg-primary text-primary-foreground hover:bg-primary/90" :
        "bg-muted text-foreground hover:bg-muted/70"
      )}
    >
      {icon}
    </button>
  );
}

export default ClassRoom;