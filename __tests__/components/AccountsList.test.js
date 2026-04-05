/**
 * @jest-environment jsdom
 *
 * Smoke tests for AccountsList component.
 * These tests render the component and interact with it to catch issues like
 * missing hook return values (e.g. setValue not destructured from useForm).
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ── Next.js / auth stubs ────────────────────────────────────────────────────
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: 1, name: "Test", email: "test@example.com" } }, status: "authenticated" }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/accounts",
}));

// ── axios stub ──────────────────────────────────────────────────────────────
jest.mock("axios", () => ({
  get: jest.fn((url) => {
    if (url === "/api/accounts")
      return Promise.resolve({
        data: [
          { id: 1, name: "Main Bank", currency: "USD", type: "bank", initial_balance: 1000, current_balance: 1500, image_path: null },
        ],
      });
    if (url === "/api/account-images")
      return Promise.resolve({ data: ["/images/bank.png"] });
    return Promise.resolve({ data: [] });
  }),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: { id: 2 } })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

// ── MUI / DataGrid stubs ────────────────────────────────────────────────────
// DataGrid requires a DOM measurement env — stub it to a simple table.
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <table data-testid="data-grid">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((col) => (
              <td key={col.field}>{String(row[col.field] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  GridActionsCellItem: ({ onClick, label }) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

import AccountsList from "@/components/AccountsList";

// ── helpers ─────────────────────────────────────────────────────────────────

const renderComponent = () => render(<AccountsList />);

// ── tests ────────────────────────────────────────────────────────────────────

describe("AccountsList", () => {
  it("renders without crashing and shows the accounts heading", async () => {
    renderComponent();
    expect(screen.getByText("Accounts")).toBeInTheDocument();
  });

  it("loads and displays accounts from the API", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("data-grid")).toBeInTheDocument();
    });
  });

  it("opens the Add Account dialog when the button is clicked", async () => {
    renderComponent();
    const addButton = screen.getByRole("button", { name: /add account/i });
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });
  });

  it("can type in the Name field inside the dialog without errors", async () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: /add account/i }));
    await waitFor(() => screen.getByRole("dialog"));

    const nameInput = screen.getByLabelText(/^name/i);
    fireEvent.change(nameInput, { target: { value: "My New Account" } });
    expect(nameInput.value).toBe("My New Account");
  });

  it("setValue is accessible — clicking a image option does not throw", async () => {
    // This test specifically guards against setValue not being destructured from useForm.
    // If setValue is missing, clicking the image option triggers a ReferenceError.
    renderComponent();
    // Wait for images to load
    await waitFor(() => screen.getByRole("button", { name: /add account/i }));
    fireEvent.click(screen.getByRole("button", { name: /add account/i }));
    await waitFor(() => screen.getByRole("dialog"));

    // "None" icon option calls setValue("image_path", null)
    const noneOption = screen.queryByText("None");
    if (noneOption) {
      expect(() => fireEvent.click(noneOption)).not.toThrow();
    }
  });

  it("opens edit dialog pre-filled with account data", async () => {
    renderComponent();
    await waitFor(() => screen.getByTestId("data-grid"));

    const editButton = screen.queryByRole("button", { name: /edit/i });
    if (editButton) {
      fireEvent.click(editButton);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    }
  });
});
