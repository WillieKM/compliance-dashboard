import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="text-6xl mb-6">↩️</div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Payment cancelled</h1>
      <p className="text-slate-500 mb-8">
        No charges were made. You can subscribe anytime from the billing page.
      </p>
      <Link
        href="/billing"
        className="inline-block bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-700 transition-colors"
      >
        Back to Plans
      </Link>
    </div>
  );
}
