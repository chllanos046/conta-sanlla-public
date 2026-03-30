"use client";
import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import axios from "axios";

const schema = z
  .object({
    type: z.enum(["expense", "income", "transfer"]),
    amount: z.coerce.number().positive("Amount must be positive"),
    date: z.string().min(1, "Date is required"),
    source_account_id: z.string().optional(),
    target_account_id: z.string().optional(),
    category_id: z.string().optional(),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "expense" || data.type === "transfer") {
      if (!data.source_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source account is required",
          path: ["source_account_id"],
        });
      }
    }
    if (data.type === "income" || data.type === "transfer") {
      if (!data.target_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target account is required",
          path: ["target_account_id"],
        });
      }
    }
  });

const formatDateParam = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const today = () => new Date().toISOString().split("T")[0];

const EMPTY_TX = {
  type: "expense",
  amount: "",
  date: today(),
  source_account_id: "",
  target_account_id: "",
  category_id: "",
  description: "",
};

export default function TransactionsPage() {
  const searchParams = useSearchParams();

  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(() => ({
    type: "",
    account: searchParams.get("account") || "",
    sourceAccount: "",
    targetAccount: "",
    dateFrom: null,
    dateTo: null,
  }));

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_TX,
  });

  const txType = watch("type");
  const showSource = txType === "expense" || txType === "transfer";
  const showTarget = txType === "income" || txType === "transfer";
  const filteredCategories = categories.filter((cat) => cat.type === txType);

  const loadData = async (currentFilters) => {
    const params = {};
    if (currentFilters.type) params.type = currentFilters.type;
    if (currentFilters.account) params.account = currentFilters.account;
    if (currentFilters.sourceAccount) params.sourceAccount = currentFilters.sourceAccount;
    if (currentFilters.targetAccount) params.targetAccount = currentFilters.targetAccount;
    if (currentFilters.dateFrom) params.dateFrom = formatDateParam(currentFilters.dateFrom);
    if (currentFilters.dateTo) params.dateTo = formatDateParam(currentFilters.dateTo);

    const { data } = await axios.get("/api/transactions", { params });
    setRows(data.transactions || []);
    setAccounts(data.accounts || []);
    setCategories(data.categories || []);
  };

  useEffect(() => {
    loadData(filters);
  }, []);

  useEffect(() => {
    const urlAccount = searchParams.get("account") || "";
    if (urlAccount !== filters.account) {
      const updated = { ...filters, account: urlAccount };
      setFilters(updated);
      loadData(updated);
    }
  }, [searchParams]);

  const accountName = accounts.find((a) => String(a.id) === String(filters.account))?.name;

  const openNewTx = () => {
    setEditingTx(null);
    setSubmitError(null);
    reset({
      ...EMPTY_TX,
      date: today(),
      source_account_id: filters.account || filters.sourceAccount || "",
    });
    setTxDialogOpen(true);
  };

  const openEditTx = (row) => {
    setEditingTx(row);
    setSubmitError(null);
    reset({
      type: row.type,
      amount: String(row.amount),
      date: row.date ? formatDateParam(new Date(row.date)) : today(),
      source_account_id: row.source_account_id ? String(row.source_account_id) : "",
      target_account_id: row.target_account_id ? String(row.target_account_id) : "",
      category_id: row.category_id ? String(row.category_id) : "",
      description: row.description ?? "",
    });
    setTxDialogOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        amount: data.amount,
        source_account_id: data.source_account_id || null,
        target_account_id: data.target_account_id || null,
        category_id: data.category_id || null,
      };
      if (editingTx) {
        await axios.put(`/api/transactions/${editingTx.id}`, payload);
      } else {
        await axios.post("/api/transactions", payload);
      }
      setTxDialogOpen(false);
      loadData(filters);
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to save transaction");
    }
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      width: 120,
      valueFormatter: (value) => (value ? format(new Date(value), "yyyy-MM-dd") : ""),
    },
    {
      field: "type",
      headerName: "Type",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "income" ? "success" : params.value === "expense" ? "error" : "warning"}
          size="small"
        />
      ),
    },
    {
      field: "category_name",
      headerName: "Category",
      width: 140,
      valueFormatter: (value) => value || "",
    },
    {
      field: "source_account",
      headerName: "Source Account",
      width: 150,
      valueGetter: (_value, row) => accounts.find((a) => a.id === row.source_account_id)?.name || "",
    },
    {
      field: "target_account",
      headerName: "Target Account",
      width: 150,
      valueGetter: (_value, row) => accounts.find((a) => a.id === row.target_account_id)?.name || "",
    },
    { field: "description", headerName: "Description", width: 200 },
    {
      field: "amount",
      headerName: "Amount",
      width: 120,
      valueFormatter: (value) => (value != null ? `$${parseFloat(value).toFixed(2)}` : ""),
    },
    {
      field: "balance",
      headerName: "Balance",
      width: 130,
      valueFormatter: (value) => (value != null ? `$${parseFloat(value).toFixed(2)}` : ""),
    },
    {
      field: "actions",
      type: "actions",
      width: 60,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => openEditTx(params.row)}
        />,
      ],
    },
  ];

  const transactionsWithBalance = useMemo(() => {
    const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    return sorted.map((tx) => {
      if (tx.type === "income") runningBalance += parseFloat(tx.amount);
      if (tx.type === "expense") runningBalance -= parseFloat(tx.amount);
      return { ...tx, balance: runningBalance };
    });
  }, [rows]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">
          Transactions{accountName ? ` — ${accountName}` : ""}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNewTx}>
          New Transaction
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="income">Income</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="transfer">Transfer</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Source Account</InputLabel>
              <Select
                value={filters.sourceAccount}
                label="Source Account"
                onChange={(e) => setFilters({ ...filters, sourceAccount: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Target Account</InputLabel>
              <Select
                value={filters.targetAccount}
                label="Target Account"
                onChange={(e) => setFilters({ ...filters, targetAccount: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="From Date"
              format="yyyy-MM-dd"
              value={filters.dateFrom}
              onChange={(val) => setFilters({ ...filters, dateFrom: val })}
              slotProps={{ textField: { sx: { minWidth: 150 } } }}
            />
            <DatePicker
              label="To Date"
              format="yyyy-MM-dd"
              value={filters.dateTo}
              onChange={(val) => setFilters({ ...filters, dateTo: val })}
              slotProps={{ textField: { sx: { minWidth: 150 } } }}
            />
            <Button variant="contained" onClick={() => loadData(filters)}>Apply</Button>
            <Button
              variant="outlined"
              onClick={() => {
                const cleared = { type: "", account: "", sourceAccount: "", targetAccount: "", dateFrom: null, dateTo: null };
                setFilters(cleared);
                loadData(cleared);
              }}
            >
              Clear
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ height: 700 }}>
        <DataGrid
          rows={transactionsWithBalance}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: "date", sort: "desc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          getRowId={(row) => row.id}
        />
      </Card>

      {/* New / Edit Transaction Dialog */}
      <Dialog open={txDialogOpen} onClose={() => setTxDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingTx ? "Edit Transaction" : "New Transaction"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.type}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    {...field}
                    label="Type"
                    onChange={(e) => {
                      const newType = e.target.value;
                      field.onChange(newType);
                      setValue("target_account_id", "");
                      setValue("category_id", "");
                      if (newType === "transfer") {
                        setValue("description", "Transfer between accounts");
                      }
                    }}
                  >
                    <MenuItem value="expense">Expense</MenuItem>
                    <MenuItem value="income">Income</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                  </Select>
                  {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
                </FormControl>
              )}
            />

            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Amount"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                />
              )}
            />

            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date"
                  format="yyyy-MM-dd"
                  value={field.value ? parseISO(field.value) : null}
                  onChange={(v) => field.onChange(v ? format(v, "yyyy-MM-dd") : "")}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.date,
                      helperText: errors.date?.message,
                    },
                  }}
                />
              )}
            />

            {showSource && (
              <Controller
                name="source_account_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.source_account_id}>
                    <InputLabel>Source Account</InputLabel>
                    <Select {...field} label="Source Account">
                      <MenuItem value="">None</MenuItem>
                      {accounts.map((acc) => (
                        <MenuItem key={acc.id} value={String(acc.id)}>{acc.name}</MenuItem>
                      ))}
                    </Select>
                    {errors.source_account_id && (
                      <FormHelperText>{errors.source_account_id.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            )}

            {showTarget && (
              <Controller
                name="target_account_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.target_account_id}>
                    <InputLabel>Target Account</InputLabel>
                    <Select {...field} label="Target Account">
                      <MenuItem value="">None</MenuItem>
                      {accounts.map((acc) => (
                        <MenuItem key={acc.id} value={String(acc.id)}>{acc.name}</MenuItem>
                      ))}
                    </Select>
                    {errors.target_account_id && (
                      <FormHelperText>{errors.target_account_id.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            )}

            {txType !== "transfer" && (
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select {...field} label="Category">
                      <MenuItem value="">None</MenuItem>
                      {filteredCategories.map((cat) => (
                        <MenuItem key={cat.id} value={String(cat.id)}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            )}

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Description" />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTxDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
