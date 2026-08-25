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
import { useTranslation } from "@/hooks/useTranslation";

export function TransactionFilters({ filters, onChange, onApply, onClear, accounts, categories = [] }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  // Guard Select values: if accounts haven't loaded yet, the URL-seeded value won't match any option.
  const safeAccId = (val) => (accounts.some((a) => String(a.id) === val) ? val : "");
  const safeCatId = (val) => (categories.some((c) => String(c.id) === val) ? val : "");

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
          {t("filters.title")}
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
              <InputLabel>{t("filters.account")}</InputLabel>
              <Select
                value={safeAccId(filters.account)}
                label={t("filters.account")}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    account: e.target.value,
                    sourceAccount: "",
                    targetAccount: "",
                  })
                }
              >
                <MenuItem value="">{t("filters.allAccounts")}</MenuItem>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>{t("filters.type")}</InputLabel>
              <Select
                value={filters.type}
                label={t("filters.type")}
                onChange={(e) => onChange({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">{t("filters.allTypes")}</MenuItem>
                <MenuItem value="income">{t("common.income")}</MenuItem>
                <MenuItem value="expense">{t("common.expense")}</MenuItem>
                <MenuItem value="transfer">{t("common.transfer")}</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>{t("filters.category")}</InputLabel>
              <Select
                value={safeCatId(filters.category)}
                label={t("filters.category")}
                onChange={(e) => onChange({ ...filters, category: e.target.value })}
              >
                <MenuItem value="">{t("filters.allCategories")}</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>{t("filters.sourceAccount")}</InputLabel>
              <Select
                value={safeAccId(filters.sourceAccount)}
                label={t("filters.sourceAccount")}
                onChange={(e) =>
                  onChange({ ...filters, sourceAccount: e.target.value, account: "" })
                }
              >
                <MenuItem value="">{t("common.all")}</MenuItem>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>{t("filters.targetAccount")}</InputLabel>
              <Select
                value={safeAccId(filters.targetAccount)}
                label={t("filters.targetAccount")}
                onChange={(e) =>
                  onChange({ ...filters, targetAccount: e.target.value, account: "" })
                }
              >
                <MenuItem value="">{t("common.all")}</MenuItem>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button variant="contained" onClick={onApply}>
              {t("common.apply")}
            </Button>
            <Button variant="outlined" onClick={onClear}>
              {t("common.clear")}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
