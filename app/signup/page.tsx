import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">Create account</h1>
        <p className="mt-3 text-neutral-700">Start saving AI meeting notes online.</p>
        <section className="mt-8">
          <AuthForm mode="signup" />
        </section>
      </div>
    </main>
  );
}
