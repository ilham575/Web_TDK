import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loading from '../Loading';
import ChangePasswordModal from '../ChangePasswordModal';
import ClassroomDetailModal from '../ClassroomDetailModal';
import { API_BASE_URL } from '../../endpoints';
import { fetchCurrentUser, hasSessionMarker } from '../../../utils/authUtils';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [teacherHomerooms, setTeacherHomerooms] = useState([]);
  const [teacherClassrooms, setTeacherClassrooms] = useState({});
  const [loadingHomerooms, setLoadingHomerooms] = useState(false);
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [loadingGradeLevels, setLoadingGradeLevels] = useState(false);
  const [classroomStudentCounts, setClassroomStudentCounts] = useState({});

  // Refresh student count when modal opens
  useEffect(() => {
    if (showClassroomModal && selectedClassroomId) {
      fetch(`${API_BASE_URL}/classrooms/${selectedClassroomId}/students`)
        .then(res => res.json())
        .then(students => {
          setClassroomStudentCounts(prev => ({ ...prev, [selectedClassroomId]: Array.isArray(students) ? students.length : 0 }));
        })
        .catch(() => {
          setClassroomStudentCounts(prev => ({ ...prev, [selectedClassroomId]: 0 }));
        });
    }
  }, [showClassroomModal, selectedClassroomId]);

  useEffect(() => {
    if (!hasSessionMarker()) { navigate('/signin'); return; }

    fetchCurrentUser()
      .then(data => {
        setUser(data);
        setEditData({
          full_name: data.full_name || '',
          email: data.email || '',
          grade_level: data.grade_level || ''
        });
        // resolve school name if needed
        if (data.school_id) {
          fetch(`${API_BASE_URL}/schools/`)
            .then(res => res.json())
            .then(schools => {
              const school = schools.find(s => s.id === data.school_id);
              if (school) setSchoolName(school.name);
            })
            .catch(() => {});
        }
          // If teacher, fetch homeroom assignments and classrooms
          if (data.role === 'teacher') {
            setLoadingHomerooms(true);
            fetch(`${API_BASE_URL}/homeroom/?school_id=${data.school_id}`)
              .then(res => res.json())
              .then(homerooms => {
                // Filter for this teacher only
                const assigned = homerooms.filter(h => h.teacher_id === data.id);
                setTeacherHomerooms(assigned || []);
                // For each assigned grade_level, fetch classrooms
                assigned.forEach(hr => {
                  fetch(`${API_BASE_URL}/classrooms?school_id=${data.school_id}&grade_level=${encodeURIComponent(hr.grade_level)}`)
                    .then(res => res.json())
                    .then(classrooms => {
                      setTeacherClassrooms(prev => ({ ...prev, [hr.grade_level]: classrooms }));
                      // Fetch actual student counts for each classroom
                      classrooms.forEach(classroom => {
                        fetch(`${API_BASE_URL}/classrooms/${classroom.id}/students`)
                          .then(res => res.json())
                          .then(students => {
                            // Filter out deleted students (is_active === false)
                            const activeStudents = Array.isArray(students) ? students.filter(s => s.is_active !== false) : [];
                            setClassroomStudentCounts(prev => ({ ...prev, [classroom.id]: activeStudents.length }));
                          })
                          .catch(() => {
                            setClassroomStudentCounts(prev => ({ ...prev, [classroom.id]: 0 }));
                          });
                      });
                    })
                    .catch(() => {
                      setTeacherClassrooms(prev => ({ ...prev, [hr.grade_level]: [] }));
                    });
                });
              })
              .catch(() => {})
              .finally(() => setLoadingHomerooms(false));
          }
        // If admin/teacher, fetch available grade levels for dropdown
        if (data.role === 'admin' || data.role === 'teacher') {
          setLoadingGradeLevels(true);
          fetch(`${API_BASE_URL}/homeroom/grade-levels?school_id=${data.school_id}`)
            .then(res => res.json())
            .then(g => setGradeLevels(g || []))
            .catch(() => setGradeLevels([]))
            .finally(() => setLoadingGradeLevels(false));
        }
      })
      .catch(() => { navigate('/signin'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        full_name: editData.full_name,
        email: editData.email || null
      };
      
      // Missing: do NOT allow students to update their grade_level from UI (server already enforced)
      // Only add grade_level to payload if the user is not a student and grade_level was modified
      if ((user.role === 'admin' || user.role === 'teacher') && editData.grade_level !== undefined) {
        payload.grade_level = editData.grade_level;
      }

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setEditData({
          full_name: updated.full_name || '',
          email: updated.email || '',
          grade_level: updated.grade_level || ''
        });
        setIsEditing(false);
        toast.success('บันทึกข้อมูลสำเร็จ');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'ไม่สามารถบันทึกข้อมูล');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Loading />;

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-blue-50/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้</h1>
        <button 
          onClick={() => navigate('/signin')}
          className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
        >
          ไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );

  // Helper functions
  const initials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'teacher': return '👨‍🏫';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'teacher': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'student': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'ครูผู้สอน';
      case 'student': return 'นักเรียน';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-blue-50/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-12 text-center text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl pointer-events-none">
            {getRoleIcon(user.role)}
          </div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-lg border-4 border-emerald-500/30">
              {initials(user.full_name || user.username)}
            </div>
            <h1 className="text-3xl font-bold mb-2">โปรไฟล์ของฉัน</h1>
            <p className="text-emerald-50 opacity-90">ข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field: Full Name */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
              <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">👤</div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ชื่อเต็ม</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editData.full_name}
                    onChange={(e) => handleEditChange('full_name', e.target.value)}
                  />
                ) : (
                  <div className="text-lg font-bold text-slate-700 truncate">{user.full_name}</div>
                )}
              </div>
            </div>

            {/* Field: Username */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50 opacity-80">
              <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">🆔</div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ชื่อผู้ใช้</label>
                <div className="text-lg font-bold text-slate-500 truncate">{user.username}</div>
                <span className="text-[10px] text-slate-400 font-medium italic">(อ่านอย่างเดียว)</span>
              </div>
            </div>

            {/* Field: Email */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
              <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">📧</div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  อีเมล {isEditing && <span className="text-slate-400 normal-case">(ถ้ามี)</span>}
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="example@mail.com"
                    value={editData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                  />
                ) : (
                  <div className="text-lg font-bold text-slate-700 truncate">{user.email || 'ไม่ได้ระบุ'}</div>
                )}
              </div>
            </div>

            {/* Field: Role */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
              <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">{getRoleIcon(user.role)}</div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">บทบาท</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClass(user.role)}`}>
                  {getRoleText(user.role)}
                </span>
              </div>
            </div>

            {/* Field: School */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
              <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">🏫</div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">โรงเรียน</label>
                <div className="text-lg font-bold text-slate-700 truncate">{schoolName || 'ไม่ระบุ'}</div>
              </div>
            </div>

            {/* Teacher: Homeroom assignments */}
            {user.role === 'teacher' && (
              <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
                <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">🏷️</div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ครูประจำชั้น</label>
                  <div className="text-slate-700 font-medium mt-2">
                    {loadingHomerooms ? (
                      <div className="flex items-center gap-2 animate-pulse text-slate-400">
                        <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                        <span>กำลังโหลดข้อมูล...</span>
                      </div>
                    ) : (
                      teacherHomerooms.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {teacherHomerooms.map(hr => (
                            <div key={hr.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-emerald-600 font-bold text-lg">{hr.grade_level}</span>
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{hr.academic_year || 'N/A'}</span>
                              </div>
                              
                              {teacherClassrooms[hr.grade_level] && teacherClassrooms[hr.grade_level].length > 0 && (
                                <div className="text-sm flex flex-wrap gap-x-3 gap-y-1 mb-3">
                                  {teacherClassrooms[hr.grade_level].map((c) => (
                                    <button 
                                      key={c.id} 
                                      className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold"
                                      onClick={() => { setSelectedClassroomId(c.id); setShowClassroomModal(true); }}
                                    >
                                      ห้อง {c.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <span>👥 นักเรียนทั้งหมด:</span>
                                <span className="font-bold text-slate-800">
                                  {teacherClassrooms[hr.grade_level]?.reduce((total, c) => total + (classroomStudentCounts[c.id] !== undefined ? classroomStudentCounts[c.id] : 0), 0) || 0}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic bg-white p-4 rounded-xl border border-dashed border-slate-300 text-center">
                          ยังไม่ได้ประจำชั้นใดๆ ในขณะนี้
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Field: Grade Level - Only for students */}
            {user.role === 'student' && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
                <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">📚</div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ชั้นปี</label>
                  <div className="text-lg font-bold text-slate-700">{user.grade_level || 'ไม่ระบุ'}</div>
                </div>
              </div>
            )}

            {/* Field: Status */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-start gap-4 transition-all hover:bg-slate-100/50">
              <div className="bg-white p-3 rounded-xl shadow-sm text-xl shrink-0">⚡</div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">สถานะ</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  user.is_active 
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  {user.is_active ? 'ใช้งานปกติ' : 'ปิดใช้งาน'}
                </span>
              </div>
            </div>

            {/* Field: Dates Section Container */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="text-2xl opacity-50">📅</div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">วันที่สร้างบัญชี</div>
                  <div className="text-sm font-bold text-emerald-800">
                    {new Date(user.created_at).toLocaleDateString('th-TH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="text-2xl opacity-50">🔄</div>
                <div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">อัปเดตล่าสุดเมื่อ</div>
                  <div className="text-sm font-bold text-blue-800">
                    {new Date(user.updated_at).toLocaleDateString('th-TH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 flex flex-wrap gap-4 items-center justify-center border-t border-slate-100 pt-8">
            {isEditing ? (
              <>
                <button 
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? '⏳ กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
                </button>
                <button 
                  className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all active:scale-95 disabled:opacity-50" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      full_name: user.full_name || '',
                      email: user.email || '',
                      grade_level: user.grade_level || ''
                    });
                  }}
                  disabled={isSaving}
                >
                  ยกเลิก
                </button>
              </>
            ) : (
              <>
                <button 
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95" 
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ แก้ไขข้อมูล
                </button>
                <button 
                  className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-95" 
                  onClick={() => setShowChangePasswordModal(true)}
                >
                  🔐 เปลี่ยนรหัสผ่าน
                </button>
                <button 
                  className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all active:scale-95" 
                  onClick={() => navigate(-1)}
                >
                  ← กลับ
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      {user && user.role === 'teacher' && (
        <ClassroomDetailModal
          isOpen={showClassroomModal}
          classroomId={selectedClassroomId}
          onClose={() => { setSelectedClassroomId(null); setShowClassroomModal(false); }}
        />
      )}
    </div>
  );
}

export default ProfilePage;