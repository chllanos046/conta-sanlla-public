"use client";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

export default function StatCard({ label, value, valueColor, icon, iconBg = "grey.300", href, sparkData, sparkColor }) {
  const card = (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h5" color={valueColor} fontWeight={700}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: iconBg,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {icon}
          </Box>
        </Box>
        {sparkData && sparkData.length > 1 && (
          <Box sx={{ mt: 1, mx: -1 }}>
            <SparkLineChart
              data={sparkData}
              height={56}
              showHighlight
              showTooltip
              area
              colors={[sparkColor || "#1976d2"]}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
        {card}
      </Link>
    );
  }

  return card;
}
