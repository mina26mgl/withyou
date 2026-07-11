import BottomNav from "@/components/layout/BottomNav";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative max-w-[430px] mx-auto bg-withyou-bg">
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
