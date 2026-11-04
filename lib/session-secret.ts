// The key that signs session cookies. It only ever comes from the environment: this repository
// is public, so any key written in the code could be used to forge a sign-in.

/** What is wrong with the key, or null when it can be used. Never includes the key itself */
export function sessionSecretProblem() {
  const value = process.env.SESSION_SECRET;
  if (!value) return "SESSION_SECRET is missing";
  if (value.startsWith("CHANGE_ME")) return "SESSION_SECRET still has the placeholder value";
  if (value.length < 32) return `SESSION_SECRET has ${value.length} characters, at least 32 are needed`;
  return null;
}

export function sessionSecret() {
  const problem = sessionSecretProblem();
  if (problem) throw new Error(problem);
  return process.env.SESSION_SECRET as string;
}
