"use client";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import { format } from "date-fns";

export function TransactionsTable({ rows, accounts, openingBalance, onEditRow }) {
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
      width: 120,
      valueFormatter: (value) =>
        value != null ? `$${parseFloat(value).toFixed(2)}` : "",
    },
    {
      field: "balance",
      headerName: "Balance",
      width: 130,
      valueFormatter: (value) =>
        value != null ? `$${parseFloat(value).toFixed(2)}` : "",
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
          onClick={() => onEditRow(params.row)}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ height: 700, width: "100%", overflow: "hidden" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
          sorting: { sortModel: [{ field: "date", sort: "desc" }] },
        }}
        pageSizeOptions={[10, 25, 50]}
        getRowId={(row) => row.id}
        slots={{
          footer: () => (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 2,
                px: 2,
                py: 1,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Opening balance (before first shown transaction):
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color: (openingBalance ?? 0) >= 0 ? "income.main" : "expense.main",
                }}
              >
                ${(openingBalance ?? 0).toFixed(2)}
              </Typography>
            </Box>
          ),
        }}
      />
    </Box>
  );
}
