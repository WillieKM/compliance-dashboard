import NotesReviewPage from "../../_components/NotesReviewPage";
export const dynamic = "force-dynamic";
export default function MultiServiceNotesPage() {
  return (
    <NotesReviewPage
      settingSlug="multi-service"
      settingLabel="Multi-Service"
      backHref="/dashboard/multi-service"
      headerBg="linear-gradient(135deg, #0f766e, #0d9488)"
    />
  );
}
