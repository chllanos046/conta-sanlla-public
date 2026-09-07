"use client";
import { useState, useEffect, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { addRunningBalance } from "@/lib/balanceUtils";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import PhotoImportDialog from "@/components/PhotoImportDialog";
import PdfImportDialog from "@/components/PdfImportDialog";
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
  const [resolvedKey, setResolvedKey] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(null);
  const [closingBalance, setClosingBalance] = useState(null);
  const [total, setTotal] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [monthOffset, setMonthOffset] = useState(0);

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
  const [pdfOpen, setPdfOpen] = useState(false);
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

  // Reactive data loading — loading is derived by comparing requestKey to resolvedKey,
  // so no setState is called synchronously in the effect body.
  const { type: af_type, account: af_account, sourceAccount: af_source, targetAccount: af_target, category: af_category } = appliedFilters;
  const { page, pageSize } = paginationModel;
  const requestKey = `${af_type}|${af_account}|${af_source}|${af_target}|${af_category}|${refreshKey}|${page}|${pageSize}|${dateFrom}`;
  const loading = resolvedKey !== requestKey;

  useEffect(() => {
    const params = { limit: pageSize, offset: page * pageSize, dateFrom, dateTo };
    if (af_type) params.type = af_type;
    if (af_account) params.account = af_account;
    if (af_source) params.sourceAccount = af_source;
    if (af_target) params.targetAccount = af_target;
    if (af_category) params.category = af_category;

    let cancelled = false;
    axios.get("/api/transactions", { params }).then(({ data }) => {
      if (cancelled) return;
      setRows(data.transactions || []);
      setAccounts(data.accounts || []);
      setCategories(data.categories || []);
      setOpeningBalance(data.opening_balance ?? null);
      setClosingBalance(data.closing_balance ?? null);
      setTotal(data.total ?? 0);
    }).finally(() => {
      if (!cancelled) setResolvedKey(requestKey);
    });
    return () => { cancelled = true; };
  }, [af_type, af_account, af_source, af_target, af_category, refreshKey, page, pageSize, dateFrom, dateTo, requestKey]);

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

  const changeMonth = (delta) => {
    setMonthOffset((o) => o + delta);
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h4">
            {t("transactions.title")}{accountName ? ` — ${accountName}` : ""}
          </Typography>
          <IconButton size="small" onClick={() => changeMonth(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="body1" sx={{ minWidth: 130, textAlign: "center" }} suppressHydrationWarning>
            {monthLabel}
          </Typography>
          <IconButton size="small" onClick={() => changeMonth(1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
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
          {filteredAccount?.type === "credit" && (
            <Tooltip title="Import PDF Statement">
              <IconButton
                color="primary"
                onClick={() => setPdfOpen(true)}
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.dark" },
                  display: { xs: "none", sm: "flex" },
                }}
              >
                <UploadFileIcon />
              </IconButton>
            </Tooltip>
          )}
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
        onApply={() => {
          setAppliedFilters({ ...filters });
          setPaginationModel((m) => ({ ...m, page: 0 }));
        }}
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
          setPaginationModel((m) => ({ ...m, page: 0 }));
        }}
      />

      <TransactionsTable
        rows={transactionsWithBalance}
        accounts={accounts}
        openingBalance={filteredAccount ? openingBalance : null}
        closingBalance={filteredAccount ? closingBalance : null}
        onEditRow={openEditTx}
        onDeleteRow={handleDelete}
        displayCurrency={displayCurrency}
        arsRate={arsRate}
        loading={loading}
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <PhotoImportDialog
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        accountId={appliedFilters.account || null}
        accountCurrency={filteredAccount?.currency ?? "USD"}
        onImported={refresh}
      />

      <PdfImportDialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        accountId={appliedFilters.account || null}
        accountCurrency={filteredAccount?.currency ?? "ARS"}
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
    </>
  );
}
