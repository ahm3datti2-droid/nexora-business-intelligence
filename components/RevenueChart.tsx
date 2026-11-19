"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueChart({
  data,
}: {
  data: { label: string; revenue: number; profit: number }[];
}) {
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#142B55" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#8B9BB2" fontSize={12} />
          <YAxis stroke="#8B9BB2" fontSize={12} />
          <Tooltip
            contentStyle={{ background: "#0D1B2D", border: "1px solid #142B55", borderRadius: 8 }}
            labelStyle={{ color: "#F4F7FC" }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#2878FF" strokeWidth={2} name="Revenue" />
          <Line type="monotone" dataKey="profit" stroke="#80B8FF" strokeWidth={2} name="Profit" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
