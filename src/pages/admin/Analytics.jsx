// src/pages/admin/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; 
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate";
import { FaChartLine, FaBoxOpen, FaUsers } from "react-icons/fa6";
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';
import './Analytics.css';

// 🎨 MANG MÀU SẮC SỐNG ĐỘNG TRỞ LẠI CHO BIỂU ĐỒ PIE CHART
const COLORS = {
    'DELIVERED': '#10b981', // Xanh lá ngọc (Thành công)
    'PENDING': '#f59e0b',   // Vàng cam (Chờ xử lý)
    'PROCESSING': '#3b82f6',// Xanh dương (Đang xử lý)
    'SHIPPED': '#8b5cf6',   // Tím (Đang giao)
    'CANCELLED': '#ef4444'  // Đỏ (Đã hủy)
};

const Analytics = () => {
    const { t } = useTranslation();
    const axiosPrivate = useAxiosPrivate();

    const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, newCustomers: 0 });
    const [chartData, setChartData] = useState({ revenueData: [], orderStatusData: [], topProductsData: [] });
    const [timeRange, setTimeRange] = useState('30days'); 
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        
        const fetchAnalyticsData = async () => {
            try {
                setIsLoading(true);
                const [summaryRes, chartsRes] = await Promise.all([
                    axiosPrivate.get('/api/analytics/summary', { signal: controller.signal }),
                    axiosPrivate.get(`/api/analytics/charts?timeRange=${timeRange}`, { signal: controller.signal })
                ]);
                
                setSummary(summaryRes.data);
                setChartData(chartsRes.data);
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    console.error("Fetch Analytics Error:", err);
                    setError("Không thể tải dữ liệu thống kê.");
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        fetchAnalyticsData();
        return () => controller.abort();
    }, [axiosPrivate, timeRange]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="admin-analytics-page-tooltip">
                    <p className="admin-analytics-page-tooltip-label">{label}</p>
                    <p className="admin-analytics-page-tooltip-value" style={{ color: '#10b981', fontWeight: 'bold' }}>
                        Doanh thu: {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="admin-analytics-page-container fade-in">
            <header className="admin-analytics-page-header">
                <div className="admin-analytics-page-title-group">
                    <h2 className="admin-analytics-page-title">Analytics Dashboard</h2>
                    <p className="admin-analytics-page-subtitle">Tổng quan tình hình kinh doanh của cửa hàng</p>
                </div>
                
                <div className="admin-analytics-page-filter">
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="admin-analytics-page-select"
                    >
                        <option value="7days">7 Ngày qua</option>
                        <option value="30days">30 Ngày qua</option>
                    </select>
                </div>
            </header>

            {error && <div className="admin-analytics-page-error">⚠️ {error}</div>}

            {isLoading ? (
                <div className="admin-analytics-page-loading">
                    <div className="admin-analytics-page-spinner"></div>
                    <p>Đang đồng bộ dữ liệu...</p>
                </div>
            ) : (
                <>
                    {/* --- KPI CARDS (Giữ nguyên phong cách Monochrome) --- */}
                    <div className="admin-analytics-page-kpi-grid">
                        <div className="admin-analytics-page-kpi-card">
                            <div className="admin-analytics-page-kpi-icon-wrapper">
                                <FaChartLine className="admin-analytics-page-icon" />
                            </div>
                            <div className="admin-analytics-page-kpi-content">
                                <span className="admin-analytics-page-kpi-label">Tổng Doanh Thu (Đã thu)</span>
                                <h3 className="admin-analytics-page-kpi-value">{formatCurrency(summary.totalRevenue)}</h3>
                            </div>
                        </div>
                        
                        <div className="admin-analytics-page-kpi-card">
                            <div className="admin-analytics-page-kpi-icon-wrapper">
                                <FaBoxOpen className="admin-analytics-page-icon" />
                            </div>
                            <div className="admin-analytics-page-kpi-content">
                                <span className="admin-analytics-page-kpi-label">Tổng Đơn Hàng</span>
                                <h3 className="admin-analytics-page-kpi-value">{summary.totalOrders}</h3>
                            </div>
                        </div>
                        
                        <div className="admin-analytics-page-kpi-card">
                            <div className="admin-analytics-page-kpi-icon-wrapper">
                                <FaUsers className="admin-analytics-page-icon" />
                            </div>
                            <div className="admin-analytics-page-kpi-content">
                                <span className="admin-analytics-page-kpi-label">Khách Hàng Mới</span>
                                <h3 className="admin-analytics-page-kpi-value">+{summary.newCustomers}</h3>
                            </div>
                        </div>
                    </div>

                    {/* --- CHARTS AREA --- */}
                    <div className="admin-analytics-page-charts-layout">
                        
                        {/* Biểu đồ Doanh thu (Line Chart) */}
                        <div className="admin-analytics-page-chart-box admin-analytics-page-chart-main">
                            <h3 className="admin-analytics-page-chart-title">Biểu đồ Doanh Thu</h3>
                            <div className="admin-analytics-page-chart-wrapper">
                                <ResponsiveContainer>
                                    <LineChart data={chartData.revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                        {/* 🎨 Đổi màu Line thành Xanh Lá Thể hiện sự tăng trưởng */}
                                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#059669' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Biểu đồ Trạng thái (Pie Chart) */}
                        <div className="admin-analytics-page-chart-box admin-analytics-page-chart-side">
                            <h3 className="admin-analytics-page-chart-title admin-analytics-page-text-center">Trạng Thái Đơn Hàng</h3>
                            <div className="admin-analytics-page-chart-wrapper">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={chartData.orderStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {/* 🎨 Trả lại bảng màu rực rỡ cho Pie Chart */}
                                            {chartData.orderStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value) => [`${value} đơn`, 'Số lượng']}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* --- KHU VỰC TOP SẢN PHẨM --- */}
                    <div className="admin-analytics-page-chart-box admin-analytics-page-mt-24">
                        <h3 className="admin-analytics-page-chart-title">Top Sản Phẩm Bán Chạy</h3>
                        <div className="admin-analytics-page-chart-wrapper">
                            <ResponsiveContainer>
                                <BarChart data={chartData.topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{fontSize: 12, fill: '#64748b'}} />
                                    <YAxis type="category" dataKey="name" width={180} tick={{fontSize: 12, fill: '#334155'}} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}} 
                                        formatter={(value) => [`${value} sản phẩm`, 'Đã bán']}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    {/* 🎨 Đổi màu Bar thành Xanh Dương rực rỡ */}
                                    <Bar dataKey="sold" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </>
            )}
        </div>
    );
};

export default Analytics;