"use client";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CreditCardIcon from "@mui/icons-material/CreditCard";

const ICONS = {
  bank:       AccountBalanceIcon,
  cash:       AccountBalanceWalletIcon,
  investment: TrendingUpIcon,
  credit:     CreditCardIcon,
};

export default function AccountTypeIcon({ type, ...props }) {
  const Icon = ICONS[type] ?? AccountBalanceIcon;
  return <Icon {...props} />;
}
