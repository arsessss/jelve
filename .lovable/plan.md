## هدف
ساخت سیستم کلاس آنلاین کاملاً اختصاصی داخل سایت جلوه؛ بدون استفاده از Jitsi/Zoom/LiveKit. زیرساخت: **WebRTC mesh** (نقطه‌به‌نقطه بین مرورگرها) + **Supabase Realtime** برای signaling/whiteboard/chat sync. هیچ API key خارجی نیاز نیست.

> **محدودیت مهندسی (مهم)**: معماری mesh برای کلاس‌های **حداکثر ۸ نفر همزمان** پایدار است (هر نفر به همه وصل می‌شود → n² اتصال). برای کلاس‌های بزرگ‌تر باید بعداً به یک SFU خارجی مهاجرت کنیم. این محدودیت ذاتی WebRTC مرورگری است، نه تنبلی — بدون سرور رسانه‌ای واقعی نمی‌توان از این فراتر رفت.

---

## تغییرات دیتابیس

### `online_classes` (اصلاح)
- `link` → اختیاری (nullable). برای کلاس‌های قدیمی لینک خارجی حفظ شود.
- اضافه: `is_live boolean default false` — وقتی معلم/مدیر کلاس را شروع می‌کند.
- اضافه: `started_at timestamptz` — زمان شروع.
- اضافه: `mode text default 'internal'` — `internal` (داخل سایت) یا `external` (لینک).
- اضافه: `subject text` — درس کلاس (اختیاری، برای نمایش).
- اضافه: `description text` — توضیح.

### `online_class_participants` (جدول جدید)
- `id`, `class_id`, `user_id`, `display_name`, `is_teacher boolean`, `joined_at`, `left_at`.
- ثبت تاریخچه ورود/خروج برای حضور و غیاب.

RLS: قفل کامل از سمت کلاینت؛ همه عملیات (لیست، شروع، پایان، ثبت ورود) از طریق edge function امن می‌گذرند.

---

## Edge Functions جدید

1. `online-class-start` — مدیر کلاس را Live می‌کند.
2. `online-class-end` — پایان کلاس + ثبت `left_at` همه.
3. `online-class-join` — اعتبارسنجی: دانش‌آموز فقط اگر `grade` کاربر برابر `grade` کلاس باشد می‌تواند بپیوندد. خروجی: token موقت برای کانال realtime + نقش (teacher/student).
4. `online-class-leave` — ثبت خروج.

تمام درخواست‌ها با هدر `x-session-token` (همان الگوی فعلی `secureApi`).

---

## Frontend

### مسیر جدید
- `/class/:classId` — صفحه‌ی اتاق کلاس (`src/pages/ClassRoom.tsx`).

### کامپوننت‌های جدید (`src/components/classroom/`)
- `ClassRoom.tsx` — لایه و مدیریت state کلی.
- `VideoGrid.tsx` — گرید واکنش‌گرا برای ویدیوها (شامل خود).
- `VideoTile.tsx` — هر کاشی ویدیو + نام + وضعیت میکروفون.
- `ControlBar.tsx` — دکمه‌های میکروفون، دوربین، اشتراک صفحه، وایت‌برد، چت، خروج.
- `Whiteboard.tsx` — Canvas اختصاصی: قلم، رنگ، ضخامت، پاک‌کن، Undo، Clear. هر stroke از طریق Supabase broadcast به همه ارسال می‌شود.
- `RoomChat.tsx` — چت متنی داخل کلاس (broadcast، غیرماندگار).
- `ParticipantsList.tsx` — لیست افراد آنلاین.

### Hooks (`src/hooks/`)
- `useWebRTC.ts` — هسته‌ی mesh. مسئول:
  - `getUserMedia` (mic + cam) و `getDisplayMedia` (screen).
  - برای هر peer جدید: ساخت `RTCPeerConnection` با STUN عمومی گوگل (`stun:stun.l.google.com:19302`).
  - تبادل offer/answer/ICE از طریق Supabase Realtime broadcast روی کانال `class:{classId}` (event: `signal`، payload شامل `to`, `from`, `type`, `data`).
  - مدیریت track replacement هنگام screen share / تعویض دوربین.
  - cleanup کامل هنگام unmount.
- `useClassPresence.ts` — Supabase Presence برای دیدن لیست زنده‌ی افراد در کانال.
- `useWhiteboardSync.ts` — broadcast/receive strokes.

### تغییرات صفحات موجود
- **Admin.tsx**: فرم ایجاد کلاس → فیلد `mode` (internal/external)، اگر internal لینک نمی‌خواهد؛ دکمه‌ی "شروع کلاس" و "پایان". وقتی internal فعال است، دکمه‌ی "ورود به اتاق" به `/class/:id`.
- **Student.tsx**: کارت کلاس‌های پایه‌ی دانش‌آموز؛ اگر `is_live && mode==='internal'` → دکمه‌ی "ورود به کلاس" → `/class/:id`. اگر external → همان لینک قدیمی.

### withRetry
طبق قانون پروژه، تمام فراخوانی‌های edge function با `withRetry` پوشانده می‌شوند. signaling realtime ذاتاً auto-reconnect دارد.

---

## معماری Signaling (خلاصه فنی)

```text
Client A                Supabase Realtime                Client B
  | --- join channel ------->  class:{id} <--- join ----- |
  | <-- presence sync (B joined) ---------               |
  | --- broadcast offer (to=B) -->                       |
  |                              ----- offer ----------> |
  |                              <---- answer ---------- |
  | <-- broadcast answer --------                        |
  |  (ICE candidates exchanged via same channel)         |
  |                                                       |
  | =========== direct P2P RTCPeerConnection =========== |
  |              audio + video + screen tracks            |
```

وایت‌برد و چت کلاس از همان کانال با event‌های `whiteboard` و `chat` استفاده می‌کنند (پایداری نیاز نیست؛ فقط برای حاضران).

---

## دسترسی و امنیت
- ورود به `/class/:id` فقط برای کاربر لاگین‌شده. در `online-class-join` چک می‌شود:
  - مدیر → همیشه مجاز (نقش teacher).
  - دانش‌آموز → باید `students.grade === online_classes.grade` باشد.
  - والد → ممنوع.
- اگر کلاس `is_live=false` بود → خطا.
- خروج خودکار با `beforeunload` + ثبت در `online-class-leave`.

---

## فازبندی پیاده‌سازی (همه در همین تسک)
1. Migration دیتابیس + grants + جدول participants.
2. ۴ edge function.
3. Hooks (WebRTC, presence, whiteboard).
4. کامپوننت‌های classroom.
5. مسیر `/class/:id` در `App.tsx`.
6. تغییرات Admin/Student.
7. تست دستی با دو تب مرورگر.

---

## آنچه ساخته نمی‌شود (خارج از این تسک)
- ضبط کلاس (نیاز به سرور).
- بیش از ۸ شرکت‌کننده‌ی همزمان.
- اشتراک فایل داخل کلاس (چت متنی فقط).
- زیرنویس/ترجمه‌ی زنده.

اگر تأیید کنید، شروع به ساخت می‌کنم.
