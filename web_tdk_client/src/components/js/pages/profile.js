import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loading from '../Loading';
import ChangePasswordModal from '../ChangePasswordModal';
import ClassroomDetailModal from '../ClassroomDetailModal';
import GoogleIdentityButton, { hasGoogleIdentityConfig } from '../GoogleIdentityButton';
import { API_BASE_URL } from '../../endpoints';
import { fetchCurrentUser, getStoredAccessToken, hasSessionMarker } from '../../../utils/authUtils';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  Edit2,
  Info,
  KeyRound,
  Save,
  School,
  ShieldCheck,
  User,
  Users,
  X
} from 'lucide-react';

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
  const [googleLinkStatus, setGoogleLinkStatus] = useState(null);
  const [loadingGoogleLinkStatus, setLoadingGoogleLinkStatus] = useState(false);
  const [googleStatusError, setGoogleStatusError] = useState('');
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);

  const getAuthHeaders = (includeContentType = false) => {
    const headers = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    const token = getStoredAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

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

  useEffect(() => {
    if (!user || !hasGoogleIdentityConfig()) {
      setGoogleLinkStatus(null);
      setGoogleStatusError('');
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      setLoadingGoogleLinkStatus(true);
      setGoogleStatusError('');

      try {
        const res = await fetch(`${API_BASE_URL}/users/me/google/status`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'ไม่สามารถโหลดสถานะการเชื่อม Google ได้');
        }

        if (!cancelled) {
          setGoogleLinkStatus(data);
        }
      } catch (err) {
        if (!cancelled) {
          setGoogleLinkStatus(null);
          setGoogleStatusError(err.message || 'ไม่สามารถโหลดสถานะการเชื่อม Google ได้');
        }
      } finally {
        if (!cancelled) {
          setLoadingGoogleLinkStatus(false);
        }
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleGoogleLink = async (credential) => {
    try {
      setIsLinkingGoogle(true);
      setGoogleStatusError('');

      const res = await fetch(`${API_BASE_URL}/users/me/google/link`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ credential })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'ไม่สามารถเชื่อมบัญชี Google ได้');
      }

      setGoogleLinkStatus(data);
      toast.success('เชื่อมบัญชี Google เรียบร้อยแล้ว');
    } catch (err) {
      const message = err.message || 'ไม่สามารถเชื่อมบัญชี Google ได้';
      setGoogleStatusError(message);
      toast.error(message);
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleGoogleUnlink = async () => {
    try {
      setIsUnlinkingGoogle(true);
      setGoogleStatusError('');

      const res = await fetch(`${API_BASE_URL}/users/me/google/link`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'ไม่สามารถยกเลิกการเชื่อม Google ได้');
      }

      setGoogleLinkStatus(data);
      toast.success('ยกเลิกการเชื่อมบัญชี Google แล้ว');
    } catch (err) {
      const message = err.message || 'ไม่สามารถยกเลิกการเชื่อม Google ได้';
      setGoogleStatusError(message);
      toast.error(message);
    } finally {
      setIsUnlinkingGoogle(false);
    }
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
          className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
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

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'ครูผู้สอน';
      case 'student': return 'นักเรียน';
      default: return role;
    }
  };

  const getRoleSummary = (role) => {
    switch (role) {
      case 'admin': return 'ดูแลการตั้งค่าระบบและข้อมูลส่วนกลางของโรงเรียน';
      case 'teacher': return 'จัดการรายวิชา ห้องเรียน และข้อมูลนักเรียนที่รับผิดชอบ';
      case 'student': return 'ติดตามข้อมูลบัญชีและสถานะการใช้งานของตนเอง';
      default: return 'ข้อมูลส่วนตัวและการตั้งค่าบัญชี';
    }
  };

  const splitName = (name) => {
    if (!name) {
      return { firstName: '', lastName: '' };
    }

    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ')
    };
  };

  const handleNamePartChange = (part, value) => {
    const current = splitName(editData.full_name || user.full_name || user.username || '');
    const next = {
      ...current,
      [part]: value
    };
    handleEditChange('full_name', [next.firstName, next.lastName].filter(Boolean).join(' ').trim());
  };

  const displayName = user.full_name || user.username || '-';
  const displayNameParts = splitName(editData.full_name || displayName);
  const joinDateSummary = user.created_at
    ? new Date(user.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })
    : '-';
  const createdAtLabel = user.created_at
    ? new Date(user.created_at).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '-';
  const updatedAtLabel = user.updated_at
    ? new Date(user.updated_at).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '-';
  const teacherHomeroomCount = teacherHomerooms.length;
  const totalHomeroomStudents = teacherHomerooms.reduce((total, hr) => {
    return total + (teacherClassrooms[hr.grade_level]?.reduce((subTotal, classroom) => {
      return subTotal + (classroomStudentCounts[classroom.id] !== undefined ? classroomStudentCounts[classroom.id] : 0);
    }, 0) || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="h-40 sm:h-56 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 relative group">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 sm:px-10 pb-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
              <div className="relative inline-block group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md bg-slate-100 text-slate-700 flex items-center justify-center text-3xl sm:text-4xl font-black">
                  {initials(displayName)}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:text-blue-600 shadow-sm transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(true)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  เปลี่ยนรหัสผ่าน
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  กลับ
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-800">{displayName}</h2>
              <p className="text-blue-600 font-medium">{getRoleText(user.role)}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {schoolName || 'ไม่ระบุโรงเรียน'}</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" /> {getRoleSummary(user.role)}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> เข้าร่วมเมื่อ {joinDateSummary}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" /> ข้อมูลติดต่อ
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">ชื่อผู้ใช้</p>
                  <p className="text-sm text-slate-700 font-medium break-all">{user.username}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">อีเมลแอดเดรส</p>
                  <p className="text-sm text-slate-700 break-all">{user.email || 'ไม่ได้ระบุ'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">โรงเรียน</p>
                  <p className="text-sm text-slate-700 font-medium">{schoolName || 'ไม่ระบุ'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">สถานะบัญชี</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    user.is_active
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-red-100 text-red-700 border-red-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {user.is_active ? 'ใช้งานปกติ' : 'ปิดใช้งาน'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{user.role === 'student' ? 'ชั้นปี' : 'บทบาท'}</p>
                  <p className="text-sm text-slate-700 font-medium">{user.role === 'student' ? (user.grade_level || 'ไม่ระบุ') : getRoleText(user.role)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-blue-500" /> Google Sign-In
              </h3>

              {!hasGoogleIdentityConfig() ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700">
                  ระบบฝั่ง client ยังไม่ได้ตั้งค่า Google Client ID จึงยังไม่สามารถเชื่อมหรือเข้าสู่ระบบด้วย Google ได้
                </div>
              ) : loadingGoogleLinkStatus ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  กำลังโหลดสถานะการเชื่อมบัญชี Google...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-blue-600 shadow-sm ring-1 ring-slate-200">
                        G
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {googleLinkStatus?.linked ? 'เชื่อมบัญชี Google แล้ว' : 'ยังไม่ได้เชื่อมบัญชี Google'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500 break-all">
                          {googleLinkStatus?.linked
                            ? (googleLinkStatus.provider_email || 'เชื่อมแล้ว แต่ยังไม่มีอีเมลจากผู้ให้บริการ')
                            : 'เชื่อม Google เพื่อใช้ปุ่ม Google Sign-In ในการเข้าสู่ระบบครั้งถัดไป โดยยังคงใช้บัญชีเดิมของระบบนี้'}
                        </p>
                        {googleLinkStatus?.linked_at ? (
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            เชื่อมเมื่อ {new Date(googleLinkStatus.linked_at).toLocaleString('th-TH')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {googleStatusError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                      {googleStatusError}
                    </div>
                  ) : null}

                  {googleLinkStatus?.linked ? (
                    <button
                      type="button"
                      onClick={handleGoogleUnlink}
                      disabled={isUnlinkingGoogle || isLinkingGoogle}
                      className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUnlinkingGoogle ? 'กำลังยกเลิกการเชื่อม...' : 'ยกเลิกการเชื่อม Google'}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
                      <div className="flex justify-center">
                        <GoogleIdentityButton
                          onCredential={handleGoogleLink}
                          text="continue_with"
                          width={300}
                          disabled={isLinkingGoogle || isUnlinkingGoogle}
                        />
                      </div>
                      <p className="mt-3 text-center text-xs font-medium leading-5 text-slate-400">
                        ระบบจะเชื่อม Google เข้ากับบัญชีปัจจุบันเท่านั้น และจะไม่สร้างผู้ใช้ใหม่อัตโนมัติ
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {user.role === 'teacher' && (
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> ครูประจำชั้น
                </h3>

                {loadingHomerooms ? (
                  <div className="flex items-center gap-3 text-sm text-slate-400 animate-pulse">
                    <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                    <span>กำลังโหลดข้อมูลห้องเรียน...</span>
                  </div>
                ) : teacherHomerooms.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">ห้องที่ดูแล</p>
                        <p className="mt-2 text-2xl font-black text-slate-800">{teacherHomeroomCount}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">นักเรียนรวม</p>
                        <p className="mt-2 text-2xl font-black text-blue-600">{totalHomeroomStudents}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {teacherHomerooms.map(hr => (
                        <div key={hr.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-sm font-black text-slate-800">{hr.grade_level}</p>
                              <p className="text-xs text-slate-400 font-medium">ปีการศึกษา {hr.academic_year || '-'}</p>
                            </div>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                              Homeroom
                            </span>
                          </div>

                          {teacherClassrooms[hr.grade_level] && teacherClassrooms[hr.grade_level].length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {teacherClassrooms[hr.grade_level].map((classroom) => (
                                <button
                                  key={classroom.id}
                                  type="button"
                                  onClick={() => { setSelectedClassroomId(classroom.id); setShowClassroomModal(true); }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600"
                                >
                                  <School className="w-4 h-4" />
                                  ห้อง {classroom.name}
                                  <span className="text-xs text-slate-400">
                                    {classroomStudentCounts[classroom.id] !== undefined ? classroomStudentCounts[classroom.id] : 0} คน
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">ยังไม่พบห้องเรียนในระดับชั้นนี้</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-400">
                    ยังไม่ได้ประจำชั้นใดๆ ในขณะนี้
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> ข้อมูลเวลาใช้งาน
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">วันที่สร้างบัญชี</p>
                  <p className="text-sm text-slate-700 font-medium">{createdAtLabel}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">อัปเดตล่าสุด</p>
                  <p className="text-sm text-slate-700 font-medium">{updatedAtLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-800">แก้ไขข้อมูลส่วนตัว</h3>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                    เริ่มแก้ไข
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">ชื่อจริง</label>
                    <input
                      type="text"
                      value={displayNameParts.firstName}
                      disabled={!isEditing}
                      onChange={(e) => handleNamePartChange('firstName', e.target.value)}
                      className={`block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all ${
                        isEditing
                          ? 'focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 text-slate-800'
                          : 'text-slate-700 cursor-default'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">นามสกุล</label>
                    <input
                      type="text"
                      value={displayNameParts.lastName}
                      disabled={!isEditing}
                      onChange={(e) => handleNamePartChange('lastName', e.target.value)}
                      className={`block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all ${
                        isEditing
                          ? 'focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 text-slate-800'
                          : 'text-slate-700 cursor-default'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">อีเมล</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      disabled={!isEditing}
                      placeholder="example@mail.com"
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      className={`block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all ${
                        isEditing
                          ? 'focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 text-slate-800'
                          : 'text-slate-700 cursor-default'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">{user.role === 'student' ? 'ชั้นปี' : 'ระดับชั้นที่ดูแล'}</label>
                    {user.role === 'admin' || user.role === 'teacher' ? (
                      <select
                        value={editData.grade_level || ''}
                        disabled={!isEditing || loadingGradeLevels}
                        onChange={(e) => handleEditChange('grade_level', e.target.value)}
                        className={`block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all appearance-none ${
                          isEditing
                            ? 'focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 text-slate-800'
                            : 'text-slate-700 cursor-default'
                        }`}
                      >
                        <option value="">ไม่ระบุ</option>
                        {gradeLevels.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={user.grade_level || 'ไม่ระบุ'}
                        disabled
                        className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none cursor-default"
                      />
                    )}
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">บทบาท</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{getRoleText(user.role)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">โรงเรียน</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{schoolName || 'ไม่ระบุ'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">สรุปข้อมูลบัญชี</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        บัญชีนี้อยู่ภายใต้บทบาท {getRoleText(user.role)} ของ {schoolName || 'โรงเรียนที่กำหนดไว้'} และสามารถแก้ไขข้อมูลพื้นฐานได้เฉพาะชื่อ อีเมล และข้อมูลระดับชั้นที่ระบบอนุญาตเท่านั้น
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
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
                        <X className="w-4 h-4" />
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 rounded-xl transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 rounded-xl transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4" />
                      แก้ไขข้อมูล
                    </button>
                  )}
                </div>
              </div>
            </div>
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