import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Calendar, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../../../endpoints';
import { getStoredAccessToken } from '../../../../utils/authUtils';

/**
 * AcademicYearSetupModal — Full-screen blocking modal
 * Forces admin to set academic year + semester before doing anything else.
 * This modal cannot be dismissed/closed — only submitting the form proceeds.
 */
function AcademicYearSetupModal({ schoolId, schoolName, onSetupComplete }) {
  const { t } = useTranslation();
  const currentBEYear = String(new Date().getFullYear() + 543);

  const [academicYear, setAcademicYear] = useState(currentBEYear);
  const [semester, setSemester] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!academicYear || !semester) {
      toast.error('กรุณาระบุปีการศึกษาและภาคเรียน');
      return;
    }

    setSaving(true);
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/schools/${schoolId}/setup-academic-year`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          academic_year: academicYear,
          semester: Number(semester),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('ตั้งค่าปีการศึกษาสำเร็จ! ขณะนี้สามารถเพิ่มผู้ใช้งาน ชั้นเรียน และรายวิชาได้แล้ว');
        if (onSetupComplete) onSetupComplete(data);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'ไม่สามารถตั้งค่าปีการศึกษาได้');
      }
    } catch (err) {
      console.error('Setup academic year error:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  // Generate year options: current year -2 to +2
  const yearOptions = [];
  const baseYear = parseInt(currentBEYear);
  for (let y = baseYear - 2; y <= baseYear + 2; y++) {
    yearOptions.push(String(y));
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-purple-950/90 backdrop-blur-xl">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-500 max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col">
        {/* Main card */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/70 rounded-[2rem] shadow-[0_36px_100px_-34px_rgba(79,70,229,0.38)] ring-1 ring-white/30 overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="relative px-8 pt-10 pb-6 text-center shrink-0">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/40 mb-5">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              ตั้งค่าปีการศึกษา
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
              ก่อนเริ่มใช้งานระบบ กรุณาระบุปีการศึกษาและภาคเรียน<br/>
              เพื่อเริ่มต้นการจัดการโรงเรียน
            </p>

            {schoolName && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                {schoolName}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-10 overflow-y-auto flex-1">
            <div className="space-y-5">
              {/* Academic Year */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Calendar className="w-3.5 h-3.5" />
                  ปีการศึกษา (พ.ศ.)
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full h-14 px-6 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-700 font-bold text-sm outline-none transition-all appearance-none cursor-pointer"
                  required
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  ภาคเรียน
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSemester(1)}
                    className={`h-14 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 border-2 ${
                      semester === 1
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className={`w-4 h-4 ${semester === 1 ? 'opacity-100' : 'opacity-30'}`} />
                    ภาคเรียนที่ 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSemester(2)}
                    className={`h-14 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 border-2 ${
                      semester === 2
                        ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/20'
                        : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className={`w-4 h-4 ${semester === 2 ? 'opacity-100' : 'opacity-30'}`} />
                    ภาคเรียนที่ 2
                  </button>
                </div>
              </div>
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-xs text-amber-700 font-medium leading-relaxed">
                <span className="font-black">⚠ สำคัญ:</span> การตั้งค่าปีการศึกษาจำเป็นต้องทำก่อน
                จึงจะสามารถเพิ่มครู นักเรียน ชั้นเรียน และรายวิชาเข้าสู่ระบบได้ 
                สามารถเปลี่ยนปีการศึกษาและภาคเรียนได้ภายหลังในหน้าตั้งค่า
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <GraduationCap className="w-5 h-5" />
                  เริ่มต้นใช้งานระบบ
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AcademicYearSetupModal;
