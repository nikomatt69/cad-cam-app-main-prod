// src/store/chatStore.ts
import create from 'zustand';

export interface User {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
  joinedAt?: string;
  lastReadAt?: Date | null;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroupChat: boolean;
  organizationId: string;
  participants: User[];
  lastMessage?: Message | null;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
  lastReadAt?: Date | null;
}

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  hasMoreMessages: boolean;
  nextCursor: string | null;
  error: string | null;
  
  // Actions
  fetchConversations: (organizationId: string) => Promise<void>;
  fetchConversation: (conversationId: string) => Promise<void>;
  fetchMessages: (conversationId: string, cursor?: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  createConversation: (
    organizationId: string, 
    participantIds: string[], 
    name?: string, 
    isGroupChat?: boolean
  ) => Promise<Conversation | null>;
  clearActiveConversation: () => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => Promise<void>;
}

const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  hasMoreMessages: false,
  nextCursor: null,
  error: null,
  
  fetchConversations: async (organizationId: string) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const response = await fetch(`/api/organizations/${organizationId}/conversations`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      set({ conversations: data, isLoadingConversations: false });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoadingConversations: false 
      });
    }
  },
  
  fetchConversation: async (conversationId: string) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const data = await response.json();
      set({ activeConversation: data, isLoadingConversations: false });
      
      // Also fetch messages for this conversation
      await get().fetchMessages(conversationId);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoadingConversations: false 
      });
    }
  },
  
  fetchMessages: async (conversationId: string, cursor?: string) => {
    set(state => ({ 
      isLoadingMessages: !cursor || state.messages.length === 0, 
      error: null 
    }));
    
    try {
      const url = cursor
        ? `/api/conversations/${conversationId}/messages?cursor=${cursor}&limit=20`
        : `/api/conversations/${conversationId}/messages?limit=20`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data: MessagesResponse = await response.json();
      
      set(state => ({
        messages: cursor 
          ? [...state.messages, ...data.messages] 
          : data.messages,
        hasMoreMessages: data.hasMore,
        nextCursor: data.nextCursor,
        isLoadingMessages: false
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoadingMessages: false 
      });
    }
  },
  
  sendMessage: async (conversationId: string, content: string) => {
    set({ isSending: true, error: null });
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const message = await response.json();
      
      // Add message to the list and update conversation
      set(state => ({
        messages: [message, ...state.messages],
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: message,
                updatedAt: new Date().toISOString()
              }
            : conv
        ),
        isSending: false
      }));
      
      // Mark conversation as read after sending a message
      await get().markAsRead(conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isSending: false 
      });
    }
  },
  
  markAsRead: async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST'
      });
      
      // Update local state to reflect that messages have been read
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                lastReadAt: new Date()
              }
            : conv
        ),
        activeConversation: state.activeConversation && state.activeConversation.id === conversationId
          ? {
              ...state.activeConversation,
              lastReadAt: new Date()
            }
          : state.activeConversation
      }));
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  },
  
  createConversation: async (
    organizationId: string, 
    participantIds: string[], 
    name?: string, 
    isGroupChat: boolean = false
  ) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const response = await fetch(`/api/organizations/${organizationId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          participantIds,
          isGroupChat
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      
      const conversation = await response.json();
      
      // Add the new conversation to the list
      set(state => ({
        conversations: [conversation, ...state.conversations],
        activeConversation: conversation,
        isLoadingConversations: false
      }));
      
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoadingConversations: false 
      });
      return null;
    }
  },
  
  clearActiveConversation: () => {
    set({ 
      activeConversation: null, 
      messages: [], 
      hasMoreMessages: false, 
      nextCursor: null 
    });
  },
  
  updateConversation: async (conversationId: string, updates: Partial<Conversation>) => {
    set({ isLoadingConversations: true, error: null });
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update conversation');
      }
      
      const updatedConversation = await response.json();
      
      // Update the conversation in the lists
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId ? updatedConversation : conv
        ),
        activeConversation: state.activeConversation?.id === conversationId
          ? updatedConversation
          : state.activeConversation,
        isLoadingConversations: false
      }));
    } catch (error) {
      console.error('Error updating conversation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoadingConversations: false 
      });
    }
  }
}));

export default useChatStore;