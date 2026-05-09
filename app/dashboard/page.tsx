import Link from "next/link";
import { getDashboardMetrics } from "@/lib/compliance/getDashboardMetrics";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import ComplianceOverviewChart from "../components/charts/ComplianceOverviewChart";
import DocumentCategoryChart from "../components/charts/DocumentCategoryChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const profile = await getCurrentProfile();

  if (!profile) {
    return <div>No profile found.</div>;
  }

  console.log("DASHBOARD METRICS:", metrics);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="rounded-xl bg-blue-600 text-white p-8 shadow">
        <p className="text-sm mb-3">
          Facility Compliance Overview
        </p>

        <h1 className="text-4xl font-bold mb-4">
          CareCompliance Dashboard
        </h1>

        <p className="max-w-2xl">
          Track required documents, resident records,
          expiration alerts, and inspection readiness
          from one central dashboard.
        </p>
      </div>
      <div className="mt-8 max-w-md">
  <label className="block text-sm font-medium text-white/90 mb-2">
    Select Care Setting
  </label>

  <select
    defaultValue="HOME_CARE"
    className="w-full rounded-lg border border-white/20 bg-white text-gray-900 px-4 py-3 shadow"
  >
    <option value="HOME_CARE">
      Home Care
    </option>

    <option value="AFH">
      Adult Family Home
    </option>

    <option value="ASSISTED_LIVING">
      Assisted Living
    </option>
  </select>

  <p className="mt-3 text-sm text-white/80">
    Home Care is optimized for caregiver credentials, TB tests,
    CPR certifications, background checks, and onboarding readiness.
  </p>
</div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500">
            Compliance Score
          </p>

          <p className="text-5xl font-bold text-blue-600 mt-3">
            {metrics.complianceScore}%
          </p>

          <p className="text-gray-500 mt-3">
            Survey readiness score
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500">
            Expired Documents
          </p>

          <p className="text-5xl font-bold text-red-600 mt-3">
            {metrics.expiredDocuments}
          </p>

          <p className="text-gray-500 mt-3">
            Require immediate attention
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500">
            Expiring Soon
          </p>

          <p className="text-5xl font-bold text-yellow-600 mt-3">
            {metrics.expiringDocuments}
          </p>

          <p className="text-gray-500 mt-3">
            Due within 30 days
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500">
            Residents
          </p>

          <p className="text-5xl font-bold text-green-600 mt-3">
            {metrics.residentCompliance.total}
          </p>

          <p className="text-gray-500 mt-3">
            Active resident records
          </p>
        </div>
      </div>

      {/* CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceOverviewChart
          complianceScore={metrics.complianceScore}
          expiredDocuments={metrics.expiredDocuments}
          expiringDocuments={metrics.expiringDocuments}
        />
      </div>

      {/* ACTIONS + READINESS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6 border">
          <h2 className="text-2xl font-bold mb-5">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/residents/new"
              className="bg-blue-600 text-white text-center px-4 py-4 rounded-lg hover:bg-blue-700"
            >
              + Add Resident
            </Link>

            <Link
              href="/documents/new"
              className="bg-green-600 text-white text-center px-4 py-4 rounded-lg hover:bg-green-700"
            >
              + Upload Document
            </Link>

            <Link
              href="/compliance"
              className="bg-slate-900 text-white text-center px-4 py-4 rounded-lg hover:bg-slate-800"
            >
              View Checklist
            </Link>

            <Link
              href="/alerts"
              className="bg-yellow-500 text-white text-center px-4 py-4 rounded-lg hover:bg-yellow-600"
            >
              View Alerts
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border">
          <h2 className="text-2xl font-bold mb-5">
            Inspection Readiness
          </h2>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-5">
            <div
              className="bg-blue-600 h-4 rounded-full"
              style={{
                width: `${metrics.complianceScore}%`,
              }}
            />
          </div>

          <p className="text-gray-700">
            {metrics.complianceScore >= 90
              ? "Strong readiness. Continue monitoring upcoming expirations."
              : metrics.complianceScore >= 70
              ? "Moderate readiness. Review expiring and expired documents."
              : "Needs attention. Complete missing or expired compliance items before inspection."}
          </p>
        </div>
      </div>
    </div>
  );
}