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
        <div className="admin-customer-page-container admin-customer-fade-in">
            <header className="admin-customer-header">
                <h2 className="admin-customer-title">{t('customers.title')}</h2> 
                <p className="admin-customer-subtitle">{t('customers.subtitle')}</p> 
            </header>

            {error && <div className="admin-customer-error-banner">{error}</div>}

            {isLoading ? (
                <div className="admin-customer-loading-container">
                    <div className="admin-customer-spinner"></div>
                    <p className="admin-customer-loading-text">{t('customers.syncing')}</p>
                </div>
            ) : (
                <>
                    <div className="admin-customer-controls">
                        <div className="admin-customer-search-wrapper">
                            <input 
                                type="text" 
                                placeholder={t('customers.searchPlaceholder')} 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="admin-customer-search-input"
                            />
                        </div>
                    </div>

                    <div className="admin-customer-table-responsive">
                        <table className="admin-customer-table">
                            <thead className="admin-customer-thead">
                                <tr>
                                    <th className="admin-customer-th">STT</th>
                                    <th className="admin-customer-th"><FaUserTag /> {t('customers.colAccount')}</th>
                                    <th className="admin-customer-th"><FaEnvelope /> {t('customers.colEmail')}</th>
                                    <th className="admin-customer-th">Tổng Đơn</th>
                                </tr>
                            </thead>
                            <tbody className="admin-customer-tbody">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.slice(0, visibleCount).map((customer, i) => (
                                        <tr key={customer.id} className="admin-customer-tr">
                                            <td className="admin-customer-td admin-customer-col-id">{i + 1}</td> 
                                            <td className="admin-customer-td admin-customer-col-name">{customer.accountName}</td>
                                            <td className="admin-customer-td admin-customer-col-email">{customer.mail}</td>
                                            <td className="admin-customer-td">
                                                <span className="admin-customer-badge-orders">
                                                    {customer._count?.carts || 0} đơn
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="admin-customer-tr">
                                        <td colSpan="4" className="admin-customer-td admin-customer-empty-state">
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
                        <div className="admin-customer-pagination-container">
                            <button onClick={handleShowMore} className="admin-customer-btn-show-more">
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