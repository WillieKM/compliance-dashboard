import NotesReviewPage from "../../_components/NotesReviewPage";
export const dynamic = "force-dynamic";
export default function HomeCareNotesPage({
  searchParams,
}: {
  searchParams?: { client?: string; days?: string; caregiver?: string };
}) {
  return (
    <NotesReviewPage
      settingSlug="home-care"
      settingLabel="Home Care"
      backHref="/dashboard/home-care"
      headerBg="linear-gradient(135deg, #1a3a52, #274f6e)"
      clientFilter={searchParams?.client}
      caregiverFilter={searchParams?.caregiver}
      daysFilter={searchParams?.days}
    />
  );
}
