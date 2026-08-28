export interface ProjectFile { path: string; content: string }
export interface VerificationResult {
  score: number
  status: "passed" | "warning" | "failed"
  checks: { id: string; label: string; status: "passed" | "warning" | "failed"; detail: string }[]
  errors: string[]
  warnings: string[]
}

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:sk|pk)_(?:live|test)_[0-9A-Za-z]{16,}/,
]

export function verifyProject(files: ProjectFile[]): VerificationResult {
  const checks: VerificationResult["checks"] = []
  const errors: string[] = []
  const warnings: string[] = []
  const paths = files.map((f) => f.path)
  const text = files.map((f) => `${f.path}\n${f.content}`).join("\n")

  const hasSource = files.some((f) => /\.(tsx?|jsx?|json)$/.test(f.path))
  checks.push({ id: "source", label: "Project source", status: hasSource ? "passed" : "failed", detail: hasSource ? `${files.length} files detected.` : "No supported source files were generated." })
  if (!hasSource) errors.push("No supported source files were generated.")

  const hasAppEntry = paths.some((p) => /(^|\/)(App\.(tsx?|jsx?)|app\/.*\.(tsx?|jsx?))$/.test(p))
  checks.push({ id: "entry", label: "Application entry", status: hasAppEntry ? "passed" : "warning", detail: hasAppEntry ? "An application entry file was detected." : "No conventional App/app entry was detected; verify the project structure." })
  if (!hasAppEntry) warnings.push("No conventional application entry was detected.")

  const hasEnvExample = paths.some((p) => /(^|\/)(\.env\.example|README\.md)$/i.test(p))
  checks.push({ id: "config", label: "Configuration guidance", status: hasEnvExample ? "passed" : "warning", detail: hasEnvExample ? "Environment/configuration guidance is present." : "Add an .env.example or README with required configuration." })
  if (!hasEnvExample) warnings.push("Missing configuration guidance.")

  const secretHit = files.some((f) => SECRET_PATTERNS.some((pattern) => pattern.test(f.content)))
  checks.push({ id: "secrets", label: "Secret scan", status: secretHit ? "failed" : "passed", detail: secretHit ? "A possible secret or private key was detected in generated source." : "No common hard-coded secret patterns detected." })
  if (secretHit) errors.push("Possible hard-coded secret detected. Move credentials to server-side environment variables.")

  const dangerous = /(eval\s*\(|new Function\s*\(|child_process|exec\s*\(|spawn\s*\()/i.test(text)
  checks.push({ id: "unsafe", label: "Unsafe execution scan", status: dangerous ? "warning" : "passed", detail: dangerous ? "Potential dynamic or process execution was found; review before production use." : "No common unsafe execution patterns detected." })
  if (dangerous) warnings.push("Potential unsafe execution pattern detected.")

  const hasAuth = /authentication|signIn|signUp|supabase|firebase|auth/i.test(text)
  const hasValidation = /zod|yup|joi|schema|validation|validate/i.test(text)
  checks.push({ id: "validation", label: "Input validation", status: hasValidation ? "passed" : hasAuth ? "warning" : "passed", detail: hasValidation ? "Validation-related code was detected." : hasAuth ? "Authentication is present but explicit validation could not be confirmed." : "No backend validation requirement detected by this static check." })
  if (hasAuth && !hasValidation) warnings.push("Authentication-related code was found without an obvious validation layer.")

  const score = Math.max(0, Math.round(100 - errors.length * 30 - warnings.length * 8))
  return { score, status: errors.length ? "failed" : warnings.length ? "warning" : "passed", checks, errors, warnings }
}
