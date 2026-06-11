import { useEffect, useRef, useState } from "react";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import { usePulseTransactions } from "../../hooks/usePulseTransactions";
import { usePulseSalaryCycleContext } from "../Shared/PulseSalaryCycleContext";
import { addPulseChatMessage, clearPulseChat } from "../../services/pulseDataService";

const STARTERS = [
  "How much have I spent on Swiggy this month?",
  "Which subscription should I cancel first?",
  "Am I spending more on Zepto than last month?",
  "What's my biggest food delivery habit?",
];

const FOCUS_CATEGORIES = ["Food", "Food Delivery", "Groceries", "Quick Commerce", "Bills", "Subscriptions"];
const OUT_OF_SCOPE_REPLY = "I only focus on Food Delivery, Quick Commerce and Subscriptions.\nAsk me about those and I can really help!";

function focusTransactions(transactions = []) {
  return transactions
    .filter((tx) => FOCUS_CATEGORIES.includes(tx.category))
    .slice(-120)
    .map(({ date, description, merchant, amount, category }) => ({ date, description, merchant, amount, category }));
}

async function pulseChatWithData(userMessage, conversationHistory = [], transactions = [], cycle = {}) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are Paisa Pulse, a focused financial habit coach.
You only discuss Food Delivery, Quick Commerce, and Subscriptions.
If asked about anything else — rent, salary, investments, transfers — respond with:
'${OUT_OF_SCOPE_REPLY}'
Be specific, use the actual rupee amounts from the data provided.
Cycle phase: ${cycle.label || "Unknown"}.
Transactions: ${JSON.stringify(focusTransactions(transactions))}`,
        },
        ...conversationHistory.map(({ role, content }) => ({ role, content })),
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || data?.error || `Groq request failed: ${response.status}`);
  return data.choices?.[0]?.message?.content?.trim() || OUT_OF_SCOPE_REPLY;
}

export default function PulseChat() {
  const { user } = usePulseAuth();
  const { items: history } = usePulseTransactions("chatHistory");
  const { items: transactions } = usePulseTransactions("transactions");
  const cycle = usePulseSalaryCycleContext();
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [history, typing]);

  async function send(text = message) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setMessage("");
    setTyping(true);
    const userMessage = { role: "user", content: trimmed };
    await addPulseChatMessage(user.uid, userMessage);
    try {
      const reply = await pulseChatWithData(trimmed, [...history, userMessage], transactions, cycle);
      await addPulseChatMessage(user.uid, { role: "assistant", content: reply });
    } catch {
      await addPulseChatMessage(user.uid, { role: "assistant", content: "I couldn't reach Paisa Pulse right now. Try again in a bit." });
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-paisa-border bg-paisa-card">
      <div className="flex items-center justify-between border-b border-paisa-border p-4">
        <div><h1 className="font-heading text-xl font-bold">Chat with Paisa Pulse</h1><p className="text-sm text-paisa-muted">{cycle?.label}</p></div>
        <button onClick={() => { if (window.confirm("Clear all chat history? This cannot be undone.")) clearPulseChat(user.uid); }} className="btn-secondary">Clear Chat</button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {!history.length && (
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="mb-5 text-center text-5xl">💓</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {STARTERS.map((starter) => <button key={starter} onClick={() => send(starter)} className="rounded-xl border border-paisa-border bg-paisa-card p-4 text-left font-bold hover:bg-paisa-hover">{starter}</button>)}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {history.map((item) => <Bubble key={item.id} message={item} />)}
          {typing && <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-paisa-accent">💓</span><div className="rounded-2xl rounded-bl bg-paisa-card px-4 py-3"><Dot /><Dot delay="120ms" /><Dot delay="240ms" /></div></div>}
          <div ref={endRef} />
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex gap-3 border-t border-paisa-border p-4">
        <input className="input" placeholder="Ask about food, quick commerce, or subscriptions..." value={message} onChange={(event) => setMessage(event.target.value)} />
        <button className="btn-primary">Send</button>
      </form>
    </div>
  );
}

function Bubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <span className="mr-2 grid h-8 w-8 place-items-center rounded-full bg-paisa-accent">💓</span>}
      <div className={`max-w-[76%] whitespace-pre-line px-4 py-3 ${isUser ? "rounded-[18px_18px_4px_18px] bg-paisa-accent text-paisa-bg" : "rounded-[18px_18px_18px_4px] border border-paisa-border bg-paisa-card text-paisa-text"}`}>
        {message.content}
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }) {
  return <span className="mx-0.5 inline-block h-2 w-2 rounded-full bg-paisa-muted" style={{ animation: `typing 1s ${delay} infinite` }} />;
}
