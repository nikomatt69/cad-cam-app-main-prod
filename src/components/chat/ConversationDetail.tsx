// src/components/chat/ConversationDetail.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Info, User, Users, Send, MoreVertical } from 'react-feather';
import useChatStore, { Message } from '@/src/store/chatStore';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';

interface ConversationDetailProps {
  conversationId: string;
  organizationId: string;
  onBack?: () => void;
}

const ConversationDetail: React.FC<ConversationDetailProps> = ({ 
  conversationId, 
  organizationId,
  onBack 
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  
  const { 
    activeConversation,
    messages,
    isLoadingMessages,
    hasMoreMessages,
    nextCursor,
    isSending,
    fetchConversation,
    fetchMessages,
    sendMessage,
    markAsRead
  } = useChatStore();
  
  useEffect(() => {
    if (conversationId) {
      fetchConversation(conversationId);
    }
    
    // Mark as read when component mounts
    if (conversationId) {
      markAsRead(conversationId);
    }
  }, [conversationId, fetchConversation, markAsRead]);
  
  useEffect(() => {
    // Scroll to bottom when messages change, if not scrolled up
    if (messagesEndRef.current && !isScrolledUp) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isScrolledUp]);
  
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Check if scrolled up
      setIsScrolledUp(scrollTop < scrollHeight - clientHeight - 10);
      
      // Check if scrolled to top to load more messages
      if (scrollTop === 0 && hasMoreMessages && nextCursor) {
        fetchMessages(conversationId, nextCursor);
      }
    }
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (messageInput.trim() && conversationId) {
      sendMessage(conversationId, messageInput.trim());
      setMessageInput('');
      // Reset scroll position to show new message
      setIsScrolledUp(false);
    }
  };
  
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    return isToday 
      ? format(date, 'HH:mm') 
      : format(date, 'dd/MM/yyyy HH:mm');
  };
  
  const renderMessageBubble = (message: Message, isCurrentUser: boolean) => {
    return (
      <div
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
        key={message.id}
      >
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-2">
            {message.sender?.image ? (
              <Image
                src={message.sender.image}
                alt={message.sender?.name || 'User'}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
        )}
        
        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-end">
            {!isCurrentUser && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                {message.sender?.name || 'Unknown User'}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
          
          <div
            className={`mt-1 px-4 py-2 rounded-xl max-w-xs sm:max-w-md break-words ${
              isCurrentUser
                ? 'bg-blue-600 text-white dark:bg-blue-700 rounded-br-none'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 rounded-bl-none'
            }`}
          >
            {message.content}
          </div>
        </div>
        
        {isCurrentUser && (
          <div className="flex-shrink-0 ml-2">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session?.user?.name || 'You'}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  if (!activeConversation && isLoadingMessages) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!activeConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <MessageCircle className="h-16 w-16 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Seleziona una conversazione</h2>
        <p className="text-sm">Scegli una chat esistente o iniziane una nuova</p>
      </div>
    );
  }
  
  const conversationName = activeConversation.name || 
    activeConversation.participants
      .filter(p => p.id !== session?.user?.id)
      .map(p => p.name)
      .join(', ');
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <button
          onClick={onBack}
          className="md:hidden mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex-shrink-0">
          {activeConversation.isGroupChat ? (
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
            {conversationName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {activeConversation.participants.length} partecipanti
          </p>
        </div>
        
        <button 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          title="Informazioni"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>
      
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {hasMoreMessages && (
          <div className="flex justify-center my-2">
            <button
              onClick={() => nextCursor && fetchMessages(conversationId, nextCursor)}
              className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            >
              Carica messaggi precedenti
            </button>
          </div>
        )}
        
        {isLoadingMessages && !messages.length ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <MessageSquare className="h-12 w-12 mb-3" />
            <p className="text-center">
              Non ci sono ancora messaggi. <br />
              Invia il primo messaggio!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              renderMessageBubble(message, message.senderId === session?.user?.id)
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-end">
          <div className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 bg-white dark:bg-gray-700 overflow-hidden">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="block w-full p-3 border-0 focus:ring-0 resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (messageInput.trim()) {
                    handleSendMessage(e);
                  }
                }
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!messageInput.trim() || isSending}
            className="ml-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationDetail;

// Add missing icons
const MessageCircle = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const MessageSquare = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);