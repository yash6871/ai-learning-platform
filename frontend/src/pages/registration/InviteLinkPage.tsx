import React, { useEffect, useState } from "react";
import { Field, SelectField, PrimaryButton, ErrorBanner, SuccessBanner, extractErrorMessage } from "../../components/FormControls";
import { registrationApi } from "../../services/registrationApi";
import { Course, Batch } from "../../types";

export const InviteLinkPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    registrationApi.listCourses().then((res) => setCourses(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setBatchId("");
    if (courseId) {
      registrationApi.listBatches(courseId).then((res) => setBatches(res.data)).catch(() => {});
    } else {
      setBatches([]);
    }
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteLink(null);
    // The invite is what assigns the self-registering student to a batch, so
    // it cannot be left blank.
    if (!courseId || !batchId) {
      setError("Select a course and a batch - the invite assigns the student to that batch.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await registrationApi.createInvite({
        email: email || undefined,
        courseId,
        batchId,
        expiresInHours: 72,
      });
      setInviteLink(data.inviteLink);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-bold text-ink-900">Generate invite link</h1>
        <p className="mt-1 text-sm text-slate-500">Invite students to self-register for a course and batch. Links expire in 72 hours.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <ErrorBanner message={error} />
          <SuccessBanner message={inviteLink ? "Invite link created below." : null} />
          <Field
            label="Student email (optional - binds invite to this address)"
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SelectField label="Course *" id="inviteCourse" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </SelectField>
          <SelectField label="Batch *" id="inviteBatch" required disabled={!courseId} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">{courseId ? "Select batch" : "Select a course first"}</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "Generating..." : "Generate invite link"}
          </PrimaryButton>

          {inviteLink && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <p className="mb-1 text-xs font-medium text-slate-500">Share this link with the student:</p>
              <code className="break-all text-sm text-brand-700">{inviteLink}</code>
            </div>
          )}
        </form>
      </div>
    </>
  );
};
