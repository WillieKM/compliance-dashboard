import Link from "next/link";

export default function ApplySuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Application Submitted!</h1>
        <p className="text-slate-600 mb-2">
          Thank you for applying. We&apos;ve received your application and will be in touch within
          2 business days.
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Check your email for a confirmation. If you don&apos;t hear back, feel free to follow up.
        </p>
        <Link
          href="/apply"
          className="inline-block rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Submit another application
        </Link>
      </div>
    </div>
  );
}
