"use client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export function TransactionFilters({ filters, onChange, onApply, onClear, accounts }) {
  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Account</InputLabel>
          <Select
            value={filters.account}
            label="Account"
            onChange={(e) =>
              onChange({
                ...filters,
                account: e.target.value,
                sourceAccount: "",
                targetAccount: "",
              })
            }
          >
            <MenuItem value="">All Accounts</MenuItem>
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={String(acc.id)}>
                {acc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filters.type}
            label="Type"
            onChange={(e) => onChange({ ...filters, type: e.target.value })}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="transfer">Transfer</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Source Account</InputLabel>
          <Select
            value={filters.sourceAccount}
            label="Source Account"
            onChange={(e) =>
              onChange({ ...filters, sourceAccount: e.target.value, account: "" })
            }
          >
            <MenuItem value="">All</MenuItem>
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={String(acc.id)}>
                {acc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Target Account</InputLabel>
          <Select
            value={filters.targetAccount}
            label="Target Account"
            onChange={(e) =>
              onChange({ ...filters, targetAccount: e.target.value, account: "" })
            }
          >
            <MenuItem value="">All</MenuItem>
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={String(acc.id)}>
                {acc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DatePicker
          label="From Date"
          format="yyyy-MM-dd"
          value={filters.dateFrom}
          onChange={(val) => onChange({ ...filters, dateFrom: val })}
          slotProps={{ textField: { sx: { minWidth: 150 } } }}
        />
        <DatePicker
          label="To Date"
          format="yyyy-MM-dd"
          value={filters.dateTo}
          onChange={(val) => onChange({ ...filters, dateTo: val })}
          slotProps={{ textField: { sx: { minWidth: 150 } } }}
        />

        <Button variant="contained" onClick={onApply}>
          Apply
        </Button>
        <Button variant="outlined" onClick={onClear}>
          Clear
        </Button>
      </Box>
    </Box>
  );
}
