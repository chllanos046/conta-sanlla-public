"use client";

import { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";
import QuickAddTransaction from "@/components/QuickAddTransaction";

const TransactionDialogContext = createContext(null);

export function TransactionDialogProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const openTransactionDialog = useCallback(async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        axios.get("/api/accounts"),
        axios.get("/api/categories"),
      ]);
      setAccounts(accRes.data);
      setCategories(catRes.data);
    } catch {
      setAccounts([]);
      setCategories([]);
    }
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <TransactionDialogContext.Provider value={{ openTransactionDialog }}>
      {children}
      <QuickAddTransaction
        accounts={accounts}
        categories={categories}
        open={open}
        onClose={handleClose}
        onSuccess={handleClose}
        navigateOnSuccess
      />
    </TransactionDialogContext.Provider>
  );
}

export function useTransactionDialog() {
  const ctx = useContext(TransactionDialogContext);
  if (!ctx) throw new Error("useTransactionDialog must be used within TransactionDialogProvider");
  return ctx;
}
