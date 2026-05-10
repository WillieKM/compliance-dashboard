import SettingDashboard from "../_components/SettingDashboard";
import { CARE_SETTINGS } from "@/lib/config/careSettings";

export const metadata = { title: "Home Care Dashboard — CareCompliance" };

export default function HomeCarePage() {
  return <SettingDashboard setting={CARE_SETTINGS.HOME_CARE} />;
}
