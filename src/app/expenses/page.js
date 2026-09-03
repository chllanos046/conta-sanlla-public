"use client";
import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SettingsIcon from "@mui/icons-material/Settings";
import axios from "axios";
import { format, addMonths, subMonths } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";
import { ExpensesGroupTable } from "@/components/ExpensesGroupTable";
import { ExpenseTemplateDialog } from "@/components/ExpenseTemplateDialog";

export default function ExpensesPage() {
  const { t } = useTranslation();
  const [periodDate, setPeriodDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [resolvedKey, setResolvedKey] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [templates, setTemplates] = useState([]);

  const year = periodDate.getFullYear();
  const month = periodDate.getMonth() + 1;
  const requestKey = `${year}|${month}|${reloadToken}`;
  const loading = resolvedKey !== requestKey;

  // Bumps reloadToken so the effect below refetches even when year/month are unchanged.
  const loadInstances = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    axios.get(`/api/expenses/instances?year=${year}&month=${month}`)
      .then(({ data }) => { if (!cancelled) setGroups(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setResolvedKey(requestKey); });
    return () => { cancelled = true; };
  }, [year, month, requestKey]);

  const loadTemplates = useCallback(() => {
    axios.get("/api/expenses/templates").then(({ data }) => setTemplates(data)).catch(() => {});
  }, []);

  useEffect(() => { if (manageOpen) loadTemplates(); }, [manageOpen, loadTemplates]);

  const handleMarkPaid = (inst) => {
    const paid = !inst.paid;
    const paid_date = paid ? new Date().toISOString().slice(0, 10) : null;
    // Optimistic update — no reload
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        instances: g.instances.map((i) =>
          i.id === inst.id ? { ...i, paid, paid_date } : i
        ),
      }))
    );
    axios.patch(`/api/expenses/instances/${inst.id}`, { paid, paid_date }).catch(loadInstances);
  };

  const handleRowUpdate = (updatedInst) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        instances: g.instances.map((i) => (i.id === updatedInst.id ? { ...i, ...updatedInst } : i)),
      }))
    );
  };

  const handleDeleteTemplate = async (id) => {
    await axios.delete(`/api/expenses/templates/${id}`);
    loadTemplates();
    loadInstances();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>{t("expenses.title")}</Typography>
        <Tooltip title={t("expenses.manageTemplates")}>
          <IconButton onClick={() => setManageOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Month navigator */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton size="small" onClick={() => setPeriodDate((d) => subMonths(d, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 160, textAlign: "center" }}>
          {format(periodDate, "MMMM yyyy")}
        </Typography>
        <IconButton size="small" onClick={() => setPeriodDate((d) => addMonths(d, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Expenses grouped tables */}
      {loading && <CircularProgress size={24} />}

      {!loading && groups.length === 0 && (
        <Typography color="text.secondary">{t("expenses.noExpenses")}</Typography>
      )}

      {!loading && groups.map((group) => (
        <ExpensesGroupTable
          key={group.group_id}
          groupName={group.group_name}
          instances={group.instances}
          onMarkPaid={handleMarkPaid}
          onRowUpdate={handleRowUpdate}
        />
      ))}

      {/* Manage Templates dialog */}
      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {t("expenses.manageTemplates")}
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }}
          >
            {t("expenses.newTemplate")}
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {templates.length === 0 && (
            <Typography sx={{ p: 2 }} color="text.secondary">{t("expenses.noTemplates")}</Typography>
          )}
          <List disablePadding>
            {templates.map((tpl, i) => (
              <Box key={tpl.id}>
                {i > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={tpl.name}
                    secondary={`${tpl.group_name} · día ${tpl.due_day}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => { setEditingTemplate(tpl); setTemplateDialogOpen(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(tpl.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Box>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Template create/edit dialog */}
      <ExpenseTemplateDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        template={editingTemplate}
        onSaved={() => { loadTemplates(); loadInstances(); }}
      />

      {/* FAB shortcut to add template */}
      <Fab
        color="primary"
        sx={{ position: "fixed", bottom: 24, right: 24 }}
        onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
