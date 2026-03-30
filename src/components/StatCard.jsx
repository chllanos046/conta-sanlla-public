"use client";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";

export default function StatCard({ label, value, valueColor, icon, iconBg = "grey.300", href }) {
  const card = (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
