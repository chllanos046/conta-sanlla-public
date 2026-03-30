"use client";
import { useEffect, useRef, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Box from "@mui/material/Box";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import BalanceIcon from "@mui/icons-material/Balance";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { LineChart } from "@mui/x-charts/LineChart";
import { format } from "date-fns";
import axios from "axios";
import StatCard from "@/components/StatCard";
import { convertToUSD } from "@/lib/currency";
import QuickAddTransaction, { QuickAddFab } from "@/components/QuickAddTransaction";


const PERIODS = [
  { value: "day",    label: "Day"    },
  { value: "month",  label: "Month"  },
  { value: "year",   label: "Year"   },
  { value: "custom", label: "Custom" },
];

export default function Dashboard() {
  const [data, setData] = useState({
    accounts: [],
    transactions: [],
    categories: [],
  });
  const [period, setPeriod]         = useState("month");
  const [periodDate, setPeriodDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo]     = useState(null);
  const [rates, setRates] = useState({});
  const prevArsRef = useRef(null);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    axios.get("/api/exchange-rates").then((res) => {
      const newRates = res.data;
      setRates((prev) => {
        prevArsRef.current = prev.ARS ?? newRates.ARS;
        return newRates;
      });
    }).catch(() => {});
  }, []);

  const buildApiUrl = () => {
    const p = new URLSearchParams({ period });
    if (period === "day") {
      p.set("date", format(periodDate, "yyyy-MM-dd"));
    } else if (period === "month") {
      p.set("year",  periodDate.getFullYear());
      p.set("month", periodDate.getMonth() + 1);
    } else if (period === "year") {
      p.set("year", periodDate.getFullYear());
    } else if (period === "custom") {
      if (customFrom) p.set("dateFrom", format(customFrom, "yyyy-MM-dd"));
      if (customTo)   p.set("dateTo",   format(customTo,   "yyyy-MM-dd"));
    }
    return `/api/dashboard?${p}`;
  };

  const loadData = () => {
    axios.get(buildApiUrl()).then((res) => setData(res.data));
  };

  useEffect(() => {
    loadData();
  }, [period, periodDate, customFrom, customTo]);

  const handlePeriodChange = (_, val) => {
    if (!val) return;
    setPeriod(val);
    setPeriodDate(new Date());
  };

  const arsUp = rates.ARS != null && prevArsRef.current != null && rates.ARS !== prevArsRef.current
    ? rates.ARS > prevArsRef.current
    : null;

  // Map account id → currency for transaction conversion
  const accountCurrencyMap = Object.fromEntries(
    data.accounts.map((a) => [String(a.id), a.currency])
  );

  const txCurrency = (t) => {
    if (t.type === "income") return accountCurrencyMap[String(t.target_account_id)] || "USD";
    return accountCurrencyMap[String(t.source_account_id)] || "USD";
  };

  const income = data.transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + convertToUSD(parseFloat(t.amount || 0), txCurrency(t), rates), 0);

  const expenses = data.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + convertToUSD(parseFloat(t.amount || 0), txCurrency(t), rates), 0);

  const balance = income - expenses;

  const chartData = (() => {
    const buckets = {};

    const getKey = (dateStr) => {
      const d = new Date(dateStr);
      if (period === "day") return `${String(d.getHours()).padStart(2, "0")}:00`;
      if (period === "year") return String(d.getMonth() + 1).padStart(2, "0");
      // month and custom: group by day-of-month
      return String(d.getDate()).padStart(2, "0");
    };

    const getLabel = (key) => {
      if (period === "day") return `${key}h`;
      if (period === "year") {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return months[parseInt(key, 10) - 1];
      }
      return `Day ${key}`;
    };

    for (const t of data.transactions) {
      if (t.type !== "income" && t.type !== "expense") continue;
      const key = getKey(t.date);
      if (!buckets[key]) buckets[key] = { key, income: 0, expense: 0 };
      buckets[key][t.type] += convertToUSD(parseFloat(t.amount || 0), txCurrency(t), rates);
    }

    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, income, expense }) => ({
        name: getLabel(key),
        income: parseFloat(income.toFixed(2)),
        expense: parseFloat(expense.toFixed(2)),
      }));
  })();

  const summaryCards = [
    {
      label: "Income",
      value: income,
      color: "success.main",
      iconBg: "success.main",
      icon: <TrendingUpIcon sx={{ fontSize: 28, color: "#fff" }} />,
    },
    {
      label: "Expenses",
      value: expenses,
      color: "error.main",
      iconBg: "error.main",
      icon: <TrendingDownIcon sx={{ fontSize: 28, color: "#fff" }} />,
    },
    {
      label: "Balance",
      value: balance,
      color: "primary.main",
      iconBg: "primary.main",
      icon: <BalanceIcon sx={{ fontSize: 28, color: "#fff" }} />,
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Period controls row */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {period === "day" && (
            <DatePicker
              label="Day"
              format="yyyy-MM-dd"
              value={periodDate}
              onChange={(v) => v && setPeriodDate(v)}
              slotProps={{ textField: { size: "small" } }}
            />
          )}
          {period === "month" && (
            <DatePicker
              label="Month"
              views={["year", "month"]}
              openTo="month"
              format="yyyy-MM"
              value={periodDate}
              onChange={(v) => v && setPeriodDate(v)}
              slotProps={{ textField: { size: "small" } }}
            />
          )}
          {period === "year" && (
            <DatePicker
              label="Year"
              views={["year"]}
              format="yyyy"
              value={periodDate}
              onChange={(v) => v && setPeriodDate(v)}
              slotProps={{ textField: { size: "small" } }}
            />
          )}
          {period === "custom" && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <DatePicker
                label="From"
                format="yyyy-MM-dd"
                value={customFrom}
                onChange={(v) => setCustomFrom(v)}
                slotProps={{ textField: { size: "small" } }}
              />
              <DatePicker
                label="To"
                format="yyyy-MM-dd"
                value={customTo}
                onChange={(v) => setCustomTo(v)}
                slotProps={{ textField: { size: "small" } }}
              />
            </Box>
          )}
        </Box>

        {rates.ARS && (
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            border: "1px solid rgba(0,0,0,0.23)",
            borderRadius: 1,
            px: 1.5,
            height: 40,
          }}>
            <Typography variant="body2" color="text.secondary">
              1 USD = <strong>{rates.ARS.toLocaleString("en-US", { maximumFractionDigits: 2 })} ARS</strong>
            </Typography>
            {arsUp !== null && (
              arsUp
                ? <TrendingUpIcon fontSize="small" sx={{ color: "success.main" }} />
                : <TrendingDownIcon fontSize="small" sx={{ color: "error.main" }} />
            )}
          </Box>
        )}
      </Box>

      {/* Summary cards: 3 cols → 2 cols → 1 col */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map(({ label, value, color, iconBg, icon }) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              label={label}
              value={`$${value.toFixed(2)}`}
              valueColor={color}
              icon={icon}
              iconBg={iconBg}
            />
          </Grid>
        ))}
      </Grid>

      {/* Account cards: 4 cols → 2 cols → 1 col */}
      <Typography variant="h6" gutterBottom>
        Account Balances
      </Typography>
      {data.accounts.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No accounts yet.
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {data.accounts.map((acc) => (
            <Grid key={acc.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label={acc.name}
                value={`$${parseFloat(acc.balance).toFixed(2)}`}
                valueColor={parseFloat(acc.balance) > 0 ? "success.main" : parseFloat(acc.balance) < 0 ? "error.main" : "primary.main"}
                icon={
                  acc.image_path
                    ? <Box component="img" src={acc.image_path} alt={acc.name} sx={{ width: 48, height: 48, objectFit: "cover" }} />
                    : <AccountTypeIcon type={acc.type} sx={{ fontSize: 22, color: "grey.600" }} />
                }
                iconBg="grey.300"
                href={`/transactions?account=${acc.id}`}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Income vs Expenses chart */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Income vs Expenses
          </Typography>
          <LineChart
            xAxis={[{ data: chartData.map((d) => d.name), scaleType: "point" }]}
            series={[
              { data: chartData.map((d) => d.income), label: "Income", color: "#2e7d32", showMark: false },
              { data: chartData.map((d) => d.expense), label: "Expenses", color: "#d32f2f", showMark: false },
            ]}
            height={320}
            sx={{ width: "100%" }}
          />
        </CardContent>
      </Card>

      <QuickAddFab onClick={() => setFabOpen(true)} />
      <QuickAddTransaction
        accounts={data.accounts}
        categories={data.categories}
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSuccess={loadData}
      />
    </LocalizationProvider>
  );
}
