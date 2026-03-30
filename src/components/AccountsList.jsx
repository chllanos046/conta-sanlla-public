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
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CancelIcon from "@mui/icons-material/Cancel";
import AccountTypeIcon from "@/components/AccountTypeIcon";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import axios from "axios";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  currency: z.string().min(1, "Currency is required"),
  type: z.enum(["bank", "cash", "investment", "credit"], { message: "Select a valid type" }),
  balance: z.coerce.number({ invalid_type_error: "Balance must be a number" }),
  createTransaction: z.boolean().optional(),
});

const EMPTY_FORM = { name: "", currency: "USD", type: "bank", balance: 0, createTransaction: false };

export default function AccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
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

  const loadAccounts = async () => {
    const { data } = await axios.get("/api/accounts");
    setAccounts(data);
  };

  useEffect(() => {
    loadAccounts();
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
    });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this account?")) {
      await axios.delete(`/api/accounts/${id}`);
      loadAccounts();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data) => {
    try {
      let accountId;
      if (editAccount) {
        await axios.put(`/api/accounts/${editAccount.id}`, data);
        accountId = editAccount.id;
      } else {
        const { data: created } = await axios.post("/api/accounts", data);
        accountId = created.id;
      }

      if (removeImage) {
        await axios.delete(`/api/accounts/${accountId}/image`);
      } else if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await axios.post(`/api/accounts/${accountId}/image`, fd);
      }

      handleClose();
      loadAccounts();
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to save account");
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditAccount(null);
    reset(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const currentImage = imagePreview || (editAccount?.image_path && !removeImage ? editAccount.image_path : null);

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
                sx={{ mt: 2 }}
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
                sx={{ mt: 2 }}
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
                sx={{ mt: 2 }}
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
                sx={{ mt: 2 }}
              />
            )}
          />
          {Number(balance) !== 0 && (
            <Controller
              name="createTransaction"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  sx={{ mt: 1 }}
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

          {/* Image upload */}
          <Box sx={{ mt: 2 }}>
            {currentImage && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Box
                  component="img"
                  src={currentImage}
                  alt="Account icon"
                  sx={{ width: 48, height: 48, borderRadius: 1, objectFit: "cover", border: "1px solid rgba(0,0,0,0.12)" }}
                />
                <Button
                  size="small"
                  color="error"
                  startIcon={<CancelIcon fontSize="small" />}
                  onClick={handleRemoveImage}
                >
                  Remove
                </Button>
              </Box>
            )}
            <Button
              component="label"
              variant="outlined"
              size="small"
              startIcon={<PhotoCameraIcon />}
            >
              {currentImage ? "Change image" : "Upload image"}
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
          </Box>

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              Save
            </Button>
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
