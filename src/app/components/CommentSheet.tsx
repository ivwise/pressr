import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Post {
  id: string;
  userName: string;
  userAvatar: string;
  userId: string;
}

interface CommentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onAddComment: () => void;
}

interface Comment {
  id: string;
  user_id: string;
  userName: string;
  userAvatar: string;
  text: string;
  created_at: string;
}

export function CommentSheet({ isOpen, onClose, post, onAddComment }: CommentSheetProps) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    if (isOpen && post) {
      loadComments();
      getCurrentUser();
    }
  }, [isOpen, post]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadComments = async () => {
    if (!post) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, users(id, name)')
      .eq('log_id', post.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading comments:", error);
    } else {
      const formattedComments: Comment[] = (data || []).map(c => {
        const userData = c.users as any;
        return {
          id: c.id,
          user_id: c.user_id,
          userName: userData?.name || 'User',
          userAvatar: (userData?.name || 'U').charAt(0).toUpperCase(),
          text: c.text,
          created_at: c.created_at
        };
      });
      setComments(formattedComments);
    }
    setLoading(false);
  };

  if (!isOpen || !post) return null;

  const handleSubmit = async () => {
    if (!comment.trim() || !currentUserId) return;

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        log_id: post.id,
        user_id: currentUserId,
        text: comment.trim()
      })
      .select('*, users(id, name)')
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      return;
    }

    const userData = newComment.users as any;
    const formattedComment: Comment = {
      id: newComment.id,
      user_id: newComment.user_id,
      userName: userData?.name || 'You',
      userAvatar: (userData?.name || 'Y').charAt(0).toUpperCase(),
      text: newComment.text,
      created_at: newComment.created_at
    };

    setComments([formattedComment, ...comments]);
    onAddComment();
    setComment("");

    // Create notification for post owner if it's not your own post
    if (post.userId !== currentUserId) {
      await supabase.from('notifications').insert({
        user_id: post.userId,
        type: 'comment',
        content: `${userData?.name} commented on your post`,
        related_user_id: currentUserId,
        related_log_id: post.id
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A1A] w-full max-w-md mx-auto rounded-t-3xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <h2 className="text-xl font-medium">Comments</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No comments yet. Be the first!</div>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                  {c.userAvatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.userName}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{c.text}</p>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#2A2A2A]">
          <div className="flex gap-3">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!comment.trim()}
              className={`px-4 py-3 rounded-xl transition-colors ${
                comment.trim()
                  ? "bg-[#FF5C00] text-white"
                  : "bg-[#2A2A2A] text-gray-600"
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
