"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parseISO } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "@/hooks/useTranslation";

const makeSchema = (accounts) =>
  z
    .object({
      type: z.enum(["expense", "income", "transfer"]),
      amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
      date: z.string().min(1, "Date is required"),
      source_account_id: z.string().optional(),
      target_account_id: z.string().optional(),
      category_id: z.string().optional(),
      description: z.string().optional(),
      exchange_rate: z.preprocess(
        (v) => (v === "" || v == null ? null : Number(v)),
        z.number().positive().nullable()
      ),
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
      const srcAcc = accounts.find((a) => String(a.id) === data.source_account_id);
      const tgtAcc = accounts.find((a) => String(a.id) === data.target_account_id);
      const needsRate =
        data.type === "transfer" &&
        srcAcc?.currency && tgtAcc?.currency &&
        srcAcc.currency !== tgtAcc.currency;
      if (needsRate && !data.exchange_rate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exchange rate is required",
          path: ["exchange_rate"],
        });
      }
    });

const today = () => format(new Date(), "yyyy-MM-dd");

const EMPTY_TX = {
  type: "expense",
  amount: "",
  date: today(),
  source_account_id: "",
  target_account_id: "",
  category_id: "",
  description: "",
  exchange_rate: "",
};

export function TransactionFormDialog({ open, onClose, editingTx, accounts, categories, defaultSourceAccountId, onSaved }) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState(null);
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
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resolvedSchema),
    defaultValues: EMPTY_TX,
  });

  const txType = watch("type");
  const sourceAccountId = watch("source_account_id");
  const targetAccountId = watch("target_account_id");
  const showSource = txType === "expense" || txType === "transfer";
  const showTarget = txType === "income" || txType === "transfer";
  const filteredCategories = categories.filter((cat) => cat.type === txType);

  const srcAcc = accounts.find((a) => String(a.id) === sourceAccountId);
  const tgtAcc = accounts.find((a) => String(a.id) === targetAccountId);

  const showExchangeRate =
    txType === "transfer" &&
    srcAcc?.currency && tgtAcc?.currency &&
    srcAcc.currency !== tgtAcc.currency;

  const foreignCurrency =
    txType === "income"
      ? tgtAcc?.currency
      : txType === "expense"
        ? srcAcc?.currency
        : srcAcc?.currency ?? tgtAcc?.currency;

  useEffect(() => {
    if (showExchangeRate && !getValues("exchange_rate") && arsRate) {
      setValue("exchange_rate", String(arsRate));
    }
  }, [showExchangeRate, foreignCurrency, arsRate, getValues, setValue]);

  const handleOpen = () => {
    setSubmitError(null);
    if (editingTx) {
      reset({
        type: editingTx.type,
        amount: String(Math.abs(parseFloat(editingTx.amount))),
        date: editingTx.date ? String(editingTx.date).slice(0, 10) : today(),
        source_account_id: editingTx.source_account_id ? String(editingTx.source_account_id) : "",
        target_account_id: editingTx.target_account_id ? String(editingTx.target_account_id) : "",
        category_id: editingTx.category_id ? String(editingTx.category_id) : "",
        description: editingTx.description ?? "",
        exchange_rate: editingTx.exchange_rate ? String(editingTx.exchange_rate) : "",
      });
    } else {
      reset({
        ...EMPTY_TX,
        date: today(),
        source_account_id: defaultSourceAccountId || "",
      });
    }
  };

  const onSubmit = async (data) => {
    try {
      const rawAmount = Math.abs(parseFloat(data.amount));
      const exchangeRate = data.exchange_rate ? parseFloat(data.exchange_rate) : null;
      // Amount stored in account's native currency (source for expense/transfer, target for income).
      // exchange_rate is only set for cross-currency transfers and used by txContribution for balance.
      const signedAmount = data.type === "expense" ? -rawAmount : rawAmount;

      const payload = {
        ...data,
        amount: signedAmount,
        exchange_rate: exchangeRate,
        source_account_id: data.source_account_id || null,
        target_account_id: data.target_account_id || null,
        category_id: data.category_id || null,
        date: data.date instanceof Date ? data.date.toISOString().split("T")[0] : data.date, 
      };

      if (editingTx) {
        await axios.put(`/api/transactions/${editingTx.id}`, payload);
      } else {
        await axios.post("/api/transactions", payload);
      }

      onClose();
      onSaved();
      window.dispatchEvent(new CustomEvent("accounts-updated"));
    } catch (err) {
      setSubmitError(err.response?.data?.error || t("errors.saveFailed"));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} onTransitionEnter={handleOpen} fullWidth maxWidth="sm">
      <DialogTitle>{editingTx ? t("transactions.editTransaction") : t("transactions.newTransaction")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={field.value}
                onChange={(_, val) => {
                  if (!val) return;
                  field.onChange(val);
                  setValue("target_account_id", "");
                  setValue("category_id", "");
                  setValue("exchange_rate", "");
                  if (val === "transfer") setValue("description", t("transactions.transferDefault"));
                }}
              >
                <ToggleButton value="expense">{t("common.expense")}</ToggleButton>
                <ToggleButton value="income">{t("common.income")}</ToggleButton>
                <ToggleButton value="transfer">{t("common.transfer")}</ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label={t("transactions.amount")}
                type="number"
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                error={!!errors.amount}
                helperText={errors.amount?.message}
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
                  fullWidth
                  label={t("transactions.exchangeRate")(foreignCurrency)}
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  error={!!errors.exchange_rate}
                  helperText={
                    errors.exchange_rate?.message ??
                    t("transactions.exchangeRateHint")(foreignCurrency)
                  }
                />
              )}
            />
          )}

          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label={t("transactions.date")}
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
                  <InputLabel>{t("transactions.sourceAccount")}</InputLabel>
                  <Select
                    {...field}
                    label={t("transactions.sourceAccount")}
                    onChange={(e) => {
                      field.onChange(e);
                      setValue("exchange_rate", "");
                    }}
                  >
                    <MenuItem value="">{t("common.none")}</MenuItem>
                    {accounts.map((acc) => (
                      <MenuItem key={acc.id} value={String(acc.id)}>
                        {acc.name}
                      </MenuItem>
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
                  <InputLabel>{t("transactions.targetAccount")}</InputLabel>
                  <Select
                    {...field}
                    label={t("transactions.targetAccount")}
                    onChange={(e) => {
                      field.onChange(e);
                      setValue("exchange_rate", "");
                    }}
                  >
                    <MenuItem value="">{t("common.none")}</MenuItem>
                    {accounts.map((acc) => (
                      <MenuItem key={acc.id} value={String(acc.id)}>
                        {acc.name}
                      </MenuItem>
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
                  <InputLabel>{t("transactions.category")}</InputLabel>
                  <Select {...field} label={t("transactions.category")}>
                    <MenuItem value="">{t("common.none")}</MenuItem>
                    {filteredCategories.map((cat) => (
                      <MenuItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </MenuItem>
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
              <TextField {...field} fullWidth label={t("transactions.description")} />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: { xs: 4, sm: 2 } }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

