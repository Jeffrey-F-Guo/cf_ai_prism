import { tool } from "ai";
import { z } from "zod";

export interface GitHubFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  contents_url: string;
}

export interface PRData {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  state: string;
  files: GitHubFile[];
}

export interface PRAnalysisContext {
  prData: PRData;
  diff: string;
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch: string;
  }[];
}

// parses github URL into components for API call
export function parsePRUrl(
  url: string
): { owner: string; repo: string; prNumber: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  };
}

// github api wrapper helper
export async function fetchPR(
  owner: string,
  repo: string,
  prNum: number
): Promise<PRData> {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cf-ai-prism"
  };

  const [prResponse, filesResponse] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNum}`, {
      headers
    }),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNum}/files?per_page=100`,
      { headers }
    )
  ]);

  if (!prResponse.ok) {
    throw new Error(
      `GitHub API error: ${prResponse.status} ${prResponse.statusText}`
    );
  }

  if (!filesResponse.ok) {
    throw new Error(
      `GitHub API error: ${filesResponse.status} ${filesResponse.statusText}`
    );
  }

  const pr = (await prResponse.json()) as {
    title: string;
    state: string;
    diff_url: string;
  };
  const files: GitHubFile[] = await filesResponse.json();

  return {
    owner,
    repo,
    prNumber: prNum,
    title: pr.title,
    state: pr.state,
    files
  };
}

export const fetchFileContentTool = tool({
  description:
    "Fetch the raw text content of a specific file from a GitHub repository. Use this when you need to read the actual code inside a file.",
  inputSchema: z.object({
    contentsUrl: z
      .string()
      .describe(
        "The raw download URL or API contents URL of the file to fetch."
      )
  }),
  execute: async ({ contentsUrl }: { contentsUrl: string }) => {
    try {
      console.log("fetch tool called");
      const response = await fetch(contentsUrl, {
        headers: {
          Accept: "application/vnd.github.v3.raw",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "cf-ai-prism"
        }
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch file content: ${response.status} ${response.statusText}`
        );
      }

      return await response.text();
    } catch (error) {
      return `Error fetching file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});

// compile all info about the PR for agents to use
export async function getPRAnalysisContext(
  owner: string,
  repo: string,
  prNum: number
): Promise<PRAnalysisContext> {
  const prData = await fetchPR(owner, repo, prNum);

  let diff = "";
  for (const file of prData.files) {
    if (file.patch) {
      diff += `File: ${file.filename} (${file.status}, +${file.additions} -${file.deletions})\n`;
      diff += `${file.patch}\n\n`;
    }
  }

  return {
    prData,
    diff,
    files: prData.files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch ?? ""
    }))
  };
}
