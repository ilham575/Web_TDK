import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { X, BookOpen, Target, CreditCard, Percent, Save, Trash2, Info } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';

function SubjectManagementModal({ isOpen, onClose, onSave, subject, currentSchoolId }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject_type: 'main',
    credits: '',
    activity_percentage: '',
    max_collected_score: 100,
    max_exam_score: 100
  });
  const [saving, setSaving] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);

  // Reset form when modal opens/closes or subject changes
  useEffect(() => {
    if (isOpen) {
      setCurrentSubject(subject);
      if (subject) {
        // Editing existing subject
        setFormData({
          name: subject.name || '',
          code: subject.code || '',
          subject_type: subject.subject_type || 'main',
          credits: subject.credits || '',
          activity_percentage: subject.activity_percentage || '',
          max_collected_score: subject.max_collected_score || 100,
          max_exam_score: subject.max_exam_score || 100
        });
      } else {
        // Creating new subject
        setFormData({
          name: '',
          code: '',
          subject_type: 'main',
          credits: '',
          activity_percentage: '',
          max_collected_score: 100,
          max_exam_score: 100
        });
      }
    }
  }, [isOpen, subject]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อรายวิชา');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const method = currentSubject ? 'PATCH' : 'POST';
      const url = currentSubject
        ? `${API_BASE_URL}/subjects/${currentSubject.id}`
        : `${API_BASE_URL}/subjects`;

      const submitData = {
        ...formData,
        school_id: currentSchoolId,
        credits: formData.credits ? parseInt(formData.credits) : null,
        activity_percentage: formData.activity_percentage ? parseInt(formData.activity_percentage) : null,
        max_collected_score: formData.max_collected_score ? parseInt(formData.max_collected_score) : 100,
        max_exam_score: formData.max_exam_score ? parseInt(formData.max_exam_score) : 100
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || 'เกิดข้อผิดพลาดในการบันทึก');
      } else {
        toast.success(currentSubject ? 'แก้ไขรายวิชาสำเร็จ' : 'สร้างรายวิชาสำเร็จ');
        onSave();
        onClose();
      }
    } catch (err) {
      console.error('Error saving subject:', err);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentSubject ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                {currentSubject ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่'}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">
                SUBJECT MANAGEMENT
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 px-1">
                <Info className="w-3.5 h-3.5" />
                ข้อมูลพื้นฐานรายวิชา
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                    ชื่อรายวิชา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="เช่น ภาษาไทย"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                    รหัสวิชา
                  </label>
                  <input
                    className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="เช่น ท11101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                    ประเภทรายวิชา
                  </label>
                  <div className="relative">
                    <select
                      className="w-full h-12 pl-5 pr-10 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer"
                      value={formData.subject_type}
                      onChange={(e) => setFormData({...formData, subject_type: e.target.value})}
                    >
                      <option value="main">📖 รายวิชาหลัก</option>
                      <option value="activity">🎯 รายวิชากิจกรรม</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {formData.subject_type === 'main' ? (
                  <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-300">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                      หน่วยกิต
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-12 pl-10 pr-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                        type="number"
                        value={formData.credits}
                        onChange={(e) => setFormData({...formData, credits: e.target.value})}
                        placeholder="0.0"
                        min="0"
                        step="0.5"
                      />
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 opacity-50" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-300">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                      สัดส่วนคะแนนกิจกรรม (%)
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-12 pl-10 pr-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                        type="number"
                        value={formData.activity_percentage}
                        onChange={(e) => setFormData({...formData, activity_percentage: e.target.value})}
                        placeholder="100"
                        min="0"
                        max="100"
                      />
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 opacity-50" />
                    </div>
                  </div>
                )}
              </div>

              {/* Score Settings */}
              <div className="pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">
                  <Target className="w-3.5 h-3.5" />
                  การตั้งค่าคะแนนเต็ม
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.subject_type === 'main' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                          คะแนนเต็ม (คะแนนเก็บ)
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                          type="number"
                          value={formData.max_collected_score}
                          onChange={(e) => setFormData({...formData, max_collected_score: e.target.value})}
                          placeholder="100"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                          คะแนนเต็ม (คะแนนสอบ)
                        </label>
                        <input
                          className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                          type="number"
                          value={formData.max_exam_score}
                          onChange={(e) => setFormData({...formData, max_exam_score: e.target.value})}
                          placeholder="100"
                          min="1"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                        คะแนนเต็ม (คะแนนดิบทั้งหมด)
                      </label>
                      <input
                        className="w-full h-12 px-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all placeholder:text-slate-300"
                        type="number"
                        value={formData.max_collected_score}
                        onChange={(e) => setFormData({...formData, max_collected_score: e.target.value, max_exam_score: 0})}
                        placeholder="100"
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-2xl p-4 flex items-start gap-3 border border-amber-100/50">
              <Info className="w-4 h-4 text-amber-500 mt-0.5" />
              <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed italic">
                * รายวิชาจะถูกสร้างภายใต้โรงเรียนของคุณโดยอัตโนมัติ คุณสามารถเพิ่มครูผู้สอนและจัดการชั้นเรียนได้ที่หน้าจัดการรายวิชา
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex gap-3">
            <button 
              type="button" 
              className="flex-1 h-12 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm transition-all active:scale-95 border border-slate-100 shadow-sm"
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className={`flex-[2] h-12 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400 ${
                currentSubject ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {currentSubject ? 'อัปเดตข้อมูล' : 'สร้างรายวิชาใหม่'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubjectManagementModal;
