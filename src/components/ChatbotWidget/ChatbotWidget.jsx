import { useEffect, useMemo, useRef, useState } from "react";
// 🚀 Đã import thêm FiCamera cho nút Phân tích da
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom"; // 🚀 Import useNavigate
import { FiMessageCircle, FiSend, FiX, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // 🚀 Import FontAwesome
import { faWandMagicSparkles  } from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from "react-markdown"; 
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
    "Tôi có mã giảm giá nào?",
    "Kem chống nắng",
    "Tôi muốn tư vấn sản phẩm tẩy trang mặt của Cocoon",
];

const renderBotMessage = (text, onClose) => {
    // 1. Xử lý bắt ID Sản phẩm (Giữ nguyên của Sếp)
    const productRegex = /\[ID:\s*(\d+)\]/g;
    const allIds = [...text.matchAll(productRegex)].map(match => match[1]);

    // 2. Xử lý bắt dữ liệu Biểu đồ Doanh Thu 
    const chartRegex = /__CHART_DATA_START__([\s\S]*?)__CHART_DATA_END__/;
    const chartMatch = text.match(chartRegex);
    let chartDataObj = null;

    if (chartMatch) {
        try {
            chartDataObj = JSON.parse(chartMatch[1]);
        } catch (e) {
            console.error("Lỗi parse Chart JSON:", e);
        }
    }

    // Dọn dẹp text để không in mấy cái thẻ [ID: X] hay [CHART_DATA: Y] ra màn hình
    const cleanText = text.replace(productRegex, "").replace(chartRegex, "").trim();

    return (
        <div className="chatbot-markdown-content">
            <ReactMarkdown>
                {cleanText}
            </ReactMarkdown>
            {/* Render Biểu đồ nếu có dữ liệu */}
            {chartDataObj && chartDataObj.revenueData && chartDataObj.revenueData.length > 0 && (
                <div className="chatbot-widget-chart-container">
                    <h5 className="chatbot-widget-chart-title">
                        Biểu đồ doanh thu ({chartDataObj.timeLabel})
                    </h5>
                    <div className="chatbot-widget-chart-wrapper">
                        <ResponsiveContainer>
                            <LineChart data={chartDataObj.revenueData}>
                                <XAxis dataKey="date" hide />
                                <Tooltip 
                                    formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                                    labelStyle={{ display: 'none' }}
                                />
                                {/* 🎨 Dùng màu Vàng Gold của Sếp làm màu chủ đạo cho Line */}
                                <Line type="monotone" dataKey="revenue" stroke="#E6C27A" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#E6C27A' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Render Carousel Sản phẩm (Giữ nguyên của Sếp) */}
            {allIds.length > 0 && (
                <div className="chatbot-widget-carousel">
                    {allIds.map((id, index) => (
                        <ChatbotProductCard key={index} productId={id} onClose={onClose} />
                    ))}
                </div>
            )}
        </div>
    );
};

const ChatbotWidget = () => {
    const { auth } = useAuth();
    const navigate = useNavigate(); // 🚀 Khởi tạo useNavigate
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
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
    
    useEffect(() => {
        if (isOpen) {
            // Khi mở chat: Thêm class hoặc gán trực tiếp style ẩn thanh cuộn của body
            document.body.style.overflow = "hidden";
        } else {
            // Khi đóng chat: Trả lại thanh cuộn bình thường
            document.body.style.overflow = "";
        }

        // Dọn dẹp (Cleanup) đề phòng trường hợp Component bị unmount đột ngột
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);
    const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

    const pushMessage = (role, text) => {
        if (!text?.trim()) return;
        setMessages((prev) => [...prev.slice(-MAX_MESSAGES + 1), createMessage(role, text.trim())]);
    };

    const sendMessageToBot = async (promptText) => {
        setIsTyping(true);
        try {
            // Trong ChatbotWidget.jsx, hàm sendMessageToBot
        // 🚀 Bản sửa lỗi "Tin nhắn rỗng" cho AWS Bedrock
        const chatHistory = messages.slice(-6).map(msg => {
            let cleanText = msg.text;

            // 1. Xóa ID và JSON biểu đồ khỏi history
            const productRegex = /\[ID:\s*(\d+)\]/g;
            const chartRegex = /__CHART_DATA_START__([\s\S]*?)__CHART_DATA_END__/;
            
            cleanText = cleanText.replace(productRegex, "").replace(chartRegex, "").trim();

            // 2. 🛡️ QUAN TRỌNG: AWS Bedrock không chấp nhận content rỗng
            // Nếu sau khi lọc sạch mà không còn chữ nào, ta gửi một placeholder ẩn
            if (!cleanText) {
                cleanText = msg.role === "user" ? "[Tin nhắn hình ảnh/dữ liệu]" : "[Báo cáo dữ liệu]";
            }

            return {
                role: msg.role === "user" ? "user" : "assistant",
                content: cleanText
            };
        });
            
            while (chatHistory.length > 0 && chatHistory[0].role === "assistant") {
                chatHistory.shift();
            }

            const response = await axios.post("/api/chatbot/ask", 
                { 
                    prompt: promptText,
                    history: chatHistory 
                }, 
                {
                    headers: {
                        Authorization: auth?.accessToken ? `Bearer ${auth.accessToken}` : ""
                    },
                    withCredentials: true 
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
            {/* 🚀 CHỈ HIỂN THỊ NÚT TRÒN KHI ĐÓNG KHUNG CHAT */}
            {!isOpen && (
                <button
                    type="button"
                    className="chatbot-widget-fab"
                    onClick={() => setIsOpen(true)}
                >
                    <FiMessageCircle size={24} />
                </button>
            )}

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
                                {/* 🚀 NÚT PHÂN TÍCH DA ĐƯỢC DỜI LÊN ĐÂY */}
                                <button 
                                    type="button" 
                                    className="chatbot-widget-analyze-badge" 
                                    onClick={() => {
                                        navigate('/analyze-skin')
                                        setIsOpen(false); // tắt CHatbot khi chuyển trang 
                                    }
                                    }

                                >
                                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                                    <span>Phân tích da ngay</span>
                                </button>
                            </div>
                        </div>
                        <div className="chatbot-widget-header-actions">
                            <button type="button" className="chatbot-widget-clear-btn" onClick={clearHistory}>
                                Xóa
                            </button>
                            {/* 🚀 Nhóm các icon thao tác */}
                            <button type="button" onClick={() => setIsMaximized(!isMaximized)} className="chatbot-widget-icon-btn" title="Phóng to/Thu nhỏ">
                                {isMaximized ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
                            </button>
                            <button type="button" onClick={() => setIsOpen(false)} className="chatbot-widget-icon-btn" title="Đóng cửa sổ">
                                <FiX size={20} />
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
                                    // 🚀 Truyền hàm tắt Chatbot (setIsOpen) vào đây
                                    renderBotMessage(message.text, () => setIsOpen(false)) 
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
                            maxLength={300}
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