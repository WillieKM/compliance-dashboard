import SettingSurveyPage from "@/app/compliance/_components/SettingSurveyPage";
import SettingComplianceLayout from "@/app/dashboard/_components/SettingComplianceLayout";
import { COMPLIANCE_SETTINGS } from "@/lib/compliance/careSettingCompliance";
export const dynamic = "force-dynamic";
export default function SurveyPage() {
  const s = COMPLIANCE_SETTINGS["multi-service"];
  return (
    <SettingComplianceLayout settingSlug={s.slug} settingLabel={s.label} settingReg={s.primaryRegulation} headerBg={s.headerBg}>
      <SettingSurveyPage setting={s} />
    </SettingComplianceLayout>
  );
}
