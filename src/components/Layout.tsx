// ═══════════════════════════════════════════════════
// neoAI — Layout Component
// ═══════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { useAuth } from '../hooks/useAuth';
import { useModels } from '../hooks/useModels';
import { useSessions } from '../hooks/useSessions';
import { useChat } from '../hooks/useChat';
import { FullPageLoader } from './LoadingSpinner';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const auth = useAuth();
  const modelsState = useModels();
  const sessionsState = useSessions();
  const chatState = useChat();

  // Load session when selected from sidebar
  useEffect(() => {
    if (sessionsState.activeSessionId) {
      chatState.loadSession(sessionsState.activeSessionId);
    }
  }, [sessionsState.activeSessionId]);

  const handleSend = useCallback(
    (message: string) => {
      chatState.sendMessage(message, modelsState.selectedModel);
    },
    [chatState.sendMessage, modelsState.selectedModel],
  );

  const handleNewChat = useCallback(() => {
    chatState.newChat();
    sessionsState.selectSession(null);
  }, [chatState.newChat, sessionsState.selectSession]);

  const handleSelectSession = useCallback(
    (id: string) => {
      sessionsState.selectSession(id);
      setSidebarOpen(false); // Close mobile sidebar
    },
    [sessionsState.selectSession],
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await sessionsState.deleteSession(id);
      if (chatState.sessionId === id) {
        chatState.newChat();
      }
    },
    [sessionsState.deleteSession, chatState.sessionId, chatState.newChat],
  );

  // Refresh sessions when a chat completes (new session created)
  useEffect(() => {
    if (chatState.sessionId && !chatState.isStreaming) {
      sessionsState.fetchSessions();
    }
  }, [chatState.sessionId, chatState.isStreaming]);

  // Show loader while auth is checking
  if (auth.loading) {
    return <FullPageLoader />;
  }

  // Auth error — show friendly message
  if (auth.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Authentication Required</h2>
          <p className="text-gray-400 text-sm mb-4">{auth.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 left-3 z-20 p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-gray-200 lg:hidden"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar
        sessions={sessionsState.sessions}
        activeSessionId={sessionsState.activeSessionId}
        user={auth.user}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          messages={chatState.messages}
          models={modelsState.models}
          selectedModel={modelsState.selectedModel}
          isStreaming={chatState.isStreaming}
          error={chatState.error}
          errorRetryable={chatState.errorRetryable}
          onSend={handleSend}
          onStop={chatState.stopStreaming}
          onSelectModel={modelsState.selectModel}
          onClearError={chatState.clearError}
          onNewChat={handleNewChat}
        />
      </main>
    </div>
  );
}
