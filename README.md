# Website Update Master Prompt
Copy and paste this at the start of any new AI session to update riteshpunyani.github.io

---

## Your task
I need help updating my personal website. I will provide you with the HTML files. Please make the changes I describe and return updated files.

---

## About me
- Name: Ritesh Punyani, CA (Chartered Accountant)
- Credentials: CA · CISA · CIA · CFE · CIPPE
- Experience: 18+ years in fraud investigations, ethics, compliance, and AI automation
- Current role: Ethics and Compliance lead at a major FMCG organization in India
- Do NOT mention: Reliance, RCPL, or any company name in public-facing content

---

## Website overview
- Live URL: https://riteshpunyani.github.io
- Type: Static GitHub Pages site — pure HTML/CSS/JS, no frameworks, no build step
- Total pages: ~28 HTML files
- All files are flat (no subdirectories) in the root Website folder

---

## Design system
- Navy (primary): #1a2744
- Gold (accent): #c9a84c
- White: #ffffff
- Light grey bg: #f5f7fa
- Body font: Arial / sans-serif
- Heading font: Georgia / serif

NEVER change the navy/gold color scheme.

---

## File list
index.html, nav.js, nav.css, about.html, ai-tools.html, analytics.html,
automation.html, awards.html, blog.html, books.html, case-studies.html,
certifications.html, compliance.html, contact.html, education.html, ethics.html,
events.html, fraud.html, free-website.html, investigations.html, news.html,
presentations.html, press.html, prompt-library.html, publications.html,
speaking.html, timeline.html, tools.html, youtube.html
+ Analytics-Test-Library.xlsx, Prompt-Library.docx

---

## Navigation system
Every page has: <div id="nav-placeholder"></div> + <script src="nav.js"></script>
nav.js injects the full responsive navbar with dropdowns into that div.
NEVER hardcode nav HTML inside individual pages — edit nav.js to change nav globally.

Nav dropdowns:
- Home → index.html
- About → about.html
- Work → analytics.html, fraud.html, investigations.html, compliance.html, ethics.html, case-studies.html, automation.html, ai-tools.html
- Content → blog.html, publications.html, presentations.html, speaking.html, press.html, events.html, youtube.html, news.html, books.html
- Profile → certifications.html, awards.html, education.html, timeline.html
- Tools → prompt-library.html, tools.html, free-website.html
- Contact → contact.html

---

## Standard page structure
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page Title] — Ritesh Punyani</title>
  <link rel="stylesheet" href="nav.css">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f5f7fa; color: #222; }
    .page-header { background: #1a2744; color: white; padding: 60px 20px 40px; text-align: center; }
    .page-header h1 { color: #c9a84c; font-family: Georgia, serif; }
  </style>
</head>
<body>
  <div id="nav-placeholder"></div>
  <script src="nav.js"></script>
  <div class="page-header"><h1>Page Title</h1></div>
  <main style="max-width:1100px; margin:40px auto; padding:0 20px;">
    <!-- content -->
  </main>
  <footer style="background:#1a2744; color:#c9a84c; text-align:center; padding:20px; margin-top:60px;">
    <p>&copy; 2026 Ritesh Punyani. All rights reserved.</p>
  </footer>
</body>
</html>

---

## Special pages
- index.html: has OG/Twitter meta tags; stats bar shows "18+ Years", "1,700+ Analytics Tests", "19 AI Prompts", "6 Global Certifications"
- news.html: fetches Google News RSS via rss2json API
- youtube.html: fetches video previews via YouTube oEmbed API
- analytics.html: links to Analytics-Test-Library.xlsx + Google Sheets embed
- prompt-library.html: links to Prompt-Library.docx + Google Docs embed

---

## Fixed rules
1. Never hardcode nav HTML — nav.js only
2. Never change #1a2744 or #c9a84c
3. Never mention Reliance, RCPL, or any employer name
4. Experience = 18+ (not 20+)
5. Copyright year = 2026
6. No frameworks — plain HTML/CSS/JS only
7. Never rename HTML files — links on the site depend on exact filenames

---

## How to work
1. I tell you what to change and paste the current HTML
2. You return the full updated file
3. I save it and push to GitHub

For global changes (nav, footer, copyright), I'll paste nav.js for you to edit.

---
Last updated: June 2026
