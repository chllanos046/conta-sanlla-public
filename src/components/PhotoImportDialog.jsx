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
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const STEPS = ["Upload", "Extracting", "Review & Map", "Done"];

export default function PhotoImportDialog({ open, onClose, accountId, accountCurrency = "USD", onImported }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
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
    setPreview(null);
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
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleExtract = async () => {
    if (!preview) return;
    setStep(1);
    setExtracting(true);
    setError(null);
    try {
      const base64 = preview.split(",")[1];
      const { data: aiData } = await axios.post("/api/ai/extract-transactions", {
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
        accountCurrency,
      });

      const extracted = aiData.transactions ?? [];
      if (extracted.length === 0) {
        setError("No transactions found in this image. Try a clearer photo.");
        setStep(0);
        return;
      }

      // Fetch existing transactions for duplicate detection
      const dates = extracted.map((t) => t.date).filter(Boolean).sort();
      let existing = [];
      if (dates.length > 0 && accountId) {
        try {
          const { data: txData } = await axios.get("/api/transactions", {
            params: { account: accountId, dateFrom: dates[0], dateTo: dates[dates.length - 1] },
          });
          existing = txData.transactions ?? [];
        } catch {
          // non-fatal, duplicate detection won't work
        }
      }

      const mapped = extracted.map((t) => {
        const isDuplicate = existing.some(
          (ex) =>
            String(ex.date).slice(0, 10) === t.date &&
            Math.abs(Math.abs(parseFloat(ex.amount)) - Math.abs(t.amount)) < 0.01
        );
        return { ...t, checked: !isDuplicate, isDuplicate, type: "expense", category_id: "", target_account_id: "" };
      });

      setRows(mapped);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? "Extraction failed");
      setStep(0);
    } finally {
      setExtracting(false);
    }
  };

  const toggleRow = (i) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, checked: !r.checked } : r)));

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    const rate = needsRate && exchangeRate ? parseFloat(exchangeRate) : null;

    const toImport = rows
      .filter((r) => r.checked)
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
      <DialogTitle>Import from Photo</DialogTitle>
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
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileRef.current?.click()}
              size="large"
            >
              {file ? "Change Photo" : "Select or Take Photo"}
            </Button>
            {preview && (
              <Box
                component="img"
                src={preview}
                alt="Preview"
                sx={{ maxWidth: "100%", maxHeight: 320, borderRadius: 1, objectFit: "contain" }}
              />
            )}
            {!file && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Take a photo of a receipt or bank statement. AI will extract the transactions.
              </Typography>
            )}
          </Box>
        )}

        {/* Step 1 — Extracting */}
        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
            <CircularProgress />
            <Typography color="text.secondary">Analyzing photo…</Typography>
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
                      (a) => a.currency === accountCurrency && String(a.id) !== String(accountId)
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
                          {accountCurrency} {Math.abs(row.amount).toFixed(2)}
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

      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          {step === 3 ? "Close" : "Cancel"}
        </Button>
        {step === 0 && (
          <Button variant="contained" onClick={handleExtract} disabled={!file}>
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
