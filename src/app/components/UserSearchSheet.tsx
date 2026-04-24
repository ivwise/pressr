import { useState, useEffect } from "react";
import { X, Search, UserPlus, UserCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface UserSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

interface User {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  isFollowing: boolean;
}

export function UserSearchSheet({ isOpen, onClose, currentUserId }: UserSearchSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);

    // Get all users except current user
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, name, bio')
      .neq('id', currentUserId)
      .limit(50);

    if (error) {
      console.error("Error loading users:", error);
      setLoading(false);
      return;
    }

    // Get who current user is following
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingIds = new Set(follows?.map(f => f.following_id) || []);

    const usersWithFollowStatus: User[] = (allUsers || []).map(u => ({
      id: u.id,
      name: u.name,
      bio: u.bio || "Fitness enthusiast",
      avatar: u.name.charAt(0).toUpperCase(),
      isFollowing: followingIds.has(u.id)
    }));

    setUsers(usersWithFollowStatus);
    setLoading(false);
  };

  const handleFollow = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.isFollowing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          following_id: userId
        });
    }

    // Update UI
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, isFollowing: !u.isFollowing };
      }
      return u;
    }));
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-xl font-medium">Find People</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[#0F0F0F]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center text-lg flex-shrink-0">
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-400 truncate">{user.bio}</div>
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors flex-shrink-0 ${
                      user.isFollowing
                        ? "bg-[#2A2A2A] text-gray-400"
                        : "bg-[#FF5C00] text-white"
                    }`}
                  >
                    {user.isFollowing ? (
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
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
