import { useAuth } from '../features/auth/AuthProvider'; 
import './Profile.css'; // Import the separate CSS file

const Profile = () => {
    const { auth } = useAuth(); // Get auth data from context

    // Helper to determine role name based on ID
    const getRoleName = (roles) => {
        if (roles?.includes(5150)) return "Administrator";
        if (roles?.includes(2001)) return "Member";
        return "Guest";
    };

    return (
        <div className="profile-container">
            <div className="profile-card">
                {/* Header with your Gold Branding */}
                <h1 className="profile-title">My Profile</h1>
                
                <div className="profile-avatar">
                    {/* Display first letter of username as avatar */}
                    {auth?.username ? auth.username.charAt(0).toUpperCase() : "U"}
                </div>

                <div className="profile-info">
                    <div className="info-group">
                        <label>Username</label>
                        <p>{auth?.username || "Unknown User"}</p>
                    </div>
                    
                    <div className="info-group">
                        <label>Account Type</label>
                        <p className="role-badge">{getRoleName(auth?.roles)}</p>
                    </div>

                    <div className="info-group">
                        <label>Access Token Status</label>
                        <p className="status-active">Active</p>
                    </div>
                </div>

                <button className="edit-profile-btn">Edit Details</button>
            </div>
        </div>
    );
};

export default Profile;