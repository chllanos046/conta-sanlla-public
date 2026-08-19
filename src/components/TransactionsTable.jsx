"use client";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { convertAmount } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";

export function TransactionsTable({
  rows,
  accounts,
  openingBalance,
  onEditRow,
  onDeleteRow,
  displayCurrency = "USD",
  arsRate = 1,
  loading = false,
}) {
  const accountMap = Object.fromEntries((accounts || []).map((a) => [String(a.id), a]));

  const fmtAmount = (value, row) => {
    if (value == null) return "";
    const accountId = row.type === "income" ? row.target_account_id : row.source_account_id;
    const txCurrency = accountMap[String(accountId)]?.currency || "USD";
    const txRate = parseFloat(row.exchange_rate) || arsRate;
    const converted = convertAmount(parseFloat(value), txCurrency, displayCurrency, txRate);
    return formatCurrency(converted, displayCurrency);
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      width: 120,
      valueFormatter: (value) => (value ? String(value).slice(0, 10) : ""),
    },
    {
      field: "type",
      headerName: "Type",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === "income"
              ? "success"
              : params.value === "expense"
                ? "error"
                : "warning"
          }
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
      valueGetter: (_value, row) =>
        accounts.find((a) => a.id === row.source_account_id)?.name || "",
    },
    {
      field: "target_account",
      headerName: "Target Account",
      width: 150,
      valueGetter: (_value, row) =>
        accounts.find((a) => a.id === row.target_account_id)?.name || "",
    },
    { field: "description", headerName: "Description", width: 200 },
    {
      field: "amount",
      headerName: "Amount",
      width: displayCurrency === "ARS" ? 180 : 120,
      valueFormatter: (value, row) => fmtAmount(value, row),
    },
    {
      field: "balance",
      headerName: "Balance",
      width: displayCurrency === "ARS" ? 190 : 130,
      valueFormatter: (value) =>
        value != null ? formatCurrency(parseFloat(value), displayCurrency) : "",
    },
    {
      field: "actions",
      type: "actions",
      width: 90,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => onEditRow(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => onDeleteRow(params.row.id)}
        />,
      ],
    },
  ];

  const closingBalance = rows[0]?.balance ?? openingBalance;

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      {openingBalance !== null && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 3,
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Opening balance:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: openingBalance >= 0 ? "income.main" : "expense.main" }}
            >
              {formatCurrency(openingBalance, displayCurrency)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Closing balance:
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: closingBalance >= 0 ? "income.main" : "expense.main" }}
            >
              {formatCurrency(closingBalance, displayCurrency)}
            </Typography>
          </Box>
        </Box>
      )}
      <Box sx={{ height: 700 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: "date", sort: "desc" }] },
          }}
          pageSizeOptions={[25, 50, 100]}
          getRowId={(row) => row.id}
        />
      </Box>
    </Box>
  );
}
