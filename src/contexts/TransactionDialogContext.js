"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";

const TransactionDialogContext = createContext(null);

export function TransactionDialogProvider({ children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dialogOpts, setDialogOpts] = useState({ initialValues: {}, navigateOnSuccess: false });

  const openTransactionDialog = useCallback(async (options = {}) => {
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
    setDialogOpts({
      initialValues: options.initialValues ?? {},
      navigateOnSuccess: options.navigateOnSuccess ?? false,
    });
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleSaved = useCallback(() => {
    setOpen(false);
    if (dialogOpts.navigateOnSuccess) router.push("/transactions");
  }, [dialogOpts.navigateOnSuccess, router]);

  return (
    <TransactionDialogContext.Provider value={{ openTransactionDialog }}>
      {children}
      <TransactionFormDialog
        accounts={accounts}
        categories={categories}
        open={open}
        onClose={handleClose}
        onSaved={handleSaved}
        editingTx={null}
        defaultSourceAccountId={dialogOpts.initialValues?.source_account_id || ""}
      />
    </TransactionDialogContext.Provider>
  );
}

export function useTransactionDialog() {
  const ctx = useContext(TransactionDialogContext);
  if (!ctx) throw new Error("useTransactionDialog must be used within TransactionDialogProvider");
  return ctx;
}
