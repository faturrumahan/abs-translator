# PRD — Daily → Corporate Level 100 Translator

## 1. Product Overview

**Daily → Corporate Level 100** is a lightweight Next.js fullstack web application that transforms everyday Indonesian language, slang, blunt statements, complaints, frustration, or informal workplace messages into polished corporate communication.

The product has **two modes**:

1. **Text Mode** — uses DeepSeek for text-based corporate transformation.
2. **Voice Mode** — uses the Gemini Live API for realtime voice input and voice output.

The application is **not a literal translator**. It identifies the user's intent and context, then reframes the message into professional, diplomatic, politically safe workplace language.

### Core Philosophy

> **"Asal Bos Senang."**

The goal is not to translate every word. The goal is to make the message sound as safe, professional, diplomatic, and manager-friendly as possible while preserving its underlying intent.

### Example

**Input**

> "bisa diem dulu ga jing, lagi w kerjain"

**Output**

> "Saat ini saya sedang memprioritaskan penyelesaian pekerjaan yang sedang berjalan. Mohon diberikan waktu agar prosesnya dapat diselesaikan secara optimal. Saya akan menyampaikan progress dan update selanjutnya setelah pekerjaan tersebut mencapai tahap yang dapat diinformasikan."

The result intentionally does **not** translate "diem", "jing", or "lagi w kerjain" word-for-word.

---

# 2. Product Goals

## Primary Goals

1. Transform casual Indonesian into Corporate Level 100 Indonesian.
2. Preserve underlying intent rather than individual words.
3. Remove slang, profanity, insults, and unnecessary emotional language.
4. Reframe confrontation, complaints, and frustration into diplomatic communication.
5. Support both text and realtime voice workflows.
6. Allow users to bring their own LLM API keys.
7. Store API keys only in the user's browser.
8. Never persist LLM API keys on the application server.
9. Make generated communication immediately usable.
10. Maintain a playful colorful-brutalist UI.

## Secondary Goals

1. Create a memorable and humorous user experience.
2. Demonstrate practical LLM API integration using Next.js.
3. Keep the architecture simple enough for a single developer.
4. Avoid unnecessary infrastructure such as a database or authentication.

---

# 3. Product Modes

## Mode Selection

At app startup, display a mode-selection popup/modal:

```text
┌─────────────────────────────────────────────┐
│       HOW DO YOU WANT TO CORPORATIFY?       │
│                                             │
│        PICK YOUR CORPORATE WEAPON           │
│                                             │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │   TEXT MODE      │  │   VOICE MODE     │ │
│  │                  │  │                  │ │
│  │   TYPE →         │  │   SPEAK →        │ │
│  │   CORPORATE      │  │   CORPORATE      │ │
│  │                  │  │                  │ │
│  │   DEEPSEEK       │  │   GEMINI LIVE    │ │
│  └──────────────────┘  └──────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

The user selects one mode. The selected mode determines the translation engine.

### Text Mode

```text
Text Input
   ↓
POST /api/translate
   ↓
Next.js
   ↓
DeepSeek
   ↓
Corporate Text
```

### Voice Mode

```text
Microphone
   ↓
Gemini Live
   ↓
Corporate Voice Response
   ↓
Speaker
```

The product should allow users to switch modes later without restarting the application.

---

# 4. BYOK — Bring Your Own Key

## 4.1 Principle

Both AI providers use **BYOK**.

Users provide their own:

- DeepSeek API key for Text Mode
- Gemini API key for Voice Mode

The application does not provide shared provider credentials.

## 4.2 Browser Storage

Store only in browser `localStorage`:

```text
localStorage
├── deepseek_api_key
└── gemini_api_key
```

Example:

```ts
localStorage.setItem("deepseek_api_key", apiKey);
localStorage.setItem("gemini_api_key", apiKey);
```

## 4.3 No Environment Keys

The deployment must **not** require or contain:

```env
DEEPSEEK_API_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_DEEPSEEK_API_KEY=...
NEXT_PUBLIC_GEMINI_API_KEY=...
```

The server has no permanent provider credentials.

## 4.4 Key Lifecycle

```text
User selects mode
       ↓
Required key not found
       ↓
Show provider key setup
       ↓
User enters API key
       ↓
Save to localStorage
       ↓
