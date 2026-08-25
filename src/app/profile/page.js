"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocale } from "@/hooks/useLocale";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useThemeMode();
  const { t } = useTranslation();
  const [locale, setLocale] = useLocale();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading" || !session) return null;

  const initial = session.user.name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t("profile.title")}
      </Typography>
      <Card sx={{ maxWidth: 480 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: 28 }}>
              {initial}
            </Avatar>
            <Box>
              <Typography variant="h6">{session.user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{session.user.email}</Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("profile.name")}
              </Typography>
              <Typography variant="body1">{session.user.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("profile.email")}
              </Typography>
              <Typography variant="body1">{session.user.email}</Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("profile.appearance")}
            </Typography>
            <FormControlLabel
              sx={{ display: "flex", mt: 0.5 }}
              control={
                <Switch
                  checked={mode === "dark"}
                  onChange={(e) => setMode(e.target.checked ? "dark" : "light")}
                />
              }
              label={t("profile.darkMode")}
            />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("profile.language")}
            </Typography>
            <ToggleButtonGroup
              value={locale}
              exclusive
              onChange={(_, val) => val && setLocale(val)}
              size="small"
              sx={{ display: "flex", mt: 0.5 }}
            >
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="es">ES</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
