export interface GithubExportRequest {
  accessToken: string;
  repoName: string;
  files: { path: string; content: string }[];
}

export interface GithubExportResult {
  repoUrl: string;
  pushedFiles: number;
}

/**
 * Pure helper that shapes the GitHub API calls needed to push a generated
 * project to a brand-new repo under the user's own GitHub account, using
 * their OAuth token. No Gemini call — this is a straight API push of code
 * that already exists, so it costs 0 credits (see CREDIT_COSTS.githubExport).
 *
 * Requires network access to api.github.com, which this offline sandbox
 * does not have — the request shape is unit tested in
 * tests/github-export.test.ts instead of exercised live here.
 */
export async function exportToGithub(req: GithubExportRequest): Promise<GithubExportResult> {
  const createRepoRes = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.accessToken}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ name: req.repoName, private: true, auto_init: true }),
  });

  if (!createRepoRes.ok) {
    throw new Error(`Failed to create GitHub repo: ${createRepoRes.status}`);
  }

  const repo = await createRepoRes.json();

  for (const file of req.files) {
    const putRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/contents/${encodeURIComponent(file.path)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `Add ${file.path}`,
          content: Buffer.from(file.content, "utf-8").toString("base64"),
        }),
      }
    );
    if (!putRes.ok) {
      throw new Error(`Failed to push ${file.path}: ${putRes.status}`);
    }
  }

  return { repoUrl: repo.html_url, pushedFiles: req.files.length };
}

/** Pure validation, testable offline: repo names must be GitHub-safe. */
export function sanitizeRepoName(appName: string): string {
  return appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "appo-export";
}
