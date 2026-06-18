# Paysa Pulse — Product Case Study

*A salary-cycle-aware personal finance coach for salaried Indians*

---

## The Problem

Most personal finance apps in India are built for investors, not for the salaried majority.
They want you to track SIPs, manage a portfolio, and optimize returns. But a 26-year-old
software engineer in Hyderabad with ₹60,000 in hand doesn't have a portfolio problem.
She has a month-end problem.

By the 25th of every month, her Swiggy and Zepto charges have quietly eroded ₹4,000 from
a budget she never explicitly set. She doesn't know this because her bank app shows her
*transactions*, not *patterns*. And every finance app she's tried has either asked for her
bank login, her SMS permissions, or tried to sell her a credit card.

**The insight:** salaried Indians don't need a general-purpose finance app. They need a
coach that understands the salary cycle — and focuses only on the 3-4 spending habits that
actually drain discretionary income before salary day.

---

## Who This Is For

**Primary user:** Salaried professional, 24–34 years old, metro India, ₹40,000–₹1,20,000/month take-home. Likely uses UPI for most daily spending. Uploads bank statements occasionally. Actively distrusts apps that ask for bank credentials or SMS access.

**What they want:** To understand where their "extra" money went — specifically food delivery, quick commerce, and subscriptions — without a 30-minute setup or a security compromise.

**What they don't want:** Investment advice. Loan offers. Another app with their banking password.

---

## The Approach

### Deliberate scope

I deliberately limited the app to tracking three categories: **Food Delivery, Quick Commerce, and Subscriptions**. Not because other spending doesn't matter — rent, EMIs, and transfers matter a lot — but because:

1. These three categories are where most salaried Indians have genuine discretionary control.
2. They're the categories most likely to creep up unnoticed (Zomato at 1am, auto-renewing OTT subscriptions).
3. Focusing on three categories made the AI coaching specific and actionable rather than generic.

Every feature in the app serves this scope. The chat interface, for example, refuses questions about salary, rent, or investments — not because those don't matter, but because being opinionated about scope is how a focused product stays useful.

### Privacy as a product principle

Paysa Pulse never asks for bank login credentials, SMS access, or any form of account linking. Users upload CSVs or PDFs manually. This isn't just a technical choice — it's a product stance.

The PDF parser runs entirely in the browser using PDF.js, so the raw statement file never leaves the user's device. Only the parsed transaction rows (date, amount, description) are sent anywhere. This was a deliberate decision to build trust with a user base that has strong — and justified — reasons to distrust fintech apps asking for access.

### Salary-cycle awareness

The app knows which "phase" of the month the user is in:

| Phase | Days from salary | Behavior |
|---|---|---|
| Flush | 1–7 | "You've just been paid — here's the full picture" |
| Steady | 8–18 | Normal dashboard with trend context |
| Careful | 19–24 | Budget warnings become more prominent |
| Survival | 25–salary day | Dashboard strips to essentials only: money left, days to salary, critical spend only |

Survival Mode was the most product-significant decision in the build. It acknowledges that a user on day 26 doesn't want charts — they want one number. This kind of phase-aware UI is uncommon in consumer finance apps.

---

## What I Built

| Feature | Why it exists |
|---|---|
| CSV upload with auto column detection | Works with any Indian bank's CSV export |
| HDFC + Bank of Baroda PDF parsing (browser-local) | No upload needed, no privacy compromise |
| India-native merchant preclassification | Swiggy, Zomato, Zepto, Blinkit, PhonePe UPI, IRCTC, Ola — detected locally before AI |
| Groq-powered AI categorisation fallback | Handles merchants not in the local dictionary |
| Salary-cycle-aware dashboard (4 phases) | Adaptive UI based on where user is in the month |
| Survival Mode | Stripped dashboard for the last week before salary |
| AI nudges on category cards | 12-word, non-judgmental, data-specific nudge per category |
| Subscription audit | Detects recurring charges across 3 months, shows monthly average |
| Paysa Coach chat interface | Conversational spending questions against real transaction data |
| Shareable weekly spending card | PNG download with category totals — designed to be shared |
| Goal tracking | Salary-cycle-sensitive goal progress |
| Budget simulator (What if?) | Drag sliders to see annual savings from cutting categories |

