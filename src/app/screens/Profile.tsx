import { useState, useEffect } from "react";
import { ArrowLeft, UserPlus, UserCheck } from "lucide-react";
import { DayLogView } from "../components/DayLogView";
import { supabase } from "../../lib/supabase";

interface ProfileProps {
  userId: string;
  onBack: () => void;
}

interface UserData {
  id: string;
  name: string;
  bio: string | null;
  avatar: string;
}

interface Post {
  id: string;
  created_at: string;
  workout_data: any;
  nutrition_data: any;
  journal: string | null;
}

export function Profile({ userId, onBack }: ProfileProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    setCurrentUserId(currentUser.id);

    // Load user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, bio')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error("Error loading user:", userError);
      setLoading(false);
      return;
    }

    setUser({
      ...userData,
      avatar: (userData.name || 'U').charAt(0).toUpperCase()
    });

    // Load user's published posts
    const { data: postsData, error: postsError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (postsError) {
      console.error("Error loading posts:", postsError);
    } else {
      setPosts(postsData || []);
    }

    // Check if following
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single();

    setIsFollowing(!!followData);

    // Get followers/following counts
    const { data: followers } = await supabase
      .from('follows')
      .select('id')
      .eq('following_id', userId);

    const { data: following } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId);

    setFollowersCount(followers?.length || 0);
    setFollowingCount(following?.length || 0);

    setLoading(false);
  };

  const handleFollow = async () => {
    if (isFollowing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);
      setFollowersCount(followersCount - 1);
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          following_id: userId
        });

      // Create notification
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', currentUser.id)
          .single();

        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'follow',
          content: `${userData?.name} started following you`,
          related_user_id: currentUserId
        });
      }
      setFollowersCount(followersCount + 1);
    }

    setIsFollowing(!isFollowing);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="text-gray-400 mb-6 text-sm flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="text-center py-12 text-gray-500">User not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24">
      <button
        onClick={onBack}
        className="text-gray-400 mb-6 text-sm flex items-center gap-1"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-[#1A1A1A] flex items-center justify-center text-4xl mb-4">
          {user.avatar}
        </div>
        <h1 className="text-2xl mb-2">{user.name}</h1>
        {user.bio && <p className="text-gray-400 text-sm mb-4 text-center">{user.bio}</p>}

        <div className="flex gap-8 mb-4">
          <div className="text-center">
            <div className="text-2xl mb-1">{followersCount}</div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{followingCount}</div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{posts.length}</div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Posts</div>
          </div>
        </div>

        {currentUserId !== userId && (
          <button
            onClick={handleFollow}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-colors ${
              isFollowing
                ? "bg-[#2A2A2A] text-gray-300"
                : "bg-[#FF5C00] text-white"
            }`}
          >
            {isFollowing ? (
              <>
                <UserCheck size={18} />
                Following
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Follow
              </>
            )}
          </button>
        )}
      </div>

      <div>
        <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-4">Posts</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No posts yet</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-[#1A1A1A] rounded-2xl p-5">
                <div className="text-xs text-gray-500 mb-4">
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} • {new Date(post.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
                <DayLogView
                  data={{
                    workout: post.workout_data,
                    nutrition: post.nutrition_data,
                    journal: post.journal
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
