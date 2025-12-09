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
import { secureApi } from "@/lib/secure-api";
import { 
  MessageSquare, Send, Plus, User, Search, 
  Paperclip, FileText, Image, ArrowLeft 
} from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  grade: string;
  user_id: string;
}

interface AdminChatPanelProps {
  currentUserId: string;
}

export const AdminChatPanel = ({ currentUserId }: AdminChatPanelProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    const { data, error } = await chatApi.getConversations();
    if (!error && data) {
      setConversations(data);
    }
    setLoading(false);
  }, []);

  const loadStudents = useCallback(async () => {
    const { data, error } = await secureApi.select<Student>('students');
    if (!error && data) {
      setStudents(data);
      setFilteredStudents(data);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await chatApi.getMessages(conversationId);
    if (!error && data) {
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadStudents();
  }, [loadConversations, loadStudents]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation, loadMessages]);

  // Real-time message subscription
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`admin-messages-${selectedConversation.id}`)
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) {
      setFilteredStudents(students);
      return;
    }
    const filtered = students.filter(s => 
      s.full_name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredStudents(filtered);
  };

  const startDirectMessage = async (student: Student) => {
    const studentUser: ChatUser = {
      id: student.user_id,
      username: student.full_name,
      full_name: student.full_name,
      profile_picture: null
    };
    
    const { data, existing, error } = await chatApi.createConversation([student.user_id]);
    if (error) {
      toast({ title: "خطا", description: error, variant: "destructive" });
      return;
    }
    if (data) {
      if (!existing) {
        setConversations(prev => [{ ...data, participants: [studentUser] }, ...prev]);
      }
      const conv = existing 
        ? conversations.find(c => c.id === data.id) || { ...data, participants: [studentUser] }
        : { ...data, participants: [studentUser] };
      setSelectedConversation(conv);
      setShowNewChat(false);
      setSearchQuery("");
      setFilteredStudents(students);
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

  const getConversationName = (conv: Conversation) => {
    if (conv.is_group) return conv.name || "گروه";
    const other = conv.participants?.find(p => p.id !== currentUserId);
    return other?.full_name || other?.username || "چت";
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.is_group) return null;
    const other = conv.participants?.find(p => p.id !== currentUserId);
    return other?.profile_picture;
  };

  const isImageFile = (fileName: string | null) => {
    if (!fileName) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

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
          <h3 className="font-bold flex-1">پیام به دانش‌آموزان</h3>
          <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="چت جدید">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>پیام به دانش‌آموز</DialogTitle>
                <DialogDescription>دانش‌آموز مورد نظر را انتخاب کنید</DialogDescription>
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
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {filteredStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => startDirectMessage(student)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-right"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">پایه: {student.grade}</p>
                        </div>
                      </button>
                    ))}
                    {filteredStudents.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">دانش‌آموزی یافت نشد</p>
                    )}
                  </div>
                </ScrollArea>
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
                    <User className="w-5 h-5" />
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
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <p className="font-medium flex-1">{getConversationName(selectedConversation)}</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={msg.sender?.profile_picture || undefined} />
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${msg.sender_id === currentUserId ? 'text-right' : ''}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          msg.sender_id === currentUserId
                            ? 'bg-foreground text-background'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                        {msg.file_url && (
                          isImageFile(msg.file_name) ? (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={msg.file_url} 
                                alt={msg.file_name || "تصویر"} 
                                className="max-w-full rounded mt-2 cursor-pointer hover:opacity-90"
                              />
                            </a>
                          ) : (
                            <a 
                              href={msg.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 mt-2 text-sm underline"
                            >
                              <FileText className="w-4 h-4" />
                              {msg.file_name || "فایل"}
                            </a>
                          )
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border flex gap-2">
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
                disabled={uploading}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                placeholder="پیام خود را بنویسید..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="flex-1 text-right"
                dir="rtl"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>یک دانش‌آموز انتخاب کنید</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
