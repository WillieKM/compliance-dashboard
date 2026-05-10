import SettingDashboard from "../_components/SettingDashboard";
import { CARE_SETTINGS } from "@/lib/config/careSettings";

export const metadata = { title: "Multi-Service Dashboard — CareCompliance" };

export default function MultiServicePage() {
  return <SettingDashboard setting={CARE_SETTINGS.MULTI_SERVICE} />;
}
