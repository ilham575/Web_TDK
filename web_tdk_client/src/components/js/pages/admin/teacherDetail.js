import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  User, 
  BookOpen, 
  Trash2, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  School,
  IdCard,
  Mail,
  MoreVertical,
  Activity,
  AlertCircle
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

import Loading from '../../Loading';
import swalMessenger from '../owner/swalmessenger';
import { API_BASE_URL } from '../../../endpoints';
import { fetchCurrentUser, hasSessionMarker, logout, getStoredAccessToken } from '../../../../utils/authUtils';

function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [semesterPeriods, setSemesterPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const openConfirmModal = async (title, message, onConfirm) => {
    try {
      const confirmed = await swalMessenger.confirm({ title, text: message });
      if (confirmed) await onConfirm();
    } catch (err) {
      console.error('confirm action error', err);
    }
  };

  useEffect(() => {
    if (!hasSessionMarker()) { navigate('/signin'); return; }
    fetchCurrentUser()
      .then(data => {
        if (data.role !== 'admin') {
          logout();
          toast.error(t('teacherDetail.invalidAuth'));
          setTimeout(() => navigate('/signin'), 1500);
        } else {
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) localStorage.setItem('school_id', String(sid));
          setCurrentUser(data);
        }
      })
      .catch(() => { logout(); toast.error(t('teacherDetail.invalidAuth')); setTimeout(() => navigate('/signin'), 1500); });
  }, [navigate, t]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchTeacher = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users?limit=500`);
        const users = await res.json();
        if (Array.isArray(users)) {
          const t = users.find(u => String(u.id) === String(id));
          setTeacher(t || null);
        }
      } catch (err) {
        console.error('fetch teacher error', err);
      }
    };

    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/subjects/teacher/${id}`);
        const data = await res.json();
        if (Array.isArray(data)) setSubjects(data);
        else setSubjects([]);
      } catch (err) {
        setSubjects([]);
      }
    };

    const fetchSemesterPeriods = async () => {
      try {
        const token = getStoredAccessToken();
        const sid = currentUser?.school_id || currentUser?.school?.id || localStorage.getItem('school_id');
        if (!sid) {
          setSemesterPeriods([]);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/semester-periods?school_id=${sid}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          setSemesterPeriods(Array.isArray(data) ? data : []);
        } else {
          setSemesterPeriods([]);
        }
      } catch (err) {
        setSemesterPeriods([]);
      }
    };

    Promise.all([fetchTeacher(), fetchSubjects(), fetchSemesterPeriods()]).finally(() => setLoading(false));
  }, [currentUser, id]);

  const displaySchool = currentUser?.school_name || currentUser?.school?.name || localStorage.getItem('school_name') || '-';

  useEffect(() => {
    const tryResolveSchoolName = async () => {
      if (!currentUser) return;
      if (currentUser?.school_name || currentUser?.school?.name) return;
      const sid = currentUser?.school_id || localStorage.getItem('school_id');
      if (!sid) return;
      try {
        const res = await fetch(`${API_BASE_URL}/schools/`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find(s => String(s.id) === String(sid));
          if (found) {
            localStorage.setItem('school_name', found.name);
            setCurrentUser(prev => prev ? ({...prev, school_name: found.name}) : prev);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    tryResolveSchoolName();
  }, [currentUser]);

  useEffect(() => {
    const baseTitle = t('schoolSystem');
    document.title = (displaySchool && displaySchool !== '-') ? `${baseTitle} - ${displaySchool}` : baseTitle;
  }, [displaySchool, t]);

  const isTeacherActive = teacher?.is_active !== false && teacher?.status !== 'inactive' && teacher?.status !== 'disabled';

  const getSubjectTypeLabel = (subjectType) => {
    if (subjectType === 'activity') return t('admin.activitySubject');
    return t('admin.mainSubject');
  };

  const getSubjectTypeBadgeClass = (subjectType) => {
    if (subjectType === 'activity') return 'bg-amber-50 text-amber-700 border border-amber-100';
    return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
  };

  const getSubjectStatusType = (subject) => {
    if (subject?.is_ended) return 'completed';

    const matchedPeriod = semesterPeriods.find((period) => (
      String(period?.academic_year || '') === String(subject?.academic_year || '')
      && Number(period?.semester || 0) === Number(subject?.semester || 0)
    ));

    if (!matchedPeriod) return 'in_progress';

    const now = new Date();
    const start = matchedPeriod.start_date ? new Date(matchedPeriod.start_date) : null;
    const end = matchedPeriod.end_date ? new Date(matchedPeriod.end_date) : null;

    if (start && now < start) return 'not_started';
    if (end && now > end) return 'completed';
    return 'in_progress';
  };

  const getSubjectStatusLabel = (subject) => {
    const status = getSubjectStatusType(subject);
    if (status === 'completed') return t('teacherDetail.subjectCompleted');
    if (status === 'not_started') return t('teacherDetail.subjectNotStarted');
    return t('teacherDetail.subjectInProgress');
  };

  const getSubjectStatusBadge = (subject) => {
    const status = getSubjectStatusType(subject);
    if (status === 'completed') {
      return {
        label: t('teacherDetail.completedBadge'),
        className: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        iconClass: 'bg-slate-100 text-slate-500'
      };
    }
    if (status === 'not_started') {
      return {
        label: t('teacherDetail.notStartedBadge'),
        className: 'bg-amber-50 text-amber-700 border border-amber-100',
        iconClass: 'bg-amber-100/60 text-amber-700'
      };
    }
    return {
      label: t('teacherDetail.inProgressBadge'),
      className: 'bg-blue-50 text-blue-600 border border-blue-100',
      iconClass: 'bg-blue-100/50 text-blue-600'
    };
  };

  const groupedSubjects = useMemo(() => {
    const groups = {
      not_started: [],
      in_progress: [],
      completed: []
    };
    (subjects || []).forEach((subject) => {
      const status = getSubjectStatusType(subject);
      if (groups[status]) groups[status].push(subject);
      else groups.in_progress.push(subject);
    });
    return groups;
  }, [subjects, semesterPeriods]);

  const sections = [
    { key: 'in_progress', title: t('teacherDetail.inProgressBadge') },
    { key: 'not_started', title: t('teacherDetail.notStartedBadge') },
    { key: 'completed', title: t('teacherDetail.completedBadge') }
  ];

  const handleDelete = async (subjectId, subjectName) => {
    try {
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, { 
        method: 'DELETE', 
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } 
      });
      if (res.status === 204 || res.ok) {
        toast.success(t('teacherDetail.deleteSuccess'));
        setSubjects(prev => (prev||[]).filter(s => s.id !== subjectId));
      } else {
        const data = await res.json();
        toast.error(data.detail || t('teacherDetail.deleteFailed'));
      }
    } catch (err) {
      console.error('delete subject error', err);
      toast.error(t('teacherDetail.deleteError'));
    }
  };

  if (loading) return <Loading message={t('teacherDetail.loadingTeacher')} />;

  if (!teacher) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-blue-50/20 flex items-center justify-center p-6">
      <div className="bg-white/95 border border-white/70 p-12 rounded-[2rem] shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/50 text-center max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{t('teacherDetail.notFoundTitle')}</h2>
        <p className="text-slate-500 font-bold mb-8">{t('teacherDetail.notFoundDesc')}</p>
        <button 
          onClick={() => navigate('/admin')}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('teacherDetail.backHome')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-blue-50/20 p-4 sm:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <button 
            onClick={() => navigate(-1)}
            className="group flex items-center gap-3 px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold text-sm hover:text-slate-900 transition-all shadow-sm hover:shadow-md border border-slate-100"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            {t('teacherDetail.backHome')}
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm">
              {t('teacherDetail.portalBadge')}
            </span>
          </div>
        </div>

        {/* Hero Profile Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 sm:p-12 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/40 border border-white/70 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
          
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-36 h-36 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2.5rem] flex items-center justify-center text-slate-400 shadow-inner group-hover:scale-105 transition-transform duration-500">
                <User className="w-20 h-20 opacity-50" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            {/* Teacher Info */}
            <div className="flex-1 text-center md:text-left space-y-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight leading-none mb-4">
                  {teacher.full_name || teacher.username}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                    <IdCard className="w-4 h-4 text-slate-400" />
                    {t('teacherDetail.idLabel')}: {teacher.id}
                  </div>
                  {teacher.email && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {teacher.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-full font-black text-[11px] uppercase tracking-wider">
                    <School className="w-4 h-4" />
                    {displaySchool}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-12 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">{t('teacherDetail.totalSubjects')}</p>
                  <p className="text-2xl font-black text-slate-800">{subjects.length} <span className="text-sm font-bold text-slate-400">{t('teacherDetail.subjectsUnit')}</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">{t('teacherDetail.memberStatus')}</p>
                  <div className={`text-2xl font-black flex items-center gap-2 ${isTeacherActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {isTeacherActive ? t('teacherDetail.activeStatus') : t('teacherDetail.inactiveStatus')}
                    <div className={`w-3 h-3 rounded-full ${isTeacherActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects List */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              {t('teacherDetail.assignedSubjectsTitle')}
            </h3>
            <span className="text-xs font-bold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
              {t('teacherDetail.assignedSubjectsHint')}
            </span>
          </div>

          {!subjects || subjects.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="w-10 h-10" />
              </div>
              <p className="text-xl font-black text-slate-800 mb-1">{t('teacherDetail.noAssignedSubjectsTitle')}</p>
              <p className="text-slate-400 font-bold max-w-sm">
                {t('teacherDetail.noAssignedSubjectsDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {sections.map(section => {
                const list = groupedSubjects[section.key] || [];
                if (list.length === 0) return null;

                return (
                  <div key={section.key} className="space-y-4">
                    <div className="px-4 flex items-center justify-between">
                      <h4 className="text-lg font-black text-slate-700">{section.title}</h4>
                      <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                        {list.length} {t('teacherDetail.subjectsUnit')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {list.map((s, idx) => {
                        const statusBadge = getSubjectStatusBadge(s);
                        return (
                          <div 
                            key={s.id} 
                            className="group bg-white/90 backdrop-blur-sm p-8 rounded-[2rem] shadow-[0_18px_55px_-34px_rgba(15,23,42,0.38)] hover:shadow-[0_24px_65px_-28px_rgba(15,23,42,0.42)] transition-all duration-300 border border-white/70 ring-1 ring-slate-200/30 relative overflow-hidden"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-5 h-5 text-slate-300 hover:text-slate-600 cursor-pointer" />
                            </div>

                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div className={`w-12 h-12 ${statusBadge.iconClass} rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12`}>
                                  <Activity className="w-6 h-6" />
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-xl font-black text-slate-800 mb-2 truncate group-hover:text-blue-600 transition-colors">
                                  {s.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-tighter">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {getSubjectStatusLabel(s)}
                                  </div>
                                  <div className={`px-2.5 py-1 rounded-lg ${getSubjectTypeBadgeClass(s.subject_type)}`}>
                                    {getSubjectTypeLabel(s.subject_type)}
                                  </div>
                                  {s.academic_year && (
                                    <div className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                                      {t('admin.academicYear')} {s.academic_year}
                                    </div>
                                  )}
                                  {s.semester && (
                                    <div className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                                      {t('admin.semester')} {s.semester}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                <button 
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    if (s.academic_year) params.set('academic_year', String(s.academic_year));
                                    if (s.semester) params.set('semester', String(s.semester));
                                    navigate(`/admin/subject/${s.id}/details${params.toString() ? `?${params.toString()}` : ''}`);
                                  }}
                                  className="flex-1 h-12 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
                                >
                                  {t('details')}
                                  <ChevronRight className="w-4 h-4" />
                                </button>

                                {getSubjectStatusType(s) === 'completed' && (
                                  <button 
                                    onClick={() => openConfirmModal(
                                      t('admin.deleteSubjectTitle'), 
                                      t('teacherDetail.deleteConfirm', { name: s.name }), 
                                      async () => { await handleDelete(s.id, s.name); }
                                    )}
                                    className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-100 transition-all active:scale-90 border border-rose-100"
                                    title={t('admin.deleteSubjectTitle')}
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDetail;

