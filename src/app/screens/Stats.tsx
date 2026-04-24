import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { DayLogView } from "../components/DayLogView";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DailyLog {
  id: string;
  date: string;
  created_at: string;
  workout_data: any;
  nutrition_data: any;
  journal: string | null;
}

interface MonthGroup {
  month: string;
  year: number;
  logs: DailyLog[];
  isExpanded: boolean;
}

export function Stats() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [consistencyPercent, setConsistencyPercent] = useState(0);

  useEffect(() => {
    loadAllLogs();
  }, []);

  const loadAllLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_draft', false)
      .order('date', { ascending: false });

    if (error) {
      console.error("Error loading logs:", error);
    } else {
      setLogs(data || []);
      calculateStats(data || []);
      organizeByMonth(data || []);
    }
    setLoading(false);
  };

  const calculateStats = (logs: DailyLog[]) => {
    if (logs.length === 0) {
      setCurrentStreak(0);
      setConsistencyPercent(0);
      return;
    }

    // Calculate streak
    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        currentDate = new Date(logDate);
      } else {
        break;
      }
    }

    setCurrentStreak(streak);

    // Calculate consistency (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= thirtyDaysAgo && logDate <= today;
    });

    const consistency = Math.round((recentLogs.length / 30) * 100);
    setConsistencyPercent(Math.min(consistency, 100));
  };

  const organizeByMonth = (logs: DailyLog[]) => {
    const groups: { [key: string]: MonthGroup } = {};

    logs.forEach(log => {
      const date = new Date(log.date);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      const year = date.getFullYear();

      if (!groups[monthYear]) {
        groups[monthYear] = {
          month: date.toLocaleString('default', { month: 'long' }),
          year: year,
          logs: [],
          isExpanded: false
        };
      }

      groups[monthYear].logs.push(log);
    });

    // Expand the most recent month by default
    const groupsArray = Object.values(groups);
    if (groupsArray.length > 0) {
      groupsArray[0].isExpanded = true;
    }

    setMonthGroups(groupsArray);
  };

  const toggleMonth = (index: number) => {
    setMonthGroups(monthGroups.map((group, i) =>
      i === index ? { ...group, isExpanded: !group.isExpanded } : group
    ));
  };

  return (
    <div className="p-6 pb-24">
      <h1 className="text-3xl mb-8">Stats & History</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">{currentStreak}</div>
          <div className="text-xs uppercase tracking-wider text-gray-500">day streak</div>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">{consistencyPercent}%</div>
          <div className="text-xs uppercase tracking-wider text-gray-500">consistency</div>
        </div>
      </div>

      {/* Monthly History */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-4">History</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : monthGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No logs yet. Start logging to see your history!
          </div>
        ) : (
          <div className="space-y-3">
            {monthGroups.map((group, index) => (
              <div key={`${group.month}-${group.year}`} className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleMonth(index)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div>
                    <h3 className="font-medium">{group.month} {group.year}</h3>
                    <p className="text-sm text-gray-400">{group.logs.length} logs</p>
                  </div>
                  {group.isExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </button>

                {group.isExpanded && (
                  <div className="border-t border-[#2A2A2A] p-4 space-y-4">
                    {group.logs.map(log => (
                      <div key={log.id} className="bg-[#0F0F0F] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <div className="text-xs text-gray-500">
                            {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <DayLogView data={{
                          workout: log.workout_data,
                          nutrition: log.nutrition_data,
                          journal: log.journal
                        }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
