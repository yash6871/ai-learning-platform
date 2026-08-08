import { useEffect, useState } from "react";
import { getMyBatches, getBatchStudents, markAttendance, getBatchAttendance } from "../../api/facultyApi";
import { FacultyBatch, StudentInBatch, AttendanceStatus, AttendanceRecord } from "../../types";

export default function AttendancePage() {
  const [batches, setBatches] = useState<FacultyBatch[]>([]);
  const [batchId, setBatchId] = useState<string>("");
  const [students, setStudents] = useState<StudentInBatch[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    getMyBatches().then(setBatches);
  }, []);

  useEffect(() => {
    if (!batchId) return;
    getBatchStudents(batchId).then(setStudents);
    refreshExisting();
  }, [batchId, date]);

  const refreshExisting = async () => {
    if (!batchId) return;
    const records = await getBatchAttendance(batchId, date);
    setExisting(records);
    const map: Record<string, AttendanceStatus> = {};
    records.forEach((r) => (map[r.studentId] = r.status));
    setStatuses((prev) => ({ ...map, ...prev }));
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const save = async () => {
    setSaving(true);
    const entries = students.map((s) => ({
      studentId: s.id,
      status: statuses[s.id] || "present",
    }));
    await markAttendance(batchId, date, entries);
    await refreshExisting();
    setSaving(false);
  };

  const statusColor = (s?: AttendanceStatus) =>
    s === "present" ? "bg-emerald-600" : s === "late" ? "bg-amber-500" : s === "absent" ? "bg-rose-600" : "bg-slate-200";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Attendance</h1>

      <div className="flex gap-4 mb-6">
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
        >
          <option value="">Select batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="date"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {batchId && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{s.email}</p>
              </div>
              <div className="flex gap-2">
                {(["present", "late", "absent"] as AttendanceStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(s.id, st)}
                    className={`text-xs px-3 py-1.5 rounded-full text-white capitalize ${
                      statuses[s.id] === st ? statusColor(st) : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {students.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">No students in this batch.</p>
          )}
        </div>
      )}

      {batchId && students.length > 0 && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Attendance"}
        </button>
      )}

      <p className="text-xs text-slate-400 mt-3">
        Face-recognition auto-marking is available via a separate hook (see AIRA project) —
        this manual view lets faculty record or override attendance directly.
      </p>
    </div>
  );
}
