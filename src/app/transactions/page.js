"use client";
import { useState, useEffect, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { addRunningBalance } from "@/lib/balanceUtils";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { ImportTransactionsDialog } from "@/components/ImportTransactionsDialog";

export default function TransactionsPage() {
  const searchParams = useSearchParams();

  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(null);

  const [filters, setFilters] = useState(() => ({
    type: "",
    account: searchParams.get("account") || "",
    sourceAccount: "",
    targetAccount: "",
  }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    type: "",
    account: searchParams.get("account") || "",
    sourceAccount: "",
    targetAccount: "",
  }));
  const [refreshKey, setRefreshKey] = useState(0);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  // Sync URL account param during render (React-recommended alternative to an effect).
  // When searchParams changes Next.js re-renders this component; we detect the drift
  // here and update both filter states before the render completes.
  const urlAccount = searchParams.get("account") || "";
  const [prevUrlAccount, setPrevUrlAccount] = useState(urlAccount);
  if (urlAccount !== prevUrlAccount) {
    const updated = { type: "", account: urlAccount, sourceAccount: "", targetAccount: "" };
    setPrevUrlAccount(urlAccount);
    setFilters(updated);
    setAppliedFilters(updated);
  }

  // Reactive data loading — all setState calls are inside .then(), never synchronous.
  const { type: af_type, account: af_account, sourceAccount: af_source, targetAccount: af_target } = appliedFilters;
  useEffect(() => {
    const params = {};
    if (af_type) params.type = af_type;
    if (af_account) params.account = af_account;
    if (af_source) params.sourceAccount = af_source;
    if (af_target) params.targetAccount = af_target;

    let cancelled = false;
    axios.get("/api/transactions", { params }).then(({ data }) => {
      if (cancelled) return;
      setRows(data.transactions || []);
      setAccounts(data.accounts || []);
      setCategories(data.categories || []);
      setOpeningBalance(data.opening_balance ?? null);
    });
    return () => { cancelled = true; };
  }, [af_type, af_account, af_source, af_target, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const accountName = accounts.find((a) => String(a.id) === String(appliedFilters.account))?.name;

  const openNewTx = () => {
    setEditingTx(null);
    setTxDialogOpen(true);
  };

  const openEditTx = (row) => {
    setEditingTx(row);
    setTxDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await axios.delete(`/api/transactions/${id}`);
    refresh();
  };

  const transactionsWithBalance = useMemo(() => {
    const accountId = appliedFilters.account || null;
    const ascending = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
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
          Transactions{accountName ? ` — ${accountName}` : ""}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Import CSV">
            <IconButton
              color="primary"
              onClick={() => setImportOpen(true)}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="New Transaction">
            <IconButton
              color="primary"
              onClick={openNewTx}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
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
        onChange={setFilters}
        onApply={() => setAppliedFilters({ ...filters })}
        onClear={() => {
          const cleared = {
            type: "",
            account: "",
            sourceAccount: "",
            targetAccount: "",
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
      />

      <ImportTransactionsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={refresh}
        accounts={accounts}
        categories={categories}
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
