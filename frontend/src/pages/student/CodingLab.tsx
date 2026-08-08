import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { codingApi } from "../../api/studentApi";
import CodeEditor from "../../components/CodeEditor";
import type { CodingQuestion, CodeRunResult, CodeSubmitResult } from "../../types";

export default function CodingLab() {
  const { codingQuestionId } = useParams<{ codingQuestionId: string }>();
  const [question, setQuestion] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [runResult, setRunResult] = useState<CodeRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<CodeSubmitResult | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!codingQuestionId) return;
    codingApi.get(codingQuestionId).then((q) => {
      setQuestion(q);
      setCode(q.starterCode || "");
    });
  }, [codingQuestionId]);

  const handleRun = async () => {
    if (!question) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await codingApi.run({
        codingQuestionId: question.id,
        code,
        language: question.language,
        customInput,
      });
      setRunResult(res);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!question) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await codingApi.submit({ codingQuestionId: question.id, code, language: question.language });
      setSubmitResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) return <div className="text-gray-500">Loading coding question...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h1 className="text-lg font-bold text-gray-800 mb-2">Coding Lab</h1>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{question.questionText}</p>
          <p className="text-xs text-gray-400 mt-2">Language: {question.language} · {question.marks} marks</p>
        </div>

        {question.sampleTestCases.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-2 text-sm">Sample Test Cases</h2>
            <div className="space-y-2">
              {question.sampleTestCases.map((tc) => (
                <div key={tc.id} className="text-xs bg-gray-50 rounded p-2 font-mono">
                  <div>Input: {tc.input}</div>
                  <div>Expected: {tc.expectedOutput}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-2 text-sm">Custom Input (for Run)</h2>
          <textarea className="input h-20 font-mono" value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        <CodeEditor language={question.language} value={code} onChange={setCode} />

        <div className="flex gap-2">
          <button onClick={handleRun} disabled={running} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-50">
            {running ? "Running..." : "Run"}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        {runResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
            <p className="font-medium text-gray-700 mb-1">Run Result — {runResult.status}</p>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto">{runResult.stdout || runResult.stderr || "(no output)"}</pre>
          </div>
        )}

        {submitResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-2">
            <p className="font-medium text-gray-700">
              {submitResult.status.toUpperCase()} — {submitResult.passedTestCases}/{submitResult.totalTestCases} test cases passed — Score: {submitResult.score}
            </p>
            <ul className="space-y-1">
              {submitResult.testCaseResults.map((r) => (
                <li key={r.testCaseId} className={`text-xs px-2 py-1 rounded ${r.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {r.isHidden ? "Hidden test case" : `Input/Output check`} — {r.passed ? "Passed" : "Failed"}
                </li>
              ))}
            </ul>
            {submitResult.aiReview && (
              <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">
                <p className="font-medium mb-1">AI Code Review</p>
                <p>{submitResult.aiReview}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
