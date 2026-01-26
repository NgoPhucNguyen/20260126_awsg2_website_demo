import { useState, useEffect } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { Link } from "react-router-dom";
import "./Admin.css"; // 👈 Import the Executive Styles

const Admin = () => {
    const [users, setUsers] = useState();
    const axiosPrivate = useAxiosPrivate();

    useEffect(() => {
        let isMounted = true; // To avoid setting state on unmounted component
        const controller = new AbortController(); // For cancelling axios requests if needed
        // Fetch users from protected endpoint
        const getUsers = async () => {
            try {
                const response = await axiosPrivate.get('/users', {
                    signal: controller.signal
                });
                isMounted && setUsers(response.data);
            } catch (err) {
                console.error(err);
            }
        }
        
        getUsers(); // Initial call to fetch users

        return () => {
            isMounted = false;
            controller.abort();
        }
    }, [])

    return (
        <section className="admin-container">
            <h1>Executive Dashboard</h1>
            <p className="admin-subtitle">Current Member Database</p>

            {users?.length ? (
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Username</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, i) => (
                            <tr key={i}>
                                {/* Using index as fake ID for visual since mock DB has no IDs */}
                                <td style={{color: '#9ca3af'}}>#{2024 + i}</td> 
                                
                                <td style={{fontWeight: 'bold'}}>{user?.username}</td>
                                
                                <td>
                                    <span style={{
                                        backgroundColor: '#ecfccb', 
                                        color: '#365314', 
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 'bold'
                                    }}>
                                        ACTIVE
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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