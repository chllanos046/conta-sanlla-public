"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const STEPS = ["Upload PDF", "Extracting", "Review & Map", "Done"];

export default function PdfImportDialog({ open, onClose, accountId, accountCurrency = "ARS", onImported }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [vencimiento, setVencimiento] = useState("");
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [exchangeRate, setExchangeRate] = useState("");
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(null);

  const needsRate = accountCurrency !== "USD";

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFile(null);
    setVencimiento("");
    setRows([]);
    setError(null);
    setImportCount(null);
    setExchangeRate("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    axios.get("/api/categories").then(({ data }) => setCategories(data)).catch(() => {});
    axios.get("/api/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
  }, [open]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
  };

  const handleExtract = async () => {
    if (!file || !vencimiento) return;
    setStep(1);
    setError(null);

    let pdfBase64;
    try {
      pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch {
      setError("Failed to read PDF file.");
      setStep(0);
      return;
    }

    let allExtracted = [];
    try {
      const { data: aiData } = await axios.post("/api/ai/extract-transactions-pdf", {
        pdfBase64,
        accountCurrency,
      });
      allExtracted = aiData.transactions ?? [];
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? "Extraction failed");
      setStep(0);
      return;
    }

    if (allExtracted.length === 0) {
      setError("No transactions found in this PDF.");
      setStep(0);
      return;
    }

    // Duplicate detection
    const dates = allExtracted.map((t) => t.date).filter(Boolean).sort();
    let existing = [];
    if (dates.length > 0 && accountId) {
      try {
        const { data: txData } = await axios.get("/api/transactions", {
          params: { account: accountId, dateFrom: dates[0], dateTo: dates[dates.length - 1] },
        });
        existing = txData.transactions ?? [];
      } catch {
        // non-fatal
      }
    }

    const mapped = allExtracted.map((t) => {
      const dateWithVencimiento = { ...t, date: vencimiento };
      const isDuplicate = existing.some(
        (ex) =>
          String(ex.date).slice(0, 10) === vencimiento &&
          Math.abs(Math.abs(parseFloat(ex.amount)) - Math.abs(t.amount)) < 0.01
      );
      return { ...dateWithVencimiento, checked: !isDuplicate, isDuplicate, type: "expense", category_id: "", target_account_id: "" };
    });

    setRows(mapped);
    setStep(2);
  };

  const toggleRow = (i) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, checked: !r.checked } : r)));

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const handleImport = async () => {
    setError(null);
    const checkedRows = rows.filter((r) => r.checked);

    const incomplete = checkedRows.some((r) => {
      if (!r.date || !String(r.description || "").trim() || r.amount == null) return true;
      return r.type === "transfer" ? !r.target_account_id : !r.category_id;
    });
    if (incomplete) {
      setError("All fields are required for every selected transaction (description, category or target account).");
      return;
    }

    setImporting(true);
    const rate = needsRate && exchangeRate ? parseFloat(exchangeRate) : null;

    const toImport = checkedRows
      .map((r) => {
        const rawAmount = Math.abs(r.amount);
        const usdAmount = rate ? rawAmount / rate : rawAmount;
        return {
          type: r.type,
          amount: usdAmount,
          source_account_id: r.type === "income" ? null : accountId,
          target_account_id:
            r.type === "income"
              ? accountId
              : r.type === "transfer"
              ? r.target_account_id || null
              : null,
          category_id: r.type === "transfer" ? null : r.category_id || null,
          date: r.date,
          description: r.description || "",
          exchange_rate: rate,
        };
      });

    if (toImport.length === 0) {
      setError("No transactions selected.");
      setImporting(false);
      return;
    }

    try {
      const { data } = await axios.post("/api/transactions/import", { transactions: toImport });
      setImportCount(data.imported);
      setStep(3);
      window.dispatchEvent(new CustomEvent("accounts-updated"));
      onImported?.();
    } catch (err) {
      setError(err.response?.data?.error ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = rows.filter((r) => r.checked).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>Import from PDF Statement</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 0 — Upload */}
        {step === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              hidden
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileRef.current?.click()}
              size="large"
            >
              {file ? "Change PDF" : "Select PDF Statement"}
            </Button>
            {file && (
              <Chip label={file.name} variant="outlined" />
            )}
            {!file && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Upload your credit card statement PDF. All charges (titular and adicionales) will be extracted.
              </Typography>
            )}
            <TextField
              label="Fecha de vencimiento del resumen"
              type="date"
              size="small"
              value={vencimiento}
              onChange={(e) => setVencimiento(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Todas las transacciones se registrarán con esta fecha"
              required
              sx={{ maxWidth: 280 }}
            />
          </Box>
        )}

        {/* Step 1 — Extracting */}
        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
            <CircularProgress />
            <Typography color="text.secondary">Analyzing PDF statement…</Typography>
          </Box>
        )}

        {/* Step 2 — Review & Map */}
        {step === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {rows.length} transaction{rows.length !== 1 ? "s" : ""} found.
              {rows.some((r) => r.isDuplicate) && " Duplicates are pre-deselected."}
            </Typography>

            {needsRate && (
              <TextField
                label={`Exchange rate (${accountCurrency} per USD)`}
                type="number"
                size="small"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                sx={{ mb: 2, maxWidth: 280 }}
                helperText="Amounts will be divided by this rate to convert to USD"
              />
            )}

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => {
                    const isTransfer = row.type === "transfer";
                    const filteredCats = categories.filter((c) => c.type === row.type);
                    const transferTargets = accounts.filter(
                      (a) => String(a.id) !== String(accountId)
                    );
                    return (
                      <TableRow key={i} sx={{ opacity: row.checked ? 1 : 0.45 }}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={row.checked} onChange={() => toggleRow(i)} size="small" />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {row.date}
                          {row.isDuplicate && (
                            <Chip label="duplicate" size="small" color="warning" sx={{ ml: 0.5, fontSize: 10 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                          <TextField
                            size="small"
                            value={row.description}
                            onChange={(e) => updateRow(i, "description", e.target.value)}
                            variant="standard"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {accountCurrency} {Math.abs(row.amount).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                              value={row.type}
                              onChange={(e) => {
                                const next = e.target.value;
                                setRows((prev) =>
                                  prev.map((r, idx) =>
                                    idx === i
                                      ? { ...r, type: next, category_id: "", target_account_id: "" }
                                      : r
                                  )
                                );
                              }}
                            >
                              <MenuItem value="expense">Expense</MenuItem>
                              <MenuItem value="income">Income</MenuItem>
                              <MenuItem value="transfer">Transfer</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          {isTransfer ? (
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <Select
                                value={row.target_account_id}
                                onChange={(e) => updateRow(i, "target_account_id", e.target.value)}
                                displayEmpty
                              >
                                <MenuItem value="">— Account —</MenuItem>
                                {transferTargets.map((a) => (
                                  <MenuItem key={a.id} value={String(a.id)}>
                                    {a.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <Select
                                value={row.category_id}
                                onChange={(e) => updateRow(i, "category_id", e.target.value)}
                                displayEmpty
                              >
                                <MenuItem value="">— None —</MenuItem>
                                {filteredCats.map((c) => (
                                  <MenuItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h5" gutterBottom>
              ✓ Imported {importCount} transaction{importCount !== 1 ? "s" : ""}
            </Typography>
            <Typography color="text.secondary">
              Your transactions have been added to this account.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 1 }, pb: { xs: 3, sm: 1 } }}>
        <Button onClick={onClose} disabled={importing}>
          {step === 3 ? "Close" : "Cancel"}
        </Button>
        {step === 0 && (
          <Button variant="contained" onClick={handleExtract} disabled={!file || !vencimiento}>
            Extract
          </Button>
        )}
        {step === 2 && (
          <>
            <Button onClick={() => { setStep(0); setRows([]); }}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
            >
              {importing ? "Importing…" : `Import ${selectedCount}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
