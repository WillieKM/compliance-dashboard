import SettingComplianceDashboard from "../_components/SettingComplianceDashboard";
import { COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";
export const dynamic = "force-dynamic";
export default function HomeCarePage() {
  return <SettingComplianceDashboard setting={COMPLIANCE_SETTINGS["home-care"]} />;
}
