"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DocumentCategoryChart({
  data,
}: {
  data: {
    category: string;
    total: number;
  }[];
}) {
  return (
    <div className="bg-white rounded-xl shadow p-6 border">
      <h2 className="text-2xl font-bold mb-6">
        Documents by Category
      </h2>

      <div
        style={{
          width: "100%",
          height: 350,
        }}
      >
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />

            <Bar
              dataKey="total"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}