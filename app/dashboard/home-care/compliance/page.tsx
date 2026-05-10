import SettingCompliancePage from "../../_components/SettingCompliancePage";
import { COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";
export const dynamic = "force-dynamic";
export default function HomeCarCompliancePage() {
  return <SettingCompliancePage setting={COMPLIANCE_SETTINGS["home-care"]} />;
}
