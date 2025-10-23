import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGbairai, useGbairaiComments } from "@/hooks/useGbairais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Send, ChevronDown, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentItem } from "@/components/Gbairai/CommentItem";

export default function GbairaiCommentsPage() {
  const params = useParams();
  const gbairaiId = parseInt(params.id as string);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: gbairai } = useGbairai(gbairaiId);
  const { data: comments = [], isLoading: commentsLoading, refetch: refetchComments } = useGbairaiComments(gbairaiId);

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState<{ commentId: number; isOwner: boolean } | null>(null);
  const [commentReplies, setCommentReplies] = useState<Record<number, any[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; commentId: number | null; commentContent: string }>({ show: false, commentId: null, commentContent: '' });

  // Charger les réponses pour chaque commentaire principal
  useEffect(() => {
    const loadRepliesForComments = async () => {
      const mainComments = comments.filter((c: any) => !c.parentCommentId);
      for (const comment of mainComments as any[]) {
        try {
          const res = await fetch(`/api/comments/${comment.id}/replies`, { credentials: 'include' });
          if (res.ok) {
            const replies = await res.json();
            setCommentReplies(prev => ({ ...prev, [comment.id]: replies }));
          }
        } catch {}
      }
    };
    if (comments.length > 0) loadRepliesForComments();
  }, [comments]);

  const getRepliesForComment = (commentId: number) => commentReplies[commentId] || [];

  const handleCommentMenuToggle = (commentId: number, isOwner: boolean) => {
    if (activeCommentMenu?.commentId === commentId) setActiveCommentMenu(null);
    else setActiveCommentMenu({ commentId, isOwner });
  };

  const handleReplyToComment = (commentOrId: any, username?: string) => {
    if (!user) return;
    if (typeof commentOrId === 'number') {
      setReplyingTo({ commentId: commentOrId, username: username || 'Utilisateur' });
      setCommentText(`@${username || 'Utilisateur'} `);
    } else if (commentOrId) {
      const u = commentOrId.user?.username || commentOrId.username || 'Utilisateur';
      setReplyingTo({ commentId: commentOrId.id, username: u });
      setCommentText(`@${u} `);
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) return;
    if (!commentText.trim()) return;

    try {
      const payload: any = { type: 'comment', content: commentText.trim() };
      if (replyingTo) payload.parentCommentId = replyingTo.commentId;

      const response = await fetch(`/api/gbairais/${gbairaiId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi du commentaire');

      setCommentText("");
      setReplyingTo(null);
      refetchComments();
      toast({ title: replyingTo ? 'Réponse ajoutée' : 'Commentaire ajouté' });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le commentaire', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId?: number) => {
    const idToDelete = commentId || activeCommentMenu?.commentId;
    if (!idToDelete) return;

    const allComments = [...comments, ...Object.values(commentReplies).flat()];
    const commentToDelete = allComments.find((c: any) => c.id === idToDelete);
    if (!commentToDelete) return;

    setDeleteConfirmation({ show: true, commentId: idToDelete, commentContent: commentToDelete.content });
    setActiveCommentMenu(null);
  };

  const confirmDeleteComment = async () => {
    if (!deleteConfirmation.commentId) return;
    try {
      const res = await fetch(`/api/interactions/${deleteConfirmation.commentId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('delete error');
      refetchComments();
      toast({ title: 'Commentaire supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Suppression impossible', variant: 'destructive' });
    }
    setDeleteConfirmation({ show: false, commentId: null, commentContent: '' });
  };

  const cancelDeleteComment = () => setDeleteConfirmation({ show: false, commentId: null, commentContent: '' });

  const handleTranslateComment = async () => {
    if (!activeCommentMenu) return;
    const comment = comments.find((c: any) => c.id === activeCommentMenu.commentId);
    if (!comment) return;
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ text: comment.content }) });
      if (res.ok) {
        const result = await res.json();
        toast({ title: 'Traduction', description: result.translatedText });
      }
    } catch {}
    setActiveCommentMenu(null);
  };

  const handleReportComment = async () => {
    if (!activeCommentMenu) return;
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ type: 'comment', targetId: activeCommentMenu.commentId, reason: 'Contenu inapproprié' }) });
      if (res.ok) toast({ title: 'Signalement envoyé' });
    } catch {}
    setActiveCommentMenu(null);
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-60" />
          <p>Connexion requise pour voir les commentaires</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/gbairai/${gbairaiId}`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-white font-semibold">Commentaires</h1>
              <p className="text-gray-400 text-sm">Gbairai #{gbairaiId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des commentaires */}
      <div className="container mx-auto px-4 py-4">
        {commentsLoading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : comments.filter((c: any) => !c.parentCommentId).length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun commentaire pour le moment</p>
          </div>
        ) : (
          comments.filter((c: any) => !c.parentCommentId).map((comment: any) => (
            <div key={comment.id} className="space-y-2 mb-4">
              <CommentItem
                comment={comment}
                isOwner={comment.userId === user?.id}
                onMenuToggle={handleCommentMenuToggle}
                isMenuOpen={activeCommentMenu?.commentId === comment.id}
                onDeleteComment={() => handleDeleteComment(comment.id)}
                onTranslateComment={handleTranslateComment}
                onReportComment={handleReportComment}
                onReplyToComment={handleReplyToComment}
              />

              {/* Réponses inline (limité à 2) */}
              {expandedReplies.has(comment.id) && (
                <div className="ml-8 space-y-2">
                  {getRepliesForComment(comment.id).slice(0, 2).map((reply: any) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      isOwner={reply.userId === user?.id}
                      onMenuToggle={handleCommentMenuToggle}
                      isMenuOpen={activeCommentMenu?.commentId === reply.id}
                      onDeleteComment={() => handleDeleteComment(reply.id)}
                      onTranslateComment={handleTranslateComment}
                      onReportComment={handleReportComment}
                      onReplyToComment={handleReplyToComment}
                    />
                  ))}

                  {getRepliesForComment(comment.id).length > 2 && (
                    <button
                      onClick={() => toast({ title: 'Voir toutes les réponses', description: 'Fonction à étendre si besoin' })}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 ml-4"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Voir toutes les {getRepliesForComment(comment.id).length} réponses
                    </button>
                  )}
                </div>
              )}

              <div className="ml-2">
                <button onClick={() => toggleReplies(comment.id)} className="text-xs text-gray-400 hover:text-gray-300">
                  {expandedReplies.has(comment.id) ? 'Masquer les réponses' : 'Afficher les réponses'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulaire de commentaire */}
      <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4">
        {replyingTo && (
          <div className="mb-2 text-sm text-gray-400 bg-gray-800 rounded px-3 py-2 flex items-center justify-between">
            <span>Réponse à @{replyingTo.username}</span>
            <button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={replyingTo ? `Répondre à @${replyingTo.username}...` : "Votre commentaire..."}
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
          />
          <Button onClick={handleCommentSubmit} disabled={!commentText.trim()} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Supprimer le commentaire</h3>
                <div className="bg-gray-700 rounded p-3 text-sm text-gray-300 italic">
                  "{deleteConfirmation.commentContent.substring(0, 100)}{deleteConfirmation.commentContent.length > 100 ? '...' : ''}"
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={cancelDeleteComment} className="border-gray-600 text-gray-300 hover:bg-gray-700">Annuler</Button>
              <Button onClick={confirmDeleteComment} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
