import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export default async function AlertsPage() {
  async function resolveAlert(formData: FormData) {
    "use server";

    const alertId = formData.get("alert_id") as string;

    await supabase
      .from("alerts")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    revalidatePath("/alerts");
  }

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .eq("facility_id", FACILITY_ID)
    .order("due_date", { ascending: true });

  const activeAlerts = alerts?.filter((alert) => !alert.resolved) || [];
  const resolvedAlerts = alerts?.filter((alert) => alert.resolved) || [];

  function getBadge(alertType: string) {
    if (alertType === "expired_document") {
      return "bg-red-100 text-red-700";
    }

    if (alertType === "expiring_document") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-gray-100 text-gray-700";
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Alerts</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Active Alerts</h2>

        {activeAlerts.length > 0 ? (
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{alert.title}</h3>
                    <p className="text-gray-600">{alert.message}</p>

                    <div className="mt-2 flex gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getBadge(
                          alert.alert_type
                        )}`}
                      >
                        {alert.alert_type}
                      </span>

                      <span className="inline-flex rounded-full px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700">
                        Due: {alert.due_date || "N/A"}
                      </span>
                    </div>
                  </div>

                  <form action={resolveAlert}>
                    <input type="hidden" name="alert_id" value={alert.id} />

                    <button
                      type="submit"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No active alerts.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Resolved Alerts</h2>

        {resolvedAlerts.length > 0 ? (
          <div className="space-y-4">
            {resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 bg-gray-50 opacity-80"
              >
                <h3 className="font-bold">{alert.title}</h3>
                <p className="text-gray-600">{alert.message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Resolved: {alert.resolved_at || "N/A"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No resolved alerts.</p>
        )}
      </div>
    </div>
  );
}