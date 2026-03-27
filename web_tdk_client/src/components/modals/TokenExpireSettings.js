import React, { useState, useEffect } from 'react';
import { ChevronDown, Save, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../endpoints';
import { toast } from 'react-toastify';

function TokenExpireSettings({ currentUser, schoolId }) {
  const [settings, setSettings] = useState({
    // owner is intentionally present for display but must NOT be editable from the UI
    owner: 45,
    admin: 30,
    teacher: 30,
    student: 30
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTokenSettings();
  }, [schoolId]);

  const fetchTokenSettings = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/owner/schools/${schoolId}/token-settings`);
      if (res.ok) {
        const data = await res.json();
        // keep owner in state for read-only display, but owner is managed in code only
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch token settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send editable roles to the API — do NOT send `owner` (owner is configured in code only)
      const payload = {
        admin: settings.admin,
        teacher: settings.teacher,
        student: settings.student
      };

      const res = await fetch(`${API_BASE_URL}/owner/schools/${schoolId}/token-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success('บันทึกการตั้งค่าอายุ Token เรียบร้อยแล้ว');
        // reload to reflect server-side owner default (owner is code-controlled)
        fetchTokenSettings();
      } else {
        toast.error('ไม่สามารถบันทึกการตั้งค่าได้');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (role, value) => {
    setSettings(prev => ({
      ...prev,
      [role]: parseInt(value) || 0
    }));
  };

  // Owner is intentionally omitted from the editable roles list — configured in code only
  const roles = [
    { id: 'admin', label: 'Admin (ผู้บริหาร)', color: 'red' },
    { id: 'teacher', label: 'Teacher (ครู)', color: 'blue' },
    { id: 'student', label: 'Student (นักเรียน)', color: 'green' }
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-900 mb-2">ตั้งค่าอายุ Token</h4>
          <p className="text-sm text-blue-700">
            กำหนดระยะเวลาที่ Token จะหมดอายุสำหรับแต่ละบทบาท (เป็นนาที)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Read-only owner info (configured in code only) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <label className="block text-sm font-bold text-slate-700 mb-3">Owner (เจ้าของระบบ)</label>
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">{settings.owner} นาที</div>
            <div className="text-xs text-slate-500">(ตั้งค่าได้จากโค้ดเท่านั้น)</div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{settings.owner} นาที = {Math.round(settings.owner / 60 * 10) / 10} ชั่วโมง</p>
        </div>

        {roles.map(role => (
          <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-6">
            <label className="block text-sm font-bold text-slate-700 mb-3">
              {role.label}
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="1440"
                value={settings[role.id]}
                onChange={(e) => handleChange(role.id, e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">
                นาที
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {settings[role.id]} นาที = {Math.round(settings[role.id] / 60 * 10) / 10} ชั่วโมง
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
        <button
          onClick={fetchTokenSettings}
          disabled={loading}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

export default TokenExpireSettings;
