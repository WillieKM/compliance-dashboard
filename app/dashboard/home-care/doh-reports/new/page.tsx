import DohReportableLogNewForm from "../../../_components/DohReportableLogNewForm";
export const dynamic = "force-dynamic";

export default function HCDohReportsNewPage() {
  return (
    <DohReportableLogNewForm
      careSetting="HOME_CARE"
      settingLabel="Home Care"
      backHref="/dashboard/home-care"
      listHref="/dashboard/home-care/doh-reports"
      headerBg="linear-gradient(135deg, #1a3a52, #274f6e)"
      wacRef="WAC 246-335-440"
    />
  );
}
