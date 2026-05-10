import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">You&apos;re subscribed!</h1>
      <p className="text-slate-500 mb-8">
        Payment confirmed. Your CareCompliance subscription is now active. All features are
        unlocked.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
