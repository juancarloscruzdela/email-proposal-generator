# Proposal Generator (local Node app)

## Run locally

Install Node.js 18 or newer. Copy `.env.example` to `.env`, set a username and a long unique password, then run:

```bash
npm start
```

Open http://localhost:3000 in your browser. Use `npm run dev` during development to restart automatically after server changes.

No packages need to be installed. Drafts, templates, and sender defaults are stored locally in `.data/proposal-data.json`; this folder is excluded from Git on purpose.

Every page and API request is protected with HTTP Basic Authentication. The signed-in username is displayed by the app and recorded as the editor of saved drafts and templates.

## Hotel images

Each hotel image can use either a direct image URL or a file uploaded from your computer (JPG, PNG, WebP, or GIF, up to 2 MB). Uploaded files are saved in `.data/hotel-images` and are given an unlisted public image URL so Gmail recipients can load them; only use images you are comfortable sharing with proposal recipients.

## Troubleshooting saves

If the page loads but saving says “check your connection”, the browser cannot reach the Node `/api` endpoint. This commonly happens when only `Index.html` has been uploaded to ordinary shared web hosting. Uploading static files alone cannot save data: the Node app must be configured and running through the hosting provider's Node.js application manager, with its application URL set to the same path as the site (for example `/email-proposal-generator`).

## PDF export

Click **Download PDF**, then use the browser print dialog and select **Save as PDF**. This replaces the former Google-only PDF service.

## Deployment note

This requires hosting that supports a persistent Node.js process and writable disk. Configure `PROPOSAL_USERNAME` and `PROPOSAL_PASSWORD` in the hosting control panel's environment-variable settings; do not upload the `.env` file. Use HTTPS in production because Basic Authentication sends credentials with every request (encoded, not encrypted). Before deploying to Krystal, confirm whether your particular shared-hosting plan provides Node.js app hosting. If it does not, we can adapt the app for a PHP/SQLite deployment or choose a Node-compatible host.
