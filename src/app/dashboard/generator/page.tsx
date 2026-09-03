"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExpoSnackPreview } from "@/components/ExpoSnackPreview";
import { CodeEditor } from "@/components/CodeEditor";
import { GenerationStages } from "@/components/dashboard/GenerationStages";
import { LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import type { GeneratorAnswers } from "@/lib/gemini";
import type { FollowUpQuestion, AppCategory } from "@/lib/prompt-engineer";

const PLATFORM_OPTIONS = ["ios", "android", "web"] as const;
const NAV_OPTIONS = ["tabs", "stack", "drawer"] as const;

const CATEGORY_LABELS: Record<AppCategory, string> = {
  fitness: "Fitness & health",
  ecommerce: "Shopping & marketplace",
  social: "Social & community",
  productivity: "Productivity",
  booking: "Booking & scheduling",
  education: "Education & learning",
  finance: "Finance & budgeting",
  general: "General purpose",
};

const STEPS = ["Describe", "Plan", "Build", "Preview"];

function GeneratorWorkspace() {
  const params = useSearchParams();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [importMode, setImportMode] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [importedProject, setImportedProject] = useState<{ source: "github" | "zip"; ref: string; files: { path: string; content: string }[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<AppCategory | null>(null);
  const [smartQuestions, setSmartQuestions] = useState<FollowUpQuestion[]>([]);
  const [smartAnswers, setSmartAnswers] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<GeneratorAnswers>({
    platforms: ["ios", "android"],
    coreScreens: ["Home"],
    navigationPattern: "tabs",
    needsBackend: false,
    colorTheme: "violet",
    authentication: "none",
    database: "none",
    apiStyle: "none",
    fileStorage: false,
  });
  const [project, setProject] = useState<{ files: { path: string; content: string }[]; summary: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [verification, setVerification] = useState<{ score: number; status: "passed" | "warning" | "failed"; checks: { id: string; label: string; status: "passed" | "warning" | "failed"; detail: string }[]; errors: string[]; warnings: string[] } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  // Lets the user abort a generation that is taking too long. `fetch` is
  // given the signal, so the request is genuinely cancelled rather than
  // left running with its result discarded.
  const abortRef = useRef<AbortController | null>(null);

  // Seeds the builder from ?idea= (the dashboard prompt) or ?template=
  // (the marketplace). Nothing is generated automatically — the user
  // reviews and edits the brief first, because generating costs credits.
  useEffect(() => {
    if (prefilled) return;

    const idea = params.get("idea");
    const templateSlug = params.get("template");

    if (idea) {
      setDescription(idea);
      setPrefilled(true);
      return;
    }

    if (!templateSlug) return;
    setPrefilled(true);

    let cancelled = false;
    fetch(`/api/templates/${encodeURIComponent(templateSlug)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.generatorSeed) {
          if (!cancelled) toast({ title: "That template couldn't be loaded", tone: "warning" });
          return;
        }
        const seed = payload.generatorSeed as { name: string; description: string; answers: GeneratorAnswers };
        setName(seed.name);
        setDescription(seed.description);
        setAnswers((current) => ({ ...current, ...seed.answers }));
        toast({
          title: `Loaded ${seed.name}`,
          description: "Edit the brief, then generate when you're ready.",
          tone: "success",
        });
      })
      .catch(() => {
        if (!cancelled) toast({ title: "That template couldn't be loaded", tone: "warning" });
      });

    return () => {
      cancelled = true;
    };
  }, [params, prefilled, toast]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setStatus("analyzing");
    setErrorMessage("");
    try {
      const res = await fetch("/api/generate/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Couldn't analyze that description — try adding a bit more detail.");
        return;
      }
      setDetectedCategory(data.detectedCategory);
      setSmartQuestions(data.questions);
      setSmartAnswers({});
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Network error — please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    setImporting(true); setImportMessage("");
    try {
      const form = new FormData();
      if (importFile) form.append("file", importFile);
      if (githubUrl.trim()) form.append("githubUrl", githubUrl.trim());
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");
      setImportedProject(data);
      setImportMessage(`${data.fileCount} supported files imported successfully.`);
      if (!name) setName(data.ref.split("/").pop()?.replace(/-/g, " ") || "Imported App");
    } catch (e) { setImportMessage(e instanceof Error ? e.message : "Import failed."); } finally { setImporting(false); }
  }

  async function handleGenerate() {
    setStatus("generating");
    setErrorMessage("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ name, description, answers, smartAnswers, detectedCategory, importedProject: importedProject ? { source: importedProject.source, ref: importedProject.ref, files: importedProject.files } : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        // The API already writes these for a person to read, and states
        // plainly whether credits were charged.
        setErrorMessage(data.error ?? "Generation failed.");
        return;
      }
      setProject(data.project);
      setVerification(null);
      setStatus("idle");
      setActiveTab("preview");
      toast({
        title: `${name || "Your app"} is ready`,
        description: `${data.project.files.length} files generated.`,
        tone: "success",
      });
    } catch (error) {
      if (controller.signal.aborted) {
        setStatus("idle");
        setErrorMessage("");
        toast({ title: "Generation cancelled", tone: "info" });
        return;
      }
      setStatus("error");
      setErrorMessage("We couldn't reach Appo. Check your connection and try again — nothing was charged.");
    } finally {
      abortRef.current = null;
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
  }

  const hasAnalyzed = smartQuestions.length > 0;
  const currentStep = project ? 4 : hasAnalyzed ? 2 : 1;
  const selectedPlatforms = useMemo(() => answers.platforms.join(" + "), [answers.platforms]);
  const backendEnabled = answers.needsBackend;

  async function handleVerify() {
    if (!project) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: project.files }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMessage(data.error ?? "Verification failed."); return; }
      setVerification(data);
    } catch {
      setErrorMessage("Verification could not be completed. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fade-in space-y-6 pb-10">
      <header className="builder-header">
        <div>
          <div className="eyebrow">APPO BUILDER</div>
          <h1 className="mt-1 text-page font-semibold tracking-tight text-ink">Turn your idea into a real app.</h1>
          <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-secondary">
            Describe the product in plain language. Appo plans the experience first, then generates a working project you can preview and inspect.
          </p>
        </div>
        <div className="builder-status"><span className="status-dot" /> Autosave ready</div>
      </header>

      <GenerationStages active={status === "generating"} onCancel={cancelGeneration} />

      <div className="builder-stepper" aria-label="App generation progress">
        {STEPS.map((step, index) => {
          const number = index + 1;
          const active = number <= currentStep;
          return (
            <div className={`builder-step ${active ? "is-active" : ""}`} key={step}>
              <span>{number}</span><strong>{step}</strong>
              {number < STEPS.length && <i />}
            </div>
          );
        })}
      </div>

      <section className="builder-grid">
        <div className="space-y-5">
          <div className="glass-card builder-card p-6">
            <div className="section-kicker">01 · PRODUCT BRIEF</div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">What are you building?</h2>
                <p className="mt-1 text-sm text-ink-secondary">Start with the outcome. You don't need to know how to code.</p>
              </div>
              {detectedCategory && <span className="category-chip">{CATEGORY_LABELS[detectedCategory]}</span>}
            </div>

            <div className="mt-5 space-y-3">
              <label className="field-label">App name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FitFlow" className="builder-input" /></label>
              <label className="field-label">Describe your app<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Build a fitness app where users can create workouts, track progress, and get reminders..." rows={7} className="builder-input builder-textarea" /></label>
              <div className="prompt-hints">
                <span>Tip</span> Mention your users, main actions, pages and any important integrations.
              </div>
              <button onClick={handleAnalyze} disabled={analyzing || !name || description.trim().length < 5} className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-50">
                {analyzing ? "Analyzing your product…" : hasAnalyzed ? "Re-analyze product plan" : "Analyze & plan my app →"}
              </button>
            </div>
          </div>

          <div className="glass-card builder-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div><div className="section-kicker">OPTIONAL · IMPORT & EXTEND</div><h2 className="mt-2 text-lg font-semibold text-ink">Already have an app?</h2><p className="mt-1 text-sm text-ink-secondary">Import a public GitHub repository or ZIP, then ask Appo to extend it.</p></div>
              <button onClick={() => setImportMode(!importMode)} className="btn-outline">{importMode ? "Hide" : "Import existing app"}</button>
            </div>
            {importMode && <div className="mt-5 space-y-4">
              <label className="field-label">GitHub repository URL<input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/owner/repository" className="builder-input" /></label>
              <div className="text-center text-xs text-ink-muted">or</div>
              <label className="field-label">Project ZIP<input type="file" accept=".zip,application/zip" onChange={e => setImportFile(e.target.files?.[0] || null)} className="builder-input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/10 file:px-3 file:py-2 file:text-xs file:text-brand" /></label>
              <button onClick={handleImport} disabled={importing || (!importFile && !githubUrl.trim())} className="btn-accent w-full disabled:opacity-50">{importing ? "Importing source…" : "Import source →"}</button>
              {importMessage && <p className="text-xs text-brand">{importMessage}</p>}
              {importedProject && <div className="rounded-2xl border border-success/35 bg-success-subtle p-4 text-xs text-emerald-100"><strong>{importedProject.ref}</strong><span className="ml-2 text-success/70">{importedProject.files.length} files ready for AI extension</span></div>}
            </div>}
          </div>

          {hasAnalyzed && (
            <div className="glass-card builder-card fade-in p-6">
              <div className="section-kicker">02 · SMART REQUIREMENTS</div>
              <h2 className="mt-2 text-lg font-semibold text-ink">Let's make the first generation accurate.</h2>
              <p className="mt-1 text-sm text-ink-secondary">Appo only asks questions relevant to the type of product you described.</p>
              <div className="mt-5 space-y-5">
                {smartQuestions.map((q) => (
                  <div key={q.id} className="question-block">
                    <label className="field-label">{q.question}</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((option) => (
                        <button key={option} onClick={() => setSmartAnswers((prev) => ({ ...prev, [q.id]: option }))} className={`choice-chip ${smartAnswers[q.id] === option ? "is-selected" : ""}`}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasAnalyzed && (
            <div className="glass-card builder-card fade-in p-6">
              <div className="section-kicker">03 · BUILD SETTINGS</div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div><h2 className="text-lg font-semibold text-ink">Technical preferences</h2><p className="mt-1 text-sm text-ink-secondary">Use sensible defaults or tune the generated experience.</p></div>
                <span className="mini-stat">{selectedPlatforms}</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="field-label">Platforms<select multiple value={answers.platforms} onChange={(e) => setAnswers((a) => ({ ...a, platforms: Array.from(e.target.selectedOptions, (o) => o.value) as GeneratorAnswers["platforms"] }))} className="builder-input min-h-28">
                  {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select></label>
                <label className="field-label">Navigation<select value={answers.navigationPattern} onChange={(e) => setAnswers((a) => ({ ...a, navigationPattern: e.target.value as GeneratorAnswers["navigationPattern"] }))} className="builder-input">
                  {NAV_OPTIONS.map((n) => <option key={n} value={n}>{n[0].toUpperCase() + n.slice(1)}</option>)}
                </select></label>
              </div>
              <label className="toggle-row mt-4"><input type="checkbox" checked={answers.needsBackend} onChange={(e) => setAnswers((a) => ({ ...a, needsBackend: e.target.checked, authentication: e.target.checked ? (a.authentication === "none" ? "email" : a.authentication) : "none", database: e.target.checked ? (a.database === "none" ? "postgresql" : a.database) : "none", apiStyle: e.target.checked ? (a.apiStyle === "none" ? "rest" : a.apiStyle) : "none" }))} /><span><strong>Enable backend features</strong><small>Real authentication, database, API routes and server-side business logic.</small></span></label>
              {backendEnabled && (
                <div className="backend-config mt-5">
                  <div className="section-kicker">FULL-STACK CONFIGURATION</div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="field-label">Authentication<select value={answers.authentication} onChange={(e) => setAnswers((a) => ({ ...a, authentication: e.target.value as GeneratorAnswers["authentication"] }))} className="builder-input"><option value="email">Email & password</option><option value="email_google">Email + Google</option><option value="none">None</option></select></label>
                    <label className="field-label">Database<select value={answers.database} onChange={(e) => setAnswers((a) => ({ ...a, database: e.target.value as GeneratorAnswers["database"] }))} className="builder-input"><option value="postgresql">PostgreSQL</option><option value="none">None</option></select></label>
                    <label className="field-label">API layer<select value={answers.apiStyle} onChange={(e) => setAnswers((a) => ({ ...a, apiStyle: e.target.value as GeneratorAnswers["apiStyle"] }))} className="builder-input"><option value="rest">REST API</option><option value="none">No API</option></select></label>
                    <label className="toggle-row"><input type="checkbox" checked={answers.fileStorage} onChange={(e) => setAnswers((a) => ({ ...a, fileStorage: e.target.checked }))} /><span><strong>File storage</strong><small>Enable secure image/document uploads.</small></span></label>
                  </div>
                  <div className="architecture-preview mt-4"><span>Client</span><b>→</b><span>API</span><b>→</b><span>Database</span>{answers.fileStorage && <><b>+</b><span>Storage</span></>}</div>
                </div>
              )}
              <button onClick={handleGenerate} disabled={status === "generating"} className="btn-accent mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">
                {status === "generating" ? "Building your app…" : "Generate working app ✨"}
              </button>
              {status === "error" && <div className="builder-error">{errorMessage}</div>}
            </div>
          )}
        </div>

        <aside className="builder-side space-y-5">
          <div className="glass-card builder-card p-5">
            <div className="section-kicker">APP PLAN</div>
            <h3 className="mt-2 text-base font-semibold text-ink">What Appo is preparing</h3>
            <div className="plan-list mt-4">
              {[
                ["Experience", detectedCategory ? CATEGORY_LABELS[detectedCategory] : "Waiting for your brief"],
                ["Platforms", selectedPlatforms],
                ["Navigation", answers.navigationPattern],
                ["Backend", answers.needsBackend ? "Full-stack enabled" : "Not required yet"],
                ["Auth", answers.authentication === "none" ? "None" : answers.authentication === "email_google" ? "Email + Google" : "Email + password"],
                ["Database", answers.database === "postgresql" ? "PostgreSQL" : "None"],
                ["API", answers.apiStyle === "rest" ? "REST" : "None"],
                ["Storage", answers.fileStorage ? "Enabled" : "Disabled"],
                ["Status", project ? "Generated" : hasAnalyzed ? "Ready to build" : "Draft"],
              ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>

          <div className="glass-card builder-card p-5">
            <div className="section-kicker">GENERATION QUALITY</div>
            <div className="quality-meter mt-4"><span style={{ width: `${verification ? verification.score : project ? 88 : hasAnalyzed ? 72 : 24}%` }} /></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm text-ink-secondary">Readiness</span><strong className="text-sm text-ink">{verification ? `${verification.score}/100` : project ? "Generated" : hasAnalyzed ? "Good" : "Getting started"}</strong></div>
            <div className="mt-4 space-y-2 text-xs text-ink-secondary">
              <p>✓ Requirements captured</p><p>✓ Adaptive questions</p><p>✓ Project generation pipeline</p><p>✓ Full-stack architecture mapped</p><p>{verification ? (verification.status === "passed" ? "✓" : "⚠") : "○"} Automated verification {verification ? "completed" : "ready"}</p>
            </div>
          </div>
        </aside>
      </section>

      {project && (
        <section className="glass-card builder-workspace fade-in overflow-hidden">
          <div className="workspace-toolbar">
            <div><div className="section-kicker">04 · LIVE WORKSPACE</div><h2 className="mt-1 text-lg font-semibold text-ink">{name || "Your App"}</h2></div>
            <div className="workspace-actions">
              <button className={activeTab === "preview" ? "workspace-tab is-active" : "workspace-tab"} onClick={() => setActiveTab("preview")}>Preview</button>
              <button className={activeTab === "code" ? "workspace-tab is-active" : "workspace-tab"} onClick={() => setActiveTab("code")}>Code</button>
              <button onClick={handleVerify} disabled={verifying} className="btn-outline !px-4 !py-2 disabled:opacity-50">{verifying ? "Checking…" : "Verify"}</button><button className="btn-outline !px-4 !py-2">Share</button>
            </div>
          </div>
          <div className="workspace-body">
            {activeTab === "preview" ? <ExpoSnackPreview files={project.files} snackName={name || "appo-app"} /> : <CodeEditor files={project.files} onSave={() => {}} />}
          </div>
          <div className="workspace-footer"><span><span className="status-dot" /> Generation completed</span><span>{project.files.length} project files · {project.summary}</span></div>
          {verification && (
            <div className="border-t border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><div className="section-kicker">AUTOMATED VERIFICATION</div><h3 className="mt-1 text-base font-semibold text-ink">{verification.score}/100 · {verification.status === "passed" ? "Ready for review" : verification.status === "warning" ? "Review recommended" : "Fix issues before shipping"}</h3></div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${verification.status === "passed" ? "border-success/35 bg-success-subtle text-success" : verification.status === "warning" ? "border-warning/35 bg-warning-subtle text-warning" : "border-danger/35 bg-danger-subtle text-danger"}`}>{verification.status.toUpperCase()}</div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {verification.checks.map((check) => <div key={check.id} className="rounded-xl border border-line bg-canvas-subtle p-3"><div className="flex items-center justify-between gap-3"><strong className="text-xs text-ink">{check.label}</strong><span className="text-[10px] uppercase tracking-wider text-ink-muted">{check.status}</span></div><p className="mt-1 text-xs leading-5 text-ink-muted">{check.detail}</p></div>)}
              </div>
              {(verification.errors.length > 0 || verification.warnings.length > 0) && <div className="mt-4 space-y-2">{verification.errors.map((item) => <p key={item} className="text-xs text-danger">Error: {item}</p>)}{verification.warnings.map((item) => <p key={item} className="text-xs text-warning">Warning: {item}</p>)}</div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * useSearchParams needs a Suspense boundary; without one this page opts
 * the whole route out of static rendering and Next fails the build.
 */
export default function GeneratorPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening the builder…" />}>
      <GeneratorWorkspace />
    </Suspense>
  );
}
