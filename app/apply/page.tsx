import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";
import nodemailer from "nodemailer";

const ROLES = [
  "Home Care Aide",
  "Certified Nursing Assistant (CNA)",
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Physical Therapist",
  "Occupational Therapist",
  "Speech Therapist",
  "Personal Care Worker",
  "Live-In Caregiver",
  "Companion / Sitter",
  "Care Coordinator",
  "Other",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function sendApplicationEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  previousEmployer: string;
  yearsExperience: string;
  certifications: string;
  startDate: string;
  availability: string;
  documentUrls: { name: string; url: string }[];
}) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.NOTIFICATION_EMAIL || user;

  if (!user || !pass) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const docsHtml =
    data.documentUrls.length > 0
      ? `<h3>Uploaded Documents</h3><ul>${data.documentUrls
          .map((d) => `<li><a href="${d.url}">${d.name}</a></li>`)
          .join("")}</ul>`
      : "<p>No documents uploaded.</p>";

  await transporter.sendMail({
    from: `"CareCompliance Applications" <${user}>`,
    to,
    subject: `New Application: ${data.firstName} ${data.lastName} — ${data.role}`,
    html: `
      <h2>New Staff Application</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${data.firstName} ${data.lastName}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${data.email}">${data.email}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${data.phone}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold">Role Applied For</td><td style="padding:8px">${data.role}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Previous Employer</td><td style="padding:8px">${data.previousEmployer || "—"}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold">Years of Experience</td><td style="padding:8px">${data.yearsExperience || "—"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Certifications</td><td style="padding:8px">${data.certifications || "—"}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold">Available Start Date</td><td style="padding:8px">${data.startDate || "—"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Availability</td><td style="padding:8px">${data.availability || "—"}</td></tr>
      </table>
      ${docsHtml}
      <hr/>
      <p style="color:#6b7280;font-size:12px">Submitted via CareCompliance portal</p>
    `,
  });
}

export default async function ApplyPage() {
  async function submitApplication(formData: FormData) {
    "use server";

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const role = String(formData.get("role") || "").trim();
    const previousEmployer = String(formData.get("previous_employer") || "").trim();
    const yearsExperience = String(formData.get("years_experience") || "").trim();
    const certifications = String(formData.get("certifications") || "").trim();
    const startDate = String(formData.get("start_date") || "").trim();
    const availabilityRaw = formData.getAll("availability").map(String);
    const availability = availabilityRaw.join(", ");

    if (!firstName || !lastName || !email || !role) {
      throw new Error("First name, last name, email, and role are required.");
    }

    // Upload documents to Supabase Storage
    const documentUrls: { name: string; url: string }[] = [];
    const files = formData.getAll("documents") as File[];

    for (const file of files) {
      if (!file || file.size === 0) continue;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `applications/${FACILITY_ID}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(path);
        documentUrls.push({ name: file.name, url: urlData.publicUrl });
      }
    }

    await sendApplicationEmail({
      firstName,
      lastName,
      email,
      phone,
      role,
      previousEmployer,
      yearsExperience,
      certifications,
      startDate,
      availability,
      documentUrls,
    });

    redirect("/apply/success");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-2">
            Join Our Team
          </p>
          <h1 className="text-4xl font-bold text-slate-900">Staff Application</h1>
          <p className="mt-3 text-slate-600">
            Fill out the form below and we&apos;ll be in touch within 2 business days.
          </p>
        </div>

        <form action={submitApplication} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  placeholder="Jane"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  placeholder="Smith"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="jane@email.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="(555) 000-0000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role Applying For <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a role...</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Work History */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Work History &amp; Experience
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Previous Employer
                </label>
                <input
                  type="text"
                  name="previous_employer"
                  placeholder="Sunrise Home Care"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Years of Experience
                </label>
                <select
                  name="years_experience"
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option>Less than 1 year</option>
                  <option>1–2 years</option>
                  <option>3–5 years</option>
                  <option>6–10 years</option>
                  <option>10+ years</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Certifications / Licenses
              </label>
              <textarea
                name="certifications"
                rows={3}
                placeholder="e.g. CNA License #12345 (exp. 2026), CPR/First Aid, HHA Certificate..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </section>

          {/* Availability */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Availability
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Available Start Date
              </label>
              <input
                type="date"
                name="start_date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Days Available
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="availability"
                      value={day}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-slate-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Document Uploads */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Documents <span className="text-sm font-normal text-slate-500">(optional)</span>
            </h2>
            <p className="text-sm text-slate-500">
              Upload your resume, certifications, or background check consent. Accepted: PDF, DOC, JPG, PNG (max 10 MB each).
            </p>
            <input
              type="file"
              name="documents"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
            />
          </section>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md"
          >
            Submit Application
          </button>

          <p className="text-center text-xs text-slate-400 pb-4">
            Your information is kept confidential and used only for hiring purposes.
          </p>
        </form>
      </div>
    </div>
  );
}
