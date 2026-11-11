# HEXTRA — Telegram bot & Mini App kit

Everything to set up the bot and the Mini App. Images are in this folder.

## Files

| File                                       | Use                                                      |
| ------------------------------------------ | -------------------------------------------------------- |
| `hextra-bot-avatar.png` (640×640)          | Bot profile picture — BotFather → `/setuserpic`          |
| `hextra-banner.png` (1280×720, 16:9)       | Description picture above the bot — `/setdescriptionpic` |
| `hextra-logo.svg`                          | Full logo tile (blue square + hexagon), vector           |
| `hextra-logo-mark.svg` / `-mark.png` (512) | Transparent hexagon mark for dark backgrounds            |

---

## 1. Bot

**Name (display):** `HEXTRA`

**Username** (must end in `bot`; pick the first free one):
`HextraApp_bot` · `HextraPass_bot` · `GetHextra_bot` · `HextraBot`

**About** — `/setabout`, max 120 chars:

```
Build your HEXTRA pass — six sides of your life in one hexagon, plus a crypto Visa card.
```

**Description** — `/setdescription`, max 512 chars (shown on the empty-chat start screen):

```
HEXTRA turns your digital life into one hexagon. Connect your games, crypto, music, socials, sports and lifestyle — get a level, a title and stamps that refresh every week. Share your pass, dare friends to compare, and unlock a crypto Visa card with cashback on what you already do. Tap Start to build yours.
```

**Commands** — `/setcommands` (paste as-is):

```
start - Open HEXTRA
pass - View your pass
card - Your crypto card
connect - Connect a service
invite - Invite friends & earn +5
help - How HEXTRA works
```

**Greeting / `/start` message** (what the bot replies to new users — set in your bot code, with an "Open HEXTRA" Mini App button):

```
Welcome to HEXTRA ⬡

Your pass is six sides of your life in one hexagon — gaming, crypto, music, social, sports, lifestyle. Connect what you already use, level up every week, and unlock a crypto Visa card with cashback.

Tap below to build yours 👇
```

---

## 2. Mini App

Create it in BotFather → `/newapp` (or Bot Settings → Configure Mini App).

- **Title:** `HEXTRA`
- **Short name (URL slug):** `app` → opens at `t.me/<YourBot>/app`
- **Description:**
  ```
  Build your pass — six sides of your life in one hexagon, plus a crypto Visa card with cashback.
  ```
- **Photo:** `hextra-bot-avatar.png`
- **Web App URL:** your deployed app, e.g. `https://<your-domain>/` (the live HEXTRA web app)
- **GIF/demo:** optional — a screen recording of the pass + hexagon

> The Mini App simply loads the HEXTRA web app inside Telegram. It already works there (Privy
> login runs in Telegram's in-app browser). If you later want **one-tap login via Telegram**
> (no Privy screen inside Telegram), that's a small code task — the backend already has a Telegram
> adapter; it would verify Telegram's `initData` and sign the user in. Say the word and I'll wire it,
> plus the Telegram theme/`BackButton`/`MainButton` niceties.

---

## 3. BotFather checklist

1. `/newbot` → set name `HEXTRA`, pick a free username.
2. `/setuserpic` → upload `hextra-bot-avatar.png`.
3. `/setabout` → paste the About text.
4. `/setdescription` → paste the Description text.
5. `/setdescriptionpic` → upload `hextra-banner.png`.
6. `/setcommands` → paste the commands block.
7. `/newapp` → Title `HEXTRA`, short name `app`, upload the photo, set the Web App URL.
8. (If you use a bot token in the app for notifications) put it in `TELEGRAM_BOT_TOKEN`, and run
   `/setdomain` for the login widget, per `INTEGRATIONS.md`.

---

## 4. Brand

- **Primary blue** `#1F4BFF` · **orange** `#FF6B2C` · **purple** `#6A3DFF` · **pink** `#FF4D8D`
- **Backgrounds (dark)** `#05081F` / `#16171B`
- **Fonts:** Unbounded (headings), Inter (body)
- **Mini App header color** (Telegram setting): `#16171B`; **background:** `#05081F`

## 5. Spare copy

Taglines:

- Build your pass.
- Six sides of your life, one hexagon.
- Your life, leveled up — with a card to match.

One-liner (listings / ads):

```
HEXTRA — connect your games, crypto, music & more into one weekly pass, and get a crypto Visa card with cashback on what you already do.
```
