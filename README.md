# REFLECT AI
## Gemini Reflect & Journal — Cloud Run AI Application

A user-authenticated reflection and journaling web application powered by **Google Gemini 3.6 Flash** and **Cloud Firestore**, engineered with zero-hardcoded secrets, strict user-isolated storage rules, and automated Gemini model resilience.

---

## 🔒 Security & Threat Modeling Architecture

### 1. Threat Summary Table (5 Threat Zones)

| Threat Zone | Identified Vector | Mitigations & Countermeasures |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malformed JSON, prompt bombing (DoS), injection attacks in journal entries, untrusted geolocation input, SSRF in autocomplete / place search | Express body-parser size limit (1MB); character boundaries on all API string inputs (200 char limit on search); HTML-safe Markdown rendering. Geolocation is strictly opt-in per entry (never automatic/silent sniffing); server-side boundary validation on coordinates; autocomplete query string sanitization. |
| **2. Planning & Reasoning** | LLM jailbreaking / prompt injection attempting system instruction escape | Explicit persona boundary delimiters in Gemini system instructions; strict separation of reflection context from system prompts. |
| **3. Tool Execution** | Unauthorized execution / privilege escalation | Client requests are strictly proxied via typed backend routes; no arbitrary shell/tool execution endpoints exist. |
| **4. Memory & State** | Cross-user journal data leaks in Firestore; geographic coordinate tracking | Path-bound data hierarchy: `/users/{userId}/reflections/{reflectionId}` guarded by Firestore Security Rule: `request.auth.uid == userId`. **Data Minimization:** Only `placeName` (e.g. "Marina Beach, Chennai") and Google `placeId` are persisted—never raw GPS coordinates. Location data is stored directly within the owner-bound reflection document, inheriting the identical isolation enforcement as journal text. The UI and history view display exclusively the place name. |
| **5. Inter-System Comm** | API key leakage via browser DevTools inspection; Maps/Places API key abuse | Gemini API key is stored strictly on the server (`process.env.GEMINI_API_KEY`) and accessed via Secret Manager. Google Places / Maps API key retrieved via Secret Manager / environment variables (never hardcoded); HTTP referrer restrictions enforced in Google Cloud Console; autocomplete & geocoding proxied through backend with `client=aistudio-agent`. |

---

## 🛡️ Derived Data & Ethical AI Non-Profiling Architecture

The application derives sentiment and mood metrics (1-5 numerical scale, emotion labels, and reasoning) from user journal text during the Gemini summarization step:
- **Zero Automated Decision-Making**: Sentiment scores are purely descriptive and **never** used to gate features, restrict user access, or trigger automated penalties without explicit user input.
- **Strict Partitioning**: Sentiment data is stored directly within the owner's isolated Firestore subcollection (`/users/{userId}/reflections/{id}`).
- **User Agency & Override**: The user can view, adjust (1-5), or delete their analyzed scores in the Reflection Editor at any time.

---

## 🚀 Gemini Model Resilience Ladder

All AI reflection, summarization, and brainstorming requests utilize a 4-tier automatic failover ladder:
1. **Primary Model**: `gemini-3.6-flash`
2. **High-Availability Fallback**: `gemini-3.1-flash-lite`
3. **Dynamic Alias**: `gemini-flash-latest`
4. **Deep Reasoning Fallback**: `gemini-3.7-flash`

Errors (503, 429, 404, 500) trigger progressive ladder failover before surfacing any error to the user interface.

---

## 🛠️ GCP Prerequisites & Secret Manager Setup

### 1. Enable Required GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  aiplatform.googleapis.com \
  maps-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  places-backend.googleapis.com
```

### 2. Store API Keys in Secret Manager (Zero Hardcoding)
```bash
# Create Gemini API Key secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Create Google Maps Platform API Key secret
gcloud secrets create GOOGLE_MAPS_API_KEY --replication-policy="automatic"
echo -n "YOUR_GOOGLE_MAPS_API_KEY_HERE" | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-

# Grant Cloud Run service account access to both secrets
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Apply HTTP Referrer Restrictions in Google Cloud Console
To protect the Google Maps API key from unauthorized third-party usage:
1. Open **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Select your Google Maps Platform API key.
3. Under **Application restrictions**, select **Websites (HTTP referrers)**.
4. Add website restrictions matching your deployed Cloud Run URL:
   - `https://your-service-name-*.run.app/*`
   - `http://localhost:3000/*` (for local development)
