"use client";

import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CategoryIcon from "@mui/icons-material/Category";
import { useTranslation } from "@/hooks/useTranslation";

export default function MobileSettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const SETTINGS_ITEMS = [
    { label: t("nav.accounts"), icon: <AccountBalanceIcon />, path: "/accounts" },
    { label: t("nav.categories"), icon: <CategoryIcon />, path: "/categories" },
  ];

  return (
    <>
      <Typography variant="h6" sx={{ px: 2, pt: 2, pb: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        {t("settings.title")}
      </Typography>
      <List disablePadding>
        {SETTINGS_ITEMS.map((item) => (
          <ListItemButton key={item.label} onClick={() => router.push(item.path)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}
