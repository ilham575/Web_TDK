// This file contains the subject management state and functions that need to be added to admin/home.js
// Add these state variables after the existing state declarations (around line 100):

// Subject management state
const [subjects, setSubjects] = useState([]);
const [loadingSubjects, setLoadingSubjects] = useState(false);
const [showSubjectModal, setShowSubjectModal] = useState(false);
const [selectedSubject, setSelectedSubject] = useState(null);
const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
const [subjectTypeFilter, setSubjectTypeFilter] = useState('all');
const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);

// ===== Subject Management Functions =====
// Add these functions after the classroom management functions

const loadSubjects = async () => {
  if (!currentUser?.school_id) return;
  setLoadingSubjects(true);
  try {
    const token = getStoredAccessToken();
    const res = await fetch(`${API_BASE_URL}/subjects/school/${currentUser.school_id}/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } else {
      setSubjects([]);
    }
  } catch (err) {
    console.error('Error loading subjects:', err);
    setSubjects([]);
  } finally {
    setLoadingSubjects(false);
  }
};

const handleDeleteSubject = async (subjectId) => {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return;

  openConfirmModal(
    'ลบรายวิชา',
    `ต้องการลบรายวิชา "${subject.name}" หรือไม่? โปรดทราบว่าโปรแกรมจะต้องสิ้นสุดรายวิชาก่อนที่จะลบได้`,
    async () => {
      try {
        const token = getStoredAccessToken();
        
        // First, end the subject if not already ended
        if (!subject.is_ended) {
          await fetch(`${API_BASE_URL}/subjects/${subjectId}/end`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        // Then delete
        const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          toast.success(`ลบรายวิชา "${subject.name}" สำเร็จ`);
          loadSubjects();
        } else {
          const error = await res.json();
          toast.error(error.detail || 'ไม่สามารถลบรายวิชาได้');
        }
      } catch (err) {
        console.error('Error deleting subject:', err);
        toast.error('เกิดข้อผิดพลาดในการลบรายวิชา');
      }
    }
  );
};

const handleEditSubject = (subject) => {
  // Find the latest subject data from the current subjects list
  const latestSubject = subjects.find(s => s.id === subject.id);
  setSelectedSubject(latestSubject || subject);
  setShowSubjectModal(true);
};

const handleCreateSubject = () => {
  setSelectedSubject(null);
  setShowSubjectModal(true);
};

// Add to useEffect that loads based on activeTab (around line 1048):
// Add this condition to the useEffect that loads data when activeTab changes:
useEffect(() => {
  if (activeTab === 'subjects') {
    loadSubjects();
  }
}, [activeTab, currentUser?.school_id]);

// Add the subjects tab button after the "schedule" tab button (around line 1923):
// <button className={`admin-tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>📚 จัดการรายวิชา</button>

// Add the subjects tab content after the schedule tab content (around line 3100):
// {activeTab === 'subjects' && (
//   <div className="content-card">
//     <div className="card-header">
//       <h2><span className="card-icon">📚</span> จัดการรายวิชา</h2>
//     </div>
//     <div className="card-content">
//       {loadingSubjects && <Loading message="กำลังโหลดข้อมูลรายวิชา..." />}
//
//       <div className="list-header" style={{ marginBottom: '1.5rem' }}>
//         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
//           <button 
//             className="btn-action btn-success"
//             onClick={handleCreateSubject}
//           >
//             ➕ สร้างรายวิชาใหม่
//           </button>
//           <input
//             type="text"
//             placeholder="🔍 ค้นหารายวิชา"
//             value={subjectSearchTerm}
//             onChange={(e) => {
//               setSubjectSearchTerm(e.target.value);
//               setSubjectCurrentPage(1);
//             }}
//             style={{
//               flex: 1,
//               minWidth: '200px',
//               padding: '10px 12px',
//               borderRadius: '8px',
//               border: '1px solid #ddd'
//             }}
//           />
//           <select
//             value={subjectTypeFilter}
//             onChange={(e) => {
//               setSubjectTypeFilter(e.target.value);
//               setSubjectCurrentPage(1);
//             }}
//             style={{
//               padding: '10px 12px',
//               borderRadius: '8px',
//               border: '1px solid #ddd',
//               cursor: 'pointer'
//             }}
//           >
//             <option value="all">ทั้งหมด</option>
//             <option value="main">📖 รายวิชาหลัก</option>
//             <option value="activity">🎯 รายวิชากิจกรรม</option>
//           </select>
//         </div>
//       </div>
//
//       {subjects.length === 0 ? (
//         <div className="empty-state">
//           <div className="empty-icon">📚</div>
//           <div className="empty-text">ยังไม่มีรายวิชา</div>
//           <div className="empty-subtitle">สร้างรายวิชาใหม่เพื่อเริ่มต้น</div>
//         </div>
//       ) : (() => {
//         const filtered = subjects.filter(s => {
//           const matchSearch = !subjectSearchTerm || s.name.toLowerCase().includes(subjectSearchTerm.toLowerCase());
//           const matchType = subjectTypeFilter === 'all' || s.subject_type === subjectTypeFilter;
//           return matchSearch && matchType;
//         });
//
//         const ITEMS_PER_PAGE = 10;
//         const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
//         const startIdx = (subjectCurrentPage - 1) * ITEMS_PER_PAGE;
//         const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
//
//         return (
//           <>
//             <div style={{ overflowX: 'auto' }}>
//               <table className="admin-table">
//                 <thead>
//                   <tr>
//                     <th>ชื่อรายวิชา</th>
//                     <th>รหัส</th>
//                     <th>ประเภท</th>
//                     <th>ครูผู้สอน</th>
//                     <th style={{ textAlign: 'center' }}>ชั้นเรียน</th>
//                     <th style={{ textAlign: 'center' }}>นักเรียน</th>
//                     <th style={{ width: '200px' }}>การจัดการ</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {paginated.map(subject => (
//                     <tr key={subject.id}>
//                       <td><strong>{subject.name}</strong></td>
//                       <td>{subject.code || '-'}</td>
//                       <td>{subject.subject_type === 'main' ? '📖 รายวิชาหลัก' : '🎯 รายวิชากิจกรรม'}</td>
//                       <td>{subject.teacher_name || 'ยังไม่มีครู'}</td>
//                       <td style={{ textAlign: 'center' }}>{subject.classroom_count}</td>
//                       <td style={{ textAlign: 'center' }}>{subject.student_count}</td>
//                       <td style={{ display: 'flex', gap: '0.5rem' }}>
//                         <button
//                           className="btn-action btn-primary"
//                           onClick={() => handleEditSubject(subject)}
//                           style={{ flex: 1 }}
//                         >
//                           ✏️ แก้ไข
//                         </button>
//                         <button
//                           className="btn-action btn-danger"
//                           onClick={() => handleDeleteSubject(subject.id)}
//                           style={{ flex: 1 }}
//                         >
//                           🗑️ ลบ
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//             {totalPages > 1 && (
//               <div className="pagination" style={{ marginTop: '1rem' }}>
//                 {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
//                   <button
//                     key={page}
//                     className={`pagination-btn ${subjectCurrentPage === page ? 'active' : ''}`}
//                     onClick={() => setSubjectCurrentPage(page)}
//                   >
//                     {page}
//                   </button>
//                 ))}
//               </div>
//             )}
//           </>
//         );
//       })()}
//     </div>
//   </div>
// )}

// Don't forget to add the SubjectManagementModal component in the return statement before the closing </div> of the main component:
// <SubjectManagementModal
//   isOpen={showSubjectModal}
//   onClose={() => setShowSubjectModal(false)}
//   onSave={loadSubjects}
//   subject={selectedSubject}
//   teachers={teachers}
//   classrooms={classrooms}
//   currentSchoolId={currentUser?.school_id}
// />
