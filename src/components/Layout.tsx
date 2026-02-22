// ═══════════════════════════════════════════════════
// neoAI — Layout Component
// ═══════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { Sidebar, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_WIDTH_KEY, SIDEBAR_COLLAPSED_KEY } from './Sidebar';
import { ChatWindow } from './ChatWindow';
import { useAuth } from '../hooks/useAuth';
import { useModels } from '../hooks/useModels';
import { useSessions } from '../hooks/useSessions';
import { useChat } from '../hooks/useChat';
import { FullPageLoader } from './LoadingSpinner';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar width + collapsed state persisted in localStorage
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) || SIDEBAR_DEFAULT_WIDTH : SIDEBAR_DEFAULT_WIDTH;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  const handleWidthChange = useCallback((w: number) => {
    setSidebarWidth(w);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
  }, []);

  const handleCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, []);

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
      setSidebarOpen(false);
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

  const handleLogin = useCallback(() => {
    // Redirect to Cloudflare Access login which uses Google SSO
    // The CF Access team domain handles the IdP redirect
    const teamDomain = (window as any).__CF_ACCESS_TEAM_DOMAIN;
    if (teamDomain) {
      window.location.href = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/login/${window.location.hostname}?redirect_url=${encodeURIComponent(window.location.href)}`;
    } else {
      // In dev mode, just reload to trigger the dev-user bypass
      window.location.reload();
    }
  }, []);

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

  // Auth error — show login screen
  if (auth.error) {
    return <LoginScreen onLogin={handleLogin} error={auth.error} />;
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
        collapsed={sidebarCollapsed}
        onCollapse={handleCollapse}
        width={sidebarWidth}
        onWidthChange={handleWidthChange}
        onLogin={handleLogin}
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

/** Full-page login screen with Google SSO */
function LoginScreen({ onLogin, error }: { onLogin: () => void; error: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-100">neoAI</h1>
          <p className="text-gray-400 text-sm mt-1">AI-powered chat at the edge</p>
        </div>

        {/* Login card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-100 text-center mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm text-center mb-6">Sign in to continue to neoAI</p>

          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {error && (
            <p className="text-xs text-gray-500 text-center mt-4">{error}</p>
          )}
        </div>

        <p className="text-xs text-gray-600 text-center mt-6">
          Secured by Cloudflare Zero Trust
        </p>
      </div>
    </div>
  );
}
