"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import FilterListIcon from "@mui/icons-material/FilterList";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export function TransactionFilters({ filters, onChange, onApply, onClear, accounts }) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          userSelect: "none",
          width: "fit-content",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <FilterListIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Filters
        </Typography>
        <IconButton size="small">
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box
          sx={{
            mt: 1,
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

            <Button variant="contained" onClick={onApply}>
              Apply
            </Button>
            <Button variant="outlined" onClick={onClear}>
              Clear
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
