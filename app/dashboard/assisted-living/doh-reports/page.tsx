import DohReportableLog from "../../_components/DohReportableLog";
export const dynamic = "force-dynamic";

export default function ALDohReportsPage() {
  return (
    <DohReportableLog
      careSetting="AL"
      settingLabel="Assisted Living"
      backHref="/dashboard/assisted-living"
      headerBg="linear-gradient(135deg, #6d28d9, #4c1d95)"
      wacRef="WAC 388-78A-2550"
      newHref="/dashboard/assisted-living/doh-reports/new"
    />
  );
}
