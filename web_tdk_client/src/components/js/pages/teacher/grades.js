import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../../css/pages/teacher/grades.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../../../endpoints';

function GradesPage(){
  const { id } = useParams(); // subject id
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  // classes: [{ key: 'id:123' | 'label:ป.1-1', id: number|null, label: string }]
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null); // selectedClass will be a class object from classes array
  const selectedClassId = selectedClass ? selectedClass.id : null;
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [subjectName, setSubjectName] = useState('');
  const [grades, setGrades] = useState({}); // { assignmentId: { studentId: grade, ... }, ... }
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

  // Update document title with school name
  useEffect(() => {
    const schoolName = localStorage.getItem('school_name');
    const baseTitle = 'ระบบโรงเรียน';
    document.title = (schoolName && schoolName !== '-') ? `${baseTitle} - ${schoolName}` : baseTitle;
  }, []);

  // Calculate grade letter based on percentage
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

  // Calculate percentage
  const calculatePercentage = (score, max) => {
    if (!score || !max || max === 0) return 0;
    // Ensure score doesn't exceed max
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

          const getClassIdentifier = (s) => {
            if (!s) return 'Default';
            if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.name || String(s.classroom.id);
            if (s.classroom_name) return s.classroom_name;
            if (s.class_name) return s.class_name;
            if (s.grade_level && s.section) return `${s.grade_level} ${s.section}`;
            if (s.grade_level) return String(s.grade_level);
            if (s.homeroom) return s.homeroom;
            if (s.section) return s.section;
            return 'Default';
          };

          // Build class objects (key + id + label) for better mapping
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
          // Sort classes by numeric label order (e.g., ป.1/1, Grade 1/2)
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
            // If all numeric parts are equal or absent, compare label strings
            return String(a.label).localeCompare(String(b.label), 'th');
          };
          distinct.sort(compareLabels);
          setClasses(distinct);
          // Set selectedClass to null when multiple classes (forces explicit selection)
          // Auto-select only when there's a single class
          setSelectedClass(distinct.length === 1 ? distinct[0] : null);
        } else setStudents([]);
      }catch(err){ setStudents([]); }
    };
    load();
  },[id]);

  // load subject details (to display subject name)
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
        } else {
          // fallback to student payload if available
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

  // Load assignments and grades for this subject (refactor to named function so we can refresh on demand)
  const refreshAssignmentsAndGrades = async ()=>{
      try{
        // Wait for classes to load first
        if (classes.length === 0) {
          return;
        }
        
        // If multiple classes exist and user hasn't selected one, do not fetch
        if (classes.length > 1 && !selectedClass) {
          setAssignments([]);
          setGrades({});
          setSelectedAssignmentId(null);
          return;
        }
        
        const token = localStorage.getItem('token');
        
        // Determine the classroom ID to filter by
        let classroomIdToFilter = null;
        if (classes.length === 1 && classes[0].id) {
          classroomIdToFilter = classes[0].id;
        } else if (selectedClass && selectedClass.id) {
          classroomIdToFilter = selectedClass.id;
        }
        
        // Must have classroom ID to filter properly
        if (!classroomIdToFilter) {
          console.warn('No classroom_id available for filtering - attempting to resolve');
          // Try to resolve classroom ID by label if possible
          const classToResolve = selectedClass || (classes.length === 1 ? classes[0] : null);
          if (classToResolve && classToResolve.label && !classToResolve.id) {
            const foundId = await findClassroomIdByLabel(classToResolve.label);
            if (foundId) {
              classroomIdToFilter = foundId;
              // Update the class object with the resolved ID
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
        
        // If still no classroom ID, we can't filter properly - but still try to fetch
        // This handles cases where classroom_id might not exist in DB yet
        
        // First load assignments (always filter by classroom_id if available)
        const assignmentUrl = `${API_BASE_URL}/grades/assignments/${id}${classroomIdToFilter ? `?classroom_id=${classroomIdToFilter}` : ''}`;
        const assignmentsRes = await fetch(assignmentUrl, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!assignmentsRes.ok) return;
        const assignmentsData = await assignmentsRes.json();
        
        // Convert assignments to use title as id for consistency with existing code
        const assignmentList = assignmentsData.map(assignment => ({
          id: assignment.classroom_id ? `${assignment.title}::${assignment.classroom_id}` : assignment.title,
          title: assignment.title,
          max_score: assignment.max_score,
          classroom_id: assignment.classroom_id || null,
          created_at: new Date().toISOString() // We don't have created_at from API
        }));
        
        setAssignments(assignmentList);
        
        // Then load all grades for this subject (filter by classroom_id if available)
        const gradesUrl = `${API_BASE_URL}/grades/?subject_id=${id}${classroomIdToFilter ? `&classroom_id=${classroomIdToFilter}` : ''}`;
        const gradesRes = await fetch(gradesUrl, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
        if (!gradesRes.ok) return;
        const gradesData = await gradesRes.json();
        
        // Group grades by assignment title
        const gradesMap = {};
        if (Array.isArray(gradesData)){
          gradesData.forEach(record => {
            if (record.title) {
                const assignmentKey = record.classroom_id ? `${record.title}::${record.classroom_id}` : record.title;
                if (!gradesMap[assignmentKey]) {
                  gradesMap[assignmentKey] = {};
                }
                gradesMap[assignmentKey][record.student_id] = record.grade;
            }
          });
        }
        
        setGrades(gradesMap);
        
        // Auto-select assignment
        if (assignmentList.length > 0) {
          let assignmentToSelect = assignmentList[0];
          if (selectedAssignmentId) {
            const existing = assignmentList.find(a => a.id === selectedAssignmentId);
            if (existing) {
              assignmentToSelect = existing;
            }
          }
          setSelectedAssignmentId(assignmentToSelect.id);
          setTitle(assignmentToSelect.title);
          setMaxScore(assignmentToSelect.max_score);
        }
      } catch (err) { console.error('Failed to load assignments and grades:', err); }
  };

  useEffect(()=>{
    // Reset state when class changes to prevent stale data
    setAssignments([]);
    setGrades({});
    setSelectedAssignmentId(null);
    setTitle('');
    setMaxScore(100);
    // Only refresh if we have classes loaded OR this is the initial load
    if (classes.length > 0 || selectedClassId) {
      refreshAssignmentsAndGrades();
    }
  },[id, selectedClassId, classes.length]);

  const setGrade = (sid, value) => {
    // Validate that the grade doesn't exceed max score
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

    // Validate all grades don't exceed max score
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
      if(!res.ok){ const d = await res.json().catch(()=>({})); toast.error(d.detail || 'Save failed'); } else { toast.success('Grades saved'); }
    }catch(err){ toast.error('Save failed'); }
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
    // default classroom for the new assignment is the currently selected class (if any)
    setNewAssignmentClassroomId(selectedClassId || null);
  };

  // Helper: try to fetch classroom ID from API by matching label (fallback when selectedClass.id is missing)
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

  const handleCreateAssignment = async () => {
    if (!newAssignmentTitle.trim()) {
      toast.error('กรุณาใส่หัวข้องาน');
      return;
    }
    if (newAssignmentMaxScore <= 0) {
      toast.error('คะแนนเต็มต้องมากกว่า 0');
      return;
    }

    // If selected class exists but has no id, try to resolve its id from server by label
    let resolvedClassroomId = selectedClassId || null;
    if (selectedClass && !selectedClass.id) {
      const foundId = await findClassroomIdByLabel(selectedClass.label);
      if (foundId) {
        resolvedClassroomId = foundId;
        // update the selectedClass and classes mapping so it shows as created
        setSelectedClass(prev => prev ? { ...prev, id: foundId, key: `id:${foundId}` } : prev);
        setClasses(prev => prev.map(c => c.key === selectedClass.key ? { ...c, id: foundId, key: `id:${foundId}` } : c));
      } else {
        toast.error('ชั้นเรียนที่เลือกยังไม่ได้สร้างในระบบ กรุณาสร้างชั้นเรียนก่อน');
        return;
      }
    }

    // Check if assignment title already exists
    const existingAssignment = assignments.find(a => a.title.toLowerCase() === newAssignmentTitle.trim().toLowerCase());
    if (existingAssignment) {
      toast.error('หัวข้องานนี้มีอยู่แล้ว');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // Use the resolved class id (selected top class or matched server id)
      // Always use selectedClassId if available, otherwise use resolved id
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

      // Determine classroom id to store (prefer server response but fall back to payload)
      const createdClassroomId = (newAssignment && typeof newAssignment.classroom_id !== 'undefined') ? newAssignment.classroom_id : payloadClassroomId;

      // Add new assignment to state (id includes classroom id to avoid leaking across classes)
      setAssignments(prev => [...prev, {
        id: createdClassroomId ? `${newAssignment.title}::${createdClassroomId}` : newAssignment.title,
        title: newAssignment.title,
        max_score: newAssignment.max_score,
        classroom_id: createdClassroomId || null,
        created_at: new Date().toISOString()
      }]);
      
      // Initialize empty grades for this assignment
      setGrades(prev => ({
        ...prev,
        [newAssignment.title]: {}
      }));
      
      // (Selection will be re-applied after we refresh the assignments list)
      
      // Reset modal
      setNewAssignmentTitle('');
      setNewAssignmentMaxScore(100);
      setNewAssignmentClassroomId(null);
      setShowCreateModal(false);
      
      // Refresh assignments so we don't leak this assignment across other class views
      await refreshAssignmentsAndGrades();

      // Re-select the assignment we just created (if it's in the current class filter)
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

  const cancelCreateAssignment = () => {
    setNewAssignmentTitle('');
    setNewAssignmentMaxScore(100);
    setNewAssignmentClassroomId(null);
    setShowCreateModal(false);
  };

  const editAssignment = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setEditingAssignment(assignment);
      setEditAssignmentTitle(assignment.title);
      setEditAssignmentMaxScore(assignment.max_score);
      setEditAssignmentClassroomId(assignment.classroom_id || null);
      setShowEditModal(true);
    }
  };

  const handleEditAssignment = async () => {
    if (!editAssignmentTitle.trim()) {
      toast.error('กรุณาใส่หัวข้องาน');
      return;
    }
    if (editAssignmentMaxScore <= 0) {
      toast.error('คะแนนเต็มต้องมากกว่า 0');
      return;
    }

    // Check if assignment title already exists (excluding current assignment)
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
      
      // Update assignment in state
      setAssignments(prev => prev.map(assignment => {
        if (assignment.id !== editingAssignment.id) return assignment;
        const updatedId = updatedAssignment.classroom_id ? `${updatedAssignment.title}::${updatedAssignment.classroom_id}` : updatedAssignment.title;
        return { ...assignment, id: updatedId, title: updatedAssignment.title, max_score: updatedAssignment.max_score, classroom_id: updatedAssignment.classroom_id || assignment.classroom_id };
      }));
      
      // Update grades key if title changed
      if (updatedAssignment.title !== editingAssignment.title) {
        setGrades(prev => {
          const newGrades = { ...prev };
          newGrades[updatedAssignment.title] = newGrades[editingAssignment.title] || {};
          delete newGrades[editingAssignment.title];
          return newGrades;
        });
        
        // Update selected assignment if it was the one being edited
        const updatedAssignmentId = updatedAssignment.classroom_id ? `${updatedAssignment.title}::${updatedAssignment.classroom_id}` : updatedAssignment.title;
        if (selectedAssignmentId === editingAssignment.id) {
          setSelectedAssignmentId(updatedAssignmentId);
          setTitle(updatedAssignment.title);
        }
      } else {
        // Update max score in title and maxScore state if selected
        if (selectedAssignmentId === editingAssignment.id) {
          setMaxScore(updatedAssignment.max_score);
        }
      }
      
      // Reset modal
      setEditingAssignment(null);
      setEditAssignmentTitle('');
      setEditAssignmentMaxScore(100);
      setEditAssignmentClassroomId(null);
      setShowEditModal(false);
      // Refresh assignments to reflect updates
      await refreshAssignmentsAndGrades();
      
      toast.success('แก้ไขหัวข้องานเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Failed to edit assignment:', err);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขหัวข้องาน');
    }
  };

  const cancelEditAssignment = () => {
    setEditingAssignment(null);
    setEditAssignmentTitle('');
    setEditAssignmentMaxScore(100);
    setShowEditModal(false);
  };

  const deleteAssignment = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setDeletingAssignment(assignment);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteAssignment = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/grades/assignments/${id}/${deletingAssignment.title}${deletingAssignment.classroom_id ? `?classroom_id=${deletingAssignment.classroom_id}` : ''}`, { 
        method: 'DELETE', 
        headers: { 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || 'ไม่สามารถลบหัวข้องานได้');
        return;
      }
      
      // Remove assignment from state
      setAssignments(prev => prev.filter(assignment => assignment.id !== deletingAssignment.id));
      
      // Remove grades for this assignment
      setGrades(prev => {
        const newGrades = { ...prev };
        delete newGrades[deletingAssignment.title];
        return newGrades;
      });
      
      // If deleted assignment was selected, select another one or clear selection
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
      
      // Reset modal
      setDeletingAssignment(null);
      setShowDeleteModal(false);
      
      // Refresh assignments after deletion
      await refreshAssignmentsAndGrades();

      toast.success('ลบหัวข้องานเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      toast.error('เกิดข้อผิดพลาดในการลบหัวข้องาน');
    }
  };

  const cancelDeleteAssignment = () => {
    setDeletingAssignment(null);
    setShowDeleteModal(false);
  };

  const openSummaryModal = () => {
    setShowSummaryModal(true);
  };

  const closeSummaryModal = () => {
    setShowSummaryModal(false);
  };

  // Calculate summary for a student across all assignments
  const calculateStudentSummary = (studentId) => {
    let totalScore = 0;
    let totalMaxScore = 0;
    const assignmentDetails = [];

    assignments.forEach(assignment => {
      const assignmentGrades = grades[assignment.id] || {};
      const rawScore = assignmentGrades[studentId] ? Number(assignmentGrades[studentId]) : 0;
      // Ensure score doesn't exceed max score
      const score = Math.min(rawScore, assignment.max_score);
      const maxScore = assignment.max_score;

      totalScore += score;
      totalMaxScore += maxScore;

      assignmentDetails.push({
        title: assignment.title,
        score: score,
        maxScore: maxScore,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
      });
    });

    const overallPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const overallGrade = calculateGrade(overallPercentage);

    return {
      totalScore,
      totalMaxScore,
      overallPercentage,
      overallGrade,
      assignmentDetails
    };
  };

  // compute visible students according to selectedClass
  const getClassIdentifier = (s) => {
    if (!s) return 'Default';
    if (s.classroom && (s.classroom.name || s.classroom.id)) return s.classroom.name || String(s.classroom.id);
    if (s.classroom_name) return s.classroom_name;
    if (s.class_name) return s.class_name;
    if (s.grade_level && s.section) return `${s.grade_level} ${s.section}`;
    if (s.grade_level) return String(s.grade_level);
    if (s.homeroom) return s.homeroom;
    if (s.section) return s.section;
    return 'Default';
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
    <div className="grades-container">
      <ToastContainer />
      <div className="grades-header">
        <h2 className="grades-title">ให้คะแนน - {subjectName ? `${subjectName} (วิชา #${id})` : `วิชา #${id}`}</h2>
        <div className="grades-actions">
          <button onClick={()=>navigate(-1)} className="btn-back">กลับ</button>
          <button onClick={openSummaryModal} className="btn-summary" disabled={assignments.length === 0}>
            📊 สรุปคะแนนรวม
          </button>
          <button onClick={save} className="btn-save">บันทึก</button>
        </div>
      </div>

      <div className="grades-content">
        {/* Class Selector - Always shown at top when multiple classes */}
        {classes.length > 1 && (
          <div className="class-selector-top" style={{
            padding: '1.25rem',
            backgroundColor: selectedClass ? '#d1fae5' : '#fff7ed',
            border: `2px solid ${selectedClass ? '#10b981' : '#fb923c'}`,
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#1f2937' }}>
              📚 เลือกชั้นเรียนที่ต้องการให้คะแนน:
            </label>
            <select
              value={selectedClass ? selectedClass.key : ''}
              onChange={(e) => {
                const selectedKey = e.target.value;
                const found = classes.find(c => c.key === selectedKey);
                setSelectedClass(found || null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: `2px solid ${selectedClass ? '#10b981' : '#fb923c'}`,
                backgroundColor: '#fff',
                fontSize: '1rem',
                cursor: 'pointer',
                color: '#1f2937',
                fontWeight: '500'
              }}
            >
              <option value="">-- เลือกชั้นเรียน --</option>
              {classes.map(c => (<option key={c.key} value={c.key}>{c.label}</option>))}
            </select>
            {selectedClass && (
              <p style={{ margin: '0.5rem 0 0 0', color: '#059669', fontSize: '0.9rem', fontWeight: '500' }}>
                ✅ ชั้นเรียนที่เลือก: <strong>{selectedClass.label}</strong>
              </p>
            )}
          </div>
        )}

        {/* Show assignment controls only after class selection */}
        {(!selectedClass && classes.length > 1) ? (
          <div className="class-required-message" style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#fef3c7',
            border: '2px dashed #f59e0b',
            borderRadius: '12px',
            color: '#92400e'
          }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>⚠️ กรุณาเลือกชั้นเรียนก่อน</p>
            <p style={{ margin: '0', fontSize: '0.95rem' }}>คุณต้องเลือกชั้นเรียนเพื่อดำเนินการเลือก/เพิ่ม/แก้ไข/ลบหัวข้องาน</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="assignments-empty">
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">ยังไม่มีหัวข้องาน</h3>
            <p className="empty-description">สร้างหัวข้องานแรกของคุณเพื่อเริ่มให้คะแนนนักเรียน</p>
            <button onClick={createNewAssignment} className="btn-create-first">
              + สร้างหัวข้องานแรก
            </button>
          </div>
        ) : (
          <>
            <div className="assignment-selector">
              <div className="selector-field">
                <label className="field-label">เลือกหัวข้องาน:</label>
                <select
                  value={selectedAssignmentId || ''}
                  onChange={(e) => selectAssignment(e.target.value)}
                  className="assignment-select"
                >
                  <option value="">เลือกหัวข้องาน</option>
                  {assignments.map(assignment => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.title}
                        {assignment.classroom_id ? (
                          ` (ชั้น ${(() => {
                            const c = classes.find(x => x.id === assignment.classroom_id);
                            return c ? c.label : `#${assignment.classroom_id}`;
                          })()})`
                        ) : ` (ทุกชั้น)`}
                        {` (เต็ม ${assignment.max_score} คะแนน)`}
                      </option>
                  ))}
                </select>
              </div>
              <div className="assignment-actions">
                {selectedAssignmentId && (
                  <>
                    <button 
                      onClick={() => editAssignment(selectedAssignmentId)} 
                      className="btn-edit-assignment"
                      title="แก้ไขหัวข้องาน"
                    >
                      ✏️ แก้ไข
                    </button>
                    <button 
                      onClick={() => deleteAssignment(selectedAssignmentId)} 
                      className="btn-delete-assignment"
                      title="ลบหัวข้องาน"
                    >
                      🗑️ ลบ
                    </button>
                  </>
                )}
                <button onClick={createNewAssignment} className="btn-new-assignment">
                  + สร้างหัวข้องานใหม่
                </button>
              </div>
            </div>

            {selectedAssignmentId && (
              <div className="assignment-info">
                <div className="assignment-field">
                  <label className="field-label">หัวข้องาน:</label>
                  <span className="assignment-display">{title}</span>
                </div>
                <div className="assignment-field">
                  <label className="field-label">คะแนนเต็ม:</label>
                  <span className="assignment-display">{maxScore} คะแนน</span>
                </div>
                <div className="assignment-field">
                  <label className="field-label">ชั้นเรียน:</label>
                  <span className="assignment-display">{selectedAssignmentClassLabel}</span>
                </div>
              </div>
            )}
          </>
        )}

        {selectedAssignmentId && visibleStudents.length > 0 && (
          <>
            <table className="grades-table">
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>คะแนน</th>
                <th>เปอร์เซ็นต์</th>
                <th>เกรด</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map(s=> {
                const currentGrades = grades[selectedAssignmentId] || {};
                const score = currentGrades[s.id] ? Number(currentGrades[s.id]) : null;
                const percentage = score !== null ? calculatePercentage(score, maxScore) : null;
                const grade = percentage !== null ? calculateGrade(percentage) : null;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="grades-student-info">
                        <div className="grades-student-name">{s.full_name || s.username}</div>
                        <div className="grades-student-email">{s.email}</div>
                      </div>
                    </td>
                    <td>
                      <div className="grades-input-wrapper">
                        <input
                          type="number"
                          min="0"
                          max={maxScore}
                          value={currentGrades[s.id] || ''}
                          onChange={e=>setGrade(s.id, e.target.value)}
                          className={`grades-input ${currentGrades[s.id] && Number(currentGrades[s.id]) > maxScore ? 'grade-error' : ''}`}
                          placeholder={`0-${maxScore}`}
                          data-grade={
                            percentage >= 80 ? 'excellent' :
                            percentage >= 60 ? 'good' : 'poor'
                          }
                        />
                        {currentGrades[s.id] && Number(currentGrades[s.id]) > maxScore && (
                          <div className="grade-warning">⚠️ เกินคะแนนเต็ม</div>
                        )}
                      </div>
                    </td>
                    <td className="percentage-cell">
                      {percentage !== null ? `${percentage}%` : '-'}
                    </td>
                    <td className="grade-cell">
                      {grade ? (
                        <span className={`grade-badge grade-${grade.toLowerCase().replace('+', 'plus')}`}>
                          {grade}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </>
        )}

        {selectedAssignmentId && visibleStudents.length === 0 && (
          <div className="grades-empty">ไม่มีนักเรียนในวิชานี้</div>
        )}

        {/* Create Assignment Modal */}
        {showCreateModal && (
          <div className="grades-modal-overlay" onClick={cancelCreateAssignment}>
            <div className="grades-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="grades-modal-header">
                <h3 className="grades-modal-title">สร้างหัวข้องานใหม่</h3>
                <button className="grades-modal-close" onClick={cancelCreateAssignment}>×</button>
              </div>
              <div className="grades-modal-body">
                        <div className="grades-modal-field">
                          <label htmlFor="new-assignment-title" className="grades-modal-label">หัวข้องาน:</label>
                          <input
                            type="text"
                            id="new-assignment-title"
                            value={newAssignmentTitle}
                            onChange={(e) => setNewAssignmentTitle(e.target.value)}
                            className="grades-modal-input"
                            placeholder="เช่น แบบฝึกหัดที่ 1"
                            autoFocus
                          />
                        </div>
                        <div className="grades-modal-field">
                          <label className="grades-modal-label">ชั้นเรียน:</label>
                          <div className="grades-modal-input" style={{ padding: '0.6rem', background: '#f8fafc', borderRadius: '6px' }}>
                            {selectedClass ? selectedClass.label : (newAssignmentClassroomId ? (classes.find(c => c.id === newAssignmentClassroomId)?.label || `#${newAssignmentClassroomId}`) : 'ทุกชั้น (Global)')}
                          </div>
                          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#6b7280' }}>
                            ระบบจะใช้ชั้นเรียนที่คุณเลือกด้านบนสำหรับหัวข้องานนี้ หากต้องการให้หัวข้องานเป็นแบบ "ทุกชั้น" ให้เลือกตัวเลือก "ทุกชั้น (Global)" ที่ด้านบน
                          </div>
                        </div>
                <div className="grades-modal-field">
                  <label htmlFor="new-max-score" className="grades-modal-label">คะแนนเต็ม:</label>
                  <input
                    type="number"
                    id="new-max-score"
                    value={newAssignmentMaxScore}
                    onChange={(e) => setNewAssignmentMaxScore(Number(e.target.value))}
                    className="grades-modal-input"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              <div className="grades-modal-footer">
                <button className="btn-cancel" onClick={cancelCreateAssignment}>ยกเลิก</button>
                <button className="btn-create" onClick={handleCreateAssignment}>สร้าง</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Assignment Modal */}
        {showEditModal && editingAssignment && (
          <div className="grades-modal-overlay" onClick={cancelEditAssignment}>
            <div className="grades-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="grades-modal-header">
                <h3 className="grades-modal-title">แก้ไขหัวข้องาน</h3>
                <button className="grades-modal-close" onClick={cancelEditAssignment}>×</button>
              </div>
              <div className="grades-modal-body">
                <div className="grades-modal-field">
                  <label htmlFor="edit-assignment-title" className="grades-modal-label">หัวข้องาน:</label>
                  <input
                    type="text"
                    id="edit-assignment-title"
                    value={editAssignmentTitle}
                    onChange={(e) => setEditAssignmentTitle(e.target.value)}
                    className="grades-modal-input"
                    placeholder="เช่น แบบฝึกหัดที่ 1"
                    autoFocus
                  />
                </div>
                <div className="grades-modal-field">
                  <label className="grades-modal-label">ชั้นเรียน:</label>
                  <div className="grades-modal-input" style={{ padding: '0.6rem', background: '#f8fafc', borderRadius: '6px' }}>
                    {editingAssignment && (editingAssignment.classroom_id ? (classes.find(c => c.id === editingAssignment.classroom_id)?.label || `#${editingAssignment.classroom_id}`) : 'ทุกชั้น (Global)')}
                  </div>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#6b7280' }}>
                    การเปลี่ยนชั้นเรียนของหัวข้องานไม่สามารถทำได้จากหน้านี้ หากต้องการย้ายหัวข้องาน โปรดสร้างใหม่ในชั้นเป้าหมายหรือใช้ฟีเจอร์ย้ายหัวข้องาน
                  </div>
                </div>
                <div className="grades-modal-field">
                  <label htmlFor="edit-max-score" className="grades-modal-label">คะแนนเต็ม:</label>
                  <input
                    type="number"
                    id="edit-max-score"
                    value={editAssignmentMaxScore}
                    onChange={(e) => setEditAssignmentMaxScore(Number(e.target.value))}
                    className="grades-modal-input"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              <div className="grades-modal-footer">
                <button className="btn-cancel" onClick={cancelEditAssignment}>ยกเลิก</button>
                <button className="btn-edit" onClick={handleEditAssignment}>แก้ไข</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Assignment Modal */}
        {showDeleteModal && deletingAssignment && (
          <div className="grades-modal-overlay" onClick={cancelDeleteAssignment}>
            <div className="grades-modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="grades-modal-header">
                <h3 className="grades-modal-title">ลบหัวข้องาน</h3>
                <button className="grades-modal-close" onClick={cancelDeleteAssignment}>×</button>
              </div>
              <div className="grades-modal-body">
                <div className="delete-warning">
                  <div className="warning-icon">⚠️</div>
                  <p className="warning-text">
                    คุณต้องการลบหัวข้องาน "<strong>{deletingAssignment.title}</strong>" ใช่หรือไม่?
                  </p>
                  <p className="warning-note">
                    การลบหัวข้องานจะลบคะแนนทั้งหมดของนักเรียนในหัวข้องานนี้ด้วย และไม่สามารถกู้คืนได้
                  </p>
                </div>
              </div>
              <div className="grades-modal-footer">
                <button className="btn-cancel" onClick={cancelDeleteAssignment}>ยกเลิก</button>
                <button className="btn-delete" onClick={confirmDeleteAssignment}>ลบหัวข้องาน</button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Modal */}
        {showSummaryModal && (
          <div className="grades-modal-overlay" onClick={closeSummaryModal}>
            <div className="modal-content summary-modal" onClick={(e) => e.stopPropagation()}>
              <div className="grades-modal-header">
                <h3 className="modal-title">📊 สรุปคะแนนรวม - วิชา #{id}</h3>
                <button className="modal-close" onClick={closeSummaryModal}>×</button>
              </div>
              <div className="grades-modal-body">
                {visibleStudents.length === 0 ? (
                  <div className="summary-empty">ไม่มีนักเรียนในวิชานี้</div>
                ) : (
                  <div className="summary-content">
                    {/* Overall Summary */}
                    <div className="overall-summary">
                      <h4 className="summary-subtitle">📈 สรุปรวมทั้งหมด</h4>
                      <div className="summary-stats">
                        <div className="stat-item">
                          <span className="stat-label">จำนวนหัวข้องาน:</span>
                          <span className="stat-value">{assignments.length}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">จำนวนนักเรียน:</span>
                          <span className="stat-value">{visibleStudents.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Summary Table */}
                    <div className="student-summary">
                      <h4 className="summary-subtitle">📝 คะแนนรวมนักเรียน</h4>
                      <div className="summary-table-container">
                        <table className="summary-table">
                          <thead>
                            <tr>
                              <th>นักเรียน</th>
                              {assignments.map(assignment => (
                                <th key={assignment.id} title={assignment.title}>
                                  {assignment.title.length > 10 
                                    ? assignment.title.substring(0, 10) + '...' 
                                    : assignment.title}
                                  <br />
                                  <small>(/{assignment.max_score})</small>
                                </th>
                              ))}
                              <th>รวม</th>
                              <th>เปอร์เซ็นต์</th>
                              <th>เกรด</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleStudents.map(student => {
                              const summary = calculateStudentSummary(student.id);
                              return (
                                <tr key={student.id}>
                                  <td>
                                    <div className="summary-student-info">
                                      <div className="summary-student-name">
                                        {student.full_name || student.username}
                                      </div>
                                      <div className="summary-student-email">
                                        {student.email}
                                      </div>
                                    </div>
                                  </td>
                                  {summary.assignmentDetails.map((detail, index) => (
                                    <td key={index} className="assignment-score-cell">
                                      <div className="score-detail">
                                        <span className="score-value">{detail.score}</span>
                                        <span className="score-percentage">({detail.percentage}%)</span>
                                      </div>
                                    </td>
                                  ))}
                                  <td className="total-score-cell">
                                    <strong>{summary.totalScore}/{summary.totalMaxScore}</strong>
                                  </td>
                                  <td className="percentage-cell">
                                    <span className="percentage-value">{summary.overallPercentage}%</span>
                                  </td>
                                  <td className="grade-cell">
                                    <span className={`grade-badge grade-${summary.overallGrade.toLowerCase().replace('+', 'plus')}`}>
                                      {summary.overallGrade}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="grades-modal-footer">
                <button className="btn-close-summary" onClick={closeSummaryModal}>ปิด</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GradesPage;
