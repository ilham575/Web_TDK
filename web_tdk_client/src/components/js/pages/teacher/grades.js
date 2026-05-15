import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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
  ChevronDown,
  Award,
  Table
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className={`relative w-full ${type === 'summary' ? 'max-w-6xl' : 'max-w-md'} bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20`}>
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className={`p-8 ${type === 'summary' ? 'max-h-[80vh] overflow-y-auto custom-scrollbar' : ''}`}>
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
        const res = await fetch(`${API_BASE_URL}/subjects/${id}/students`);
        const data = await res.json();
        if (Array.isArray(data)){
          setStudents(data);

          const makeClassObj = (s) => {
            const classroomId = s.classroom?.id || null;
            let label = 'Default';
            if (s.classroom && (s.classroom.name || s.classroom.id)) {
              label = s.classroom.name || String(s.classroom.id);
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
            const key = classroomId ? `id:${classroomId}` : `label:${label}`;
            return {
              key,
              id: classroomId,
              label,
              academic_year: s.classroom?.academic_year || null,
              semester: s.classroom?.semester || null,
            };
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
        const res = await fetch(`${API_BASE_URL}/subjects/${id}`);
        if (res.ok) {
          const data = await res.json();
          const name = data.name || data.title || data.subject_name || '';
          if (name) setSubjectName(name);
          if (data.subject_type) setSubjectType(data.subject_type);
          setMaxCollectedScore((data.max_collected_score !== undefined && data.max_collected_score !== null) ? data.max_collected_score : 100);
          setMaxExamScore((data.max_exam_score !== undefined && data.max_exam_score !== null) ? data.max_exam_score : 100);
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
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) return null;
      const res = await fetch(`${API_BASE_URL}/classrooms/list/${schoolId}`);
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
        const assignmentsRes = await fetch(assignmentUrl);
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
        const gradesRes = await fetch(gradesUrl);
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

  const saveGrades = async ()=>{
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
      const res = await fetch(`${API_BASE_URL}/grades/bulk`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload)});
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
    if (selectedClass && !resolvedClassroomId) {
      const foundId = await findClassroomIdByLabel(selectedClass.label);
      if (foundId) {
        resolvedClassroomId = foundId;
      } else {
        toast.error('ชั้นเรียนที่เลือกยังไม่ได้สร้างในระบบ กรุณาสร้างชั้นเรียนก่อน');
        return;
      }
    }

    const existingAssignment = assignments.find(a =>
      a.title.toLowerCase() === newAssignmentTitle.trim().toLowerCase()
      && (a.classroom_id || null) === ((selectedClassId || resolvedClassroomId) || null)
    );
    if (existingAssignment) {
      toast.error('หัวข้องานนี้มีอยู่แล้ว');
      return;
    }

    try {
      const payloadClassroomId = selectedClassId || resolvedClassroomId || null;
      const payload = {
        title: newAssignmentTitle.trim(),
        max_score: newAssignmentMaxScore,
        classroom_id: payloadClassroomId
      };
      
      const res = await fetch(`${API_BASE_URL}/grades/assignments/${id}`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json'
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
      const payload = {
        title: editAssignmentTitle.trim(),
        max_score: editAssignmentMaxScore,
          classroom_id: editingAssignment.classroom_id || null
      };
      
      const editUrl = `${API_BASE_URL}/grades/assignments/${id}/${editingAssignment.title}${editingAssignment.classroom_id ? `?classroom_id=${editingAssignment.classroom_id}` : ''}`;
      const res = await fetch(editUrl, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json'
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
      const res = await fetch(`${API_BASE_URL}/grades/assignments/${id}/${deletingAssignment.title}${deletingAssignment.classroom_id ? `?classroom_id=${deletingAssignment.classroom_id}` : ''}`, { 
        method: 'DELETE'
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
      
      setShowDeleteModal(false);
      setDeletingAssignment(null);
      toast.success('ลบหัวข้องานเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      toast.error('เกิดข้อผิดพลาดในการลบหัวข้องาน');
    }
  };

  // ----------------------------------------------------------------------------------
  // Summary calculations
  // ----------------------------------------------------------------------------------
  const calculateStudentSummary = (studentId) => {
    let collectedScore = 0;
    let examScore = 0;
    // Map to store details for each assignment
    const assignmentDetails = assignments.map(a => {
      const rawScore = grades[a.id] ? grades[a.id][studentId] : null;
      const score = (rawScore !== null && rawScore !== undefined && rawScore !== '') ? Number(rawScore) : 0;
      const isExam = checkIsExam(a.title);

      if (subjectType !== 'activity') {
        if (isExam) examScore += score;
        else collectedScore += score;
      } else {
        // Activity type: just sum everything to total
        collectedScore += score; 
      }
      
      return {
        id: a.id,
        title: a.title,
        score: score,
        max: a.max_score,
        percentage: calculatePercentage(score, a.max_score)
      };
    });

    if (subjectType !== 'activity') {
      collectedScore = Math.min(collectedScore, maxCollectedScore);
      examScore = Math.min(examScore, maxExamScore);
    }
    
    // For Activity based: collectedScore holds the sum of all assignments
    // For Main based: collectedScore is capped sum of non-exams, examScore is capped sum of exams
    
    const totalScore = Math.min(collectedScore + examScore, 100);
    const overallGrade = (subjectType === 'activity') 
      ? (totalScore >= 50 ? 'ผ่าน' : 'ไม่ผ่าน')
      : calculateGrade(totalScore);

    return {
      collectedScore,
      examScore,
      totalScore,
      totalMaxScore: 100, // standard base
      overallGrade,
      assignmentDetails
    };
  };

  const visibleStudents = students.filter(s => {
    if (!selectedClass) return true;
    const sId = s.classroom ? s.classroom.id : null;
    if (selectedClass.id && sId) return sId === selectedClass.id;
    return selectedClass.label === (
            (s.classroom && s.classroom.name) ||
            (s.classroom_name) || 
            (s.class_name) || 
            (s.grade_level && s.section ? `${s.grade_level} ${s.section}` : '') ||
            (s.grade_level ? String(s.grade_level) : '') ||
            (s.homeroom) ||
            (s.section) ||
            'Default'
          );
  });
  const selectedAssignmentClassLabel = assignments.find(a => a.id === selectedAssignmentId)?.classroom_id 
    ? (classes.find(c => c.id === assignments.find(a => a.id === selectedAssignmentId)?.classroom_id)?.label || 'Specific Class') 
    : 'All Classes';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate(-1)}
                className="group p-3 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 active:scale-95 border border-slate-200 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                  บันทึกคะแนน
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    GRADES
                  </span>
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 truncat max-w-[200px] sm:max-w-md">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {subjectName || `วิชา #${id}`}
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={saveGrades}
              className="group flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 text-white rounded-lg font-black text-sm shadow-sm hover:bg-blue-700 transition-colors duration-300 active:scale-95"
            >
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">บันทึกคะแนน</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Controls and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left Controls */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Quick Actions Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowSummaryModal(true)}
                className="flex-1 bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex items-center gap-4"
              >
                 <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6" />
                 </div>
                 <div className="text-left">
                    <h3 className="text-base font-black text-slate-800 group-hover:text-blue-700 transition-colors">สรุปคะแนน</h3>
                    <p className="text-xs font-medium text-slate-400">ดูเกรดรวมทั้งห้อง</p>
                 </div>
              </button>

              <div className="flex-[2] bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                  <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">ชั้นเรียนที่เลือก</h3>
                    </div>
                    {classes.length > 1 ? (
                      <div className="relative group/select">
                          <select
                          value={selectedClassId || ''}
                          onChange={(e) => {
                             const cls = classes.find(c => String(c.id) === e.target.value) || classes.find(c => c.label === e.target.value);
                             setSelectedClass(cls);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-lg font-bold rounded-lg px-4 py-3 appearance-none cursor-pointer focus:border-blue-500 focus:bg-white transition-colors outline-none pr-10"
                          >
                            <option value="">ทั้งหมด / เลือกห้อง</option>
                            {classes.map((cls) => (
                              <option key={cls.key} value={cls.id || cls.label}>{cls.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover/select:text-slate-600 transition-colors" />
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/60 font-bold text-slate-600">
                         {classes.length > 0 ? classes[0].label : 'กำลังโหลด...'}
                      </div>
                    )}
                  </div>
              </div>
            </div>

            {/* Assignment Selector Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800">เลือกงานที่จะกรอกคะแนน</h3>
                      <p className="text-xs text-slate-400 font-medium">จัดการคะแนนรายหัวข้อ</p>
                    </div>
                 </div>
                 <button 
                  onClick={createNewAssignment}
                  className="group flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors uppercase tracking-wider"
                 >
                   <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> เพิ่มงานใหม่
                 </button>
               </div>

               {assignments.length === 0 ? (
                 <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">ยังไม่มีหัวข้องานในระบบ</p>
                    <button onClick={createNewAssignment} className="text-blue-600 font-black text-sm mt-2 hover:underline">สร้างงานแรกของคุณเลย</button>
                 </div>
               ) : (
                <div className="space-y-4">
                  <div className="relative group/assign-select">
                    <select
                      value={selectedAssignmentId || ''}
                      onChange={(e) => selectAssignment(e.target.value)}
                      className="w-full pl-6 pr-12 py-5 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-base font-black text-slate-700 transition-all outline-none appearance-none cursor-pointer shadow-sm hover:border-blue-200"
                    >
                      <option value="">-- กรุณาเลือกหัวข้องาน --</option>
                      {assignments.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.title} (เต็ม {a.max_score})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover/assign-select:text-blue-500 transition-colors" />
                  </div>

                  {selectedAssignmentId && (
                    <div className="flex gap-3 animate-in fade-in slide-in-from-top-2">
                       <button
                        onClick={() => {
                          const a = assignments.find(x => x.id === selectedAssignmentId);
                          setEditingAssignment(a);
                          setEditAssignmentTitle(a.title);
                          setEditAssignmentMaxScore(a.max_score);
                          setShowEditModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-xs hover:bg-white hover:shadow-md hover:text-slate-700 transition-all border border-transparent hover:border-slate-100"
                       >
                         <Edit2 className="w-3.5 h-3.5" /> แก้ไขชื่อ/คะแนนเต็ม
                       </button>
                       <button
                        onClick={() => {
                          const a = assignments.find(x => x.id === selectedAssignmentId);
                          setDeletingAssignment(a);
                          setShowDeleteModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-500 rounded-xl font-bold text-xs hover:bg-rose-100 hover:shadow-md transition-all border border-transparent hover:border-rose-200"
                       >
                         <Trash2 className="w-3.5 h-3.5" /> ลบงานนี้
                       </button>
                    </div>
                  )}
                </div>
               )}
            </div>
          </div>

          {/* Right Stats (Summary) */}
          <div className="lg:col-span-4">
              <div className="h-full bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-slate-800 overflow-hidden relative">
                <div className="relative z-10 flex flex-col h-full">
                     <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">ภาพรวมคะแนน</h3>
                      <p className="text-xs text-slate-400 font-medium">สถิติห้องเรียนปัจจุบัน</p>
                        </div>
                     </div>

                     <div className="space-y-4 flex-1">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">จำนวนงานทั้งหมด</p>
                      <p className="text-3xl font-black text-slate-800">{assignments.length} <span className="text-xs font-bold text-slate-500">Assignments</span></p>
                        </div>
                        
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">นักเรียนที่แสดงผล</p>
                       <p className="text-3xl font-black text-blue-700">{visibleStudents.length} <span className="text-xs font-bold text-blue-500/70">Students</span></p>
                        </div>
                     </div>
                  </div>
               </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
              
              {!selectedAssignmentId ? (
                <div className="flex flex-col items-center justify-center flex-grow py-32 text-center px-8">
                  <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner animate-in zoom-in-50 duration-500">
                    <Table className="w-12 h-12 text-slate-300" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">พร้อมบันทึกคะแนนหรือยัง?</h2>
                  <p className="text-slate-400 font-medium text-base max-w-sm leading-relaxed mx-auto">
                    กรุณาเลือกหัวข้องานจากด้านบน หรือสร้างงานใหม่เพื่อเริ่มกรอกคะแนนให้กับนักเรียน
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-8 border-b border-slate-50 bg-white sticky top-0 z-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-50 shadow-inner rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{title}</h2>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 px-2.5 py-1 rounded-lg shadow-sm">
                               Max Score: {maxScore}
                             </span>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
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
                        <tr className="bg-slate-50/50 border-b border-slate-50">
                          <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[40%]">ข้อมูลนักเรียน</th>
                          <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">คะแนน / เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {visibleStudents.length === 0 ? (
                           <tr>
                              <td colSpan="2" className="py-20 text-center">
                                 <p className="text-slate-400 font-bold">ไม่พบนักเรียนในห้องที่เลือก</p>
                              </td>
                           </tr>
                        ) : visibleStudents.map((s, idx) => {
                          const currentGrades = grades[selectedAssignmentId] || {};
                          const score = currentGrades[s.id] ? Number(currentGrades[s.id]) : null;
                          const percentage = score !== null ? calculatePercentage(score, maxScore) : null;
                          const gradeLetter = percentage !== null ? calculateGrade(percentage) : null;
                          const isInvalid = currentGrades[s.id] && Number(currentGrades[s.id]) > maxScore;
                          const studentNo = s.student_number || s.classroom?.student_number || '-';

                          return (
                            <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5 align-middle">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-sm border border-slate-100 shadow-sm group-hover:border-blue-200 group-hover:text-blue-600 transition-all">
                                    {studentNo !== '-' ? studentNo : idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                                      {s.full_name || s.username}
                                    </h4>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight bg-slate-100 px-1.5 py-0.5 rounded-md inline-block">ID: {s.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 align-middle">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxScore}
                                      value={currentGrades[s.id] || ''}
                                      onChange={e=>setGrade(s.id, e.target.value)}
                                      placeholder="-"
                                      className={`w-32 px-4 py-3 bg-white border-2 rounded-2xl text-center text-lg font-black transition-all outline-none focus:scale-105 shadow-sm ${
                                        isInvalid 
                                        ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                                        : 'border-slate-100 text-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 hover:border-slate-300'
                                      }`}
                                    />
                                    {gradeLetter && (
                                       <span className={`absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black border uppercase shadow-sm ${
                                         percentage >= 80 ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' :
                                         percentage >= 70 ? 'bg-blue-500 text-white border-blue-500' :
                                         percentage >= 50 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                         'bg-rose-100 text-rose-600 border-rose-200'
                                       }`}>
                                         {gradeLetter}
                                       </span>
                                    )}
                                  </div>
                                  
                                  {isInvalid && (
                                    <span className="text-[10px] font-black text-rose-500 flex items-center gap-1 animate-pulse uppercase bg-rose-50 px-2 py-0.5 rounded-full">
                                      <AlertTriangle className="w-3 h-3" /> Exceeds limit
                                    </span>
                                  )}
                                  
                                  {percentage !== null && !isInvalid && (
                                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-500 ${
                                          percentage >= 80 ? 'bg-blue-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
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
                  <div className="md:hidden grid grid-cols-1 divide-y divide-slate-100 bg-slate-50/30">
                      {visibleStudents.length === 0 ? (
                           <div className="py-20 text-center">
                                 <p className="text-slate-400 font-bold">ไม่พบนักเรียนในห้องที่เลือก</p>
                           </div>
                      ) : visibleStudents.map((s, idx) => {
                          const currentGrades = grades[selectedAssignmentId] || {};
                          const score = currentGrades[s.id] ? Number(currentGrades[s.id]) : null;
                          const percentage = score !== null ? calculatePercentage(score, maxScore) : null;
                          const gradeLetter = percentage !== null ? calculateGrade(percentage) : null;
                          const isInvalid = currentGrades[s.id] && Number(currentGrades[s.id]) > maxScore;
                          const studentNo = s.student_number || s.classroom?.student_number || '-';

                          return (
                              <div key={s.id} className="p-5 flex flex-col gap-5 bg-white">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-sm border border-slate-100 shadow-sm">
                                      {studentNo !== '-' ? studentNo : idx + 1}
                                    </div>
                                    <div>
                                      <h4 className="text-base font-black text-slate-800">
                                        {s.full_name || s.username}
                                      </h4>
                                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight bg-slate-100 px-1.5 py-0.5 rounded inline-block">ID: {s.id}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start justify-between pl-[4rem]">
                                      <div className="flex flex-col gap-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Input</span>
                                          <input
                                            type="number"
                                            min="0"
                                            max={maxScore}
                                            value={currentGrades[s.id] || ''}
                                            onChange={e=>setGrade(s.id, e.target.value)}
                                            placeholder="—"
                                            className={`w-32 px-4 py-3 bg-white border-2 rounded-xl text-center text-lg font-black transition-all outline-none focus:ring-4 shadow-sm ${
                                              isInvalid 
                                              ? 'border-rose-200 bg-rose-50 text-rose-600 focus:ring-rose-100' 
                                              : 'border-slate-100 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-100'
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
                                           <div className={`w-14 h-14 flex items-center justify-center rounded-2xl text-xl font-black border uppercase shadow-sm ${
                                             percentage >= 80 ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' :
                                             percentage >= 70 ? 'bg-blue-500 text-white border-blue-500' :
                                             percentage >= 50 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                             'bg-rose-100 text-rose-600 border-rose-200'
                                           }`}>
                                             {gradeLetter}
                                           </div>
                                        ): (
                                            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-300">
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

      {/* MODALS */}
      
      {/* Create Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="เพิ่มงานใหม่"
        footer={(
          <>
            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-lg font-black text-sm hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button onClick={handleCreateAssignment} className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-black text-sm shadow-sm hover:bg-blue-700 transition-colors">บันทึก</button>
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
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all outline-none"
              placeholder="เช่น สอบย่อยบทที่ 1"
              autoFocus
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
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-black transition-all outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="แก้ไขงาน"
        footer={(
          <>
            <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-lg font-black text-sm hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button onClick={handleEditAssignment} className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-black text-sm shadow-sm hover:bg-blue-700 transition-colors">บันทึกการแก้ไข</button>
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
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">คะแนนเต็ม</label>
            <input
              type="number"
              value={editAssignmentMaxScore}
              onChange={(e) => setEditAssignmentMaxScore(Number(e.target.value))}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-black transition-all outline-none"
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
            <button onClick={confirmDeleteAssignment} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">ลบงานนี้</button>
          </>
        )}
      >
        <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
              <Trash2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
              คุณต้องการลบ <span className="text-rose-500">"{deletingAssignment?.title}"</span> หรือไม่?
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
        title={`📊 สรุปผลการเรียน - ${subjectName || `#${id}`}`}
        type="summary"
        footer={(
          <button onClick={() => setShowSummaryModal(false)} className="w-full py-4 bg-blue-600 text-white rounded-lg font-black text-sm shadow-sm hover:bg-blue-700 transition-colors">ปิดหน้าต่าง</button>
        )}
      >
        {(!selectedClass && classes.length > 1) ? (
          <div className="text-center py-32">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
              กรุณาเลือกชั้นเรียนก่อนดูสรุปคะแนน
            </h4>
            <p className="mt-4 text-slate-400 text-sm font-bold leading-relaxed px-4 mx-auto max-w-sm">
              ระบบต้องการให้คุณระบุห้องเรียนเพื่อประมวลผลการตัดเกรดได้อย่างถูกต้อง
            </p>
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="text-center py-32">
             <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold">ไม่พบรายชื่อนักเรียนในกลุ่มนี้</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">หัวข้องานทั่งหมด</p>
                <div className="flex items-end justify-between">
                    <p className="text-3xl font-black text-slate-800">{assignments.length}</p>
                    <BarChart3 className="w-6 h-6 text-slate-300 mb-1" />
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">นักเรียนในกลุ่ม</p>
                <div className="flex items-end justify-between">
                    <p className="text-3xl font-black text-blue-700">{visibleStudents.length}</p>
                    <User className="w-6 h-6 text-blue-300 mb-1" />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">เลขที่</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 sticky left-0 z-10 drop-shadow-sm border-r border-slate-200">รายชื่อนักเรียน</th>
                      {assignments.filter(a => a.title !== "คะแนนเก็บรวม" && a.title !== "คะแนนสอบรวม").map(a => (
                        <th key={a.id} className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                              <span className="truncate max-w-[80px]" title={a.title}>{a.title}</span>
                              <span className="text-[9px] text-white bg-slate-300 px-1.5 rounded-md">/{a.max_score}</span>
                          </div>
                        </th>
                      ))}
                      {subjectType === 'activity' ? (
                        <th className="px-6 py-5 text-center text-[10px] font-black text-blue-800 uppercase tracking-widest bg-blue-50/50">คะแนนรวม</th>
                      ) : (
                        <>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50/50">
                            คะแนนเก็บ<br/><span className="text-blue-400 font-bold opacity-70">/{maxCollectedScore}</span>
                          </th>
                          <th className="px-6 py-5 text-center text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50/50">
                            คะแนนสอบ<br/><span className="text-amber-400 font-bold opacity-70">/{maxExamScore}</span>
                          </th>
                        </>
                      )}
                      <th className="px-6 py-5 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-100 sticky right-0 z-10 border-l border-slate-200 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.1)]">GRADE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(() => {
                      const withSummaries = visibleStudents.map(s => ({
                        ...s,
                        summary: calculateStudentSummary(s.id)
                      })).sort((a, b) => {
                        const numA = a.student_number || a.classroom?.student_number || 999;
                        const numB = b.student_number || b.classroom?.student_number || 999;
                        return numA - numB;
                      });
                      
                      return withSummaries.map((student) => {
                        const summary = student.summary;
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-center">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mx-auto text-xs font-black text-slate-400">
                                {student.student_number || student.classroom?.student_number || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 sticky left-0 bg-white hover:bg-slate-50/50 z-10 border-r border-slate-100">
                              <h5 className="text-xs font-black text-slate-800 truncate max-w-[150px]">{student.full_name || student.username}</h5>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">ID: {student.id}</p>
                            </td>
                            {summary.assignmentDetails.filter(d => d.title !== "คะแนนเก็บรวม" && d.title !== "คะแนนสอบรวม").map((detail, index) => (
                              <td key={index} className="px-6 py-4 text-center">
                                <span className="text-xs font-black text-slate-600 block">{detail.score}</span>
                              </td>
                            ))}
                          {subjectType === 'activity' ? (
                            <td className="px-6 py-4 text-center bg-blue-50/10 font-black text-blue-700 text-sm">
                              {summary.totalScore}
                            </td>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-center bg-blue-50/10 font-black text-blue-700 text-sm">
                                {summary.collectedScore}
                              </td>
                              <td className="px-6 py-4 text-center bg-amber-50/10 font-black text-amber-700 text-sm">
                                {summary.examScore}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-center bg-slate-50 sticky right-0 z-10 border-l border-slate-100">
                            <div className="flex items-center justify-center gap-3">
                              <div className="text-right">
                                  <div className="text-[10px] font-black text-slate-400 uppercase">Total</div>
                                  <div className="text-xs font-black text-slate-800">{summary.totalScore}</div>
                              </div>
                              <span className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black border uppercase shadow-sm ${
                                summary.overallGrade === 'A' ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200' :
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
                    });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default GradesPage;