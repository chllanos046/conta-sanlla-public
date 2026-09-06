"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import StatCard from "@/components/StatCard";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import { getCurrencySymbol } from "@/lib/currency";

export default function AccountCarousel({ accounts, balanceColor }) {
  const [startIndex, setStartIndex] = useState(0);
  const router = useRouter();

  if (!accounts || accounts.length === 0) return null;

  const renderAccountCard = (acc) => {
    const bal = parseFloat(acc.current_balance);
    const symbol = getCurrencySymbol(acc.currency);
    const currencyLabel = acc.currency !== "USD" ? ` ${acc.currency}` : "";
    return (
      <StatCard
        label={acc.name}
        value={`${symbol}${bal.toFixed(2)}${currencyLabel}`}
        valueColor={balanceColor(bal)}
        icon={
          acc.image_path
            ? <Box component="img" src={acc.image_path} alt={acc.name} sx={{ width: 48, height: 48, objectFit: "cover" }} />
            : <AccountTypeIcon type={acc.type} sx={{ fontSize: 22, color: "grey.600" }} />
        }
        iconBg="grey.200"
        href={`/accounts/${acc.id}`}
      />
    );
  };

  const visibleCount = 3;
  const visibleAccounts = accounts.slice(startIndex, startIndex + visibleCount);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + visibleCount < accounts.length;

  return (
    <>
      {/* Mobile list — CSS hidden on sm+ */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <List
          disablePadding
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          {accounts.map((acc, i) => {
            const bal = parseFloat(acc.current_balance);
            const symbol = getCurrencySymbol(acc.currency);
            const currencyLabel = acc.currency !== "USD" ? ` ${acc.currency}` : "";
            return (
              <Box key={acc.id}>
                <ListItem
                  onClick={() => router.push(`/accounts/${acc.id}`)}
                  sx={{ cursor: "pointer", px: 2, py: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: "grey.200",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {acc.image_path ? (
                      <Box
                        component="img"
                        src={acc.image_path}
                        alt={acc.name}
                        sx={{ width: 36, height: 36, objectFit: "cover" }}
                      />
                    ) : (
                      <AccountTypeIcon
                        type={acc.type}
                        sx={{ fontSize: 20, color: "grey.600" }}
                      />
                    )}
                  </Box>
                  <ListItemText primary={acc.name} />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={balanceColor(bal)}
                    sx={{ flexShrink: 0, ml: 1 }}
                  >
                    {symbol}{bal.toFixed(2)}{currencyLabel}
                  </Typography>
                </ListItem>
                {i < accounts.length - 1 && <Divider component="li" />}
              </Box>
            );
          })}
        </List>
      </Box>

      {/* Desktop carousel — CSS hidden on xs */}
      <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1 }}>
        <IconButton
          onClick={() => setStartIndex((i) => i - 1)}
          disabled={!canGoPrev}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ChevronLeftIcon />
        </IconButton>

        <Grid container spacing={2} sx={{ flex: 1 }}>
          {visibleAccounts.map((acc) => (
            <Grid key={acc.id} size={{ xs: 12, sm: 4 }}>
              {renderAccountCard(acc)}
            </Grid>
          ))}
        </Grid>

        <IconButton
          onClick={() => setStartIndex((i) => i + 1)}
          disabled={!canGoNext}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </>
  );
}
