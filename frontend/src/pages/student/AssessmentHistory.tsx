import { useEffect, useState } from "react";
import { assessmentApi } from "../../api/studentApi";
import ArcLoader from "../../components/ArcLoader";
import type { AssessmentHistoryItem } from "../../types";

export default function AssessmentHistory() {
  const [items, setItems] = useState<AssessmentHistoryItem[] | null>(null);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    assessmentApi.history().then(setItems);
    assessmentApi.historyBatches().then(setBatches).catch(() => {});
  }, []);

  if (items === null) return <ArcLoader label="Loading your assessment history" />;

  const completed = items.filter((i) => i.status === "completed");
  const scored = completed.filter((i) => i.maxScore && i.maxScore > 0);
  const avgPercent = scored.length
    ? Math.round((scored.reduce((sum, i) => sum + (i.score / (i.maxScore as number)) * 100, 0) / scored.length) * 10) / 10
    : null;
  const ranked = completed.filter((i) => i.rank != null);
  const bestRank = ranked.length ? Math.min(...ranked.map((i) => i.rank as number)) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Assessment History</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Assessments taken</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Average score</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{avgPercent !== null ? `${avgPercent}%` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Best rank</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{bestRank !== null ? `#${bestRank}` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] text-gray-400 uppercase font-semibold">Batch{batches.length !== 1 ? "es" : ""}</p>
          <p className="text-sm font-semibold text-gray-800 mt-1.5">
            {batches.length ? batches.map((b) => b.name).join(", ") : "—"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Percentile</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.resultId}>
                <td className="px-4 py-3 font-medium text-gray-700">{item.assessmentTitle}</td>
                <td className="px-4 py-3 uppercase text-xs text-gray-500">{item.type}</td>
                <td className="px-4 py-3">{item.score}{item.maxScore ? ` / ${item.maxScore}` : ""}</td>
                <td className="px-4 py-3">{item.rank ?? "—"}</td>
                <td className="px-4 py-3">{item.percentile != null ? `${item.percentile}%` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${item.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-5 text-sm text-gray-400">No assessments attempted yet.</p>}
      </div>
    </div>
  );
}
