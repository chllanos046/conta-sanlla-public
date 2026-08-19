"use client";
import { useState, useRef, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import TextField from "@mui/material/TextField";
import axios from "axios";

const STEPS = ["Upload CSV", "Column Mapping", "Value Mapping", "Preview & Import"];

const TX_FIELDS = [
  { key: "type", label: "Type", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: false },
  { key: "source_account", label: "Source Account", required: false },
  { key: "target_account", label: "Target Account", required: false },
  { key: "category", label: "Category", required: false },
  { key: "exchange_rate", label: "Exchange Rate", required: false },
];

const NONE = "__none__";

function normalizeDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY (Latin American format)
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return s;
}

function normalizeAmount(raw) {
  if (raw == null) return NaN;
  // Replace comma-decimal separator (e.g. "-741313,39" → "-741313.39")
  // Only replace the last comma if it looks like a decimal separator
  const s = String(raw).trim();
  // If there's a comma but no dot, treat comma as decimal separator
  if (s.includes(",") && !s.includes(".")) {
    return parseFloat(s.replace(",", "."));
  }
  return parseFloat(s);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const row = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    row.push(current.trim());
    return row;
  });
}

function uniqueColValues(csvRows, colIndex) {
  if (colIndex === undefined || colIndex === null) return [];
  return [...new Set(csvRows.map((r) => r[colIndex]).filter(Boolean))];
}

function resolveRow(row, columnMap, accountMap, categoryMap, typeMap) {
  const get = (key) => {
    const idx = columnMap[key];
    return idx !== undefined && idx !== null ? row[idx] : undefined;
  };
  const rawType = get("type");
  const type = (typeMap[rawType] || rawType || "transfer").toLowerCase().trim();
  const amount = normalizeAmount(get("amount"));
  const date = normalizeDate(get("date"));

  if (!["income", "expense", "transfer", ""].includes(type)) return null;
  if (isNaN(amount)) return null;
  if (!date) return null;

  const sourceVal = get("source_account");
  const targetVal = get("target_account");
  const catVal = get("category");
  const exrVal = get("exchange_rate");

  const resolvedRow ={
    type,
    amount,
    date,
    description: get("description") || null,
    source_account_id: sourceVal ? accountMap[sourceVal] || null : null,
    target_account_id: targetVal ? accountMap[targetVal] || null : null,
    category_id: catVal ? categoryMap[catVal] || null : null,
    exchange_rate: exrVal ? parseFloat(exrVal) || null : null,
  };

  return resolvedRow;
}

