import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Get started</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Create account</h1>
        <p className="mt-3 leading-7 text-neutral-700">Start saving AI meeting notes online.</p>
        <section className="mt-8 surface rounded-md p-1">
          <AuthForm mode="signup" />
        </section>
      </div>
    </main>
  );
}
