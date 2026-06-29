import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { rankCaregivers } from "@/lib/scheduling/matchCaregivers";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { residentId, careType, date, startTime, endTime } = await request.json();
  if (!date || !careType) return NextResponse.json({ error: "date and careType are required" }, { status: 400 });

  const result = await rankCaregivers({
    facilityId: profile.facility_id,
    residentId: residentId || null,
    careType,
    date,
    startTime: startTime || null,
    endTime: endTime || null,
  });
  return NextResponse.json(result);
}
