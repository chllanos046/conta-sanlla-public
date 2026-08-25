"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { format, parseISO } from "date-fns";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { useTransactionDialog } from "@/contexts/TransactionDialogContext";
import PhotoImportDialog from "@/components/PhotoImportDialog";
import { useTranslation } from "@/hooks/useTranslation";

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
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const { openTransactionDialog } = useTransactionDialog();
  const { t } = useTranslation();

  const { dateFrom, dateTo, monthLabel } = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
    return {
      dateFrom: `${y}-${m}-01`,
      dateTo: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
      monthLabel: format(d, "MMMM yyyy"),
    };
  }, [monthOffset]);

  useEffect(() => {
    setLoading(true);
    const params = { dateFrom, dateTo };
    if (accountId) params.account = accountId;
    axios
      .get("/api/transactions", { params })
      .then(({ data }) => {
        setTransactions(data.transactions ?? []);
        setAccounts(data.accounts ?? []);
      })
      .catch(() => {
        setTransactions([]);
        setAccounts([]);
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, accountId]);

  const currentAccount = useMemo(
    () => (accountId ? accounts.find((a) => String(a.id) === accountId) : null),
    [accounts, accountId]
  );

  const handleAddTx = () => {
    const initialValues = accountId ? { source_account_id: String(accountId) } : {};
    openTransactionDialog({ initialValues, navigateOnSuccess: false });
  };

  const handleImported = () => {
    setMonthOffset((o) => o); // triggers re-fetch via dependency
    // force re-fetch by resetting
    setLoading(true);
    const params = { dateFrom, dateTo };
    if (accountId) params.account = accountId;
    axios
      .get("/api/transactions", { params })
      .then(({ data }) => {
        setTransactions(data.transactions ?? []);
        setAccounts(data.accounts ?? []);
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  };

  return (
    <Box sx={{ pb: accountId ? "160px" : undefined }}>
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {currentAccount ? currentAccount.name : t("nav.transactions")}
          </Typography>
          <Typography variant="body2" color="text.secondary" suppressHydrationWarning>
            {monthLabel}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => setMonthOffset((o) => o - 1)}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={() => setMonthOffset((o) => o + 1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Box sx={{ textAlign: "center", pt: 6 }}>
          <Typography color="text.secondary">
            {t("dashboard.noTransactionsInMonth")(monthLabel)}
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {transactions.map((tx, i) => {
            const dateLabel = format(parseISO(String(tx.date).slice(0, 10)), "d MMM");
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

      {accountId && (
        <>
          <SpeedDial
            ariaLabel="Account actions"
            sx={{ position: "fixed", bottom: 96, right: 16, zIndex: 10 }}
            icon={<SpeedDialIcon />}
          >
            <SpeedDialAction
              icon={<AddIcon />}
              tooltipTitle={t("common.newTransaction")}
              tooltipOpen
              onClick={handleAddTx}
              FabProps={{ sx: { flexShrink: 0 } }}
              sx={{ "& .MuiSpeedDialAction-staticTooltipLabel": { whiteSpace: "nowrap" } }}
            />
            <SpeedDialAction
              icon={<CameraAltIcon />}
              tooltipTitle={t("common.importFromPhoto")}
              tooltipOpen
              onClick={() => setPhotoOpen(true)}
              FabProps={{ sx: { flexShrink: 0 } }}
              sx={{ "& .MuiSpeedDialAction-staticTooltipLabel": { whiteSpace: "nowrap" } }}
            />
          </SpeedDial>
          <PhotoImportDialog
            open={photoOpen}
            onClose={() => setPhotoOpen(false)}
            accountId={accountId}
            accountCurrency={currentAccount?.currency ?? "USD"}
            onImported={handleImported}
          />
        </>
      )}
    </Box>
  );
}
