"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    dateFrom: `${y}-${m}-01`,
    dateTo: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    monthLabel: format(now, "MMMM yyyy"),
  };
}

function formatAmount(tx) {
  const currency =
    tx.type === "income" ? tx.target_currency : tx.source_currency;
  const symbol =
    currency === "USD" || currency === "ARS" ? "$" : (currency ?? "$");
  const value = Math.abs(parseFloat(tx.amount)).toFixed(2);
  return `${symbol}${value}`;
}

function amountColor(type) {
  if (type === "income") return "success.main";
  if (type === "expense") return "error.main";
  return "text.primary";
}

export function MobileTransactionsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { dateFrom, dateTo, monthLabel } = getCurrentMonthRange();

  useEffect(() => {
    const params = { dateFrom, dateTo };
    if (accountId) params.account = accountId;
    axios
      .get("/api/transactions", { params })
      .then(({ data }) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, accountId]);

  return (
    <Box>
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Transactions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {monthLabel}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Box sx={{ textAlign: "center", pt: 6 }}>
          <Typography color="text.secondary">
            No transactions this month.
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {transactions.map((tx, i) => {
            const dateLabel = format(new Date(tx.date), "d MMM");
            const subtitle = `${dateLabel}${tx.category_name ? ` — ${tx.category_name}` : ""}`;

            return (
              <Box key={tx.id}>
                <ListItem
                  onClick={() => router.push(`/transactions/mobile/${tx.id}`)}
                  sx={{ cursor: "pointer", px: 2, py: 1.5, width: "100%" }}
                >
                  <ListItemText
                    primary={
                      <Typography fontWeight={600} variant="body1">
                        {tx.description || "—"}
                      </Typography>
                    }
                    secondary={subtitle}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      ml: 2,
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={amountColor(tx.type)}
                    >
                      {formatAmount(tx)}
                    </Typography>
                    <ChevronRightIcon
                      fontSize="small"
                      sx={{ color: "text.disabled" }}
                    />
                  </Box>
                </ListItem>
                {i < transactions.length - 1 && (
                  <Divider component="li" />
                )}
              </Box>
            );
          })}
        </List>
      )}
    </Box>
  );
}
