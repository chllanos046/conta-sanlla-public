"use client";
import { useState, useEffect, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { addRunningBalance } from "@/lib/balanceUtils";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import PhotoImportDialog from "@/components/PhotoImportDialog";
import { useCurrency } from "@/hooks/useCurrency";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { useNotify } from "@/components/NotificationProvider";
import { useTranslation } from "@/hooks/useTranslation";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { notifySuccess, notifyError } = useNotify();
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(null);

  const [filters, setFilters] = useState(() => ({
    type: "",
    account: searchParams.get("account") || "",
    sourceAccount: "",
    targetAccount: "",
    category: "",
  }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    type: "",
    account: searchParams.get("account") || "",
    sourceAccount: "",
    targetAccount: "",
    category: "",
  }));
  const [refreshKey, setRefreshKey] = useState(0);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [globalCurrency] = useCurrency();
  const [arsRate, setArsRate] = useState(1);

  useEffect(() => {
    axios.get("/api/exchange-rates").then(({ data }) => {
      if (data.ARS) setArsRate(data.ARS);
    }).catch(() => {});
  }, []);

  // Sync URL account param during render (React-recommended alternative to an effect).
  // When searchParams changes Next.js re-renders this component; we detect the drift
  // here and update both filter states before the render completes.
  const urlAccount = searchParams.get("account") || "";
  const [prevUrlAccount, setPrevUrlAccount] = useState(urlAccount);
  if (urlAccount !== prevUrlAccount) {
    const updated = { type: "", account: urlAccount, sourceAccount: "", targetAccount: "", category: "" };
    setPrevUrlAccount(urlAccount);
    setFilters(updated);
    setAppliedFilters(updated);
  }

  // Reactive data loading — all setState calls are inside .then(), never synchronous.
  const { type: af_type, account: af_account, sourceAccount: af_source, targetAccount: af_target, category: af_category } = appliedFilters;
  useEffect(() => {
    const params = {};
    if (af_type) params.type = af_type;
    if (af_account) params.account = af_account;
    if (af_source) params.sourceAccount = af_source;
    if (af_target) params.targetAccount = af_target;
    if (af_category) params.category = af_category;

    let cancelled = false;
    setLoading(true);
    axios.get("/api/transactions", { params }).then(({ data }) => {
      if (cancelled) return;
      setRows(data.transactions || []);
      setAccounts(data.accounts || []);
      setCategories(data.categories || []);
      setOpeningBalance(data.opening_balance ?? null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [af_type, af_account, af_source, af_target, af_category, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const filteredAccount = accounts.find((a) => String(a.id) === String(appliedFilters.account));
  const accountName = filteredAccount?.name;
  // Single account filtered → show in that account's currency; otherwise use global preference
  const displayCurrency = filteredAccount?.currency || globalCurrency;

  const openNewTx = () => {
    setEditingTx(null);
    setTxDialogOpen(true);
  };

  const openEditTx = (row) => {
    setEditingTx(row);
    setTxDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!(await confirm(t("transactions.deleteConfirm")))) return;
    try {
      await axios.delete(`/api/transactions/${id}`);
      refresh();
      window.dispatchEvent(new CustomEvent("accounts-updated"));
      notifySuccess(t("transactions.deleted"));
    } catch (err) {
      notifyError(err.response?.data?.error || t("errors.deleteFailed"));
    }
  };

  const transactionsWithBalance = useMemo(() => {
    const accountId = appliedFilters.account || null;
    const ascending = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const withBalance = addRunningBalance(ascending, openingBalance ?? 0, accountId);
    return withBalance.reverse();
  }, [rows, openingBalance, appliedFilters.account]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">
          {t("transactions.title")}{accountName ? ` — ${accountName}` : ""}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title={t("common.importFromPhoto")}>
            <IconButton
              color="primary"
              onClick={() => setPhotoOpen(true)}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
                display: { xs: "none", sm: "flex" },
              }}
            >
              <CameraAltIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("transactions.newTransaction")}>
            <IconButton
              color="primary"
              onClick={openNewTx}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
                display: { xs: "none", sm: "flex" },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <TransactionFilters
        filters={filters}
        accounts={accounts}
        categories={categories}
        onChange={setFilters}
        onApply={() => setAppliedFilters({ ...filters })}
        onClear={() => {
          const cleared = {
            type: "",
            account: "",
            sourceAccount: "",
            targetAccount: "",
            category: "",
          };
          setFilters(cleared);
          setAppliedFilters(cleared);
        }}
      />

      <TransactionsTable
        rows={transactionsWithBalance}
        accounts={accounts}
        openingBalance={openingBalance}
        onEditRow={openEditTx}
        onDeleteRow={handleDelete}
        displayCurrency={displayCurrency}
        arsRate={arsRate}
        loading={loading}
      />

      <PhotoImportDialog
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        accountId={appliedFilters.account || null}
        accountCurrency={filteredAccount?.currency ?? "USD"}
        onImported={refresh}
      />

      <TransactionFormDialog
        open={txDialogOpen}
        onClose={() => setTxDialogOpen(false)}
        editingTx={editingTx}
        accounts={accounts}
        categories={categories}
        defaultSourceAccountId={
          appliedFilters.account || appliedFilters.sourceAccount || ""
        }
        onSaved={refresh}
      />
    </LocalizationProvider>
  );
}
