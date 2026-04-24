import { Link, useLocation } from "react-router";
import { Home, Compass, Users, TrendingUp, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function NavBar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to notification changes
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        loadUnreadCount();
      })
      .subscribe();

    // Also reload when navigating to notifications
    const interval = setInterval(() => {
      if (location.pathname === '/notifications') {
        loadUnreadCount();
      }
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [location]);

  const loadUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setUnreadCount(data?.length || 0);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-[#2A2A2A]/50 shadow-2xl">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            isActive("/") ? "text-[#FF5C00] scale-110" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Home size={24} strokeWidth={isActive("/") ? 2.5 : 2} />
        </Link>
        <Link
          to="/feed"
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            isActive("/feed") ? "text-[#FF5C00] scale-110" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Compass size={24} strokeWidth={isActive("/feed") ? 2.5 : 2} />
        </Link>
        <Link
          to="/group"
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            isActive("/group") ? "text-[#FF5C00] scale-110" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Users size={24} strokeWidth={isActive("/group") ? 2.5 : 2} />
        </Link>
        <Link
          to="/stats"
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            isActive("/stats") ? "text-[#FF5C00] scale-110" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <TrendingUp size={24} strokeWidth={isActive("/stats") ? 2.5 : 2} />
        </Link>
        <Link
          to="/notifications"
          className={`flex flex-col items-center gap-1 relative transition-all duration-200 ${
            isActive("/notifications") ? "text-[#FF5C00] scale-110" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Bell size={24} strokeWidth={isActive("/notifications") ? 2.5 : 2} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-[#FF5C00] to-[#FF7A33] rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-lg shadow-[#FF5C00]/30 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Link>
      </div>
    </nav>
  );
}
