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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const STEPS = ["Upload", "Extracting", "Review & Map", "Done"];

const MAX_DIMENSION = 1600;

// ponytail: full-res mobile camera photos (often 8-12MB) blow past Vercel's
// ~4.5MB request body limit and fail silently. Downscale client-side instead
// of adding a server-side upload/streaming pipeline.
function downscaleImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve(ev.target.result);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoImportDialog({ open, onClose, accountId, accountCurrency = "USD", onImported }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [extractProgress, setExtractProgress] = useState("");
  const [error, setError] = useState(null);
  const [failedFiles, setFailedFiles] = useState([]); // [{ file, preview, error }]
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [exchangeRate, setExchangeRate] = useState("");
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const effectiveAccountId = accountId || selectedAccountId || null;
  const effectiveAccount = accounts.find((a) => String(a.id) === String(effectiveAccountId));
  const effectiveCurrency = effectiveAccount?.currency ?? accountCurrency;
  const needsRate = effectiveCurrency !== "USD";

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFiles([]);
    setPreviews([]);
    setRows([]);
    setError(null);
    setFailedFiles([]);
    setImportCount(null);
    setExchangeRate("");
    setSelectedAccountId("");
    setExtractProgress("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    axios.get("/api/categories").then(({ data }) => setCategories(data)).catch(() => {});
    axios.get("/api/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
  }, [open]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles(selected);
    setError(null);
    Promise.all(selected.map(downscaleImage)).then(setPreviews);
  };

  const handleExtract = async () => {
    if (!previews.length) return;
    setStep(1);
    setError(null);
    let allExtracted = [];
    const failed = [];
    for (let i = 0; i < files.length; i++) {
      setExtractProgress(
        files.length > 1 ? `Analyzing image ${i + 1} of ${files.length}…` : "Analyzing photo…"
      );
      const base64 = previews[i].split(",")[1];
      try {
        const { data: aiData } = await axios.post("/api/ai/extract-transactions", {
          imageBase64: base64,
          mimeType: "image/jpeg",
          accountCurrency: effectiveCurrency,
        });
        allExtracted = allExtracted.concat(aiData.transactions ?? []);
      } catch (err) {
        failed.push({
          file: files[i],
          preview: previews[i],
          error: err.response?.data?.error ?? err.message ?? "Extraction failed",
        });
      }
    }
    setFailedFiles(failed);

    try {
      if (allExtracted.length === 0) {
        setError(
          failed.length > 0
            ? `No transactions extracted — ${failed.length} photo(s) failed.`
            : "No transactions found in these images. Try clearer photos."
        );
        setStep(0);
        return;
      }

      // Duplicate detection
      const dates = allExtracted.map((t) => t.date).filter(Boolean).sort();
      let existing = [];
      if (dates.length > 0 && effectiveAccountId) {
        try {
          const { data: txData } = await axios.get("/api/transactions", {
            params: { account: effectiveAccountId, dateFrom: dates[0], dateTo: dates[dates.length - 1] },
          });
          existing = txData.transactions ?? [];
        } catch {
          // non-fatal
        }
      }

      const mapped = allExtracted.map((t) => {
        const isDuplicate = existing.some(
          (ex) =>
            String(ex.date).slice(0, 10) === t.date &&
            Math.abs(Math.abs(parseFloat(ex.amount)) - Math.abs(t.amount)) < 0.01
        );
        return {
          ...t,
          checked: !isDuplicate,
          isDuplicate,
          type: "expense",
          category_id: "",
          target_account_id: "",
        };
      });

      setRows(mapped);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? "Extraction failed");
      setStep(0);
    }
  };

  const handleRetryFailed = () => {
    setFiles(failedFiles.map((f) => f.file));
    setPreviews(failedFiles.map((f) => f.preview));
    setFailedFiles([]);
    setRows([]);
    setError(null);
    setImportCount(null);
    setStep(0);
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
          source_account_id: r.type === "income" ? null : effectiveAccountId,
          target_account_id:
            r.type === "income"
              ? effectiveAccountId
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
  const canExtract = previews.length > 0 && (accountId || selectedAccountId);

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
            {!accountId && (
              <FormControl size="small" sx={{ width: "100%", maxWidth: 320 }}>
                <InputLabel>Account</InputLabel>
                <Select
                  value={selectedAccountId}
                  label="Account"
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileRef.current?.click()}
              size="large"
            >
              {files.length > 0 ? "Change Photos" : "Select Photos"}
            </Button>
            {previews.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {previews.map((src, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={src}
                    alt={`Preview ${i + 1}`}
                    sx={{ height: 120, maxWidth: 160, borderRadius: 1, objectFit: "cover" }}
                  />
                ))}
              </Box>
            )}
            {files.length === 0 && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Take photos of receipts or bank statements. AI will extract the transactions.
              </Typography>
            )}
          </Box>
        )}

        {/* Step 1 — Extracting */}
        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
            <CircularProgress />
            <Typography color="text.secondary">{extractProgress || "Analyzing photo…"}</Typography>
          </Box>
        )}

        {/* Step 2 — Review & Map */}
        {step === 2 && (
          <Box>
            {failedFiles.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {failedFiles.length} photo{failedFiles.length !== 1 ? "s" : ""} could not be processed and{" "}
                {failedFiles.length !== 1 ? "were" : "was"} skipped. You can retry {failedFiles.length !== 1 ? "them" : "it"} after importing.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {rows.length} transaction{rows.length !== 1 ? "s" : ""} found.
              {rows.some((r) => r.isDuplicate) && " Duplicates are pre-deselected."}
            </Typography>

            {needsRate && (
              <TextField
                label={`Exchange rate (${effectiveCurrency} per USD)`}
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
                      (a) => a.currency === effectiveCurrency && String(a.id) !== String(effectiveAccountId)
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
                          {effectiveCurrency} {Math.abs(row.amount).toFixed(2)}
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
            {failedFiles.length > 0 && (
              <Button variant="outlined" sx={{ mt: 2 }} onClick={handleRetryFailed}>
                Retry {failedFiles.length} failed photo{failedFiles.length !== 1 ? "s" : ""}
              </Button>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 1 }, pb: { xs: 3, sm: 1 } }}>
        <Button onClick={onClose} disabled={importing}>
          {step === 3 ? "Close" : "Cancel"}
        </Button>
        {step === 0 && (
          <Button variant="contained" onClick={handleExtract} disabled={!canExtract}>
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
