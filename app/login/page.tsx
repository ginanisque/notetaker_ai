import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">Login</h1>
        <p className="mt-3 text-neutral-700">Access your meeting notes and workspaces.</p>
        <section className="mt-8">
          <AuthForm mode="login" />
        </section>
      </div>
    </main>
  );
}
