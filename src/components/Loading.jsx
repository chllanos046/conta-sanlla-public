"use client";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export default function Loading(props) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      width="100%"
      sx={{ p: 2 }}
    >
      <CircularProgress
        variant="indeterminate"
        size={40}
        thickness={4}
        {...props}
        value={100}
        color="primary"
      />
    </Box>
  );
};