import RootClientLayout from "@/components/RootClientLayout";

export const viewport = {
  themeColor: "#DB5D3B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RootClientLayout>{children}</RootClientLayout>
      </body>
    </html>
  );
}
