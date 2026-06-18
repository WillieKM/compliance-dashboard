import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@supabase/supabase-js";
import { sendStaffOnboardingEmail } from "@/lib/email";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function NewStaffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const { error: pageError } = await searchParams;

  async function createStaff(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p) redirect("/login");
    const db = admin();
    const emailVal = String(formData.get("email") || "") || null;

    // Handle optional photo upload
    const photoFile = formData.get("photo") as File | null;
    let photoUrl: string | null = null;
    if (photoFile && photoFile.size > 0) {
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${p.facility_id}/staff-photos/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await db.storage.from("documents").upload(filePath, photoFile, { upsert: false });
      if (!uploadErr) {
        const { data: urlData } = db.storage.from("documents").getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await db.from("staff").insert({
      facility_id:     p.facility_id,
      first_name:      String(formData.get("first_name") || ""),
      last_name:       String(formData.get("last_name") || ""),
      role:            String(formData.get("role") || "") || null,
      email:           emailVal,
      phone:           String(formData.get("phone") || "") || null,
      status:          "active",
      tax_withholding: String(formData.get("tax_withholding") || "W2"),
      photo_url:       photoUrl,
      signing_token:   crypto.randomUUID(),
    }).select("id, first_name, last_name, onboarding_token").single();
    if (error) redirect(`/staff/new?error=${encodeURIComponent(error.message)}`);

    if (emailVal && data.onboarding_token) {
      const orgRes = await db.from("organizations").select("name, primary_color").eq("id", p.facility_id).maybeSingle();
      const org = orgRes.data;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      try {
        await sendStaffOnboardingEmail({
          to:          emailVal,
          staffName:   `${data.first_name} ${data.last_name}`,
          agencyName:  org?.name ?? "Your Agency",
          agencyColor: org?.primary_color ?? "#1a3a52",
          uploadUrl:   `${appUrl}/staff-onboarding/${data.onboarding_token}`,
        });
      } catch (e) {
        console.error("Onboarding email failed:", e);
      }
    }

    redirect(`/staff/${data.id}/welcome-letter`);
  }

  const inp = "w-full border rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <Link href="/staff" className="text-blue-600 hover:underline text-sm">← Back to Staff</Link>
      <h1 className="text-4xl font-bold my-6">Add Staff Member</h1>
      {pageError && <div className="mb-4 rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">{pageError}</div>}
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <form action={createStaff} className="space-y-5" encType="multipart/form-data">

          {/* Photo upload */}
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Staff Photo (optional)</label>
            <input type="file" name="photo" accept="image/*" className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <p className="mt-1 text-xs text-slate-400">Photo will appear on staff list and profile. Recommended: square image.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-medium text-slate-700">First Name *</label>
              <input type="text" name="first_name" required className={inp} />
            </div>
            <div>
              <label className="block mb-1.5 font-medium text-slate-700">Last Name *</label>
              <input type="text" name="last_name" required className={inp} />
            </div>
          </div>
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Role / Position</label>
            <input type="text" name="role" placeholder="e.g. Caregiver, RN, Administrator" className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-medium text-slate-700">Email</label>
              <input type="email" name="email" className={inp} />
            </div>
            <div>
              <label className="block mb-1.5 font-medium text-slate-700">Phone</label>
              <input type="text" name="phone" className={inp} />
            </div>
          </div>

          {/* Tax Withholding */}
          <div>
            <label className="block mb-1.5 font-medium text-slate-700">Tax Withholding Preference</label>
            <select name="tax_withholding" id="tax_select" defaultValue="W2" className={inp}>
              <option value="W2">W-2 Employee — taxes withheld by employer</option>
              <option value="1099">1099 Independent Contractor — I pay my own taxes</option>
            </select>
            <div id="tax_disclaimer" className="mt-3 hidden rounded-lg bg-amber-50 border border-amber-300 p-4 text-sm text-amber-900">
              <p className="font-bold mb-1">Independent Contractor Tax Responsibility Notice</p>
              <p>By selecting 1099 status, you acknowledge that you are solely responsible for paying all applicable federal, state, and local taxes on income earned from this agency — including self-employment tax. No taxes will be withheld from your payments. You may be required to make estimated quarterly tax payments to the IRS. Please consult a licensed tax professional if you have questions.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold">
              Save &amp; Generate Welcome Letter
            </button>
            <Link href="/staff" className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var sel=document.getElementById('tax_select');
          var disc=document.getElementById('tax_disclaimer');
          if(!sel||!disc) return;
          sel.addEventListener('change',function(){
            disc.classList.toggle('hidden',this.value!=='1099');
          });
        })();
      ` }} />
    </div>
  );
}
