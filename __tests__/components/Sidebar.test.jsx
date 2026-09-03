import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: 1, name: "Test User", email: "test@example.com" } },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));
vi.mock("axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

import Sidebar from "@/components/Sidebar";

const props = {
  open: true,
  mobileOpen: false,
  onMobileClose: () => {},
  isMobile: false,
  drawerWidth: 240,
  miniWidth: 64,
};

// Sidebar fetches accounts/rates on mount; flush those resolved mock promises
// inside act() so the resulting state updates aren't attributed to the test body.
async function renderSidebar() {
  const result = render(<Sidebar {...props} />);
  await act(async () => {});
  return result;
}

it("renders without crashing", async () => {
  await renderSidebar();
});

it("renders Dashboard nav link", async () => {
  const { getByText } = await renderSidebar();
  expect(getByText("Dashboard")).toBeInTheDocument();
});

it("renders Transactions nav link", async () => {
  const { getByText } = await renderSidebar();
  expect(getByText("Transactions")).toBeInTheDocument();
});
