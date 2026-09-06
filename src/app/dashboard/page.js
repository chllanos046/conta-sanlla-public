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
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ExpensesByCategoryChart } from "@/components/ExpensesByCategoryChart";
import { ExpensesWidget } from "@/components/ExpensesWidget";
import { format, subMonths, addMonths, isSameMonth } from "date-fns";
import axios from "axios";
import { SummaryStatCard } from "@/components/SummaryStatCard";
import StatCard from "@/components/StatCard";
import AccountCarousel from "@/components/AccountCarousel";
import { QuickAddFab } from "@/components/QuickAddTransaction";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { useCurrency } from "@/hooks/useCurrency";
import { useMounted } from "@/hooks/useMounted";
import { convertAmount } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import { useTranslation } from "@/hooks/useTranslation";

const PULL_THRESHOLD = 80;

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState({
    accounts: [],
    transactions: [],
    categories: [],
  });
  const [period, setPeriod] = useState("month");
  const [periodDate, setPeriodDate] = useState(null);
  const [rates, setRates] = useState({});
  const [arsUp, setArsUp] = useState(null);
  const prevArsRef = useRef(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [resolvedKey, setResolvedKey] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pullY, setPullY] = useState(0);
  const [displayCurrency] = useCurrency();

  // Client-only init to avoid an SSR/client hydration mismatch on "today".
  const mounted = useMounted();
  if (mounted && periodDate === null) {
    setPeriodDate(new Date());
  }

  useEffect(() => {
    axios
      .get("/api/exchange-rates")
      .then((res) => setRates(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (rates.ARS != null && prevArsRef.current != null && rates.ARS !== prevArsRef.current) {
      setArsUp(rates.ARS > prevArsRef.current);
    }
    prevArsRef.current = rates.ARS ?? prevArsRef.current;
  }, [rates.ARS]);

  const buildApiUrl = useCallback(() => {
    if (!periodDate) return null;
    const p = new URLSearchParams({ period });
    if (period === "month") {
      p.set("year", periodDate.getFullYear());
      p.set("month", periodDate.getMonth() + 1);
    } else if (period === "year") {
      p.set("year", periodDate.getFullYear());
    }
    return `/api/dashboard?${p}`;
  }, [period, periodDate]);

  // Bumps reloadToken so the effect below refetches even when period/periodDate are unchanged.
  const loadData = useCallback(() => setReloadToken((t) => t + 1), []);

  const requestUrl = buildApiUrl();
  const requestKey = requestUrl ? `${requestUrl}|${reloadToken}` : null;
  const refreshing = requestKey !== null && resolvedKey !== requestKey;

  useEffect(() => {
    if (!requestUrl) return;
    let cancelled = false;
    axios
      .get(requestUrl)
      .then((res) => { if (!cancelled) setData(res.data); })
      .finally(() => { if (!cancelled) setResolvedKey(requestKey); });
    return () => { cancelled = true; };
  }, [requestUrl, requestKey]);

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

  const accountMap = Object.fromEntries(data.accounts.map((a) => [String(a.id), a]));
  const arsRate = rates.ARS || 1;

  const toDisplay = (tx) => {
    const isIncome = tx.type === "income";
    const accountId = isIncome ? tx.target_account_id : tx.source_account_id;
    const txCurrency = accountMap[String(accountId)]?.currency || "USD";
    const txRate = parseFloat(tx.exchange_rate) || arsRate;
    return convertAmount(Math.abs(parseFloat(tx.amount || 0)), txCurrency, displayCurrency, txRate);
  };

  const income = data.transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + toDisplay(tx), 0);

  const expenses = data.transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + toDisplay(tx), 0);

  const balance = income - expenses;

  const chartData = (() => {
    if (!periodDate) return [];
    const MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const getKey = (dateStr) => {
      const ymd = String(dateStr).slice(0, 10);
      if (period === "year") return ymd.slice(5, 7);
      return ymd.slice(8, 10);
    };

    const getLabel = (key) => {
      if (period === "year") return MONTHS[parseInt(key, 10) - 1];
      return `Day ${parseInt(key, 10)}`;
    };

    // Pre-fill all buckets for month/year so every slot appears even with 0 values
    const buckets = {};
    if (period === "month") {
      const daysInMonth = new Date(
        periodDate.getFullYear(),
        periodDate.getMonth() + 1,
        0,
      ).getDate();
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
      const accountId = t.type === "income" ? t.target_account_id : t.source_account_id;
      const txCurrency = accountMap[String(accountId)]?.currency || "USD";
      const txRate = parseFloat(t.exchange_rate) || arsRate;
      const amt = convertAmount(Math.abs(parseFloat(t.amount || 0)), txCurrency, displayCurrency, txRate);
      buckets[key][t.type] += amt;
    }

    let runningBalance = 0;
    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, income, expense }) => {
        runningBalance += income - expense;
        return {
          name: getLabel(key),
          income: parseFloat(income.toFixed(2)),
          expense: parseFloat(expense.toFixed(2)),
          balance: parseFloat(runningBalance.toFixed(2)),
        };
      });
  })();

  const recentTransactions = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const pctChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const periodLabel = period === "year" ? t("dashboard.fromPreviousYear") : t("dashboard.fromPreviousMonth");

  const prevIncome = convertAmount(data.prevMonthSummary?.income ?? 0, "USD", displayCurrency, arsRate);
  const prevExpense = convertAmount(data.prevMonthSummary?.expense ?? 0, "USD", displayCurrency, arsRate);
  const prevBalance = prevIncome - prevExpense;

  const xAxisData =
    period === "month" || period === "year"
      ? chartData.map((d) => d.name)
      : undefined;

  const summaryCards = [
    {
      title: t("dashboard.income"),
      value: formatCurrency(income, displayCurrency),
      trend: "up",
      data: chartData.map((d) => d.income),
      xAxisData,
      percentChange: pctChange(income, prevIncome),
      interval: periodLabel,
    },
    {
      title: t("dashboard.expenses"),
      value: formatCurrency(expenses, displayCurrency),
      trend: "down",
      data: chartData.map((d) => d.expense),
      xAxisData,
      percentChange: pctChange(expenses, prevExpense),
      interval: periodLabel,
    },
    {
      title: t("dashboard.balance"),
      value: formatCurrency(balance, displayCurrency),
      trend: "neutral",
      data: chartData.map((d) => d.balance),
      xAxisData,
      percentChange: pctChange(balance, prevBalance),
      interval: periodLabel,
    },
  ];

  const balanceColor = (val) => {
    if (val > 0) return "income.main";
    if (val < 0) return "expense.main";
    return "balance.main";
  };

  const today = new Date();
  const isCurrentMonth = periodDate ? isSameMonth(periodDate, today) : false;

  return (
      <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1, sm: 0 } }}>
      {/* Pull-to-refresh indicator */}
      {pullY > 0 && (
        <Box
          sx={{
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
          }}
        >
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
          <CircularProgress size={20} color="primary" />
        </Box>
      )}

      {/* Period controls row */}
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
        {/* Toggle + date picker: same row on all sizes */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
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
            {[
              { value: "month", label: t("dashboard.month") },
              { value: "year", label: t("dashboard.year") },
            ].map((p) => (
              <ToggleButton key={p.value} value={p.value}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {period === "month" && periodDate && (
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
                sx={{
                  minWidth: 130,
                  justifyContent: "center",
                  fontWeight: 500,
                }}
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
              label={t("dashboard.year")}
              views={["year"]}
              format="yyyy"
              value={periodDate}
              onChange={(v) => v && setPeriodDate(v)}
              slotProps={{ textField: { size: "small" } }}
            />
          )}
        </Box>

        {rates.ARS && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              border: "1px solid rgba(0,0,0,0.23)",
              borderRadius: 1,
              px: 1.5,
              height: 40,
              width: { xs: "100%", sm: "auto" },
              justifyContent: { xs: "center", sm: "flex-start" },
            }}
          >
            <Typography variant="body2" color="text.secondary">
              1 USD ={" "}
              <strong>
                {rates.ARS.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                ARS
              </strong>
            </Typography>
            {arsUp !== null &&
              (arsUp ? (
                <TrendingUpIcon
                  fontSize="small"
                  sx={{ color: "income.main" }}
                />
              ) : (
                <TrendingDownIcon
                  fontSize="small"
                  sx={{ color: "expense.main" }}
                />
              ))}
          </Box>
        )}
      </Box>

      {/* Summary stat cards with sparklines */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryCards.map(
          ({
            title,
            value,
            trend,
            data,
            xAxisData,
            percentChange,
            interval,
          }) => (
            <Grid key={title} size={{ xs: 12, sm: 4 }}>
              <SummaryStatCard
                title={title}
                value={value}
                trend={trend}
                data={data}
                xAxisData={xAxisData}
                percentChange={percentChange}
                interval={interval}
                loading={refreshing}
              />
            </Grid>
          ),
        )}
      </Grid>

      {/* Credit card debt summary */}
      {(() => {
        const creditDebts = data.accounts
          .filter((a) => a.type === "credit" && parseFloat(a.current_balance) < 0)
          .reduce((acc, a) => {
            acc[a.currency] = (acc[a.currency] || 0) + Math.abs(parseFloat(a.current_balance));
            return acc;
          }, {});
        const currencies = Object.keys(creditDebts);
        if (!currencies.length) return null;
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Deuda en Tarjetas
            </Typography>
            <Grid container spacing={2}>
              {currencies.map((cur) => (
                <Grid key={cur} size={{ xs: 12, sm: 4 }}>
                  <StatCard
                    label={`Deuda (${cur})`}
                    value={`${getCurrencySymbol(cur)}${creditDebts[cur].toFixed(2)}`}
                    valueColor="expense.main"
                    icon={<CreditCardIcon sx={{ fontSize: 22, color: "error.main" }} />}
                    iconBg="error.light"
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })()}

      {/* Recent Transactions + Expenses by Category */}
      <Grid container spacing={3} sx={{ mb: 3, alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: { xs: "none", sm: "block" } }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("dashboard.recentTransactions")}
              </Typography>
              {refreshing ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : recentTransactions.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 2 }}
                >
                  {t("dashboard.noTransactionsInPeriod")}
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("transactions.date")}</TableCell>
                      <TableCell>{t("transactions.description")}</TableCell>
                      <TableCell>{t("transactions.category")}</TableCell>
                      <TableCell>{t("transactions.account")}</TableCell>
                      <TableCell align="right">{t("transactions.amount")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTransactions.map((tx) => {
                      const isIncome = tx.type === "income";
                      const isExpense = tx.type === "expense";
                      const txAccountId = isIncome ? tx.target_account_id : tx.source_account_id;
                      const txCurrency = accountMap[String(txAccountId)]?.currency || "USD";
                      const txRate = parseFloat(tx.exchange_rate) || arsRate;
                      const amt = convertAmount(Math.abs(parseFloat(tx.amount || 0)), txCurrency, displayCurrency, txRate);
                      return (
                        <TableRow key={tx.id} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {tx.date ? String(tx.date).slice(0, 10) : "—"}
                          </TableCell>
                          <TableCell>{tx.description || "—"}</TableCell>
                          <TableCell>{tx.category_name || "—"}</TableCell>
                          <TableCell>
                            {tx.source_name || tx.target_name || "—"}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: isIncome
                                ? "income.main"
                                : isExpense
                                  ? "expense.main"
                                  : "text.secondary",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isIncome ? "+" : isExpense ? "-" : ""}{formatCurrency(amt, displayCurrency)}
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
            accountMap={accountMap}
            displayCurrency={displayCurrency}
            arsRate={arsRate}
            loading={refreshing}
          />
        </Grid>

      </Grid>

      {/* Expenses Widget */}
      <Box sx={{ mb: 3 }}>
        <ExpensesWidget />
      </Box>

      {/* Account Balances Carousel */}
      {data.accounts.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            {t("dashboard.accountBalances")}
          </Typography>
          <Box sx={{ mb: 3 }}>
            <AccountCarousel
              accounts={data.accounts}
              balanceColor={balanceColor}
            />
          </Box>
        </>
      )}

      <QuickAddFab onClick={() => setFabOpen(true)} />
      <TransactionFormDialog
        accounts={data.accounts}
        categories={data.categories}
        open={fabOpen}
        onClose={() => setFabOpen(false)}
        onSaved={loadData}
        editingTx={null}
      />
      </Box>
  );
}
