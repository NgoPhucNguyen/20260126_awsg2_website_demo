import { useState, useEffect } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate"; 
import { FaUserTag, FaEnvelope, FaCrown, FaArrowRight } from "react-icons/fa6"; 
import './Users.css'
const Users = () => {
    // --- STATE ---
    const [users, setUsers] = useState([]); 
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(""); 
    const [visibleCount, setVisibleCount] = useState(5); 

    const axiosPrivate = useAxiosPrivate();

    // --- EFFECT ---
    useEffect(() => {
        const controller = new AbortController(); 
        const getCustomers = async () => {
            try {
                setError("");
                setIsLoading(true);
                const response = await axiosPrivate.get('/api/customer', {
                    signal: controller.signal
                });
                setUsers(response.data);
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    console.error("Fetch Error:", err);
                    setError("Failed to load user database.");
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };
        getCustomers();
        return () => controller.abort();
    }, [axiosPrivate]); 

    const handleShowMore = () => setVisibleCount(prev => prev + 5);

    return (
        <div className="fade-in">
            <header className="dashboard-header">
                <h2>User Management</h2>
                <p className="admin-subtitle">View and manage member accounts</p>
            </header>

            {error && <div className="error-banner">⚠️ {error}</div>}

            {isLoading ? (
                <div className="loading-container"><div className="spinner"></div><p>Syncing data...</p></div>
            ) : (
                <>
                    <div className="table-responsive">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th><FaUserTag /> Account</th>
                                    <th><FaEnvelope /> Email</th>
                                    <th><FaCrown /> Tier</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.slice(0, visibleCount).map((user, i) => (
                                        <tr key={user.id || i}>
                                            <td className="col-id">#{user.id}</td> 
                                            <td className="col-name">{user.account_name}</td>
                                            <td>{user.mail}</td>
                                            <td><span className={`badge tier-${user.tier}`}>Level {user.tier}</span></td>
                                            <td><span className="status-active">• Active</span></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="empty-state">No users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {visibleCount < users.length && (
                        <div className="pagination-container">
                            <button onClick={handleShowMore} className="btn-show-more">
                                Show More ({users.length - visibleCount}) <FaArrowRight />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Users;