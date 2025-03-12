// src/components/chat/ConversationList.tsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Users, MessageCircle, Plus, Search, User, UserPlus, Settings
} from 'react-feather';
import useChatStore from '@/src/store/chatStore';
import { formatDistanceToNow, format } from 'date-fns';

interface ConversationListProps {
  organizationId: string;
}

const ConversationList: React.FC<ConversationListProps> = ({ organizationId }) => {
  const router = useRouter();
  const { conversations, isLoadingConversations, fetchConversations, createConversation, error } = useChatStore();
  
  useEffect(() => {
    if (organizationId) {
      fetchConversations(organizationId);
    }
  }, [organizationId, fetchConversations]);
  
  const handleCreateDirectMessage = () => {
    // Navigate to a page to select users or show a modal
    router.push(`/organizations/${organizationId}/chat/new`);
  };
  
  const handleCreateGroupChat = () => {
    // Navigate to a page to create a group chat
    router.push(`/organizations/${organizationId}/chat/new-group`);
  };
  
  const handleSelectConversation = (conversationId: string) => {
    router.push(`/organizations/${organizationId}/chat/${conversationId}`);
  };
  
  const formatLastActive = (date: string) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date');
      }
      
      return formatDistanceToNow(d, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };
  
  const getConversationName = (conversation: any) => {
    if (conversation.name) return conversation.name;
    
    // For direct messages, show the other participant's name
    const otherParticipants = conversation.participants.filter(
      (p: any) => p.id !== '' // Replace with current user ID
    );
    if (otherParticipants.length === 1) {
      return otherParticipants[0].name || 'Unnamed User';
    }
    return otherParticipants.map((p: any) => p.name).join(', ');
  };
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          Messaggi
        </h2>
        
        <div className="mt-2 flex">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cerca conversazioni..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          <div className="ml-2 flex">
            <button
              onClick={handleCreateDirectMessage}
              className="p-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800"
              title="Nuovo messaggio diretto"
            >
              <User className="h-4 w-4" />
            </button>
            <button
              onClick={handleCreateGroupChat}
              className="ml-1 p-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800"
              title="Nuova chat di gruppo"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingConversations ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              Nessuna conversazione
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Inizia una nuova conversazione con un membro dell&apos;organizzazione.
            </p>
            <div className="mt-4 flex justify-center space-x-2">
              <button
                onClick={handleCreateDirectMessage}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <User className="h-3.5 w-3.5 mr-1" />
                Nuovo messaggio
              </button>
              <button
                onClick={handleCreateGroupChat}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                Nuovo gruppo
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => {
              const hasUnread = new Date(conversation.updatedAt) > (conversation.lastReadAt || new Date(0));
              return (
                <li key={conversation.id}>
                  <button
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`w-full flex items-start p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                      hasUnread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {conversation.isGroupChat ? (
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          hasUnread ? 'text-blue-800 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                        } truncate`}>
                          {getConversationName(conversation)}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatLastActive(conversation.updatedAt)}
                        </span>
                      </div>
                      <p className={`text-xs ${
                        hasUnread ? 'font-medium text-blue-800 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                      } truncate mt-1`}>
                        {conversation.lastMessage ? (
                          <>
                            <span className="font-semibold">
                              {conversation.lastMessage.sender?.name === 'You' ? 'Tu: ' : ''}
                            </span>
                            {conversation.lastMessage.content}
                          </>
                        ) : (
                          <span className="italic">Nessun messaggio</span>
                        )}
                      </p>
                    </div>
                    {hasUnread && (
                      <div className="ml-2 flex-shrink-0">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConversationList;