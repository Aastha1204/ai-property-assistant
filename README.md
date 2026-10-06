# AI Property Assistant

| URL | Who | What |
|---|---|---|
| `/` | You (sales) | Split-screen demo with a scripted "Play demo" |
| `/chat` | Client's customers | Real chat. Conversations are stored and scored |
| `/admin` | Client (owner) | Login → Leads, Listings editor, Setup status |
| `/api/whatsapp` | Meta | WhatsApp webhook (same assistant, over WhatsApp) |
| `/api/cron/followups` | Vercel Cron | Daily 24 h follow-up template sender |

Rebrand for a new client: edit `config/client.json` (name, logo text, colour, owner, knowledge base, visit slots, follow-up text) and replace `data/properties.json` (or edit listings later in `/admin`).

## Deploy (Vercel)

1. Push this folder to a GitHub repo → Vercel → **Add New Project** → import it (framework: Next.js, no build settings needed).
2. **Storage:** Project → Storage → add **Upstash Redis** (Marketplace). It injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`. Without this, leads vanish on Vercel.
3. **Environment variables** (see `.env.example`): at minimum `ADMIN_PASSWORD`; add `LLM_API_KEY` (+ `LLM_PROVIDER`) for the real AI.
4. Deploy. Open `/admin`, log in, check **Setup**.
5. Give the client `/chat` (share link or embed in their site with an `<iframe>`) and `/admin`.

## Connect WhatsApp (when the client is ready)

1. Meta Business account → verify the business → **WhatsApp Business Platform** → add a phone number that is not already on WhatsApp.
2. Create a Meta app; create a permanent System-User token. Set `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_APP_SECRET`, and a random `WA_VERIFY_TOKEN`.
3. Meta app → WhatsApp → Configuration → Webhook: callback `https://<your-domain>/api/whatsapp`, verify token = `WA_VERIFY_TOKEN`, subscribe to **messages**.
4. Owner alert: set `OWNER_WA_NUMBER` (e.g. `919820011223`). Plain text only reaches the owner inside WhatsApp's 24 h window, so for reliable alerts create an approved template with one variable and set `WA_OWNER_TEMPLATE`.
5. 24 h follow-up: create an approved template with two variables (`{{1}}` name, `{{2}}` interest), set `WA_FOLLOWUP_TEMPLATE` and `CRON_SECRET`. Vercel Hobby runs crons once a day (`vercel.json`); Pro can run hourly.

## Notes

- Lead score is computed by fixed rules on the server, not by the AI. HOT = 70+.
- If the AI key is missing or the call fails, the built-in rule-based assistant answers, so chats never hang.
- Anything outside `config/client.json`'s knowledge base is flagged "needs your follow-up" instead of guessed.
