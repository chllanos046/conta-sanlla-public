"use client";
import { useState, useEffect, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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
import { PeriodControls } from "@/components/PeriodControls";

export default function TransactionsPage() {
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
  const [period, setPeriod] = useState("month");
  const [periodDate, setPeriodDate] = useState(new Date());

  const { dateFrom, dateTo } = useMemo(() => {
    if (!periodDate) return {};
    const y = periodDate.getFullYear();
    if (period === "year") {
      return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
    }
    const m = String(periodDate.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, periodDate.getMonth() + 1, 0).getDate();
    return {
      dateFrom: `${y}-${m}-01`,
      dateTo: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [period, periodDate]);

  const [filters, setFilters] = useState(() => ({
    type: "",
    account: "",
    sourceAccount: "",
    targetAccount: "",
    category: "",
  }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    type: "",
    account: "",
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

  // Reactive data loading — loading is derived by comparing requestKey to resolvedKey,
  // so no setState is called synchronously in the effect body.
  const { type: af_type, account: af_account, sourceAccount: af_source, targetAccount: af_target, category: af_category } = appliedFilters;
  const { page, pageSize } = paginationModel;
  const requestKey = `${af_type}|${af_account}|${af_source}|${af_target}|${af_category}|${refreshKey}|${page}|${pageSize}|${dateFrom}|${dateTo}`;
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

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t("transactions.title")}{accountName ? ` — ${accountName}` : ""}
      </Typography>

      <PeriodControls
        period={period}
        periodDate={periodDate}
        onPeriodChange={(val) => { setPeriod(val); setPaginationModel((m) => ({ ...m, page: 0 })); }}
        onDateChange={(fn) => { setPeriodDate(fn); setPaginationModel((m) => ({ ...m, page: 0 })); }}
        rightSlot={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title={t("common.importFromPhoto")}>
              <IconButton
                color="primary"
                onClick={() => setPhotoOpen(true)}
                sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, display: { xs: "none", sm: "flex" } }}
              >
                <CameraAltIcon />
              </IconButton>
            </Tooltip>
            {filteredAccount?.type === "credit" && (
              <Tooltip title="Import PDF Statement">
                <IconButton
                  color="primary"
                  onClick={() => setPdfOpen(true)}
                  sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, display: { xs: "none", sm: "flex" } }}
                >
                  <UploadFileIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t("transactions.newTransaction")}>
              <IconButton
                color="primary"
                onClick={openNewTx}
                sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, display: { xs: "none", sm: "flex" } }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

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
