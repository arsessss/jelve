import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { customAuth, AuthSession } from "@/lib/auth";
import { onlineClassApi, JoinResult } from "@/lib/online-class";
import { useClassRoom } from "@/hooks/useClassRoom";
import { VideoTile } from "@/components/classroom/VideoTile";
import { Whiteboard } from "@/components/classroom/Whiteboard";
import { ConfirmDialog, useConfirm } from "@/components/ConfirmDialog";
import { classSounds, getClassSoundsEnabled, setClassSoundsEnabled } from "@/lib/class-sounds";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, MonitorX,
  MessageSquare, Pencil, Users, PhoneOff, X, Send, Loader2, Power, Hand,
  ClipboardCheck, Check, BarChart3, Smile, Trash2, Edit2, MoreHorizontal, Plus,
  Settings, Lock, Unlock, MicOff as MicOffIcon, VideoOff as VideoOffIcon, Eraser, Sun, Moon,
  UserX, Volume2, VolumeX, Trophy
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
}

interface RosterEntry { user_id: string; full_name: string }

const REACTIONS = ['👍', '❤️', '😂', '😮', '🎉'];

type Lang = 'fa' | 'en';
const T = {
  fa: {
    live: 'زنده', connecting: 'در حال اتصال', connected: 'متصل',
    chat: 'چت کلاس', participants: 'شرکت‌کنندگان', attendance: 'حضور و غیاب',
    rollCall: 'حضور و غیاب', endClass: 'پایان کلاس', leave: 'خروج',
    mic: 'میکروفون', muted: 'بی‌صدا', cam: 'دوربین', camOff: 'خاموش',
    share: 'اشتراک صفحه', shareStop: 'توقف اشتراک', shareNeedPerm: 'اشتراک (نیاز اجازه)',
    board: 'وایت‌برد', handUp: 'بالا بردن دست', handDown: 'پایین آوردن دست',
    poll: 'نظرسنجی', people: 'افراد', settings: 'تنظیمات', sounds: 'صداها',
    sendPlaceholder: 'پیام خود را بنویسید...', chatLocked: 'چت توسط معلم قفل شده است',
    noChat: 'هنوز پیامی نیست', edit: 'ویرایش', delete: 'حذف', react: 'واکنش',
    save: 'ذخیره', cancel: 'لغو', deleted: 'پیام حذف شد',
    everyone: 'همه', muteAll: 'بی‌صدا کردن همه', camOffAll: 'خاموش کردن دوربین همه',
    kickUser: 'اخراج', muteUser: 'بی‌صدا کردن', camOffUser: 'خاموش کردن دوربین',
    teacher: 'معلم', hazer: 'حاضر', ghayeb: 'غایب', notInClass: 'در کلاس نیست', you: 'شما',
    confirmEnd: 'کلاس برای همه پایان یابد؟',
    confirmClearChat: 'همه پیام‌ها پاک شود؟',
    confirmDeleteMsg: 'این پیام حذف شود؟',
    confirmMuteAll: 'میکروفون همه دانش‌آموزان خاموش شود؟',
    confirmCamOffAll: 'دوربین همه دانش‌آموزان خاموش شود؟',
    confirmKick: 'این دانش‌آموز از کلاس اخراج شود؟',
    rollCallTitle: 'حضور و غیاب', rollCallDesc: 'معلم در حال بررسی حضور است',
    rollCallWarn: 'اگر تا پایان زمان حاضر را نزنید، غایب ثبت شده و از کلاس خارج می‌شوید.',
    present: 'حاضرم', presentDone: 'ثبت شد ✓',
    pollResults: 'نتایج', pollWinner: 'گزینه برتر', correctAnswer: 'پاسخ صحیح',
    pollRevealing: 'نمایش نتایج', pollVotes: 'رأی', voters: 'رأی‌دهندگان',
    createPoll: 'ایجاد نظرسنجی', question: 'سوال', options: 'گزینه‌ها',
    addOption: 'افزودن گزینه', hideResults: 'نتایج تا پایان رأی‌گیری از دانش‌آموزان مخفی باشد',
    timeSec: 'زمان (ثانیه) — 0 = بدون زمان', start: 'شروع نظرسنجی',
    correctOptional: 'پاسخ صحیح (اختیاری — برای حالت کاهوت)', noCorrect: 'بدون پاسخ صحیح',
    theme: 'حالت نمایش', light: 'روشن', dark: 'تیره',
    fontSize: 'اندازه‌ی متن', language: 'زبان', persian: 'فارسی', english: 'انگلیسی',
    soundsOn: 'صداهای اعلان', soundsHelp: 'صدای ورود/خروج، چت، دست بالا، نظرسنجی و...',
    waiting: 'در حال انتظار...', received: 'پاسخ‌های دریافت‌شده',
    rollCallNote: 'پس از پایان زمان، غایبین به‌صورت خودکار از کلاس خارج می‌شوند.',
  },
  en: {
    live: 'LIVE', connecting: 'Connecting', connected: 'Connected',
    chat: 'Class chat', participants: 'Participants', attendance: 'Attendance',
    rollCall: 'Roll-call', endClass: 'End class', leave: 'Leave',
    mic: 'Mic', muted: 'Muted', cam: 'Camera', camOff: 'Off',
    share: 'Share screen', shareStop: 'Stop sharing', shareNeedPerm: 'Share (needs permission)',
    board: 'Whiteboard', handUp: 'Raise hand', handDown: 'Lower hand',
    poll: 'Poll', people: 'People', settings: 'Settings', sounds: 'Sounds',
    sendPlaceholder: 'Type your message...', chatLocked: 'Chat is locked by the teacher',
    noChat: 'No messages yet', edit: 'Edit', delete: 'Delete', react: 'React',
    save: 'Save', cancel: 'Cancel', deleted: 'Message deleted',
    everyone: 'Everyone', muteAll: 'Mute everyone', camOffAll: "Turn off everyone's camera",
    kickUser: 'Kick', muteUser: 'Mute', camOffUser: 'Turn off camera',
    teacher: 'Teacher', hazer: 'Present', ghayeb: 'Absent', notInClass: 'Not joined', you: 'you',
    confirmEnd: 'End class for everyone?',
    confirmClearChat: 'Clear all chat messages?',
    confirmDeleteMsg: 'Delete this message?',
    confirmMuteAll: "Mute all students' microphones?",
    confirmCamOffAll: "Turn off all students' cameras?",
    confirmKick: 'Kick this student from class?',
    rollCallTitle: 'Roll-call', rollCallDesc: 'Teacher is checking attendance',
    rollCallWarn: 'If you do not respond before time runs out, you will be marked absent and removed.',
    present: "I'm here", presentDone: 'Submitted ✓',
    pollResults: 'Results', pollWinner: 'Top choice', correctAnswer: 'Correct answer',
    pollRevealing: 'Revealing results', pollVotes: 'votes', voters: 'Voters',
    createPoll: 'Create poll', question: 'Question', options: 'Options',
    addOption: 'Add option', hideResults: 'Hide results from students until end',
    timeSec: 'Time (seconds) — 0 = no timer', start: 'Start poll',
    correctOptional: 'Correct answer (optional — Kahoot mode)', noCorrect: 'No correct answer',
    theme: 'Theme', light: 'Light', dark: 'Dark',
    fontSize: 'Font size', language: 'Language', persian: 'فارسی', english: 'English',
    soundsOn: 'Notification sounds', soundsHelp: 'Join/leave, chat, hand raise, polls, etc.',
    waiting: 'Waiting...', received: 'Responses received',
    rollCallNote: 'After time ends, absent students are auto-removed.',
  },
} as const;

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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, 'hazer' | 'ghayeb'>>({});
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rollCallSecondsLeft, setRollCallSecondsLeft] = useState(0);
  const [pollOpen, setPollOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    const v = Number(localStorage.getItem('class-font-size') || '16');
    return Number.isFinite(v) && v >= 12 && v <= 22 ? v : 16;
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() =>
    (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  );
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('class-lang') as Lang) || 'fa');
  const [soundsEnabled, setSoundsEnabledState] = useState<boolean>(() => getClassSoundsEnabled());
  const t = T[lang];
  const confirm = useConfirm();
  // Side panel close animation
  const [exitingPanel, setExitingPanel] = useState(false);
  const closeSidePanel = () => {
    if (!sidePanel) return;
    setExitingPanel(true);
    setTimeout(() => { setSidePanel(null); setExitingPanel(false); }, 200);
  };
  const openSidePanel = (p: SidePanel) => {
    if (sidePanel === p) { closeSidePanel(); return; }
    setSidePanel(p);
  };
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

  // Force board open broadcast → flip to whiteboard view
  useEffect(() => {
    if (room.forceBoardOpen > 0) setMainView('whiteboard');
  }, [room.forceBoardOpen]);

  // Apply font size + theme
  useEffect(() => {
    localStorage.setItem('class-font-size', String(fontSize));
    document.documentElement.style.setProperty('--class-font-scale', String(fontSize / 16));
  }, [fontSize]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);
  useEffect(() => { localStorage.setItem('class-lang', lang); }, [lang]);
  useEffect(() => { setClassSoundsEnabled(soundsEnabled); }, [soundsEnabled]);

  // Load roster + saved attendance when teacher opens panel
  useEffect(() => {
    if (!isTeacher || !classId || sidePanel !== 'people') return;
    onlineClassApi.roster(classId).then(({ data }) => {
      if (data?.roster) setRoster(data.roster);
    });
    onlineClassApi.attendanceList(classId).then(({ data }) => {
      if (data?.attendance) {
        const map: Record<string, 'hazer' | 'ghayeb'> = {};
        data.attendance.forEach(a => { map[a.user_id] = a.status; });
        setAttendanceMarks(map);
      }
    });
  }, [isTeacher, classId, sidePanel]);

  // Kicked students auto-leave
  useEffect(() => {
    if (room.kicked) {
      toast.error('شما به دلیل عدم پاسخ به حضور و غیاب از کلاس خارج شدید');
      handleLeave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.kicked]);

  // Roll-call countdown for teacher + auto-finalize
  useEffect(() => {
    if (!isTeacher || !room.rollCallActive) { setRollCallSecondsLeft(0); return; }
    setRollCallSecondsLeft(30);
    const t = setInterval(() => setRollCallSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isTeacher, room.rollCallActive]);

  const handleLeave = async () => {
    room.cleanup();
    if (classId) await onlineClassApi.leave(classId);
    if (isTeacher) navigate('/admin'); else navigate('/student');
  };

  const handleEndClass = async () => {
    if (!classId) return;
    if (!(await confirm(t.confirmEnd))) return;
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

  const handleBoardClick = () => {
    setMainView(v => {
      const next = v === 'whiteboard' ? 'grid' : 'whiteboard';
      // When teacher opens the board, force everyone else to open it too
      if (isTeacher && next === 'whiteboard') room.openBoardForAll();
      return next;
    });
  };

  // Start roll-call: load roster, broadcast, start timer; finalize at end
  const startRollCall = async () => {
    if (!classId) return;
    let rosterList = roster;
    if (!rosterList.length) {
      const { data } = await onlineClassApi.roster(classId);
      if (data?.roster) { rosterList = data.roster; setRoster(data.roster); }
    }
    room.startRollCall();
    toast.info('درخواست حضور و غیاب ارسال شد. ۳۰ ثانیه فرصت پاسخ.');
    setTimeout(() => finalizeRollCall(rosterList), 30_000);
  };

  const finalizeRollCall = async (rosterList: RosterEntry[]) => {
    if (!classId) return;
    room.stopRollCall();
    // CRITICAL: read fresh responses from the hook's ref (not stale closure)
    const responses = room.getRollCallResponses();
    const newMarks: Record<string, 'hazer' | 'ghayeb'> = { ...attendanceMarks };
    const ghayebIds: string[] = [];
    const myId = joinData?.userId;
    for (const r of rosterList) {
      // Teacher (self) is always treated as present, never kicked.
      const isMe = myId === r.user_id;
      const status: 'hazer' | 'ghayeb' = (isMe || responses[r.user_id]) ? 'hazer' : 'ghayeb';
      newMarks[r.user_id] = status;
      if (status === 'ghayeb' && !isMe) ghayebIds.push(r.user_id);
      onlineClassApi.attendanceMark(classId, r.user_id, r.full_name, status);
    }
    setAttendanceMarks(newMarks);
    // Kick ghayeb students who are connected
    const connectedGhayeb = ghayebIds.filter(id => room.peers[id]);
    if (connectedGhayeb.length) room.kickUsers(connectedGhayeb);
    toast.success(`حضور و غیاب ثبت شد. حاضرین: ${rosterList.length - ghayebIds.length}، غایبین: ${ghayebIds.length}`);
  };

  const markAttendance = async (userId: string, name: string, status: 'hazer' | 'ghayeb') => {
    if (!classId) return;
    setAttendanceMarks(prev => ({ ...prev, [userId]: status }));
    const { error } = await onlineClassApi.attendanceMark(classId, userId, name, status);
    if (error) {
      toast.error(error);
      setAttendanceMarks(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } else if (status === 'ghayeb' && room.peers[userId]) {
      room.kickUsers([userId]);
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

  const tiles: Tile[] = [];
  tiles.push({
    key: 'self-cam', stream: room.localStream, name: joinData?.displayName || 'شما', isLocal: true,
    micOn: room.micOn, camOn: room.camOn, sharing: false, isTeacher: !!isTeacher, handRaised: room.handRaised,
  });
  if (room.sharing && room.localScreenStream) {
    tiles.push({ key: 'self-screen', stream: room.localScreenStream, name: (joinData?.displayName || 'شما') + ' — صفحه', isLocal: true, micOn: false, camOn: false, sharing: true, isTeacher: !!isTeacher });
  }
  peerList.forEach(p => {
    tiles.push({ key: `${p.userId}-cam`, stream: p.cameraStream, name: p.displayName, isLocal: false, micOn: p.micOn, camOn: p.camOn, sharing: false, isTeacher: p.isTeacher, handRaised: p.handRaised });
    if (p.screenStream) {
      tiles.push({ key: `${p.userId}-screen`, stream: p.screenStream, name: p.displayName + ' — صفحه', isLocal: false, micOn: false, camOn: false, sharing: true, isTeacher: p.isTeacher });
    }
  });

  const sharer = tiles.find(t => t.sharing);
  const teacherTile = tiles.find(t => t.isTeacher && !t.sharing);
  const spotlight = sharer || teacherTile || tiles[0];
  const filmstrip = tiles.filter(t => t.key !== spotlight.key);

  // Build attendance list for the people panel
  // For teacher: roster + currently-online (online users not in roster)
  // For student: just the live participants
  const peopleEntries = (() => {
    if (!isTeacher) {
      return [{ user_id: joinData?.userId || 'me', full_name: joinData?.displayName || 'شما', isMe: true, isOnline: true, isTeacher: true, handRaised: room.handRaised, micOn: room.micOn },
      ...peerList.map(p => ({ user_id: p.userId, full_name: p.displayName, isMe: false, isOnline: true, isTeacher: p.isTeacher, handRaised: !!p.handRaised, micOn: p.micOn }))];
    }
    const onlineMap: Record<string, { isTeacher: boolean; handRaised: boolean; micOn: boolean }> = {};
    onlineMap[joinData!.userId] = { isTeacher: true, handRaised: room.handRaised, micOn: room.micOn };
    peerList.forEach(p => { onlineMap[p.userId] = { isTeacher: p.isTeacher, handRaised: !!p.handRaised, micOn: p.micOn }; });
    const rosterMap = new Map(roster.map(r => [r.user_id, r]));
    const rows: Array<{ user_id: string; full_name: string; isOnline: boolean; isTeacher: boolean; handRaised: boolean; micOn: boolean; isMe?: boolean }> = [];
    // include teacher self
    rows.push({ user_id: joinData!.userId, full_name: joinData!.displayName + ' (شما)', isOnline: true, isTeacher: true, handRaised: room.handRaised, micOn: room.micOn, isMe: true });
    // include roster
    for (const r of roster) {
      const meta = onlineMap[r.user_id];
      rows.push({ user_id: r.user_id, full_name: r.full_name, isOnline: !!meta, isTeacher: false, handRaised: meta?.handRaised || false, micOn: meta?.micOn || false });
    }
    // include online users not in roster (guests / other teachers)
    for (const p of peerList) {
      if (!rosterMap.has(p.userId)) {
        rows.push({ user_id: p.userId, full_name: p.displayName, isOnline: true, isTeacher: p.isTeacher, handRaised: !!p.handRaised, micOn: p.micOn });
      }
    }
    return rows;
  })();

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
          {mainView === 'whiteboard' ? (
            // Split layout: whiteboard (70%) + video column (30%) — so you can still see participants
            <div className="flex-1 flex gap-3 min-h-0 animate-fade-in">
              <div className="flex-1 min-w-0">
                <Whiteboard
                  strokes={room.strokes}
                  onStroke={room.sendStroke}
                  onClear={room.clearBoard}
                  onUndo={isTeacher ? room.undoStroke : undefined}
                  canDraw={room.canDraw}
                />
              </div>
              <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto scrollbar-hide">
                {tiles.map(t => (
                  <div key={t.key} className="shrink-0 animate-scale-in">
                    <VideoTile
                      stream={t.stream} name={t.name} isLocal={t.isLocal}
                      micOn={t.micOn} camOn={t.camOn} sharing={t.sharing}
                      isTeacher={t.isTeacher} highlight={t.isTeacher || t.sharing}
                      handRaised={t.handRaised}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0">
                <div key={spotlight.key} className="h-full animate-scale-in">
                  <VideoTile
                    stream={spotlight.stream} name={spotlight.name} isLocal={spotlight.isLocal}
                    micOn={spotlight.micOn} camOn={spotlight.camOn} sharing={spotlight.sharing}
                    isTeacher={spotlight.isTeacher} highlight={spotlight.isTeacher || spotlight.sharing}
                    handRaised={spotlight.handRaised} featured
                  />
                </div>
              </div>
              {filmstrip.length > 0 && (
                <div className="shrink-0 h-24 sm:h-28 animate-slide-up">
                  <div className="h-full flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filmstrip.map(t => (
                      <div key={t.key} className="h-full aspect-video shrink-0 animate-scale-in">
                        <VideoTile
                          stream={t.stream} name={t.name} isLocal={t.isLocal}
                          micOn={t.micOn} camOn={t.camOn} sharing={t.sharing}
                          isTeacher={t.isTeacher} highlight={t.isTeacher || t.sharing}
                          handRaised={t.handRaised} compact
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Side panel */}
        {sidePanel && (
          <aside className="w-[26rem] max-w-[90vw] border-l border-border/60 bg-card/70 backdrop-blur-xl flex flex-col shrink-0 animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold flex items-center gap-2">
                {sidePanel === 'chat'
                  ? <><MessageSquare className="w-4 h-4 text-primary" /> چت کلاس</>
                  : <><Users className="w-4 h-4 text-primary" /> {isTeacher ? 'حضور و غیاب' : 'شرکت‌کنندگان'}</>}
              </h2>
              <div className="flex items-center gap-1">
                {sidePanel === 'chat' && isTeacher && (
                  <>
                    <button onClick={room.toggleChatLock} title={room.chatLocked ? "باز کردن چت" : "قفل چت"}
                      className={cn("p-1.5 rounded-md transition-colors", room.chatLocked ? "bg-destructive/20 text-destructive" : "hover:bg-muted text-muted-foreground")}>
                      {room.chatLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button onClick={async () => { if (await confirm(t.confirmClearChat)) room.clearChat(); }} title="پاک کردن چت"
                      className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors">
                      <Eraser className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button onClick={() => setSidePanel(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {sidePanel === 'chat' ? (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 scrollbar-hide" dir="ltr">
                  {room.chat.length === 0 ? (
                    <div className="text-center py-10 animate-fade-in">
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground" dir="rtl">هنوز پیامی نیست</p>
                    </div>
                  ) : room.chat.map(m => {
                    const mine = m.userId === joinData?.userId;
                    const isEditing = editingMsgId === m.id;
                    return (
                      <div key={m.id} dir="rtl" className={cn("flex w-full animate-slide-up", mine ? "justify-start" : "justify-end")}>
                        <div className={cn("flex items-end gap-2 max-w-[85%]", mine ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0", mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                            {m.name.charAt(0)}
                          </div>
                          <div className="group/msg relative">
                            <div className={cn(
                              "px-3 py-2 rounded-2xl shadow-sm break-words",
                              mine
                                ? "bg-primary text-primary-foreground rounded-bl-md"
                                : "bg-card border border-border rounded-br-md"
                            )}>
                              {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.name}</p>}
                              {m.deleted ? (
                                <p className="text-sm italic opacity-60">پیام حذف شد</p>
                              ) : isEditing ? (
                                <div className="flex flex-col gap-1.5 min-w-[180px]">
                                  <Input value={editingText} onChange={e => setEditingText(e.target.value)} className="h-7 text-sm bg-background text-foreground" autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') { room.editChat(m.id, editingText.trim()); setEditingMsgId(null); } if (e.key === 'Escape') setEditingMsgId(null); }} />
                                  <div className="flex gap-1.5">
                                    <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => { room.editChat(m.id, editingText.trim()); setEditingMsgId(null); }}>ذخیره</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => setEditingMsgId(null)}>لغو</Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}{m.editedAt && <span className="text-[10px] opacity-60 mr-1">(ویرایش)</span>}</p>
                              )}
                            </div>
                            {/* Reactions */}
                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                              <div className={cn("flex gap-1 mt-1", mine ? "justify-start" : "justify-end")}>
                                {Object.entries(m.reactions).map(([emoji, users]) => (
                                  <button key={emoji} onClick={() => room.reactChat(m.id, emoji)}
                                    className={cn("text-xs px-1.5 py-0.5 rounded-full border transition-all animate-scale-in",
                                      users.includes(joinData?.userId || '') ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border")}>
                                    {emoji} {users.length}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Hover action bar */}
                            {!m.deleted && !isEditing && (
                              <div className={cn("absolute -top-3 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 bg-card border border-border rounded-full shadow-md p-0.5 z-10",
                                mine ? "right-0" : "left-0")}>
                                <button onClick={() => setReactPickerFor(p => p === m.id ? null : m.id)} className="p-1 hover:bg-muted rounded-full" title="واکنش"><Smile className="w-3.5 h-3.5" /></button>
                                {mine && <>
                                  <button onClick={() => { setEditingMsgId(m.id); setEditingText(m.text); }} className="p-1 hover:bg-muted rounded-full" title="ویرایش"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { if (confirm('این پیام حذف شود؟')) room.deleteChat(m.id); }} className="p-1 hover:bg-destructive/15 text-destructive rounded-full" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>}
                              </div>
                            )}
                            {reactPickerFor === m.id && (
                              <div className={cn("absolute -top-9 flex gap-0.5 bg-card border border-border rounded-full shadow-lg p-1 z-20 animate-scale-in",
                                mine ? "right-0" : "left-0")}>
                                {REACTIONS.map(em => (
                                  <button key={em} onClick={() => { room.reactChat(m.id, em); setReactPickerFor(null); }} className="hover:scale-125 transition-transform text-base px-0.5">{em}</button>
                                ))}
                              </div>
                            )}
                          </div>
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
                    placeholder={room.chatLocked && !isTeacher ? "چت توسط معلم قفل شده است" : "پیام خود را بنویسید..."}
                    disabled={room.chatLocked && !isTeacher}
                    className="text-right rounded-full"
                  />
                  <Button size="icon" onClick={handleSendChat} disabled={room.chatLocked && !isTeacher} className="rounded-full shrink-0 transition-transform hover:scale-105"><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                {isTeacher && (
                  <div className="p-3 border-b border-border bg-muted/30 space-y-2">
                    <Button
                      onClick={startRollCall}
                      disabled={room.rollCallActive}
                      className="w-full gap-2 transition-all"
                      variant={room.rollCallActive ? "outline" : "default"}
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      {room.rollCallActive ? `در حال انتظار... (${rollCallSecondsLeft})` : "حضور و غیاب"}
                    </Button>
                    {room.rollCallActive && (
                      <p className="text-[11px] text-muted-foreground text-center animate-pulse">
                        پاسخ‌های دریافت‌شده: {Object.keys(room.rollCallResponses).length}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground text-center">
                      پس از پایان زمان، غایبین به‌صورت خودکار از کلاس خارج می‌شوند.
                    </p>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 scrollbar-hide">
                  {peopleEntries.map(p => (
                    <ParticipantRow
                      key={p.user_id}
                      name={p.full_name}
                      isTeacher={p.isTeacher}
                      micOn={p.micOn}
                      handRaised={p.handRaised}
                      self={!!p.isMe}
                      isOnline={p.isOnline}
                      attendance={attendanceMarks[p.user_id]}
                      showTeacherControls={isTeacher && !p.isMe && !p.isTeacher}
                      drawAllowed={!!room.drawPerms[p.user_id]}
                      shareAllowed={!!room.sharePerms[p.user_id]}
                      onToggleDraw={() => room.setUserDrawPerm(p.user_id, !room.drawPerms[p.user_id])}
                      onToggleShare={() => room.setUserSharePerm(p.user_id, !room.sharePerms[p.user_id])}
                      onMarkHazer={() => markAttendance(p.user_id, p.full_name, 'hazer')}
                      onMarkGhayeb={() => markAttendance(p.user_id, p.full_name, 'ghayeb')}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Roll-call modal for students — single Hazer button */}
      {!isTeacher && room.rollCallRequest && (
        <RollCallModal
          onPresent={() => { room.respondRollCall(); toast.success('حضور شما ثبت شد'); }}
        />
      )}

      {/* Poll overlay */}
      {room.currentPoll && (
        <PollCard
          poll={room.currentPoll}
          votes={room.pollVotes}
          myVote={room.myVote}
          isTeacher={!!isTeacher}
          totalParticipants={totalCount}
          peerList={peerList}
          myName={joinData?.displayName || 'شما'}
          myUserId={joinData?.userId || ''}
          onVote={room.votePoll}
          onEnd={room.endPoll}
        />
      )}

      {/* Poll create dialog */}
      <PollCreateDialog open={pollOpen} onOpenChange={setPollOpen} onCreate={(q, opts, hidden, duration) => { room.startPoll(q, opts, hidden, duration); setPollOpen(false); }} />

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تنظیمات کلاس</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-2 block">حالت نمایش</label>
              <div className="flex gap-2">
                <Button variant={themeMode === 'light' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setThemeMode('light')}><Sun className="w-4 h-4" /> روشن</Button>
                <Button variant={themeMode === 'dark' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setThemeMode('dark')}><Moon className="w-4 h-4" /> تیره</Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block">اندازه‌ی متن: {fontSize}px</label>
              <input type="range" min={12} max={22} step={1} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block">زبان</label>
              <p className="text-xs text-muted-foreground">فعلاً فقط فارسی پشتیبانی می‌شود.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Control bar */}
      <footer className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 border-t border-border bg-card shrink-0 animate-slide-up">
        <ControlButton active={room.micOn} onClick={room.toggleMic} icon={room.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />} label={room.micOn ? "میکروفون" : "بی‌صدا"} danger={!room.micOn} />
        <ControlButton active={room.camOn} onClick={room.toggleCam} icon={room.camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />} label={room.camOn ? "دوربین" : "خاموش"} danger={!room.camOn} />
        <ControlButton active={room.sharing} onClick={handleShareClick} icon={room.sharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />} label={room.sharing ? "توقف اشتراک" : (room.canShare ? "اشتراک صفحه" : "اشتراک (نیاز اجازه)")} disabled={!room.canShare && !room.sharing} />
        <ControlButton active={mainView === 'whiteboard'} onClick={handleBoardClick} icon={<Pencil className="w-5 h-5" />} label="وایت‌برد" />
        <ControlButton active={room.handRaised} onClick={room.toggleHand} icon={<Hand className="w-5 h-5" />} label={room.handRaised ? "پایین آوردن دست" : "بالا بردن دست"} />
        {isTeacher && (
          <ControlButton active={!!room.currentPoll} onClick={() => setPollOpen(true)} icon={<BarChart3 className="w-5 h-5" />} label="نظرسنجی" disabled={!!room.currentPoll} />
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
        <ControlButton active={false} onClick={() => setSettingsOpen(true)} icon={<Settings className="w-5 h-5" />} label="تنظیمات" />
        {isTeacher && (
          <>
            <div className="w-px h-8 bg-border mx-1" />
            <ControlButton active={false} onClick={() => { if (confirm('میکروفون همه دانش‌آموزان خاموش شود؟')) room.forceMuteAll(); }} icon={<MicOffIcon className="w-5 h-5" />} label="بی‌صدا کردن همه" danger />
            <ControlButton active={false} onClick={() => { if (confirm('دوربین همه دانش‌آموزان خاموش شود؟')) room.forceCamOffAll(); }} icon={<VideoOffIcon className="w-5 h-5" />} label="خاموش کردن دوربین همه" danger />
          </>
        )}
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
  name, isTeacher, micOn, handRaised, self, isOnline = true, attendance,
  showTeacherControls, drawAllowed, shareAllowed,
  onToggleDraw, onToggleShare, onMarkHazer, onMarkGhayeb,
}: {
  name: string; isTeacher: boolean; micOn: boolean; handRaised?: boolean; self?: boolean;
  isOnline?: boolean;
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
      : !isOnline ? "bg-muted/30 border-border/30 opacity-80"
      : "bg-card/50 border-border/40 hover:bg-card hover:border-border"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 relative",
          self ? "bg-primary/30 text-primary" : !isOnline ? "bg-muted text-muted-foreground" : "bg-muted text-foreground"
        )}>
          {name.charAt(0)}
          {handRaised && <span className="absolute -top-1 -right-1 text-sm">✋</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate text-sm", !isOnline && "text-muted-foreground")}>{name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
            {isTeacher && <span className="text-primary font-semibold">معلم</span>}
            {attendance === 'hazer' && <span className="px-1.5 rounded-full bg-primary/15 text-primary font-semibold">حاضر</span>}
            {attendance === 'ghayeb' && <span className="px-1.5 rounded-full bg-destructive/15 text-destructive font-semibold">غایب</span>}
            {!isOnline && !attendance && <span className="text-muted-foreground">در کلاس نیست</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isOnline && (micOn ? <Mic className="w-4 h-4 text-muted-foreground" /> : <MicOff className="w-4 h-4 text-destructive" />)}
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
          )}>غایب</button>
          {isOnline && <>
            <div className="w-px h-5 bg-border" />
            <button title="اجازه‌ی وایت‌برد" onClick={onToggleDraw} className={cn("p-1 rounded-md transition-all", drawAllowed ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button title="اجازه‌ی اشتراک صفحه" onClick={onToggleShare} className={cn("p-1 rounded-md transition-all", shareAllowed ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>
              <MonitorUp className="w-3.5 h-3.5" />
            </button>
          </>}
        </div>
      )}
    </div>
  );
}

function RollCallModal({ onPresent }: { onPresent: () => void }) {
  const [seconds, setSeconds] = useState(30);
  const [responded, setResponded] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-2xl max-w-sm w-[90%] text-center animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 mx-auto flex items-center justify-center mb-4">
          <ClipboardCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">حضور و غیاب</h2>
        <p className="text-muted-foreground mb-1">معلم در حال بررسی حضور است</p>
        <p className="text-sm text-destructive mb-6">اگر تا پایان زمان حاضر را نزنید، غایب ثبت شده و از کلاس خارج می‌شوید.</p>
        <div className="w-full bg-muted rounded-full h-1.5 mb-5 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(seconds / 30) * 100}%` }} />
        </div>
        <Button onClick={() => { setResponded(true); onPresent(); }} size="lg" className="w-full gap-2 text-base h-14" disabled={responded}>
          <Check className="w-5 h-5" /> {responded ? 'ثبت شد ✓' : `حاضرم (${seconds})`}
        </Button>
      </div>
    </div>
  );
}

function PollCard({ poll, votes, myVote, isTeacher, totalParticipants, peerList, myName, myUserId, onVote, onEnd }: {
  poll: { id: string; question: string; options: string[]; hidden: boolean; endsAt?: number; duration?: number };
  votes: Record<string, number>;
  myVote: number | null;
  isTeacher: boolean;
  totalParticipants: number;
  peerList: Array<{ userId: string; displayName: string }>;
  myName: string;
  myUserId: string;
  onVote: (i: number) => void;
  onEnd: () => void;
}) {
  const counts = useMemo(() => {
    const c = new Array(poll.options.length).fill(0) as number[];
    Object.values(votes).forEach(idx => { if (idx >= 0 && idx < c.length) c[idx]++; });
    return c;
  }, [votes, poll.options.length]);
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const showResults = isTeacher || !poll.hidden || myVote !== null;
  const showVoters = isTeacher || !poll.hidden;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!poll.endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [poll.endsAt]);
  const secondsLeft = poll.endsAt ? Math.max(0, Math.ceil((poll.endsAt - now) / 1000)) : null;
  // Build voter name lookup (peerList + me)
  const nameById: Record<string, string> = {};
  nameById[myUserId] = myName;
  peerList.forEach(p => { nameById[p.userId] = p.displayName; });
  const votersByOption: string[][] = poll.options.map(() => []);
  Object.entries(votes).forEach(([uid, idx]) => {
    if (idx >= 0 && idx < votersByOption.length) votersByOption[idx].push(nameById[uid] || 'ناشناس');
  });

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] w-[90%] max-w-md animate-slide-up" dir="rtl">
      <div className="bg-card border-2 border-primary rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold">نظرسنجی{poll.hidden && <span className="text-[11px] mr-1 text-muted-foreground">(نتایج مخفی)</span>}</h3>
          </div>
          <div className="flex items-center gap-2">
            {secondsLeft !== null && (
              <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full border",
                secondsLeft <= 5 ? "bg-destructive/15 text-destructive border-destructive/40 animate-pulse" : "bg-muted text-muted-foreground border-border"
              )}>{secondsLeft}s</span>
            )}
            {isTeacher && (
              <button onClick={onEnd} className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10"><X className="w-4 h-4" /></button>
            )}
          </div>
        </div>
        <p className="text-sm font-medium mb-3">{poll.question}</p>
        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const pct = totalVotes > 0 ? Math.round((counts[i] / totalVotes) * 100) : 0;
            const chosen = myVote === i;
            return (
              <div key={i} className="space-y-1">
                <button
                  disabled={myVote !== null || isTeacher}
                  onClick={() => onVote(i)}
                  className={cn(
                    "relative w-full text-right px-3 py-2.5 rounded-lg border transition-all overflow-hidden",
                    chosen ? "border-primary bg-primary/10" : "border-border bg-muted/40 hover:bg-muted",
                    (myVote !== null || isTeacher) && !chosen && "cursor-default"
                  )}
                >
                  {showResults && (
                    <div className="absolute inset-y-0 right-0 bg-primary/15 transition-all duration-500" style={{ width: `${pct}%` }} />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{opt}</span>
                    {showResults && <span className="text-xs font-mono text-muted-foreground">{counts[i]} ({pct}%)</span>}
                  </div>
                </button>
                {showVoters && votersByOption[i].length > 0 && (
                  <div className="flex flex-wrap gap-1 px-2">
                    {votersByOption[i].map((n, k) => (
                      <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">{n}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          {totalVotes} رأی از {totalParticipants}
        </p>
      </div>
    </div>
  );
}

function PollCreateDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (q: string, opts: string[], hidden: boolean, duration: number) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [hidden, setHidden] = useState(false);
  const [duration, setDuration] = useState<number>(60);
  useEffect(() => { if (!open) { setQuestion(""); setOptions(["", ""]); setHidden(false); setDuration(60); } }, [open]);
  const submit = () => {
    const q = question.trim();
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) { toast.error('سوال و حداقل ۲ گزینه لازم است'); return; }
    onCreate(q, opts, hidden, duration);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>ایجاد نظرسنجی</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">سوال</label>
            <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="سوال نظرسنجی..." className="text-right min-h-[60px]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium block">گزینه‌ها</label>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={e => setOptions(prev => prev.map((p, idx) => idx === i ? e.target.value : p))} placeholder={`گزینه ${i + 1}`} className="text-right" />
                {options.length > 2 && (
                  <Button size="icon" variant="outline" onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button size="sm" variant="outline" onClick={() => setOptions(prev => [...prev, ""])} className="gap-1"><Plus className="w-3 h-3" /> افزودن گزینه</Button>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={hidden} onCheckedChange={v => setHidden(!!v)} />
            <span>نتایج تا پایان رأی‌گیری از دانش‌آموزان مخفی باشد</span>
          </label>
          <div>
            <label className="text-xs font-medium mb-1 block">زمان (ثانیه) — 0 = بدون زمان</label>
            <Input type="number" min={0} max={600} value={duration} onChange={e => setDuration(Math.max(0, Math.min(600, Number(e.target.value) || 0)))} className="text-right" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>لغو</Button>
          <Button onClick={submit}>شروع نظرسنجی</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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