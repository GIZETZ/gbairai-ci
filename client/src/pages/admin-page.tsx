import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Send, MapPin, Calendar, Mail, User, MessageSquare, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  lastLoginAt?: string;
  lastLocation?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  stats: {
    gbairaisCount: number;
    interactionsCount: number;
    messagesCount: number;
  };
}

interface AdminMessage {
  id: number;
  content: string;
  recipientId: number;
  recipientUsername: string;
  sentAt: string;
  readAt?: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

  //New states for reports
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    if (!user || user.email !== 'gbairai.app@gmail.com') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Récupérer les utilisateurs
  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.email === 'gbairai.app@gmail.com',
  });

  // Récupérer les messages admin
  const { data: adminMessages = [] } = useQuery<AdminMessage[]>({
    queryKey: ['/api/admin/messages'],
    enabled: user?.email === 'gbairai.app@gmail.com',
  });

  // Supprimer un utilisateur
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Utilisateur supprimé avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    },
  });

  // Envoyer un message admin
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { userId: number; content: string }) => {
      const response = await apiRequest("POST", "/api/admin/messages", data);
      if (!response.ok) throw new Error("Erreur lors de l'envoi");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Message envoyé avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      setIsMessageDialogOpen(false);
      setMessageContent("");
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
    },
  });

    // Récupérer les signalements
    const { data: reports = [] } = useQuery<any[]>({
      queryKey: ['/api/admin/reports'],
      enabled: user?.email === 'gbairai.app@gmail.com',
    });

    // Traiter un signalement
    const processReportMutation = useMutation({
      mutationFn: async (data: { reportId: number; status: string; adminNote: string }) => {
        const response = await apiRequest("POST", `/api/admin/reports/${data.reportId}/process`, data);
        if (!response.ok) throw new Error("Erreur lors du traitement du signalement");
        return response.json();
      },
      onSuccess: () => {
        toast({ title: "Signalement traité avec succès" });
        // Invalider et forcer le refetch
        queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/gbairais'] });
        queryClient.refetchQueries({ queryKey: ['/api/admin/reports'] });
        setIsReportDialogOpen(false);
        setSelectedReport(null);
      },
      onError: () => {
        toast({ title: "Erreur lors du traitement du signalement", variant: "destructive" });
      },
    });

  const deleteGbairaiMutation = useMutation({
    mutationFn: async (gbairaiId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/gbairais/${gbairaiId}`);
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Gbairai supprimé avec succès" });
      // Invalider toutes les queries liées
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gbairais'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      // Forcer le refetch
      queryClient.refetchQueries({ queryKey: ['/api/admin/reports'] });
      queryClient.refetchQueries({ queryKey: ['/api/gbairais'] });
      setIsReportDialogOpen(false);
      setSelectedReport(null);
    },
    onError: () => {
      toast({ title: "Erreur lors de la suppression du gbairai", variant: "destructive" });
    },
  });

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.email !== 'gbairai.app@gmail.com') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-red-500" />
            Administration Gbairai
          </h1>
          <p className="text-gray-400">Tableau de bord administrateur</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Utilisateurs</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <User className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Gbairais totaux</p>
                  <p className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + u.stats.gbairaisCount, 0)}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Messages admin</p>
                  <p className="text-2xl font-bold">{adminMessages.length}</p>
                </div>
                <Send className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Utilisateurs actifs</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.isActive).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gestion des utilisateurs */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Gestion des utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Recherche */}
            <div className="mb-4">
              <Label htmlFor="search">Rechercher un utilisateur</Label>
              <Input
                id="search"
                type="text"
                placeholder="Nom d'utilisateur ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Tableau des utilisateurs */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Utilisateur</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Localisation</TableHead>
                    <TableHead className="text-gray-300">Statistiques</TableHead>
                    <TableHead className="text-gray-300">Statut</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-gray-400">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLocation ? (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <p className="text-sm">
                                {user.lastLocation.city}, {user.lastLocation.region}
                              </p>
                              {user.lastLocation.latitude && user.lastLocation.longitude && (
                                <p className="text-xs text-gray-400">
                                  {user.lastLocation.latitude.toFixed(4)}, {user.lastLocation.longitude.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Non disponible</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{user.stats.gbairaisCount} gbairais</p>
                          <p>{user.stats.interactionsCount} interactions</p>
                          <p>{user.stats.messagesCount} messages</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsMessageDialogOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 border-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Signalements */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Signalements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Utilisateur</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Raison</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="border-gray-700">
                      <TableCell>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {report.user?.username || 'Utilisateur supprimé'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{report.type}</Badge>
                      </TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setIsReportDialogOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                        >
                          Traiter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reports.length === 0 && (
                <p className="text-center text-gray-400 py-8">Aucun signalement</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages admin récents */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Messages administrateur récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminMessages.slice(0, 10).map((message) => (
                <div key={message.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">@{message.recipientUsername}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(message.sentAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant={message.readAt ? "default" : "secondary"}>
                      {message.readAt ? "Lu" : "Non lu"}
                    </Badge>
                  </div>
                  <p className="text-gray-300">{message.content}</p>
                </div>
              ))}
              {adminMessages.length === 0 && (
                <p className="text-center text-gray-400">Aucun message envoyé</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog de traitement des signalements */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-blue-500">Traiter le signalement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedReport && (
                <div>
                  <p className="text-white mb-2">
                    <strong>Signalé par:</strong> {selectedReport.user?.username}
                  </p>
                  <p className="text-white mb-2">
                    <strong>Raison:</strong> {selectedReport.reason}
                  </p>
                  {selectedReport.type === 'gbairai' && selectedReport.gbairai && (
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-white"><strong>Contenu:</strong></p>
                      <p className="text-gray-300">{selectedReport.gbairai.content}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Par: {selectedReport.gbairai.user?.username || 'Anonyme'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReportDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Annuler
                </Button>
                {selectedReport?.type === 'gbairai' && selectedReport.gbairai && (
                  <Button
                    onClick={() => {
                      if (selectedReport) {
                        deleteGbairaiMutation.mutate(selectedReport.targetId);
                      }
                    }}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-600"
                    disabled={deleteGbairaiMutation.isPending}
                  >
                    {deleteGbairaiMutation.isPending ? "Suppression..." : "Supprimer Gbairai"}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (selectedReport) {
                      processReportMutation.mutate({
                        reportId: selectedReport.id,
                        status: 'rejected',
                        adminNote: 'Signalement rejeté par admin'
                      });
                    }
                  }}
                  variant="outline"
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-600"
                  disabled={processReportMutation.isPending}
                >
                  Rejeter
                </Button>
                <Button
                  onClick={() => {
                    if (selectedReport) {
                      processReportMutation.mutate({
                        reportId: selectedReport.id,
                        status: 'approved',
                        adminNote: 'Signalement approuvé par admin'
                      });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={processReportMutation.isPending}
                >
                  {processReportMutation.isPending ? "Traitement..." : "Approuver"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de suppression */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-red-500">Supprimer l'utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert className="border-red-500 bg-red-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  Cette action est irréversible. Tous les gbairais, messages et données de l'utilisateur seront supprimés.
                </AlertDescription>
              </Alert>
              {selectedUser && (
                <p className="text-white">
                  Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser.username}</strong> ?
                </p>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Suppression..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog d'envoi de message */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-blue-500">Envoyer un message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedUser && (
                <p className="text-white">
                  Message pour <strong>{selectedUser.username}</strong>
                </p>
              )}
              <div>
                <Label htmlFor="message">Contenu du message</Label>
                <Textarea
                  id="message"
                  placeholder="Votre message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsMessageDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (selectedUser && messageContent.trim()) {
                      sendMessageMutation.mutate({
                        userId: selectedUser.id,
                        content: messageContent.trim()
                      });
                    }
                  }}
                  disabled={sendMessageMutation.isPending || !messageContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sendMessageMutation.isPending ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}