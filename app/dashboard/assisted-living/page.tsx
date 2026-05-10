import SettingDashboard from "../_components/SettingDashboard";
import { CARE_SETTINGS } from "@/lib/config/careSettings";

export const metadata = { title: "Assisted Living Dashboard — CareCompliance" };

export default function AssistedLivingPage() {
  return <SettingDashboard setting={CARE_SETTINGS.ASSISTED_LIVING} />;
}
