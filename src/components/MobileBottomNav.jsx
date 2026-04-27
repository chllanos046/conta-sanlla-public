"use client";

import { usePathname, useRouter } from "next/navigation";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useTransactionDialog } from "@/contexts/TransactionDialogContext";

const NAV_ITEMS = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { label: "Transactions", icon: <ReceiptLongIcon />, path: "/transactions" },
  { label: "Add", icon: <AddCircleIcon />, path: null },
  { label: "Settings", icon: <SettingsIcon />, path: "/settings/mobile" },
  { label: "Account", icon: <AccountCircleIcon />, path: "/account/mobile" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { openTransactionDialog } = useTransactionDialog();

  const activeIndex = NAV_ITEMS.findIndex(
    (item) => item.path && pathname.startsWith(item.path)
  );

  const handleChange = (_, newValue) => {
    const item = NAV_ITEMS[newValue];
    if (item.path === null) {
      openTransactionDialog();
    } else {
      router.push(item.path);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
      }}
    >
      <BottomNavigation
        value={activeIndex === -1 ? false : activeIndex}
        onChange={handleChange}
        showLabels={false}
        sx={{ height: 72 }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.label}
            icon={item.icon}
            sx={{
              minWidth: 0,
              "& .MuiSvgIcon-root": { fontSize: 30 },
              "& .MuiBottomNavigationAction-label": { display: "none" },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
