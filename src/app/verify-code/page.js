"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import axios from "axios";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Link from "next/link";

const schema = z.object({
  invite_code: z.string().min(1, "Invite code is required"),
});

export default function VerifyCodePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { invite_code: "" },
  });

  if (!email || !name) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <Card sx={{ p: 4, minWidth: 400 }}>
          <CardContent>
            <Alert severity="error" sx={{ mb: 2 }}>Invalid link. Missing email or name.</Alert>
            <Typography align="center" variant="body2">
              <Link href="/register" style={{ color: "inherit", fontWeight: 600 }}>
                Go to register
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const onSubmit = async (data) => {
    try {
      await axios.post("/api/auth/complete-google", {
        email,
        name,
        code: data.invite_code,
      });
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError("invite_code", { message: "Invalid invite code" });
      } else {
        setError("root", { message: err.response?.data?.error || "Something went wrong" });
      }
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <Card sx={{ p: 4, minWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Enter Invite Code
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            A code is required to create a new account with Google.
          </Typography>

          {errors.root && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.root.message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="invite_code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Invite Code"
                  error={!!errors.invite_code}
                  helperText={errors.invite_code?.message}
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying…" : "Continue with Google"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
