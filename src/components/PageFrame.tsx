import { AppNav } from "@/components/AppNav";

export function PageFrame({
  children,
  tone = "light"
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <main
      className={
        tone === "dark"
          ? "min-h-screen overflow-x-hidden bg-[#0f1110] text-white"
          : "min-h-screen overflow-x-hidden bg-[#f6f2e9] text-[#151515]"
      }
    >
      <AppNav />
      {children}
    </main>
  );
}
