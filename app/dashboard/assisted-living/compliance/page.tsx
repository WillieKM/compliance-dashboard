import SettingCompliancePage from "../../_components/SettingCompliancePage";
import { COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";
export const dynamic = "force-dynamic";
export default function ALCompliancePage() {
  return <SettingCompliancePage setting={COMPLIANCE_SETTINGS["assisted-living"]} />;
}
