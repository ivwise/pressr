import { useState, useEffect } from "react";
import { Camera, Edit2, LogOut, Heart, MessageCircle } from "lucide-react";
import { PostSheet } from "../components/PostSheet";
import { EditProfileSheet } from "../components/EditProfileSheet";
import { DayLogView } from "../components/DayLogView";
import { CommentSheet } from "../components/CommentSheet";
import { supabase } from "../../lib/supabase";

interface DailyLog {
  id: string;
  date: string;
  created_at: string;
  workout_data: any;
  nutrition_data: any;
  journal: string | null;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export function Home() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userBio, setUserBio] = useState("Fitness enthusiast");
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    loadUserProfile();
    loadDailyLogs();
    loadFollowCounts();
    getCurrentUserId();
  }, []);

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('name, bio')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserName(data.name || "User");
        setUserBio(data.bio || "Fitness enthusiast");
      }
    }
  };

  const loadDailyLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .order('date', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading logs:", error);
      } else {
        const logIds = data?.map(l => l.id) || [];

        // Get likes count
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

        const logsWithCounts = (data || []).map(log => ({
          ...log,
          likes: likesCount[log.id] || 0,
          comments: commentsCount[log.id] || 0,
          isLiked: userLikes.has(log.id)
        }));

        setLogs(logsWithCounts);
      }
    }
    setLoadingLogs(false);
  };

  const loadFollowCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Count followers
    const { data: followers } = await supabase
      .from('follows')
      .select('id')
      .eq('following_id', user.id);

    setFollowersCount(followers?.length || 0);

    // Count following
    const { data: following } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id);

    setFollowingCount(following?.length || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handlePostComplete = () => {
    setIsSheetOpen(false);
    loadDailyLogs(); // Reload logs after posting
  };

  const handleLike = async (logId: string) => {
    const log = logs.find(l => l.id === logId);
    if (!log) return;

    if (log.isLiked) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .eq('log_id', logId)
        .eq('user_id', currentUserId);
    } else {
      // Like
      await supabase
        .from('likes')
        .insert({
          log_id: logId,
          user_id: currentUserId
        });
    }

    // Update UI
    setLogs(logs.map(l => {
      if (l.id === logId) {
        return {
          ...l,
          isLiked: !l.isLiked,
          likes: l.isLiked ? l.likes - 1 : l.likes + 1
        };
      }
      return l;
    }));
  };

  const handleCommentClick = (log: DailyLog) => {
    setSelectedLog({
      id: log.id,
      userName: userName,
      userAvatar: userName.charAt(0).toUpperCase(),
      userId: currentUserId
    });
    setCommentSheetOpen(true);
  };

  const handleAddComment = () => {
    if (selectedLog) {
      setLogs(logs.map(l => {
        if (l.id === selectedLog.id) {
          return {
            ...l,
            comments: l.comments + 1
          };
        }
        return l;
      }));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleLogout}
          className="text-gray-400 flex items-center gap-2 text-sm"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-[#1A1A1A] flex items-center justify-center text-4xl">
            {userName.charAt(0).toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#FF5C00] rounded-full flex items-center justify-center">
            <Camera size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl">{userName}</h1>
          <button onClick={() => setIsEditProfileOpen(true)} className="text-gray-400">
            <Edit2 size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{userBio}</p>
        <div className="flex gap-8">
          <div className="text-center">
            <div className="text-3xl mb-1">{followersCount}</div>
            <div className="text-xs uppercase tracking-wider text-gray-500">followers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">{followingCount}</div>
            <div className="text-xs uppercase tracking-wider text-gray-500">following</div>
          </div>
        </div>
      </div>

      <div className="mb-24">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-4">Recent Logs</h2>
        {loadingLogs ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No logs yet. Tap "Log Today" to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="bg-[#1A1A1A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <div className="text-xs text-gray-500">
                    {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <DayLogView data={{
                  workout: log.workout_data,
                  nutrition: log.nutrition_data,
                  journal: log.journal
                }} />

                <div className="flex items-center gap-6 pt-4 mt-4 border-t border-[#2A2A2A]">
                  <button
                    onClick={() => handleLike(log.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      log.isLiked ? "text-[#FF5C00]" : "text-gray-400"
                    }`}
                  >
                    <Heart size={20} fill={log.isLiked ? "#FF5C00" : "none"} />
                    <span className="text-sm">{log.likes}</span>
                  </button>
                  <button
                    onClick={() => handleCommentClick(log)}
                    className="flex items-center gap-2 text-gray-400"
                  >
                    <MessageCircle size={20} />
                    <span className="text-sm">{log.comments}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setIsSheetOpen(true)}
        className="fixed bottom-20 left-0 right-0 mx-auto max-w-md px-6"
      >
        <div className="w-full bg-[#FF5C00] text-white py-4 rounded-xl font-medium text-lg">
          Log Today
        </div>
      </button>

      <PostSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onPost={handlePostComplete}
      />

      <EditProfileSheet
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentName={userName}
        currentBio={userBio}
        onSave={async (name, bio) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('users')
              .update({ name, bio })
              .eq('id', user.id);

            setUserName(name);
            setUserBio(bio);
          }
          setIsEditProfileOpen(false);
        }}
      />

      <CommentSheet
        isOpen={commentSheetOpen}
        onClose={() => setCommentSheetOpen(false)}
        post={selectedLog}
        onAddComment={handleAddComment}
      />
    </div>
  );
}
