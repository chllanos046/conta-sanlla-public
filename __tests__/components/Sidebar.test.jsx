import React from "react";
import { render } from "@testing-library/react";
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

it("renders without crashing", () => {
  render(<Sidebar {...props} />);
});

it("renders Dashboard nav link", () => {
  const { getByText } = render(<Sidebar {...props} />);
  expect(getByText("Dashboard")).toBeInTheDocument();
});

it("renders Transactions nav link", () => {
  const { getByText } = render(<Sidebar {...props} />);
  expect(getByText("Transactions")).toBeInTheDocument();
});
