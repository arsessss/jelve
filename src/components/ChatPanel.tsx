import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { customAuth } from "@/lib/auth";
import { chatApi, Conversation, ChatMessage, ChatUser } from "@/lib/chat-api";
import { 
  MessageSquare, Send, Plus, Users, User, Search, 
  Paperclip, X, FileText, ArrowLeft, UserPlus, Settings, Crown, Edit2, Trash2,
  LogOut, Mic, Square, Image as ImageIcon, UserMinus
} from "lucide-react";

interface ChatPanelProps {
  currentUserId: string;
}

export const ChatPanel = ({ currentUserId }: ChatPanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupPictureInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    const { data, error } = await chatApi.getConversations();
    if (!error && data) {
      setConversations(data);
      // Update selected conversation if it exists
      if (selectedConversation) {
        const updated = data.find(c => c.id === selectedConversation.id);
        if (updated) setSelectedConversation(updated);
      }
    }
    setLoading(false);
  }, [selectedConversation]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await chatApi.getMessages(conversationId);
    if (!error && data) {
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id, loadMessages]);

  // Real-time message subscription
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.sender_id !== currentUserId) {
            loadMessages(selectedConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, currentUserId, loadMessages]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { data } = await chatApi.searchUsers(query);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const startDirectMessage = async (user: ChatUser) => {
    const { data, existing, error } = await chatApi.createConversation([user.id]);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    if (data) {
      if (!existing) {
        setConversations(prev => [{ ...data, participants: [user] }, ...prev]);
      }
      const conv = existing 
        ? conversations.find(c => c.id === data.id) || { ...data, participants: [user] }
        : { ...data, participants: [user] };
      setSelectedConversation(conv);
      setShowNewChat(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast({ title: "خطا", description: "نام گروه و حداقل یک عضو الزامی است", variant: "destructive" });
      return;
    }
    const { data, error } = await chatApi.createConversation(
      selectedUsers.map(u => u.id),
      groupName,
      true
    );
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    if (data) {
      const newConv = { ...data, participants: selectedUsers, admin_ids: [currentUserId] };
      setConversations(prev => [newConv, ...prev]);
      setSelectedConversation(newConv);
      setShowNewGroup(false);
      setGroupName("");
      setSelectedUsers([]);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    const { data, error } = await chatApi.sendMessage(selectedConversation.id, newMessage);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    if (data) {
      const session = customAuth.getSession();
      setMessages(prev => [...prev, { 
        ...data, 
        sender: { 
          id: currentUserId, 
          username: session?.user.username || '', 
          full_name: session?.user.full_name || null, 
          profile_picture: null 
        } 
      }]);
      setNewMessage("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      loadConversations();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(fileName);

      const { data, error } = await chatApi.sendMessage(
        selectedConversation.id, 
        undefined, 
        urlData.publicUrl,
        file.name
      );

      if (error) throw new Error(error);

      if (data) {
        const session = customAuth.getSession();
        setMessages(prev => [...prev, { 
          ...data, 
          sender: { 
            id: currentUserId, 
            username: session?.user.username || '', 
            full_name: session?.user.full_name || null, 
            profile_picture: null 
          } 
        }]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        loadConversations();
      }

      toast({ title: "موفق", description: "فایل ارسال شد" });
    } catch {
      toast({ title: "خطا", description: "آپلود فایل ناموفق بود", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGroupPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "خطا", description: "فقط فایل‌های تصویری مجاز هستند", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `group-${selectedConversation.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(fileName);

      const { error } = await chatApi.updateGroupPicture(selectedConversation.id, urlData.publicUrl);
      if (error) throw new Error(error);

      setSelectedConversation({ ...selectedConversation, group_picture: urlData.publicUrl });
      loadConversations();
      toast({ title: "موفق", description: "تصویر گروه تغییر کرد" });
    } catch {
      toast({ title: "خطا", description: "آپلود تصویر ناموفق بود", variant: "destructive" });
    } finally {
      setUploading(false);
      if (groupPictureInputRef.current) groupPictureInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      toast({ title: "خطا", description: "دسترسی به میکروفون امکان‌پذیر نیست", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedConversation) return;

    setUploading(true);
    try {
      const fileName = `voice-${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(fileName);

      const { data, error } = await chatApi.sendMessage(
        selectedConversation.id, 
        undefined, 
        urlData.publicUrl,
        "voice-message.webm"
      );

      if (error) throw new Error(error);

      if (data) {
        const session = customAuth.getSession();
        setMessages(prev => [...prev, { 
          ...data, 
          sender: { 
            id: currentUserId, 
            username: session?.user.username || '', 
            full_name: session?.user.full_name || null, 
            profile_picture: null 
          } 
        }]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        loadConversations();
      }

      toast({ title: "موفق", description: "پیام صوتی ارسال شد" });
    } catch {
      toast({ title: "خطا", description: "ارسال پیام صوتی ناموفق بود", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRenameGroup = async () => {
    if (!selectedConversation || !editGroupName.trim()) return;
    const { error } = await chatApi.renameGroup(selectedConversation.id, editGroupName);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "موفق", description: "نام گروه تغییر کرد" });
    setSelectedConversation({ ...selectedConversation, name: editGroupName });
    loadConversations();
  };

  const handleLeaveGroup = async () => {
    if (!selectedConversation) return;
    if (!confirm("آیا از خروج از این گروه اطمینان دارید؟")) return;
    
    const { error, deleted } = await chatApi.leaveGroup(selectedConversation.id);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    
    if (deleted) {
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
    } else {
      loadConversations();
    }
    
    setSelectedConversation(null);
    setMessages([]);
    setShowGroupSettings(false);
    toast({ title: "موفق", description: "از گروه خارج شدید" });
  };

  const handleMakeAdmin = async (userId: string) => {
    if (!selectedConversation) return;
    const { error } = await chatApi.makeAdmin(selectedConversation.id, userId);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "موفق", description: "کاربر ادمین شد" });
    loadConversations();
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!selectedConversation) return;
    const { error } = await chatApi.removeAdmin(selectedConversation.id, userId);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "موفق", description: "دسترسی ادمین برداشته شد" });
    loadConversations();
  };

  const handleKickMember = async (targetUserId: string) => {
    if (!selectedConversation) return;
    if (!confirm("آیا از حذف این کاربر از گروه اطمینان دارید؟")) return;
    
    const { error } = await chatApi.kickMember(selectedConversation.id, targetUserId);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "موفق", description: "کاربر از گروه حذف شد" });
    loadConversations();
  };

  const handleAddParticipant = async (user: ChatUser) => {
    if (!selectedConversation) return;
    const { error } = await chatApi.addParticipants(selectedConversation.id, [user.id]);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "موفق", description: "کاربر اضافه شد" });
    loadConversations();
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversation) return;
    const { error } = await chatApi.deleteMessage(selectedConversation.id, messageId);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    setMessages(prev => prev.filter(m => m.id !== messageId));
    toast({ title: "حذف شد", description: "پیام حذف شد" });
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    if (!confirm("آیا از حذف این گفتگو اطمینان دارید؟")) return;
    
    const { error } = await chatApi.deleteConversation(selectedConversation.id);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
    setSelectedConversation(null);
    setMessages([]);
    toast({ title: "حذف شد", description: "گفتگو حذف شد" });
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.is_group) return conv.name || "گروه";
    const other = conv.participants?.find(p => p.id !== currentUserId);
    return other?.full_name || other?.username || "چت";
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.is_group) return conv.group_picture || null;
    const other = conv.participants?.find(p => p.id !== currentUserId);
    return other?.profile_picture;
  };

  const isImageFile = (fileName: string | null) => {
    if (!fileName) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  const isAudioFile = (fileName: string | null) => {
    if (!fileName) return false;
    return /\.(mp3|wav|ogg|webm|m4a)$/i.test(fileName);
  };

  const isUserAdmin = (conv: Conversation, userId: string) => {
    return conv.admin_ids?.includes(userId) || conv.created_by === userId;
  };

  const currentUserIsAdmin = selectedConversation ? isUserAdmin(selectedConversation, currentUserId) : false;

  if (loading) {
    return (
      <Card className="p-6 border-2 h-[500px] flex items-center justify-center">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </Card>
    );
  }

  return (
    <Card className="border-2 h-[500px] flex overflow-hidden">
      {/* Conversation List */}
      <div className={`w-full md:w-1/3 border-l border-border flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 border-b border-border flex items-center gap-2">
          <h3 className="font-bold flex-1">پیام‌ها</h3>
          <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="گروه جدید">
                <Users className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>ایجاد گروه جدید</DialogTitle>
                <DialogDescription>یک نام برای گروه انتخاب کنید و اعضا را اضافه کنید</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="نام گروه"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="text-right"
                />
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجوی کاربر..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="text-right pr-10"
                  />
                </div>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div key={user.id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm">
                        <span>{user.full_name || user.username}</span>
                        <button onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-auto">
                    {searchResults.filter(u => !selectedUsers.find(s => s.id === u.id)).map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUsers(prev => [...prev, user])}
                        className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-right"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.profile_picture || undefined} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        <span>{user.full_name || user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button onClick={createGroup} className="w-full" disabled={!groupName.trim() || selectedUsers.length === 0}>
                  ایجاد گروه
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="چت جدید">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>چت جدید</DialogTitle>
                <DialogDescription>کاربر مورد نظر را جستجو کنید</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجوی نام..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="text-right pr-10"
                  />
                </div>
                {isSearching && <p className="text-sm text-muted-foreground text-center">در حال جستجو...</p>}
                <div className="space-y-2 max-h-60 overflow-auto">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => startDirectMessage(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-right"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.profile_picture || undefined} />
                        <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.username}</p>
                      </div>
                    </button>
                  ))}
                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <p className="text-sm text-muted-foreground text-center py-4">کاربری یافت نشد</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>هیچ پیامی ندارید</p>
              <p className="text-sm">از دکمه + برای شروع چت استفاده کنید</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full flex items-center gap-3 p-3 border-b border-border hover:bg-muted transition-colors text-right ${
                  selectedConversation?.id === conv.id ? 'bg-muted' : ''
                }`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={getConversationAvatar(conv) || undefined} />
                  <AvatarFallback>
                    {conv.is_group ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getConversationName(conv)}</p>
                  {conv.last_message && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message.content || "📎 فایل"}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarImage src={getConversationAvatar(selectedConversation) || undefined} />
                <AvatarFallback>
                  {selectedConversation.is_group ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{getConversationName(selectedConversation)}</p>
                {selectedConversation.is_group && selectedConversation.participants && (
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.participants.length} عضو
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleDeleteConversation}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="حذف گفتگو"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              {selectedConversation.is_group && (
                <Dialog open={showGroupSettings} onOpenChange={(open) => {
                  setShowGroupSettings(open);
                  if (open) {
                    setEditGroupName(selectedConversation.name || "");
                    setSearchQuery("");
                    setSearchResults([]);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>تنظیمات گروه</DialogTitle>
                      <DialogDescription>مدیریت گروه و اعضا</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Group Picture - Only for admins */}
                      {currentUserIsAdmin && (
                        <div className="flex flex-col items-center gap-3">
                          <Avatar className="w-20 h-20 border-2 border-border">
                            <AvatarImage src={selectedConversation.group_picture || undefined} />
                            <AvatarFallback><Users className="w-10 h-10" /></AvatarFallback>
                          </Avatar>
                          <input
                            type="file"
                            ref={groupPictureInputRef}
                            onChange={handleGroupPictureUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => groupPictureInputRef.current?.click()}
                            disabled={uploading}
                            className="gap-2"
                          >
                            <ImageIcon className="w-4 h-4" />
                            {uploading ? "در حال آپلود..." : "تغییر تصویر گروه"}
                          </Button>
                        </div>
                      )}

                      {/* Rename Group - Only for admins */}
                      {currentUserIsAdmin && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">تغییر نام گروه</label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="نام جدید گروه"
                              value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              className="text-right flex-1"
                            />
                            <Button size="icon" onClick={handleRenameGroup} disabled={!editGroupName.trim()}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Add Members - Only for admins */}
                      {currentUserIsAdmin && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">اضافه کردن عضو</label>
                          <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="جستجوی کاربر..."
                              value={searchQuery}
                              onChange={(e) => handleSearch(e.target.value)}
                              className="text-right pr-10"
                            />
                          </div>
                          {searchResults.length > 0 && (
                            <div className="border rounded-lg max-h-32 overflow-auto">
                              {searchResults
                                .filter(u => !selectedConversation.participants?.find(p => p.id === u.id))
                                .map(user => (
                                  <button
                                    key={user.id}
                                    onClick={() => handleAddParticipant(user)}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-right"
                                  >
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={user.profile_picture || undefined} />
                                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                    </Avatar>
                                    <span>{user.full_name || user.username}</span>
                                    <UserPlus className="w-4 h-4 mr-auto text-muted-foreground" />
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Members List */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">اعضای گروه</label>
                        <div className="border rounded-lg max-h-48 overflow-auto">
                          {selectedConversation.participants?.map(user => {
                            const userIsAdmin = isUserAdmin(selectedConversation, user.id);
                            const isCreator = selectedConversation.created_by === user.id;
                            return (
                              <div
                                key={user.id}
                                className="flex items-center gap-3 p-2 border-b last:border-b-0"
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={user.profile_picture || undefined} />
                                  <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                </Avatar>
                                <span className="flex-1">{user.full_name || user.username}</span>
                                {userIsAdmin && (
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    {isCreator ? "سازنده" : "ادمین"}
                                  </span>
                                )}
                                {currentUserIsAdmin && user.id !== currentUserId && !isCreator && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => userIsAdmin ? handleRemoveAdmin(user.id) : handleMakeAdmin(user.id)}
                                      className="text-xs"
                                    >
                                      {userIsAdmin ? "برداشتن ادمین" : "ادمین کردن"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleKickMember(user.id)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                                      title="حذف از گروه"
                                    >
                                      <UserMinus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Leave Group Button */}
                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={handleLeaveGroup}
                      >
                        <LogOut className="w-4 h-4" />
                        خروج از گروه
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(msg => {
                  const isOwn = msg.sender_id === currentUserId;
                  const showAvatar = selectedConversation.is_group && !isOwn && msg.sender;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-start' : 'justify-end'} group`}>
                      {showAvatar && (
                        <Avatar className="w-8 h-8 shrink-0 ml-2 order-3">
                          <AvatarImage src={msg.sender?.profile_picture || undefined} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] ${isOwn ? 'order-1' : 'order-2'} relative`}>
                        {!isOwn && msg.sender && selectedConversation.is_group && (
                          <p className="text-xs text-muted-foreground mb-1 text-right">
                            {msg.sender.full_name || msg.sender.username}
                          </p>
                        )}
                        <div className={`rounded-lg p-3 ${
                          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          {msg.file_url && (
                            <div className="mb-2">
                              {isImageFile(msg.file_name) ? (
                                <img 
                                  src={msg.file_url} 
                                  alt={msg.file_name || "تصویر"} 
                                  className="max-w-full rounded-lg cursor-pointer"
                                  onClick={() => window.open(msg.file_url!, '_blank')}
                                />
                              ) : isAudioFile(msg.file_name) ? (
                                <audio 
                                  controls 
                                  src={msg.file_url} 
                                  className="max-w-full"
                                />
                              ) : (
                                <a 
                                  href={msg.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-background/20 rounded"
                                >
                                  <FileText className="w-5 h-5" />
                                  <span className="text-sm truncate">{msg.file_name || "فایل"}</span>
                                </a>
                              )}
                            </div>
                          )}
                          {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-start' : 'justify-end'}`}>
                          <p className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {isOwn && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                              title="حذف پیام"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isRecording}
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </Button>
              {isRecording ? (
                <>
                  <div className="flex-1 flex items-center justify-center gap-2 text-destructive">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
                  </div>
                  <Button 
                    size="icon" 
                    variant="destructive"
                    onClick={stopRecording}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={startRecording}
                    disabled={uploading}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="پیام خود را بنویسید..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1 text-right"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>یک گفتگو را انتخاب کنید</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};