Use for provider request
```

## 4.5 Removing Keys

Provide separate controls:

```text
REMOVE DEEPSEEK KEY
REMOVE GEMINI KEY
```

Implementation:

```ts
localStorage.removeItem("deepseek_api_key");
localStorage.removeItem("gemini_api_key");
```

## 4.6 Credential Notice

Display a clear notice:

> Your API keys are stored locally in this browser and are not stored by this application. Treat API keys as sensitive credentials and only use keys you are comfortable using from this browser.

Because browser localStorage is accessible to JavaScript running on the same origin, XSS prevention is critical.

---

# 5. Target Users

Primary users:

- Software developers
- Office workers
- Corporate employees
- Interns
- Team members communicating with managers
- People who frequently communicate through workplace chat
- Users who want to soften blunt statements

---

# 6. Product Principles

## 6.1 Intent Over Words

The model must identify what the user actually means.

Do not translate individual words literally.

**Bad**

> "Jangan ganggu saya."

**Better**

> "Saat ini saya sedang memprioritaskan penyelesaian pekerjaan yang sedang berjalan. Mohon diberikan waktu agar prosesnya dapat diselesaikan secara optimal."

## 6.2 Reframe, Don't Translate

```text
Daily Language
      ↓
Understand Intent
      ↓
Understand Context
      ↓
Remove Slang / Emotion / Confrontation
      ↓
Diplomatic Reframing
      ↓
Corporate Language
```

Not:

```text
Daily Language
      ↓
Word-by-word Translation
      ↓
Formal Indonesian
```

## 6.3 Preserve Meaning

The model may change:

- Tone
- Structure
- Word choice
- Formality
- Framing
- Sentence length

The model must not invent:

- Completed work
- Deadlines
- Approvals
- Meetings
- Metrics
- Decisions
- Commitments
- Stakeholder agreements
- Technical facts

## 6.4 Corporate Level 100

Output should feel:

- Professional
- Calm
- Diplomatic
- Constructive
- Politically safe
- Manager-friendly
- Stakeholder-friendly
- Non-confrontational

Avoid output that feels:

- Robotic
- Excessively bureaucratic
- Artificially formal
- Passive-aggressive
- Filled with meaningless buzzwords

---

# 7. Text Mode

## Purpose

Convert typed everyday language into Corporate Level 100 text.

## Engine

```text
DeepSeek
```

Recommended model:

```text
deepseek-v4-flash
```

## Flow

```text
User types message
       ↓
Read DeepSeek key from localStorage
       ↓
POST /api/translate
       ↓
Next.js server
       ↓
DeepSeek API
       ↓
Corporate result
       ↓
Display output
```

## Example

Input:

> "gw belum kelar, jangan ditanya terus"

Output:

> "Pekerjaan tersebut saat ini masih dalam proses penyelesaian. Mohon diberikan waktu agar proses dapat diselesaikan secara optimal. Update berikutnya akan saya sampaikan setelah terdapat perkembangan yang dapat diinformasikan."

---

# 8. Voice Mode

## Purpose

Voice Mode is a realtime conversational corporate translator.

The user speaks naturally into the microphone and Gemini Live interprets the speech and responds with a corporate-level voice response.

The voice experience should be **voice → voice**, with an optional transcript for visibility.

## Engine

Google Gemini Live API.

Recommended model should remain configurable because Live model identifiers may evolve. The implementation should target the current supported low-latency Gemini Live model at development time rather than hard-code the model name throughout the application.

## Voice Interaction

```text
User speaks
     ↓
Microphone captures audio
     ↓
Gemini Live session
     ↓
Model understands intent
     ↓
Corporate reframing
     ↓
Model generates audio response
     ↓
Browser plays audio
```

## Voice States

```text
IDLE
LISTENING
THINKING
SPEAKING
ERROR
```

Suggested UI labels:

```text
IDLE
"PRESS TO SPEAK"

LISTENING
"LISTENING..."

THINKING
"CORPORATIFYING..."

SPEAKING
"DELIVERING THE CORPORATE VERSION..."

ERROR
"CORPORATE VOICE ENGINE DOWN"
```

## Voice Example

User says:

> "Gimana sih, jangan ganggu gue lagi meeting."

Do not output a literal version.

Instead, corporate voice could say:

> "Saat ini saya sedang mengikuti meeting dan perlu menjaga fokus. Mohon diberikan waktu terlebih dahulu, nanti akan saya follow up setelah meeting selesai."

The response should sound natural when spoken, not like a written corporate memo.

---

# 9. Voice Authentication Architecture

Because Voice Mode is a browser realtime workflow, the preferred architecture is:

```text
Browser
  │
  │ User's Gemini API key
  ▼
