

# Implementation Plan: 9-Item Fix and Feature List

## 1. Remove ALL X/Close Buttons

Remove the built-in close button from `dialog.tsx` DialogContent component entirely. Users will close dialogs by clicking outside (the overlay). This affects all dialogs site-wide (Admin grade dialogs, Student password dialog, Chat dialogs).

**File:** `src/components/ui/dialog.tsx`
- Remove the `<DialogPrimitive.Close>` button with the X icon from DialogContent

---

## 2. Fix Unnecessary Scrollable Areas + Resize Grades

Several areas use `ScrollArea` or `overflow-auto` unnecessarily. The grades section in the student view should be sized to avoid scrolling.

**Files:**
- `src/components/ChatPanel.tsx` - Keep scroll only on the messages area and conversation list (these need scrolling). Review other scroll areas in group settings dialogs.
- `src/pages/Student.tsx` - Ensure grades collapsible content doesn't need inner scrolling. Use auto-height instead of fixed heights where possible.
- `src/pages/Admin.tsx` - Review dialog content areas (`max-h-[85vh] overflow-y-auto` and `max-h-[80vh] overflow-y-auto`) - keep these as they have dynamic content that could exceed viewport.

---

## 3. Fix Invisible Buttons on Login (Vorod) and Contact (Ertebat) Pages

Both pages use `gradient-primary` class on buttons, but this CSS variable `--gradient-primary` is never defined (it was removed when gradients were removed). The buttons render with no visible background.

**Fix:** Replace `gradient-primary` with `bg-primary` on:
- `src/pages/Login.tsx` line 159 - the submit button
- `src/pages/Contact.tsx` line 132 - the submit button

---

## 4. Admin Can Change Student Username, Name, and Password

Add an edit dialog in the Admin users section. When admin clicks "edit" on a student, a dialog opens with fields for:
- Full name (updates both `custom_users.full_name` and `students.full_name`)
- Username (updates `custom_users.username`)
- New password (optional - only changes if filled, updates via a new edge function or direct hash update)

**Files:**
- `src/pages/Admin.tsx` - Add edit dialog state, form, and handler functions
- `supabase/functions/data-api/index.ts` - The update action already supports `custom_users` for admins. For password changes, we need to add password hashing in the data-api or create a dedicated admin action. Best approach: add an `admin-update-user` action to the `data-api` edge function that handles password hashing with bcrypt.

---

## 5. Student Can Change Their Own Username

Add username editing to the Student account section.

**File:** `src/pages/Student.tsx`
- Add a username change field/dialog in the account section
- Use `secureApi.update('custom_users', userId, { username: newUsername })` (already permitted for students on their own record)

---

## 6. New "Roles" Section in Admin Sidebar

Add a placeholder "Roles" section to the admin sidebar. It will show a simple card saying "این بخش به زودی فعال می‌شود" (This section will be activated soon).

**File:** `src/pages/Admin.tsx`
- Add `"roles"` to `ActiveSection` type
- Add sidebar item with a description icon
- Add placeholder content section like a inside a tab theres a description about some teacher and their picture is left above corner 

---

## 7. New "Pish Sabtenam" Tab with 3 Links to Separate Pages

Add a "پیش ثبت‌نام" (Pre-registration) section to the student page that shows 3 buttons above the "واحدهای آموزشی" (school units). Each button links to its own route (`/pish-sabtenam/1`, `/pish-sabtenam/2`, `/pish-sabtenam/3`). These pages show text and images that admins can configure. ( they have to enable and disable these the pish sabtenam is not always enabled automatically )

**New files:**
- `src/pages/PishSabtenam.tsx` - A page component that reads content from a configurable source

**Modified files:**
- `src/pages/Student.tsx` - Add "پیش ثبت‌نام" to sidebar items
- `src/pages/Admin.tsx` - Add management section for pish sabtenam content (title, text, image for each of 3 units)
- `src/App.tsx` - Add routes for `/pish-sabtenam/:id`

**Database:** Create a `pish_sabtenam` table with columns: `id`, `unit_number` (1-3), `title`, `content`, `image_url`, `created_at`, `updated_at`

---

## 8. Akhbar Image Popup for Resize/Preview

When uploading an image for akhbar, show a preview popup where the admin can see how the image will look. Also in the student akhbar view, clicking an image opens a full-size popup. Images should use `object-contain` instead of `object-cover` to avoid cropping. Same for pish sabtenam images.

**Files:**
- `src/pages/Admin.tsx` - Add image preview dialog when akhbar image is selected
- `src/pages/Student.tsx` - Add click-to-enlarge on akhbar images (open in a dialog with full resolution, `object-contain`)
- `src/pages/PishSabtenam.tsx` - Same image display behavior

---

## 9. Chat Messages Show Sender's Avatar Alongside Name

Currently avatars show for group messages from others, but the layout needs improvement. Ensure every message in a group chat shows the sender's avatar and name clearly.

**File:** `src/components/ChatPanel.tsx`
- The avatar is already shown (lines 878-883) for group messages from others
- Ensure avatar is always visible (not just on hover) and properly aligned in RTL
- Make avatar display more prominent with proper spacing

---

## 10. everything for mobile is also fixed 

the tab and everything in mobile is fixed



## Technical Details

### Database Migration (for item 7)
```sql
CREATE TABLE public.pish_sabtenam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number integer NOT NULL CHECK (unit_number BETWEEN 1 AND 3),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pish_sabtenam ENABLE ROW LEVEL SECURITY;

-- Seed the 3 units
INSERT INTO public.pish_sabtenam (unit_number, title, content) VALUES
  (1, 'دوره اول پسرانه', ''),
  (2, 'دوره دوم پسرانه', ''),
  (3, 'دوره دوم دخترانه', '');
```

### Edge Function Updates
- `supabase/functions/data-api/index.ts`: Add `pish_sabtenam` table to permissions (admin read/write, student read). Add special handling for admin password updates using bcrypt hashing.

### Files Summary

| File | Changes |
|------|---------|
| `src/components/ui/dialog.tsx` | Remove X close button |
| `src/pages/Login.tsx` | Fix button: `gradient-primary` to `bg-primary` |
| `src/pages/Contact.tsx` | Fix button: `gradient-primary` to `bg-primary` |
| `src/pages/Admin.tsx` | Add edit user dialog, roles section, pish sabtenam management, akhbar image preview |
| `src/pages/Student.tsx` | Add username editing, pish sabtenam tab, akhbar image popup |
| `src/components/ChatPanel.tsx` | Improve avatar display in messages |
| `src/pages/PishSabtenam.tsx` | New page for pre-registration info |
| `src/App.tsx` | Add pish sabtenam routes |
| `supabase/functions/data-api/index.ts` | Add pish_sabtenam permissions, admin password update |
| Database migration | Create pish_sabtenam table |

