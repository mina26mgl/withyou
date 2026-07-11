import Link from "next/link";

export default function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100">
      <Link href="/" className="text-lg font-semibold text-primary-700">
        WithYou
      </Link>
    </header>
  );
}
