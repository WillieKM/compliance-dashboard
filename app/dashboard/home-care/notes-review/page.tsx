import NotesReviewPage from "../../_components/NotesReviewPage";
export const dynamic = "force-dynamic";
export default function HomeCareNotesPage() {
  return (
    <NotesReviewPage
      settingSlug="home-care"
      settingLabel="Home Care"
      backHref="/dashboard/home-care"
      headerBg="linear-gradient(135deg, #1a3a52, #274f6e)"
    />
  );
}
