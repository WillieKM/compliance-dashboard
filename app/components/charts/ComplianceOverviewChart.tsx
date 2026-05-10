"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#2563eb", "#dc2626", "#eab308"];

export default function ComplianceOverviewChart({
  complianceScore,
  expiredDocuments,
  expiringDocuments,
}: {
  complianceScore: number;
  expiredDocuments: number;
  expiringDocuments: number;
}) {
  const data = [
    { name: "Compliant", value: complianceScore },
    { name: "Expired", value: expiredDocuments },
    { name: "Expiring Soon", value: expiringDocuments },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={110}
          label
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
