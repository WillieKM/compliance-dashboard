"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { FACILITY_ID } from "@/lib/constants";

export default function NewResidentPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("Active");
  const [roomNumber, setRoomNumber] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.from("residents").insert([
      {
        facility_id: FACILITY_ID,
        first_name: firstName,
        last_name: lastName,
        status,
        room_number: roomNumber,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.assign("/residents");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">Add Resident</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow space-y-6"
      >
        <div>
          <label className="block mb-2 font-medium">First Name</label>

          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border rounded-lg p-3"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Last Name</label>

          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border rounded-lg p-3"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Status</label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-lg p-3"
          >
            <option>Active</option>
            <option>Not Active</option>
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium">Room Number</label>

          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="w-full border rounded-lg p-3"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Save Resident
        </button>
      </form>
    </div>
  );
}