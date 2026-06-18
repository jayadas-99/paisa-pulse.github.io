import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { useSalaryCycleContext } from "../Shared/SalaryCycleContext";
import { addChatMessage, clearChat } from "../../services/transactionService";
import { chatWithData } from "../../services/groqService";

const STARTERS = [
  "How much did I spend on food this month?",
  "Am I on track to save this month?",
  "Where is most of my money going?",
  "What's my biggest unnecessary expense?",
];

export default function ChatPage() {
  const { user } = useAuth();
  const { items: history } = useTransactions("chatHistory");
  const { items: transactions } = useTransactions("transactions");
  const cycle = useSalaryCycleContext();
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
    await addChatMessage(user.uid, userMessage);
    try {
      const reply = await chatWithData(trimmed, [...history, userMessage], transactions, cycle);
      await addChatMessage(user.uid, { role: "assistant", content: reply });
    } catch {
      await addChatMessage(user.uid, { role: "assistant", content: "I couldn't reach the AI right now. Your data is still here, so try again in a bit." });
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-paisa-border bg-[#0d0d14]">
      <div className="flex items-center justify-between border-b border-paisa-border p-4">
        <div><h1 className="font-heading text-xl font-bold">Chat with Paisa Coach</h1><p className="text-sm text-paisa-muted">{cycle.label}</p></div>
        <button onClick={() => { if (window.confirm("Clear all chat history? This cannot be undone.")) clearChat(user.uid); }} className="btn-secondary">Clear Chat</button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {!history.length && (
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="mb-5 text-center text-5xl">💸</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {STARTERS.map((starter) => <button key={starter} onClick={() => send(starter)} className="rounded-xl border border-paisa-border bg-paisa-card p-4 text-left font-bold hover:bg-paisa-hover">{starter}</button>)}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {history.map((item) => <Bubble key={item.id} message={item} />)}
          {typing && <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-paisa-accent">💸</span><div className="rounded-2xl rounded-bl bg-paisa-card px-4 py-3"><Dot /><Dot delay="120ms" /><Dot delay="240ms" /></div></div>}
          <div ref={endRef} />
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-3 border-t border-paisa-border p-4">
        <input className="input" placeholder="Ask about your spending..." value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="btn-primary">Send</button>
      </form>
    </div>
  );
}

function Bubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <span className="mr-2 grid h-8 w-8 place-items-center rounded-full bg-paisa-accent">💸</span>}
      <div className={`max-w-[76%] px-4 py-3 ${isUser ? "rounded-[18px_18px_4px_18px] bg-paisa-accent text-white" : "rounded-[18px_18px_18px_4px] border border-paisa-border bg-paisa-card text-paisa-text"}`}>
        {message.content}
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }) {
  return <span className="mx-0.5 inline-block h-2 w-2 rounded-full bg-paisa-muted" style={{ animation: `typing 1s ${delay} infinite` }} />;
}
