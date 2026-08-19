"use client";
import { useState, useEffect } from "react";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CategoryIcon from "@mui/icons-material/Category";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import axios from "axios";
import { convertAmount, getCurrencySymbol } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";


const ACCOUNT_TYPE_ORDER = ["bank", "cash", "investment", "credit"];
const ACCOUNT_TYPE_LABELS = { bank: "Bank", cash: "Cash", investment: "Investment", credit: "Credit" };

export default function Sidebar({
  open,
  mobileOpen,
  onMobileClose,
  isMobile,
  drawerWidth,
  miniWidth,
}) {
  const pathname = usePathname();
  const width = open ? drawerWidth : miniWidth;
  const expanded = open || isMobile;
  const { data: session } = useSession();

  const [displayCurrency] = useCurrency();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(
    ACCOUNT_TYPE_ORDER.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );
  const [accounts, setAccounts] = useState([]);
  const [rates, setRates] = useState({});
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);

  const loadAccounts = () => {
    axios.get("/api/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
  };

  useEffect(() => {
    loadAccounts();
    axios.get("/api/exchange-rates").then(({ data }) => setRates(data)).catch(() => {});

    window.addEventListener("accounts-updated", loadAccounts);
    return () => window.removeEventListener("accounts-updated", loadAccounts);
  }, []);

  const groupedAccounts = ACCOUNT_TYPE_ORDER.reduce((acc, type) => {
    const items = accounts.filter((a) => a.type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  const navItemSx = { minHeight: 48, px: 2.5, justifyContent: expanded ? "initial" : "center" };
  const iconSx = { minWidth: 0, mr: expanded ? 2 : "auto", justifyContent: "center" };

  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() ?? "U";

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <List sx={{ pt: 1, flex: 1 }} disablePadding>
        {/* Dashboard */}
        <Tooltip title={!expanded ? "Dashboard" : ""} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard"
              selected={pathname === "/dashboard"}
              onClick={isMobile ? onMobileClose : undefined}
              sx={navItemSx}
            >
              <ListItemIcon sx={iconSx}><DashboardIcon /></ListItemIcon>
              {expanded && <ListItemText primary="Dashboard" />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {/* Transactions */}
        <Tooltip title={!expanded ? "Transactions" : ""} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/transactions"
              selected={pathname === "/transactions"}
              onClick={isMobile ? onMobileClose : undefined}
              sx={navItemSx}
            >
              <ListItemIcon sx={iconSx}><ReceiptLongIcon /></ListItemIcon>
              {expanded && <ListItemText primary="Transactions" />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {/* Accounts grouped by type */}
        {Object.entries(groupedAccounts).map(([type, items]) => {
          const arsRate = rates.ARS || 1;
          const groupBalance = items.reduce(
            (sum, a) => sum + convertAmount(parseFloat(a.current_balance || 0), a.currency, displayCurrency, arsRate),
            0
          );
          const isOpen = openGroups[type];

          return (
            <Box key={type}>
              {expanded ? (
                <>
                  <ListItemButton
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [type]: !prev[type] }))}
                    sx={{
                      bgcolor: "grey.100",
                      borderTop: "1px solid rgba(0,0,0,0.08)",
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                      px: 2,
                      py: 0.75,
                      minHeight: 36,
                      "&:hover": { bgcolor: "grey.200" },
                    }}
                  >
                    {isOpen ? (
                      <ExpandLessIcon fontSize="small" sx={{ mr: 1, color: "text.secondary", flexShrink: 0 }} />
                    ) : (
                      <ExpandMoreIcon fontSize="small" sx={{ mr: 1, color: "text.secondary", flexShrink: 0 }} />
                    )}
                    <Typography
                      variant="caption"
                      sx={{ flex: 1, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}
                    >
                      {ACCOUNT_TYPE_LABELS[type]}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: groupBalance > 0 ? "income.main" : groupBalance < 0 ? "expense.main" : "text.disabled",
                      }}
                    >
                      {formatCurrency(groupBalance, displayCurrency)}
                    </Typography>
                  </ListItemButton>

                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    {items.map((acc) => {
                      const bal = parseFloat(acc.current_balance || 0);
                      return (
                        <ListItem key={acc.id} disablePadding>
                          <ListItemButton
                            component={Link}
                            href={`/transactions?account=${acc.id}`}
                            onClick={isMobile ? onMobileClose : undefined}
                            sx={{
                              px: 2,
                              py: 1,
                              borderBottom: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 0, mr: 1.5, flexShrink: 0 }}>
                              {acc.image_path ? (
                                <Box
                                  component="img"
                                  src={acc.image_path}
                                  alt={acc.name}
                                  sx={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                                />
                              ) : (
                                <AccountTypeIcon type={acc.type} />
                              )}
                            </ListItemIcon>
                            <Box sx={{ flex: 1, overflow: "hidden", textAlign: "right" }}>
                              <Typography variant="body2" noWrap>{acc.name}</Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  color: bal > 0 ? "income.main" : bal < 0 ? "expense.main" : "text.disabled",
                                }}
                              >
                                {formatCurrency(bal, acc.currency)}
                              </Typography>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </Collapse>
                </>
              ) : (
                items.map((acc) => (
                  <Tooltip
                    key={acc.id}
                    title={`${acc.name} · ${getCurrencySymbol(acc.currency)}${parseFloat(acc.current_balance || 0).toFixed(2)}`}
                    placement="right"
                  >
                    <ListItem disablePadding>
                      <ListItemButton
                        component={Link}
                        href={`/transactions?account=${acc.id}`}
                        onClick={isMobile ? onMobileClose : undefined}
                        sx={{ minHeight: 48, justifyContent: "center", px: 2.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                          {acc.image_path ? (
                            <Box
                              component="img"
                              src={acc.image_path}
                              alt={acc.name}
                              sx={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <AccountTypeIcon type={acc.type} />
                          )}
                        </ListItemIcon>
                      </ListItemButton>
                    </ListItem>
                  </Tooltip>
                ))
              )}
            </Box>
          );
        })}

        {/* Settings collapsible */}
        <Tooltip title={!expanded ? "Settings" : ""} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => expanded && setSettingsOpen((prev) => !prev)}
              sx={navItemSx}
            >
              <ListItemIcon sx={iconSx}><SettingsIcon /></ListItemIcon>
              {expanded && (
                <>
                  <ListItemText primary="Settings" />
                  {settingsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </>
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        {expanded && (
          <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/accounts"
                  selected={pathname.startsWith("/accounts")}
                  onClick={isMobile ? onMobileClose : undefined}
                  sx={{ ...navItemSx, pl: 4 }}
                >
                  <ListItemIcon sx={iconSx}><AccountBalanceIcon /></ListItemIcon>
                  <ListItemText primary="Accounts" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/categories"
                  selected={pathname.startsWith("/categories")}
                  onClick={isMobile ? onMobileClose : undefined}
                  sx={{ ...navItemSx, pl: 4 }}
                >
                  <ListItemIcon sx={iconSx}><CategoryIcon /></ListItemIcon>
                  <ListItemText primary="Categories" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/settings/about"
                  selected={pathname.startsWith("/settings/about")}
                  onClick={isMobile ? onMobileClose : undefined}
                  sx={{ ...navItemSx, pl: 4 }}
                >
                  <ListItemIcon sx={iconSx}><InfoIcon /></ListItemIcon>
                  <ListItemText primary="About" />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>
        )}
      </List>

      {/* Profile section */}
      <Divider />
      <Box sx={{ p: expanded ? 1.5 : 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title={!expanded ? (session?.user?.name ?? "Profile") : ""} placement="right">
          <Avatar
            sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 14, flexShrink: 0, cursor: "pointer" }}
            onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
          >
            {userInitial}
          </Avatar>
        </Tooltip>

        {expanded && (
          <>
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {session?.user?.name ?? ""}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {session?.user?.email ?? ""}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              aria-label="Profile menu"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>

      {/* Profile dropdown menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MenuItem
          component={Link}
          href="/profile"
          onClick={() => { setProfileMenuAnchor(null); if (isMobile) onMobileClose(); }}
        >
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setProfileMenuAnchor(null); signOut({ callbackUrl: "/login" }); }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            top: "64px",
            height: "calc(100% - 64px)",
            overflowY: "auto",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          top: "64px",
          height: "calc(100% - 64px)",
          overflowX: "hidden",
          overflowY: "auto",
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
