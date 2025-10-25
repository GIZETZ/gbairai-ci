import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  isPostLoginLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = {
  email: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isPostLoginLoading, setIsPostLoginLoading] = useState(false);

  async function attemptEnablePushNotifications() {
    try {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;
      // Si déjà accordé, s'assurer d'être souscrit côté serveur
      const { requestNotificationPermission, subscribeToPushNotifications } = await import('@/serviceWorkerRegistration');
      if (Notification.permission === 'granted') {
        await subscribeToPushNotifications();
        return;
      }
      // Demander la permission une fois juste après connexion
      const granted = await requestNotificationPermission();
      if (granted) {
        await subscribeToPushNotifications();
      }
    } catch (e) {
      // Best-effort, ne bloque pas le login
      console.warn('Activation push ignorée:', e);
    }
  }

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${user.username} !`,
      });
      // Activer les notifications par défaut (prompt auto)
      attemptEnablePushNotifications();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Inscription réussie",
        description: `Bienvenue dans Gbairai ${user.username} !`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

    // Déclencher l'écran de chargement quand un utilisateur vient de se connecter
    useEffect(() => {
      if (user && !isLoading) {
        const wasJustLoggedIn = !localStorage.getItem('user_session_started');
        if (wasJustLoggedIn) {
          setIsPostLoginLoading(true);
          localStorage.setItem('user_session_started', 'true');

          // Tenter d'activer les notifications au premier lancement de session
          attemptEnablePushNotifications();

          // Afficher l'écran de chargement pendant 15 secondes
          setTimeout(() => {
            setIsPostLoginLoading(false);
          }, 15000);
        }
      }
    }, [user, isLoading]);
  
    // Nettoyer le flag de session au logout
    useEffect(() => {
      if (!user && !isLoading) {
        localStorage.removeItem('user_session_started');
      }
    }, [user, isLoading]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isPostLoginLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}