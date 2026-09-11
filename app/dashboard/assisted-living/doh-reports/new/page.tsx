import DohReportableLogNewForm from "../../../_components/DohReportableLogNewForm";
export const dynamic = "force-dynamic";

export default function ALDohReportsNewPage() {
  return (
    <DohReportableLogNewForm
      careSetting="AL"
      settingLabel="Assisted Living"
      backHref="/dashboard/assisted-living"
      listHref="/dashboard/assisted-living/doh-reports"
      headerBg="linear-gradient(135deg, #6d28d9, #4c1d95)"
      wacRef="WAC 388-78A-2550"
    />
  );
}
