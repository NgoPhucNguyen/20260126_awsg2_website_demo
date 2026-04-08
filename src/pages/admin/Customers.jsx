import './Customers.css';
import { FaUserTag, FaEnvelope, FaCrown, FaArrowRight } from "react-icons/fa6"; 
import { useState, useEffect } from "react";
import { useAxiosPrivate } from "@/hooks/useAxiosPrivate"; 

// 👇 1. Import the translation hook!
import { useTranslation } from 'react-i18next'; 

const Customers = () => {
    // 👇 2. Initialize the translation function
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
                    setError(t('customers.errorFetch')); // 👈 Translated Error
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        getCustomers();
        return () => controller.abort();
    }, [axiosPrivate, t]); // Added 't' to dependencies

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
                <h2>{t('customers.title')}</h2> {/* 👈 Translated */}
                <p className="admin-subtitle">{t('customers.subtitle')}</p> {/* 👈 Translated */}
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
                                placeholder={t('customers.searchPlaceholder')} /* 👈 Translated */
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
                                    <th>ID</th>
                                    <th><FaUserTag /> {t('customers.colAccount')}</th>
                                    <th><FaEnvelope /> {t('customers.colEmail')}</th>
                                    <th><FaCrown /> {t('customers.colTier')}</th>
                                    <th>{t('customers.colStatus')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.slice(0, visibleCount).map((customer, i) => (
                                        <tr key={customer.id || i}>
                                            <td className="col-id">#{customer.id}</td> 
                                            <td className="col-name">{customer.accountName}</td>
                                            <td>{customer.mail}</td>
                                            <td>
                                                <span className={`badge tier-${customer.tier || 0}`}>
                                                    {t('customers.level')} {customer.tier || 0} {/* 👈 Translated */}
                                                </span>
                                            </td>
                                            <td>
                                                {customer.isActive ? (
                                                    <span className="status-active">• {t('customers.active')}</span>
                                                ) : (
                                                    <span className="status-inactive">• {t('customers.inactive')}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="empty-state">
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