import RootClientLayout from "@/components/RootClientLayout";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RootClientLayout>{children}</RootClientLayout>
      </body>
    </html>
  );
}
