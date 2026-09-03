"use client";
import { useState, useEffect, useCallback } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ReceiptIcon from "@mui/icons-material/Receipt";
import axios from "axios";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency } from "@/lib/utils";

function InstanceRow({ inst, onToggle }) {
  const paid = Boolean(inst.paid);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.75,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
        opacity: paid ? 0.55 : 1,
      }}
    >
      <IconButton size="small" onClick={() => onToggle(inst)} color={paid ? "success" : "default"}>
        {paid ? <CheckCircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
      </IconButton>
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <Typography variant="body2" noWrap>{inst.template_name}</Typography>
        <Typography variant="caption" color="text.secondary">{inst.group_name} · {String(inst.due_date).slice(0, 10)}</Typography>
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>
        {formatCurrency(parseFloat(inst.amount), "ARS")}
      </Typography>
    </Box>
  );
}

export function ExpensesWidget() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [resolvedToken, setResolvedToken] = useState(-1);
  const loading = resolvedToken !== reloadToken;

  // Bumps reloadToken so the effect below refetches on demand.
  const load = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    axios.get("/api/expenses/widget")
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setResolvedToken(reloadToken); });
    return () => { cancelled = true; };
  }, [reloadToken]);

  const toggle = async (inst) => {
    const paid = !inst.paid;
    await axios.patch(`/api/expenses/instances/${inst.id}`, {
      paid,
      paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
    });
    load();
  };

  const hasData = data && (data.thisWeek.length > 0 || data.overdue.length > 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <ReceiptIcon fontSize="small" color="action" />
          <Typography variant="h6" gutterBottom>
            {t("dashboard.comingExpenses")}
          </Typography>
        </Box>

        {loading && <CircularProgress size={20} />}

        {!loading && !hasData && (
          <Typography variant="body2" color="text.secondary">{t("expenses.noWidgetData")}</Typography>
        )}

        {!loading && data?.thisWeek.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("expenses.thisWeek")}
            </Typography>
            {data.thisWeek.map((inst) => (
              <InstanceRow key={inst.id} inst={inst} onToggle={toggle} />
            ))}
          </Box>
        )}

        {!loading && data?.overdue.length > 0 && (
          <Box>
            {data.thisWeek.length > 0 && <Divider sx={{ mb: 1.5 }} />}
            <Typography variant="caption" fontWeight={600} color="error.main" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("expenses.overdue")}
            </Typography>
            {data.overdue.map((inst) => (
              <InstanceRow key={inst.id} inst={inst} onToggle={toggle} />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
