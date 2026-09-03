"use client";
import { DataGrid } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import axios from "axios";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency } from "@/lib/utils";

export function ExpensesGroupTable({ groupName, instances, onMarkPaid, onRowUpdate }) {
  const { t } = useTranslation();

  const processRowUpdate = async (newRow, oldRow) => {
    const changed = {};
    if (newRow.amount !== oldRow.amount) changed.amount = parseFloat(newRow.amount);
    if (newRow.due_date !== oldRow.due_date) changed.due_date = newRow.due_date || null;
    if (newRow.paid_date !== oldRow.paid_date) changed.paid_date = newRow.paid_date || null;
    if (!Object.keys(changed).length) return oldRow;
    await axios.patch(`/api/expenses/instances/${newRow.id}`, changed);
    onRowUpdate?.(newRow);
    return newRow;
  };

  const columns = [
    {
      field: "template_name",
      headerName: t("expenses.templateName"),
      flex: 1,
      minWidth: 160,
    },
    {
      field: "due_date",
      headerName: t("expenses.dueDate"),
      width: 130,
      editable: true,
      type: "date",
      valueGetter: (value) => (value ? new Date(value) : null),
      valueSetter: (value, row) => ({ ...row, due_date: value ? value.toISOString().slice(0, 10) : null }),
      valueFormatter: (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : ""),
    },
    {
      field: "amount",
      headerName: t("expenses.amount"),
      width: 140,
      editable: true,
      type: "number",
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => formatCurrency(parseFloat(value), "ARS"),
    },
    {
      field: "paid_date",
      headerName: t("expenses.paidDate"),
      width: 130,
      editable: true,
      type: "date",
      valueGetter: (value) => (value ? new Date(value) : null),
      valueSetter: (value, row) => ({ ...row, paid_date: value ? value.toISOString().slice(0, 10) : null }),
      valueFormatter: (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : "—"),
    },
    {
      field: "paid",
      headerName: t("common.confirm"),
      width: 130,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const paid = Boolean(params.value);
        return (
          <Chip
            size="small"
            label={paid ? t("expenses.paid") : t("expenses.unpaid")}
            color={paid ? "success" : "default"}
            variant={paid ? "filled" : "outlined"}
            icon={paid ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            onClick={() => onMarkPaid?.(params.row)}
            sx={{ cursor: "pointer", fontWeight: 500 }}
          />
        );
      },
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}
      >
        {groupName}
      </Typography>
      <DataGrid
        rows={instances}
        columns={columns}
        getRowId={(row) => row.id}
        processRowUpdate={processRowUpdate}
        autoHeight
        hideFooter
        disableColumnMenu
        disableRowSelectionOnClick
        getRowClassName={(params) => (params.row.paid ? "row-paid" : "")}
        sx={{
          "& .row-paid": {
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(46,125,50,0.12)" : "rgba(232,245,233,0.8)",
          },
        }}
      />
    </Box>
  );
}
