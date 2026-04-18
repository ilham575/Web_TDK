import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import StudentEvaluationModal from '../../../modals/StudentEvaluationModal';
import { API_BASE_URL } from '../../../endpoints';
import { setSchoolFavicon } from '../../../../utils/faviconUtils';
import { fetchCurrentUser, hasSessionMarker, logout } from '../../../../utils/authUtils';
import ReactDOM from 'react-dom';
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
  CheckCircle2,
  Sparkles,
  School,
  X
} from 'lucide-react';

// Custom Modal for consistency
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, variant = 'danger' }) => {
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-8 text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
            {variant === 'danger' ? <Trash2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-500 font-medium">{message}</p>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-50 hover:border-slate-200 transition-all">
            ยกเลิก
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 py-3.5 text-white rounded-xl font-black text-sm shadow-lg transition-all transform active:scale-95 ${
              variant === 'danger' 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
            }`}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

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
  const [selectedYear, setSelectedYear] = useState('');
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
    if (!hasSessionMarker()) {
      navigate('/signin');
      return;
    }
    fetchCurrentUser()
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
        // Filter out activity-type subjects
        const nonActivitySubjects = data.filter(s => s.subject_type !== 'activity');

        // Group subjects that are linked across semesters (same subject, different semester)
        const groupedMap = {};

        // Helper: same logic as teacher/home.js isSameSubject
        const isSameSubject = (a, b) => {
          if (a.id === b.id) return false; // same object, skip
          if (a.linked_subject_id && a.linked_subject_id === b.id) return true;
          if (b.linked_subject_id && b.linked_subject_id === a.id) return true;
          if (a.linked_subject_id && b.linked_subject_id && a.linked_subject_id === b.linked_subject_id) return true;
          return false;
        };

        // First pass: build a map of id → canonical group key
        const idToGroupKey = {};

        nonActivitySubjects.forEach(subject => {
          if (idToGroupKey[subject.id]) return; // already assigned

          // Find any subject that is "the same" as this one
          const partner = nonActivitySubjects.find(s => isSameSubject(subject, s));
          if (partner) {
            // Use the smaller ID as the canonical key so both get the same key
            const rootId = Math.min(subject.id, partner.id);
            const key = `linked_${rootId}`;
            idToGroupKey[subject.id] = key;
            idToGroupKey[partner.id] = key;
          }
        });

        // Second pass: fallback — group by name + code + teacher_id for unassigned subjects
        nonActivitySubjects.forEach(subject => {
          if (idToGroupKey[subject.id]) return; // already grouped via linked_subject_id

          if (subject.name && subject.code && subject.teacher_id) {
            const fallbackKey = `name_${subject.name}__code_${subject.code}__teacher_${subject.teacher_id}`;
            idToGroupKey[subject.id] = fallbackKey;
          } else {
            // Can't determine a shared group — keep solo
            idToGroupKey[subject.id] = `solo_${subject.id}`;
          }
        });

        // Build the groupedMap
        nonActivitySubjects.forEach(subject => {
          const key = idToGroupKey[subject.id] || `solo_${subject.id}`;
          if (!groupedMap[key]) groupedMap[key] = [];
          groupedMap[key].push(subject);
        });
        
        // Create grouped subjects list
        const groupedSubjects = Object.values(groupedMap).map(group => {
          // Sort by semester to keep sem 1 first, then sem 2
          const sorted = group.sort((a, b) => (a.semester || 0) - (b.semester || 0));
          // Use first subject as representative, store all linked subjects
          return {
            ...sorted[0],
            all_subjects: sorted,  // Track all subject IDs in this group
            is_grouped: sorted.length > 1  // Mark if grouped
          };
        });
        
        setTeacherSubjects(groupedSubjects);
        if (groupedSubjects.length > 0 && !selectedSubject && !subjectId) {
          setSelectedSubject(String(groupedSubjects[0].id));
        }
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
      const res = await fetch(`${API_BASE_URL}/classrooms/teacher-classrooms`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeacherClassrooms(data);
        if (data.length > 0 && !selectedClassroom) {
          setSelectedClassroom(String(data[0].id));
        }
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
      const evaluations = [];

      for (const subject of teacherSubjects) {
        // Fetch evaluations from all subjects in the group (both semesters)
        const subjectIds = subject.all_subjects?.map(s => s.id) || [subject.id];
        
        for (const subId of subjectIds) {
          try {
            const params = new URLSearchParams();
            if (subject.academic_year) params.append('academic_year', subject.academic_year);
            if (subject.semester) params.append('semester', subject.semester);
            const queryString = params.toString() ? `?${params.toString()}` : '';

            const res = await fetch(`${API_BASE_URL}/evaluations/subject/${subId}${queryString}`);
            if (res.ok) {
              const subjectEvaluations = await res.json();
              if (Array.isArray(subjectEvaluations)) {
                evaluations.push(...subjectEvaluations.map(ev => ({
                  ...ev,
                  subject_name: subject.name,
                  subject_code: subject.code,
                  subject_id: subId,  // Keep track of which semester's subject this comes from
                  academic_year: ev.academic_year || subject.academic_year,
                  semester: ev.semester || subject.semester
                })));
              }
            }
          } catch (err) {
            // Continue with other subjects
            console.error(`Error fetching evaluations for subject ${subId}:`, err);
          }
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
      toast.error('ไม่มีวิชาที่สามารถแสดงผลได้');
      setLoading(false);
    }
  }, [teacherSubjects]);

  // Filter and sort evaluations
  useEffect(() => {
    let filtered = [...allEvaluations];

    if (selectedSubject) {
      // Find the selected grouped subject and get all its subject IDs
      const selectedGroupSubject = teacherSubjects.find(s => String(s.id) === selectedSubject);
      if (selectedGroupSubject) {
        // Filter by all subject IDs in this group (both semesters of the same subject)
        const groupSubjectIds = selectedGroupSubject.all_subjects?.map(s => s.id) || [selectedGroupSubject.id];
        filtered = filtered.filter(ev => groupSubjectIds.includes(ev.subject_id));
      }
    }

    if (selectedClassroom) {
      filtered = filtered.filter(ev => ev.classroom_id === parseInt(selectedClassroom));
    }

    if (selectedYear) {
      filtered = filtered.filter(ev => String(ev.academic_year) === selectedYear);
    }

    if (searchTerm) {
      filtered = filtered.filter(ev =>
        ev.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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
  }, [allEvaluations, selectedSubject, selectedClassroom, selectedYear, searchTerm, sortBy]);

  const handleOpenEvaluationModal = async (subject) => {
    try {
      // Get students from all subject IDs in group
      const subjectIds = subject.all_subjects?.map(s => s.id) || [subject.id];
      const allStudents = [];
      const studentMap = {};
      
      for (const subId of subjectIds) {
        try {
          const res = await fetch(`${API_BASE_URL}/subjects/${subId}/students`);
          if (res.ok) {
            const students = await res.json();
            students.forEach(student => {
              if (!studentMap[student.id]) {
                studentMap[student.id] = student;
                allStudents.push(student);
              }
            });
          }
        } catch (err) {
          console.error(`Error loading students for subject ${subId}:`, err);
        }
      }
      
      if (allStudents.length === 0) {
        toast.error('ไม่สามารถโหลดรายชื่อนักเรียนได้');
        return;
      }
      
      let students = allStudents;
      if (selectedClassroom) {
        students = students.filter(student => 
          student.classroom && student.classroom.id === parseInt(selectedClassroom)
        );
      }
      
      // Get evaluated student IDs from all subjects in group
      const evaluatedStudentIds = allEvaluations
        .filter(ev => subjectIds.includes(ev.subject_id))
        .map(ev => ev.student_id);

      setSelectedSubjectForEvaluation(subject);
      setStudentsForEvaluation(students);
      setShowStudentEvaluationModal(true);
      window.__evaluatedIds = evaluatedStudentIds;
      setIsEditingEvaluation(false);
      setEditingEvaluation(null);
    } catch (err) {
      console.error('Error in handleOpenEvaluationModal:', err);
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
      const res = await fetch(`${API_BASE_URL}/evaluations/${evaluationId}`, {
        method: 'DELETE'
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

  const getMajorityRating = useCallback((ratings) => {
    if (!ratings || ratings.length === 0) return null;
    if (ratings.some(r => r === 'fail')) return 'fail';
    
    const rank = { 'excellent': 4, 'good': 3, 'pass': 2, 'fail': 1 };
    const counts = {};
    let maxCount = 0;
    
    ratings.forEach(r => {
      if (!r) return;
      counts[r] = (counts[r] || 0) + 1;
      if (counts[r] > maxCount) maxCount = counts[r];
    });
    
    const candidates = Object.keys(counts).filter(r => counts[r] === maxCount);
    candidates.sort((a, b) => rank[b] - rank[a]);
    return candidates[0];
  }, []);

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
      'excellent': 'text-emerald-700 bg-emerald-50 border-emerald-200',
      'good': 'text-blue-700 bg-blue-50 border-blue-200',
      'pass': 'text-amber-700 bg-amber-50 border-amber-200',
      'fail': 'text-rose-700 bg-rose-50 border-rose-200'
    };
    return colors[value] || 'text-slate-600 bg-slate-50 border-slate-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-400 font-black tracking-widest uppercase text-xs">Loading Resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/teacher/home')}
                className="group p-3 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 active:scale-95 border border-slate-200 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                  ประเมินนักเรียน
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    EVALUATIONS
                  </span>
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] sm:max-w-md">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    จัดการและตรวจสอบการประเมิน
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                   if (teacherSubjects.length > 0) {
                     handleOpenEvaluationModal(teacherSubjects.find(s => String(s.id) === selectedSubject) || teacherSubjects[0]);
                   } else {
                     toast.error('ไม่พบรายวิชาที่รับผิดชอบ');
                   }
                }}
                className="group flex items-center gap-2.5 px-5 py-3 bg-blue-600 text-white rounded-lg font-black text-sm shadow-sm hover:bg-blue-700 transition-colors duration-300 active:scale-95"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span className="hidden sm:inline">เพิ่มการประเมิน</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Controls and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Stats Cards */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Brain className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">TOTAL</span>
                </div>
                <div>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{allEvaluations.length}</p>
                   <p className="text-xs font-bold text-slate-400 mt-1">การประเมินทั้งหมด</p>
                </div>
             </div>

             <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">SUBJECTS</span>
                </div>
                <div>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{teacherSubjects.length}</p>
                   <p className="text-xs font-bold text-slate-400 mt-1">วิชาที่รับผิดชอบ</p>
                </div>
             </div>

             <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                      <User className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">STUDENTS</span>
                </div>
                <div>
                   <p className="text-4xl font-black text-slate-800 tracking-tight">{new Set(allEvaluations.map(ev => ev.student_id)).size}</p>
                   <p className="text-xs font-bold text-slate-400 mt-1">จำนวนนักเรียนที่ประเมินแล้ว</p>
                </div>
             </div>
          </div>
          
          {/* Filters Bar */}
          <div className="lg:col-span-12">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
               <div className="relative flex-1 w-full md:w-auto group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                     <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อนักเรียน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all outline-none"
                  />
               </div>
               
               <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">                  {/* Year filter */}
                  {(() => {
                    const availableYears = [...new Set(allEvaluations.map(ev => ev.academic_year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
                    if (availableYears.length < 1) return null;
                    return (
                      <div className="relative min-w-[160px]">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full pl-4 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all outline-none appearance-none cursor-pointer text-slate-600"
                        >
                          <option value="">ทุกปีการศึกษา</option>
                          {availableYears.map(year => (
                            <option key={year} value={String(year)}>ปีการศึกษา {year}</option>
                          ))}
                        </select>
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    );
                  })()}                  <div className="relative min-w-[200px]">
                       <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full pl-4 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all outline-none appearance-none cursor-pointer text-slate-600"
                       >
                         {teacherSubjects.map(subject => (
                           <option key={subject.id} value={subject.id}>
                             {subject.code} - {subject.name}
                             {subject.is_grouped ? ' (รวม 2 เทอม)' : ''}
                           </option>
                         ))}
                       </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="relative min-w-[150px]">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-4 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all outline-none appearance-none cursor-pointer text-slate-600"
                      >
                        <option value="newest">ใหม่ที่สุด</option>
                        <option value="oldest">เก่าที่สุด</option>
                        <option value="student">ชื่อนักเรียน</option>
                        <option value="subject">ชื่อวิชา</option>
                      </select>
                      <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Evaluations List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
             <h3 className="text-lg font-black text-slate-800">รายการประเมินล่าสุด</h3>
             <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                Found {filteredEvaluations.length} items
             </span>
          </div>

          {filteredEvaluations.length === 0 ? (
            <div className="bg-white rounded-xl p-16 text-center border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">ยังไม่มีข้อมูลการประเมิน</h3>
              <p className="text-slate-400 font-medium">เริ่มสร้างการประเมินแรกของคุณโดยคลิกที่ปุ่ม "เพิ่มการประเมิน"</p>
            </div>
          ) : (() => {
            // Group filteredEvaluations by academic_year
            const yearGroups = filteredEvaluations.reduce((acc, ev) => {
              const yr = String(ev.academic_year || 'ไม่ระบุ');
              if (!acc[yr]) acc[yr] = [];
              acc[yr].push(ev);
              return acc;
            }, {});
            const sortedGroupYears = Object.keys(yearGroups).sort((a, b) => Number(b) - Number(a));
            return (
              <div className="space-y-8">
                {sortedGroupYears.map(yr => (
                  <div key={yr}>
                    {sortedGroupYears.length > 1 && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-black text-blue-700">ปีการศึกษา {yr}</span>
                          <span className="ml-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 text-[10px] font-black">{yearGroups[yr].length} รายการ</span>
                        </div>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                    {yearGroups[yr].map((evaluation) => (

                <div key={evaluation.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group">
                   <div className="flex flex-col xl:flex-row xl:items-start gap-6">
                      
                      {/* Left: Student Info */}
                      <div className="flex items-start gap-5 min-w-[300px]">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200 text-white flex items-center justify-center text-2xl font-black shrink-0 group-hover:scale-105 transition-transform">
                             {getInitials(evaluation.student_name)}
                          </div>
                          <div>
                              <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                                 {evaluation.student_name || 'ไม่ระบุชื่อ'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                    {evaluation.subject_code}
                                 </span>
                                 <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(evaluation.created_at).toLocaleDateString('th-TH', { 
                                       year: 'numeric', month: 'short', day: 'numeric' 
                                    })}
                                 </span>
                              </div>
                          </div>
                      </div>

                      {/* Middle: Scores */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" /> ทักษะการเรียนรู้
                             </p>
                             <div className="flex flex-wrap gap-2">
                                <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black border uppercase ${getRatingColor(evaluation.reading)}`}>
                                   อ่าน: {getRatingLabel(evaluation.reading)}
                                </span>
                                <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black border uppercase ${getRatingColor(evaluation.writing)}`}>
                                   เขียน: {getRatingLabel(evaluation.writing)}
                                </span>
                                <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black border uppercase ${getRatingColor(evaluation.analysis)}`}>
                                   คิด: {getRatingLabel(evaluation.analysis)}
                                </span>
                             </div>
                          </div>

                          {evaluation.characteristic_scores && evaluation.characteristic_scores.length > 0 && (
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> คุณลักษณะฯ
                               </p>
                               <div className="flex flex-wrap gap-2">
                                    {/* Show summary of characteristics if too many, or list first few */}
                                    {(() => {
                                      const ratings = evaluation.characteristic_scores.map(c => c.rating);
                                      const majority = getMajorityRating(ratings);
                                      if (majority) {
                                          return (
                                              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase flex items-center gap-2 ${getRatingColor(majority)}`}>
                                                  <Sparkles className="w-3 h-3" />
                                                  ภาพรวม: {getRatingLabel(majority)}
                                              </span>
                                          )
                                      }
                                      return null;
                                    })()}
                                    <span className="text-[10px] font-bold text-slate-400 self-center">
                                       ({evaluation.characteristic_scores.length} หัวข้อ)
                                    </span>
                               </div>
                            </div>
                          )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex xl:flex-col gap-2 shrink-0">
                          <button
                            onClick={() => {
                              const subject = teacherSubjects.find(s => s.id === evaluation.subject_id);
                              if (subject) handleEditEvaluation(subject, evaluation);
                            }} 
                            className="flex-1 xl:w-32 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-black text-xs hover:border-amber-200 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm"
                          >
                             <Edit2 className="w-3.5 h-3.5" /> แก้ไข
                          </button>
                          <button
                            onClick={() => openConfirm(
                              'ลบการประเมิน',
                              `คุณต้องการลบผลการประเมินของ " ${evaluation.student_name} " ใช่หรือไม่?`,
                              () => handleDeleteEvaluation(evaluation.id, evaluation.subject_id)
                            )}
                            className="flex-1 xl:w-32 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-black text-xs hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
                          >
                             <Trash2 className="w-3.5 h-3.5" /> ลบ
                          </button>
                      </div>
                   </div>
                </div>
              ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
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

// Helper for Initials
const getInitials = (name) => {
  if (!name) return '?';
  // simple 1st char for TH names usually works best or first 2
  return name.charAt(0);
};

export default TeacherEvaluationsPage;