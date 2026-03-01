import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider'; 
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate'; 
import './Profile.css'; 

const Profile = () => {
    const { auth } = useAuth(); 
    const axiosPrivate = useAxiosPrivate(); 

    // 📦 1. Core Data States
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // 🛠️ 2. Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({}); // Holds the temporary typing data
    const [isSaving, setIsSaving] = useState(false); // Prevents button spamming

    // 🔄 3. Fetch Data (Same as before)
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController(); 

        const fetchProfile = async () => {
            try {
                const response = await axiosPrivate.get('/api/profile', { signal: controller.signal });
                if (isMounted) {
                    setProfileData(response.data);
                    setIsLoading(false);
                }
            } catch (err) {
                if (err.name !== 'CanceledError') {
                    setError('Failed to load profile data.');
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();
        return () => { isMounted = false; controller.abort(); };
    }, [axiosPrivate]);

    // ✍️ 4. Handle Typing in the Inputs
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    // 🚀 5. Handle the Save Action
    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        
        try {
            // Send the temporary editForm data to the backend
            const response = await axiosPrivate.put('/api/profile', editForm);
            
            // If successful, update the main profile data with the fresh DB data
            setProfileData(response.data.user); 
            setIsEditing(false); // Close edit mode!
            
        } catch (err) {
            console.error("Save failed:", err);
            setError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // 🔘 6. Toggle Edit Mode safely
    const toggleEditMode = () => {
        if (!isEditing) {
            // When turning ON edit mode, copy current data into the form
            setEditForm({
                accountName: profileData?.accountName || '',
                firstName: profileData?.firstName || '',
                lastName: profileData?.lastName || '',
                phoneNumber: profileData?.phoneNumber || '',
                gender: profileData?.gender || '',
                birthday: profileData?.birthday ? new Date(profileData.birthday).toISOString().split('T')[0] : ''
            });
        }
        setIsEditing(!isEditing);
    };

    // Helper to determine role name
    const getRoleName = (roles) => {
        if (roles?.includes(5150)) return "Administrator";
        if (roles?.includes(2001)) return "Member";
        return "Guest";
    };

    if (isLoading) return <div className="profile-container"><p>Loading your beauty profile... ✨</p></div>;

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h1 className="profile-title">My Profile 🌟</h1>
                
                {error && <p className="error-msg">⚠️ {error}</p>}

                <div className="profile-avatar">
                    {auth?.accountName ? auth.accountName.charAt(0).toUpperCase() : "U"}
                </div>

                <div className="profile-info">
                    {/* Read-Only Auth Data */}
                    <div className="info-group">
                        <label>Email 📧</label>
                        <p>{profileData?.mail || "No email on file"}</p>
                    </div>
                    
                    <div className="info-group">
                        <label>Account_name 👤</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                name="accountName" 
                                value={editForm.accountName} 
                                onChange={handleInputChange} 
                                className="profile-input"
                            />
                        ) : (
                            <p>{profileData?.accountName || "Not provided"}</p>
                        )}
                    </div>
                    

                    <div className="info-group">
                        <label>Gender 📝</label>
                        {isEditing ? (                        
                            <select
                                type="text" 
                                name="gender" 
                                value={editForm.gender} 
                                onChange={handleInputChange} 
                                className="profile-input"
                            >
                                <option value= "">Select Gender </option>
                                <option value= "Male">Male </option>
                                <option value= "Female">Female </option>
                            </select>
                        ) : (
                            <p>{profileData?.gender || "Not provided"}</p>
                        )}
                    </div>


                    {/* Editable Database Data */}
                    <div className="info-group">
                        <label>First Name 📝</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                name="firstName" 
                                value={editForm.firstName} 
                                onChange={handleInputChange} 
                                className="profile-input"
                            />
                        ) : (
                            <p>{profileData?.firstName || "Not provided"}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Last Name 📝</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                name="lastName" 
                                value={editForm.lastName} 
                                onChange={handleInputChange} 
                                className="profile-input"
                            />
                        ) : (
                            <p>{profileData?.lastName || "Not provided"}</p>
                        )}
                    </div>
                    
                    <div className="info-group">
                        <label>Birthday 🎂</label>
                        {isEditing ? (
                            <input 
                                type="date" 
                                name="birthday" 
                                value={editForm.birthday} 
                                onChange={handleInputChange} 
                                className="profile-input"
                            />
                        ) : (
                            <p>
                                {profileData?.birthday 
                                    ? new Date(profileData.birthday).toLocaleDateString() 
                                    : "Not provided"}
                            </p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Phone Number 📱</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                name="phoneNumber" 
                                value={editForm.phoneNumber} 
                                onChange={handleInputChange} 
                                className="profile-input"
                            />
                        ) : (
                            <p>{profileData?.phoneNumber || "Not provided"}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Account Type 🛡️</label>
                        <p className="role-badge">{getRoleName(auth?.roles)}</p>
                    </div>


                </div>

                {/* Dynamic Action Buttons */}
                <div className="profile-actions">
                    {isEditing ? (
                        <>
                            <button 
                                className="save-btn" 
                                onClick={handleSave} 
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving... ⏳" : "Save Changes 💾"}
                            </button>
                            <button 
                                className="cancel-btn" 
                                onClick={toggleEditMode}
                                disabled={isSaving}
                            >
                                Cancel ❌
                            </button>
                        </>
                    ) : (
                        <button className="edit-profile-btn" onClick={toggleEditMode}>
                            Edit Details ✏️
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;