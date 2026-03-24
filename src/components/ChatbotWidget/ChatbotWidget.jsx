import { useEffect, useMemo, useRef, useState } from "react";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate";
import { useAuth } from "@/features/auth/AuthProvider";
import "./ChatbotWidget.css";

const STORAGE_KEY = "chatbot_widget_history_v1";
const MAX_MESSAGES = 60;

const createMessage = (role, text) => ({
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
});

const ChatbotWidget = () => {
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (error) {
            console.warn("[CHATBOT UI] Failed to restore local history", error);
        }
        return [createMessage("bot", "Xin chao, minh la tro ly cua ban. Ban can tu van san pham hay ma giam gia?")];
    });

    const listRef = useRef(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    }, [messages]);

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, isTyping, isOpen]);

    const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

    const pushMessage = (role, text) => {
        if (!text?.trim()) return;
        setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), createMessage(role, text.trim())]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const prompt = input.trim();
        if (!prompt || isTyping) return;

        setInput("");
        pushMessage("user", prompt);

        if (!auth?.accessToken) {
            pushMessage("bot", "Ban can dang nhap de su dung chatbot.");
            return;
        }

        setIsTyping(true);
        try {
            const response = await axiosPrivate.post("/api/chatbot/ask", { prompt });
            const botContent = response?.data?.content;
            if (typeof botContent === "string" && botContent.trim()) {
                pushMessage("bot", botContent);
            } else {
                pushMessage("bot", "Mình chưa lay duoc noi dung tra loi. Ban thu lai giup minh nhe.");
            }
        } catch (error) {
            console.error("[CHATBOT UI] Ask failed", error);
            pushMessage("bot", "Xin loi, ket noi chatbot dang co van de. Ban thu lai sau it phut nhe.");
        } finally {
            setIsTyping(false);
        }
    };

    const clearHistory = () => {
        const welcome = createMessage("bot", "Lich su da duoc xoa. Minh co the ho tro gi tiep cho ban?");
        setMessages([welcome]);
    };

    return (
        <div className="chatbot-widget-root" aria-live="polite">
            <button
                type="button"
                className="chatbot-fab"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={isOpen ? "Dong chatbot" : "Mo chatbot"}
                title={isOpen ? "Dong chatbot" : "Mo chatbot"}
            >
                {isOpen ? <FiX size={24} /> : <FiMessageCircle size={24} />}
            </button>

            {isOpen && (
                <section className="chatbot-panel" role="dialog" aria-label="Ho tro chatbot">
                    <header className="chatbot-panel-header">
                        <div className="chatbot-header-left">
                            <span className="chatbot-avatar">AI</span>
                            <div>
                                <h3>Tro ly cham soc da</h3>
                                <p>Online</p>
                            </div>
                        </div>
                        <button type="button" className="chatbot-clear-btn" onClick={clearHistory}>
                            Xoa lich su
                        </button>
                    </header>

                    <div className="chatbot-messages" ref={listRef}>
                        {messages.map((message) => (
                            <article
                                key={message.id}
                                className={`chat-message ${message.role === "user" ? "chat-message-user" : "chat-message-bot"}`}
                            >
                                {message.role === "bot" && <span className="chat-inline-avatar">AI</span>}
                                <p>{message.text}</p>
                            </article>
                        ))}

                        {isTyping && (
                            <article className="chat-message chat-message-bot">
                                <span className="chat-inline-avatar">AI</span>
                                <p className="chat-typing" aria-label="Chatbot dang tra loi">
                                    <span>.</span>
                                    <span>.</span>
                                    <span>.</span>
                                </p>
                            </article>
                        )}
                    </div>

                    <form className="chatbot-input-row" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Nhap cau hoi cua ban..."
                            maxLength={1000}
                        />
                        <button type="submit" disabled={!canSend} aria-label="Gui tin nhan">
                            <FiSend size={18} />
                        </button>
                    </form>
                </section>
            )}
        </div>
    );
};

export default ChatbotWidget;
