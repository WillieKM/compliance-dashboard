import DohReportableLog from "../../_components/DohReportableLog";
export const dynamic = "force-dynamic";

export default function AFHDohReportsPage() {
  return (
    <DohReportableLog
      careSetting="AFH"
      settingLabel="AFH"
      backHref="/dashboard/afh"
      headerBg="linear-gradient(135deg, #b45309, #92400e)"
      wacRef="WAC 388-76-04100"
      newHref="/dashboard/afh/doh-reports/new"
    />
  );
}
