"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import StatCard from "@/components/StatCard";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import { getCurrencySymbol } from "@/lib/currency";

export default function AccountCarousel({ accounts, balanceColor }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const visibleCount = isMobile ? 1 : 3;
  const [startIndex, setStartIndex] = useState(0);

  if (!accounts || accounts.length === 0) return null;

  const visibleAccounts = accounts.slice(startIndex, startIndex + visibleCount);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + visibleCount < accounts.length;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <IconButton
        onClick={() => setStartIndex((i) => i - 1)}
        disabled={!canGoPrev}
        size="small"
        sx={{ flexShrink: 0 }}
      >
        <ChevronLeftIcon />
      </IconButton>

      <Grid container spacing={2} sx={{ flex: 1 }}>
        {visibleAccounts.map((acc) => {
          const bal = parseFloat(acc.current_balance);
          const symbol = getCurrencySymbol(acc.currency);
          const currencyLabel = acc.currency !== "USD" ? ` ${acc.currency}` : "";
          return (
            <Grid key={acc.id} size={{ xs: 12, sm: 4 }}>
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
                href={`/transactions?account=${acc.id}`}
              />
            </Grid>
          );
        })}
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
  );
}
