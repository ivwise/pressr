import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Check, X } from "lucide-react";
import { useNavigate } from "react-router";

interface Notification {
  id: string;
  type: string;
  content: string;
  created_at: string;
  is_read: boolean;
  related_user_id: string | null;
  related_log_id: string | null;
  related_group_id: string | null;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    markAllAsRead();

    // Reload when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading notifications:", error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const handleAcceptGroupInvite = async (notificationId: string, groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Remove from UI immediately
    setNotifications(notifications.filter(n => n.id !== notificationId));

    // Get the notification to find who invited us
    const { data: notification } = await supabase
      .from('notifications')
      .select('related_user_id')
      .eq('id', notificationId)
      .single();

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!existingMember) {
      // Add user to group only if not already a member
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id
        });

      if (error) {
        console.error("Error accepting invite:", error);
        return;
      }

      // Notify the person who invited us
      if (notification?.related_user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        const { data: groupData } = await supabase
          .from('groups')
          .select('name')
          .eq('id', groupId)
          .single();

        await supabase.from('notifications').insert({
          user_id: notification.related_user_id,
          type: 'group_accept',
          content: `${userData?.name} accepted your invite to ${groupData?.name}`,
          related_user_id: user.id,
          related_group_id: groupId
        });
      }
    }

    // Delete the notification from database
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  };

  const handleDeclineGroupInvite = async (notificationId: string) => {
    // Remove from UI immediately
    setNotifications(notifications.filter(n => n.id !== notificationId));

    // Delete from database
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Remove from UI immediately
    setNotifications(notifications.filter(n => n.id !== notification.id));

    // Mark as read in database
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);

    // Navigate based on notification type
    if (notification.type === 'like' || notification.type === 'comment' || notification.type === 'group_post') {
      // Go to home page where the post is
      navigate('/');
    } else if (notification.type === 'follow') {
      // Could go to the user's profile, but for now go to feed
      navigate('/feed');
    } else if (notification.type === 'group_accept') {
      // Go to groups page
      navigate('/group');
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "group_post":
        return "border-l-4 border-l-purple-500";
      case "group_invite":
        return "border-l-4 border-l-blue-500";
      case "group_accept":
        return "border-l-4 border-l-green-500";
      case "follow":
        return "border-l-4 border-l-green-500";
      case "like":
        return "border-l-4 border-l-amber-500";
      case "comment":
        return "border-l-4 border-l-pink-500";
      default:
        return "border-l-4 border-l-gray-500";
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl mb-8">Notifications</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-[#1A1A1A] rounded-xl p-4 ${getNotificationStyle(notification.type)} ${
                notification.type !== 'group_invite' ? 'cursor-pointer hover:bg-[#222222]' : ''
              }`}
              onClick={() => notification.type !== 'group_invite' ? handleNotificationClick(notification) : undefined}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm flex-1">{notification.content}</p>
                <span className="text-xs text-gray-500 ml-4 flex-shrink-0">
                  {new Date(notification.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              {notification.type === 'group_invite' && notification.related_group_id && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAcceptGroupInvite(notification.id, notification.related_group_id!)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5C00] text-white rounded-lg text-sm"
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineGroupInvite(notification.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2A2A2A] text-gray-400 rounded-lg text-sm"
                  >
                    <X size={16} />
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
