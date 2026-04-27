"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTheme } from "@mui/material/styles";

export default function MobileAccountSheet() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();

  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 3,
          px: 2,
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: theme.palette.primary.main,
            fontSize: 24,
            mb: 1,
          }}
        >
          {initial}
        </Avatar>
        <Typography variant="subtitle1" fontWeight={600}>
          {session?.user?.name ?? ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {session?.user?.email ?? ""}
        </Typography>
      </Box>
      <Divider />
      <List disablePadding>
        <ListItemButton onClick={() => router.push("/profile")}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItemButton>
        <ListItemButton onClick={() => signOut()}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </>
  );
}
