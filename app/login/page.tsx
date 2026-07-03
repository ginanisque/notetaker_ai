import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Welcome back</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Login</h1>
        <p className="mt-3 leading-7 text-neutral-700">Access your meeting notes and workspaces.</p>
        <section className="mt-8 surface rounded-md p-1">
          <AuthForm mode="login" />
        </section>
      </div>
    </main>
  );
}
