"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { ExpensesByCategoryChart } from "@/components/ExpensesByCategoryChart";
import { format, subMonths, addMonths, isSameMonth } from "date-fns";
import axios from "axios";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import AccountCarousel from "@/components/AccountCarousel";
import { convertToUSD } from "@/lib/currency";
import QuickAddTransaction, { QuickAddFab } from "@/components/QuickAddTransaction";

const PERIODS = [
  { value: "day",    label: "Day"    },
  { value: "month",  label: "Month"  },
  { value: "year",   label: "Year"   },
  { value: "custom", label: "Custom" },
];

const PULL_THRESHOLD = 80;

export default function Dashboard() {
  const [data, setData] = useState({ accounts: [], transactions: [], categories: [] });
  const [period, setPeriod]         = useState("month");
  const [periodDate, setPeriodDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo]     = useState(null);
  const [rates, setRates] = useState({});
  const prevArsRef = useRef(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);

  useEffect(() => {
    axios.get("/api/exchange-rates").then((res) => {
      const newRates = res.data;
      setRates((prev) => {
        prevArsRef.current = prev.ARS ?? newRates.ARS;
        return newRates;
      });
    }).catch(() => {});
  }, []);

  const buildApiUrl = useCallback(() => {
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
  }, [period, periodDate, customFrom, customTo]);

  const loadData = useCallback(() => {
    setRefreshing(true);
    axios.get(buildApiUrl())
      .then((res) => setData(res.data))
      .finally(() => setRefreshing(false));
  }, [buildApiUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pull-to-refresh
  useEffect(() => {
    let startY = 0;
    let pulling = false;

    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling) return;
      const dy = Math.max(0, e.touches[0].clientY - startY);
      setPullY(Math.min(dy, PULL_THRESHOLD + 20));
    };

    const onTouchEnd = (e) => {
      if (!pulling) return;
      pulling = false;
      const dy = e.changedTouches[0].clientY - startY;
      setPullY(0);
      if (dy >= PULL_THRESHOLD) {
        loadData();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [loadData]);

  const handlePeriodChange = (_, val) => {
    if (!val) return;
    setPeriod(val);
    setPeriodDate(new Date());
  };

  const arsUp = rates.ARS != null && prevArsRef.current != null && rates.ARS !== prevArsRef.current
    ? rates.ARS > prevArsRef.current
    : null;

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

  // Expenses stored as negative — use Math.abs for correct sum
  const expenses = data.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + convertToUSD(Math.abs(parseFloat(t.amount || 0)), txCurrency(t), rates), 0);

  const balance = income - expenses;

  const chartData = (() => {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const getKey = (dateStr) => {
      const d = new Date(dateStr);
      if (period === "day")  return `${String(d.getHours()).padStart(2, "0")}:00`;
      if (period === "year") return String(d.getMonth() + 1).padStart(2, "0");
      return String(d.getDate()).padStart(2, "0");
    };

    const getLabel = (key) => {
      if (period === "day")  return `${key}h`;
      if (period === "year") return MONTHS[parseInt(key, 10) - 1];
      return `Day ${parseInt(key, 10)}`;
    };

    // Pre-fill all buckets for month/year so every slot appears even with 0 values
    const buckets = {};
    if (period === "month") {
      const daysInMonth = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = String(d).padStart(2, "0");
        buckets[key] = { key, income: 0, expense: 0 };
      }
    } else if (period === "year") {
      for (let m = 1; m <= 12; m++) {
        const key = String(m).padStart(2, "0");
        buckets[key] = { key, income: 0, expense: 0 };
      }
    }

    for (const t of data.transactions) {
      if (t.type !== "income" && t.type !== "expense") continue;
      if (!t.date) continue;
      const key = getKey(t.date);
      if (!buckets[key]) buckets[key] = { key, income: 0, expense: 0 };
      const amt = convertToUSD(Math.abs(parseFloat(t.amount || 0)), txCurrency(t), rates);
      buckets[key][t.type] += amt;
    }

    let runningBalance = 0;
    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, income, expense }) => {
        runningBalance += income - expense;
        return {
          name:    getLabel(key),
          income:  parseFloat(income.toFixed(2)),
          expense: parseFloat(expense.toFixed(2)),
          balance: parseFloat(runningBalance.toFixed(2)),
        };
      });
  })();

  const recentTransactions = [...data.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const pctChange = (current, previous) => {
    if (!previous) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const periodLabel = (() => {
    if (period === "year") return "From previous year";
    return "From previous month";
  })();

  const prevIncome  = data.prevMonthSummary?.income  ?? 0;
  const prevExpense = data.prevMonthSummary?.expense ?? 0;
  const prevBalance = prevIncome - prevExpense;

  const xAxisData = (period === "month" || period === "year")
    ? chartData.map((d) => d.name)
    : undefined;

  const summaryCards = [
    {
      title:         "Income",
      value:         `$${income.toFixed(2)}`,
      trend:         "up",
      data:          chartData.map((d) => d.income),
      xAxisData,
      percentChange: pctChange(income, prevIncome),
      interval:      periodLabel,
    },
    {
      title:         "Expenses",
      value:         `$${expenses.toFixed(2)}`,
      trend:         "down",
      data:          chartData.map((d) => d.expense),
      xAxisData,
      percentChange: pctChange(expenses, prevExpense),
      interval:      periodLabel,
    },
    {
      title:         "Balance",
      value:         `$${balance.toFixed(2)}`,
      trend:         "neutral",
      data:          chartData.map((d) => d.balance),
      xAxisData,
      percentChange: pctChange(balance, prevBalance),
      interval:      periodLabel,
    },
  ];

  const balanceColor = (val) => {
    if (val > 0) return "income.main";
    if (val < 0) return "expense.main";
    return "balance.main";
  };

  const today = new Date();
  const isCurrentMonth = isSameMonth(periodDate, today);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {/* Pull-to-refresh indicator */}
      {pullY > 0 && (
        <Box sx={{
          position: "fixed",
          top: 64 + pullY / 2,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
          transition: "top 0.05s",
          pointerEvents: "none",
        }}>
          <KeyboardArrowDownIcon
            sx={{
              color: "primary.main",
              fontSize: 32,
              opacity: Math.min(pullY / PULL_THRESHOLD, 1),
              transform: pullY >= PULL_THRESHOLD ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </Box>
      )}

      {refreshing && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

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
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setPeriodDate((d) => subMonths(d, 1))}
              >
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
                onClick={() => setPeriodDate((d) => addMonths(d, 1))}
                disabled={isCurrentMonth}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
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
                ? <TrendingUpIcon fontSize="small" sx={{ color: "income.main" }} />
                : <TrendingDownIcon fontSize="small" sx={{ color: "expense.main" }} />
            )}
          </Box>
        )}
      </Box>

      {/* Summary stat cards with sparklines */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map(({ title, value, trend, data, xAxisData, percentChange, interval }) => (
          <Grid key={title} size={{ xs: 12, sm: 4 }}>
            <SummaryStatCard
              title={title}
              value={value}
              trend={trend}
              data={data}
              xAxisData={xAxisData}
              percentChange={percentChange}
              interval={interval}
            />
          </Grid>
        ))}
      </Grid>

      {/* Recent Transactions + Expenses by Category */}
      <Grid container spacing={3} sx={{ mb: 3, alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Transactions
              </Typography>
              {recentTransactions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No transactions for this period
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Account</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTransactions.map((tx) => {
                      const amt = Math.abs(parseFloat(tx.amount || 0));
                      const isIncome = tx.type === "income";
                      const isExpense = tx.type === "expense";
                      return (
                        <TableRow key={tx.id} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {(() => {
                              if (!tx.date) return "—";
                              const d = tx.date instanceof Date ? tx.date : new Date(tx.date + "T12:00:00");
                              return isNaN(d.getTime()) ? "—" : format(d, "MMM d");
                            })()}
                          </TableCell>
                          <TableCell>{tx.description || "—"}</TableCell>
                          <TableCell>{tx.category_name || "—"}</TableCell>
                          <TableCell>{tx.source_name || tx.target_name || "—"}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: isIncome ? "income.main" : isExpense ? "expense.main" : "text.secondary",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isIncome ? "+" : isExpense ? "-" : ""}${amt.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ExpensesByCategoryChart
            transactions={data.transactions}
            accountCurrencyMap={accountCurrencyMap}
            rates={rates}
          />
        </Grid>
      </Grid>

      {/* Account Balances Carousel */}
      {data.accounts.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Account Balances
          </Typography>
          <Box sx={{ mb: 3 }}>
            <AccountCarousel accounts={data.accounts} balanceColor={balanceColor} />
          </Box>
        </>
      )}

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
