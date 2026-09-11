import DohReportableLog from "../../_components/DohReportableLog";
export const dynamic = "force-dynamic";

export default function HCDohReportsPage() {
  return (
    <DohReportableLog
      careSetting="HOME_CARE"
      settingLabel="Home Care"
      backHref="/dashboard/home-care"
      headerBg="linear-gradient(135deg, #1a3a52, #274f6e)"
      wacRef="WAC 246-335-440"
      newHref="/dashboard/home-care/doh-reports/new"
    />
  );
}
