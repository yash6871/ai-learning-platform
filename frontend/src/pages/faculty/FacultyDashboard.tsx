import { useEffect, useState } from "react";
import { getMyBatches, getBatchStudents, createBatch } from "../../api/facultyApi";
import { FacultyBatch, StudentInBatch } from "../../types";

export default function FacultyDashboard() {
  const [batches, setBatches] = useState<FacultyBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<FacultyBatch | null>(null);
  const [students, setStudents] = useState<StudentInBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchCourse, setNewBatchCourse] = useState("");

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
    const s = await getBatchStudents(batch.id);
    setStudents(s);
  };

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return;
    await createBatch({ name: newBatchName, course: newBatchCourse });
    setNewBatchName("");
    setNewBatchCourse("");
    setShowCreate(false);
    loadBatches();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Faculty Dashboard</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + New FacultyBatch
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500">FacultyBatch Name</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500">Course</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={newBatchCourse}
              onChange={(e) => setNewBatchCourse(e.target.value)}
            />
          </div>
          <button
            onClick={handleCreateBatch}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Create
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading batches…</p>
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
            </button>
          ))}
          {batches.length === 0 && (
            <p className="text-slate-400 text-sm">No batches assigned yet.</p>
          )}
        </div>
      )}

      {selectedBatch && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">
            Students in {selectedBatch.name}
          </h2>
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
      )}
    </div>
  );
}
