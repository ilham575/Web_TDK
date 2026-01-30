import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';
import ActivityDetailModal from '../../ActivityDetailModal';

export default function AcademicTranscript({ studentId, studentSubjects }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showGPAModal, setShowGPAModal] = useState(false);
  const [gradeModalFullscreen, setGradeModalFullscreen] = useState(false);
  const [gpaModalFullscreen, setGpaModalFullscreen] = useState(false);
  const [selectedActivityData, setSelectedActivityData] = useState(null);
  const [gradesAnnounced, setGradesAnnounced] = useState(true);
  const [gradeAnnouncementDate, setGradeAnnouncementDate] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [rankingInfo, setRankingInfo] = useState(null); // { rank: 1, total: 30, average: 85.5 }
  const [schoolRankingInfo, setSchoolRankingInfo] = useState(null); // { rank: 1, total: 500 }
  const [transcriptSummary, setTranscriptSummary] = useState({
    totalSubjects: 0,
    regularSubjectsCount: 0,
    activitySubjectsCount: 0,
    totalScore: 0,
    totalMaxScore: 0,
    totalCredits: 0,
    gpa: 0,
    scorePercentage: 0,
    completedSubjects: 0
  });

  // โหลดเกรดของนักเรียนจากทุกวิชา (with activity aggregation)
  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const loadGrades = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Load full transcript with activity aggregation
        const transcriptRes = await fetch(`${API_BASE_URL}/grades/student/${studentId}/transcript`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });

        if (!transcriptRes.ok) {
          throw new Error('Failed to load transcript');
        }

        const transcriptData = await transcriptRes.json();

        // Process transcript data
        const processedGrades = transcriptData.map(entry => {
          if (entry.subject_type === 'activity') {
            // Activity entry with aggregation
            return {
              subject: { 
                id: null,
                name: 'กิจกรรม (Activity)',
                subject_type: 'activity'
              },
              grades: entry.breakdown || [],
              totalScore: entry.score,
              totalMaxScore: 100,
              scorePercentage: entry.score,
              isActivity: true,
              activityBreakdown: entry.breakdown || [],
              totalActivityPercent: entry.total_percent || 0
            };
          } else {
            // Regular subject
            return {
              subject: {
                id: entry.subject_id,
                name: entry.subject_name,
                subject_type: 'regular',
                credits: entry.credits || 1
              },
              grades: [],
              totalScore: entry.score,
              totalMaxScore: entry.max_score,
              scorePercentage: entry.normalized_score,
              isActivity: false,
              teachers: entry.teachers || []
            };
          }
        });

        setGrades(processedGrades);

        // คำนวณสรุปสถิติรวม (แยกจำนวนวิชาปกติและกิจกรรม)
        let totalScore = 0;
        let totalMaxScore = 0;
        let completedSubjects = 0;
        let totalCredits = 0;
        let regularSubjectsCount = 0;
        let activitySubjectsCount = 0;

        processedGrades.forEach(gradeData => {
          // Separate handling for activity vs regular
          if (gradeData.isActivity) {
            activitySubjectsCount++;
            return; // do not include activity in score sums or completedSubjects
          }

          // Regular subjects: include only if there is a valid score info
          const hasTotalMax = Number(gradeData.totalMaxScore) > 0;
          const hasNormalized = gradeData.scorePercentage !== undefined && gradeData.scorePercentage !== null && String(gradeData.scorePercentage).trim() !== '';
          if (!hasTotalMax && !hasNormalized) return; // skip if no score info

          // Tally subjects
          regularSubjectsCount++;
          completedSubjects++;

          // Determine contribution to totals
          if (hasTotalMax) {
            totalScore += Number(gradeData.totalScore) || 0;
            totalMaxScore += Number(gradeData.totalMaxScore) || 0;
          } else if (hasNormalized) {
            // treat normalized score as out of 100
            totalScore += Number(gradeData.scorePercentage) || 0;
            totalMaxScore += 100;
          }

          const credit = gradeData.subject?.credits || 1;
          totalCredits += credit;
        });

        const overallPercentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0;
        const gpa = calculateGPA(processedGrades);

        setTranscriptSummary({
          totalSubjects: processedGrades.length,
          regularSubjectsCount,
          activitySubjectsCount,
          totalScore,
          totalMaxScore,
          totalCredits,
          gpa,
          scorePercentage: overallPercentage,
          completedSubjects
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading grades:', err);
        toast.error('ไม่สามารถโหลดข้อมูลเกรด');
        setLoading(false);
      }
    };

    loadGrades();
  }, [studentId]);

  // Load Ranking Information
  useEffect(() => {
    const loadRanking = async () => {
      if (!studentId || !gradesAnnounced) return;
      
      try {
        const token = localStorage.getItem('token');
        let schoolId = localStorage.getItem('school_id');
        
        // Ensure we have schoolId
        if (!schoolId) {
          const userRes = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            schoolId = userData.school_id;
          }
        }

        // 1. Get student's classrooms and classroom ranking
        const classroomRes = await fetch(`${API_BASE_URL}/classrooms/my-classrooms`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        
        if (classroomRes.ok) {
          const classrooms = await classroomRes.json();
          if (classrooms && classrooms.length > 0) {
            const currentClassroom = classrooms[0];
            const rankingRes = await fetch(`${API_BASE_URL}/grades/classroom/${currentClassroom.id}/ranking`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });
            
            if (rankingRes.ok) {
              const rankingData = await rankingRes.json();
              const myRank = rankingData.find(r => r.student_id === studentId);
              if (myRank) {
                setRankingInfo({
                  rank: myRank.rank,
                  total: rankingData.length,
                  totalScore: myRank.total_score,
                  totalMaxScore: myRank.total_max_score,
                  average: myRank.average_score,
                  classroomName: currentClassroom.name
                });
              }
            }
          }
        }

        // 2. Get school ranking
        if (schoolId) {
          const schoolRankingRes = await fetch(`${API_BASE_URL}/grades/school/${schoolId}/ranking`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          
          if (schoolRankingRes.ok) {
            const schoolRankingData = await schoolRankingRes.json();
            const mySchoolRank = schoolRankingData.find(r => r.student_id === studentId);
            if (mySchoolRank) {
              setSchoolRankingInfo({
                rank: mySchoolRank.rank,
                total: schoolRankingData.length,
                totalScore: mySchoolRank.total_score,
                totalMaxScore: mySchoolRank.total_max_score,
                average: mySchoolRank.average_score
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading ranking:', err);
      }
    };
    
    if (gradesAnnounced) {
      loadRanking();
    }
  }, [studentId, gradesAnnounced]);

  // Check grade announcement date
  useEffect(() => {
    const checkGradeAnnouncement = async () => {
      if (!studentId) return;
      try {
        const token = localStorage.getItem('token');
        let schoolId = localStorage.getItem('school_id');
        if (!schoolId) {
          const userRes = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          const userData = await userRes.json();
          schoolId = userData.school_id;
        }
        if (!schoolId) return;
        
        const res = await fetch(`${API_BASE_URL}/schools/${schoolId}`);
        if (!res.ok) return;
        const school = await res.json();
        if (school.grade_announcement_date) {
          setGradeAnnouncementDate(new Date(school.grade_announcement_date));
          const now = new Date();
          setGradesAnnounced(now >= new Date(school.grade_announcement_date));
        }
      } catch (err) {
        // ignore quietly
      }
    };
    checkGradeAnnouncement();
  }, [studentId]);

  // Countdown timer until announcement
  useEffect(() => {
    if (!gradeAnnouncementDate) return;
    let mounted = true;
    const update = () => {
      const now = new Date();
      const diff = gradeAnnouncementDate - now;
      if (diff <= 0) {
        if (mounted) {
          setGradesAnnounced(true);
          setCountdown('');
        }
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const text = `${days} วัน ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
      if (mounted) setCountdown(text);
    };
    update();
    const t = setInterval(update, 1000);
    return () => { mounted = false; clearInterval(t); };
  }, [gradeAnnouncementDate]);

  const getLetterGrade = (percentage) => {
    percentage = parseFloat(percentage);
    if (percentage >= 95) return { grade: 'A+', baseGrade: 'A', gpaValue: 4.0, color: '#2E7D32' };
    if (percentage >= 80) return { grade: 'A', baseGrade: 'A', gpaValue: 4.0, color: '#388E3C' };
    if (percentage >= 75) return { grade: 'B+', baseGrade: 'B', gpaValue: 3.5, color: '#558B2F' };
    if (percentage >= 70) return { grade: 'B', baseGrade: 'B', gpaValue: 3.0, color: '#689F38' };
    if (percentage >= 65) return { grade: 'C+', baseGrade: 'C', gpaValue: 2.5, color: '#AFB42B' };
    if (percentage >= 60) return { grade: 'C', baseGrade: 'C', gpaValue: 2.0, color: '#C0CA33' };
    if (percentage >= 55) return { grade: 'D+', baseGrade: 'D', gpaValue: 1.5, color: '#F57F17' };
    if (percentage >= 50) return { grade: 'D', baseGrade: 'D', gpaValue: 1.0, color: '#F9A825' };
    return { grade: 'F', baseGrade: 'F', gpaValue: 0, color: '#D32F2F' };
  };

  const calculateGPA = (subjectDataArray) => {
    if (!Array.isArray(subjectDataArray) || subjectDataArray.length === 0) return 0;

    const graded = subjectDataArray.filter(s => {
      if (s.isActivity) return false;
      const hasTotalMax = Number(s.totalMaxScore) > 0;
      const hasNormalized = s.scorePercentage !== undefined && s.scorePercentage !== null && String(s.scorePercentage).trim() !== '';
      return hasTotalMax || hasNormalized;
    });
    if (graded.length === 0) return 0;

    let totalWeighted = 0;
    let totalCredits = 0;

    graded.forEach(s => {
      const hasNormalized = s.scorePercentage !== undefined && s.scorePercentage !== null && String(s.scorePercentage).trim() !== '';
      const percentage = hasNormalized ? Number(s.scorePercentage) : (Number(s.totalMaxScore) > 0 ? (Number(s.totalScore) / Number(s.totalMaxScore)) * 100 : 0);
      const gpaValue = getLetterGrade(percentage).gpaValue;

      const subj = s.subject || {};
      let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? s.credits ?? s.credit ?? 1);
      if (!isFinite(credit) || credit <= 0) credit = 1;

      totalWeighted += gpaValue * credit;
      totalCredits += credit;
    });

    if (totalCredits === 0) return 0;
    return Number((totalWeighted / totalCredits).toFixed(2));
  };

  const getGradeDescription = (grade) => {
    const descriptions = {
      'A+': 'ดีเยี่ยม (95-100%)',
      'A': 'ดีมาก (80-94%)',
      'B+': 'ดี (75-79%)',
      'B': 'ดี (70-74%)',
      'C+': 'พอใจ (65-69%)',
      'C': 'พอใช้ (60-64%)',
      'D+': 'ผ่าน (55-59%)',
      'D': 'ผ่านต่ำ (50-54%)',
      'F': 'ไม่ผ่าน (< 50%)'
    };
    return descriptions[grade] || grade;
  };

  if (loading) {
    return (
      <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 p-12 text-center">
        <div className="text-4xl mb-4 opacity-50">⏳</div>
        <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลการเรียน...</p>
      </section>
    );
  }

  // If grades are not announced yet, hide full transcript and show announcement message
  if (!gradesAnnounced) {
    return (
      <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📊</span> ใบแสดงผลการเรียน
          </h3>
          <p className="text-sm text-slate-500 mt-1">ข้อมูลคะแนนและผลการเรียนของคุณ</p>
        </div>

        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <p className="font-bold text-yellow-800 mb-2">🔔 ยังไม่ถึงเวลาประกาศผลคะแนน</p>
            <p className="text-yellow-700 text-sm mb-3">
              ผลคะแนนจะเปิดดูได้ในวันที่: <strong>
                {gradeAnnouncementDate 
                  ? gradeAnnouncementDate.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) 
                  : '-'
                }
              </strong>
            </p>
            {countdown && (
              <div className="text-yellow-800 font-bold text-lg">
                นับถอยหลัง: {countdown}
              </div>
            )}
          </div>

          <div className="text-center py-12">
            <div className="text-5xl mb-4 opacity-50">📭</div>
            <p className="text-slate-500 font-medium">ข้อมูลใบแสดงผลจะปรากฏเมื่อครูประกาศผลคะแนนแล้ว</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg shadow-slate-100/50 border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>📊</span> ใบแสดงผลการเรียน
        </h3>
        <p className="text-sm text-slate-500 mt-1">ข้อมูลคะแนนและผลการเรียนของคุณ</p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-4 p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
        {/* Overall Score Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">คะแนนรวม</p>
          <p className="text-3xl font-bold text-emerald-600 mb-1">{transcriptSummary.scorePercentage}%</p>
          <p className="text-xs text-slate-500 mb-3">{transcriptSummary.totalScore} / {transcriptSummary.totalMaxScore} คะแนน</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">เกรด:</span>
            <span 
              className="inline-block px-2 py-1 rounded-lg font-bold text-xs text-white"
              style={{
                backgroundColor: getLetterGrade(transcriptSummary.scorePercentage).color,
                opacity: 0.9
              }}
            >
              {getLetterGrade(transcriptSummary.scorePercentage).grade}
            </span>
          </div>
        </div>

        {/* GPA Card */}
        <div 
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-300 hover:bg-emerald-50"
          onClick={() => setShowGPAModal(true)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && setShowGPAModal(true)}
        >
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">เกรดเฉลี่ย (GPA)</p>
          <p className="text-3xl font-bold text-emerald-600 mb-1">{typeof transcriptSummary.gpa === 'number' ? transcriptSummary.gpa.toFixed(2) : transcriptSummary.gpa}</p>
          <p className="text-xs text-slate-500 mb-3">เป้าหมายสูงสุด 4.00</p>
          <p className="text-xs font-semibold text-slate-700">
            {transcriptSummary.gpa >= 3.6 && '🌟 ยอดเยี่ยม'}
            {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && '⭐ ดี'}
            {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && '👍 พอใจ'}
            {transcriptSummary.gpa < 2.0 && '📚 พยายามเพิ่มเติม'}
          </p>
        </div>

        {/* Classroom Ranking Card */}
        <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm hover:shadow-md transition-shadow ring-4 ring-indigo-50/50">
          <p className="text-xs font-bold text-indigo-500 uppercase mb-2">ลำดับที่ในชั้นเรียน</p>
          {rankingInfo ? (
            <>
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-3xl font-black text-indigo-600">{rankingInfo.rank}</p>
                <p className="text-sm font-bold text-slate-400">/ {rankingInfo.total}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">ห้อง {rankingInfo.classroomName || '-'}</p>
              <p className="text-[10px] text-indigo-700 font-bold mb-3">{rankingInfo.totalScore} / {rankingInfo.totalMaxScore} คะแนน</p>
              <div className="flex items-center gap-1">
                <span className="text-lg">🏆</span>
                <span className="text-xs font-bold text-indigo-700">ลำดับคะแนนในห้อง</span>
              </div>
            </>
          ) : (
            <div className="py-2">
              <p className="text-lg font-bold text-slate-300 italic">รอการคำนวณ...</p>
              <p className="text-[10px] text-slate-400 mt-2">คะแนนรวมทุกวิชา</p>
            </div>
          )}
        </div>

        {/* School Ranking Card */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow ring-4 ring-amber-50/50">
          <p className="text-xs font-bold text-amber-600 uppercase mb-2">ลำดับที่ทั้งโรงเรียน</p>
          {schoolRankingInfo ? (
            <>
              <div className="flex items-baseline gap-1 mb-1">
                <p className="text-3xl font-black text-amber-600">{schoolRankingInfo.rank}</p>
                <p className="text-sm font-bold text-slate-400">/ {schoolRankingInfo.total}</p>
              </div>
              <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">นักเรียนทั้งโรงเรียน</p>
              <p className="text-[10px] text-amber-700 font-bold mb-3">{schoolRankingInfo.totalScore} / {schoolRankingInfo.totalMaxScore} คะแนน</p>
              <div className="flex items-center gap-1">
                <span className="text-lg">🌍</span>
                <span className="text-xs font-bold text-amber-700">ลำดับคะแนนทั้งโรงเรียน</span>
              </div>
            </>
          ) : (
            <div className="py-2">
              <p className="text-lg font-bold text-slate-300 italic">รอการคำนวณ...</p>
              <p className="text-[10px] text-slate-400 mt-2">คะแนนรวมทุกวิชา</p>
            </div>
          )}
        </div>

        {/* Regular Subjects Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">รายวิชา (ปกติ)</p>
          <p className="text-3xl font-bold text-blue-600 mb-3">{transcriptSummary.regularSubjectsCount}</p>
          <p className="text-xs text-slate-500 mb-3">หน่วยกิตที่นับ GPA</p>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${transcriptSummary.regularSubjectsCount > 0 ? (transcriptSummary.completedSubjects / transcriptSummary.regularSubjectsCount) * 100 : 0}%`
              }}
            ></div>
          </div>
        </div>

        {/* Activity Subjects Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">รายวิชา (กิจกรรม)</p>
          <p className="text-3xl font-bold text-purple-600 mb-3">{transcriptSummary.activitySubjectsCount}</p>
          <p className="text-xs text-slate-500">ประเมินแบบ ผ่าน/ไม่ผ่าน</p>
        </div>

        {/* Total Credits Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">หน่วยกิตรวม</p>
          <p className="text-3xl font-bold text-indigo-600 mb-3">{transcriptSummary.totalCredits}</p>
          <p className="text-xs text-slate-500">หน่วยกิตที่บันทึกคะแนน</p>
        </div>

        {/* Grade Legend Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">เกรดตัวอักษร</p>
          <p className="text-xs text-slate-600 mb-4">แสดงคำอธิบายเกรดแบบเต็ม</p>
          <button
            onClick={() => setShowGradeModal(true)}
            className="w-full px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs hover:bg-emerald-200 transition-all"
          >
            คำอธิบายเกรด
          </button>
        </div>
      </div>

      {/* Grades Table Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>📚</span> รายละเอียดคะแนนแต่ละวิชา
          </h4>
          <span className="text-sm font-semibold text-slate-500">รวมทั้งสิ้น {grades.length} วิชา</span>
        </div>

        {grades.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 opacity-50">📭</div>
            <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลคะแนน</p>
            <p className="text-slate-400 text-sm">รอดูคะแนนจากครูผู้สอน</p>
          </div>
        ) : (
          <>
          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-sm">รายวิชา</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-700 text-sm">ประเภท</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-sm">คะแนนสอบ</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-sm">เกรด</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-sm">หน่วยกิต</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-sm">GPA</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700 text-sm">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {grades.map(subjectData => {
                  const letterGrade = getLetterGrade(subjectData.scorePercentage);
                  const subj = subjectData.subject || {};
                  let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? subjectData.credits ?? subjectData.credit ?? 1);
                  if (!isFinite(credit) || credit <= 0) credit = 1;
                  
                   const tableKey = subjectData.isActivity ? 'activity' : subjectData.subject.id;
                  const isAllEnded = subjectData.teachers?.length > 0 && subjectData.teachers.every(t => t.is_ended);
                  
                  return (
                    <tr key={tableKey} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${subjectData.isActivity ? 'bg-purple-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{subjectData.isActivity ? '🎯' : '📖'}</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 text-sm">{subjectData.subject.name}</span>
                            {!subjectData.isActivity && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold
                                  ${isAllEnded 
                                    ? 'bg-slate-100 text-slate-500' 
                                    : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  <div className={`w-1 h-1 rounded-full ${isAllEnded ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                                  {isAllEnded ? 'จบแล้ว' : 'กำลังเรียน'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                          subjectData.isActivity 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {subjectData.isActivity ? 'กิจกรรม' : 'ปกติ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-slate-700">{subjectData.scorePercentage}</span>
                          <span className="text-slate-500 text-sm">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {subjectData.isActivity ? (
                          <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs text-white ${
                            Number(subjectData.scorePercentage) >= 50 
                              ? 'bg-emerald-600' 
                              : 'bg-red-600'
                          }`}>
                            {Number(subjectData.scorePercentage) >= 50 ? 'ผ่าน' : 'ไม่ผ่าน'}
                          </span>
                        ) : (
                          <span 
                            className="inline-block px-3 py-1 rounded-lg font-bold text-xs text-white"
                            style={{ backgroundColor: letterGrade.color }}
                          >
                            {letterGrade.grade}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-slate-700 text-sm">
                          {subjectData.isActivity ? '—' : credit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-slate-700 text-sm">
                          {subjectData.isActivity ? '—' : letterGrade.gpaValue.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          className="text-xl hover:scale-125 transition-transform"
                          onClick={() => {
                            if (subjectData.isActivity) {
                              setSelectedActivityData({
                                activity_subjects: subjectData.activityBreakdown,
                                total_activity_score: subjectData.totalScore,
                                total_activity_percent: subjectData.totalActivityPercent
                              });
                              setShowActivityModal(true);
                            } else {
                              setExpandedSubject(expandedSubject === tableKey ? null : tableKey);
                            }
                          }}
                          title={subjectData.isActivity ? 'ดูรายละเอียดกิจกรรม' : 'ดูรายละเอียด'}
                        >
                          {subjectData.isActivity ? '📊' : 'ℹ️'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {grades.map(subjectData => {
              const letterGrade = getLetterGrade(subjectData.scorePercentage);
              const subj = subjectData.subject || {};
              let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? subjectData.credits ?? subjectData.credit ?? 1);
              if (!isFinite(credit) || credit <= 0) credit = 1;

              const tableKey = subjectData.isActivity ? 'activity' : subjectData.subject.id;
              const isAllEnded = subjectData.teachers?.length > 0 && subjectData.teachers.every(t => t.is_ended);

              return (
                <div key={tableKey} className={`rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${subjectData.isActivity ? 'bg-purple-50/30 border-purple-100' : 'bg-white border-slate-100'}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{subjectData.isActivity ? '🎯' : '📖'}</span>
                      <div>
                        <div className="flex flex-col">
                          <h4 className="font-bold text-slate-800 leading-tight">{subjectData.subject.name}</h4>
                          {!subjectData.isActivity && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold
                                ${isAllEnded 
                                  ? 'bg-slate-100 text-slate-500' 
                                  : 'bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                <div className={`w-1 h-1 rounded-full ${isAllEnded ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                                {isAllEnded ? 'จบแล้ว' : 'กำลังเรียน'}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          subjectData.isActivity 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {subjectData.isActivity ? 'กิจกรรม' : 'ปกติ'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center py-2 border-t border-b border-slate-50/50">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">คะแนน</p>
                      <p className="font-bold text-slate-700">{subjectData.scorePercentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">เกรด</p>
                      {subjectData.isActivity ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${
                          Number(subjectData.scorePercentage) >= 50 ? 'bg-emerald-600' : 'bg-red-600'
                        }`}>
                          {Number(subjectData.scorePercentage) >= 50 ? 'ผ่าน' : 'ไม่ผ่าน'}
                        </span>
                      ) : (
                        <span 
                          className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                          style={{ backgroundColor: letterGrade.color }}
                        >
                          {letterGrade.grade}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">หน่วยกิต</p>
                      <p className="font-bold text-slate-700">{subjectData.isActivity ? '-' : credit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">GPA</p>
                      <p className="font-bold text-slate-700">{subjectData.isActivity ? '-' : letterGrade.gpaValue.toFixed(1)}</p>
                    </div>
                  </div>

                  {/* Action */}
                  <button 
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors"
                    onClick={() => {
                      if (subjectData.isActivity) {
                        setSelectedActivityData({
                          activity_subjects: subjectData.activityBreakdown,
                          total_activity_score: subjectData.totalScore,
                          total_activity_percent: subjectData.totalActivityPercent
                        });
                        setShowActivityModal(true);
                      } else {
                        setExpandedSubject(expandedSubject === tableKey ? null : tableKey);
                      }
                    }}
                  >
                    {subjectData.isActivity ? '📊 ดูรายละเอียดกิจกรรม' : 'ℹ️ ดูรายละเอียด'}
                  </button>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* Footer Note */}
      <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">ℹ️</span>
        <p className="text-sm text-blue-700">ใบแสดงผลการเรียนนี้แสดงคะแนนล่าสุดจากระบบ เป็นอิงตามข้อมูลที่ครูผู้สอนบันทึกไว้</p>
      </div>

      {/* Grade Legend Modal */}
      {showGradeModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGradeModal(false)}
        >
          <div 
            className={`bg-white rounded-2xl shadow-2xl ${gradeModalFullscreen ? 'w-full h-full' : 'max-w-2xl w-full max-h-[90vh]'} overflow-y-auto`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">คำอธิบายเกรด</h4>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                  aria-label={gradeModalFullscreen ? "ออกจากโหมดเต็มจอ" : "เข้าสู่โหมดเต็มจอ"}
                  onClick={() => setGradeModalFullscreen(!gradeModalFullscreen)}
                >
                  {gradeModalFullscreen ? '🗗' : '🗖'}
                </button>
                <button
                  className="p-2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                  aria-label="ปิด"
                  onClick={() => {
                    setShowGradeModal(false);
                    setGradeModalFullscreen(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-200">
                      <th className="text-left px-4 py-3 font-bold text-slate-700 text-sm">เกรด</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 text-sm">เปอร์เซ็นต์</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 text-sm">คำอธิบาย</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700 text-sm">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { grade: 'A+', range: '95 - 100%', desc: 'ดีเยี่ยม — ผลการเรียนยอดเยี่ยมทุกด้าน', gpa: '4.0' },
                      { grade: 'A', range: '80 - 94%', desc: 'ดีมาก — ทำงานครบถ้วน มีความเข้าใจดี', gpa: '4.0' },
                      { grade: 'B+', range: '75 - 79%', desc: 'ดี — ผลการเรียนดี มีจุดที่พัฒนาได้', gpa: '3.5' },
                      { grade: 'B', range: '70 - 74%', desc: 'ดี — ผลการเรียนพอสมควร', gpa: '3.0' },
                      { grade: 'C+', range: '65 - 69%', desc: 'พอใจ — ผลการเรียนพอใจขั้นต้น', gpa: '2.5' },
                      { grade: 'C', range: '60 - 64%', desc: 'พอใช้ — ผลการเรียนพอใช้', gpa: '2.0' },
                      { grade: 'D+', range: '55 - 59%', desc: 'ผ่าน — ผลการเรียนน้อย', gpa: '1.5' },
                      { grade: 'D', range: '50 - 54%', desc: 'ผ่านต่ำ — ผลการเรียนน้อยมาก', gpa: '1.0' },
                      { grade: 'F', range: '< 50%', desc: 'ไม่ผ่าน — ผลการเรียนต่ำ ต้องศึกษาเพิ่มเติม', gpa: '0.0' }
                    ].map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span 
                            className="inline-block px-3 py-1 rounded-lg font-bold text-xs text-white"
                            style={{ backgroundColor: getLetterGrade(item.grade === 'F' ? 40 : 95).color }}
                          >
                            {item.grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.range}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.desc}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 text-sm">{item.gpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile View: Cards */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {[
                  { grade: 'A+', range: '95 - 100%', desc: 'ดีเยี่ยม — ผลการเรียนยอดเยี่ยมทุกด้าน', gpa: '4.0' },
                  { grade: 'A', range: '80 - 94%', desc: 'ดีมาก — ทำงานครบถ้วน มีความเข้าใจดี', gpa: '4.0' },
                  { grade: 'B+', range: '75 - 79%', desc: 'ดี — ผลการเรียนดี มีจุดที่พัฒนาได้', gpa: '3.5' },
                  { grade: 'B', range: '70 - 74%', desc: 'ดี — ผลการเรียนพอสมควร', gpa: '3.0' },
                  { grade: 'C+', range: '65 - 69%', desc: 'พอใจ — ผลการเรียนพอใจขั้นต้น', gpa: '2.5' },
                  { grade: 'C', range: '60 - 64%', desc: 'พอใช้ — ผลการเรียนพอใช้', gpa: '2.0' },
                  { grade: 'D+', range: '55 - 59%', desc: 'ผ่าน — ผลการเรียนน้อย', gpa: '1.5' },
                  { grade: 'D', range: '50 - 54%', desc: 'ผ่านต่ำ — ผลการเรียนน้อยมาก', gpa: '1.0' },
                  { grade: 'F', range: '< 50%', desc: 'ไม่ผ่าน — ผลการเรียนต่ำ ต้องศึกษาเพิ่มเติม', gpa: '0.0' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <span 
                              className="inline-block px-3 py-1 rounded-lg font-bold text-xs text-white"
                              style={{ backgroundColor: getLetterGrade(item.grade === 'F' ? 40 : 95).color }}
                            >
                              {item.grade}
                            </span>
                            <span className="font-bold text-slate-700 text-sm">GPA: {item.gpa}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                        <span className="text-xs text-slate-500 font-medium">ช่วงคะแนน</span>
                        <span className="text-sm font-bold text-slate-700">{item.range}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPA Information Modal */}
      {showGPAModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGPAModal(false)}
        >
          <div 
            className={`bg-white rounded-2xl shadow-2xl ${gpaModalFullscreen ? 'w-full h-full' : 'max-w-2xl w-full max-h-[90vh]'} overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 border-b border-emerald-200 p-6 flex items-center justify-between">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📊</span> เกรดเฉลี่ย (GPA)
              </h4>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-white/80 hover:text-white text-lg leading-none"
                  aria-label={gpaModalFullscreen ? "ออกจากโหมดเต็มจอ" : "เข้าสู่โหมดเต็มจอ"}
                  onClick={() => setGpaModalFullscreen(!gpaModalFullscreen)}
                >
                  {gpaModalFullscreen ? '🗗' : '🗖'}
                </button>
                <button
                  className="p-2 text-white/80 hover:text-white text-lg leading-none"
                  aria-label="ปิด"
                  onClick={() => {
                    setShowGPAModal(false);
                    setGpaModalFullscreen(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-8">
              {/* GPA Score Display */}
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-emerald-600 mb-2">
                  {typeof transcriptSummary.gpa === 'number' ? transcriptSummary.gpa.toFixed(2) : transcriptSummary.gpa}
                </div>
                <p className="text-lg text-slate-600 mb-4">จาก 4.0</p>
                <p className="text-2xl font-semibold mb-2">
                  {transcriptSummary.gpa >= 3.6 && '🌟 ยอดเยี่ยม'}
                  {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && '⭐ ดี'}
                  {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && '👍 พอใจ'}
                  {transcriptSummary.gpa < 2.0 && '📚 พยายามเพิ่มเติม'}
                </p>
                <p className="text-sm text-slate-500">
                  {transcriptSummary.gpa >= 3.6 && 'ผลการเรียนของคุณยอดเยี่ยมมาก! ทำให้ได้ GPA ที่สูงมากต่อไป'}
                  {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && 'ผลการเรียนของคุณดีมาก! มีพื้นฐานที่มั่นคง'}
                  {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && 'ผลการเรียนของคุณพอใจ พยายามพัฒนาต่อไป'}
                  {transcriptSummary.gpa < 2.0 && 'คุณสามารถปรับปรุงผลการเรียนได้ ลองบอกครูหรือตัวแทนเพื่อขอคำแนะนำ'}
                </p>
              </div>

              {/* GPA Scale Information */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                <h5 className="font-bold text-slate-800 mb-4">📈 มาตราส่วน GPA</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-100">
                    <span className="font-semibold text-slate-700">3.6 - 4.0</span>
                    <span className="text-sm text-slate-600">ยอดเยี่ยม</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                    <span className="font-semibold text-slate-700">3.0 - 3.59</span>
                    <span className="text-sm text-slate-600">ดี</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100">
                    <span className="font-semibold text-slate-700">2.0 - 2.99</span>
                    <span className="text-sm text-slate-600">พอใจ</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                    <span className="font-semibold text-slate-700">ต่ำกว่า 2.0</span>
                    <span className="text-sm text-slate-600">ต้องพัฒนา</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h5 className="font-bold text-slate-800 mb-4">📊 สรุปผลการเรียน</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold mb-1">รายวิชาที่เรียน</p>
                    <p className="text-2xl font-bold text-blue-600">{transcriptSummary.totalSubjects}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold mb-1">วิชาปกติ</p>
                    <p className="text-2xl font-bold text-indigo-600">{transcriptSummary.regularSubjectsCount}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold mb-1">หน่วยกิตรวม</p>
                    <p className="text-2xl font-bold text-purple-600">{transcriptSummary.totalCredits}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold mb-1">วิชากิจกรรม</p>
                    <p className="text-2xl font-bold text-rose-600">{transcriptSummary.activitySubjectsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && selectedActivityData && (
        <ActivityDetailModal
          data={selectedActivityData}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedActivityData(null);
          }}
        />
      )}
    </section>
  );
}

