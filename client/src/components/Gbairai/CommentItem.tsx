import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { User, Trash2, Languages, Flag, MoreVertical, Reply } from "lucide-react";
import { useState, useRef } from "react";

interface CommentItemProps {
  comment: any;
  isOwner: boolean;
  onMenuToggle: (commentId: number, isOwner: boolean) => void;
  isMenuOpen: boolean;
  onDeleteComment: () => void;
  onTranslateComment: () => void;
  onReportComment: () => void;
  onReplyToComment: (commentId: number, username: string) => void;
  replies?: any[];
}

export function CommentItem({ 
  comment, 
  isOwner, 
  onMenuToggle, 
  isMenuOpen, 
  onDeleteComment, 
  onTranslateComment, 
  onReportComment,
  onReplyToComment,
  replies = []
}: CommentItemProps) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartTime.current = Date.now();
    const timer = setTimeout(() => {
      onMenuToggle(comment.id, isOwner);
    }, 800);
    setPressTimer(timer);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleContextMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMenuToggle(comment.id, isOwner);
  };

  return (
    <div className="comment-item-wrapper">
      <div 
        className="comment-item"
        onContextMenu={handleContextMenuClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="comment-author">
          <User className="w-4 h-4" />
          <span className="author-name">{comment.user?.username || 'Utilisateur'}</span>
          <span className="comment-time">
            {(() => {
              try {
                const d = comment?.createdAt ? new Date(comment.createdAt) : null;
                if (!d || isNaN(d.getTime())) return 'à l\'instant';
                return formatDistanceToNow(d, { addSuffix: true, locale: fr });
              } catch {
                return 'à l\'instant';
              }
            })()}
          </span>
        </div>
        <div className="comment-content">
          {comment.content}
        </div>

        {/* Actions sous le commentaire */}
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <button
            onClick={() => onReplyToComment(comment.id, comment.user?.username || 'Utilisateur')}
            className="hover:text-white focus:outline-none"
          >
            Répondre
          </button>
          <button
            onClick={onTranslateComment}
            className="hover:text-white focus:outline-none"
          >
            Voir la traduction
          </button>
        </div>
      </div>
      
      {/* Menu déroulant */}
      {isMenuOpen && (
        <div className="comment-dropdown-menu">
          {isOwner && (
            <button
              onClick={onDeleteComment}
              className="comment-dropdown-item delete"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          )}
          <button
            onClick={onTranslateComment}
            className="comment-dropdown-item translate"
          >
            <Languages className="w-4 h-4" />
            Traduire
          </button>
          <button
            onClick={onReportComment}
            className="comment-dropdown-item report"
          >
            <Flag className="w-4 h-4" />
            Signaler
          </button>
        </div>
      )}

      {/* Réponses */}
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply) => (
            <div key={reply.id} className="reply-item">
              <div className="reply-author">
                <User className="w-3 h-3" />
                <span className="reply-author-name">{reply.user?.username || 'Utilisateur'}</span>
                <span className="reply-time">
                  {(() => {
                    try {
                      const d = reply?.createdAt ? new Date(reply.createdAt) : null;
                      if (!d || isNaN(d.getTime())) return 'à l\'instant';
                      return formatDistanceToNow(d, { addSuffix: true, locale: fr });
                    } catch {
                      return 'à l\'instant';
                    }
                  })()}
                </span>
              </div>
              <div className="reply-content">
                {reply.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Display replies */}
      {replies && replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isOwner={reply.userId === comment.userId}
              onMenuToggle={onMenuToggle}
              isMenuOpen={isMenuOpen && reply.id === comment.id}
              onDeleteComment={onDeleteComment}
              onTranslateComment={onTranslateComment}
              onReportComment={onReportComment}
              onReplyToComment={onReplyToComment}
              replies={[]} // Prevent infinite nesting
            />
          ))}
        </div>
      )}
    </div>
  );
}