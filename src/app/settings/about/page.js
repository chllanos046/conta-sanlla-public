import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import packageJson from "../../../../package.json";

export default function AboutPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 3,
      }}
    >
      <Image
        src="/logo.png"
        alt="Conta Sanlla"
        width={120}
        height={120}
        style={{ borderRadius: 24 }}
      />
      <Typography variant="h4">Conta Sanlla</Typography>
      <Typography variant="body1" color="text.secondary">
        Version {packageJson.version}
      </Typography>
    </Box>
  );
}
