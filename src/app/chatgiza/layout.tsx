export default function ChatGizaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="flex h-screen w-full overflow-hidden">{children}</div>;
}
