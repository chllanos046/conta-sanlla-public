"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import Fab from "@mui/material/Fab";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Box from "@mui/material/Box";
import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import axios from "axios";

const makeSchema = (accounts) =>
  z
    .object({
      type: z.enum(["income", "expense", "transfer"]),
      amount: z.coerce.number().positive("Amount must be positive"),
      source_account_id: z.string().optional(),
      target_account_id: z.string().optional(),
      category_id: z.string().optional(),
      date: z.string().min(1, "Date is required"),
      description: z.string().optional(),
      exchange_rate: z.preprocess(
        (v) => (v === "" || v == null ? null : Number(v)),
        z.number().positive().nullable()
      ),
    })
    .superRefine((data, ctx) => {
      if (data.type === "expense" || data.type === "transfer") {
        if (!data.source_account_id) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source account is required", path: ["source_account_id"] });
        }
      }
      if (data.type === "income" || data.type === "transfer") {
        if (!data.target_account_id) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Target account is required", path: ["target_account_id"] });
        }
      }
      const srcAcc = accounts.find((a) => String(a.id) === data.source_account_id);
      const tgtAcc = accounts.find((a) => String(a.id) === data.target_account_id);
      const needsRate =
        (data.type === "expense" && srcAcc?.currency && srcAcc.currency !== "USD") ||
        (data.type === "income" && tgtAcc?.currency && tgtAcc.currency !== "USD") ||
        (data.type === "transfer" &&
          ((srcAcc?.currency && srcAcc.currency !== "USD") ||
            (tgtAcc?.currency && tgtAcc.currency !== "USD")));
      if (needsRate && !data.exchange_rate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exchange rate is required", path: ["exchange_rate"] });
      }
    });

const EMPTY_FORM = {
  type: "expense",
  amount: "",
  source_account_id: "",
  target_account_id: "",
  category_id: "",
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  exchange_rate: "",
};

export default function QuickAddTransaction({ accounts = [], categories = [], open, onClose, onSuccess }) {
  const [arsRate, setArsRate] = useState(null);

  useEffect(() => {
    axios.get("/api/exchange-rates").then((res) => setArsRate(res.data.ARS ?? null));
  }, []);

  const resolvedSchema = useMemo(() => makeSchema(accounts), [accounts]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resolvedSchema),
    defaultValues: EMPTY_FORM,
  });

  const type = watch("type");
  const sourceAccountId = watch("source_account_id");
  const targetAccountId = watch("target_account_id");
  const showSource = type === "expense" || type === "transfer";
  const showTarget = type === "income" || type === "transfer";
  const filteredCategories = categories.filter((c) => c.type === type);

  const srcAcc = accounts.find((a) => String(a.id) === sourceAccountId);
  const tgtAcc = accounts.find((a) => String(a.id) === targetAccountId);

  const showExchangeRate =
    (type === "expense" && srcAcc?.currency && srcAcc.currency !== "USD") ||
    (type === "income" && tgtAcc?.currency && tgtAcc.currency !== "USD") ||
    (type === "transfer" &&
      ((srcAcc?.currency && srcAcc.currency !== "USD") ||
        (tgtAcc?.currency && tgtAcc.currency !== "USD")));

  const foreignCurrency =
    type === "income"
      ? tgtAcc?.currency
      : type === "expense"
        ? srcAcc?.currency
        : srcAcc?.currency ?? tgtAcc?.currency;

  useEffect(() => {
    if (open) reset(EMPTY_FORM);
  }, [open, reset]);

  useEffect(() => {
    if (showExchangeRate && !getValues("exchange_rate") && arsRate) {
      setValue("exchange_rate", String(arsRate));
    }
  }, [showExchangeRate, foreignCurrency, arsRate, getValues, setValue]);

  const onSubmit = async (data) => {
    try {
      const rawAmount = Math.abs(data.amount);
      const exchangeRate = data.exchange_rate ? parseFloat(data.exchange_rate) : null;
      const usdAmount = exchangeRate ? rawAmount / exchangeRate : rawAmount;
      const signedAmount = data.type === "expense" ? -usdAmount : usdAmount;

      const payload = {
        type: data.type,
        amount: signedAmount,
        exchange_rate: exchangeRate,
        date: data.date,
        description: data.description || "",
        category_id: data.category_id || null,
        source_account_id: data.source_account_id || null,
        target_account_id: data.target_account_id || null,
      };

      await axios.post("/api/transactions", payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError("root", { message: err.response?.data?.error || "Failed to save transaction" });
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>New Transaction</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {errors.root && (
              <Alert severity="error">{errors.root.message}</Alert>
            )}

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  value={field.value}
                  exclusive
                  onChange={(_, val) => {
                    if (val) {
                      field.onChange(val);
                      setValue("exchange_rate", "");
                    }
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="expense">Expense</ToggleButton>
                  <ToggleButton value="income">Income</ToggleButton>
                  <ToggleButton value="transfer">Transfer</ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Amount"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                  size="small"
                  fullWidth
                />
              )}
            />

            {showExchangeRate && (
              <Controller
                name="exchange_rate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={`How many ${foreignCurrency} = 1 USD?`}
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    error={!!errors.exchange_rate}
                    helperText={
                      errors.exchange_rate?.message ??
                      `e.g. 1450 means 1 USD = 1450 ${foreignCurrency}`
                    }
                    size="small"
                    fullWidth
                  />
                )}
              />
            )}

            {showSource && (
              <Controller
                name="source_account_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="From Account"
                    error={!!errors.source_account_id}
                    helperText={errors.source_account_id?.message}
                    size="small"
                    fullWidth
                    onChange={(e) => {
                      field.onChange(e);
                      setValue("exchange_rate", "");
                    }}
                  >
                    {accounts.map((a) => (
                      <MenuItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            {showTarget && (
              <Controller
                name="target_account_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="To Account"
                    error={!!errors.target_account_id}
                    helperText={errors.target_account_id?.message}
                    size="small"
                    fullWidth
                    onChange={(e) => {
                      field.onChange(e);
                      setValue("exchange_rate", "");
                    }}
                  >
                    {accounts.map((a) => (
                      <MenuItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            {type !== "transfer" && (
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Category"
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
                    {filteredCategories.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date"
                  format="yyyy-MM-dd"
                  value={field.value ? new Date(field.value + "T12:00:00") : null}
                  onChange={(v) => field.onChange(v ? format(v, "yyyy-MM-dd") : "")}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      error: !!errors.date,
                      helperText: errors.date?.message,
                    },
                  }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

export function QuickAddFab({ onClick }) {
  return (
    <Fab
      color="primary"
      aria-label="add transaction"
      onClick={onClick}
      sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200 }}
    >
      <AddIcon />
    </Fab>
  );
}