export function ImportTransactionsDialog({ open, onClose, onSuccess, accounts = [], categories = [] }) {
  const [activeStep, setActiveStep] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [categoryMap, setCategoryMap] = useState({});
  const [accountMap, setAccountMap] = useState({});
  const [typeMap, setTypeMap] = useState({});
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [localCategories, setLocalCategories] = useState(categories);

  useEffect(() => { setLocalAccounts(accounts); }, [accounts]);
  useEffect(() => { setLocalCategories(categories); }, [categories]);
  const [creatingAccount, setCreatingAccount] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(null);
  const [newAccForm, setNewAccForm] = useState({ name: "", currency: "USD", type: "bank", initial_balance: 0 });
  const [newCatForm, setNewCatForm] = useState({ name: "", type: "expense" });
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [arsRate, setArsRate] = useState(null);

  useEffect(() => {
    if (open) {
      axios.get("/api/exchange-rates").then((res) => setArsRate(res.data.ARS ?? null));
    }
  }, [open]);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target.result);
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => c !== ""));
      if (parsed.length < 2 || dataRows.length === 0) {
        setError("CSV must have a header row and at least one data row.");
        return;
      }
      setCsvHeaders(parsed[0]);
      setCsvRows(dataRows);
      setColumnMap({});
      setCategoryMap({});
      setAccountMap({});
      setError("");
    };
    reader.readAsText(file);
  };

  const step2Valid =
    columnMap.type !== undefined &&
    columnMap.amount !== undefined &&
    columnMap.date !== undefined &&
    (columnMap.source_account !== undefined || columnMap.target_account !== undefined);

  const uniqueCategories = uniqueColValues(csvRows, columnMap.category);
  const uniqueSourceAccounts = uniqueColValues(csvRows, columnMap.source_account);
  const uniqueTargetAccounts = uniqueColValues(csvRows, columnMap.target_account);
  const uniqueAccounts = [...new Set([...uniqueSourceAccounts, ...uniqueTargetAccounts])];

  const uniqueTypeValues = uniqueColValues(csvRows, columnMap.type).filter(
    (v) => !["income", "expense", "transfer"].includes(v.toLowerCase().trim())
  );

  const accountIdToCurrency = Object.fromEntries(
    localAccounts.map((a) => [String(a.id), a.currency])
  );

  const validRows = csvRows
    .map((row) => resolveRow(row, columnMap, accountMap, categoryMap, typeMap))
    .filter(Boolean)
    .map((row) => {
      if (row.exchange_rate !== null || !arsRate) return row;
      const srcCurr = accountIdToCurrency[String(row.source_account_id)];
      const tgtCurr = accountIdToCurrency[String(row.target_account_id)];
      const needsRate = (srcCurr && srcCurr !== "USD") || (tgtCurr && tgtCurr !== "USD");
      return needsRate ? { ...row, exchange_rate: arsRate } : row;
    });
  const skippedCount = csvRows.length - validRows.length;

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      await axios.post("/api/transactions/import", { transactions: validRows });
      onSuccess?.();
      handleClose();
      window.dispatchEvent(new CustomEvent("accounts-updated"));
    } catch (err) {
      setError(err.response?.data?.error || "Import failed.");
      setImporting(false);
    }
  };

  const handleCreateAccount = async (csvVal) => {
    try {
      const res = await axios.post("/api/accounts", newAccForm);
      const created = { id: res.data.id, name: newAccForm.name, currency: newAccForm.currency, type: newAccForm.type };
      setLocalAccounts((prev) => [...prev, created]);
      setAccountMap((prev) => ({ ...prev, [csvVal]: res.data.id }));
      setCreatingAccount(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create account.");
    }
  };

  const handleCreateCategory = async (csvVal) => {
    try {
      const res = await axios.post("/api/categories", newCatForm);
      const created = { id: res.data.id, name: newCatForm.name, type: newCatForm.type };
      setLocalCategories((prev) => [...prev, created]);
      setCategoryMap((prev) => ({ ...prev, [csvVal]: res.data.id }));
      setCreatingCategory(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create category.");
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMap({});
    setCategoryMap({});
    setAccountMap({});
    setTypeMap({});
    setLocalAccounts(accounts);
    setLocalCategories(categories);
    setCreatingAccount(null);
    setCreatingCategory(null);
    setNewAccForm({ name: "", currency: "USD", type: "bank", initial_balance: 0 });
    setNewCatForm({ name: "", type: "expense" });
    setError("");
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  const handleNext = () => setActiveStep((s) => s + 1);
  const handleBack = () => setActiveStep((s) => s - 1);

  // ── Step 1: Upload ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a CSV file. First row must be column headers.
      </Typography>
      <Button variant="outlined" component="label">
        Choose CSV file
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleFileChange}
        />
      </Button>

      {csvHeaders.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Preview ({csvRows.length} rows detected)
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {csvHeaders.map((h, i) => (
                    <TableCell key={i}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvRows.slice(0, 5).map((row, ri) => (
                  <TableRow key={ri}>
                    {csvHeaders.map((_, ci) => (
                      <TableCell key={ci}>{row[ci] ?? ""}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );

  // ── Step 2: Column Mapping ──────────────────────────────────────────────────
  const renderStep2 = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Map each transaction field to a CSV column. Required fields are marked *.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {TX_FIELDS.map((field) => (
          <FormControl key={field.key} size="small" fullWidth>
            <InputLabel>
              {field.label}
              {field.required ? " *" : ""}
            </InputLabel>
            <Select
              label={`${field.label}${field.required ? " *" : ""}`}
              value={columnMap[field.key] !== undefined ? columnMap[field.key] : NONE}
              onChange={(e) => {
                const val = e.target.value;
                setColumnMap((prev) => ({
                  ...prev,
                  [field.key]: val === NONE ? undefined : val,
                }));
              }}
            >
              <MenuItem value={NONE}>— not mapped —</MenuItem>
              {csvHeaders.map((h, i) => (
                <MenuItem key={i} value={i}>
                  {h}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Box>

      {csvRows.length > 0 && Object.keys(columnMap).length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            First row preview with mapping
          </Typography>
          <Table size="small">
            <TableBody>
              {TX_FIELDS.filter((f) => columnMap[f.key] !== undefined).map((f) => (
                <TableRow key={f.key}>
                  <TableCell sx={{ fontWeight: 600, width: 160 }}>{f.label}</TableCell>
                  <TableCell>{csvRows[0][columnMap[f.key]] ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );

  // ── Step 3: Value Mapping ───────────────────────────────────────────────────
  const CREATE_ACCOUNT = "__create_account__";
  const CREATE_CATEGORY = "__create_category__";

  const renderStep3 = () => (
    <Box>
      {uniqueAccounts.length === 0 && uniqueCategories.length === 0 && uniqueTypeValues.length === 0 && (
        <Typography color="text.secondary">No account or category columns mapped — nothing to resolve.</Typography>
      )}

      {uniqueTypeValues.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Type Mapping
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Map each transaction type from the CSV to income, expense, or transfer.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {uniqueTypeValues.map((val) => (
              <Box key={val} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={{ width: 200, flexShrink: 0 }} variant="body2">
                  {val || "(empty)"}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Transaction type</InputLabel>
                  <Select
                    label="Transaction type"
                    value={typeMap[val] !== undefined ? typeMap[val] : ""}
                    onChange={(e) => setTypeMap((prev) => ({ ...prev, [val]: e.target.value }))}
                  >
                    <MenuItem value="">Skip (leave as-is)</MenuItem>
                    <MenuItem value="income">Income</MenuItem>
                    <MenuItem value="expense">Expense</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {uniqueTypeValues.length > 0 && (uniqueAccounts.length > 0 || uniqueCategories.length > 0) && <Divider sx={{ my: 2 }} />}

      {uniqueAccounts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Account Mapping
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Map each account name from the CSV to an existing account, or create a new one.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {uniqueAccounts.map((val) => (
              <Box key={val}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ width: 200, flexShrink: 0 }} variant="body2">
                    {val}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>App account</InputLabel>
                    <Select
                      label="App account"
                      value={creatingAccount === val ? CREATE_ACCOUNT : (accountMap[val] !== undefined ? accountMap[val] : "")}
                      onChange={(e) => {
                        if (e.target.value === CREATE_ACCOUNT) {
                          setCreatingAccount(val);
                          setNewAccForm({ name: val, currency: "USD", type: "bank", initial_balance: 0 });
                        } else {
                          setCreatingAccount(null);
                          setAccountMap((prev) => ({ ...prev, [val]: e.target.value }));
                        }
                      }}
                    >
                      <MenuItem value="">Skip (leave empty)</MenuItem>
                      {localAccounts.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
                      <Divider />
                      <MenuItem value={CREATE_ACCOUNT}>+ Create new account</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Collapse in={creatingAccount === val}>
                  <Box sx={{ ml: "216px", mt: 1, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                      <TextField
                        size="small"
                        label="Name"
                        value={newAccForm.name}
                        onChange={(e) => setNewAccForm((p) => ({ ...p, name: e.target.value }))}
                        sx={{ width: 160 }}
                      />
                      <FormControl size="small" sx={{ width: 110 }}>
                        <InputLabel>Currency</InputLabel>
                        <Select
                          label="Currency"
                          value={newAccForm.currency}
                          onChange={(e) => setNewAccForm((p) => ({ ...p, currency: e.target.value }))}
                        >
                          <MenuItem value="USD">USD</MenuItem>
                          <MenuItem value="ARS">ARS</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ width: 130 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          label="Type"
                          value={newAccForm.type}
                          onChange={(e) => setNewAccForm((p) => ({ ...p, type: e.target.value }))}
                        >
                          <MenuItem value="bank">Bank</MenuItem>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="investment">Investment</MenuItem>
                          <MenuItem value="credit">Credit</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        label="Initial balance"
                        type="number"
                        value={newAccForm.initial_balance}
                        onChange={(e) => setNewAccForm((p) => ({ ...p, initial_balance: e.target.value }))}
                        sx={{ width: 130 }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" onClick={() => { setCreatingAccount(null); setAccountMap((p) => ({ ...p, [val]: "" })); }}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!newAccForm.name || !newAccForm.currency || !newAccForm.type}
                        onClick={() => handleCreateAccount(val)}
                      >
                        Create account
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {uniqueAccounts.length > 0 && uniqueCategories.length > 0 && <Divider sx={{ my: 2 }} />}

      {uniqueCategories.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Category Mapping
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Map each category from the CSV to an existing category, or create a new one.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {uniqueCategories.map((val) => (
              <Box key={val}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography sx={{ width: 200, flexShrink: 0 }} variant="body2">
                    {val}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>App category</InputLabel>
                    <Select
                      label="App category"
                      value={creatingCategory === val ? CREATE_CATEGORY : (categoryMap[val] !== undefined ? categoryMap[val] : "")}
                      onChange={(e) => {
                        if (e.target.value === CREATE_CATEGORY) {
                          setCreatingCategory(val);
                          setNewCatForm({ name: val, type: "expense" });
                        } else {
                          setCreatingCategory(null);
                          setCategoryMap((prev) => ({ ...prev, [val]: e.target.value }));
                        }
                      }}
                    >
                      <MenuItem value="">Skip (leave empty)</MenuItem>
                      {localCategories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                      <Divider />
                      <MenuItem value={CREATE_CATEGORY}>+ Create new category</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Collapse in={creatingCategory === val}>
                  <Box sx={{ ml: "216px", mt: 1, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                      <TextField
                        size="small"
                        label="Name"
                        value={newCatForm.name}
                        onChange={(e) => setNewCatForm((p) => ({ ...p, name: e.target.value }))}
                        sx={{ width: 160 }}
                      />
                      <FormControl size="small" sx={{ width: 150 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          label="Type"
                          value={newCatForm.type}
                          onChange={(e) => setNewCatForm((p) => ({ ...p, type: e.target.value }))}
                        >
                          <MenuItem value="income">Income</MenuItem>
                          <MenuItem value="expense">Expense</MenuItem>
                          <MenuItem value="transfer">Transfer</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" onClick={() => { setCreatingCategory(null); setCategoryMap((p) => ({ ...p, [val]: "" })); }}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!newCatForm.name || !newCatForm.type}
                        onClick={() => handleCreateCategory(val)}
                      >
                        Create category
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );

  // ── Step 4: Preview & Confirm ───────────────────────────────────────────────
  const renderStep4 = () => (
    <Box>
      <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
        <Typography variant="body2">
          <strong>{validRows.length}</strong> rows to import
        </Typography>
        {skippedCount > 0 && (
          <Typography variant="body2" color="text.secondary">
            <strong>{skippedCount}</strong> rows skipped (invalid type / amount / date)
          </Typography>
        )}
      </Box>

      {validRows.length === 0 ? (
        <Alert severity="warning">No valid rows to import. Go back and check your column mapping.</Alert>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Source Acct</TableCell>
                <TableCell>Target Acct</TableCell>
                <TableCell>Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validRows.slice(0, 10).map((row, i) => {
                const srcName = localAccounts.find((a) => a.id === row.source_account_id)?.name ?? "—";
                const tgtName = localAccounts.find((a) => a.id === row.target_account_id)?.name ?? "—";
                const catName = localCategories.find((c) => c.id === row.category_id)?.name ?? "—";
                return (
                  <TableRow key={i}>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.description ?? "—"}</TableCell>
                    <TableCell>{srcName}</TableCell>
                    <TableCell>{tgtName}</TableCell>
                    <TableCell>{catName}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {validRows.length > 10 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              …and {validRows.length - 10} more rows
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Import Transactions from CSV</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
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

        {stepContent[activeStep]()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={importing}>
            Back
          </Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={
              (activeStep === 0 && csvRows.length === 0) ||
              (activeStep === 1 && !step2Valid)
            }
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {importing ? "Importing…" : `Import ${validRows.length} transactions`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
