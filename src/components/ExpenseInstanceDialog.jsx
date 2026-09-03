"use client";
import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";
import axios from "axios";
import { useTranslation } from "@/hooks/useTranslation";

export function ExpenseInstanceDialog({ open, onClose, instance, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ amount: "", paid: false, paid_date: "", transaction_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!instance) return;
    setForm({
      amount: String(instance.amount),
      paid: Boolean(instance.paid),
      paid_date: instance.paid_date ? String(instance.paid_date).slice(0, 10) : "",
      transaction_id: instance.transaction_id ?? "",
    });
  }, [instance]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/expenses/instances/${instance.id}`, {
        amount: parseFloat(form.amount),
        paid: form.paid,
        paid_date: form.paid || form.paid_date ? form.paid_date || null : null,
        transaction_id: form.transaction_id ? parseInt(form.transaction_id) : null,
      });
      onSaved?.();
      onClose();
    } catch {
      // no-op
    } finally {
      setSaving(false);
    }
  };

  if (!instance) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("expenses.editInstance")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField
          label={t("expenses.amount")}
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          type="number"
          size="small"
          fullWidth
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.paid}
              onChange={(e) => setForm((p) => ({ ...p, paid: e.target.checked, paid_date: e.target.checked && !p.paid_date ? new Date().toISOString().slice(0, 10) : p.paid_date }))}
            />
          }
          label={form.paid ? t("expenses.paid") : t("expenses.unpaid")}
        />
        {form.paid && (
          <TextField
            label={t("expenses.paidDate")}
            value={form.paid_date}
            onChange={(e) => setForm((p) => ({ ...p, paid_date: e.target.value }))}
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        )}
        <TextField
          label={t("expenses.linkTransaction")}
          value={form.transaction_id}
          onChange={(e) => setForm((p) => ({ ...p, transaction_id: e.target.value }))}
          type="number"
          size="small"
          fullWidth
          placeholder="Transaction ID"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: { xs: 3, sm: 2 } }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
