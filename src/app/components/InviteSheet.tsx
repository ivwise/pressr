import { useState, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface InviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => void;
  groupName: string;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
}

export function InviteSheet({ isOpen, onClose, onInvite, groupName }: InviteSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, bio')
      .neq('id', user.id) // Exclude current user
      .limit(50);

    if (error) {
      console.error("Error loading users:", error);
    } else {
      setAllUsers((data || []).map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.name.charAt(0).toUpperCase(),
        bio: u.bio || "Fitness enthusiast"
      })));
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    // Send notifications to invited users
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      // Create notifications for each invited user
      const notifications = selectedUsers.map(userId => ({
        user_id: userId,
        type: 'group_invite',
        content: `${userData?.name} invited you to join ${groupName}`,
        related_user_id: user.id,
        related_group_id: null // Will be set in the parent component
      }));

      await supabase.from('notifications').insert(notifications);
    }

    onInvite(selectedUsers);
    setSelectedUsers([]);
    setSearchQuery("");
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={handleClose}
    >
      <div
        className="bg-[#1A1A1A] w-full max-w-md mx-auto rounded-t-3xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div>
            <h2 className="text-xl font-medium">Invite to {groupName}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : "Search for people"}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400">
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
              placeholder="Search users..."
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5C00]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading users...</div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredUsers.map((user) => {
              const isSelected = selectedUsers.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                    isSelected ? "bg-[#FF5C00]/20 border-2 border-[#FF5C00]" : "bg-[#0F0F0F] border-2 border-transparent"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center text-lg flex-shrink-0">
                    {user.avatar}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-400 truncate">{user.bio}</div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#FF5C00] flex items-center justify-center flex-shrink-0">
                      <Check size={16} />
                    </div>
                  )}
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No users found
              </div>
            )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#2A2A2A]">
          <button
            onClick={handleInvite}
            disabled={selectedUsers.length === 0}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-colors ${
              selectedUsers.length > 0
                ? "bg-[#FF5C00] text-white"
                : "bg-[#2A2A2A] text-gray-600"
            }`}
          >
            Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
