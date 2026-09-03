"use client";
import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import axios from "axios";
import { useTranslation } from "@/hooks/useTranslation";

const MONTHS = [
  { n: 1, label: "Jan" }, { n: 2, label: "Feb" }, { n: 3, label: "Mar" },
  { n: 4, label: "Apr" }, { n: 5, label: "May" }, { n: 6, label: "Jun" },
  { n: 7, label: "Jul" }, { n: 8, label: "Aug" }, { n: 9, label: "Sep" },
  { n: 10, label: "Oct" }, { n: 11, label: "Nov" }, { n: 12, label: "Dec" },
];
const MONTHS_ES = [
  { n: 1, label: "Ene" }, { n: 2, label: "Feb" }, { n: 3, label: "Mar" },
  { n: 4, label: "Abr" }, { n: 5, label: "May" }, { n: 6, label: "Jun" },
  { n: 7, label: "Jul" }, { n: 8, label: "Ago" }, { n: 9, label: "Sep" },
  { n: 10, label: "Oct" }, { n: 11, label: "Nov" }, { n: 12, label: "Dic" },
];

const emptyForm = { name: "", group_id: "", default_amount: "", due_day: "10", active_months: [1,2,3,4,5,6,7,8,9,10,11,12] };

export function ExpenseTemplateDialog({ open, onClose, template, onSaved }) {
  const { t, locale } = useTranslation();
  const months = locale === "es" ? MONTHS_ES : MONTHS;
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [newGroupName, setNewGroupName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    axios.get("/api/expenses/groups").then(({ data }) => {
      setGroups(data);
      setForm(
        template
          ? {
              name: template.name,
              group_id: template.group_id,
              default_amount: String(template.default_amount),
              due_day: String(template.due_day),
              active_months: Array.isArray(template.active_months) ? template.active_months : JSON.parse(template.active_months),
            }
          : emptyForm
      );
    }).catch(() => {});
    setNewGroupName("");
  }, [open, template]);

  const toggleMonth = (n) => {
    setForm((prev) => ({
      ...prev,
      active_months: prev.active_months.includes(n)
        ? prev.active_months.filter((m) => m !== n)
        : [...prev.active_months, n].sort((a, b) => a - b),
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.group_id || !form.default_amount || !form.due_day || !form.active_months.length) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        group_id: form.group_id,
        default_amount: parseFloat(form.default_amount),
        due_day: parseInt(form.due_day),
        active_months: form.active_months,
      };
      if (template?.id) {
        await axios.put(`/api/expenses/templates/${template.id}`, payload);
      } else {
        await axios.post("/api/expenses/templates", payload);
      }
      onSaved?.();
      onClose();
    } catch {
      // no-op — user sees nothing happened
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const { data } = await axios.post("/api/expenses/groups", { name: newGroupName.trim() });
      setGroups((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, group_id: data.id }));
      setNewGroupName("");
    } catch {}
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {template ? t("expenses.editTemplate") : t("expenses.newTemplate")}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField
          label={t("expenses.templateName")}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          fullWidth
          size="small"
        />

        <FormControl fullWidth size="small">
          <InputLabel>{t("common.expense")} {t("expenses.groupName")}</InputLabel>
          <Select
            value={form.group_id}
            label={`${t("common.expense")} ${t("expenses.groupName")}`}
            onChange={(e) => setForm((p) => ({ ...p, group_id: e.target.value }))}
          >
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label={t("expenses.newGroup")}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
          />
          <Button variant="outlined" size="small" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
            +
          </Button>
        </Box>

        <Divider />

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label={t("expenses.defaultAmount")}
            value={form.default_amount}
            onChange={(e) => setForm((p) => ({ ...p, default_amount: e.target.value }))}
            type="number"
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label={t("expenses.dueDay")}
            value={form.due_day}
            onChange={(e) => setForm((p) => ({ ...p, due_day: e.target.value }))}
            type="number"
            inputProps={{ min: 1, max: 28 }}
            size="small"
            sx={{ width: 120 }}
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            {t("expenses.activeMonths")}
          </Typography>
          <FormGroup row>
            {months.map(({ n, label }) => (
              <FormControlLabel
                key={n}
                control={
                  <Checkbox
                    size="small"
                    checked={form.active_months.includes(n)}
                    onChange={() => toggleMonth(n)}
                  />
                }
                label={label}
                sx={{ mr: 0.5 }}
              />
            ))}
          </FormGroup>
        </Box>
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
