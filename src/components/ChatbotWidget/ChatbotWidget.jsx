import { useEffect, useMemo, useRef, useState } from "react";
import { FiMessageCircle, FiSend, FiX, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import ReactMarkdown from "react-markdown"; // 🆕 Import Markdown
import axios from "@/api/axios";
import { useAuth } from "@/features/auth/AuthProvider";
import ChatbotProductCard from "./ChatbotProductCard";
import "./ChatbotWidget.css";

const STORAGE_KEY = "chatbot_widget_history_v1";
const MAX_MESSAGES = 60;

const createMessage = (role, text) => ({
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
});

const QUICK_REPLIES = [
    "Tôi có mã giảm giá nào? ",
    "Kem chống nắng",
    "Hãng Cocoon",
];

const renderBotMessage = (text) => {
    const regex = /\[ID:\s*(\d+)\]/g;
    const parts = text.split(regex);
    
    // Tìm tất cả các ID có trong tin nhắn này
    const allIds = [...text.matchAll(regex)].map(match => match[1]);

    return (
        <div className="chatbot-markdown-content">
            {/* Render phần chữ của AI trước */}
            <ReactMarkdown>
                {text.replace(regex, "").trim()} 
            </ReactMarkdown>

            {/* Nếu có ID sản phẩm, render chúng vào một Carousel trượt ngang */}
            {allIds.length > 0 && (
                <div className="chatbot-widget-carousel">
                    {allIds.map((id, index) => (
                        <ChatbotProductCard key={index} productId={id} />
                    ))}
                </div>
            )}
        </div>
    );
};

const ChatbotWidget = () => {
    const { auth } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false); // 🆕 Maximize state
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
        return [createMessage("bot", "Xin chào! Mình là trợ lý của bạn. Bạn cần tư vấn sản phẩm hay mã giảm giá?")];
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

    const sendMessageToBot = async (promptText) => {
        setIsTyping(true);
        try {
            // 🧠 CHIẾN THUẬT SLIDING WINDOW:
            // Lấy tối đa 6 tin nhắn gần nhất từ mảng messages để tạo lịch sử chat
            // Chúng ta dùng .slice(-6) để đảm bảo context vừa đủ (3 cặp User-Bot)
            const chatHistory = messages.slice(-6).map(msg => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.text
            }));
            // Loại bỏ các tin nhắn đầu tiên nếu chúng là của bot để tránh gửi quá nhiều context không cần thiết
            while (chatHistory.length > 0 && chatHistory[0].role === "assistant") {
                chatHistory.shift();
            }

            // 🚀 2. Dùng axios thường để tránh bị kẹt vào vòng lặp 403 của axiosPrivate
            const response = await axios.post("/api/chatbot/ask", 
                { 
                    prompt: promptText,
                    history: chatHistory 
                }, 
                {
                    // 🚀 3. CỰC KỲ QUAN TRỌNG: 
                    // Tự tay gắn Token nếu user đã login, nếu không có thì gửi null (Guest)
                    headers: {
                        Authorization: auth?.accessToken ? `Bearer ${auth.accessToken}` : ""
                    },
                    withCredentials: true // Để gửi kèm cookie nếu có
                }
            );

            const botContent = response?.data?.content;
            if (typeof botContent === "string" && botContent.trim()) {
                pushMessage("bot", botContent);
            } else {
                pushMessage("bot", "Mình chưa lấy được nội dung trả lời. Bạn thử lại giúp mình nhé.");
            }
        } catch (error) {
            console.error("[CHATBOT UI] Ask failed", error);
            pushMessage("bot", "Xin lỗi, hệ thống đang bận. Bạn chờ xíu nhé.");
        } finally {
            setIsTyping(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const prompt = input.trim();
        if (!prompt || isTyping) return;

        setInput("");
        pushMessage("user", prompt);
        await sendMessageToBot(prompt);
    };

    const handleQuickReply = async (replyText) => {
        if (isTyping) return;
        pushMessage("user", replyText);
        await sendMessageToBot(replyText);
    };

    const clearHistory = () => {
        const welcome = createMessage("bot", "Lịch sử đã được xóa. Mình có thể hỗ trợ gì cho bạn?");
        setMessages([welcome]);
    };

    return (
        <div className="chatbot-widget-root" aria-live="polite">
            <button
                type="button"
                className="chatbot-widget-fab"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                {isOpen ? <FiX size={24} /> : <FiMessageCircle size={24} />}
            </button>

            {isOpen && (
                <section 
                    className={`chatbot-widget-panel ${isMaximized ? 'chatbot-widget-maximized' : ''}`} 
                    role="dialog"
                >
                    <header className="chatbot-widget-header">
                        <div className="chatbot-widget-header-left">
                            <span className="chatbot-widget-avatar">AI</span>
                            <div>
                                <h3>Trợ lý chăm sóc da</h3>
                                <p>Sẵn sàng hỗ trợ bạn</p>
                            </div>
                        </div>
                        <div className="chatbot-widget-header-actions">
                            {/* 🆕 Controls */}
                            <button type="button" onClick={() => setIsMaximized(!isMaximized)} className="chatbot-widget-icon-btn">
                                {isMaximized ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                            </button>
                            <button type="button" className="chatbot-widget-clear-btn" onClick={clearHistory}>
                                Xóa
                            </button>
                        </div>
                    </header>

                    <div className="chatbot-widget-messages" ref={listRef}>
                        {messages.map((message) => (
                            <article
                                key={message.id}
                                className={`chatbot-widget-message ${message.role === "user" ? "chatbot-widget-message-user" : "chatbot-widget-message-bot"}`}
                            >
                                {message.role === "bot" ? (
                                    renderBotMessage(message.text) // Gọi hàm xử lý Card
                                ) : (
                                    <p>{message.text}</p>
                                )}
                            </article>
                        ))}

                        {isTyping && (
                            <article className="chatbot-widget-message chatbot-widget-message-bot">
                                <p className="chatbot-widget-typing">
                                    <span></span><span></span><span></span>
                                </p>
                            </article>
                        )}
                    </div>

                    <div className="chatbot-widget-quick-replies">
                        {QUICK_REPLIES.map((reply, index) => (
                            <button key={index} type="button" className="chatbot-widget-pill" onClick={() => handleQuickReply(reply)} disabled={isTyping}>
                                {reply}
                            </button>
                        ))}
                    </div>

                    <form className="chatbot-widget-input-row" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Nhập câu hỏi..."
                            maxLength={300} /* ⬇️ Reduced from 1000 to save tokens */
                        />
                        <button type="submit" disabled={!canSend}>
                            <FiSend size={18} />
                        </button>
                    </form>
                    <div className="chatbot-widget-disclaimer">
                        Trợ lý AI có thể mắc lỗi. Các thông tin tư vấn chỉ mang tính chất tham khảo.
                    </div>
                </section>
            )}
        </div>
    );
};

export default ChatbotWidget;