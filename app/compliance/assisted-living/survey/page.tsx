import SettingSurveyPage from "../../_components/SettingSurveyPage";
import { COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";
export const dynamic = "force-dynamic";
export default function AssistedLivingSurveyPage() {
  return <SettingSurveyPage setting={COMPLIANCE_SETTINGS["assisted-living"]} />;
}
