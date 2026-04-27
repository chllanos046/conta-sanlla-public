"use client";

import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CategoryIcon from "@mui/icons-material/Category";

const SETTINGS_ITEMS = [
  { label: "Accounts", icon: <AccountBalanceIcon />, path: "/accounts" },
  { label: "Categories", icon: <CategoryIcon />, path: "/categories" },
];

export default function MobileSettingsPage() {
  const router = useRouter();

  return (
    <>
      <Typography variant="h6" sx={{ px: 2, pt: 2, pb: 1 }}>
        Settings
      </Typography>
      <Divider />
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
