import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">Oops! Une erreur s'est produite</h1>
            <p className="text-gray-400 mb-6">L'application a rencontré un problème inattendu.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import MobileHomePage from "@/pages/mobile-home-page";
import CreatePage from "@/pages/create-page";
import AuthPage from "@/pages/auth-page";
import MapPage from "@/pages/map-page";
import FeedPage from "@/pages/feed-page";
import ProfilePage from "@/pages/profile-page";
import SearchPage from "@/pages/search-page";
import ModerationTestPage from "@/pages/moderation-test-page";
import MessagesPage from "@/pages/messages-page";
import ConversationPage from "@/pages/conversation-page";
import UserProfilePage from "@/pages/user-profile-page";
import NotificationsPage from "@/pages/notifications-page";
import BlockedUsersPage from "@/pages/blocked-users-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import GbairaiPage from "@/pages/gbairai-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import AboutPage from "@/pages/about-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MobileHomePage} />
      <ProtectedRoute path="/create" component={CreatePage} />
      <ProtectedRoute path="/map" component={MapPage} />
      <ProtectedRoute path="/feed" component={FeedPage} />
      <ProtectedRoute path="/search" component={SearchPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/profile/:userId" component={UserProfilePage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/messages/:id" component={ConversationPage} />
      <ProtectedRoute path="/blocked-users" component={BlockedUsersPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/gbairai/:id" component={GbairaiPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/moderation-test" component={ModerationTestPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;