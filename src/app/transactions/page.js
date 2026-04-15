"use client";
import { useState, useEffect, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { addRunningBalance } from "@/lib/balanceUtils";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";

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

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const loadData = async (currentFilters) => {
    const params = {};
    if (currentFilters.type) params.type = currentFilters.type;
    if (currentFilters.account) params.account = currentFilters.account;
    if (currentFilters.sourceAccount) params.sourceAccount = currentFilters.sourceAccount;
    if (currentFilters.targetAccount) params.targetAccount = currentFilters.targetAccount;

    const { data } = await axios.get("/api/transactions", { params });
    setRows(data.transactions || []);
    setAccounts(data.accounts || []);
    setCategories(data.categories || []);
    setOpeningBalance(data.opening_balance ?? null);
  };

  useEffect(() => {
    loadData(filters);
  }, []);

  useEffect(() => {
    const urlAccount = searchParams.get("account") || "";
    if (urlAccount !== filters.account) {
      const updated = { ...filters, account: urlAccount, sourceAccount: "", targetAccount: "" };
      setFilters(updated);
      loadData(updated);
    }
  }, [searchParams]);

  const accountName = accounts.find((a) => String(a.id) === String(filters.account))?.name;

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
    await axios.delete(`/api/transactions/${id}`, {
      headers: { Cookie: document.cookie },
    });
    loadData(filters);
  };

  const transactionsWithBalance = useMemo(() => {
    const accountId = filters.account || null;
    const ascending = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    const withBalance = addRunningBalance(ascending, openingBalance ?? 0, accountId);
    return withBalance.reverse();
  }, [rows, openingBalance, filters.account]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">
          Transactions{accountName ? ` — ${accountName}` : ""}
        </Typography>
        <Tooltip title="New Transaction">
          <IconButton color="primary" onClick={openNewTx} sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <TransactionFilters
        filters={filters}
        accounts={accounts}
        onChange={setFilters}
        onApply={() => loadData(filters)}
        onClear={() => {
          const cleared = {
            type: "",
            account: "",
            sourceAccount: "",
            targetAccount: "",
          };
          setFilters(cleared);
          loadData(cleared);
        }}
      />

      <TransactionsTable
        rows={transactionsWithBalance}
        accounts={accounts}
        openingBalance={openingBalance}
        onEditRow={openEditTx}
        onDeleteRow={handleDelete}
      />

      <TransactionFormDialog
        open={txDialogOpen}
        onClose={() => setTxDialogOpen(false)}
        editingTx={editingTx}
        accounts={accounts}
        categories={categories}
        defaultSourceAccountId={filters.account || filters.sourceAccount || ""}
        onSaved={() => loadData(filters)}
      />
    </LocalizationProvider>
  );
}
