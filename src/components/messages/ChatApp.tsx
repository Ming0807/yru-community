'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, ArrowLeft, MoreVertical, MessageSquare, Loader2 } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { Message, Profile } from '@/types';
import { toast } from 'sonner';

// Type for a conversation item in the sidebar
interface Conversation {
  userId: string;
  profile: Profile;
  lastMessage: Message;
  unreadCount?: number;
}

interface ChatAppProps {
  currentUser: Profile;
}

export default function ChatApp({ currentUser }: ChatAppProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get('u');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const typingChannelRef = useRef<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Send typing indicator with debounce
  const sendTypingIndicator = useCallback(() => {
    if (!selectedUserId || !typingChannelRef.current) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, isTyping: true },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: false },
      });
    }, 2000);
  }, [selectedUserId, currentUser.id]);

  // Set up typing channel
  useEffect(() => {
    if (!selectedUserId) {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      setIsTyping(false);
      return;
    }
    
    const channelName = `typing:${[currentUser.id, selectedUserId].sort().join(':')}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'typing' }, (payload: { userId: string; isTyping: boolean }) => {
        if (payload.userId === selectedUserId) {
          setIsTyping(payload.isTyping);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [selectedUserId, currentUser.id, supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load all user's messages to build conversation list
  useEffect(() => {
    const fetchConversations = async () => {
      // Get all messages where I'm sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(*),
          receiver:profiles!receiver_id(*)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Group by the "other" user
      const convosMap = new Map<string, Conversation>();
      
      for (const msg of (data as any[])) {
        const isMeSender = msg.sender_id === currentUser.id;
        const otherUser = isMeSender ? msg.receiver : msg.sender;
        const otherUserId = otherUser.id;

        if (!convosMap.has(otherUserId)) {
          convosMap.set(otherUserId, {
            userId: otherUserId,
            profile: otherUser,
            lastMessage: msg,
            unreadCount: (!isMeSender && !msg.is_read) ? 1 : 0
          });
        } else {
          // Add to unread count if it's unread and from them
          if (!isMeSender && !msg.is_read) {
            const current = convosMap.get(otherUserId)!;
            current.unreadCount = (current.unreadCount || 0) + 1;
          }
        }
      }

      setConversations(Array.from(convosMap.values()));
      setLoadingInitial(false);
    };

    fetchConversations();
  }, [currentUser.id]);

  // Fetch messages for selected user
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      setMessages([]);
      return;
    }

    const fetchChat = async () => {
      // First get the user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedUserId)
        .single();
        
      if (profile) setSelectedUser(profile);

      // Now fetch messages
      const { data: chatMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat:', error);
        return;
      }

      setMessages(chatMessages as Message[]);

      // Mark as read
      const unreadIds = (chatMessages as Message[])
        .filter((m: Message) => m.receiver_id === currentUser.id && !m.is_read)
        .map((m: Message) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
          
        // Update local state for conversations
        setConversations(prev => prev.map(c => 
          c.userId === selectedUserId ? { ...c, unreadCount: 0 } : c
        ));
      }
    };

    fetchChat();

  }, [selectedUserId, currentUser.id]);

  // Set up Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        async (payload: any) => {
          const newMsg = payload.new as Message;
          
          // If the message is from the currently selected user, add it to chat array
          if (newMsg.sender_id === selectedUserId) {
            setMessages(prev => [...prev, newMsg]);
            
            // Auto mark as read
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          } else {
            // Otherwise just update the conversation list to show unread
            // First we need the sender profile if it's a new conversation
            let senderProfile = conversations.find(c => c.userId === newMsg.sender_id)?.profile;
            
            if (!senderProfile) {
              const { data } = await supabase.from('profiles').select('*').eq('id', newMsg.sender_id).single();
              senderProfile = data;
            }

            if (senderProfile) {
              setConversations(prev => {
                const existing = prev.find(c => c.userId === newMsg.sender_id);
                const updatedItem = {
                  userId: newMsg.sender_id,
                  profile: senderProfile!,
                  lastMessage: newMsg,
                  unreadCount: (existing?.unreadCount || 0) + 1
                };
                return [updatedItem, ...prev.filter(c => c.userId !== newMsg.sender_id)];
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, selectedUserId, conversations]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    const tempMsg: Message = {
      id: crypto.randomUUID(),
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: inputText.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages(prev => [...prev, tempMsg]);
    setInputText('');

    // Update conversation list
    setConversations(prev => {
      const existing = prev.find(c => c.userId === selectedUser.id);
      const updatedItem = {
        userId: selectedUser.id,
        profile: selectedUser,
        lastMessage: tempMsg,
        unreadCount: 0
      };
      return [updatedItem, ...prev.filter(c => c.userId !== selectedUser.id)];
    });

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: tempMsg.content
      });

    if (error) {
      toast.error('ไม่สามารถส่งข้อความได้');
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex bg-card border rounded-2xl overflow-hidden h-[calc(100vh-140px)] min-h-[500px]">
      {/* Sidebar - Contacts */}
      <div className={`w-full md:w-80 border-r flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-4">กล่องข้อความ</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="ค้นหาผู้สนทนา..." 
              className="pl-9 bg-muted/50 border-none rounded-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingInitial ? (
            <div className="p-4 text-center text-muted-foreground text-sm">กำลังโหลด...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>ยังไม่มีข้อความ</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.userId}
                onClick={() => router.push(`/messages?u=${conv.userId}`)}
                className={`w-full text-left p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b last:border-0 ${
                  selectedUserId === conv.userId ? 'bg-muted/80' : ''
                }`}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={conv.profile.avatar_url || ''} />
                    <AvatarFallback className="bg-(--color-yru-pink)/10 text-(--color-yru-pink)">
                      {conv.profile.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {conv.unreadCount! > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-card">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-semibold text-sm truncate pr-2">{conv.profile.display_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessage.created_at)}</span>
                  </div>
                  <p className={`text-xs truncate ${conv.unreadCount! > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {conv.lastMessage.sender_id === currentUser.id ? 'คุณ: ' : ''}{conv.lastMessage.content}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-muted/10 ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-16 w-16 mb-4 opacity-10" />
            <p className="text-lg font-medium">เลือกแชทเพื่อเริ่มสนทนา</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b bg-card flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden -ml-2 rounded-full" onClick={() => router.push('/messages')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedUser.avatar_url || ''} />
                <AvatarFallback className="bg-(--color-yru-green)/10 text-(--color-yru-green-dark)">
                  {selectedUser.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selectedUser.display_name}</h3>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUser.id;
                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                
                return (
                  <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className="shrink-0 w-8">
                      {showAvatar && !isMe && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedUser.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">{selectedUser.display_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-(--color-yru-pink) text-white rounded-tr-sm' 
                          : 'bg-card border shadow-sm rounded-tl-sm text-foreground'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex gap-2 max-w-[85%]">
                  <div className="shrink-0 w-8">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedUser.avatar_url || ''} />
                      <AvatarFallback className="text-[10px]">{selectedUser.display_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="bg-card border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-card border-t">
              {isTyping && (
                <div className="flex items-center gap-1.5 px-2 mb-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{selectedUser.display_name} กำลังพิมพ์...</span>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (e.target.value.trim()) sendTypingIndicator();
                  }}
                  placeholder="พิมพ์ข้อความ..."
                  className="rounded-full bg-muted/50 border-none px-4"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!inputText.trim()}
                  className="rounded-full shrink-0 bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
