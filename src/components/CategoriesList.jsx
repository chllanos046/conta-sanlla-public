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
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { useNotify } from "@/components/NotificationProvider";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"], { message: "Select income or expense" }),
});

const EMPTY_FORM = { name: "", type: "income" };

export default function CategoriesList() {
  const confirm = useConfirm();
  const { notifySuccess, notifyError } = useNotify();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/categories");
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const columns = [
    { field: "name", headerName: "Name", width: 250 },
    {
      field: "type",
      headerName: "Type",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "income" ? "success" : "error"}
          size="small"
        />
      ),
    },
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

  const handleEdit = (category) => {
    setEditCategory(category);
    reset({ name: category.name, type: category.type });
    setSubmitError(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!(await confirm("Delete this category?"))) return;
    try {
      await axios.delete(`/api/categories/${id}`);
      loadCategories();
      notifySuccess("Category deleted");
    } catch (err) {
      notifyError(err.response?.data?.error || "Failed to delete category");
    }
  };

  const handleOpen = () => {
    setEditCategory(null);
    reset(EMPTY_FORM);
    setSubmitError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditCategory(null);
    reset(EMPTY_FORM);
    setSubmitError(null);
  };

  const onSubmit = async (data) => {
    try {
      if (editCategory) {
        await axios.put(`/api/categories/${editCategory.id}`, data);
      } else {
        await axios.post("/api/categories", data);
      }
      handleClose();
      loadCategories();
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to save category");
    }
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Categories
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">{categories.length} Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Add Category
        </Button>
      </Box>

      <Card sx={{ height: 600 }}>
        <DataGrid
          rows={categories}
          columns={columns}
          loading={loading}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[5, 10, 25]}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
        />
      </Card>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editCategory ? "Edit Category" : "New Category"}</DialogTitle>
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
                  <MenuItem value="income">Income</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </TextField>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
