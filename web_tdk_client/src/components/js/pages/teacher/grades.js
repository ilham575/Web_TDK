import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Edit2, 
  Trash2, 
  BarChart3, 
  User, 
  BookOpen, 
  LayoutGrid, 
  AlertTriangle, 
  X,
  FileText,
  CheckCircle2,
  ChevronRight,
  Info,
  ChevronDown
} from 'lucide-react';

// Modal Component for Portability and Cleanliness
const Modal = ({ isOpen, onClose, title, children, footer, type = 'default' }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className={`relative w-full ${type === 'summary' ? 'max-w-6xl' : 'max-w-lg'} bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className={`p-8 ${type === 'summary' ? 'max-h-[80vh] overflow-y-auto' : ''}`}>
          {children}
        </div>
        {footer && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

function GradesPage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null); 
  const selectedClassId = selectedClass ? selectedClass.id : null;
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [maxCollectedScore, setMaxCollectedScore] = useState(100);
  const [maxExamScore, setMaxExamScore] = useState(100);
  const [subjectName, setSubjectName] = useState('');
  const [subjectType, setSubjectType] = useState('main'); 
  const [grades, setGrades] = useState({}); 
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentMaxScore, setNewAssignmentMaxScore] = useState(100);
  const [newAssignmentClassroomId, setNewAssignmentClassroomId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editAssignmentTitle, setEditAssignmentTitle] = useState('');
  const [editAssignmentMaxScore, setEditAssignmentMaxScore] = useState(100);
  const [editAssignmentClassroomId, setEditAssignmentClassroomId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const checkIsExam = (title) => {
    if (!title) return false;
    const t = title.toLowerCase();
    // Only count major exams as "Exam Score", others go to "Collected Score"
    return t.includes('กลางภาค') || t.includes('ปลายภาค') || t.includes('final') || t.includes('midterm') || t.includes('คะแนนสอบ');
  };

  // Update document title with school name
  useEffect(() => {
    const schoolName = localStorage.getItem('school_name');
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (schoolName && schoolName !== '-') ? `${baseTitle} - ${schoolName}` : baseTitle;
  }, []);

  const calculateGrade = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'C+';
    if (percentage >= 60) return 'C';
    if (percentage >= 55) return 'D+';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const calculatePercentage = (score, max) => {
    if (!score || !max || max === 0) return 0;
    const validScore = Math.min(Number(score), max);
    return Math.round((validScore / max) * 100);
  };

  useEffect(()=>{
    const load = async ()=>{
      try{
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/subjects/${id}/students`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        const data = await res.json();
        if (Array.isArray(data)){
          setStudents(data);

          const makeClassObj = (s) => {
            let id = null;
            let label = 'Default';
            if (s.classroom && (s.classroom.name || s.classroom.id)) {
              label = s.classroom.name || String(s.classroom.id);
              id = s.classroom.id || null;
            } else if (s.classroom_name) {
              label = s.classroom_name;
            } else if (s.class_name) {
              label = s.class_name;
            } else if (s.grade_level && s.section) {
              label = `${s.grade_level} ${s.section}`;
            } else if (s.grade_level) {
              label = String(s.grade_level);
            } else if (s.homeroom) {
              label = s.homeroom;
            } else if (s.section) {
              label = s.section;
            }
            const key = id ? `id:${id}` : `label:${label}`;
            return { key, id, label };
          };

          const classMap = {};
          data.forEach(s => {
            const c = makeClassObj(s);
            classMap[c.key] = c;
          });
          const distinct = Object.values(classMap);
          const extractNumbers = (str) => {
            if (!str) return [];
            const match = String(str).match(/\d+/g);
            return match ? match.map(n => Number(n)) : [];
          };
          const compareLabels = (a, b) => {
            const na = extractNumbers(a.label);
            const nb = extractNumbers(b.label);
            const len = Math.max(na.length, nb.length);
            for (let i = 0; i < len; i++) {
              const ai = na[i] ?? 0;
              const bi = nb[i] ?? 0;
              if (ai !== bi) return ai - bi;
            }
            return String(a.label).localeCompare(String(b.label), 'th');
          };
          distinct.sort(compareLabels);
          setClasses(distinct);
          setSelectedClass(distinct.length === 1 ? distinct[0] : null);
        } else setStudents([]);
      }catch(err){ setStudents([]); }
    };
    load();
  },[id]);

  useEffect(() => {
    const loadSubject = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { ...(token?{Authorization:`Bearer ${token}`}:{}) };
        const res = await fetch(`${API_BASE_URL}/subjects/${id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const name = data.name || data.title || data.subject_name || '';
          if (name) setSubjectName(name);
          if (data.subject_type) setSubjectType(data.subject_type);
          setMaxCollectedScore(data.max_collected_score || 100);
          setMaxExamScore(data.max_exam_score || 100);
        } else {
          if (students && students.length > 0) {
            const s = students[0];
            const fallbackName = (s && (s.subject_name || (s.subject && (s.subject.name || s.subject.title)))) || '';
            if (fallbackName) setSubjectName(fallbackName);
          }
        }
      } catch (err) {
        if (students && students.length > 0) {
          const s = students[0];
          const fallbackName = (s && (s.subject_name || (s.subject && (s.subject.name || s.subject.title)))) || '';
          if (fallbackName) setSubjectName(fallbackName);
        }
      }
    };
    if (id) loadSubject();
  }, [id, students]);

  const findClassroomIdByLabel = async (label) => {
    if (!label) return null;
    try {
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) return null;
      const res = await fetch(`${API_BASE_URL}/classrooms/list/${schoolId}`, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data)) return null;
      const normalize = (s) => {
        if (!s) return '';
        try { return String(s).normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase(); } catch(e) { return String(s).replace(/[^\w\s]/g,'').replace(/\s+/g,' ').trim().toLowerCase(); }
      };
      const target = normalize(label);
      let found = data.find(ac => normalize(ac.name || '') === target);
      if (!found) {
        found = data.find(ac => normalize(ac.name || '').includes(target) || target.includes(normalize(ac.name || '')));
      }
      return found ? found.id : null;
    } catch (err) {
      return null;
    }
  };

  const refreshAssignmentsAndGrades = async ()=>{
      try{
        if (classes.length === 0) return;
        
        const token = localStorage.getItem('token');
        let classroomIdToFilter = null;
        if (classes.length === 1 && classes[0].id) {
          classroomIdToFilter = classes[0].id;
        } else if (selectedClass && selectedClass.id) {
          classroomIdToFilter = selectedClass.id;
        }
        
        if (!classroomIdToFilter) {
          const classToResolve = selectedClass || (classes.length === 1 ? classes[0] : null);
          if (classToResolve && classToResolve.label && !classToResolve.id) {
            const foundId = await findClassroomIdByLabel(classToResolve.label);
            if (foundId) {
              classroomIdToFilter = foundId;
              if (classes.length === 1) {
                setClasses([{ ...classes[0], id: foundId, key: `id:${foundId}` }]);
                setSelectedClass({ ...classes[0], id: foundId, key: `id:${foundId}` });
              } else if (selectedClass) {
                setSelectedClass(prev => prev ? { ...prev, id: foundId, key: `id:${foundId}` } : prev);
                setClasses(prev => prev.map(c => c.key === classToResolve.key ? { ...c, id: foundId, key: `id:${foundId}` } : c));
              }
            }
          }
        }
        
        const assignmentUrl = `${API_BASE_URL}/grades/assignments/${id}${classroomIdToFilter ? `?classroom_id=${classroomIdToFilter}` : ''}`;
        const assignmentsRes = await fetch(assignmentUrl, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!assignmentsRes.ok) return;
        const assignmentsData = await assignmentsRes.json();
        const assignmentList = assignmentsData
          .filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม")
          .map(assignment => ({
            id: assignment.classroom_id ? `${assignment.title}::${assignment.classroom_id}` : assignment.title,
            title: assignment.title,
            max_score: assignment.max_score,
            classroom_id: assignment.classroom_id || null,
            created_at: new Date().toISOString()
          }));
        setAssignments(assignmentList);
        
        const gradesUrl = `${API_BASE_URL}/grades/?subject_id=${id}${classroomIdToFilter ? `&classroom_id=${classroomIdToFilter}` : ''}`;
        const gradesRes = await fetch(gradesUrl, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!gradesRes.ok) return;
        const gradesData = await gradesRes.json();
        
        const gradesMap = {};
        if (Array.isArray(gradesData)){
          gradesData.forEach(record => {
            if (record.title) {
                const assignmentKey = record.classroom_id ? `${record.title}::${record.classroom_id}` : record.title;
                if (!gradesMap[assignmentKey]) gradesMap[assignmentKey] = {};
                gradesMap[assignmentKey][record.student_id] = record.grade;
            }
          });
        }
        setGrades(gradesMap);
        
        if (assignmentList.length > 0) {
          let assignmentToSelect = assignmentList[0];
          if (selectedAssignmentId) {
            const existing = assignmentList.find(a => a.id === selectedAssignmentId);
            if (existing) assignmentToSelect = existing;
          }
          setSelectedAssignmentId(assignmentToSelect.id);
          setTitle(assignmentToSelect.title);
          setMaxScore(assignmentToSelect.max_score);
        }
      } catch (err) { console.error('Failed to load assignments and grades:', err); }
  };

  useEffect(()=>{
    setAssignments([]);
    setGrades({});
    setSelectedAssignmentId(null);
    setTitle('');
    setMaxScore(100);
    if (classes.length > 0 || selectedClassId) {
      refreshAssignmentsAndGrades();
    }
  },[id, selectedClassId, classes.length]);

  const setGrade = (sid, value) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > maxScore) {
      toast.error(`คะแนนต้องไม่เกิน ${maxScore} คะแนน`);
      return;
    }
    if (!isNaN(numValue) && numValue < 0) {
      toast.error('คะแนนต้องไม่ติดลบ');
      return;
    }
    setGrades(prev => ({
      ...prev,
      [selectedAssignmentId]: {
        ...prev[selectedAssignmentId],
        [sid]: value
      }
    }));
  };

  const save = async ()=>{
    if (!title.trim()) {
      toast.error('กรุณาใส่หัวข้องาน');
      return;
    }
    if (maxScore <= 0) {
      toast.error('คะแนนเต็มต้องมากกว่า 0');
      return;
    }

    const currentGrades = grades[selectedAssignmentId] || {};
    for (const [studentId, grade] of Object.entries(currentGrades)) {
      const numGrade = Number(grade);
      if (!isNaN(numGrade) && numGrade > maxScore) {
        toast.error(`คะแนนของนักเรียนต้องไม่เกิน ${maxScore} คะแนน`);
        return;
      }
      if (!isNaN(numGrade) && numGrade < 0) {
        toast.error('คะแนนต้องไม่ติดลบ');
        return;
      }
    }

    try{
      const token = localStorage.getItem('token');
      const selectedAssignmentObjForSave = assignments.find(a => a.id === selectedAssignmentId);
      const payload = {
        subject_id: Number(id),
        title: title.trim(),
        max_score: Number(maxScore),
        classroom_id: selectedAssignmentObjForSave ? selectedAssignmentObjForSave.classroom_id || null : (selectedClassId || null),
        grades: Object.entries(currentGrades).map(([student_id, grade])=>({
          student_id: Number(student_id),
          grade: grade ? Number(grade) : null
        }))
      };
      const res = await fetch(`${API_BASE_URL}/grades/bulk`, { method:'POST', headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(payload)});
      if(!res.ok){ const d = await res.json().catch(()=>({})); toast.error(d.detail || 'Save failed'); } 
      else { toast.success('บันทึกคะแนนเรียบร้อยแล้ว'); }
    }catch(err){ toast.error('เกิดข้อผิดพลาดในการบันทึก'); }
  };

  const selectAssignment = (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setTitle(assignment.title);
      setMaxScore(assignment.max_score);
    }
  };

  const createNewAssignment = () => {
    setShowCreateModal(true);
    setNewAssignmentClassroomId(selectedClassId || null);
  };

  const handleCreateAssignment = async () => {
    if (!newAssignmentTitle.trim()) {
      toast.error('กรุณาใส่หัวข้องาน');
      return;
    }
    if (newAssignmentTitle.trim() === "คะแนนเก็บรวม" || newAssignmentTitle.trim() === "คะแนนสอบรวม") {
      toast.error('ไม่สามารถใช้ชื่อหัวข้องานนี้ได้ (สงวนไว้สำหรับระบบสรุปคะแนน)');
      return;
    }
    if (newAssignmentMaxScore <= 0) {
      toast.error('คะแนนเต็มต้องมากกว่า 0');
      return;
    }

    let resolvedClassroomId = selectedClassId || null;
    if (selectedClass && !selectedClass.id) {
      const foundId = await findClassroomIdByLabel(selectedClass.label);
      if (foundId) {
        resolvedClassroomId = foundId;
        setSelectedClass(prev => prev ? { ...prev, id: foundId, key: `id:${foundId}` } : prev);
        setClasses(prev => prev.map(c => c.key === selectedClass.key ? { ...c, id: foundId, key: `id:${foundId}` } : c));
      } else {
        toast.error('ชั้นเรียนที่เลือกยังไม่ได้สร้างในระบบ กรุณาสร้างชั้นเรียนก่อน');
        return;
      }
    }

    const existingAssignment = assignments.find(a => a.title.toLowerCase() === newAssignmentTitle.trim().toLowerCase());
    if (existingAssignment) {
      toast.error('หัวข้องานนี้มีอยู่แล้ว');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payloadClassroomId = selectedClassId || resolvedClassroomId || null;
      const payload = {
        title: newAssignmentTitle.trim(),
        max_score: newAssignmentMaxScore,
        classroom_id: payloadClassroomId
      };
      
      const res = await fetch(`${API_BASE_URL}/grades/assignments/${id}`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }, 
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'ไม่สามารถสร้างหัวข้องานได้');
        return;
      }
      
      const newAssignment = await res.json();
      const createdClassroomId = (newAssignment && typeof newAssignment.classroom_id !== 'undefined') ? newAssignment.classroom_id : payloadClassroomId;

      setAssignments(prev => [...prev, {
        id: createdClassroomId ? `${newAssignment.title}::${createdClassroomId}` : newAssignment.title,
        title: newAssignment.title,
        max_score: newAssignment.max_score,
        classroom_id: createdClassroomId || null,
        created_at: new Date().toISOString()
      }]);
      
      setGrades(prev => ({ ...prev, [newAssignment.title]: {} }));
      
      setNewAssignmentTitle('');
      setNewAssignmentMaxScore(100);
      setNewAssignmentClassroomId(null);
      setShowCreateModal(false);
      
      await refreshAssignmentsAndGrades();
      const newAssignmentId = createdClassroomId ? `${newAssignment.title}::${createdClassroomId}` : newAssignment.title;
      setSelectedAssignmentId(newAssignmentId);
      setTitle(newAssignment.title);
      setMaxScore(newAssignment.max_score);
      toast.success('สร้างหัวข้องานใหม่เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Failed to create assignment:', err);
      toast.error('เกิดข้อผิดพลาดในการสร้างหัวข้องาน');
    }
  };

  const handleEditAssignment = async () => {
    if (!editAssignmentTitle.trim()) {
      toast.error('กรุณาใส่หัวข้องาน');
      return;
    }
    if (editAssignmentTitle.trim() === "คะแนนเก็บรวม" || editAssignmentTitle.trim() === "คะแนนสอบรวม") {
      toast.error('ไม่สามารถใช้ชื่อหัวข้องานนี้ได้ (สงวนไว้สำหรับระบบสรุปคะแนน)');
      return;
    }
    if (editAssignmentMaxScore <= 0) {
      toast.error('คะแนนเต็มต้องมากกว่า 0');
      return;
    }

    const existingAssignment = assignments.find(a => 
      a.title.toLowerCase() === editAssignmentTitle.trim().toLowerCase() && 
      (a.classroom_id || null) === (editingAssignment.classroom_id || null) &&
      a.id !== editingAssignment.id
    );
    if (existingAssignment) {
      toast.error('หัวข้องานนี้มีอยู่แล้ว');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: editAssignmentTitle.trim(),
        max_score: editAssignmentMaxScore,
          classroom_id: editingAssignment.classroom_id || null
      };
      
      const editUrl = `${API_BASE_URL}/grades/assignments/${id}/${editingAssignment.title}${editingAssignment.classroom_id ? `?classroom_id=${editingAssignment.classroom_id}` : ''}`;
      const res = await fetch(editUrl, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }, 
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'ไม่สามารถแก้ไขหัวข้องานได้');
        return;
      }
      
      const updatedAssignment = await res.json();
      
      setAssignments(prev => prev.map(assignment => {
        if (assignment.id !== editingAssignment.id) return assignment;
        const updatedId = updatedAssignment.classroom_id ? `${updatedAssignment.title}::${updatedAssignment.classroom_id}` : updatedAssignment.title;
        return { ...assignment, id: updatedId, title: updatedAssignment.title, max_score: updatedAssignment.max_score, classroom_id: updatedAssignment.classroom_id || assignment.classroom_id };
      }));
      
      if (updatedAssignment.title !== editingAssignment.title) {
        setGrades(prev => {
          const newGrades = { ...prev };
          newGrades[updatedAssignment.title] = newGrades[editingAssignment.title] || {};
          delete newGrades[editingAssignment.title];
          return newGrades;
        });
        
        const updatedAssignmentId = updatedAssignment.classroom_id ? `${updatedAssignment.title}::${updatedAssignment.classroom_id}` : updatedAssignment.title;
        if (selectedAssignmentId === editingAssignment.id) {
          setSelectedAssignmentId(updatedAssignmentId);
          setTitle(updatedAssignment.title);
        }
      } else {
        if (selectedAssignmentId === editingAssignment.id) setMaxScore(updatedAssignment.max_score);
      }
      
      setEditingAssignment(null);
      setEditAssignmentTitle('');
      setEditAssignmentMaxScore(100);
      setEditAssignmentClassroomId(null);
      setShowEditModal(false);
      await refreshAssignmentsAndGrades();
      toast.success('แก้ไขหัวข้องานเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Failed to edit assignment:', err);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขหัวข้องาน');
    }
  };

  const confirmDeleteAssignment = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/grades/assignments/${id}/${deletingAssignment.title}${deletingAssignment.classroom_id ? `?classroom_id=${deletingAssignment.classroom_id}` : ''}`, { 
        method: 'DELETE', 
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'ไม่สามารถลบหัวข้องานได้');
        return;
      }
      
      setAssignments(prev => prev.filter(assignment => assignment.id !== deletingAssignment.id));
      setGrades(prev => {
        const newGrades = { ...prev };
        delete newGrades[deletingAssignment.title];
        return newGrades;
      });
      
      if (selectedAssignmentId === deletingAssignment.id) {
        const remainingAssignments = assignments.filter(a => a.id !== deletingAssignment.id);
        if (remainingAssignments.length > 0) {
          setSelectedAssignmentId(remainingAssignments[0].id);
          setTitle(remainingAssignments[0].title);
          setMaxScore(remainingAssignments[0].max_score);
        } else {
          setSelectedAssignmentId(null);
          setTitle('');
          setMaxScore(100);
        }
      }
      
      setDeletingAssignment(null);
      setShowDeleteModal(false);
      await refreshAssignmentsAndGrades();
      toast.success('ลบหัวข้องานเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      toast.error('เกิดข้อผิดพลาดในการลบหัวข้องาน');
    }
  };

  const calculateStudentSummary = (studentId) => {
    let rawCollectedScore = 0;
    let rawCollectedMax = 0;
    let rawExamScore = 0;
    let rawExamMax = 0;
    let activityScore = 0;
    let activityMax = 0;
    
    const assignmentDetails = [];

    // Assignments from the database
    assignments.forEach(assignment => {
      // PROPER FILTER: Only show assignments belonging to the student's classroom OR global assignments
      const student = students.find(s => s.id === studentId);
      // Try to find classroom ID from various possible student properties
      const studentClassId = (student?.classroom?.id) || (student?.classroom_id) || null;
      
      if (assignment.classroom_id && assignment.classroom_id !== studentClassId) return;

      // Exclude system summary titles from raw calculations and details list
      if (assignment.title === "คะแนนเก็บรวม" || assignment.title === "คะแนนสอบรวม") return;

      const assignmentGrades = grades[assignment.id] || {};
      const rawScore = assignmentGrades[studentId] ? Number(assignmentGrades[studentId]) : 0;
      const score = Math.min(rawScore, assignment.max_score);
      const maxScore = assignment.max_score;

      const isExam = checkIsExam(assignment.title);
      
      if (subjectType === 'activity') {
        activityScore += score;
        activityMax += maxScore;
      } else {
        if (isExam) {
          rawExamScore += score;
          rawExamMax += maxScore;
        } else {
          rawCollectedScore += score;
          rawCollectedMax += maxScore;
        }
      }

      assignmentDetails.push({
        id: assignment.id,
        title: assignment.title,
        score: score,
        maxScore: maxScore,
        isExam: isExam,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
      });
    });

    const hasRealCollectedAssignments = assignments.some(a => !checkIsExam(a.title) && a.title !== "คะแนนเก็บรวม");
    const hasRealExamAssignments = assignments.some(a => checkIsExam(a.title) && a.title !== "คะแนนสอบรวม");

    // Final Calculate based on Admin Max Scores
    let collectedScore = 0;
    let examScore = 0;
    let totalScore = 0;
    let totalMaxScore = (subjectType === 'activity') ? maxCollectedScore : (maxCollectedScore + maxExamScore);

    // Look for manual summary grades if no real assignments
    const student = students.find(s => s.id === studentId);
    const studentClassId = (student?.classroom?.id) || (student?.classroom_id) || selectedClass?.id || null;
    const manualCollected = grades["คะแนนเก็บรวม"]?.[studentId] || (studentClassId ? grades[`คะแนนเก็บรวม::${studentClassId}`]?.[studentId] : null);
    const manualExam = grades["คะแนนสอบรวม"]?.[studentId] || (studentClassId ? grades[`คะแนนสอบรวม::${studentClassId}`]?.[studentId] : null);

    if (subjectType === 'activity') {
      if (assignments.length === 0 && manualCollected !== undefined) {
        totalScore = Math.min(Number(manualCollected), maxCollectedScore);
      } else {
        totalScore = activityMax > 0 ? Math.round((activityScore / activityMax) * maxCollectedScore) : activityScore;
      }
    } else {
      // Collected Score
      if (!hasRealCollectedAssignments && manualCollected !== undefined) {
        collectedScore = Math.min(Number(manualCollected), maxCollectedScore);
      } else {
        collectedScore = rawCollectedMax > 0 ? Math.round((rawCollectedScore / rawCollectedMax) * maxCollectedScore) : rawCollectedScore;
      }

      // Exam Score
      if (!hasRealExamAssignments && manualExam !== undefined) {
        examScore = Math.min(Number(manualExam), maxExamScore);
      } else {
        examScore = rawExamMax > 0 ? Math.round((rawExamScore / rawExamMax) * maxExamScore) : rawExamScore;
      }

      totalScore = collectedScore + examScore;
    }

    const overallPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const overallGrade = calculateGrade(overallPercentage);

    return { 
      totalScore, 
      totalMaxScore, 
      collectedScore, 
      examScore, 
      overallPercentage, 
      overallGrade, 
      assignmentDetails 
    };
  };

  const getClassKey = (s) => {
    if (!s) return 'label:Default';
    if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.id ? `id:${s.classroom.id}` : `label:${s.classroom.name || String(s.classroom.id)}`;
    if (s.classroom_name) return `label:${s.classroom_name}`;
    if (s.class_name) return `label:${s.class_name}`;
    if (s.grade_level && s.section) return `label:${s.grade_level} ${s.section}`;
    if (s.grade_level) return `label:${s.grade_level}`;
    if (s.homeroom) return `label:${s.homeroom}`;
    if (s.section) return `label:${s.section}`;
    return 'label:Default';
  };

  const visibleStudents = selectedClass ? students.filter(s => getClassKey(s) === selectedClass.key) : students;
  const selectedAssignmentObj = assignments.find(a => a.id === selectedAssignmentId);
  const selectedAssignmentClassLabel = selectedAssignmentObj ? (selectedAssignmentObj.classroom_id ? (classes.find(c => c.id === selectedAssignmentObj.classroom_id)?.label || `#${selectedAssignmentObj.classroom_id}`) : 'ทุกชั้น') : '';

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      
      {/* Navigation Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-5">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all active:scale-95 border border-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">บันทึกคะแนนรายวิชา</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-emerald-500" />
                  {subjectName || `วิชา #${id}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(`/teacher/subject/${id}/summary`)}
                className="flex items-center gap-2 px-3 sm:px-6 py-3.5 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">รายงานคะแนน</span>
              </button>
              <button 
                onClick={() => setShowSummaryModal(true)}
                className="hidden md:flex items-center gap-2 px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
              >
                <BarChart3 className="w-5 h-5" />
                <span>สรุปคะแนน</span>
              </button>
              <button 
                onClick={save}
                disabled={!selectedAssignmentId}
                className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>บันทึกคะแนน</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Class Selector */}
            {classes.length > 1 && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">เลือกสำรวจชั้นเรียน</h3>
                </div>
                <div className="space-y-2">
                  {classes.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setSelectedClass(c)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all ${
                        selectedClass?.key === c.key 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 translate-x-1' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span>{c.label}</span>
                      {selectedClass?.key === c.key && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment Selector */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">หัวข้องาน</h3>
                 </div>
                 <button 
                  onClick={createNewAssignment}
                  disabled={classes.length > 1 && !selectedClass}
                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50"
                 >
                   <Plus className="w-5 h-5" />
                 </button>
               </div>

               {assignments.length === 0 ? (
                 <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">ยังไม่มีหัวข้องาน</p>
                    <button 
                      onClick={createNewAssignment}
                      className="mt-4 text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline"
                    >
                      + สร้างใหม่ตอนนี้
                    </button>
                 </div>
               ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <select
                      value={selectedAssignmentId || ''}
                      onChange={(e) => selectAssignment(e.target.value)}
                      className="w-full pl-5 pr-11 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-black transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="">-- เลือกหัวข้องาน --</option>
                      {assignments.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.max_score} คะแนน)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>

                  {selectedAssignmentId && (
                    <div className="flex gap-2">
                       <button
                        onClick={() => {
                          const a = assignments.find(x => x.id === selectedAssignmentId);
                          setEditingAssignment(a);
                          setEditAssignmentTitle(a.title);
                          setEditAssignmentMaxScore(a.max_score);
                          setShowEditModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
                       >
                         <Edit2 className="w-3.5 h-3.5" /> แก้ไข
                       </button>
                       <button
                        onClick={() => {
                          const a = assignments.find(x => x.id === selectedAssignmentId);
                          setDeletingAssignment(a);
                          setShowDeleteModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-rose-500 rounded-xl font-bold text-xs hover:bg-rose-50 transition-colors"
                       >
                         <Trash2 className="w-3.5 h-3.5" /> ลบ
                       </button>
                    </div>
                  )}
                </div>
               )}
            </div>

            {/* Visual Reminder */}
            {selectedAssignmentId && (
              <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-amber-200/50 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-amber-800 font-black text-sm tracking-tight mb-1">คำแนะนำ</h4>
                    <p className="text-amber-700/70 text-[11px] font-bold leading-relaxed uppercase tracking-wider">
                      หลังจากกรอกคะแนนแล้ว อย่าลืมกดปุ่ม "บันทึกคะแนน" ด้านบนเพื่อยืนยันข้อมูล
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Areas */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
              
              {!selectedAssignmentId ? (
                <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <BarChart3 className="w-10 h-10 text-slate-200" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">ยังไม่มีตารางการให้คะแนน</h2>
                  <p className="text-slate-400 font-bold text-sm max-w-xs leading-relaxed">
                    {!selectedClass && classes.length > 1 
                      ? "กรุณาเลือกชั้นเรียนจากรายการด้านซ้ายเพื่อดูข้อมูล" 
                      : "เลือกหัวข้องาน หรือสร้างหัวข้องานใหม่เพื่อเริ่มบันทึกคะแนนให้กับนักเรียนของคุณ"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-8 border-b border-slate-50 bg-slate-50/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-black text-slate-800 tracking-tight leading-none">{title}</h2>
                          <div className="flex items-center gap-4 mt-2">
                             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">
                               MAX: {maxScore} PTS
                             </span>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-4 flex items-center gap-1">
                               <LayoutGrid className="w-3 h-3" /> {selectedAssignmentClassLabel}
                             </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop View: Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ข้อมูลนักเรียน</th>
                          <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">คะแนน / เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleStudents.map((s, idx) => {
                          const currentGrades = grades[selectedAssignmentId] || {};
                          const score = currentGrades[s.id] ? Number(currentGrades[s.id]) : null;
                          const percentage = score !== null ? calculatePercentage(score, maxScore) : null;
                          const gradeLetter = percentage !== null ? calculateGrade(percentage) : null;
                          const isInvalid = currentGrades[s.id] && Number(currentGrades[s.id]) > maxScore;

                          return (
                            <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs border-2 border-white group-hover:border-emerald-100 transition-all">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition-colors">
                                      {s.full_name || s.username}
                                    </h4>
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">STUDENT ID: {s.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxScore}
                                      value={currentGrades[s.id] || ''}
                                      onChange={e=>setGrade(s.id, e.target.value)}
                                      placeholder="-"
                                      className={`w-28 px-4 py-3 bg-white border rounded-2xl text-center text-sm font-black transition-all outline-none focus:ring-4 ${
                                        isInvalid 
                                        ? 'border-rose-300 bg-rose-50 text-rose-600 focus:ring-rose-500/10' 
                                        : 'border-slate-100 hover:border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10'
                                      }`}
                                    />
                                    {gradeLetter && (
                                       <span className={`absolute -right-12 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl text-[11px] font-black border uppercase ${
                                         percentage >= 80 ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' :
                                         percentage >= 70 ? 'bg-blue-600 text-white border-blue-600' :
                                         percentage >= 50 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                         'bg-rose-100 text-rose-600 border-rose-200'
                                       }`}>
                                         {gradeLetter}
                                       </span>
                                    )}
                                  </div>
                                  
                                  {isInvalid && (
                                    <span className="text-[10px] font-black text-rose-500 flex items-center gap-1 animate-pulse uppercase">
                                      <AlertTriangle className="w-3 h-3" /> Exceeds Max
                                    </span>
                                  )}
                                  
                                  {percentage !== null && !isInvalid && (
                                    <div className="w-28 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-500 ${
                                          percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Cards */}
                  <div className="md:hidden grid grid-cols-1 divide-y divide-slate-100">
                      {visibleStudents.map((s, idx) => {
                          const currentGrades = grades[selectedAssignmentId] || {};
                          const score = currentGrades[s.id] ? Number(currentGrades[s.id]) : null;
                          const percentage = score !== null ? calculatePercentage(score, maxScore) : null;
                          const gradeLetter = percentage !== null ? calculateGrade(percentage) : null;
                          const isInvalid = currentGrades[s.id] && Number(currentGrades[s.id]) > maxScore;

                          return (
                              <div key={s.id} className="p-4 flex flex-col gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs border-2 border-white">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-black text-slate-800">
                                        {s.full_name || s.username}
                                      </h4>
                                      <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">STUDENT ID: {s.id}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start justify-between pl-[3.5rem] bg-slate-50/50 p-4 rounded-xl border border-slate-50/50">
                                      <div className="flex flex-col gap-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Input</span>
                                          <input
                                            type="number"
                                            min="0"
                                            max={maxScore}
                                            value={currentGrades[s.id] || ''}
                                            onChange={e=>setGrade(s.id, e.target.value)}
                                            placeholder="—"
                                            className={`w-24 px-4 py-3 bg-white border rounded-xl text-center text-lg font-black transition-all outline-none focus:ring-4 ${
                                              isInvalid 
                                              ? 'border-rose-300 bg-rose-50 text-rose-600 focus:ring-rose-500/10' 
                                              : 'border-slate-100 hover:border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10'
                                            }`}
                                          />
                                          {isInvalid && (
                                            <span className="text-[10px] font-black text-rose-500 flex items-center gap-1 animate-pulse uppercase">
                                              <AlertTriangle className="w-3 h-3" /> Exceeds Max
                                            </span>
                                          )}
                                      </div>

                                      <div className="flex flex-col gap-1.5 items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade</span>
                                        {gradeLetter ? (
                                           <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-lg font-black border uppercase ${
                                             percentage >= 80 ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' :
                                             percentage >= 70 ? 'bg-blue-600 text-white border-blue-600' :
                                             percentage >= 50 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                             'bg-rose-100 text-rose-600 border-rose-200'
                                           }`}>
                                             {gradeLetter}
                                           </div>
                                        ): (
                                            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-300">
                                              <span className="text-2xl">-</span>
                                            </div>
                                        )}
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Create Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="สร้างหัวข้องานใหม่"
        footer={(
          <>
            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button onClick={handleCreateAssignment} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all">ยืนยันการสร้าง</button>
          </>
        )}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หัวข้องาน</label>
            <input
              type="text"
              value={newAssignmentTitle}
              onChange={(e) => setNewAssignmentTitle(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all outline-none"
              placeholder="เข่น ทดสอบก่อนเรียน ครั้งที่ 1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ชั้นเรียน</label>
            <div className="w-full px-5 py-4 bg-slate-100/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-500">
              {selectedClass ? selectedClass.label : 'ทุกชั้น (Global)'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">คะแนนเต็ม</label>
            <input
              type="number"
              value={newAssignmentMaxScore}
              onChange={(e) => setNewAssignmentMaxScore(Number(e.target.value))}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-black transition-all outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="แก้ไขหัวข้องาน"
        footer={(
          <>
            <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button onClick={handleEditAssignment} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all">บันทึกการแก้ไข</button>
          </>
        )}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หัวข้องาน</label>
            <input
              type="text"
              value={editAssignmentTitle}
              onChange={(e) => setEditAssignmentTitle(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">คะแนนเต็ม</label>
            <input
              type="number"
              value={editAssignmentMaxScore}
              onChange={(e) => setEditAssignmentMaxScore(Number(e.target.value))}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-black transition-all outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="ยืนยันการลบ"
        footer={(
          <>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button onClick={confirmDeleteAssignment} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">ลบหัวข้องาน</button>
          </>
        )}
      >
        <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
              คุณต้องการลบงาน <span className="text-rose-500">"{deletingAssignment?.title}"</span> หรือไม่?
            </h4>
            <p className="mt-4 text-slate-400 text-sm font-bold leading-relaxed px-4">
              การลบข้อมูลจะไม่สามารถย้อนกลับได้ และคะแนนของนักเรียนทั้งหมดในงานนี้จะหายไปจากระบบทันที
            </p>
        </div>
      </Modal>

      {/* Summary Modal */}
      <Modal 
        isOpen={showSummaryModal} 
        onClose={() => setShowSummaryModal(false)}
        title={`📊 สรุปคะแนนรวม - ${subjectName || `#${id}`}`}
        type="summary"
        footer={(
          <button onClick={() => setShowSummaryModal(false)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all">ปิดหน้าต่าง</button>
        )}
      >
        {(!selectedClass && classes.length > 1) ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
              กรุณาเลือกชั้นเรียนก่อนดูสรุปคะแนน
            </h4>
            <p className="mt-4 text-slate-400 text-sm font-bold leading-relaxed px-4">
              การสรุปคะแนนจะแสดงเฉพาะนักเรียนในชั้นเรียนที่เลือก เพื่อให้ข้อมูลถูกต้องและครบถ้วน
            </p>
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="text-center py-20">
             <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold">ไม่พบรายชื่อนักเรียนในกลุ่มนี้</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">หัวข้องานทั่งหมด</p>
                <p className="text-2xl font-black text-slate-800">{assignments.length}</p>
              </div>
              <div className="bg-emerald-50 rounded-[1.5rem] p-6 border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">นักเรียนในกลุ่ม</p>
                <p className="text-2xl font-black text-emerald-700">{visibleStudents.length}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
              {/* Desktop View: Table */}
              <div className="hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">อันดับ</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">รายชื่อนักเรียน</th>
                      {assignments.filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม").map(a => (
                        <th key={a.id} className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[120px]">
                          {a.title}<br/>
                          <span className="text-emerald-600">(/{a.max_score})</span>
                        </th>
                      ))}
                      {subjectType === 'activity' ? (
                        <th className="px-6 py-4 text-center text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50">คะแนนทั้งหมด</th>
                      ) : (
                        <>
                          <th className="px-6 py-4 text-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50">
                            คะแนนเก็บ<br/><span className="text-blue-400 font-bold">(/{maxCollectedScore})</span>
                          </th>
                          <th className="px-6 py-4 text-center text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50">
                            คะแนนสอบ<br/><span className="text-amber-400 font-bold">(/{maxExamScore})</span>
                          </th>
                        </>
                      )}
                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-100">รวม / เกรด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      const withSummaries = visibleStudents.map(s => ({
                        ...s,
                        summary: calculateStudentSummary(s.id)
                      })).sort((a, b) => b.summary.totalScore - a.summary.totalScore);
                      
                      let currentRank = 1;
                      withSummaries.forEach((s, idx) => {
                        if (idx > 0 && s.summary.totalScore < withSummaries[idx-1].summary.totalScore) {
                          currentRank = idx + 1;
                        }
                        s.rank = currentRank;
                      });
                      
                      return withSummaries.map(student => {
                        const summary = student.summary;
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs ${
                                student.rank === 1 ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-sm shadow-amber-100' :
                                student.rank === 2 ? 'bg-slate-100 text-slate-500 border border-slate-200 shadow-sm shadow-slate-100' :
                                student.rank === 3 ? 'bg-orange-50 text-orange-600 border border-orange-100 shadow-sm shadow-orange-50' :
                                'text-slate-400'
                              }`}>
                                {student.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <h5 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{student.full_name || student.username}</h5>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {student.id}</p>
                            </td>
                            {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map((detail, index) => (
                              <td key={index} className="px-6 py-4 text-center">
                                <span className="text-xs font-black text-slate-600">{detail.score}</span>
                                <span className="ml-1 text-[10px] font-bold text-slate-300">({detail.percentage}%)</span>
                              </td>
                            ))}
                          {subjectType === 'activity' ? (
                            <td className="px-6 py-4 text-center bg-emerald-50/30 font-black text-emerald-700 text-sm">
                              {summary.totalScore}
                            </td>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-center bg-blue-50/30 font-black text-blue-700 text-sm">
                                {summary.collectedScore}
                              </td>
                              <td className="px-6 py-4 text-center bg-amber-50/30 font-black text-amber-700 text-sm">
                                {summary.examScore}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-center bg-slate-50/50">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs font-black text-slate-800">{summary.totalScore}/{summary.totalMaxScore}</span>
                              <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black border uppercase ${
                                summary.overallGrade === 'A' ? 'bg-emerald-600 text-white border-emerald-600' :
                                summary.overallGrade.includes('B') ? 'bg-blue-500 text-white border-blue-500' :
                                summary.overallGrade.includes('C') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                'bg-rose-100 text-rose-600 border-rose-200'
                              }`}>
                                {summary.overallGrade}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })})()}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden grid grid-cols-1 divide-y divide-slate-100 bg-white">
                {(() => {
                    const withSummaries = visibleStudents.map(s => ({
                      ...s,
                      summary: calculateStudentSummary(s.id)
                    })).sort((a, b) => b.summary.totalScore - a.summary.totalScore);
                    
                    let currentRank = 1;
                    withSummaries.forEach((s, idx) => {
                      if (idx > 0 && s.summary.totalScore < withSummaries[idx-1].summary.totalScore) {
                        currentRank = idx + 1;
                      }
                      s.rank = currentRank;
                    });
                    
                    return withSummaries.map(student => {
                        const summary = student.summary;
                        return (
                            <div key={student.id} className="p-4">
                                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs shrink-0 ${
                                         student.rank === 1 ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-sm' :
                                         student.rank === 2 ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                         student.rank === 3 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                         'bg-slate-50 text-slate-400'
                                       }`}>
                                         {student.rank}
                                       </div>
                                       <div>
                                           <h5 className="text-sm font-black text-slate-800">{student.full_name || student.username}</h5>
                                           <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {student.id}</p>
                                       </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                    {subjectType === 'activity' ? (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                                            <span className="text-[8px] font-black uppercase">คะแนนทั้งหมด:</span>
                                            <span className="text-sm font-black">{summary.totalScore}</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <div className="flex flex-col items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 min-w-[70px]">
                                                <span className="text-[8px] font-black uppercase">คะแนนเก็บ (/{maxCollectedScore})</span>
                                                <span className="text-xs font-black">{summary.collectedScore}</span>
                                            </div>
                                            <div className="flex flex-col items-center px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 min-w-[70px]">
                                                <span className="text-[8px] font-black uppercase">คะแนนสอบ (/{maxExamScore})</span>
                                                <span className="text-xs font-black">{summary.examScore}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                       <div className="text-right">
                                           <div className="text-xs font-black text-slate-800">{summary.totalScore}/{summary.totalMaxScore}</div>
                                           <div className="text-[9px] font-bold text-slate-400 uppercase">Total / Grade</div>
                                       </div>
                                       <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-black border uppercase ${
                                         summary.overallGrade === 'A' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' :
                                         summary.overallGrade.includes('B') ? 'bg-blue-500 text-white border-blue-500' :
                                         summary.overallGrade.includes('C') ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                         'bg-rose-100 text-rose-600 border-rose-200'
                                       }`}>
                                         {summary.overallGrade}
                                       </div>
                                    </div>
                                </div>
                            
                              <div className="space-y-3 pl-2">
                                {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map((detail) => (
                                    <div key={detail.id} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-bold truncate max-w-[60%]">{detail.title}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-700">{detail.score}</span>
                                            <span className="text-[10px] text-slate-300 w-10 text-right">({detail.percentage}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    )
                })})()}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default GradesPage;

