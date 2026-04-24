import { Check, Circle, Hand, Plus, ChevronRight, Users, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { CreateGroupSheet } from "../components/CreateGroupSheet";
import { InviteSheet } from "../components/InviteSheet";
import { supabase } from "../../lib/supabase";

interface Member {
  id: string;
  name: string;
  avatar: string;
  posted: boolean;
  time?: string;
}

interface Group {
  id: string;
  name: string;
  memberCount: number;
  postedToday: number;
  members: Member[];
}

export function AccountabilityGroup() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [nudgedMembers, setNudgedMembers] = useState<string[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGroupCreator, setIsGroupCreator] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (view === "detail" && selectedGroup) {
      const checkCreator = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: group } = await supabase
          .from('groups')
          .select('created_by')
          .eq('id', selectedGroup.id)
          .single();

        setIsGroupCreator(group?.created_by === user.id);
      };
      checkCreator();
    } else {
      setIsGroupCreator(false);
    }
  }, [view, selectedGroup]);

  const loadGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get groups the user is a member of
    const { data: groupMemberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error("Error loading group memberships:", memberError);
      setLoading(false);
      return;
    }

    const groupIds = groupMemberships?.map(gm => gm.group_id) || [];

    if (groupIds.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    // Get group details
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (groupsError) {
      console.error("Error loading groups:", groupsError);
      setLoading(false);
      return;
    }

    // For each group, load members and check who posted today
    const groupsWithMembers = await Promise.all(
      (groupsData || []).map(async (group) => {
        // Get all members
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id, users(id, name, email)')
          .eq('group_id', group.id);

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Check who posted today (published logs only)
        const memberIds = members?.map(m => m.user_id) || [];
        const { data: todayLogs } = await supabase
          .from('daily_logs')
          .select('user_id, created_at')
          .in('user_id', memberIds)
          .eq('date', today)
          .eq('is_draft', false);

        const postedUserIds = new Set(todayLogs?.map(log => log.user_id) || []);

        const membersWithStatus: Member[] = (members || []).map(m => {
          const userData = m.users as any;
          const posted = postedUserIds.has(m.user_id);
          const log = todayLogs?.find(l => l.user_id === m.user_id);

          return {
            id: m.user_id,
            name: userData?.name || 'User',
            avatar: (userData?.name || 'U').charAt(0).toUpperCase(),
            posted,
            time: log ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ago' : undefined
          };
        });

        return {
          id: group.id,
          name: group.name,
          memberCount: membersWithStatus.length,
          postedToday: membersWithStatus.filter(m => m.posted).length,
          members: membersWithStatus
        };
      })
    );

    setGroups(groupsWithMembers);
    setLoading(false);
  };

  const handleNudge = (memberId: string) => {
    if (!nudgedMembers.includes(memberId)) {
      setNudgedMembers([...nudgedMembers, memberId]);
      // TODO: Send notification
    }
  };

  const handleGroupClick = (group: Group) => {
    setSelectedGroup(group);
    setView("detail");
  };

  const handleCreateGroup = async (groupName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create group
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupName,
        created_by: user.id
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      return;
    }

    // Add creator as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: newGroup.id,
        user_id: user.id
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return;
    }

    setIsCreateGroupOpen(false);
    loadGroups(); // Reload groups
  };

  const handleInvite = async (userIds: string[]) => {
    if (!selectedGroup) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // Create group invite notifications (don't add to group yet)
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'group_invite',
      content: `${userData?.name} invited you to join ${selectedGroup.name}`,
      related_user_id: user.id,
      related_group_id: selectedGroup.id
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error("Error sending invites:", error);
      return;
    }

    setIsInviteOpen(false);
  };

  if (view === "detail" && selectedGroup) {
    const postedCount = selectedGroup.members.filter(m => m.posted).length;

    const handleKickMember = async (memberId: string) => {
      if (!confirm("Are you sure you want to remove this member?")) return;

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', memberId);

      if (error) {
        console.error("Error kicking member:", error);
        return;
      }

      loadGroups();
      setView("list");
    };

    const handleDeleteGroup = async () => {
      if (!confirm(`Are you sure you want to delete "${selectedGroup.name}"? This cannot be undone.`)) return;

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', selectedGroup.id);

      if (error) {
        console.error("Error deleting group:", error);
        return;
      }

      setView("list");
      loadGroups();
    };

    const handleLeaveGroup = async () => {
      if (!confirm(`Are you sure you want to leave "${selectedGroup.name}"?`)) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error leaving group:", error);
        return;
      }

      setView("list");
      setSelectedGroup(null);
      await loadGroups();
    };

    return (
      <div className="p-6">
        <button
          onClick={() => setView("list")}
          className="text-gray-400 mb-6 text-sm flex items-center gap-1"
        >
          ← Back to Groups
        </button>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl mb-2">{selectedGroup.name}</h1>
              <p className="text-gray-400">{postedCount} of {selectedGroup.members.length} posted today</p>
            </div>
            <div className="flex gap-2">
              {isGroupCreator ? (
                <button
                  onClick={handleDeleteGroup}
                  className="bg-red-500/20 text-red-500 px-4 py-2 rounded-xl text-sm"
                >
                  Delete Group
                </button>
              ) : (
                <button
                  onClick={handleLeaveGroup}
                  className="bg-gray-500/20 text-gray-400 px-4 py-2 rounded-xl text-sm"
                >
                  Leave Group
                </button>
              )}
              <button
                onClick={() => setIsInviteOpen(true)}
                className="bg-[#FF5C00] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
              >
                <UserPlus size={18} />
                Invite
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {selectedGroup.members.map((member) => (
            <div key={member.id} className="bg-[#1A1A1A] rounded-2xl p-6 relative">
              {isGroupCreator && (
                <button
                  onClick={() => handleKickMember(member.id)}
                  className="absolute top-2 right-2 text-red-500 text-xs"
                >
                  Remove
                </button>
              )}

              <div className="flex flex-col items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center text-2xl mb-3">
                  {member.avatar}
                </div>
                <div className="font-medium mb-1">{member.name}</div>
              </div>

              {member.posted ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                    <Check size={24} className="text-green-500" />
                  </div>
                  <div className="text-xs text-gray-400">Posted {member.time}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-600 flex items-center justify-center mb-3">
                    <Circle size={24} className="text-gray-600" />
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Not yet</div>
                  <button
                    onClick={() => handleNudge(member.id)}
                    disabled={nudgedMembers.includes(member.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      nudgedMembers.includes(member.id)
                        ? "bg-[#2A2A2A] text-gray-600"
                        : "bg-[#FF5C00]/20 text-[#FF5C00]"
                    }`}
                  >
                    <Hand size={12} />
                    {nudgedMembers.includes(member.id) ? "Nudged" : "Nudge"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <InviteSheet
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          onInvite={handleInvite}
          groupName={selectedGroup?.name || ""}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl">My Groups</h1>
        <button
          onClick={() => setIsCreateGroupOpen(true)}
          className="bg-[#FF5C00] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
        >
          <Plus size={18} />
          Create
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading groups...</div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupClick(group)}
            className="w-full bg-[#1A1A1A] rounded-2xl p-5 flex items-center gap-4 text-left"
          >
            <div className="w-14 h-14 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
              <Users size={24} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium mb-1">{group.name}</h3>
              <p className="text-sm text-gray-400">
                {group.postedToday} of {group.memberCount} posted today
              </p>
            </div>
            <ChevronRight size={20} className="text-gray-600 flex-shrink-0" />
          </button>
        ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-gray-600" />
          </div>
          <p className="text-gray-400 mb-4">No groups yet</p>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="bg-[#FF5C00] text-white px-6 py-3 rounded-xl text-sm"
          >
            Create Your First Group
          </button>
        </div>
      )}

      <CreateGroupSheet
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreate={handleCreateGroup}
      />

      <InviteSheet
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInvite}
        groupName={selectedGroup?.name || ""}
      />
    </div>
  );
}
