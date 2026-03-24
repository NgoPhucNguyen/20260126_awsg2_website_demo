// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider'; 
import { useAxiosPrivate } from '@/hooks/useAxiosPrivate'; 
import './Profile.css'; 

const Profile = () => {
    const { auth } = useAuth(); 
    const axiosPrivate = useAxiosPrivate(); 

    // 📦 1. Trạng thái Dữ liệu
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // 🛠️ 2. Trạng thái Giao diện & Chỉnh sửa
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'address'
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ address: {} }); 
    const [isSaving, setIsSaving] = useState(false); 


    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    // 🔄 3. Lấy dữ liệu
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
                    setError('Không thể tải thông tin hồ sơ.');
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();
        return () => { isMounted = false; controller.abort(); };
    }, [axiosPrivate]);

    useEffect(() => {
        if (isEditing && provinces.length === 0) {
            fetch('https://provinces.open-api.vn/api/p/')
                .then(res => res.json())
                .then(data => setProvinces(data))
                .catch(err => console.error("Lỗi tải Tỉnh/Thành:", err));
        }
    }, [isEditing, provinces.length]);

    // ✍️ 4. Xử lý nhập liệu chung
    const handleGeneralChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    // 🎂 Xử lý định dạng ngày sinh DD/MM/YYYY
    const handleBirthdayChange = (e) => {
        // Chỉ cho phép nhập số
        let value = e.target.value.replace(/\D/g, '');
        
        // Cắt tối đa 8 số (DDMMYYYY)
        if (value.length > 8) value = value.slice(0, 8);
        
        // Tự động chèn dấu '/'
        if (value.length > 4) {
            value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        } else if (value.length > 2) {
            value = `${value.slice(0, 2)}/${value.slice(2)}`;
        }
        
        setEditForm(prev => ({ ...prev, birthday: value }));
    };

    // 📍 5. Xử lý nhập liệu Địa chỉ & Tự động nối chuỗi fullAddress
    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => {
            const updatedAddress = { ...prev.address, [name]: value };
            
            // Tự động ghép chuỗi fullAddress (Lọc bỏ các giá trị trống)
            const parts = [
                updatedAddress.streetAddress, 
                updatedAddress.ward, 
                updatedAddress.district, 
                updatedAddress.province
            ].filter(Boolean);
            
            updatedAddress.fullAddress = parts.join(', ');

            return { ...prev, address: updatedAddress };
        });
    };

    const handleProvinceChange = async (e) => {
        // We need both the Name (to save to DB) and the Code (to fetch districts)
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provinceName = selectedOption.text;
        const provinceCode = selectedOption.value;

        // Reset District and Ward when Province changes
        setEditForm(prev => ({
            ...prev,
            address: { ...prev.address, province: provinceName, district: '', ward: '', fullAddress: '' }
        }));
        setWards([]); // Clear old wards

        if (provinceCode) {
            // Fetch Districts for this specific Province
            const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
            const data = await res.json();
            setDistricts(data.districts);
        } else {
            setDistricts([]);
        }
    };

    // 3. Specialized Handler for District Change
    const handleDistrictChange = async (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const districtName = selectedOption.text;
        const districtCode = selectedOption.value;

        setEditForm(prev => ({
            ...prev,
            address: { ...prev.address, district: districtName, ward: '', fullAddress: '' }
        }));

        if (districtCode) {
            // Fetch Wards for this specific District
            const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await res.json();
            setWards(data.wards);
        } else {
            setWards([]);
        }
    };

    // 4. Handle Ward Change
    const handleWardChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const wardName = selectedOption.text;
        
        setEditForm(prev => ({
            ...prev,
            address: { ...prev.address, ward: wardName }
        }));
    };

    // 🚀 6. Lưu dữ liệu
    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        
        try {
            // 1. Định dạng lại ngày sinh cho Database
            let finalBirthday = editForm.birthday;
            if (finalBirthday && finalBirthday.length === 10) {
                const [day, month, year] = finalBirthday.split('/');
                finalBirthday = `${year}-${month}-${day}`;
            }

            // 2. 🛡️ BẢO VỆ ĐỊA CHỈ (ADDRESS PROTECTION)
            // Lấy toàn bộ dữ liệu form hiện tại
            let payloadToSave = { ...editForm, birthday: finalBirthday };

            // Kiểm tra xem người dùng có thực sự điền địa chỉ không?
            // Nếu phường/xã hoặc tỉnh thành trống, nghĩa là địa chỉ chưa hoàn thiện.
            if (!payloadToSave.address.province || !payloadToSave.address.district || !payloadToSave.address.ward) {
                // Xóa hẳn phần address khỏi payload gửi đi
                // Prisma sẽ bỏ qua và không tạo bảng Address rác!
                delete payloadToSave.address; 
            }

            // 3. Gửi payload đã được làm sạch lên Server
            const response = await axiosPrivate.put('/api/profile', payloadToSave);
            
            // Cập nhật lại giao diện với dữ liệu mới nhất từ Server
            setProfileData(response.data.user); 
            setIsEditing(false); 
            
        } catch (err) {
            console.error("Save failed:", err);
            setError(err.response?.data?.message || 'Lưu thông tin thất bại. Vui lòng kiểm tra lại.');
        } finally {
            setIsSaving(false);
        }
    };

    // 🔘 7. Bật/Tắt chế độ chỉnh sửa
    const toggleEditMode = () => {
        if (!isEditing) {
            // Chuyển đổi YYYY-MM-DD từ DB sang DD/MM/YYYY cho form
            let formattedBirthday = '';
            if (profileData?.birthday) {
                const d = new Date(profileData.birthday);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                formattedBirthday = `${day}/${month}/${year}`;
            }

            setEditForm({
                accountName: profileData?.accountName || '',
                firstName: profileData?.firstName || '',
                lastName: profileData?.lastName || '',
                phoneNumber: profileData?.phoneNumber || '',
                gender: profileData?.gender || '',
                birthday: formattedBirthday, // <-- Định dạng DD/MM/YYYY cho input
                skinProfile: profileData?.skinProfile || '',
                address: {
                    // ... (giữ nguyên phần address)
                }
            });
        }
        setIsEditing(!isEditing);
    };

    const getRoleName = (roles) => {
        if (roles?.includes(5150)) return "Quản trị viên";
        if (roles?.includes(2001)) return "Khách hàng thành viên";
        return "Tài khoản khách";
    };

    if (isLoading) return <div className="profile-wrapper"><p className="profile-text-loading">Đang đồng bộ dữ liệu hồ sơ...</p></div>;

    return (
        <div className="profile-wrapper">
            <div className="profile-dashboard-card">
                
                <div className="profile-header-section">
                    <div className="profile-avatar-circle">
                        {auth?.accountName ? auth.accountName.charAt(0).toUpperCase() : "K"}
                    </div>
                    <div className="profile-header-text">
                        <h1 className="profile-heading-main">Hồ Sơ Cá Nhân</h1>
                        <p className="profile-heading-sub">Quản lý thông tin và thiết lập địa chỉ giao hàng mặc định</p>
                    </div>
                </div>
                
                {error && <div className="profile-alert-error">{error}</div>}

                {/* 🗂️ HỆ THỐNG TAB NỘI ĐIỀU HƯỚNG */}
                <div className="profile-tab-navigation">
                    <button 
                        className={`profile-tab-btn ${activeTab === 'general' ? 'profile-tab-btn-active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        Thông Tin Chung
                    </button>
                    <button 
                        className={`profile-tab-btn ${activeTab === 'address' ? 'profile-tab-btn-active' : ''}`}
                        onClick={() => setActiveTab('address')}
                    >
                        Sổ Địa Chỉ
                    </button>
                </div>

                {/* 📝 NỘI DUNG TAB: THÔNG TIN CHUNG */}
                {activeTab === 'general' && (
                    <div className="profile-form-grid">
                        <div className="profile-input-group">
                            <label className="profile-input-label">Địa chỉ Email</label>
                            <p className="profile-value-static">{profileData?.mail || "Chưa cập nhật"}</p>
                        </div>
                        
                        <div className="profile-input-group">
                            <label className="profile-input-label">Tên tài khoản</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    name="accountName" 
                                    value={editForm.accountName} 
                                    onChange={handleGeneralChange} 
                                    className="profile-input-field" 
                                    maxLength={15}
                                    placeholder="Tối đa 15 ký tự"    
                                />

                            ) : (
                                <p className="profile-value-static">{profileData?.accountName || "Chưa cập nhật"}</p>
                            )}
                        </div>
                        
                        <div className="profile-input-group">
                            <label className="profile-input-label">Giới tính</label>
                            {isEditing ? (                        
                                <select name="gender" value={editForm.gender} onChange={handleGeneralChange} className="profile-input-field profile-input-select">
                                    <option value="">Chọn giới tính</option>
                                    <option value="Male">Nam</option>
                                    <option value="Female">Nữ</option>
                                </select>
                            ) : (
                                <p className="profile-value-static">{profileData?.gender === "Male" ? "Nam" : profileData?.gender === "Female" ? "Nữ" : "Chưa xác định"}</p>
                            )}
                        </div>

                        <div className="profile-input-group">
                            <label className="profile-input-label">Họ và tên đệm</label>
                            {isEditing ? (
                                <input type="text" name="firstName" value={editForm.firstName} onChange={handleGeneralChange} className="profile-input-field" maxLength={20} placeholder="Tối đa 20 ký tự" />
                            ) : (
                                <p className="profile-value-static">{profileData?.firstName || "Chưa cập nhật"}</p>
                            )}
                        </div>

                        <div className="profile-input-group">
                            <label className="profile-input-label">Tên</label>
                            {isEditing ? (
                                <input type="text" name="lastName" value={editForm.lastName} onChange={handleGeneralChange} className="profile-input-field" maxLength={20} placeholder="Tối đa 20 ký tự" />
                            ) : (
                                <p className="profile-value-static">{profileData?.lastName || "Chưa cập nhật"}</p>
                            )}
                        </div>
                        
                        <div className="profile-input-group">
                            <label className="profile-input-label">Ngày sinh</label>
                            {isEditing ? (
                                <input 
                                    type="text" /* 🚀 BẮT BUỘC: Đổi thành text để gõ tay */
                                    name="birthday" 
                                    value={editForm.birthday} 
                                    onChange={handleBirthdayChange} /* 🚀 BẮT BUỘC: Gọi hàm xử lý DD/MM/YYYY */
                                    className="profile-input-field" 
                                    placeholder="DD/MM/YYYY" /* 💡 Thêm gợi ý cho user */
                                    maxLength={10} /* 🛡️ Ngăn gõ quá dài */
                                />
                            ) : (
                                <p className="profile-value-static">
                                    {profileData?.birthday ? new Date(profileData.birthday).toLocaleDateString('vi-VN') : "Chưa cập nhật"}
                                </p>
                            )}
                        </div>

                        <div className="profile-input-group">
                            <label className="profile-input-label">Số điện thoại liên hệ</label>
                            {isEditing ? (
                                <input type="tel" name="phoneNumber" value={editForm.phoneNumber} onChange={handleGeneralChange} className="profile-input-field" maxLength={15} placeholder="Tối đa 15 ký tự" />
                            ) : (
                                <p className="profile-value-static">{profileData?.phoneNumber || "Chưa cập nhật"}</p>
                            )}
                        </div>

                        <div className="profile-input-group">
                            <label className="profile-input-label">Hạng thành viên</label>
                            <div className="profile-badge-wrapper">
                                <span className="profile-badge-role">{getRoleName(auth?.roles)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 📍 NỘI DUNG TAB: SỔ ĐỊA CHỈ */}
                {activeTab === 'address' && (
                    <div className="profile-form-grid">
                        <div className="profile-input-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="profile-input-label">Địa chỉ hoàn chỉnh</label>
                            <p className="profile-value-static profile-value-highlight">
                                {isEditing ? editForm.address.fullAddress || "Nhập thông tin bên dưới để tự động tạo địa chỉ..." : profileData?.address?.fullAddress || "Chưa thiết lập địa chỉ giao hàng mặc định"}
                            </p>
                        </div>

                        {/* 📍 TỈNH / THÀNH PHỐ */}
                        <div className="profile-input-group">
                            <label className="profile-input-label">Tỉnh / Thành phố</label>
                            {isEditing ? (
                                <select 
                                    className="profile-input-field profile-input-select"
                                    onChange={handleProvinceChange}
                                    // We use a dummy value logic here because we save the Name to DB, but need the Code for the API. 
                                    // In a real production app, you might save the Code to your DB instead!
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- Chọn Tỉnh/Thành phố --</option>
                                    {provinces.map(p => (
                                        <option key={p.code} value={p.code}>{p.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="profile-value-static">{profileData?.address?.province || "Chưa cập nhật"}</p>
                            )}
                        </div>

                        {/* 📍 QUẬN / HUYỆN */}
                        <div className="profile-input-group">
                            <label className="profile-input-label">Quận / Huyện</label>
                            {isEditing ? (
                                <select 
                                    className="profile-input-field profile-input-select"
                                    onChange={handleDistrictChange}
                                    disabled={districts.length === 0}
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- Chọn Quận/Huyện --</option>
                                    {districts.map(d => (
                                        <option key={d.code} value={d.code}>{d.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="profile-value-static">{profileData?.address?.district || "Chưa cập nhật"}</p>
                            )}
                        </div>

                        {/* 📍 PHƯỜNG / XÃ */}
                        <div className="profile-input-group">
                            <label className="profile-input-label">Phường / Xã</label>
                            {isEditing ? (
                                <select 
                                    className="profile-input-field profile-input-select"
                                    onChange={handleWardChange}
                                    disabled={wards.length === 0}
                                    defaultValue=""
                                >
                                    <option value="" disabled>-- Chọn Phường/Xã --</option>
                                    {wards.map(w => (
                                        <option key={w.code} value={w.code}>{w.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="profile-value-static">{profileData?.address?.ward || "Chưa cập nhật"}</p>
                            )}
                        </div>

                        {/* 🏠 SỐ NHÀ, TÊN ĐƯỜNG (Keep this as a text input!) */}
                        <div className="profile-input-group">
                            <label className="profile-input-label">Số nhà, Tên đường</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    name="streetAddress" 
                                    value={editForm.address.streetAddress} 
                                    onChange={handleAddressChange} // Uses your original handleAddressChange
                                    className="profile-input-field" 
                                    placeholder="Ví dụ: 123 Đường Lê Lợi" 
                                    maxLength={150}
                                    disabled={!editForm.address.ward} // Disable until they pick a ward!
                                />
                            ) : (
                                <p className="profile-value-static">{profileData?.address?.streetAddress || "Chưa cập nhật"}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 🕹️ VÙNG NÚT BẤM (CHUNG CHO CẢ 2 TAB) */}
                <div className="profile-action-area">
                    {isEditing ? (
                        <>
                            <button className="profile-btn-action profile-btn-secondary" onClick={toggleEditMode} disabled={isSaving}>
                                Hủy thao tác
                            </button>
                            <button className="profile-btn-action profile-btn-primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Đang cập nhật..." : "Lưu toàn bộ thay đổi"}
                            </button>
                        </>
                    ) : (
                        <button className="profile-btn-action profile-btn-edit" onClick={toggleEditMode}>
                            {activeTab === 'general' ? 'Chỉnh sửa thông tin' : 'Cập nhật địa chỉ'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;