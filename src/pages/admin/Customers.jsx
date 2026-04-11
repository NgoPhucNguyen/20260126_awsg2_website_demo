import './Customers.css';
import { FaUserTag, FaEnvelope, FaArrowRight } from "react-icons/fa6"; // Thêm icon túi xách
import { useState, useEffect } from "react";
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate"; 
import { useTranslation } from 'react-i18next'; 

const Customers = () => {
    const { t } = useTranslation();

    const [customers, setCustomers] = useState([]); 
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(""); 
    const [visibleCount, setVisibleCount] = useState(5); 
    const [searchTerm, setSearchTerm] = useState("");

    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        const controller = new AbortController(); 
        const getCustomers = async () => {
            try {
                setError("");
                setIsLoading(true);
                const response = await axiosPrivate.get('/api/admin/customers', { signal: controller.signal });
                setCustomers(response.data);
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    console.error("Fetch Error:", err);
                    setError(t('customers.errorFetch')); 
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        getCustomers();
        return () => controller.abort();
    }, [axiosPrivate, t]); 

    const handleShowMore = () => setVisibleCount(prev => prev + 5);

    const filteredCustomers = customers.filter(customer => {
        const term = searchTerm.toLowerCase();
        return (
            customer.accountName?.toLowerCase().includes(term) ||
            customer.mail?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="fade-in">
            <header className="dashboard-header">
                <h2>{t('customers.title')}</h2> 
                <p className="admin-subtitle">{t('customers.subtitle')}</p> 
            </header>

            {error && <div className="error-banner">⚠️ {error}</div>}

            {isLoading ? (
                <div className="loading-container"><div className="spinner"></div><p>{t('customers.syncing')}</p></div>
            ) : (
                <>
                    <div className="table-controls">
                        <div className="search-wrapper">
                            <input 
                                type="text" 
                                placeholder={t('customers.searchPlaceholder')} 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="customers-table">
                            <thead>
                                <tr>
                                    {/* 🚀 Đổi ID thành STT */}
                                    <th>STT</th>
                                    <th><FaUserTag /> {t('customers.colAccount')}</th>
                                    <th><FaEnvelope /> {t('customers.colEmail')}</th>
                                    {/* 🚀 Thêm cột Tổng Đơn Hàng */}
                                    <th>Tổng Đơn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.slice(0, visibleCount).map((customer, i) => (
                                        <tr key={customer.id}>
                                            {/* 🚀 Dùng index (i) + 1 làm Số thứ tự */}
                                            <td className="col-id">{i + 1}</td> 
                                            <td className="col-name">{customer.accountName}</td>
                                            <td>{customer.mail}</td>
                                            {/* 🚀 Render số lượng đơn hàng (Đợi Backend trả về) */}
                                            <td>
                                                <span className="badge-orders">
                                                    {customer._count?.carts || 0} đơn
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="empty-state">
                                            {searchTerm 
                                                ? `${t('customers.noMatch')} "${searchTerm}"` 
                                                : t('customers.noCustomers')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {visibleCount < filteredCustomers.length && (
                        <div className="pagination-container">
                            <button onClick={handleShowMore} className="btn-show-more">
                                {t('customers.showMore')} ({filteredCustomers.length - visibleCount}) <FaArrowRight />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Customers;