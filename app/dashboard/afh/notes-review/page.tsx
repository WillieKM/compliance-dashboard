import NotesReviewPage from "../../_components/NotesReviewPage";
export const dynamic = "force-dynamic";
export default function AFHNotesPage({
  searchParams,
}: {
  searchParams?: { client?: string; days?: string; caregiver?: string };
}) {
  return (
    <NotesReviewPage
      settingSlug="afh"
      settingLabel="AFH"
      backHref="/dashboard/afh"
      headerBg="linear-gradient(135deg, #92400e, #b45309)"
      clientFilter={searchParams?.client}
      caregiverFilter={searchParams?.caregiver}
      daysFilter={searchParams?.days}
    />
  );
}
