import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <a
      href="/logout"
      className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-accent hover:text-accent"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Logout
    </a>
  );
}
