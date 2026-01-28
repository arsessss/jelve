
# Comprehensive Fixes and Features Plan

## Summary
This plan addresses multiple UI bugs, mobile responsiveness issues, and adds new features including an Akhbar (News) system and the ability to kick users from groups.

---

## Issues Identified

### 1. Duplicate Close (X) Buttons
**Problem:** The DialogContent component in `dialog.tsx` has a built-in close button at `right-4 top-4`. The Admin.tsx page also adds custom close buttons in the DialogHeader for grade dialogs, resulting in two X buttons.

**Solution:** Remove the custom X buttons from Admin.tsx dialogs and rely on the dialog component's built-in close button (repositioned to the left for RTL).

### 2. Buttons Not Visible
**Problem:** Some buttons may have styling issues causing low contrast or visibility problems.

**Solution:** Review and fix button styling in the affected components.

### 3. Mobile Responsiveness Issues
**Problem:** The sidebar layout in Student and Admin pages may not work well on mobile devices.

**Solution:** Improve mobile layout with proper responsive design, ensure touch targets are adequate size (min 44px), and fix any overflow issues.

### 4. Missing Animation on Nomre (Grades) Section
**Problem:** The grades section doesn't have entrance animations.

**Solution:** Add `animate-fade-in` class to the grades section container.

### 5. User Names/Profiles Not Visible in Chat
**Problem:** Currently, sender name only shows for messages from other users, but profile pictures are not shown inline with messages.

**Solution:** Enhance message display to show sender's profile picture and name for all messages in group chats.

### 6. Cannot Kick People from Groups
**Problem:** Group admins can make/remove admins but cannot kick (remove) members from groups.

**Solution:** Add a "Kick Member" feature for group admins in both the frontend and backend.

### 7. Missing Akhbar (News/Announcements) Tab
**Problem:** Students need a news section on their main page, and admins need tools to create announcements with images and formatted text.

**Solution:** Create an Akhbar system with:
- New database table for announcements
- Admin UI for creating/managing announcements (with image upload, bold text support)
- Student UI for viewing announcements

---

## Implementation Details

### Phase 1: Fix Dialog Close Button Issue

**File: `src/components/ui/dialog.tsx`**
- Move the built-in close button from `right-4` to `left-4` for RTL compatibility
- This single close button will work for all dialogs

**File: `src/pages/Admin.tsx`**
- Remove the custom X button from `studentPeriodsDialogOpen` dialog (lines 1002-1008)
- Remove the custom X button from `gradeDialogOpen` dialog (lines 1073-1079)
- Adjust DialogTitle padding since custom button is removed

### Phase 2: Mobile Responsiveness Fixes

**File: `src/pages/Student.tsx`**
- Improve sidebar responsiveness for mobile
- Ensure horizontal scroll on mobile sidebar works smoothly
- Add proper touch target sizes
- Fix main content area padding on mobile

**File: `src/pages/Admin.tsx`**
- Same mobile improvements as Student.tsx
- Ensure all forms work well on small screens

### Phase 3: Add Animation to Nomre Section

**File: `src/pages/Student.tsx`**
- The grades section at line 476 already has `animate-fade-in` class
- Verify Collapsible animations work correctly

### Phase 4: Enhance Chat User Identification

**File: `src/components/ChatPanel.tsx`**
- Add sender's profile picture next to messages in group chats
- Always show sender name for group messages (not just for others' messages)
- Display avatar beside each message with proper RTL alignment

### Phase 5: Add Kick Member Feature

**Backend: `supabase/functions/chat-api/index.ts`**
- Add new action `kick_member` that:
  - Validates the requester is a group admin
  - Cannot kick the group creator
  - Removes the target user from `conversation_participants`
  - Removes target from `group_admins` if they were an admin

**Frontend: `src/lib/chat-api.ts`**
- Add `kickMember(conversationId: string, userId: string)` function

**Frontend: `src/components/ChatPanel.tsx`**
- Add a "Kick" button next to each member in group settings (visible only to admins)
- Cannot kick the group creator or yourself

### Phase 6: Add Akhbar (News) System

**Database Migration:**
```sql
CREATE TABLE public.akhbar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  target_grades text[] DEFAULT '{}',
  is_published boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.akhbar ENABLE ROW LEVEL SECURITY;
```

**Backend: `supabase/functions/data-api/index.ts`**
- Add `akhbar` table to the permissions object for admin read/write access

**Frontend: `src/pages/Student.tsx`**
- Add "Akhbar" tab to the sidebar (rename "Main" or add as separate section)
- Display news/announcements filtered by student's grade
- Support rendering bold text (text wrapped in `**` converted to `<strong>`)
- Display images from announcements

**Frontend: `src/pages/Admin.tsx`**
- Add "Akhbar" section to the sidebar
- Create form for adding announcements:
  - Title input
  - Content textarea (supports **bold** syntax)
  - Image upload
  - Grade selector (multi-select or "All grades")
  - Publish toggle
- List of existing announcements with edit/delete options

---

## Technical Details

### Dialog Close Button Fix
```tsx
// dialog.tsx - Move close button to left for RTL
<DialogPrimitive.Close className="absolute left-4 top-4 ...">
```

### Kick Member API
```typescript
// chat-api.ts
kickMember: (conversationId: string, userId: string) =>
  chatApiCall<{ success: boolean }>('kick_member', { 
    conversation_id: conversationId,
    user_id: userId,
  }),
```

### Bold Text Rendering Helper
```typescript
const renderFormattedText = (text: string) => {
  // Convert **text** to <strong>text</strong>
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};
```

### Chat Message with Profile Picture
```tsx
// In message rendering
<div className="flex items-start gap-2">
  {selectedConversation.is_group && !isOwn && (
    <Avatar className="w-6 h-6 shrink-0">
      <AvatarImage src={msg.sender?.profile_picture || undefined} />
      <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
    </Avatar>
  )}
  <div className="flex-1">
    {/* message content */}
  </div>
</div>
```

---

## Files to Modify

1. `src/components/ui/dialog.tsx` - Fix close button position
2. `src/pages/Admin.tsx` - Remove duplicate X buttons, add Akhbar section
3. `src/pages/Student.tsx` - Add Akhbar tab, improve mobile responsiveness
4. `src/components/ChatPanel.tsx` - Add profile pictures to messages, add kick member feature
5. `src/lib/chat-api.ts` - Add kickMember function
6. `supabase/functions/chat-api/index.ts` - Add kick_member action
7. `supabase/functions/data-api/index.ts` - Add akhbar table permissions

## New Files

None required - all features will be added to existing files.

## Database Changes

1. Create `akhbar` table for announcements with appropriate columns and RLS policies

---

## Summary of Deliverables

| Issue | Solution |
|-------|----------|
| Duplicate X buttons | Fix dialog.tsx + remove custom buttons in Admin.tsx |
| Buttons not visible | Review and fix button contrast/styling |
| Mobile issues | Improve responsive layout in Student/Admin pages |
| Nomre animation | Already has animation, verify it works |
| Chat user names | Add profile pictures and names to all group messages |
| Kick from groups | Add kick_member API + UI in group settings |
| Akhbar tab | Create announcements table, Admin create UI, Student view UI |
