/**
 * Component tests for TransactionFormDialog.
 *
 * These tests verify that the sign conversion in onSubmit fires correctly:
 * - Expense: user enters a positive amount → form sends negative to the API
 * - Income: user enters a positive amount → form sends positive to the API
 * - Transfer: user enters a positive amount → form sends positive to the API
 * - Edit mode: form pre-fills with absolute value and applies sign on submit
 *
 * WHY THESE TESTS EXIST:
 * The API route handlers enforce sign convention (expense < 0, income > 0, transfer > 0).
 * The UI input has `min: 0`, so users can only type positive numbers.
 * The sign conversion happens in onSubmit before calling axios. The existing API tests
 * bypass the form entirely by sending pre-signed amounts directly to the route handler.
 * This means a broken sign conversion in the form would pass all API tests but break the UI.
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ── Stubs ────────────────────────────────────────────────────────────────────

vi.mock("axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { USD: 1, ARS: 1200 } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

// Stub DatePicker — avoids LocalizationProvider requirement and transition complexity.
// The date value is irrelevant for sign conversion tests.
vi.mock("@mui/x-date-pickers/DatePicker", () => ({
  DatePicker: () => <input aria-label="Date" defaultValue="2024-01-15" readOnly />,
}));

import axios from "axios";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOUNTS = [
  { id: 1, name: "Bank Account", currency: "USD" },
  { id: 2, name: "Cash Wallet", currency: "USD" },
];

const CATEGORIES = [
  { id: 1, name: "Food", type: "expense" },
  { id: 2, name: "Salary", type: "income" },
];

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  editingTx: null,
  accounts: ACCOUNTS,
  categories: CATEGORIES,
  defaultSourceAccountId: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Open a MUI Select combobox by index (among all rendered comboboxes) and
 * pick the option matching optionText.
 *
 * Type is now a ToggleButtonGroup (not a combobox), so combobox[0] is
 * Source Account, combobox[1] is Target Account, etc.
 */
async function selectMuiOption(comboboxIndex, optionText) {
  const user = userEvent.setup();
  const comboboxes = screen.getAllByRole("combobox");
  const select = comboboxes[comboboxIndex];
  await user.click(select);
  const option = await screen.findByRole("option", { name: new RegExp(optionText, "i") });
  await user.click(option);
}

/** Click a ToggleButton by its visible label text. */
function clickTypeToggle(label) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}$`, "i") }));
}

// MUI's Popper logs this via console.warn (BasePopper.js) during its exit transition
// in jsdom (no real layout, so the anchor briefly reads as detached) — benign noise,
// not a real assertion failure. Filtered here only; every other console.warn still surfaces.
const originalConsoleWarn = console.warn;
let consoleWarnSpy;
beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation((msg, ...args) => {
    if (typeof msg === "string" && msg.includes("The `anchorEl` prop provided to the component is invalid")) {
      return;
    }
    originalConsoleWarn(msg, ...args);
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  consoleWarnSpy.mockRestore();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TransactionFormDialog — sign conversion", () => {
  /**
   * Combobox layout for expense (default) — Type is a ToggleButtonGroup, not a combobox:
   *   [0] Source Account  → "" (none selected)
   *   [1] Category        → "" (none selected)
   */
  it("sends negative amount to API when creating an expense", async () => {
    render(<TransactionFormDialog {...baseProps} />);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Amount field is a number spinbutton; fill with a positive value
    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    fireEvent.change(amountInput, { target: { value: "50" } });

    // Source Account is required for expense — combobox[0] (type is now a ToggleButtonGroup, not a combobox)
    await selectMuiOption(0, "Bank Account");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    const payload = axios.post.mock.calls[0][1];
    expect(payload.type).toBe("expense");
    expect(payload.amount).toBe(-50); // sign conversion: positive → negative
  });

  /**
   * Combobox layout after switching to income (type via ToggleButtonGroup):
   *   [0] Target Account  → "" (none selected)
   *   [1] Category        → "" (none selected)
   */
  it("sends positive amount to API when creating an income", async () => {
    render(<TransactionFormDialog {...baseProps} />);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Switch type to Income via ToggleButton
    clickTypeToggle("Income");

    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    fireEvent.change(amountInput, { target: { value: "500" } });

    // Target Account is required for income — combobox[0] (type is no longer a combobox)
    await selectMuiOption(0, "Cash Wallet");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    const payload = axios.post.mock.calls[0][1];
    expect(payload.type).toBe("income");
    expect(payload.amount).toBe(500); // stays positive — no sign flip for income
  });

  /**
   * Combobox layout after switching to transfer (type via ToggleButtonGroup):
   *   [0] Source Account  → "" (none selected)
   *   [1] Target Account  → "" (none selected)
   */
  it("sends positive amount to API when creating a transfer", async () => {
    render(<TransactionFormDialog {...baseProps} />);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Switch type to Transfer via ToggleButton
    clickTypeToggle("Transfer");

    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    fireEvent.change(amountInput, { target: { value: "200" } });

    // Source Account — combobox[0] (type is no longer a combobox)
    await selectMuiOption(0, "Bank Account");

    // Target Account — combobox[1]
    await selectMuiOption(1, "Cash Wallet");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    const payload = axios.post.mock.calls[0][1];
    expect(payload.type).toBe("transfer");
    expect(payload.amount).toBe(200); // stays positive
    expect(payload.source_account_id).toBe("1");
    expect(payload.target_account_id).toBe("2");
  });

  it("calls PUT (not POST) and sends negative amount when editing an expense", async () => {
    const editingTx = {
      id: 5,
      type: "expense",
      amount: -100,
      date: "2024-01-15",
      source_account_id: 1,
      target_account_id: null,
      category_id: 1,
      description: "Groceries",
    };

    // Toggle open false→true to trigger the enter transition (fires handleOpen/reset)
    const { rerender } = render(
      <TransactionFormDialog {...baseProps} open={false} editingTx={editingTx} />,
    );
    act(() => {
      rerender(<TransactionFormDialog {...baseProps} open={true} editingTx={editingTx} />);
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Amount must show absolute value: 100 not -100
    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    expect(amountInput.value).toBe("100");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(1));

    expect(axios.post).not.toHaveBeenCalled();
    const payload = axios.put.mock.calls[0][1];
    expect(payload.type).toBe("expense");
    expect(payload.amount).toBe(-100); // sign conversion re-applied on save
  });

  it("calls PUT and sends positive amount when editing an income transaction", async () => {
    const editingTx = {
      id: 6,
      type: "income",
      amount: 300,
      date: "2024-01-20",
      source_account_id: null,
      target_account_id: 2,
      category_id: null,
      description: "Paycheck",
    };

    const { rerender } = render(
      <TransactionFormDialog {...baseProps} open={false} editingTx={editingTx} />,
    );
    act(() => {
      rerender(<TransactionFormDialog {...baseProps} open={true} editingTx={editingTx} />);
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const amountInput = screen.getByRole("spinbutton", { name: /amount/i });
    expect(amountInput.value).toBe("300");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(1));

    const payload = axios.put.mock.calls[0][1];
    expect(payload.type).toBe("income");
    expect(payload.amount).toBe(300); // positive stays positive
  });
});
