"use client";
import { BarChart } from "@mui/x-charts/BarChart";

export default function DashboardCharts({ data }) {
  return (
    <BarChart
      xAxis={[{ data: data.map((d) => d.name), scaleType: "band" }]}
      series={[{ data: data.map((d) => d.amount), label: "Amount", color: "#1976d2" }]}
      height={300}
      sx={{ width: "100%" }}
    />
  );
}
