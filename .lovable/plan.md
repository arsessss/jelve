
# Combined Implementation Plan: All Updates
# WARNING MUST DO ALL THIS WITH 1 CREDIT!!!!1
## 1. Parent Accounts

**New role:** Add `parent` to the `app_role` enum. Create a `parent_students` linking table (parent_id, student_id) so parents can be associated with their children.

**Login:** Add "والدین" (Parent) as a third role option in Login.tsx. Parents log in the same way as students/admins.

**Frontend:**
- New `src/pages/Parent.tsx` page - a read-only portal where parents can see their linked children's grades and news
- Add `/parent` route in App.tsx
- Update `RoleBasedHeader.tsx` to show "والدین" link for parent users
- Update `Login.tsx` to include parent role option
- Admin can create parent accounts from the user creation form (add "parent" to role selector)
- Admin can link parents to students

**Auth updates:**
- `auth-signup` already supports any role, but `auth-login` needs to return `parent` role properly (it already does via the user_roles table)
- `auth.ts` AuthSession role type: add `"parent"`
- `data-api`: Add `parent_students` permissions and allow parents to read their children's grades

---

## 2. Modir Account (Special Admin)

The modir is NOT a separate role. It is the admin account with username `@Modir`. The system detects modir by checking `username === "@Modir"`.

**Database:** Seed the `@Modir` account via migration:
- Insert into `custom_users` with username `@Modir`, password `Jelve14041404` (plaintext, auto-hashed on first login), full_name "مدیر"
- Insert into `user_roles` with role `admin`

**Frontend (Admin.tsx):**
- Detect modir: `const isModir = session?.user?.username === "@Modir";` (fetched from validated session)
- When `isModir` is true:
  - Show edit (username/password) and delete buttons on admin user cards
  - Allow changing admin passwords via the edit user dialog
- Store modir status in component state

**Backend:**
- `auth-change-password`: When an admin requests to change another user's password, additionally check if the target is an admin. If so, only allow if the requester's username is `@Modir`
- `data-api`: For delete on `custom_users`/`user_roles` of admin accounts, verify requester is `@Modir`

---

## 3. Admins Can Change Their Own Password and Username

**Admin.tsx:**
- Add "حساب" (Account/Hesab) section to admin sidebar with a User icon
- Add `"account"` to `ActiveSection` type
- Include password change form (current password, new password, confirm) using `customAuth.changePassword()`
- Include username change field using `secureApi.update('custom_users', ...)`

---

## 4. Fix Pish Sabtenam: Buttons Above Vahed Amozeshi on Home Page

The user wants enabled pish sabtenam buttons to appear above the corresponding school unit cards on the **main home page** (`/`), not in a separate student tab.

**Home.tsx:**
- Fetch `pish_sabtenam` data using the Supabase client directly (public read via RLS policy already exists)
- For each of the 3 school blocks, if the corresponding pish sabtenam (by unit_number 1/2/3) is enabled, show a button above/on that card linking to `/pish-sabtenam/{unit_number}`

