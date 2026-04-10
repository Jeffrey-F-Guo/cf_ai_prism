import { routeAgentRequest } from "agents";
import { ReviewOrchestrator } from "./agents/ReviewOrchestrator";
import { LogicAgent } from "./agents/LogicAgent";
import { PerformanceAgent } from "./agents/PerformanceAgent";
import { SecurityAgent } from "./agents/SecurityAgent";
import { PatternAgent } from "./agents/PatternAgent";
import { SummaryAgent } from "./agents/SummaryAgent";
import { ReviewWorkflow } from "./workflows/ReviewWorkflow";

export {
  ReviewOrchestrator,
  LogicAgent,
  PerformanceAgent,
  SecurityAgent,
  PatternAgent,
  SummaryAgent,
  ReviewWorkflow
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // GET /api/reviews?limit=N — recent reviews for history panel
    if (request.method === "GET" && url.pathname === "/api/reviews") {
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") ?? "20"),
        100
      );
      const rows = await env.DB.prepare(`
        SELECT r.id, r.pr_number, r.pr_title, r.score, r.created_at,
               rp.owner, rp.repo
        FROM reviews r
        JOIN repos rp ON r.repo_id = rp.id
        ORDER BY r.created_at DESC
        LIMIT ?
      `)
        .bind(limit)
        .all<{
          id: string;
          pr_number: number;
          pr_title: string;
          score: number;
          created_at: number;
          owner: string;
          repo: string;
        }>();
      return Response.json(rows.results);
    }

    // GET /api/reviews/:id — full review detail
    const reviewMatch = url.pathname.match(/^\/api\/reviews\/([^/]+)$/);
    if (request.method === "GET" && reviewMatch) {
      const row = await env.DB.prepare(`
        SELECT r.id, r.pr_number, r.pr_title, r.pr_url, r.score,
               r.critical, r.warnings, r.suggestions, r.files_changed, r.contributors, r.created_at,
               rp.owner, rp.repo
        FROM reviews r
        JOIN repos rp ON r.repo_id = rp.id
        WHERE r.id = ?
      `)
        .bind(reviewMatch[1])
        .first<{
          id: string;
          pr_number: number;
          pr_title: string;
          pr_url: string;
          score: number;
          critical: number;
          warnings: number;
          suggestions: number;
          files_changed: number;
          contributors: string;
          created_at: number;
          owner: string;
          repo: string;
        }>();
      if (!row) return new Response("Not found", { status: 404 });
      return Response.json({
        ...row,
        contributors: JSON.parse(row.contributors || "[]")
      });
    }

    // GET /api/dashboard — aggregated stats for the dashboard
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      const [
        stats,
        primaryRepo,
        findingsByAgent,
        reviewsByDay,
        severitySplit,
        topIssues
      ] = await Promise.all([
        env.DB.prepare(`
            SELECT COUNT(*) as total_reviews,
                   ROUND(AVG(score), 1) as avg_score,
                   SUM(critical) as total_critical,
                   SUM(warnings) as total_warnings,
                   SUM(suggestions) as total_suggestions
            FROM reviews
          `).first<{
          total_reviews: number;
          avg_score: number | null;
          total_critical: number | null;
          total_warnings: number | null;
          total_suggestions: number | null;
        }>(),

        env.DB.prepare(`
            SELECT rp.owner || '/' || rp.repo AS name, COUNT(*) AS cnt
            FROM reviews r JOIN repos rp ON r.repo_id = rp.id
            GROUP BY rp.id ORDER BY cnt DESC LIMIT 1
          `).first<{ name: string; cnt: number }>(),

        env.DB.prepare(`
            SELECT agent, COUNT(*) AS cnt FROM findings
            WHERE agent IS NOT NULL GROUP BY agent
          `).all<{ agent: string; cnt: number }>(),

        env.DB.prepare(`
            SELECT DATE(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS cnt
            FROM reviews
            WHERE created_at >= (strftime('%s','now') - 7 * 86400) * 1000
            GROUP BY day ORDER BY day
          `).all<{ day: string; cnt: number }>(),

        env.DB.prepare(`
            SELECT severity, COUNT(*) AS cnt FROM findings GROUP BY severity
          `).all<{ severity: string; cnt: number }>(),

        env.DB.prepare(`
            SELECT f.title, f.agent, f.severity, COUNT(*) AS cnt
            FROM findings f
            GROUP BY f.title ORDER BY cnt DESC LIMIT 5
          `).all<{
          title: string;
          agent: string | null;
          severity: string;
          cnt: number;
        }>()
      ]);

      return Response.json({
        stats: {
          totalReviews: stats?.total_reviews ?? 0,
          avgScore: stats?.avg_score ?? 0,
          totalCritical: stats?.total_critical ?? 0,
          totalWarnings: stats?.total_warnings ?? 0,
          totalSuggestions: stats?.total_suggestions ?? 0,
          primaryRepo: primaryRepo?.name ?? null,
          primaryRepoCount: primaryRepo?.cnt ?? 0
        },
        findingsByAgent: findingsByAgent.results.map((r) => ({
          agent: r.agent,
          count: r.cnt
        })),
        reviewsByDay: reviewsByDay.results.map((r) => ({
          day: r.day,
          count: r.cnt
        })),
        severitySplit: severitySplit.results.map((r) => ({
          severity: r.severity,
          count: r.cnt
        })),
        topIssues: topIssues.results.map((r) => ({
          title: r.title,
          agent: r.agent,
          severity: r.severity,
          count: r.cnt
        }))
      });
    }

    // DELETE /api/reviews/:id — delete a review and its findings
    if (request.method === "DELETE" && reviewMatch) {
      await env.DB.prepare(`DELETE FROM reviews WHERE id = ?`)
        .bind(reviewMatch[1])
        .run();
      return new Response(null, { status: 204 });
    }

    // GET /api/reviews/:id/findings — findings for a specific review
    const findingsMatch = url.pathname.match(
      /^\/api\/reviews\/([^/]+)\/findings$/
    );
    if (request.method === "GET" && findingsMatch) {
      const rows = await env.DB.prepare(
        `SELECT * FROM findings WHERE review_id = ? ORDER BY severity`
      )
        .bind(findingsMatch[1])
        .all();
      return Response.json(rows.results);
    }

    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
