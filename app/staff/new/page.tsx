import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export default function NewStaffPage() {
  async function createStaff(formData: FormData) {
    "use server";

    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;
    const role = formData.get("role") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const { error } = await supabase.from("staff").insert({
      facility_id: FACILITY_ID,
      first_name: firstName,
      last_name: lastName,
      role,
      email,
      phone,
      status: "active",
    });

    if (error) {
      throw new Error(error.message);
    }

    redirect("/staff");
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">
        Add Staff Member
      </h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <form action={createStaff} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium">
              First Name
            </label>

            <input
              type="text"
              name="first_name"
              required
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Last Name
            </label>

            <input
              type="text"
              name="last_name"
              required
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Role
            </label>

            <input
              type="text"
              name="role"
              className="w-full border rounded-lg p-3"
              placeholder="Caregiver, Nurse, Administrator..."
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Email
            </label>

            <input
              type="email"
              name="email"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Phone
            </label>

            <input
              type="text"
              name="phone"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Create Staff Member
          </button>
        </form>
      </div>
    </div>
  );
}