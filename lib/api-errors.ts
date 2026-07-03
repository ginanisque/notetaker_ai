export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const cause = "cause" in error ? error.cause : undefined;
  const causeCode =
    typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : undefined;

  if (
    error.message.toLowerCase().includes("connection error") ||
    causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  ) {
    return "OpenAI connection error. Node cannot verify the TLS certificate chain on this machine.";
  }

  return error.message || fallback;
}
