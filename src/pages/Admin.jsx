import { useState, useEffect } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Admin.css"; 

const Admin = () => {
    const [users, setUsers] = useState([]); // Initialize as empty array
    const [visibleCount, setVisibleCount] = useState(5); // 👈 Controls "Top 10" logic
    
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let isMounted = true; 
        const controller = new AbortController(); 

        const getCustomer = async () => {
            try {
                const response = await axiosPrivate.get('/api/customer', {
                    signal: controller.signal 
                });
                if (isMounted) {
                    setUsers(response.data);
                }
            } catch (err) {
                if (err.name === 'CanceledError' || err.code === "ERR_CANCELED") {
                    console.log("Request canceled");
                } else {
                    console.error(err);
                    // navigate('/login', { state: { from: location }, replace: true });
                }
            }
        }
        
        getCustomer(); 

        return () => {
            isMounted = false;
            controller.abort();
        }
    }, []);

    // Helper to load more users
    const handleShowMore = () => {
        setVisibleCount(prev => prev + 5); // Load 10 more each click
    };

    return (
        <section className="admin-container">
            <h1>Executive Dashboard</h1>
            <p className="admin-subtitle">Current Member Database</p>

            {users?.length ? (
                <>
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Account Name</th>
                                <th>Email</th>
                                <th>Tier</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* 1. SLICE THE ARRAY to show only 'visibleCount' items */}
                            {users.slice(0, visibleCount).map((user, i) => (
                                <tr key={user.id || i}>
                                    <td style={{color: '#9ca3af'}}>#{user.id}</td> 
                                    
                                    {/* 2. USE CORRECT DB COLUMN NAMES */}
                                    <td style={{fontWeight: 'bold'}}>{user.account_name}</td>
                                    <td>{user.mail}</td>
                                    <td>
                                        <span className="tier-badge">Level {user.tier}</span>
                                    </td>
                                    
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 3. "READ MORE" BUTTON LOGIC */}
                    {visibleCount < users.length && (
                        <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
                            <button 
                                onClick={handleShowMore}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}
                            >
                                Show More ({users.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <p>Loading user data...</p>
            )}

            <div className="admin-footer">
                <Link to="/">Back to Home</Link>
            </div>
        </section>
    );
}

export default Admin;