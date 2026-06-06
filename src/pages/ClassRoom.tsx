import { useEffect, useMemo, useRef, useState } from "react";
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
  MessageSquare, Pencil, Users, PhoneOff, X, Send, Loader2, Power, Hand,
  ClipboardCheck, Check, UserX
} from "lucide-react";

type SidePanel = 'chat' | 'people' | null;
type MainView = 'grid' | 'whiteboard';

interface Tile {
  key: string;
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  isTeacher: boolean;
  handRaised?: boolean;
  audioOnly?: boolean;
}

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
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, 'hazer' | 'ghayeb'>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onEnded = () => { toast.info('کلاس توسط معلم پایان یافت'); handleLeave(); };
    window.addEventListener('class-ended', onEnded);
    return () => window.removeEventListener('class-ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [room.chat]);

  // Load existing attendance for teacher when opening panel
  useEffect(() => {
    if (!isTeacher || !classId || sidePanel !== 'people') return;
    onlineClassApi.attendanceList(classId).then(({ data }) => {
      if (data?.attendance) {
        const map: Record<string, 'hazer' | 'ghayeb'> = {};
        data.attendance.forEach(a => { map[a.user_id] = a.status; });
        setAttendanceMarks(map);
      }
    });
  }, [isTeacher, classId, sidePanel]);

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
    if (!room.canShare) { toast.error('برای اشتراک صفحه باید معلم اجازه دهد'); return; }
    room.sharing ? room.stopScreenShare() : room.startScreenShare();
  };

  const handleBoardClick = () => setMainView(v => v === 'whiteboard' ? 'grid' : 'whiteboard');

  const startRollCall = () => {
    room.startRollCall();
    toast.info('درخواست حضور و غیاب ارسال شد. ۳۰ ثانیه فرصت پاسخ.');
    setTimeout(() => room.stopRollCall(), 30_000);
  };

  const markAttendance = async (userId: string, name: string, status: 'hazer' | 'ghayeb') => {
    if (!classId) return;
    setAttendanceMarks(prev => ({ ...prev, [userId]: status }));
    const { error } = await onlineClassApi.attendanceMark(classId, userId, name, status);
    if (error) {
      toast.error(error);
      setAttendanceMarks(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else {
      toast.success(status === 'hazer' ? 'حاضر ثبت شد' : 'غایب ثبت شد');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">در حال اتصال به کلاس...</p>
      </div>
    </div>
  );
  if (joinError) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border-2 border-border rounded-xl p-8 text-center space-y-4 animate-scale-in">
        <h1 className="text-xl font-bold">امکان ورود به کلاس نیست</h1>
        <p className="text-muted-foreground">{joinError}</p>
        <Button onClick={() => navigate(-1)}>بازگشت</Button>
      </div>
    </div>
  );
  if (room.mediaError) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border-2 border-border rounded-xl p-8 text-center space-y-4 animate-scale-in">
        <h1 className="text-xl font-bold">دسترسی به دوربین/میکروفون لازم است</h1>
        <p className="text-muted-foreground">{room.mediaError}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => window.location.reload()}>تلاش مجدد</Button>
          <Button variant="outline" onClick={handleLeave}>خروج</Button>
        </div>
      </div>
    </div>
  );

  const peerList = Object.values(room.peers);
  const totalCount = peerList.length + 1;
  const raisedCount = peerList.filter(p => p.handRaised).length + (room.handRaised ? 1 : 0);

  // Build tiles: each participant gets a camera tile; if sharing, also a screen tile.
  const tiles: Tile[] = [];
  // Self
  tiles.push({
    key: 'self-cam',
    stream: room.localStream,
    name: joinData?.displayName || 'شما',
    isLocal: true,
    micOn: room.micOn,
    camOn: room.camOn,
    sharing: false,
    isTeacher: !!isTeacher,
    handRaised: room.handRaised,
  });
  if (room.sharing && room.localScreenStream) {
    tiles.push({
      key: 'self-screen',
      stream: room.localScreenStream,
      name: (joinData?.displayName || 'شما') + ' — صفحه',
      isLocal: true,
      micOn: false,
      camOn: false,
      sharing: true,
      isTeacher: !!isTeacher,
    });
  }
  peerList.forEach(p => {
    tiles.push({
      key: `${p.userId}-cam`,
      stream: p.cameraStream,
      name: p.displayName,
      isLocal: false,
      micOn: p.micOn,
      camOn: p.camOn,
      sharing: false,
      isTeacher: p.isTeacher,
      handRaised: p.handRaised,
    });
    if (p.screenStream) {
      tiles.push({
        key: `${p.userId}-screen`,
        stream: p.screenStream,
        name: p.displayName + ' — صفحه',
        isLocal: false,
        micOn: false,
        camOn: false,
        sharing: true,
        isTeacher: p.isTeacher,
      });
    }
  });

  const sharer = tiles.find(t => t.sharing);
  const teacherTile = tiles.find(t => t.isTeacher && !t.sharing);
  const spotlight = sharer || teacherTile || tiles[0];
  const filmstrip = tiles.filter(t => t.key !== spotlight.key);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card/50 backdrop-blur-xl shrink-0 animate-fade-in">
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
            "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
            room.connected ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border/60"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", room.connected ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
            {room.connected ? "متصل" : "در حال اتصال"}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex min-h-0 bg-gradient-to-b from-background to-muted/30">
        <main className="flex-1 flex flex-col p-3 gap-3 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0">
            {mainView === 'whiteboard' ? (
              <Whiteboard
                strokes={room.strokes}
                onStroke={room.sendStroke}
                onClear={room.clearBoard}
                onUndo={isTeacher ? room.undoStroke : undefined}
                canDraw={room.canDraw}
              />
            ) : (
              <div key={spotlight.key} className="h-full">
                <VideoTile
                  stream={spotlight.stream}
                  name={spotlight.name}
                  isLocal={spotlight.isLocal}
                  micOn={spotlight.micOn}
                  camOn={spotlight.camOn}
                  sharing={spotlight.sharing}
                  isTeacher={spotlight.isTeacher}
                  highlight={spotlight.isTeacher || spotlight.sharing}
                  handRaised={spotlight.handRaised}
                  featured
                />
              </div>
            )}
          </div>
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
                      highlight={t.isTeacher || t.sharing}
                      handRaised={t.handRaised}
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
          <aside className="w-80 border-l border-border/60 bg-card/70 backdrop-blur-xl flex flex-col shrink-0 animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold flex items-center gap-2">
                {sidePanel === 'chat'
                  ? <><MessageSquare className="w-4 h-4 text-primary" /> چت کلاس</>
                  : <><Users className="w-4 h-4 text-primary" /> شرکت‌کنندگان</>}
              </h2>
              <button onClick={() => setSidePanel(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidePanel === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 scrollbar-hide">
                  {room.chat.length === 0 ? (
                    <div className="text-center py-10 animate-fade-in">
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">هنوز پیامی نیست</p>
                    </div>
                  ) : room.chat.map(m => {
                    const mine = m.userId === joinData?.userId;
                    return (
                      <div key={m.id} className={cn("flex items-end gap-2 animate-slide-up", mine ? "flex-row-reverse" : "")}>
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                          {m.name.charAt(0)}
                        </div>
                        <div className={cn(
                          "max-w-[75%] px-3 py-2 rounded-2xl shadow-sm break-words",
                          mine
                            ? "bg-primary text-primary-foreground rounded-bl-md"
                            : "bg-card border border-border rounded-br-md"
                        )}>
                          {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.name}</p>}
                          <p className="text-sm leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t border-border flex gap-2 bg-card/50">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="پیام خود را بنویسید..."
                    className="text-right rounded-full"
                  />
                  <Button size="icon" onClick={handleSendChat} className="rounded-full shrink-0 transition-transform hover:scale-105"><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {isTeacher && (
                  <div className="p-3 border-b border-border bg-muted/30">
                    <Button
                      onClick={startRollCall}
                      disabled={room.rollCallActive}
                      className="w-full gap-2 transition-all"
                      variant={room.rollCallActive ? "outline" : "default"}
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      {room.rollCallActive ? "در حال انتظار پاسخ..." : "حضور و غیاب"}
                    </Button>
                    {room.rollCallActive && (
                      <p className="text-[11px] text-muted-foreground mt-2 text-center animate-pulse">
                        پاسخ‌های دریافت‌شده: {Object.keys(room.rollCallResponses).length}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 scrollbar-hide">
                  <ParticipantRow
                    name={`${joinData?.displayName || 'شما'} (شما)`}
                    isTeacher={!!isTeacher}
                    micOn={room.micOn}
                    handRaised={room.handRaised}
                    self
                  />
                  {peerList.map(p => {
                    const responded = !!room.rollCallResponses[p.userId];
                    const mark = attendanceMarks[p.userId];
                    return (
                      <ParticipantRow
                        key={p.userId}
                        name={p.displayName}
                        isTeacher={p.isTeacher}
                        micOn={p.micOn}
                        handRaised={p.handRaised}
                        rollCallResponded={room.rollCallActive ? responded : undefined}
                        attendance={mark}
                        showTeacherControls={isTeacher && !p.isTeacher}
                        drawAllowed={!!room.drawPerms[p.userId]}
                        shareAllowed={!!room.sharePerms[p.userId]}
                        onToggleDraw={() => room.setUserDrawPerm(p.userId, !room.drawPerms[p.userId])}
                        onToggleShare={() => room.setUserSharePerm(p.userId, !room.sharePerms[p.userId])}
                        onMarkHazer={() => markAttendance(p.userId, p.displayName, 'hazer')}
                        onMarkGhayeb={() => markAttendance(p.userId, p.displayName, 'ghayeb')}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Roll-call modal for students */}
      {!isTeacher && room.rollCallRequest && (
        <RollCallModal
          onPresent={() => { room.respondRollCall(); toast.success('حضور شما ثبت شد'); }}
          onDismiss={room.dismissRollCallRequest}
        />
      )}

      {/* Control bar */}
      <footer className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 border-t border-border bg-card shrink-0 animate-slide-up">
        <ControlButton active={room.micOn} onClick={room.toggleMic} icon={room.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />} label={room.micOn ? "میکروفون" : "بی‌صدا"} danger={!room.micOn} />
        <ControlButton active={room.camOn} onClick={room.toggleCam} icon={room.camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />} label={room.camOn ? "دوربین" : "خاموش"} danger={!room.camOn} />
        <ControlButton active={room.sharing} onClick={handleShareClick} icon={room.sharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />} label={room.sharing ? "توقف اشتراک" : (room.canShare ? "اشتراک صفحه" : "اشتراک (نیاز اجازه)")} disabled={!room.canShare && !room.sharing} />
        <ControlButton active={mainView === 'whiteboard'} onClick={handleBoardClick} icon={<Pencil className="w-5 h-5" />} label="وایت‌برد" />
        {!isTeacher && (
          <ControlButton active={room.handRaised} onClick={room.toggleHand} icon={<Hand className="w-5 h-5" />} label={room.handRaised ? "پایین آوردن دست" : "بالا بردن دست"} />
        )}
        <ControlButton active={sidePanel === 'chat'} onClick={() => setSidePanel(p => p === 'chat' ? null : 'chat')} icon={<MessageSquare className="w-5 h-5" />} label="چت" />
        <div className="relative">
          <ControlButton active={sidePanel === 'people'} onClick={() => setSidePanel(p => p === 'people' ? null : 'people')} icon={<Users className="w-5 h-5" />} label="افراد" />
          {raisedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-scale-in">
              {raisedCount}
            </span>
          )}
        </div>
        <div className="w-px h-8 bg-border mx-1" />
        {isTeacher && (
          <Button variant="outline" onClick={handleEndClass} className="gap-2"><Power className="w-4 h-4" /> پایان کلاس</Button>
        )}
        <Button variant="destructive" onClick={handleLeave} className="gap-2"><PhoneOff className="w-4 h-4" /> خروج</Button>
      </footer>
    </div>
  );
};

function ParticipantRow({
  name, isTeacher, micOn, handRaised, self, rollCallResponded, attendance,
  showTeacherControls, drawAllowed, shareAllowed,
  onToggleDraw, onToggleShare, onMarkHazer, onMarkGhayeb,
}: {
  name: string; isTeacher: boolean; micOn: boolean; handRaised?: boolean; self?: boolean;
  rollCallResponded?: boolean;
  attendance?: 'hazer' | 'ghayeb';
  showTeacherControls?: boolean;
  drawAllowed?: boolean; shareAllowed?: boolean;
  onToggleDraw?: () => void; onToggleShare?: () => void;
  onMarkHazer?: () => void; onMarkGhayeb?: () => void;
}) {
  return (
    <div className={cn(
      "rounded-xl p-2.5 transition-all duration-300 animate-slide-up border",
      handRaised ? "bg-yellow-500/10 border-yellow-500/40"
      : self ? "bg-primary/10 border-primary/30"
      : "bg-card/50 border-border/40 hover:bg-card hover:border-border"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 relative",
          self ? "bg-primary/30 text-primary" : "bg-muted text-foreground"
        )}>
          {name.charAt(0)}
          {handRaised && <span className="absolute -top-1 -right-1 text-sm">✋</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {isTeacher && <span className="text-primary font-semibold">معلم</span>}
            {rollCallResponded === true && <span className="text-primary flex items-center gap-0.5"><Check className="w-3 h-3" /> پاسخ داد</span>}
            {rollCallResponded === false && <span className="text-yellow-600 dark:text-yellow-400">بدون پاسخ</span>}
            {attendance === 'hazer' && <span className="px-1.5 rounded-full bg-primary/15 text-primary">حاضر</span>}
            {attendance === 'ghayeb' && <span className="px-1.5 rounded-full bg-destructive/15 text-destructive">غایب</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {micOn ? <Mic className="w-4 h-4 text-muted-foreground" /> : <MicOff className="w-4 h-4 text-destructive" />}
        </div>
      </div>
      {showTeacherControls && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
          <button onClick={onMarkHazer} className={cn(
            "flex-1 text-[11px] px-2 py-1 rounded-md font-medium transition-all flex items-center justify-center gap-1",
            attendance === 'hazer' ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-primary/20 hover:text-primary"
          )}><Check className="w-3 h-3" /> حاضر</button>
          <button onClick={onMarkGhayeb} className={cn(
            "flex-1 text-[11px] px-2 py-1 rounded-md font-medium transition-all flex items-center justify-center gap-1",
            attendance === 'ghayeb' ? "bg-destructive text-destructive-foreground" : "bg-muted hover:bg-destructive/20 hover:text-destructive"
          )}><UserX className="w-3 h-3" /> غایب</button>
          <div className="w-px h-5 bg-border" />
          <button title="اجازه‌ی وایت‌برد" onClick={onToggleDraw} className={cn("p-1 rounded-md transition-all", drawAllowed ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button title="اجازه‌ی اشتراک صفحه" onClick={onToggleShare} className={cn("p-1 rounded-md transition-all", shareAllowed ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>
            <MonitorUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function RollCallModal({ onPresent, onDismiss }: { onPresent: () => void; onDismiss: () => void }) {
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const i = setInterval(() => setSeconds(s => { if (s <= 1) { clearInterval(i); onDismiss(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(i);
  }, [onDismiss]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-2xl max-w-sm w-[90%] text-center animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 mx-auto flex items-center justify-center mb-4">
          <ClipboardCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">حضور و غیاب</h2>
        <p className="text-muted-foreground mb-1">معلم در حال بررسی حضور است</p>
        <p className="text-sm text-muted-foreground mb-6">آیا حاضر هستید؟</p>
        <div className="w-full bg-muted rounded-full h-1.5 mb-5 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(seconds / 30) * 100}%` }} />
        </div>
        <Button onClick={onPresent} size="lg" className="w-full gap-2 text-base">
          <Check className="w-5 h-5" /> حاضرم ({seconds})
        </Button>
      </div>
    </div>
  );
}

function ControlButton({ active, onClick, icon, label, danger, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
        disabled && "opacity-40 cursor-not-allowed hover:scale-100",
        danger ? "bg-destructive/15 text-destructive hover:bg-destructive/25" :
        active ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30" :
        "bg-muted text-foreground hover:bg-muted/70"
      )}
    >
      {icon}
    </button>
  );
}

export default ClassRoom;