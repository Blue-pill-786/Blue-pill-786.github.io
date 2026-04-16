// import { useState, useEffect } from 'react';
// import dayjs from 'dayjs';
// import { useAuth } from '../context/AuthContext';
// import { useNotification } from '../context/NotificationContext';
// import { api } from '../lib/api';

// const TenantProfilePage = () => {
//   const { user } = useAuth();
//   const { notify } = useNotification();

//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [editing, setEditing] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [formData, setFormData] = useState({
//     phone: '',
//     emergencyContact: '',
//     emergencyPhone: '',
//     bloodGroup: 'O+',
//     aadharNumber: '',
//     panNumber: '',
//   });

//   useEffect(() => {
//     loadTenantProfile();
//   }, []);

//   const loadTenantProfile = async () => {
//     try {
//       setLoading(true);
//       setError('');

//       const res = await api.get('/tenant/profile');

//       setProfile(res.data);
//       setFormData({
//         phone: res.data.phone || '',
//         emergencyContact: res.data.emergencyContact || '',
//         emergencyPhone: res.data.emergencyPhone || '',
//         bloodGroup: res.data.bloodGroup || 'O+',
//         aadharNumber: res.data.aadharNumber || '',
//         panNumber: res.data.panNumber || '',
//       });

//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to load profile');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async () => {
//     try {
//       setSaving(true);

//       await api.put('/tenant/profile', formData);

//       notify.success('Profile updated successfully');
//       setEditing(false);

//       await loadTenantProfile();
//     } catch (err) {
//       notify.error('Failed to update profile');
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="text-center py-20 text-slate-400">
//         Loading profile...
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-5xl mx-auto py-8 space-y-6">
      
//       {/* HEADER */}
//       <div className="p-6 rounded-xl bg-slate-900 border border-slate-700">
//         <h1 className="text-2xl font-bold text-white">
//           {profile?.name}
//         </h1>
//         <p className="text-slate-400">{profile?.email}</p>
//       </div>

//       {/* INFO CARDS */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
//         <div>📍 {profile?.property || 'N/A'}</div>
//         <div>
//           📅 {profile?.checkInDate 
//             ? dayjs(profile.checkInDate).format('DD MMM YYYY') 
//             : 'N/A'}
//         </div>
//         <div>
//           🔔 {profile?.leaseEndDate 
//             ? dayjs(profile.leaseEndDate).format('DD MMM YYYY') 
//             : 'N/A'}
//         </div>
//         <div>💰 ₹{profile?.monthlyRent?.toLocaleString() || 0}</div>
//       </div>

//       {/* ERROR */}
//       {error && (
//         <div className="text-red-400 bg-red-900/20 p-3 rounded">
//           {error}
//         </div>
//       )}

//       {/* FORM */}
//       <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 space-y-4">
        
//         <input
//           name="phone"
//           value={formData.phone}
//           onChange={handleChange}
//           disabled={!editing}
//           placeholder="Phone"
//           className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
//         />

//         <input
//           name="emergencyContact"
//           value={formData.emergencyContact}
//           onChange={handleChange}
//           disabled={!editing}
//           placeholder="Emergency Contact"
//           className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
//         />

//         <input
//           name="emergencyPhone"
//           value={formData.emergencyPhone}
//           onChange={handleChange}
//           disabled={!editing}
//           placeholder="Emergency Phone"
//           className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
//         />

//         {/* ACTIONS */}
//         <div className="flex gap-4">
//           {!editing ? (
//             <button
//               onClick={() => setEditing(true)}
//               className="bg-cyan-600 px-4 py-2 rounded text-white"
//             >
//               Edit
//             </button>
//           ) : (
//             <>
//               <button
//                 onClick={handleSave}
//                 disabled={saving}
//                 className="bg-green-600 px-4 py-2 rounded text-white"
//               >
//                 {saving ? 'Saving...' : 'Save'}
//               </button>

//               <button
//                 onClick={() => {
//                   setEditing(false);
//                   loadTenantProfile();
//                 }}
//                 className="bg-gray-600 px-4 py-2 rounded text-white"
//               >
//                 Cancel
//               </button>
//             </>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// };

// export default TenantProfilePage;


import React from "react";

const TenantProfilePage = () => {
  return (
    <div>
      <h1>Tenant Profile Working ✅</h1>
    </div>
  );
};

export default TenantProfilePage;