5. Under **API restrictions**, restrict the key strictly to:
   - **Places API (New)** / **Places API**
   - **Maps JavaScript API**
   - **Geocoding API**
6. Click **Save**.

---

## 🔐 Firestore Security Rules

Deploy the included `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

Rules definition:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /reflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```

---

## 🚢 Cloud Run Deployment Flow

### 1. Deploy Container to Cloud Run
```bash
gcloud run deploy gemini-reflect-app \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

### 2. Mandatory Verification Label Command
```bash
gcloud run services update gemini-reflect-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Manual Verification & Test Suite

1. **Authentication Verification**:
   - Navigate to the landing page.
   - Click **"Sign In with Google"**.
   - Verify that Google OAuth popup finishes and routes to the personal dashboard with user profile avatar.
2. **User-Isolated Storage Verification**:
   - Write a journal entry titled "Morning Reflections" and enter reflections.
   - Verify the entry is persisted to `/users/{userId}/reflections/{id}` in Firestore.
   - Verify sign out and sign in with a different account renders zero data from the previous account.
3. **Gemini Multi-Turn Dialogue Verification**:
   - In the right-hand dialogue panel, type a reflection inquiry and send.
   - Verify Gemini responds using `gemini-3.6-flash`.
   - Verify multi-turn context is preserved in subsequent messages.
4. **AI Summarization, Tags & Sentiment Verification**:
   - Click **"AI Summarize & Tag"**; verify structured summary, tags, and sentiment score (1-5 with reasoning) are generated and persisted to Firestore.
5. **Mood Trend Charting & Non-Profiling Verification**:
   - Switch to the **"Mood Trends"** view from the navigation bar or sidebar.
   - Verify the longitudinal AreaChart renders the mood trajectory over time.
   - Verify that clicking any data point opens that specific reflection in the editor.
   - Confirm that the mood score is strictly descriptive and does not restrict features or make decisions without user input.
6. **Location-Aware Entries (Google Places Autocomplete) Verification**:
   - Click **"Attach Location"** in the reflection editor (explicitly opt-in; never automatic/silent).
   - Type in the location search bar (e.g. "Marina Beach, Chennai"); verify live place suggestions appear below the input as you type via Google Places Autocomplete API.
   - Select a suggestion from the dropdown; verify the selected place's NAME is displayed as the primary value and Place ID is recorded.
   - Confirm no raw GPS coordinates are shown anywhere in the UI or history view.
   - Click **"Attach Location"** and save the entry; verify in Firestore that the entry document contains `{ location: { placeName, placeId, address } }` under the user-isolated path `/users/{userId}/reflections/{id}`.
   - In the history sidebar, verify the entry card displays the place name cleanly alongside the map pin.
   - Click the map pin; verify the location preview expands smoothly within the card without cluttering the calm/warm UI, and links to Google Maps with the verified Place ID.
   - In the editor, verify that clicking the remove location button cleanly strips location data and persists the update to Firestore.
7. **Dark / Light Theme Toggle Verification**:
   - In the navigation header or landing page, click the **Theme Toggle** button (Sun / Moon icon).
   - Verify that the app transitions smoothly between the Light theme (warm parchment `#F5F5F0`, surface `#FDFCF9`, olive accent `#5A5A40`) and the Dark theme (deep neutral charcoal-green `#151712`, warm dark surface `#1E2019`, elevated `#282B21`, and lightened olive accent `#969871` passing WCAG AA contrast).
   - Verify that all components, including the journal editor, entry history sidebar, multi-turn AI conversation panel, Google Places location cards, modal dialogs, and the Recharts mood trend area chart restyle seamlessly without hardcoded white or black backgrounds.
   - Verify that the theme preference respects `prefers-color-scheme` by default, updates `localStorage`, and synchronizes with the user's profile in Firestore upon sign-in.

=======
# Ideathon-APAC
### #AccelerateAIwithCloudRun 
=======
<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h2>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>
>>>>>>> 915158df17b7408ed705d4144450c3a79fe0745c
