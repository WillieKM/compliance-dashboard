"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const ROLES = [
  "Home Care Aide", "Certified Nursing Assistant (CNA)", "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)", "Physical Therapist", "Occupational Therapist",
  "Speech Therapist", "Personal Care Worker", "Live-In Caregiver",
  "Companion / Sitter", "Care Coordinator", "Other",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

type OrgBrand = { name: string; primary_color: string | null; logo_url: string | null; tagline: string | null };

export default function BrandedApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg]         = useState<OrgBrand | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName]               = useState("");
  const [lastName, setLastName]                 = useState("");
  const [email, setEmail]                       = useState("");
  const [phone, setPhone]                       = useState("");
  const [role, setRole]                         = useState("");
  const [previousEmployer, setPreviousEmployer] = useState("");
  const [yearsExperience, setYearsExperience]   = useState("");
  const [certifications, setCertifications]     = useState("");
  const [startDate, setStartDate]               = useState("");
  const [availability, setAvailability]         = useState<string[]>([]);
  const [notes, setNotes]                       = useState("");
  const [photoFile, setPhotoFile]               = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]         = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/portal/${slug}/org`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setOrg(data ?? { name: "Care Agency", primary_color: "#1a3a52", logo_url: null, tagline: null }))
      .catch(() => setOrg({ name: "Care Agency", primary_color: "#1a3a52", logo_url: null, tagline: null }));
  }, [slug]);

  function toggleDay(day: string) {
    setAvailability(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !role) {
      setError("First name, last name, email, and role are required.");
      return;
    }
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("firstName", firstName);
    fd.append("lastName", lastName);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("role", role);
    fd.append("previousEmployer", previousEmployer);
    fd.append("yearsExperience", yearsExperience);
    fd.append("certifications", certifications);
    fd.append("startDate", startDate);
    fd.append("availability", availability.join(", "));
    fd.append("notes", notes);
    if (photoFile) fd.append("photo", photoFile);

    const res = await fetch(`/api/portal/${slug}/apply`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  }

  const color = org?.primary_color ?? "#1a3a52";
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 text-sm";

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow border border-slate-100 p-10">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
        <p className="text-slate-500 mb-2">
          Thank you for applying to <strong>{org.name}</strong>.
        </p>
        <p className="text-sm text-slate-400 mb-6">
          We'll be in touch within 2 business days.
        </p>
        <Link href={`/portal/${slug}`}
          className="inline-block w-full rounded-xl py-3 font-bold text-white hover:opacity-90 text-center"
          style={{ backgroundColor: color }}>
          Back to Portal
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-12">
      {/* Branded header */}
      <div className="text-white px-8 py-6 mb-8" style={{ backgroundColor: color }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {org.logo_url
            ? <img src={org.logo_url} alt={org.name} className="h-14 w-14 rounded-xl object-contain bg-white/10 p-1" />
            : <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold">{org.name.slice(0,2).toUpperCase()}</div>
          }
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider opacity-75">Join Our Team</p>
            <h1 className="text-3xl font-bold">{org.name}</h1>
            {org.tagline && <p className="text-sm opacity-70 mt-0.5">{org.tagline}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Staff Application</h2>
          <p className="text-slate-500 mt-1">Fill out the form and we'll be in touch within 2 business days.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {/* Photo upload */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Your Photo</h3>
            <div className="flex items-center gap-5">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover border-2 border-slate-200 shrink-0" />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-3xl text-slate-300 shrink-0">
                  👤
                </div>
              )}
              <div className="flex-1">
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <button type="button" onClick={() => photoRef.current?.click()}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {photoFile ? "Change Photo" : "Upload Photo"}
                </button>
                {photoFile && (
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoRef.current) photoRef.current.value = ""; }}
                    className="ml-2 text-sm text-red-500 hover:text-red-700">Remove</button>
                )}
                <p className="text-xs text-slate-400 mt-1.5">Optional but recommended. Helps the agency identify you. Clear face photo preferred.</p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} required placeholder="Jane" className={inp} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} required placeholder="Smith" className={inp} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="jane@email.com" className={inp} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 000-0000" className={inp} /></div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role Applying For <span className="text-red-500">*</span></label>
                <select value={role} onChange={e=>setRole(e.target.value)} required className={inp} defaultValue="">
                  <option value="" disabled>Select a role...</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Work History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Work History &amp; Experience</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Previous Employer</label>
                <input type="text" value={previousEmployer} onChange={e=>setPreviousEmployer(e.target.value)} placeholder="Sunrise Home Care" className={inp} /></div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Years of Experience</label>
                <select value={yearsExperience} onChange={e=>setYearsExperience(e.target.value)} className={inp}>
                  <option value="">Select...</option>
                  <option>Less than 1 year</option><option>1–2 years</option>
                  <option>3–5 years</option><option>6–10 years</option><option>10+ years</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Certifications / Licenses</label>
                <textarea value={certifications} onChange={e=>setCertifications(e.target.value)} rows={3}
                  placeholder="e.g. CNA License #12345 (exp. 2026), CPR/First Aid, HHA Certificate..."
                  className={`${inp} resize-none`} />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Availability</h3>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Available Start Date</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2" /></div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Days Available</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map(day => (
                  <label key={day} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={availability.includes(day)} onChange={()=>toggleDay(day)} className="accent-blue-600" />
                    <span className="text-sm text-slate-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Additional Notes</h3>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="Anything else you'd like us to know..."
              className={`${inp} resize-none`} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-2xl py-4 text-lg font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity shadow-lg"
            style={{ backgroundColor: color }}>
            {loading ? "Submitting…" : "Submit Application"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Your information is kept confidential and used only for hiring purposes.
          </p>
        </form>
      </div>
    </div>
  );
}
