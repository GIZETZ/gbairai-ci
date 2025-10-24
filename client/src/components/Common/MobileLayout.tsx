import React, { ReactNode, useState, useEffect } from "react";
import { MobileNavigation } from "./MobileNavigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Bell } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  showTopButtons?: boolean;
  renderBelowSubtitle?: ReactNode;
  renderRightExtras?: ReactNode;
}

export function MobileLayout({ children, className, showTopButtons = true, renderBelowSubtitle, renderRightExtras }: MobileLayoutProps) {
  const { user } = useAuth();
  const [isNavVisible, setIsNavVisible] = useState(true);

  // Fonction globale pour contrôler la navigation
  React.useEffect(() => {
    (window as any).toggleMobileNavigation = () => {
      setIsNavVisible(prev => !prev);
    };

    (window as any).hideMobileNavigation = () => {
      setIsNavVisible(false);
    };

    (window as any).showMobileNavigation = () => {
      setIsNavVisible(true);
    };

    return () => {
      delete (window as any).toggleMobileNavigation;
      delete (window as any).hideMobileNavigation;
      delete (window as any).showMobileNavigation;
    };
  }, []);

  // Récupérer les notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    enabled: !!user,
    refetchInterval: 10000, // Actualiser toutes les 10 secondes
    staleTime: 0, // Les données sont toujours considérées comme obsolètes
    refetchOnWindowFocus: true, // Actualiser quand la fenêtre reprend le focus
  });

  // Compter les notifications non lues
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border px-4 py-3 safe-area-pt">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gbairai</h1>
            <p className="text-sm text-muted-foreground">Racont' ton Gbairai, on t'écoute sans te voir.</p>
            {renderBelowSubtitle && (
              <div className="mt-2 flex justify-center">
                {renderBelowSubtitle}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/notifications">
              <Button variant="ghost" size="sm" className="hover:bg-muted relative">
                <Bell className="h-5 w-5" />
                {/* Badge de notification dynamique */}
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 py-0.5 min-w-0 h-4 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm" className="hover:bg-muted">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            {renderRightExtras}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 pt-20 pb-20 safe-area-pt safe-area-pb",
        className
      )}>
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 bg-background border-t border-border",
        isNavVisible ? "translate-y-0" : "translate-y-full"
      )}>
        <MobileNavigation />
      </div>
    </div>
  );
}