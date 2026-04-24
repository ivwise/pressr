import { useState, useEffect } from "react";
import { Heart, MessageCircle, UserPlus, UserCheck, Search } from "lucide-react";
import { CommentSheet } from "../components/CommentSheet";
import { DayLogView } from "../components/DayLogView";
import { UserSearchSheet } from "../components/UserSearchSheet";
import { Profile } from "./Profile";
import { supabase } from "../../lib/supabase";

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  time: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isFollowing: boolean;
  dayLog: {
    workout?: {
      exercises: Array<{ name: string; sets: string; reps: string; weight: string }>;
    };
    nutrition?: {
      mode: "manual" | "meals";
      manual?: { calories: string; protein: string; carbs: string; fats: string };
      meals?: Array<{ name: string; calories: string; protein: string; carbs: string; fats: string }>;
    };
    journal?: string;
  };
}

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    // Get ALL published daily logs from all users (except current user) for discovery
    const { data: logs, error } = await supabase
      .from('daily_logs')
      .select('*, users(id, name)')
      .neq('user_id', user.id)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading feed:", error);
      setLoading(false);
      return;
    }

    // Get likes count for each log
    const logIds = logs?.map(l => l.id) || [];
    const { data: likesData } = await supabase
      .from('likes')
      .select('log_id, user_id')
      .in('log_id', logIds);

    const likesCount = likesData?.reduce((acc, like) => {
      acc[like.log_id] = (acc[like.log_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const userLikes = new Set(likesData?.filter(l => l.user_id === user.id).map(l => l.log_id) || []);

    // Get comments count
    const { data: commentsData } = await supabase
      .from('comments')
      .select('log_id')
      .in('log_id', logIds);

    const commentsCount = commentsData?.reduce((acc, comment) => {
      acc[comment.log_id] = (acc[comment.log_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Check who user is following
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingSet = new Set(follows?.map(f => f.following_id) || []);

    // Transform to Post format
    const feedPosts: Post[] = (logs || []).map(log => {
      const userData = log.users as any;
      return {
        id: log.id,
        userId: log.user_id,
        userName: userData?.name || 'User',
        userAvatar: (userData?.name || 'U').charAt(0).toUpperCase(),
        time: new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ago',
        likes: likesCount[log.id] || 0,
        comments: commentsCount[log.id] || 0,
        isLiked: userLikes.has(log.id),
        isFollowing: followingSet.has(log.user_id),
        dayLog: {
          workout: log.workout_data,
          nutrition: log.nutrition_data,
          journal: log.journal
        }
      };
    });

    setPosts(feedPosts);
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.isLiked) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .eq('log_id', postId)
        .eq('user_id', currentUserId);
    } else {
      // Like
      await supabase
        .from('likes')
        .insert({
          log_id: postId,
          user_id: currentUserId
        });

      // Create notification for post owner if it's not your own post
      if (post.userId !== currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

          await supabase.from('notifications').insert({
            user_id: post.userId,
            type: 'like',
            content: `${userData?.name} liked your post`,
            related_user_id: currentUserId,
            related_log_id: postId
          });
        }
      }
    }

    // Update UI
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    }));
  };

  const handleFollow = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.isFollowing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', post.userId);
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          following_id: post.userId
        });

      // Create notification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert({
          user_id: post.userId,
          type: 'follow',
          content: `${userData?.name} started following you`,
          related_user_id: currentUserId
        });
      }
    }

    // Update UI
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isFollowing: !p.isFollowing
        };
      }
      return p;
    }));
  };

  const handleCommentClick = (post: Post) => {
    setSelectedPost(post);
    setCommentSheetOpen(true);
  };

  const handleAddComment = () => {
    if (selectedPost) {
      setPosts(posts.map(post => {
        if (post.id === selectedPost.id) {
          return {
            ...post,
            comments: post.comments + 1
          };
        }
        return post;
      }));
    }
  };

  if (viewingUserId) {
    return <Profile userId={viewingUserId} onBack={() => setViewingUserId(null)} />;
  }

  return (
    <div className="p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl">Discover</h1>
        <button
          onClick={() => setSearchSheetOpen(true)}
          className="bg-[#FF5C00] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
        >
          <Search size={18} />
          Find People
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading feed...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No posts yet. Join a group or follow people to see their activity!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
          <div key={post.id} className="bg-[#1A1A1A] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <button
                onClick={() => setViewingUserId(post.userId)}
                className="flex items-center gap-3 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center text-lg">
                  {post.userAvatar}
                </div>
                <div>
                  <div className="font-medium hover:text-[#FF5C00] transition-colors">{post.userName}</div>
                  <div className="text-xs text-gray-500">{post.time}</div>
                </div>
              </button>
              <button
                onClick={() => handleFollow(post.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  post.isFollowing
                    ? "bg-[#2A2A2A] text-gray-400"
                    : "bg-[#FF5C00] text-white"
                }`}
              >
                {post.isFollowing ? (
                  <>
                    <UserCheck size={14} />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Follow
                  </>
                )}
              </button>
            </div>

            <DayLogView data={post.dayLog} />

            <div className="flex items-center gap-6 pt-4 mt-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 transition-colors ${
                  post.isLiked ? "text-[#FF5C00]" : "text-gray-400"
                }`}
              >
                <Heart size={20} fill={post.isLiked ? "#FF5C00" : "none"} />
                <span className="text-sm">{post.likes}</span>
              </button>
              <button
                onClick={() => handleCommentClick(post)}
                className="flex items-center gap-2 text-gray-400"
              >
                <MessageCircle size={20} />
                <span className="text-sm">{post.comments}</span>
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      <CommentSheet
        isOpen={commentSheetOpen}
        onClose={() => setCommentSheetOpen(false)}
        post={selectedPost}
        onAddComment={handleAddComment}
      />

      <UserSearchSheet
        isOpen={searchSheetOpen}
        onClose={() => setSearchSheetOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}
