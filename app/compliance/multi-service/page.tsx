import SettingComplianceDashboard from "../_components/SettingComplianceDashboard";
import { COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";
export const dynamic = "force-dynamic";
export default function MultiServiceCompliancePage() {
  return <SettingComplianceDashboard setting={COMPLIANCE_SETTINGS["multi-service"]} />;
}
