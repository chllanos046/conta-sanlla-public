"use client";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import axios from "axios";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  currency: z.string().min(1, "Currency is required"),
  type: z.enum(["bank", "cash", "investment", "credit"], { message: "Select a valid type" }),
  balance: z.coerce.number({ invalid_type_error: "Balance must be a number" }),
  createTransaction: z.boolean().optional(),
  image_path: z.string().nullable().optional(),
});

const EMPTY_FORM = { name: "", currency: "USD", type: "bank", balance: 0, createTransaction: false, image_path: null };

export default function AccountsList() {
  const theme = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [availableImages, setAvailableImages] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const balance = watch("balance");
  const selectedImage = watch("image_path");

  const loadAccounts = async () => {
    const { data } = await axios.get("/api/accounts");
    setAccounts(data);
  };

  const loadImages = async () => {
    const { data } = await axios.get("/api/account-images");
    setAvailableImages(data);
  };

  useEffect(() => {
    loadAccounts();
    loadImages();
  }, []);

  const columns = [
    {
      field: "image_path",
      headerName: "Icon",
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          {params.value ? (
            <Box
              component="img"
              src={params.value}
              alt=""
              sx={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <AccountTypeIcon type={params.row.type} />
          )}
        </Box>
      ),
    },
    { field: "name", headerName: "Name", width: 180 },
    {
      field: "balance",
      headerName: "Balance",
      width: 140,
      valueFormatter: (value) => `$${parseFloat(value).toFixed(2)}`,
    },
    {
      field: "currency",
      headerName: "Currency",
      width: 100,
      renderCell: (params) => <Chip label={params.value} size="small" />,
    },
    { field: "type", headerName: "Type", width: 120 },
    {
      field: "actions",
      type: "actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  const handleEdit = (account) => {
    setEditAccount(account);
    reset({
      name: account.name,
      currency: account.currency,
      type: account.type,
      balance: parseFloat(account.balance) || 0,
      createTransaction: false,
      image_path: account.image_path || null,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this account?")) {
      await axios.delete(`/api/accounts/${id}`);
      loadAccounts();
    }
  };

  const onSubmit = async (data) => {
    try {
      if (editAccount) {
        await axios.put(`/api/accounts/${editAccount.id}`, data);
      } else {
        await axios.post("/api/accounts", data);
      }
      handleClose();
      loadAccounts();
      window.dispatchEvent(new CustomEvent("accounts-updated"));
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to save account");
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditAccount(null);
    reset(EMPTY_FORM);
    setSubmitError(null);
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Accounts
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">{accounts.length} Accounts</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { reset(EMPTY_FORM); setDialogOpen(true); }}
        >
          Add Account
        </Button>
      </Box>

      <Card sx={{ height: 600 }}>
        <DataGrid
          rows={accounts}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[5, 10, 25]}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
        />
      </Card>

      <Dialog open={dialogOpen} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>
          {editAccount ? "Edit Account" : "New Account"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Name"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Currency"
                  error={!!errors.currency}
                  helperText={errors.currency?.message}
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="BRL">BRL</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  select
                  label="Type"
                  error={!!errors.type}
                  helperText={errors.type?.message}
                >
                  <MenuItem value="bank">Bank</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="investment">Investment</MenuItem>
                  <MenuItem value="credit">Credit</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="balance"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Balance"
                  type="number"
                  error={!!errors.balance}
                  helperText={errors.balance?.message}
                  onChange={(e) => {
                    field.onChange(e);
                    if (parseFloat(e.target.value) === 0) {
                      setValue("createTransaction", false);
                    }
                  }}
                />
              )}
            />
            {Number(balance) !== 0 && (
              <Controller
                name="createTransaction"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Record as transaction"
                  />
                )}
              />
            )}

            {/* Image picker */}
            {availableImages.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Icon
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
                  {/* None option */}
                  <Tooltip title="No icon">
                    <Box
                      onClick={() => setValue("image_path", null)}
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1,
                        border: "2px dashed",
                        borderColor: !selectedImage ? "primary.main" : "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "text.disabled",
                        fontSize: 10,
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      None
                    </Box>
                  </Tooltip>

                  {availableImages.map((src) => {
                    const isSelected = selectedImage === src;
                    const label = src.split("/").pop().replace(/\.[^.]+$/, "");
                    return (
                      <Tooltip key={src} title={label}>
                        <Box
                          onClick={() => setValue("image_path", src)}
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 1,
                            border: "2px solid",
                            borderColor: isSelected ? "primary.main" : "divider",
                            overflow: "hidden",
                            cursor: "pointer",
                            boxShadow: isSelected ? `0 0 0 2px ${theme.palette.primary.main}` : "none",
                            "&:hover": { borderColor: "primary.main" },
                          }}
                        >
                          <Box
                            component="img"
                            src={src}
                            alt={label}
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                Save
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!submitError}
        autoHideDuration={4000}
        onClose={() => setSubmitError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      </Snackbar>
    </>
  );
}