---

## Trade-offs I Made Consciously

**Chose CSV-first over bank API integration.** Account aggregator APIs (like AA Framework) exist in India, but require regulatory compliance, user consent flows, and ongoing maintenance. For a portfolio/MVP, CSV gives 80% of the value with 10% of the complexity — and is more trustworthy to users.

**Chose 3 categories over full spend tracking.** A general-purpose tracker would need to handle rent, EMIs, transfers, ATM withdrawals, and hundreds of merchant edge cases. Limiting to 3 categories meant I could do them well — with hand-tuned merchant lists, accurate AI fallback prompts, and specific nudge copy — rather than do everything badly.

**Chose Groq over OpenAI for AI calls.** Groq's inference speed (llama-3.1-8b-instant) is meaningfully faster for the real-time categorisation use case. Cost at scale is also lower. The trade-off is a less capable model for complex reasoning, which is acceptable because categorisation is a structured, well-constrained task.

**Chose Firebase Realtime Database over Firestore.** The data model is simple enough (one user, flat collections of transactions/goals/chat) that Realtime Database is lower latency and cheaper. Firestore would be the right call if the data model grew complex or if we needed multi-user features.

---

## What I'd Do Next

### If I had 2 more weeks

**Axis Bank and SBI PDF parsers.** HDFC + BoB covers perhaps 35% of the salaried population. Adding Axis and SBI would push that above 60%. The parser architecture (see `pulseUniversalParser.js`) is designed to be extensible.

**Budget alerts.** An email or in-app notification when a category hits 80% of its monthly budget. This closes the feedback loop — the app currently shows you data after the fact; alerts make it proactive.

**Merchant-level drill-down.** Tap "Food Delivery" to see every individual Swiggy/Zomato order with date and amount, sorted by size. Right now the category card shows totals; the detail view would show the specific habit.

### If I had 2 more months

**Multi-month trend chart.** Rolling 6-month view per category, so users can see whether their Swiggy habit is genuinely growing or just a bad month.

**Anonymous peer benchmarking.** "People in your salary range spend on average ₹2,800/month on food delivery. You spent ₹4,200." Requires enough users to make the benchmark meaningful, which is why it's a later bet.

**WhatsApp nudges.** The highest-engagement notification channel in India isn't email or push — it's WhatsApp. A weekly digest sent via WhatsApp Business API (no SMS access, user-initiated) would dramatically improve retention.

---

## What I Learned

**The upload moment is the product's highest drop-off risk.** Before a user has uploaded anything, the app is an empty screen with a file picker. Making that first upload feel safe, fast, and rewarding is the most important UX problem to solve — and it's underinvested in the current version.

**"Privacy-first" needs to be shown, not told.** Writing "no SMS access" in the README doesn't build trust. The client-side PDF parser does — when a user sees their statement being processed without a network request, that's tangible. The product needs to find more moments like this.

**Salary cycle phases resonated immediately with salaried users.** When I described the 4-phase model to colleagues, the response was instant recognition: "Oh, the survival phase — yes, that's a real thing." This suggests the mental model is accurate. It also suggests there's room to go deeper — the phases could affect nudge tone, chat persona, and goal recommendations, not just dashboard layout.

---

## Metrics I'd Track

| Metric | Why |
|---|---|
| Statements uploaded per user (first 7 days) | Leading indicator of activation |
| % users who upload 2+ months of statements | Indicates they found value and came back |
| Weekly active chat sessions | Measures engagement with the AI coach |
| Budget adherence rate (users who set budgets) | North star: are we actually changing behaviour? |
| Subscription audit → cancellation rate | Are we prompting action, not just showing data? |

The north star is **budget adherence rate** — not because it's easiest to measure, but because it's the closest proxy to the product's actual purpose: helping users spend less on categories they care about controlling.

---

## Links

- **Live app:** [add your deployed URL here]
- **GitHub:** [add your repo URL here]
- **Built with:** React, Vite, Tailwind CSS, Firebase Auth + Realtime Database, Groq (llama-3.1-8b-instant), PDF.js, Recharts, Vercel

---

*Built by [your name] · [month year] · Questions? [your LinkedIn or email]*
