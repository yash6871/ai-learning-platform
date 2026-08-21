import { useEffect, useState } from "react";
import { getMyBatches, getBatchStudents, getBatchAssignmentsProgress, BatchAssignmentProgress } from "../../api/facultyApi";
import ArcLoader from "../../components/ArcLoader";
import { FacultyBatch, StudentInBatch } from "../../types";

export default function FacultyDashboard() {
  const [batches, setBatches] = useState<FacultyBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<FacultyBatch | null>(null);
  const [students, setStudents] = useState<StudentInBatch[]>([]);
  const [assignments, setAssignments] = useState<BatchAssignmentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    const data = await getMyBatches();
    setBatches(data);
    setLoading(false);
  };

  const openBatch = async (batch: FacultyBatch) => {
    setSelectedBatch(batch);
    const [s, a] = await Promise.all([
      getBatchStudents(batch.id),
      getBatchAssignmentsProgress(batch.id).catch(() => []),
    ]);
    setStudents(s);
    setAssignments(a);
  };

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Faculty Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Batches are created and assigned by Admin. Contact Admin to get a new batch assigned to you.
        </p>
      </div>

      {loading ? (
        <ArcLoader label="Loading batches" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {batches.map((batch) => (
            <button
              key={batch.id}
              onClick={() => openBatch(batch)}
              className={`text-left bg-white border rounded-xl p-4 hover:shadow-md transition ${
                selectedBatch?.id === batch.id ? "border-indigo-500 ring-1 ring-indigo-300" : "border-slate-200"
              }`}
            >
              <h3 className="font-semibold text-slate-800">{batch.name}</h3>
              <p className="text-sm text-slate-500">{batch.course || "—"}</p>
              <p className="text-xs text-slate-400 mt-2">{batch.studentCount} students</p>
              <p className="text-xs text-slate-400 mt-1">
                {fmtDate(batch.startDate)} → {fmtDate(batch.endDate)}
              </p>
            </button>
          ))}
          {batches.length === 0 && (
            <p className="text-slate-400 text-sm">No batches assigned yet.</p>
          )}
        </div>
      )}

      {selectedBatch && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">
                Students in {selectedBatch.name}
              </h2>
              <span className="text-xs text-slate-400">
                {fmtDate(selectedBatch.startDate)} → {fmtDate(selectedBatch.endDate)}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 text-slate-500">{s.email}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-3 text-slate-400">No students added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Assignments — completion in {selectedBatch.name}</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400">No assignments on the platform yet.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const pct = a.totalStudents > 0 ? Math.round((a.submittedCount / a.totalStudents) * 100) : 0;
                  return (
                    <div key={a.assignmentId}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-700">{a.title}</p>
                        <p className="text-xs text-slate-400">
                          {a.submittedCount}/{a.totalStudents} submitted · due {fmtDate(a.dueDate)} · {a.maxMarks} marks
                        </p>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