POST /api/gemini/token
  │
  ▼
Next.js server
  │
  │ Short-lived auth material
  ▼
Browser
  │
  │ Realtime session
  ▼
Gemini Live API
```

The original Gemini API key must not be persisted by the application.

### Important

The exact Gemini Live authentication flow should follow the current Gemini Live API documentation at implementation time. For production browser clients, prefer short-lived/ephemeral authentication mechanisms when supported rather than exposing a long-lived provider credential to the Live connection.

---

# 10. API Architecture

## Text Endpoint

```http
POST /api/translate
```

Request:

```json
{
  "text": "bisa diem dulu ga jing, lagi w kerjain",
  "apiKey": "sk-xxxxxxxx"
}
```

Response:

```json
{
  "result": "Saat ini saya sedang memprioritaskan penyelesaian pekerjaan yang sedang berjalan. Mohon diberikan waktu agar prosesnya dapat diselesaikan secara optimal. Saya akan menyampaikan progress dan update selanjutnya setelah pekerjaan tersebut mencapai tahap yang dapat diinformasikan."
}
```

The API key must never be returned.

## Gemini Token Endpoint

```http
POST /api/gemini/token
```

Request:

```json
{
  "apiKey": "AIza..."
}
```

Response should contain only the short-lived authentication material needed by the client.

Example:

```json
{
  "token": "short-lived-token..."
}
```

The server must not persist the supplied Gemini API key.

---

# 11. Overall Architecture

```text
                         Browser
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
         TEXT MODE                     VOICE MODE
             │                             │
             ▼                             ▼
      /api/translate                /api/gemini/token
             │                             │
             ▼                             ▼
       Next.js Server               Next.js Server
             │                             │
             ▼                             ▼
         DeepSeek                    Gemini Live
             │                             │
             ▼                             ▼
      Corporate Text             Corporate Voice
```

No database is required.

The server is stateless.

---

# 12. Technical Stack

## Frontend

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- Web Audio APIs as needed for realtime voice
- WebSocket or the officially recommended Gemini client mechanism at implementation time

## Backend

- Next.js Route Handlers
- `POST /api/translate`
- `POST /api/gemini/token`

## AI Providers

### Text

```text
DeepSeek
```

Model should be configurable.

### Voice

```text
Google Gemini Live API
```

Live model should be configurable and updated independently from UI code.

## Storage

No database.

Browser only:

```text
localStorage
├── deepseek_api_key
└── gemini_api_key
```

---

# 13. Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── translate/
│   │   │   └── route.ts
│   │   └── gemini/
│   │       └── token/
│   │           └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── mode-selector.tsx
│   ├── api-key-dialog.tsx
│   ├── text-translator.tsx
│   ├── voice-translator.tsx
│   ├── input-card.tsx
│   ├── output-card.tsx
│   └── settings-panel.tsx
│
├── lib/
│   ├── deepseek.ts
│   ├── gemini-live.ts
│   ├── prompts.ts
│   └── storage.ts
│
└── types/
    └── translator.ts
```

For a small MVP, components may be consolidated. Do not over-engineer the architecture.

---

# 14. UI Design

## Direction: Colorful Brutalism

The interface should be the opposite of a traditional enterprise application.

It should feel:

- Loud
- Colorful
- Bold
- Playful
- High contrast
- Slightly absurd
- Memorable
- Internet-native

### Visual Characteristics

- Thick black borders
- Hard offset shadows
- Oversized typography
- Bright accent colors
- Flat surfaces
- Minimal gradients
- Large buttons
- Controlled rounded corners
- Strong hierarchy
- Intentional asymmetry

### Suggested Palette

```text
Cream
Black
Electric Yellow
Hot Pink
Bright Blue
Lime Green
Orange
```

Use color intentionally for hierarchy rather than coloring everything.

---

# 15. Startup Mode Selector

The initial popup should feel playful rather than technical.

