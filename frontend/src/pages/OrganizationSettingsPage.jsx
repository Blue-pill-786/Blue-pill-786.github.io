import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const OrganizationSettingsPage = () => {
  const [orgData, setOrgData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
  });

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMember, setNewMember] = useState({ email: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  // Load organization data and members
  useEffect(() => {
    loadOrgData();
  }, []);

  const loadOrgData = async () => {
    try {
      setLoading(true);
      const [orgRes, membersRes] = await Promise.all([
        api.get('/saas/organization'),
        api.get('/saas/team-members'),
      ]);
      
      setOrgData(orgRes.data.data);
      setMembers(membersRes.data.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load organization data');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgChange = (e) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveOrgData = async () => {
    try {
      setSaving(true);
      await api.put('/saas/organization', orgData);
      setError('');
      alert('Organization details updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.email) {
      setError('Please enter an email address');
      return;
    }

    try {
      setSaving(true);
      const response = await api.post('/saas/invite-member', {
        email: newMember.email,
        role: newMember.role,
      });
      
      // Add new member to list
      setMembers([...members, response.data.data]);
      setNewMember({ email: '', role: 'staff' });
      setError('');
      alert('Invitation sent successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (id) => {
    if (confirm('Are you sure you want to remove this member?')) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Organization Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage your organization and team members</p>
        </div>

        {/* ORGANIZATION INFO */}
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-cyan-100 mb-6">🏢 Organization Information</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Organization Name</label>
                <input
                  type="text"
                  name="name"
                  value={orgData.name}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={orgData.email}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={orgData.phone}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={orgData.city}
                  onChange={handleOrgChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
              <input
                type="text"
                name="state"
                value={orgData.state}
                onChange={handleOrgChange}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition shadow-lg">
              💾 Save Organization Info
            </button>
          </div>
        </div>

        {/* TEAM MEMBERS */}
        <div className="rounded-2xl border border-purple-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-purple-100 mb-6">👥 Team Members</h2>

          {/* ADD MEMBER */}
          <div className="mb-8 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Member</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter email address"
                value={newMember.email}
                onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              <select
                value={newMember.role}
                onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value }))}
                className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option>Admin</option>
                <option>Manager</option>
                <option>Staff</option>
              </select>
              <button
                onClick={handleAddMember}
                disabled={saving}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                {saving ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </div>

          {/* MEMBERS LIST */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Joined</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-white font-semibold">{member.name}</td>
                    <td className="py-3 px-4 text-slate-400">{member.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-sm bg-cyan-500/20 text-cyan-300 font-semibold">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-sm">{member.joinedDate}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-sm bg-emerald-500/20 text-emerald-300 font-semibold">
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded transition text-sm font-semibold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettingsPage;
