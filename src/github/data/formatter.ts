import { sanitizeContent } from "../utils/sanitizer";

export type FormattedEntity = {
  title: string;
  author: string;
  body: string;
  labels: string[];
  isPR: boolean;
  headRef?: string;
  baseRef?: string;
  state: string;
};

export type FormattedComment = {
  author: string;
  createdAt: string;
  body: string;
  path?: string;
  line?: number | null;
};

export function formatEntityHeader(entity: FormattedEntity): string {
  const labels = entity.labels.length ? entity.labels.join(", ") : "none";
  if (entity.isPR) {
    return [
      `PR Title: ${sanitizeContent(entity.title)}`,
      `PR Author: ${entity.author}`,
      `PR Branch: ${entity.headRef ?? "?"} -> ${entity.baseRef ?? "?"}`,
      `PR State: ${entity.state}`,
      `PR Labels: ${labels}`,
    ].join("\n");
  }
  return [
    `Issue Title: ${sanitizeContent(entity.title)}`,
    `Issue Author: ${entity.author}`,
    `Issue State: ${entity.state}`,
    `Issue Labels: ${labels}`,
  ].join("\n");
}

export function formatComments(comments: FormattedComment[]): string {
  if (comments.length === 0) {
    return "(none)";
  }
  return comments
    .map((comment) => {
      const body = sanitizeContent(comment.body);
      const loc = comment.path !== undefined ? ` on ${comment.path}:${comment.line ?? "?"}` : "";
      return `[${comment.author} at ${comment.createdAt}${loc}]: ${body}`;
    })
    .join("\n\n");
}

export function formatChangedFiles(
  files: Array<{ filename: string; status: string; additions: number; deletions: number }>,
): string {
  if (files.length === 0) {
    return "(none)";
  }
  return files
    .map((file) => `- ${file.filename} (${file.status}) +${file.additions}/-${file.deletions}`)
    .join("\n");
}

export function formatPatches(
  files: Array<{ filename: string; patch?: string }>,
  maxChars = 200_000,
): string {
  const chunks: string[] = [];
  let used = 0;
  for (const file of files) {
    if (!file.patch) continue;
    const block = `### ${file.filename}\n\`\`\`diff\n${sanitizeContent(file.patch)}\n\`\`\``;
    if (used + block.length > maxChars) {
      chunks.push(`### ${file.filename}\n(truncated)`);
      break;
    }
    chunks.push(block);
    used += block.length;
  }
  return chunks.length ? chunks.join("\n\n") : "(no patches)";
}
