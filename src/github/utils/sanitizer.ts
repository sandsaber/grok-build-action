const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function sanitizeContent(input: string): string {
  return input
    .replace(HTML_COMMENT, "")
    .replace(ZERO_WIDTH, "")
    .replace(MARKDOWN_IMAGE, "[image]($2)");
}
