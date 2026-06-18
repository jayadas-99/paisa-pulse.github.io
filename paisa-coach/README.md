# Paisa Coach

Paisa Coach is a privacy-first, salary-cycle-aware personal finance coaching app for salaried Indians. Users upload bank statement CSVs, get India-native transaction categorisation, and receive conversational nudges that adapt to where they are in the month.

## Setup

1. Clone the project.
2. Fill `.env.local` with Firebase and Groq credentials from `.env.example`. Use `GROQ_API_KEY` for Groq; the app calls Groq through `/api/groq` so the key stays server-side. The default model is `llama-3.1-8b-instant`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## Firebase Auth Setup

If login shows `auth/configuration-not-found`, Firebase Authentication is not fully enabled for the project connected to `.env.local`.

1. Open Firebase Console for the same project used in `.env.local`.
2. Go to Build > Authentication > Get started.
3. Under Sign-in method, enable Email/Password.
4. Enable Google if you want the Google button to work.
5. Go to Authentication > Settings > Authorized domains and confirm `localhost` is listed. Add `127.0.0.1` too if you open the app at `http://127.0.0.1:5173`.
6. Go to Build > Realtime Database and create a database.
7. In Realtime Database > Rules, use the rules from `database.rules.json` so signed-in users can access only their own `users/{uid}` data:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid === $uid",
           ".write": "auth != null && auth.uid === $uid"
         }
       }
     }
   }
   ```
8. Restart Vite after changing `.env.local`:
   ```bash
   npm run dev
   ```

## Features

- Firebase email/password and Google authentication
- Firebase Realtime Database storage for profile, transactions, nudges, goals, badges, and chat history
- CSV-only upload with automatic column detection for unified and debit/credit formats
- HDFC Bank and Bank of Baroda PDF statement parsing with PDF.js, processed locally in the browser before transactions are passed to the app
- India-native merchant preclassification for Swiggy, Zomato, Blinkit, Zepto, PhonePe-style UPI descriptions, IRCTC, Ola, Myntra, Nykaa, BigBasket, and more
- Groq-powered fallback categorisation, nudge generation, weekly card generation, and chat with spending data
- Persistent salary-cycle banner with flush, steady, careful, and survival phases
- Survival Mode dashboard that focuses only on money remaining, days until salary, and essentials
- Dashboard charts with Recharts category and month comparisons
- Conversational Paisa Coach chat interface
- Goal tracking with salary-cycle-sensitive behaviour
- Shareable weekly spending card downloadable as PNG
- Vercel-ready SPA routing

## Privacy Positioning

Paisa Coach never asks for SMS access, bank API access, loans, credit cards, or investment product upsells. The user stays in control by uploading CSVs manually.

The PDF parser reads the selected statement locally in the browser with PDF.js. The parser itself does not upload the file or call any external AI/API service.

AI coaching requests are sent to Groq through the app's `/api/groq` endpoint. For local development, Vite serves that endpoint from `vite.config.js`; on Vercel, `api/groq.js` handles it as a serverless function.
