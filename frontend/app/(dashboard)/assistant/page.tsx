"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentQuery } from "@/lib/patient-portal";
import { fetchApi } from "@/lib/backend-api";
import {
  Send,
  Bot,
  User,
  Plus,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  selectedPatientId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface Patient {
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  diagnosis?: string[];
  status?: string;
}

const CHAT_STORAGE_KEY = "medai-chat-sessions-v1";

const quickPrompts = [
  { label: "Critical patients", query: "List all patients with critical status" },
  { label: "Drug interactions", query: "Check for any drug interactions in current medications" },
  { label: "Lab trends", query: "What are the current trends in HbA1c levels?" },
  { label: "Overdue tests", query: "Which patients have overdue tests?" },
];

const ALL_PATIENTS_VALUE = "all-patients";

const createChatSession = (): ChatSession => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    selectedPatientId: "",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

function renderInlineText(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((segment, index) => {
    const isBold = segment.startsWith("**") && segment.endsWith("**") && segment.length > 4;
    if (!isBold) return <span key={`${segment}-${index}`}>{segment}</span>;
    return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
  });
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push(<div key={`spacer-${index}`} className="h-1" />);
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push(<h2 key={`heading-${index}`}>{renderInlineText(heading[1])}</h2>);
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInlineText(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^[*\-•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[*\-•]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[*\-•]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInlineText(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${index}`} className="leading-relaxed">
        {renderInlineText(line)}
      </p>
    );
    index += 1;
  }

  return <div className="space-y-2 text-sm">{blocks}</div>;
}

export default function AssistantPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [input, setInput] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsError, setPatientsError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadPatients() {
      try {
        const res = await fetchApi<Array<any>>("/api/patients");
        if (!active) return;
        setPatients(Array.isArray(res) ? res : []);
      } catch (error) {
        if (active) {
          setPatients([]);
          setPatientsError(error instanceof Error ? error.message : "Unable to load patients");
        }
      }
    }
    loadPatients();

    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      const session = createChatSession();
      setChatSessions([session]);
      setActiveChatId(session.id);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ChatSession[];
      if (parsed.length === 0) {
        const session = createChatSession();
        setChatSessions([session]);
        setActiveChatId(session.id);
        return;
      }
      setChatSessions(parsed);
      setActiveChatId(parsed[0].id);
    } catch {
      const session = createChatSession();
      setChatSessions([session]);
      setActiveChatId(session.id);
    }
  }, []);

  useEffect(() => {
    if (chatSessions.length === 0) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatSessions, activeChatId, isTyping]);

  const activeChat = useMemo(
    () => chatSessions.find((chat) => chat.id === activeChatId) ?? chatSessions[0],
    [chatSessions, activeChatId]
  );

  const selectedPatient = activeChat?.selectedPatientId ?? "";
  const messages = activeChat?.messages ?? [];

  const updateActiveChat = (updater: (chat: ChatSession) => ChatSession) => {
    setChatSessions((prev) =>
      prev.map((chat) => {
        if (chat.id !== activeChatId) return chat;
        const updated = updater(chat);
        return { ...updated, updatedAt: new Date().toISOString() };
      })
    );
  };

  const createNewChat = () => {
    const session = createChatSession();
    setChatSessions((prev) => [session, ...prev]);
    setActiveChatId(session.id);
    setInput("");
  };

  const deleteChat = (chatId: string) => {
    setChatSessions((prev) => {
      const target = prev.find((chat) => chat.id === chatId);
      if (!target) return prev;
      if (!window.confirm(`Delete chat "${target.title}"?`)) return prev;

      if (prev.length === 1) {
        const fresh = createChatSession();
        setActiveChatId(fresh.id);
        setInput("");
        return [fresh];
      }

      const filtered = prev.filter((chat) => chat.id !== chatId);
      if (activeChatId === chatId) {
        setActiveChatId(filtered[0].id);
        setInput("");
      }
      return filtered;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;

    const prompt = input.trim();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    updateActiveChat((chat) => ({
      ...chat,
      title: chat.messages.length === 0 ? prompt.slice(0, 50) : chat.title,
      messages: [...chat.messages, userMessage],
    }));

    setInput("");
    setIsTyping(true);

    const targetPatientId = activeChat.selectedPatientId || undefined;
    const isAllPatientsMode = !targetPatientId;

    try {
      const response = await agentQuery(prompt, targetPatientId, {
        allPatients: isAllPatientsMode,
        history: activeChat.messages.slice(-8).map(({ role, content }) => ({ role, content })),
      });
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };
      updateActiveChat((chat) => ({
        ...chat,
        messages: [...chat.messages, assistantMessage],
      }));
    } catch {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Backend unavailable. Please ensure backend1 is running on http://localhost:4000.",
        timestamp: new Date().toISOString(),
      };
      updateActiveChat((chat) => ({
        ...chat,
        messages: [...chat.messages, assistantMessage],
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handlePatientSelect = (patientId: string) => {
    if (!activeChat) return;

    updateActiveChat((chat) => ({
      ...chat,
      selectedPatientId: patientId,
    }));

    if (patientId) {
      const patient = patients.find((p) => p.patient_id === patientId);
      if (patient) {
        setInput(`Generate a detailed consultation brief for ${patient.name}`);
      }
    }
  };

  const selectValue = selectedPatient === "" ? ALL_PATIENTS_VALUE : selectedPatient;

  const handleSelectChange = (value: string) => {
    if (value === ALL_PATIENTS_VALUE) {
      handlePatientSelect("");
    } else {
      handlePatientSelect(value);
    }
  };

  return (
    <main className="assistant-page">
      <header className="assistant-heading">
        <div>
          <p className="assistant-eyebrow">CLINICAL SUPPORT <span>/</span> AI ASSISTANT</p>
          <h1>Patient care assistant</h1>
          <p className="assistant-subtitle">Review patient information and explore clinical questions.</p>
        </div>
        <Button onClick={createNewChat} variant="outline" className="assistant-new-chat">
          <Plus size={15} /> New conversation
        </Button>
      </header>

      <div className="assistant-workspace">
        <aside className="assistant-sidebar">
          <section className="assistant-section">
            <div className="assistant-section-heading">
              <h2>Conversations</h2>
              <span>{chatSessions.length}</span>
            </div>
            <ScrollArea className="assistant-history-scroll">
              <div className="assistant-history-list">
                {chatSessions.map((chat) => (
                  <div key={chat.id} className={cn("assistant-history-item", activeChatId === chat.id && "is-active")}>
                    <button onClick={() => setActiveChatId(chat.id)} className="assistant-history-select">
                      <MessageSquare size={15} />
                      <span>
                        <b>{chat.title}</b>
                        <small>{new Date(chat.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small>
                      </span>
                    </button>
                    <Button variant="ghost" size="icon" className="assistant-delete" onClick={() => deleteChat(chat.id)} aria-label={`Delete ${chat.title}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </section>

          <section className="assistant-section">
            <div className="assistant-section-heading"><h2>Patient records</h2></div>
            <div className="assistant-patient-list">
              {patientsError ? (
                <p className="assistant-notice is-error">{patientsError}</p>
              ) : patients.length === 0 ? (
                <p className="assistant-notice">No patient records available.</p>
              ) : patients.slice(0, 5).map((patient) => (
                <button key={patient.patient_id} onClick={() => handlePatientSelect(patient.patient_id)} className={cn("assistant-patient", selectedPatient === patient.patient_id && "is-active")}>
                  <span className="assistant-patient-initials">{patient.name.split(" ").map((part) => part[0]).join("")}</span>
                  <span className="assistant-patient-details">
                    <b>{patient.name}</b>
                    <small>{patient.diagnosis?.[0] || "No diagnosis recorded"}</small>
                  </span>
                  {patient.status === "critical" && <i aria-label="Critical status" />}
                </button>
              ))}
            </div>
          </section>

          <section className="assistant-section assistant-prompts-section">
            <div className="assistant-section-heading"><h2>Suggested questions</h2></div>
            <div className="assistant-prompt-list">
              {quickPrompts.map((prompt) => (
                <button key={prompt.label} onClick={() => setInput(prompt.query)}>{prompt.label}</button>
              ))}
            </div>
          </section>
        </aside>

        <section className="assistant-chat" aria-label="Clinical assistant conversation">
          <header className="assistant-chat-header">
            <div className="assistant-identity">
              <span className="assistant-mark"><Bot size={19} /></span>
              <span><b>MedAI Assistant</b><small><i /> Ready to assist</small></span>
            </div>
            <Select value={selectValue} onValueChange={handleSelectChange}>
              <SelectTrigger className="assistant-context-select">
                <SelectValue placeholder="All patients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PATIENTS_VALUE}>All patients</SelectItem>
                {patients.map((patient) => <SelectItem key={patient.patient_id} value={patient.patient_id}>{patient.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </header>

          <div className="assistant-mobile-history" aria-label="Saved conversations">
            {chatSessions.map((chat) => (
              <div key={`mobile-${chat.id}`} className={cn("assistant-mobile-history-item", activeChatId === chat.id && "is-active")}>
                <button onClick={() => setActiveChatId(chat.id)} title={chat.title}>{chat.title}</button>
                <button onClick={() => deleteChat(chat.id)} aria-label={`Delete ${chat.title}`} title={`Delete ${chat.title}`}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>

          <div ref={scrollRef} className="assistant-messages">
            {messages.length === 0 ? (
              <div className="assistant-empty">
                <span className="assistant-empty-mark"><Bot size={21} /></span>
                <h2>How can I help with care today?</h2>
                <p>Ask about patient records, medications, lab trends, or consultation summaries.</p>
                <div className="assistant-empty-prompts">
                  {quickPrompts.map((prompt) => (
                    <button key={prompt.label} onClick={() => setInput(prompt.query)}>{prompt.label}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="assistant-message-list">
                {messages.map((message) => (
                  <div key={message.id} className={cn("assistant-message-row", message.role === "user" && "is-user")}>
                    <span className={cn("assistant-message-avatar", message.role === "user" && "is-user")}>
                      {message.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                    </span>
                    <div className={cn("assistant-message", message.role === "user" && "is-user")}>
                      <FormattedMessage content={message.content} />
                      <p>{new Date(message.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="assistant-message-row">
                    <span className="assistant-message-avatar"><Bot size={16} /></span>
                    <div className="assistant-typing" aria-label="Assistant is responding"><i /><i /><i /></div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <Textarea
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask a clinical question... (Shift+Enter for a new line)"
              aria-label="Ask the clinical assistant"
              className="assistant-composer-input"
            />
            <Button type="submit" disabled={!input.trim() || isTyping} className="assistant-send" aria-label="Send message" title="Send message">
              <Send size={16} />
            </Button>
          </form>
          <p className="assistant-disclaimer">Clinical decision support only. Verify recommendations against the patient record.</p>
        </section>
      </div>

      <style jsx global>{`
        .assistant-page { --assistant-ink:#15313a; --assistant-muted:#718487; --assistant-line:#dbe6e3; --assistant-green:#147d70; max-width:1440px; min-height:calc(100vh - 11rem); margin:0 auto; padding:8px 0 24px; color:var(--assistant-ink); display:flex; flex-direction:column; }
        .assistant-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; margin-bottom:20px; }
        .assistant-eyebrow { margin:0 0 9px; color:#648080; font-size:9px; font-weight:700; letter-spacing:1px; }.assistant-eyebrow span { padding:0 5px; color:#a4b3b0; }
        .assistant-heading h1 { margin:0; font:400 31px/1.15 Georgia,serif; }.assistant-subtitle { margin:8px 0 0; color:var(--assistant-muted); font-size:12px; }
        .assistant-new-chat { min-height:36px; gap:7px; padding:0 11px; border:1px solid var(--assistant-line); border-radius:3px; color:#52696c; background:#fff; font-size:11px; }.assistant-new-chat:hover { border-color:#9fbab1; color:var(--assistant-green); background:#f7fbf9; }
        .assistant-workspace { display:grid; min-height:590px; flex:1; grid-template-columns:minmax(220px,270px) minmax(0,1fr); gap:14px; }
        .assistant-sidebar { display:flex; min-height:0; flex-direction:column; gap:12px; }
        .assistant-section,.assistant-chat { border:1px solid var(--assistant-line); background:#fff; }
        .assistant-section { padding:13px 12px; }.assistant-section-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }.assistant-section-heading h2 { margin:0; font-size:11px; font-weight:700; }.assistant-section-heading > span { color:#829593; font-size:10px; }
        .assistant-history-scroll { max-height:180px; }.assistant-history-list,.assistant-patient-list,.assistant-prompt-list { display:grid; gap:3px; }
        .assistant-history-item { display:flex; min-width:0; align-items:center; border:1px solid transparent; }.assistant-history-item.is-active { border-color:#dcebe6; background:#f5faf7; }.assistant-history-select { display:flex; min-width:0; flex:1; align-items:center; gap:9px; padding:8px 6px; border:0; color:#68807d; background:transparent; text-align:left; cursor:pointer; }.assistant-history-select > span { min-width:0; }.assistant-history-select b,.assistant-history-select small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.assistant-history-select b { color:#435c5e; font-size:10px; font-weight:600; }.assistant-history-select small { margin-top:3px; color:#94a4a1; font-size:9px; }.assistant-history-item.is-active .assistant-history-select b { color:var(--assistant-green); }
        .assistant-delete { width:27px; height:27px; flex:0 0 27px; border-radius:2px; color:#8a9b99; opacity:.65; }.assistant-delete:hover { color:#a84936; background:#fbefeb; }.assistant-history-item:hover .assistant-delete { opacity:1; }
        .assistant-patient { display:flex; min-width:0; align-items:center; gap:9px; padding:7px 6px; border:1px solid transparent; background:#fff; text-align:left; cursor:pointer; }.assistant-patient:hover,.assistant-patient.is-active { border-color:#dcebe6; background:#f5faf7; }.assistant-patient-initials { display:grid; width:29px; height:29px; flex:0 0 29px; place-items:center; color:var(--assistant-green); background:#eaf4f0; font-size:9px; font-weight:700; }.assistant-patient-details { min-width:0; flex:1; }.assistant-patient-details b,.assistant-patient-details small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.assistant-patient-details b { color:#435c5e; font-size:10px; font-weight:600; }.assistant-patient-details small { margin-top:3px; color:#8a9b99; font-size:9px; }.assistant-patient > i { width:6px; height:6px; flex:0 0 6px; background:#bd654d; }
        .assistant-notice { margin:0; padding:8px 5px; color:#829593; font-size:10px; line-height:1.5; }.assistant-notice.is-error { color:#a84936; }
        .assistant-prompts-section { flex:1; }.assistant-prompt-list button,.assistant-empty-prompts button { padding:8px 7px; border:1px solid transparent; color:#718487; background:#f8fbf9; text-align:left; font:inherit; font-size:10px; cursor:pointer; }.assistant-prompt-list button:hover,.assistant-empty-prompts button:hover { border-color:#c8ddd5; color:var(--assistant-green); background:#f1f8f4; }
        .assistant-chat { display:flex; min-width:0; min-height:0; flex-direction:column; }.assistant-chat-header { display:flex; min-height:66px; align-items:center; justify-content:space-between; gap:12px; padding:11px 16px; border-bottom:1px solid var(--assistant-line); }.assistant-identity { display:flex; min-width:0; align-items:center; gap:10px; }.assistant-mark { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; color:var(--assistant-green); background:#eaf4f0; }.assistant-identity b,.assistant-identity small { display:block; }.assistant-identity b { color:#29464a; font-size:11px; font-weight:650; }.assistant-identity small { margin-top:4px; color:#829593; font-size:9px; }.assistant-identity small i { display:inline-block; width:6px; height:6px; margin-right:5px; background:#5c9b7d; }
        .assistant-context-select { width:180px; height:34px; border-radius:2px; border-color:var(--assistant-line); color:#52696c; background:#fff; font-size:10px; }.assistant-context-select:focus { border-color:var(--assistant-green); box-shadow:0 0 0 2px rgba(20,125,112,.1); }
        .assistant-mobile-history { display:none; }
        .assistant-messages { min-height:0; flex:1; overflow-y:auto; padding:22px clamp(14px,4vw,42px); background:#fff; }.assistant-empty { display:flex; min-height:360px; height:100%; flex-direction:column; align-items:center; justify-content:center; padding:24px 10px; text-align:center; }.assistant-empty-mark { display:grid; width:42px; height:42px; place-items:center; color:var(--assistant-green); background:#eaf4f0; }.assistant-empty h2 { margin:15px 0 0; font:400 20px/1.3 Georgia,serif; color:#29464a; }.assistant-empty > p { max-width:400px; margin:7px 0 0; color:#829593; font-size:11px; line-height:1.6; }.assistant-empty-prompts { display:grid; width:min(100%,440px); grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:22px; }.assistant-empty-prompts button { min-height:38px; border-color:#e5eeea; background:#fff; text-align:center; }
        .assistant-message-list { display:flex; flex-direction:column; gap:19px; }.assistant-message-row { display:flex; align-items:flex-start; gap:9px; }.assistant-message-row.is-user { flex-direction:row-reverse; }.assistant-message-avatar { display:grid; width:27px; height:27px; flex:0 0 27px; place-items:center; color:var(--assistant-green); background:#eaf4f0; }.assistant-message-avatar.is-user { color:#52696c; background:#f1f4f3; }.assistant-message { max-width:min(78%,660px); padding:11px 13px 8px; border:1px solid #e6eeeb; color:#435c5e; background:#fbfdfc; overflow-wrap:anywhere; }.assistant-message.is-user { border-color:#147d70; color:#fff; background:#147d70; }.assistant-message :global(div) { font-size:11px; line-height:1.65; }.assistant-message p { margin:7px 0 0; color:#8a9b99; font-size:9px; }.assistant-message.is-user p { color:rgba(255,255,255,.72); }.assistant-typing { display:flex; align-items:center; gap:4px; padding:14px; border:1px solid #e6eeeb; background:#fbfdfc; }.assistant-typing i { width:5px; height:5px; background:#71938b; animation:assistant-pulse 1s ease-in-out infinite; }.assistant-typing i:nth-child(2) { animation-delay:.15s; }.assistant-typing i:nth-child(3) { animation-delay:.3s; }@keyframes assistant-pulse { 50% { opacity:.3; } }
        .assistant-composer { display:flex; align-items:center; gap:8px; padding:12px 14px 8px; border-top:1px solid var(--assistant-line); }.assistant-composer-input { min-width:0; height:40px; border-radius:2px; border-color:var(--assistant-line); color:#29464a; background:#fff; font-size:11px; }.assistant-composer-input::placeholder { color:#96a8a5; }.assistant-composer-input:focus { border-color:var(--assistant-green); box-shadow:0 0 0 2px rgba(20,125,112,.1); }.assistant-send { width:40px; height:40px; flex:0 0 40px; border-radius:2px; color:#fff; background:var(--assistant-green); }.assistant-send:hover { background:#0d655b; }.assistant-send:disabled { opacity:.5; }.assistant-disclaimer { margin:0; padding:0 14px 10px; color:#9aabaa; font-size:9px; text-align:right; }
        @media (max-width:900px) { .assistant-page { min-height:calc(100vh - 9rem); }.assistant-workspace { grid-template-columns:220px minmax(0,1fr); }.assistant-prompts-section { display:none; } }
        @media (max-width:680px) { .assistant-page { min-height:calc(100vh - 8rem); padding-top:0; }.assistant-heading { align-items:flex-start; }.assistant-heading h1 { font-size:27px; }.assistant-workspace { min-height:650px; grid-template-columns:minmax(0,1fr); }.assistant-sidebar { display:none; }.assistant-chat { min-height:650px; }.assistant-chat-header { padding:10px 11px; }.assistant-context-select { width:145px; }.assistant-mobile-history { display:flex; gap:6px; overflow-x:auto; padding:8px 10px; border-bottom:1px solid var(--assistant-line); scrollbar-width:thin; }.assistant-mobile-history-item { display:flex; min-width:0; max-width:190px; align-items:center; border:1px solid var(--assistant-line); background:#fff; }.assistant-mobile-history-item.is-active { border-color:#b7d5ca; background:#f5faf7; }.assistant-mobile-history-item button { min-width:0; padding:6px 7px; overflow:hidden; border:0; color:#68807d; background:transparent; font:inherit; font-size:9px; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }.assistant-mobile-history-item.is-active button { color:var(--assistant-green); }.assistant-mobile-history-item button + button { display:grid; width:27px; flex:0 0 27px; place-items:center; padding:6px; border-left:1px solid var(--assistant-line); }.assistant-messages { padding:16px 12px; }.assistant-empty { min-height:390px; }.assistant-message { max-width:86%; }.assistant-new-chat { min-height:34px; padding:0 8px; font-size:10px; } }
        @media (max-width:420px) { .assistant-heading { flex-direction:column; align-items:stretch; }.assistant-new-chat { align-self:flex-start; }.assistant-context-select { width:128px; }.assistant-empty-prompts { grid-template-columns:1fr; }.assistant-chat-header { gap:6px; }.assistant-identity { gap:7px; }.assistant-mark { width:30px; height:30px; flex-basis:30px; } }
        .assistant-message :global(div) { font-size:14px; line-height:1.7; }.assistant-message h2 { margin:3px 0 0; color:#29464a; font-size:14px; font-weight:700; line-height:1.4; }.assistant-message.is-user h2 { color:#fff; }
        .assistant-composer-input { min-height:58px; height:58px; padding:15px 12px; resize:none; font-size:16px; line-height:1.45; }.assistant-composer-input::placeholder { font-size:14px; }
      `}</style>
    </main>
  );
}
