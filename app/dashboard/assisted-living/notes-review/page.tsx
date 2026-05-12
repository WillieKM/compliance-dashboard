import NotesReviewPage from "../../_components/NotesReviewPage";
export const dynamic = "force-dynamic";
export default function ALNotesPage() {
  return (
    <NotesReviewPage
      settingSlug="assisted-living"
      settingLabel="Assisted Living"
      backHref="/dashboard/assisted-living"
      headerBg="linear-gradient(135deg, #4c1d95, #6d28d9)"
    />
  );
}
