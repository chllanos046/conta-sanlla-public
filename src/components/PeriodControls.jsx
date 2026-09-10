"use client";
import { isSameMonth } from "date-fns";
import { format, addMonths, subMonths } from "date-fns";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useTranslation } from "@/hooks/useTranslation";

export function PeriodControls({
  period = "month",
  periodDate,
  onPeriodChange,
  onDateChange,
  showYear = true,
  rightSlot,
}) {
  const { t } = useTranslation();
  const today = new Date();
  const isCurrentMonth = periodDate ? isSameMonth(periodDate, today) : false;

  const handleToggle = (_, val) => {
    if (!val) return;
    onPeriodChange(val);
    onDateChange(new Date());
  };

  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: 2,
        flexWrap: { sm: "wrap" },
        justifyContent: { sm: "space-between" },
        bgcolor: "background.paper",
        borderRadius: 1,
        p: { xs: 1.5, sm: 1.5 },
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {showYear && (
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handleToggle}
            size="small"
            color="primary"
            sx={{
              "& .MuiToggleButton-root.Mui-selected": {
                bgcolor: "primary.main",
                color: "#F1EBE1",
                "&:hover": { bgcolor: "primary.dark" },
              },
            }}
          >
            <ToggleButton value="month">{t("dashboard.month")}</ToggleButton>
            <ToggleButton value="year">{t("dashboard.year")}</ToggleButton>
          </ToggleButtonGroup>
        )}

        {(!showYear || period === "month") && periodDate && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton size="small" onClick={() => onDateChange((d) => subMonths(d, 1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Chip
              label={format(periodDate, "MMMM yyyy")}
              variant="outlined"
              size="small"
              sx={{ minWidth: 130, justifyContent: "center", fontWeight: 500 }}
            />
            <IconButton
              size="small"
              onClick={() => onDateChange((d) => addMonths(d, 1))}
              disabled={isCurrentMonth}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        )}

        {showYear && period === "year" && (
          <DatePicker
            label={t("dashboard.year")}
            views={["year"]}
            format="yyyy"
            value={periodDate}
            onChange={(v) => v && onDateChange(v)}
            slotProps={{ textField: { size: "small" } }}
          />
        )}
      </Box>

      {rightSlot}
    </Box>
  );
}
