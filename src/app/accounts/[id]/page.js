"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import PdfImportDialog from "@/components/PdfImportDialog";
import { TransactionsTable } from "@/components/TransactionsTable";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import { getCurrencySymbol } from "@/lib/currency";
import { addRunningBalance } from "@/lib/balanceUtils";
import { useCurrency } from "@/hooks/useCurrency";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { useNotify } from "@/components/NotificationProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency } from "@/lib/utils";

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const { notifySuccess, notifyError } = useNotify();
  const { t } = useTranslation();
  const [globalCurrency] = useCurrency();

  const [account, setAccount] = useState(null);
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [refreshKey, setRefreshKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState({});
  const [editingTx, setEditingTx] = useState(null);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [arsRate, setArsRate] = useState(1);

  useEffect(() => {
    axios.get("/api/exchange-rates").then(({ data }) => {
      if (data.ARS) setArsRate(data.ARS);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    axios.get(`/api/accounts/${id}`).then(({ data }) => setAccount(data));
  }, [id, refreshKey]);

  useEffect(() => {
    const { page, pageSize } = paginationModel;
    setLoading(true);
    axios
      .get(`/api/transactions?account=${id}&limit=${pageSize}&offset=${page * pageSize}`)
      .then(({ data }) => {
        setRows(addRunningBalance(data.transactions, data.opening_balance, id));
        setOpeningBalance(data.opening_balance);
        setAccounts(data.accounts);
        setCategories(data.categories);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [id, refreshKey, paginationModel]);

  const handleSaved = useCallback(() => {
    setDialogOpen(false);
    setEditingTx(null);
    setDialogProps({});
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent("accounts-updated"));
  }, []);

  const handleEdit = useCallback((tx) => {
    setEditingTx(tx);
    setDialogProps({});
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (tx) => {
    const ok = await confirm(t("transactions.deleteConfirm"));
    if (!ok) return;
    try {
      await axios.delete(`/api/transactions/${tx.id}`);
      notifySuccess(t("transactions.deleted"));
      setRefreshKey((k) => k + 1);
      window.dispatchEvent(new CustomEvent("accounts-updated"));
    } catch {
      notifyError(t("errors.deleteFailed"));
    }
  }, [confirm, t, notifySuccess, notifyError]);

  const openAddExpense = () => {
    setEditingTx(null);
    setDialogProps({
      lockedType: "expense",
      lockedSourceAccountId: id,
    });
    setDialogOpen(true);
  };

  const openPayCard = () => {
    const owed = account ? Math.max(0, -parseFloat(account.current_balance)) : 0;
    setEditingTx(null);
    setDialogProps({
      lockedType: "transfer",
      lockedTargetAccountId: id,
      defaultAmount: owed > 0 ? owed : undefined,
    });
    setDialogOpen(true);
  };

  const openNewTransaction = () => {
    setEditingTx(null);
    setDialogProps({});
    setDialogOpen(true);
  };

  const isCreditCard = account?.type === "credit";
  const balance = account ? parseFloat(account.current_balance) : 0;
  const owed = isCreditCard && balance < 0 ? Math.abs(balance) : 0;
  const symbol = account ? getCurrencySymbol(account.currency) : "";

  if (!account && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Account not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1, sm: 0 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton onClick={() => router.back()} size="small">
          <ArrowBackIcon />
        </IconButton>
        {account && (
          <AccountTypeIcon type={account.type} sx={{ fontSize: 22, color: "text.secondary" }} />
        )}
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          {account?.name ?? ""}
        </Typography>
        {account?.currency && account.currency !== "USD" && (
          <Chip label={account.currency} size="small" variant="outlined" />
        )}
      </Box>

      {/* Balance / Owed */}
      {account && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 1,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          {isCreditCard ? (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Adeudado
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color={owed > 0 ? "expense.main" : "income.main"}
                >
                  {symbol}{owed.toFixed(2)}
                </Typography>
              </Box>
            </>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Balance
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color={balance > 0 ? "income.main" : balance < 0 ? "expense.main" : "text.primary"}
              >
                {symbol}{balance.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Action buttons */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        {isCreditCard ? (
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openAddExpense}>
              {t("transactions.addExpense")}
            </Button>
            <Button variant="contained" startIcon={<PaymentIcon />} onClick={openPayCard}>
              {t("transactions.payCard")}
            </Button>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setPdfImportOpen(true)}>
              Import PDF
            </Button>
          </>
        ) : (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewTransaction}>
            {t("transactions.newTransaction")}
          </Button>
        )}
      </Box>

      {/* Transactions table */}
      <TransactionsTable
        rows={rows}
        accounts={accounts}
        openingBalance={openingBalance}
        onEditRow={handleEdit}
        onDeleteRow={handleDelete}
        displayCurrency={globalCurrency}
        arsRate={arsRate}
        loading={loading}
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <TransactionFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTx(null); setDialogProps({}); }}
        editingTx={editingTx}
        accounts={accounts}
        categories={categories}
        onSaved={handleSaved}
        {...dialogProps}
      />

      <PdfImportDialog
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        accountId={id}
        accountCurrency={account?.currency ?? "ARS"}
        onImported={handleSaved}
      />
    </Box>
  );
}
