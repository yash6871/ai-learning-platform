import { useEffect, useState } from "react";
import ArcLoader from "../../components/ArcLoader";
import { Link } from "react-router-dom";
import { dashboardApi, assessmentApi } from "../../api/studentApi";
import type { Dashboard as DashboardType, AvailableAssessment, AssessmentHistoryItem } from "../../types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardType | null>(null);
  const [assessments, setAssessments] = useState<AvailableAssessment[]>([]);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.get().then(setData).catch(() => setError("Failed to load dashboard")).finally(() => setLoading(false));
    assessmentApi.available().then(setAssessments).catch(() => {});
    assessmentApi.history().then(setHistory).catch(() => {});
    assessmentApi.historyBatches().then(setBatches).catch(() => {});
  }, []);

  if (loading) return <ArcLoader />;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  const completed = history.filter((i) => i.status === "completed");
  const scored = completed.filter((i) => i.maxScore && i.maxScore > 0);
  const avgPercent = scored.length
    ? Math.round((scored.reduce((sum, i) => sum + (i.score / (i.maxScore as number)) * 100, 0) / scored.length) * 10) / 10
    : null;
  const ranked = completed.filter((i) => i.rank != null);
  const bestRank = ranked.length ? Math.min(...ranked.map((i) => i.rank as number)) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, {data.welcomeName} 👋</h1>
        <p className="text-gray-500">Here's what's happening with your learning journey.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Course Progress" value={`${data.progressPercent}%`} />
        <StatCard label="Attendance" value={`${data.attendancePercent}%`} />
        <StatCard label="Assessments Taken" value={String(history.length)} />
        <StatCard label="Average Score" value={avgPercent !== null ? `${avgPercent}%` : "—"} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <StatCard label="Best Rank" value={bestRank !== null ? `#${bestRank}` : "—"} />
        <StatCard label={`Batch${batches.length !== 1 ? "es" : ""}`} value={batches.length ? batches.map((b) => b.name).join(", ") : "—"} small />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Upcoming Assessments</h2>
          {data.upcomingAssessments.length === 0 && (
            <p className="text-sm text-gray-400">No upcoming assessments. 🎉</p>
          )}
          <ul className="space-y-2">
            {data.upcomingAssessments.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{a.title}</p>
                  <p className="text-xs text-gray-400 uppercase">{a.type} · {a.duration} min</p>
                </div>
                <Link
                  to={`/student/assessments/${a.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark"
                >
                  Start
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Available Assessments</h2>
          {assessments.length === 0 ? (
            <p className="text-sm text-gray-400">No pending assessments. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {assessments.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{a.title}</p>
                    <p className="text-xs text-gray-400 uppercase">{a.type} · {a.duration} min · {a.questionCount} Qs</p>
                  </div>
                  <Link to={`/student/assessments/${a.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark">
                    Start
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Recent Notifications</h2>
          {data.recentNotifications.length === 0 && (
            <p className="text-sm text-gray-400">You're all caught up!</p>
          )}
          <ul className="space-y-2">
            {data.recentNotifications.map((n) => (
              <li key={n.id} className={`p-2 rounded-lg text-sm ${n.isRead ? "text-gray-500" : "text-gray-800 bg-primary/5"}`}>
                <p className="font-medium">{n.title}</p>
                {n.message && <p className="text-xs text-gray-400">{n.message}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`${small ? "text-lg" : "text-3xl"} font-bold text-primary mt-1`}>{value}</p>
    </div>
  );
}