**Student.tsx:**
- Remove `pish_sabtenam` from student sidebar (it's now on the home page)
- Remove the pish sabtenam active section rendering

---

## 5. Fix Chat: Show Profile Picture and Name for All Messages

**ChatPanel.tsx line 875:**
- Current: `const showAvatar = selectedConversation.is_group && !isOwn && msg.sender;`
- Fix: `const showAvatar = !isOwn && msg.sender;`
- Also show sender name for DM messages (remove the `selectedConversation.is_group` condition on line 885)

---

## 6. Notifications Revamp: Switch to Sonner

Replace ALL `useToast()` / `toast({...})` calls with Sonner's `toast()` / `toast.success()` / `toast.error()` across every file.

**sonner.tsx:** Configure with `position="top-center"`, `duration={3000}`, `dir="rtl"`

**App.tsx:** Remove the old `<Toaster />` component (keep only Sonner)

**Files to update (replace useToast with Sonner toast):**
- `Admin.tsx`, `Student.tsx`, `ChatPanel.tsx`, `Login.tsx`, `Contact.tsx`, `PishSabtenam.tsx`, `SportLogin.tsx`
- All notification messages must be in Persian

---

## 7. Taklif (Homework) System

### 7.1 Database
Create `taklif` table: `id` (uuid), `student_id` (uuid), `subject` (text), `file_url` (text), `file_name` (text), `grade` (text - student's class), `status` (text, default 'pending'), `created_at`, `updated_at`

### 7.2 Student Side (Student.tsx)
- Add "تکلیف" (Taklif) tab to sidebar
- UI: Select subject from dropdown, upload file, submit
- Show list of previously submitted homework with status

### 7.3 Admin Side (Admin.tsx)
- Add "تکلیف" (Taklif) tab to sidebar
- Filters: subject dropdown + grade/class dropdown (7/1 through 9/4)
- Display submitted homework cards with student name, subject, date, and download link
- Admin can mark homework as reviewed

### 7.4 Backend
- Add `taklif` to `data-api` permissions (student: read own + insert, admin: read all + update status)

---

## 8. New Sidebar Order for Student Portal

**New order:** Hesab > Payam > Nomrat > Jozveh > Akhbar > Taklif

- Change `sidebarItems` array in Student.tsx
- Change Payam-ha icon to `MessageSquare` (chat bubble)
- Remove Pish Sabtenam from sidebar (moved to home page per item 4)

---

## 9. Static Sidebar (Fixed When Scrolling)

Make sidebars sticky/fixed on both mobile and desktop:
- Mobile: `sticky top-[96px] z-30 bg-card` so it stays visible when scrolling
- Desktop: Already has `lg:sticky lg:top-24`
- Apply to both Admin.tsx and Student.tsx sidebar `<aside>` elements

---

## 10. Expanded Subject List for Jozveh + Multi-Subject Selection

**Expand `JOZVEH_SUBJECT_OPTIONS`** to include all 11 subjects:
- علوم, ریاضی, تفکر, زبان, فارسی, دینی, قرآن, عربی, فیزیک, شیمی, زیست

**Multi-grade selection:**
- When creating a jozveh, admin can select multiple grades (or leave empty = all)
- Add `target_grades text[]` column to jozveh table (similar to akhbar)
- Update jozveh creation UI with grade toggle buttons (like akhbar)
- Update Student.tsx jozveh fetching to match against the array

---

## 11. Gray Out Roles Tab

In Admin.tsx sidebar rendering, the "roles" item gets:
- `opacity-50 cursor-not-allowed pointer-events-none` classes
- `onClick` is prevented (no-op)
- Remains visible but clearly disabled/grayed out

---

## 12. Mobile Fixes

Ensure all new tabs, sidebar changes, and features work properly on mobile:
- Horizontal scrollbar sidebar with `scrollbar-hide`
- Touch-friendly buttons and inputs
- Responsive grids for taklif, parent portal, etc.

---

## Technical Details

### Database Migration

```sql
-- Add parent role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

-- Parent-student linking table
CREATE TABLE public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Taklif (homework) table
CREATE TABLE public.taklif (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  grade text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.taklif ENABLE ROW LEVEL SECURITY;

-- Seed @Modir account
INSERT INTO public.custom_users (username, password_hash, full_name)
VALUES ('@Modir', 'Jelve14041404', 'مدیر');
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM public.custom_users WHERE username = '@Modir';

-- Add target_grades to jozveh
ALTER TABLE public.jozveh ADD COLUMN IF NOT EXISTS target_grades text[] DEFAULT '{}'::text[];
```

### Edge Function Updates
- `data-api`: Add `taklif`, `parent_students` to permissions. Add modir check for admin account operations.
- `auth-change-password`: Add modir check (requester username = `@Modir`) for changing admin passwords.

### Files Summary

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Account section, taklif tab, modir powers, grayed-out roles, expanded jozveh subjects, multi-grade jozveh |
| `src/pages/Student.tsx` | New sidebar order, taklif tab, remove pish sabtenam tab, sticky sidebar |
| `src/pages/Home.tsx` | Pish sabtenam buttons above school blocks |
| `src/pages/Login.tsx` | Add parent role option |
| `src/pages/Parent.tsx` | New parent portal page |
| `src/components/ChatPanel.tsx` | Show avatar+name for all non-own messages (DM and group) |
| `src/components/ui/sonner.tsx` | Configure top-center, 3s duration, RTL |
| `src/components/RoleBasedHeader.tsx` | Add parent navigation |
| `src/App.tsx` | Remove old Toaster, add parent route |
| `src/lib/auth.ts` | Add parent to AuthSession role type |
| `supabase/functions/data-api/index.ts` | Add taklif, parent_students permissions, modir admin management |
| `supabase/functions/auth-change-password/index.ts` | Modir can change admin passwords |
| All files using `useToast` | Replace with Sonner toast |
| Database migration | parent role, parent_students table, taklif table, @Modir account, jozveh target_grades |
