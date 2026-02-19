/**
 * Shared email layout matching the website (dark editorial theme).
 * Inline styles for email client compatibility.
 */
const BRAND = "Aya Eye";

const STYLES = {
  wrapper: "margin:0; padding:0; background-color:#0a0a0a; font-family: Georgia, 'Times New Roman', serif;",
  container: "max-width:560px; margin:0 auto; padding:32px 24px;",
  card: "background-color:#0f0f0f; border:1px solid #262626; border-radius:8px; padding:28px 24px;",
  title: "color:#fafafa; font-size:22px; font-weight:600; margin:0 0 8px 0; letter-spacing:-0.02em;",
  subtitle: "color:#a3a3a3; font-size:14px; margin:0 0 20px 0; line-height:1.5;",
  body: "color:#e5e5e5; font-size:15px; line-height:1.6; margin:0 0 16px 0;",
  list: "color:#e5e5e5; font-size:15px; line-height:1.7; margin:16px 0; padding-left:20px;",
  listItem: "margin-bottom:6px;",
  strong: "color:#fafafa; font-weight:600;",
  footer: "color:#737373; font-size:13px; margin-top:24px; padding-top:16px; border-top:1px solid #262626;",
  highlight: "color:#e5d4b3; font-weight:600;", // primary-ish
  link: "color:#e5d4b3; text-decoration:underline;",
};

export function wrapEmailContent(
  content: string,
  options?: { title?: string; subtitle?: string; dir?: "ltr" | "rtl" }
): string {
  const { title, subtitle, dir } = options ?? {};
  const htmlDir = dir ?? (content.includes("dir=\"rtl\"") ? "rtl" : "ltr");
  return `
<!DOCTYPE html>
<html dir="${htmlDir}" lang="${htmlDir === "rtl" ? "ar" : "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${STYLES.wrapper}">
  <div style="${STYLES.container}">
    <div style="${STYLES.card}">
      ${title ? `<h1 style="${STYLES.title}">${title}</h1>` : ""}
      ${subtitle ? `<p style="${STYLES.subtitle}">${subtitle}</p>` : ""}
      <div style="${STYLES.body}">
        ${content}
      </div>
      <p style="${STYLES.footer}">— ${BRAND}</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function emailParagraph(text: string): string {
  return `<p style="${STYLES.body}">${text}</p>`;
}

export function emailList(items: string[]): string {
  return `<ul style="${STYLES.list}">${items.map((i) => `<li style="${STYLES.listItem}">${i}</li>`).join("")}</ul>`;
}

export function emailStrong(text: string): string {
  return `<strong style="${STYLES.strong}">${text}</strong>`;
}

export const emailStyles = STYLES;
