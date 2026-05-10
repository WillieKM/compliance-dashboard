import SettingDashboard from "../_components/SettingDashboard";
import { CARE_SETTINGS } from "@/lib/config/careSettings";

export const metadata = { title: "Adult Family Home Dashboard — CareCompliance" };

export default function AFHPage() {
  return <SettingDashboard setting={CARE_SETTINGS.AFH} />;
}
