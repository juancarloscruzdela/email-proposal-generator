# Sedgemore Proposal Generator — Web App Setup Guide

Publishing takes about 10 minutes and requires no coding. You'll end up with a private company URL, Google logins, and shared team drafts and templates.

## What you get

- A real web app at a permanent URL (e.g. `script.google.com/a/macros/sedgemoretravel.com/...`)
- Access restricted to @sedgemoretravel.com Google accounts only — nobody outside the company can open it
- Automatic login identification: the app shows "Signed in as name@sedgemoretravel.com" and stamps every saved draft with who saved it and when
- Shared team drafts and hotel templates, stored in a Google Sheet that doubles as an audit log (you can open the Sheet any time to see all activity)
- Per-user sender defaults (each person's name, email and logo auto-fill)

## Setup steps

1. Go to **script.google.com** while signed into your Sedgemore Google account, and click **New project**.
2. Name the project "Sedgemore Proposal Generator" (click "Untitled project" at the top).
3. In the editor you'll see a file called `Code.gs`. Delete its contents and paste in the full contents of the **Code.gs** file provided.
4. Click the **+** next to "Files" → **HTML** → name it exactly `Index` (Google adds the .html). Delete the placeholder contents and paste in the full contents of the **Index.html** file provided.
5. Click **Deploy** (top right) → **New deployment**.
6. Click the gear icon next to "Select type" → choose **Web app**.
7. Set:
   - **Execute as:** *User accessing the web app*
   - **Who has access:** *Anyone within Sedgemore Travel* (your Workspace domain)
8. Click **Deploy**, authorise when prompted, and copy the **Web app URL**.
9. Share that URL with the team. Done.

The first time anyone saves a draft, the app automatically creates a Google Sheet called "Sedgemore Proposal Generator — Data" in the deploying account's Drive — that's your shared storage and activity log.

## Updating the app later

Make changes in the script editor, then **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**. The URL stays the same for everyone.

## Notes

- "Execute as: user accessing" is what makes login identification work — each person's own Google identity is recorded.
- If you'd ever prefer the URL on your own domain (e.g. proposals.sedgemoretravel.com), the same URL can be linked from your site or bookmarked; a true custom domain would need a different hosting setup, which can be a later step if this becomes the official tool.
- Image sizes: the app renders images at fixed email-safe widths — Full (752px), Half (370px), One-third (243px) — and checks every pasted URL, telling you if the source image is too small (blurry risk), ideal, or unnecessarily heavy.
