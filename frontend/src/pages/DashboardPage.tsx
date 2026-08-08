import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StudentDashboard from "./student/StudentDashboard";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  faculty: "Faculty",
  trainer: "Trainer",
  hr: "HR",
  placement_coordinator: "Placement Coordinator",
  student: "Student",
  guest: "Guest",
};

interface QuickLink {
  to: string;
  label: string;
  description: string;
}

const QUICK_LINKS: Record<string, QuickLink[]> = {
  student: [
    { to: "/student/learning", label: "Continue Learning", description: "Pick up your syllabus where you left off" },
    { to: "/student/coding-lab", label: "Coding Lab", description: "Practice problems and run test cases" },
    { to: "/student/assessments/history", label: "Assessment History", description: "See scores, rank and percentile" },
    { to: "/student/mock-interview", label: "Mock Interview", description: "Practice with AI-scored interviews" },
    { to: "/student/jobs/recommended", label: "Recommended Jobs", description: "Roles matched to your profile" },
    { to: "/chatbot", label: "AI Career Assistant", description: "Ask questions, get guidance anytime" },
  ],
  faculty: [
    { to: "/faculty/dashboard", label: "Faculty Dashboard", description: "Your batches and students" },
    { to: "/faculty/assessments", label: "My Assessments", description: "View, monitor and manage assessments" },
    { to: "/faculty/assessments/new", label: "Create Assessment", description: "Generate questions with AI" },
    { to: "/faculty/attendance", label: "Attendance", description: "Record today's session attendance" },
    { to: "/faculty/evaluate", label: "Evaluate Assignments", description: "Review submissions and give feedback" },
    { to: "/faculty/performance", label: "Student Performance", description: "Leaderboards and weak-area insights" },
    { to: "/faculty/mock-interviews", label: "Schedule Mock Interview", description: "Set up practice interviews" },
  ],
  hr: [
    { to: "/hr/jobs", label: "Post a Job", description: "Publish a role with requirements" },
    { to: "/hr/candidate-match", label: "Candidate Matching", description: "AI-ranked candidates for a role" },
    { to: "/hr/companies", label: "Companies", description: "Manage hiring partners" },
    { to: "/hr/offers", label: "Offers", description: "Track offers through to acceptance" },
    { to: "/hr/analytics", label: "Placement Analytics", description: "Hiring outcomes and statistics" },
    { to: "/interview/schedule", label: "Schedule Interview", description: "Book an interview slot" },
  ],
  admin: [
    { to: "/admin/user-management", label: "Manage Users", description: "Create staff accounts and set roles" },
    { to: "/admin/courses-batches", label: "Courses & Batches", description: "Manage the academic structure" },
    { to: "/admin/payments", label: "Payments", description: "Fee records and payment status" },
    { to: "/admin/audit-log", label: "Audit Log", description: "Review important platform actions" },
    { to: "/faculty/assessments", label: "Assessment Monitor", description: "Live exam monitoring and snapshots" },
    { to: "/admin/ai-usage", label: "AI Usage", description: "Monitor AI cost and usage" },
    { to: "/admin/settings", label: "Platform Settings", description: "Configure the platform" },
  ],
};

function quickLinksFor(role: string): QuickLink[] {
  if (role === "student") return QUICK_LINKS.student;
  if (role === "faculty" || role === "trainer") return QUICK_LINKS.faculty;
  if (role === "hr" || role === "placement_coordinator") return QUICK_LINKS.hr;
  if (role === "admin" || role === "super_admin") return QUICK_LINKS.admin;
  return [];
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; hint: string; accent: string }> = ({
  label,
  value,
  hint,
  accent,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
    </div>
    <p className="mt-2 font-display text-xl font-bold text-ink-900 dark:text-white">{value}</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
  </div>
);

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role] : "";
  const links = user ? quickLinksFor(user.role) : [];

  if (user?.role === "student") {
    return <StudentDashboard />;
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        You are signed in as <span className="font-medium text-ink-700 dark:text-slate-200">{roleLabel}</span>.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Portal" value={roleLabel} hint="Access is scoped to your role" accent="bg-brand-500" />
        <StatCard label="Account status" value="Active" hint="Account in good standing" accent="bg-emerald-500" />
        <StatCard
          label="Platform"
          value="ARC"
          hint="AI Learning, Assessment & Placement"
          accent="bg-indigo-500"
        />
      </div>

      {links.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Quick links</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
              >
                <p className="font-display text-sm font-bold text-ink-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                  {link.label}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
