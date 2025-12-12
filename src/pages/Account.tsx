import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, MapPin, Edit2, Save, ExternalLink } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AccentButton } from '../components/ui/AccentButton';
import { useApp } from '../context/AppContext';
import { StorageService } from '../services/storage';

export const Account = () => {
  const navigate = useNavigate();
  const { user, setUser, joinPlan } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(user);

  const handleSignOut = () => {
    setUser((prev) => ({ ...prev, planId: null }));
    navigate('/');
  };

  const handleSave = () => {
    setUser(editForm);
    setIsEditing(false);
  };

  const handleJoinPlan = (id: string) => {
    joinPlan(id);
    navigate('/plan');
  };

  const getStatusStyle = (skill: string | null) => {
    if (skill === 'Black Diamond') return 'bg-black text-white';
    if (skill === 'Blue Square') return 'bg-[#0EA5E9]/80 text-white';
    if (skill === 'Green Circle') return 'bg-green-600 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  // Fetch summaries for joined plans
  const joinedPlansData = user.joinedPlans.map(id => {
    const plan = StorageService.getPlan(id);
    return plan ? { id: plan.id, name: plan.metadata.tripName, status: plan.status } : null;
  }).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold text-[#1F2937]">Your Profile</h1>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="flex items-center text-[#0EA5E9] font-semibold hover:text-[#0284c7]"
        >
          {isEditing ? <Save className="w-5 h-5 mr-1" /> : <Edit2 className="w-5 h-5 mr-1" />}
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 border-gray-200">Personal Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Name</label>
              {isEditing ? (
                <input 
                  className="w-full p-2 border rounded"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              ) : (
                <p className="text-lg font-medium">{user.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Home Region / Address</label>
              {isEditing ? (
                 <input 
                  className="w-full p-2 border rounded"
                  value={editForm.address}
                  onChange={e => setEditForm({...editForm, address: e.target.value})}
                  placeholder="e.g. Denver, CO"
                />
              ) : (
                <p className="text-lg font-medium flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                  {user.address || 'Not set'}
                </p>
              )}
            </div>
          </div>

          {user.planId && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-semibold mb-1">Active Session</p>
              <div className="flex justify-between items-center">
                <span className="font-mono text-lg">{user.planId}</span>
                <AccentButton onClick={() => navigate('/plan')} className="py-2 px-4 text-sm">
                  Go to Plan
                </AccentButton>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 border-gray-200">Ski Preferences</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Skill Level:</span>
              {isEditing ? (
                 <select 
                   className="p-1 border rounded"
                   value={editForm.skill || ''}
                   onChange={e => setEditForm({...editForm, skill: e.target.value})}
                 >
                   <option>Green Circle</option>
                   <option>Blue Square</option>
                   <option>Black Diamond</option>
                 </select>
              ) : (
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusStyle(user.skill)}`}>
                  {user.skill}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Pass Status:</span>
              {isEditing ? (
                 <select 
                   className="p-1 border rounded"
                   value={editForm.pass || ''}
                   onChange={e => setEditForm({...editForm, pass: e.target.value})}
                 >
                   <option>None</option>
                   <option>Epic Pass</option>
                   <option>Ikon Pass</option>
                 </select>
              ) : (
                <span className="font-medium text-[#1F2937]">{user.pass}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Budget:</span>
              {isEditing ? (
                 <select 
                   className="p-1 border rounded"
                   value={editForm.budget || ''}
                   onChange={e => setEditForm({...editForm, budget: e.target.value})}
                 >
                   <option>$</option>
                   <option>$$</option>
                   <option>$$$</option>
                 </select>
              ) : (
                <span className="font-medium text-[#1F2937]">{user.budget}</span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      <h2 className="text-2xl font-bold mb-4 text-[#1F2937]">My Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {joinedPlansData.length > 0 ? joinedPlansData.map((plan: any) => (
          <div key={plan.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition">
            <div>
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <p className="text-xs text-gray-500 font-mono">{plan.id}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${plan.status === 'decided' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {plan.status}
              </span>
            </div>
            <button 
              onClick={() => handleJoinPlan(plan.id)}
              className="p-2 text-gray-400 hover:text-[#0EA5E9]"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        )) : (
          <p className="text-gray-500 italic">You haven't joined any plans yet.</p>
        )}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={handleSignOut}
          className="text-red-500 hover:text-red-700 transition duration-150"
        >
          <LogIn className="w-5 h-5 inline mr-2" />
          Sign Out / Leave Plan
        </button>
      </div>
    </div>
  );
};