```text
┌──────────────────────────────────────────────┐
│       HOW DO YOU WANT TO CORPORATIFY?        │
│                                              │
│          PICK YOUR WEAPON                    │
│                                              │
│  ┌───────────────────┐ ┌───────────────────┐ │
│  │                   │ │                   │ │
│  │   TEXT MODE       │ │   VOICE MODE      │ │
│  │                   │ │                   │ │
│  │   TYPE →          │ │   SPEAK →         │ │
│  │   CORPORATE       │ │   CORPORATE       │ │
│  │                   │ │                   │ │
│  │   DEEPSEEK        │ │   GEMINI LIVE     │ │
│  └───────────────────┘ └───────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

If a required provider key is missing, selecting the mode should lead directly to that provider's key setup.

---

# 16. Text Mode UI

```text
┌─────────────────────────────────────────────────────────┐
│ DAILY → CORPORATE                         TEXT MODE ●   │
│ LEVEL 100                                  [ SETTINGS ] │
│                                                         │
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│ DAILY LANGUAGE         │ CORPORATE LEVEL 100            │
│                        │                                │
│ "bisa diem dulu ga     │ "Saat ini saya sedang          │
│  jing, lagi w kerjain" │  memprioritaskan..."           │
│                        │                                │
├────────────────────────┴────────────────────────────────┤
│            [ MAKE IT CORPORATE → ]                      │
└─────────────────────────────────────────────────────────┘
```

---

# 17. Voice Mode UI

```text
┌─────────────────────────────────────────────────────────┐
│ DAILY → CORPORATE                       VOICE MODE ●    │
│ LEVEL 100                                  [ SETTINGS ] │
│                                                         │
│                     ┌─────────┐                         │
│                     │         │                         │
│                     │   🎙    │                         │
│                     │         │                         │
│                     └─────────┘                         │
│                                                         │
│                  LISTENING...                            │
│                                                         │
│        "Biar maksud tersampaikan,                       │
│         tanpa bikin suasana memanas."                   │
│                                                         │
│                 [ END SESSION ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Optional transcript area:

```text
YOU SAID
"bisa diem dulu ga jing, lagi w kerjain"

CORPORATE
"Saat ini saya sedang memprioritaskan..."
```

---

# 18. API Key Management UI

Settings should display provider status without revealing the complete credential.

```text
AI PROVIDERS

DEEPSEEK
● CONNECTED
[ CHANGE KEY ] [ REMOVE ]

GEMINI
● CONNECTED
[ CHANGE KEY ] [ REMOVE ]
```

Or:

```text
DEEPSEEK
○ NOT CONFIGURED
[ ADD KEY ]

GEMINI
○ NOT CONFIGURED
[ ADD KEY ]
```

The full API key should never be visible by default.

---

# 19. Text API Validation

Required:

```text
text
apiKey
```

Types:

```text
text: string
apiKey: string
```

Reject:

- Missing API key
- Empty API key
- Empty text
- Whitespace-only text

Recommended text limit:

```text
5000 characters
```

---

# 20. Voice Validation

Required:

```text
gemini apiKey
```

The application should request microphone permission only when Voice Mode actually starts.

Microphone denial should return to a clear error state without breaking the rest of the app.

---

# 21. Error Handling

## Missing DeepSeek Key

```json
{
  "error": "DeepSeek API key is required"
}
```

Suggested UI:

```text
NO DEEPSEEK KEY.
THE CORPORATE MACHINE NEEDS FUEL.
```

## Missing Gemini Key

```json
{
  "error": "Gemini API key is required"
}
```

Suggested UI:

```text
NO GEMINI KEY.
THE VOICE MACHINE IS STILL SILENT.
```

## Invalid API Key

Do not expose raw provider errors.

Suggested:

```text
API KEY-NYA KAYAKNYA NGGAK VALID.
CEK LAGI, BOS.
```

## Microphone Permission Denied

```text
MICROPHONE ACCESS IS REQUIRED FOR VOICE MODE.
```

## Provider Failure

```text
CORPORATE ENGINE LAGI NGAMBEK.
COBA LAGI.
```

Never expose:

- API keys
- Authorization headers
- Stack traces
- Raw provider credentials
- Sensitive request payloads

---

# 22. Security Requirements

## API Keys

Never store provider API keys in:

- `.env`
- `NEXT_PUBLIC_*`
- Database
- Cookies
- Server sessions
- Server filesystem
- Analytics
- Error tracking payloads
- Logs

Only store them in browser localStorage.

## Request Logging

Do not log request bodies or authorization headers.

Never do:

```ts
console.log(request.body);
```

## XSS

Because credentials are stored in localStorage, XSS prevention is critical.

The application should:

- Use React escaped rendering.
- Avoid unsafe `innerHTML`.
- Avoid rendering arbitrary HTML from model output.
- Minimize third-party scripts.
- Keep dependencies updated.
- Use a Content Security Policy where practical.

## HTTPS

Production must use HTTPS.

---

# 23. Voice Audio Requirements

The implementation must handle:

- Microphone permission
- Audio capture
- Realtime audio streaming
- Session initialization
- Audio playback
- Interruptions / barge-in where supported
- WebSocket/session lifecycle
- Cleanup of microphone tracks
- Network interruption and reconnect handling

The exact audio format and transport should follow the current Gemini Live API requirements at implementation time.

---

# 24. Voice Session Lifecycle

```text
VOICE MODE SELECTED
        ↓
Check Gemini API key
        ↓
Obtain required short-lived authentication
        ↓
Open Live session
        ↓
Configure corporate system instruction
        ↓
Request microphone permission
        ↓
Start audio streaming
        ↓
LISTENING
        ↓
Gemini processes speech
        ↓
Generate corporate response
        ↓
SPEAKING
        ↓
Audio playback
        ↓
Return to LISTENING
```

End:

```text
END SESSION
       ↓
Stop microphone
       ↓
Stop playback
       ↓
Close Live session
       ↓
Clear temporary auth/session state
```

---

# 25. Shared AI Prompt

Both providers should follow the same core transformation philosophy:

```text
You are a Daily Language to Corporate Level 100 Translator.

Your job is NOT to translate text literally.

Understand the user's intended meaning, context, emotion,
urgency, complaint, frustration, request, or interpersonal intent.

Then reframe it into highly professional corporate communication.

The philosophy is "asal bos senang".

Rules:
- Do not translate word-for-word.
- Preserve the underlying intent.
- Remove slang, profanity, insults, and unnecessary emotional language.
- Reframe confrontation into diplomacy.
- Reframe blame into objective observations.
- Reframe complaints into improvement opportunities.
- Reframe refusal into prioritization, dependency, scope,
  resource, or timeline considerations when appropriate.
- Reframe "don't disturb me" into professional focus language.
- Keep the result constructive and politically safe.
- Do not invent facts, deadlines, approvals, achievements,
  decisions, or commitments.
- Use natural Indonesian corporate communication.
- Avoid excessive corporate jargon.
- The result must be ready to use in a professional setting.
```

---

# 26. Voice Prompt Extension

Voice Mode additionally requires:

```text
Additional voice rules:
- Respond naturally for spoken Indonesian.
- Prefer concise spoken sentences.
- Do not sound like a written corporate memo.
- Maintain a calm, confident, diplomatic voice.
- Do not repeat the user's insult or slang.
- Do not explain the transformation process.
- Do not mention that you are an AI translator unless explicitly asked.
```

---

# 27. Performance Requirements

## Text

- Immediate loading state
- Disable duplicate submissions
- Avoid unnecessary API calls
- Keep request payload compact

## Voice

- Minimize latency
- Begin streaming as early as practical
- Handle interruption gracefully
- Cleanly close sessions
- Stop microphone tracks when session ends

The voice mode should prioritize conversational responsiveness over long reasoning.

---

# 28. Accessibility

The application must:

- Use semantic HTML
- Provide accessible labels
- Support keyboard navigation in Text Mode
- Provide visible focus states
- Maintain sufficient color contrast
- Not rely only on color
- Make microphone status visually and textually clear
- Clearly communicate recording/listening state
- Provide transcript support where practical

---

# 29. Responsive Design

Desktop:

```text
Text: Input | Output
Voice: Large central microphone workspace
```

Mobile:

```text
Text:
Input
  ↓
Translate
  ↓
Output

Voice:
Microphone
  ↓
Status
  ↓
Transcript / Response
```

No horizontal scrolling.

---

# 30. MVP Features

## Must Have

### Core

- Startup mode selector
- Text Mode
- Voice Mode
- Colorful brutalist UI
- Responsive layout
- Mode switching

### Text Mode

- Daily language textarea
- DeepSeek integration
- `/api/translate`
- Corporate text output
- Loading state
- Error state
- Copy result
- Character counter
- 5000-character limit

### Voice Mode

- Gemini Live integration
- Microphone permission
- Realtime voice input
- Realtime corporate voice output
- Session start/stop
- Listening state
- Thinking state
- Speaking state
- Error state
- Session cleanup
- Optional transcript

### BYOK

- DeepSeek API key input
- Gemini API key input
- localStorage persistence
- Show/hide API key
- Remove API key
- No server-side key persistence

---

# 31. Nice-to-Have Features

- Keyboard shortcut
- Example prompt buttons
- Local translation history
- Copy voice transcript
- Session timer
- Voice mute
- Model selector
- Corporate intensity slider
- Share result
- PWA support

---

# 32. Future Feature — Corporate Intensity

Optional slider:

```text
CORPORATE LEVEL

1   25   50   75   100
                 ▲
             CURRENT
```

Levels:

```text
1   Normal professional
25  Professional
50  Formal
75  Highly corporate
100 Corporate Level 100
```

At 100, maximize diplomacy and "asal bos senang" framing without fabricating facts.

---

# 33. Future Feature — Voice Personalities

Potential voice modes:

```text
POLITE MANAGER
EXECUTIVE
CLIENT-SAFE
HR-SAFE
DIPLOMATIC
CORPORATE LEVEL 100
```

These should modify system instructions rather than require separate models.

---

# 34. Success Criteria

The product is successful when:

1. The user is presented with a clear Text vs Voice choice.
2. Text Mode uses DeepSeek.
3. Voice Mode uses Gemini Live.
4. Each provider has its own BYOK key.
5. Keys persist only in browser localStorage.
6. No API key is required in deployment environment variables.
7. Text output is intent-based rather than literal.
8. Voice output is intent-based rather than literal.
9. Voice interaction is genuinely realtime.
10. The application does not unnecessarily expose provider credentials.
11. The user can easily switch modes.
12. The colorful brutalist UI feels distinctive.
13. Output remains professional even when input is rude, slang-heavy, or emotional.
14. The application works on desktop and mobile.

---

# 35. Definition of Done

The MVP is complete when:

- `npm run build` succeeds.
- TypeScript has no errors.
- Startup mode selector works.
- Text Mode works end-to-end.
- Voice Mode connects to the supported Gemini Live implementation.
- Microphone permission is handled.
- Voice session can start and stop cleanly.
- Audio output works.
- DeepSeek BYOK works.
- Gemini BYOK works.
- Both keys persist in localStorage.
- Keys can be removed.
- No provider API key exists in `.env`.
- No provider API key is persisted server-side.
- Request credentials are not logged.
- API errors are handled safely.
- Corporate prompt behavior is consistent between modes.
- Copy works for text output and transcript where available.
- Responsive UI works.
- Brutalist visual identity is consistent.

---

# 36. Product Personality

The **UI should be the opposite of the output**.

### UI

> Loud. Colorful. Brutalist. Chaotic.

### AI Output

> Calm. Professional. Diplomatic. Safe.

Example:

```text
USER:
"bisa diem dulu ga jing, lagi w kerjain"

APP:
"CORPORATIFYING..."

AI:
"Saat ini saya sedang memprioritaskan penyelesaian
pekerjaan yang sedang berjalan..."
```

The humor belongs mainly in the interface and product experience. The generated output should remain genuinely usable.

---

# 37. Final Product Architecture

```text
                    DAILY LANGUAGE
                          │
                          ▼
                ┌────────────────────┐
                │   MODE SELECTOR    │
                │                    │
                │  TEXT   │   VOICE │
                └────┬─────────┬────┘
                     │         │
                     ▼         ▼
                  DeepSeek   Gemini Live
                     │         │
                     ▼         ▼
              Corporate Text  Corporate Voice
                     │         │
                     └────┬────┘
                          ▼
                     BOSS SENANG
```

## Final Transformation Principle

```text
Everyday Language
       ↓
Intent
       ↓
Context
       ↓
Remove Drama
       ↓
Diplomatic Reframing
       ↓
Corporate Level 100
       ↓
Boss Happy
```

The architecture remains intentionally simple:

```text
Next.js App Router
        +
Next.js API Routes
        +
DeepSeek BYOK for Text
        +
Gemini Live BYOK for Voice
        +
localStorage credentials
        +
No database
        +
Colorful Brutalist UI
```

The application is a humorous **Daily → Corporate transformation engine**, with text and realtime voice as two separate experiences sharing the same corporate-reframing philosophy.
