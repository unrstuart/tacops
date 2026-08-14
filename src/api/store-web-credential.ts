// Chrome/Edge's native "save password?" prompt relies on detecting a successful form submission
// via navigation or a full page reload, neither of which happens in this single-page app - so it
// never fires on its own. The Credential Management API lets us trigger it explicitly instead.
// Safari and Firefox don't implement PasswordCredential, so this is a no-op there (autofill via
// the autoComplete attributes on the inputs still works everywhere it's supported).
export async function storeWebCredential(userId: string, clientSecret: string): Promise<void> {
  if (!("PasswordCredential" in window)) return;
  try {
    const PasswordCredentialCtor = (window as any).PasswordCredential;
    const credential = new PasswordCredentialCtor({ id: userId, password: clientSecret });
    await navigator.credentials.store(credential);
  } catch {
    // Best-effort - the user can dismiss/block the prompt, and that should never affect the
    // actual data fetch that already happened.
  }
}
