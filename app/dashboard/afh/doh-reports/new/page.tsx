import DohReportableLogNewForm from "../../../_components/DohReportableLogNewForm";
export const dynamic = "force-dynamic";

export default function AFHDohReportsNewPage() {
  return (
    <DohReportableLogNewForm
      careSetting="AFH"
      settingLabel="AFH"
      backHref="/dashboard/afh"
      listHref="/dashboard/afh/doh-reports"
      headerBg="linear-gradient(135deg, #b45309, #92400e)"
      wacRef="WAC 388-76-04100"
    />
  );
}
