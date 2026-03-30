"use client";
import { useEffect } from "react";
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

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  account_id: z.string().min(1, "Account is required"),
  category_id: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

const EMPTY_FORM = {
  type: "expense",
  amount: "",
  account_id: "",
  category_id: "",
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
};

export default function QuickAddTransaction({ accounts = [], categories = [], open, onClose, onSuccess }) {
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const type = watch("type");
  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (open) reset(EMPTY_FORM);
  }, [open, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description || "",
        category_id: data.category_id,
        ...(data.type === "income"
          ? { target_account_id: data.account_id }
          : { source_account_id: data.account_id }),
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
                  onChange={(_, val) => { if (val) field.onChange(val); }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="expense">Expense</ToggleButton>
                  <ToggleButton value="income">Income</ToggleButton>
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

            <Controller
              name="account_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Account"
                  error={!!errors.account_id}
                  helperText={errors.account_id?.message}
                  size="small"
                  fullWidth
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Category"
                  error={!!errors.category_id}
                  helperText={errors.category_id?.message}
                  size="small"
                  fullWidth
                >
                  {filteredCategories.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

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
