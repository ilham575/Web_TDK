import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader, { getInitials } from '../../PageHeader';
import { toast } from 'react-toastify';
import ConfirmModal from '../../ConfirmModal';
import StudentEvaluationModal from '../../../modals/StudentEvaluationModal';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { logout } from '../../../../utils/authUtils';
import {
  ArrowLeft,
  Brain,
  Plus,
  Edit2,
  Trash2,
  User,
  BookOpen,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

function TeacherEvaluationsPage() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [teacherClassrooms, setTeacherClassrooms] = useState([]);

  // Modal states
  const [showStudentEvaluationModal, setShowStudentEvaluationModal] = useState(false);
  const [selectedSubjectForEvaluation, setSelectedSubjectForEvaluation] = useState(null);
  const [studentsForEvaluation, setStudentsForEvaluation] = useState([]);
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const openConfirm = (title, message, onConfirm, variant = 'danger') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      variant
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }
    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.role !== 'teacher') {
          logout();
          toast.error('Invalid token or role. Please sign in again.');
          setTimeout(() => navigate('/signin'), 1500);
        } else if (data.must_change_password) {
          toast.info('กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
          navigate('/change-password');
        } else {
          const schoolName = data?.school_name || data?.school?.name || data?.school?.school_name || '';
          if (schoolName) localStorage.setItem('school_name', schoolName);
          const sid = data?.school_id || data?.school?.id || data?.school?.school_id || data?.schoolId || null;
          if (sid) {
            localStorage.setItem('school_id', String(sid));
            setSchoolFavicon(sid);
          }
          setCurrentUser(data);
        }
      })
      .catch(() => {
        logout();
        navigate('/signin');
      });
  }, [navigate]);

  const fetchTeacherSubjects = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/teacher/${currentUser.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeacherSubjects(data);
      } else {
        setTeacherSubjects([]);
      }
    } catch (err) {
      setTeacherSubjects([]);
    }
  };

  const fetchTeacherClassrooms = async () => {
    if (!currentUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/classrooms/teacher-classrooms`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeacherClassrooms(data);
      } else {
        setTeacherClassrooms([]);
      }
    } catch (err) {
      setTeacherClassrooms([]);
    }
  };

  const fetchAllEvaluations = async () => {
    if (!currentUser || teacherSubjects.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const evaluations = [];

      for (const subject of teacherSubjects) {
        try {
          const res = await fetch(`${API_BASE_URL}/evaluations/subject/${subject.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const subjectEvaluations = await res.json();
            if (Array.isArray(subjectEvaluations)) {
              evaluations.push(...subjectEvaluations.map(ev => ({
                ...ev,
                subject_name: subject.name,
                subject_code: subject.code,
                subject_id: subject.id
              })));
            }
          }
        } catch (err) {
          // Continue with other subjects
        }
      }

      setAllEvaluations(evaluations);
      setFilteredEvaluations(evaluations);
    } catch (err) {
      setAllEvaluations([]);
      setFilteredEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTeacherSubjects();
      fetchTeacherClassrooms();
    }
  }, [currentUser]);

  useEffect(() => {
    if (subjectId && teacherSubjects.length > 0) {
      setSelectedSubject(subjectId);
    }
  }, [subjectId, teacherSubjects]);

  useEffect(() => {
    if (teacherSubjects.length > 0) {
      fetchAllEvaluations();
    } else if (currentUser) {
      // No subjects — nothing to load, stop loading spinner
      toast.error('ไม่มีวิชาที่สามารถแสดงผลได้');
      setLoading(false);
    }
  }, [teacherSubjects]);

  // Filter and sort evaluations
  useEffect(() => {
    let filtered = [...allEvaluations];

    // Filter by subject
    if (selectedSubject) {
      filtered = filtered.filter(ev => ev.subject_id === parseInt(selectedSubject));
    }

    // Filter by classroom
    if (selectedClassroom) {
      filtered = filtered.filter(ev => ev.classroom_id === parseInt(selectedClassroom));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ev =>
        ev.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'student':
          return (a.student_name || '').localeCompare(b.student_name || '');
        case 'subject':
          return (a.subject_name || '').localeCompare(b.subject_name || '');
        default:
          return 0;
      }
    });

    setFilteredEvaluations(filtered);
  }, [allEvaluations, selectedSubject, selectedClassroom, searchTerm, sortBy]);

  const handleOpenEvaluationModal = async (subject) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/students`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        let students = await res.json();
        
        // Filter by selected classroom if one is selected
        if (selectedClassroom) {
          students = students.filter(student => 
            student.classroom && student.classroom.id === parseInt(selectedClassroom)
          );
        }
        
        // Determine which students already have evaluations for this subject
        const evaluatedStudentIds = allEvaluations
          .filter(ev => ev.subject_id === subject.id)
          .map(ev => ev.student_id);

        setSelectedSubjectForEvaluation(subject);
        setStudentsForEvaluation(students);
        // pass evaluated ids via local state so modal can disable duplicates
        setShowStudentEvaluationModal(true);
        // store evaluated ids on window object temporarily for modal usage
        // (easier than changing modal signature widely) — modal will read `window.__evaluatedIds`
        window.__evaluatedIds = evaluatedStudentIds;
        setIsEditingEvaluation(false);
        setEditingEvaluation(null);
      } else {
        toast.error('ไม่สามารถโหลดรายชื่อนักเรียนได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleEditEvaluation = (subject, evaluation) => {
    setSelectedSubjectForEvaluation(subject);
    setEditingEvaluation(evaluation);
    setIsEditingEvaluation(true);
    setShowStudentEvaluationModal(true);
  };

  const handleDeleteEvaluation = async (evaluationId, subjectId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/evaluations/${evaluationId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.detail || 'ลบการประเมินไม่สำเร็จ');
        return;
      }

      toast.success('ลบการประเมินเรียบร้อยแล้ว');
      await fetchAllEvaluations();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleEvaluationSuccess = async () => {
    await fetchAllEvaluations();
  };

  // Helper function to calculate majority rating
  const getMajorityRating = (ratings) => {
    if (!ratings || ratings.length === 0) return null;
    
    // Check if any rating is 'fail'. If so, the whole summary is 'fail'.
    if (ratings.some(r => r === 'fail')) return 'fail';
    
    const rank = { 'excellent': 4, 'good': 3, 'pass': 2, 'fail': 1 };
    const counts = {};
    let maxCount = 0;
    
    ratings.forEach(r => {
      if (!r) return;
      counts[r] = (counts[r] || 0) + 1;
      if (counts[r] > maxCount) maxCount = counts[r];
    });
    
    // Find all ratings that have the maxCount
    const candidates = Object.keys(counts).filter(r => counts[r] === maxCount);
    
    // If there's a tie, choose the one with the highest rank
    candidates.sort((a, b) => rank[b] - rank[a]);
    
    return candidates[0];
  };

  const getRatingLabel = (value) => {
    const labels = {
      'excellent': 'ดีเยี่ยม',
      'good': 'ดี',
      'pass': 'ผ่าน',
      'fail': 'ไม่ผ่าน'
    };
    return labels[value] || value;
  };

  const getRatingColor = (value) => {
    const colors = {
      'excellent': 'text-emerald-600 bg-emerald-50 border-emerald-100',
      'good': 'text-blue-600 bg-blue-50 border-blue-100',
      'pass': 'text-amber-600 bg-amber-50 border-amber-100',
      'fail': 'text-rose-600 bg-rose-50 border-rose-100'
    };
    return colors[value] || 'text-slate-600 bg-slate-50 border-slate-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="จัดการการประเมินนักเรียน"
        subtitle="ดูและจัดการการประเมินทั้งหมด"
        user={currentUser}
        onLogout={() => logout()}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex flex-col xl:flex-row gap-4 mb-8">
          <button
            onClick={() => navigate('/teacher/home')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98] shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
            กลับหน้าหลัก
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 flex-1">
            {/* Subject Filter */}
            <div className="relative lg:col-span-3">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              >
                <option value="">ทุกวิชาที่สอน</option>
                {teacherSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Classroom Filter */}
            <div className="relative lg:col-span-2">
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              >
                <option value="">ทุกชั้นเรียน</option>
                {teacherClassrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.grade_level})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Search */}
            <div className="relative lg:col-span-5">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อนักเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>

            {/* Sort */}
            <div className="relative lg:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              >
                <option value="newest">ใหม่สุด</option>
                <option value="oldest">เก่าสุด</option>
                <option value="student">ชื่อนักเรียน</option>
                <option value="subject">ชื่อวิชา</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-100 rounded-2xl shrink-0">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{allEvaluations.length}</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">การประเมินทั้งหมด</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-4 bg-emerald-100 rounded-2xl shrink-0">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{teacherSubjects.length}</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">วิชาที่รับผิดชอบ</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="p-4 bg-purple-100 rounded-2xl shrink-0">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                {new Set(allEvaluations.map(ev => ev.student_id)).size}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">จำนวนนักเรียนที่ประเมิน</p>
            </div>
          </div>
        </div>

        {/* Evaluations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">รายการการประเมิน</h2>
              <button
                onClick={() => {
                  if (teacherSubjects.length > 0) {
                    handleOpenEvaluationModal(teacherSubjects[0]);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                เพิ่มการประเมิน
              </button>
            </div>
          </div>

          {filteredEvaluations.length === 0 ? (
            <div className="p-12 text-center">
              <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600 mb-2">ยังไม่มีข้อมูลการประเมิน</h3>
              <p className="text-slate-500">เริ่มสร้างการประเมินแรกของคุณ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvaluations.map(evaluation => (
                <div key={evaluation.id} className="p-5 sm:p-8 hover:bg-slate-50/80 transition-all border-l-4 border-transparent hover:border-emerald-500 group">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                        <span className="text-xl sm:text-2xl font-black text-white">
                          {evaluation.student_name ? evaluation.student_name.charAt(0) : '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-800 text-base sm:text-lg mb-0.5 truncate">{evaluation.student_name || 'ไม่ระบุชื่อ'}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                          <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 rounded-lg">{evaluation.subject_code} - {evaluation.subject_name}</p>
                          <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(evaluation.created_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row xl:flex-col items-start xl:items-end gap-4 shrink-0">
                      <div className="flex flex-col gap-2 items-start xl:items-end w-full sm:w-auto">
                        <span className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-widest leading-none">ผลลัพธ์การประเมิน</span>
                        <div className="flex flex-wrap gap-2 justify-start xl:justify-end">
                          {/* Summary for Reading/Writing/Thinking */}
                          {(() => {
                            const rwaRatings = [
                              evaluation.reading,
                              evaluation.writing,
                              evaluation.analysis
                            ];
                            const rwaSummary = getMajorityRating(rwaRatings);
                            if (!rwaSummary) return null;
                            return (
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm transition-transform hover:scale-105 ${getRatingColor(rwaSummary)}`}>
                                <BookOpen className="w-3 h-3 opacity-70" />
                                <span className="opacity-70">อ่าน-เขียน-คิด:</span>
                                <span>{getRatingLabel(rwaSummary)}</span>
                              </div>
                            );
                          })()}

                          {/* Summary for Characteristics */}
                          {(() => {
                            const charRatings = evaluation.characteristic_scores?.map(c => c.rating) || [];
                            const charSummary = getMajorityRating(charRatings);
                            if (!charSummary) return null;
                            return (
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm transition-transform hover:scale-105 ${getRatingColor(charSummary)}`}>
                                <CheckCircle2 className="w-3 h-3 opacity-70" />
                                <span className="opacity-70">คุณลักษณะฯ:</span>
                                <span>{getRatingLabel(charSummary)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex gap-2 self-end sm:self-center xl:self-end">
                        <button
                          onClick={() => {
                            const subject = teacherSubjects.find(s => s.id === evaluation.subject_id);
                            if (subject) handleEditEvaluation(subject, evaluation);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-xl font-bold transition-all border border-amber-200 hover:border-amber-300 shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="hidden sm:inline">แก้ไข</span>
                        </button>
                        <button
                          onClick={() => openConfirm(
                            'ลบการประเมิน',
                            `ต้องการลบการประเมินของ ${evaluation.student_name || 'นักเรียนคนนี้'} ใช่หรือไม่?`,
                            () => handleDeleteEvaluation(evaluation.id, evaluation.subject_id)
                          )}
                          className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all border border-rose-200 hover:border-rose-300 shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">ลบ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Scores Preview */}
                  <div className="mt-6 xl:pl-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <p className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" /> 
                          การอ่าน คิดวิเคราะห์ และเขียน
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${getRatingColor(evaluation.reading)}`}>
                            การอ่าน: {getRatingLabel(evaluation.reading)}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${getRatingColor(evaluation.writing)}`}>
                            การเขียน: {getRatingLabel(evaluation.writing)}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${getRatingColor(evaluation.analysis)}`}>
                            การคิด: {getRatingLabel(evaluation.analysis)}
                          </span>
                        </div>
                      </div>

                      {evaluation.characteristic_scores && evaluation.characteristic_scores.length > 0 && (
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <p className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                            คุณลักษณะอันพึงประสงค์
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {evaluation.characteristic_scores.slice(0, 4).map((char, idx) => (
                              <span key={idx} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${getRatingColor(char.rating)}`}>
                                {char.topic_name}: {getRatingLabel(char.rating)}
                              </span>
                            ))}
                            {evaluation.characteristic_scores.length > 4 && (
                              <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-400 rounded-lg text-[10px] font-bold">
                                +{evaluation.characteristic_scores.length - 4} เพิ่มเติม
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <StudentEvaluationModal
        isOpen={showStudentEvaluationModal}
        subject={selectedSubjectForEvaluation}
        students={studentsForEvaluation}
        onClose={() => setShowStudentEvaluationModal(false)}
        teacherId={currentUser?.id}
        isEditing={isEditingEvaluation}
        existingEvaluation={editingEvaluation}
        onSuccess={handleEvaluationSuccess}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />
    </div>
  );
}

export default TeacherEvaluationsPage;