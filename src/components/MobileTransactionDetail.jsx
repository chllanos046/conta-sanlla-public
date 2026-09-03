"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format, parseISO } from "date-fns";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";

function formatAmount(tx) {
  const currency =
    tx.type === "income" ? tx.target_currency : tx.source_currency;
  const symbol =
    currency === "USD" || currency === "ARS" ? "$" : (currency ?? "$");
  const value = Math.abs(parseFloat(tx.amount)).toFixed(2);
  return `${symbol}${value}`;
}

function amountColor(type) {
  if (type === "income") return "success.main";
  if (type === "expense") return "error.main";
  return "text.primary";
}

function DetailRow({ label, value, valueColor }) {
  return (
    <>
      <ListItem sx={{ px: 2, py: 1.25 }}>
        <ListItemText
          primary={
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          }
          secondary={
            <Typography
              variant="body1"
              color={valueColor ?? "text.primary"}
              fontWeight={valueColor ? 600 : 400}
            >
              {value ?? "—"}
            </Typography>
          }
        />
      </ListItem>
      <Divider component="li" />
    </>
  );
}

export function MobileTransactionDetail({ id }) {
  const router = useRouter();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/transactions/${id}`),
      axios.get("/api/accounts"),
      axios.get("/api/categories"),
    ])
      .then(([txRes, accRes, catRes]) => {
        setTx(txRes.data.transaction);
        setAccounts(accRes.data ?? []);
        setCategories(catRes.data ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshTx = () => {
    axios.get(`/api/transactions/${id}`).then(({ data }) => setTx(data.transaction));
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1,
          pt: 1.5,
          pb: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => router.back()} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Transaction
          </Typography>
        </Box>
        {tx && (
          <IconButton onClick={() => setEditOpen(true)} size="small" sx={{ mr: 1 }}>
            <EditIcon />
          </IconButton>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
          <CircularProgress />
        </Box>
      ) : error || !tx ? (
        <Box sx={{ textAlign: "center", pt: 6 }}>
          <Typography color="text.secondary">Transaction not found.</Typography>
        </Box>
      ) : (
        <List
          disablePadding
          sx={{
            mt: 2,
            mx: 2,
            border: "1px solid",
            borderColor:
              tx.type === "income"
                ? "success.main"
                : tx.type === "expense"
                  ? "error.main"
                  : "grey.400",
            borderRadius: 1,
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <DetailRow label="Type" value={tx.type} />
          <DetailRow
            label="Amount"
            value={formatAmount(tx)}
            valueColor={amountColor(tx.type)}
          />
          <DetailRow
            label="Date"
            value={format(parseISO(String(tx.date).slice(0, 10)), "MMMM d, yyyy")}
          />
          <DetailRow label="Concept" value={tx.description} />
          <DetailRow label="Category" value={tx.category_name} />
          <DetailRow label="Source account" value={tx.source_name} />
          <DetailRow label="Target account" value={tx.target_name} />
          {tx.exchange_rate != null && (
            <DetailRow
              label="Exchange rate"
              value={`${tx.exchange_rate} ${tx.source_currency ?? ""} = 1 USD`}
            />
          )}
        </List>
      )}

      <TransactionFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editingTx={tx}
        accounts={accounts}
        categories={categories}
        onSaved={() => {
          setEditOpen(false);
          refreshTx();
        }}
      />
    </Box>
  );
}
