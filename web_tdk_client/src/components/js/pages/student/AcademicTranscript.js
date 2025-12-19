import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../endpoints';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/student/academic-transcript.css';
import ActivityDetailModal from '../../ActivityDetailModal';

export default function AcademicTranscript({ studentId, studentSubjects }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showGPAModal, setShowGPAModal] = useState(false);
  const [selectedActivityData, setSelectedActivityData] = useState(null);
  const [gradesAnnounced, setGradesAnnounced] = useState(true);
  const [gradeAnnouncementDate, setGradeAnnouncementDate] = useState(null);
  const [countdown, setCountdown] = useState('');
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
              isActivity: false
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

        // Debugging info (can be removed later) to verify processed grades
        // console.debug('processedGrades:', processedGrades, { regularSubjectsCount, activitySubjectsCount, totalScore, totalMaxScore });

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

  // Check grade announcement date
  useEffect(() => {
    const checkGradeAnnouncement = async () => {
      if (!studentId) return;
      try {
        const token = localStorage.getItem('token');
        // Get school_id from localStorage or try to fetch it
        let schoolId = localStorage.getItem('school_id');
        if (!schoolId) {
          // Try to fetch from user data if needed
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

  // ระบบเกรด: A+, A, B+, B, C+, C, D+, D, F
  const getLetterGrade = (percentage) => {
    percentage = parseFloat(percentage);
    
    // Updated thresholds:
    // A+ 95 - 100
    // A  80 - 94
    // B+ 75 - 79
    // B  70 - 74
    // C+ 65 - 69
    // C  60 - 64
    // D+ 55 - 59
    // D  50 - 54
    // F  < 50
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

  // คำนวณ GPA (มาตรฐาน 4.0)
  const calculateGPA = (subjectDataArray) => {
    if (!Array.isArray(subjectDataArray) || subjectDataArray.length === 0) return 0;

    // Consider only non-activity subjects that have grades and a valid max score
    // We must exclude activity subjects from GPA calculation (pass/fail, not credit-bearing)
    // Consider non-activity subjects that have a valid totalMaxScore (>0)
    // Allow calculation even if individual assignment `grades` array is not populated
    // include regular subjects if they have a totalMaxScore or a pre-computed scorePercentage
    const graded = subjectDataArray.filter(s => {
      if (s.isActivity) return false;
      const hasTotalMax = Number(s.totalMaxScore) > 0;
      const hasNormalized = s.scorePercentage !== undefined && s.scorePercentage !== null && String(s.scorePercentage).trim() !== '';
      return hasTotalMax || hasNormalized;
    });
    if (graded.length === 0) return 0;

    // Try to fetch credit value from the subject metadata (common field names),
    // fall back to 1 if not provided. Then compute weighted GPA: sum(gpa*credit)/sum(credit).
    let totalWeighted = 0;
    let totalCredits = 0;

    graded.forEach(s => {
      const hasNormalized = s.scorePercentage !== undefined && s.scorePercentage !== null && String(s.scorePercentage).trim() !== '';
      const percentage = hasNormalized ? Number(s.scorePercentage) : (Number(s.totalMaxScore) > 0 ? (Number(s.totalScore) / Number(s.totalMaxScore)) * 100 : 0);
      const gpaValue = getLetterGrade(percentage).gpaValue;

      const subj = s.subject || {};
      // common credit field names: credits, credit, unit, weight
      let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? s.credits ?? s.credit ?? 1);
      if (!isFinite(credit) || credit <= 0) credit = 1;

      totalWeighted += gpaValue * credit;
      totalCredits += credit;
    });

    if (totalCredits === 0) return 0;
    return Number((totalWeighted / totalCredits).toFixed(2));
  };

  // คำอธิบายเกรด
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
    return <div className="transcript-loading">⏳ กำลังโหลดข้อมูลการเรียน...</div>;
  }

  // If grades are not announced yet, hide full transcript and show announcement message
  if (!gradesAnnounced) {
    return (
      <div className="academic-transcript-container">
        <ToastContainer />
        {/* ส่วนหัว */}
        <div className="transcript-header">
          <div className="transcript-header-content">
            <h2>📊 ใบแสดงผลการเรียน</h2>
            <p className="transcript-subtitle">ข้อมูลคะแนนและผลการเรียนของคุณ</p>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div className="alert-box" style={{
            padding: '1.5rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            color: '#856404'
          }}>
            <strong>🔔 ยังไม่ถึงเวลาประกาศผลคะแนน</strong><br/>
            ผลคะแนนจะเปิดดูได้ในวันที่: <strong>{gradeAnnouncementDate ? gradeAnnouncementDate.toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '-'}</strong>
            {countdown && (
              <div style={{ marginTop: 8, fontSize: '1.15rem', fontWeight: 600 }}>
                นับถอยหลัง: {countdown}
              </div>
            )}
          </div>
          <div className="empty-transcript">
            <div className="empty-icon">📭</div>
            <div className="empty-text">ข้อมูลใบแสดงผลจะปรากฏเมื่อครูประกาศผลคะแนนแล้ว</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="academic-transcript-container">
      {/* ส่วนหัว */}
      <div className="transcript-header">
        <div className="transcript-header-content">
          <h2>📊 ใบแสดงผลการเรียน</h2>
          <p className="transcript-subtitle">ข้อมูลคะแนนและผลการเรียนของคุณ</p>
        </div>
      </div>

      {/* บัตรสรุปข้อมูล */}
      <div className="transcript-summary-section">
        <div className="summary-card overall-score">
          <div className="summary-card-title">คะแนนรวม</div>
          <div className="summary-card-value">{transcriptSummary.scorePercentage}%</div>
          <div className="summary-card-detail">
            {transcriptSummary.totalScore} / {transcriptSummary.totalMaxScore} คะแนน
          </div>
          <div className="summary-card-grade">
            เกรด: <span style={{ color: getLetterGrade(transcriptSummary.scorePercentage).color }}>
              {getLetterGrade(transcriptSummary.scorePercentage).grade}
            </span>
          </div>
        </div>

        <div 
          className="summary-card gpa-card-button"
          onClick={() => setShowGPAModal(true)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && setShowGPAModal(true)}
        >
          <div className="summary-card-title">เกรดเฉลี่ย (GPA)</div>
          <div className="summary-card-value">{typeof transcriptSummary.gpa === 'number' ? transcriptSummary.gpa.toFixed(2) : transcriptSummary.gpa}</div>
          <div className="summary-card-detail">โครงการระดับ 4.0</div>
          <div className="summary-card-desc">
            {transcriptSummary.gpa >= 3.6 && '🌟 ยอดเยี่ยม'}
            {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && '⭐ ดี'}
            {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && '👍 พอใจ'}
            {transcriptSummary.gpa < 2.0 && '📚 พยายามเพิ่มเติม'}
          </div>
        </div>

        <div className="summary-card regular-card">
          <div className="summary-card-title">รายวิชา (ปกติ)</div>
          <div className="summary-card-value">{transcriptSummary.regularSubjectsCount}</div>
          <div className="summary-card-detail">หน่วยกิต/วิชาที่นับ GPA</div>
          <div className="summary-card-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${transcriptSummary.regularSubjectsCount > 0 ? (transcriptSummary.completedSubjects / transcriptSummary.regularSubjectsCount) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="summary-card activity-count-card">
          <div className="summary-card-title">รายวิชา (กิจกรรม)</div>
          <div className="summary-card-value">{transcriptSummary.activitySubjectsCount}</div>
          <div className="summary-card-detail">ประเมินแบบ ผ่าน/ไม่ผ่าน</div>
        </div>

        <div className="summary-card credits-card">
          <div className="summary-card-title">หน่วยกิตรวม</div>
          <div className="summary-card-value">{transcriptSummary.totalCredits}</div>
          <div className="summary-card-detail">หน่วยกิตรวมของวิชาที่บันทึกคะแนน</div>
        </div>

        <div className="summary-card legend-card">
          <div className="summary-card-title">เกรดตัวอักษร</div>
          <div className="grade-legend-compact">
            <div className="legend-summary">แสดงคำอธิบายเกรดแบบเต็ม</div>
            <button
              className="grade-legend-button"
              onClick={() => setShowGradeModal(true)}
              aria-haspopup="dialog"
            >
              คำอธิบายเกรด
            </button>
          </div>
        </div>
      </div>

      {/* ส่วนรายละเอียด - แสดงเป็นตารางแบบใบแสดงผล */}
      <div className="transcript-details-section">
        <div className="transcript-table-header">
          <h3 className="section-title">📚 รายละเอียดคะแนนแต่ละวิชา</h3>
          <div className="transcript-total-row">
            <span className="total-count">รวมทั้งสิ้น {grades.length} วิชา</span>
          </div>
        </div>

        {!gradesAnnounced && (
          <div className="alert-box" style={{
            padding: '1.5rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            color: '#856404'
          }}>
            <strong>🔔 ยังไม่ถึงเวลาประกาศผลคะแนน</strong><br/>
            ผลคะแนนจะเปิดดูได้ในวันที่: <strong>{gradeAnnouncementDate?.toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</strong>
          </div>
        )}

        {gradesAnnounced && grades.length === 0 ? (
          <div className="empty-transcript">
            <div className="empty-icon">📭</div>
            <div className="empty-text">ยังไม่มีข้อมูลคะแนน</div>
            <div className="empty-subtitle">รอดูคะแนนจากครูผู้สอน</div>
          </div>
        ) : (
          gradesAnnounced && (
          <table className="transcript-table">
            <thead>
              <tr>
                <th className="col-subject">รายวิชา</th>
                <th className="col-type">ประเภท</th>
                <th className="col-score">คะแนนสอบ</th>
                <th className="col-grade">เกรด</th>
                <th className="col-credits">หน่วยกิต</th>
                <th className="col-gpa">GPA</th>
                <th className="col-action">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(subjectData => {
                const letterGrade = getLetterGrade(subjectData.scorePercentage);
                const subj = subjectData.subject || {};
                let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? subjectData.credits ?? subjectData.credit ?? 1);
                if (!isFinite(credit) || credit <= 0) credit = 1;
                
                const tableKey = subjectData.isActivity ? 'activity' : subjectData.subject.id;
                
                return (
                  <tr key={tableKey} className={`transcript-row ${subjectData.isActivity ? 'activity-row' : ''}`}>
                    <td className="col-subject">
                      <div className="subject-cell-content">
                        <span className="subject-icon">{subjectData.isActivity ? '🎯' : '📖'}</span>
                        <span className="subject-cell-text">{subjectData.subject.name}</span>
                      </div>
                    </td>
                    <td className="col-type">
                      <span className="type-badge">
                        {subjectData.isActivity ? 'กิจกรรม' : 'ปกติ'}
                      </span>
                    </td>
                    <td className="col-score">
                      <div className="score-cell">
                        <span className="score-value">{subjectData.scorePercentage}</span>
                        <span className="score-unit">%</span>
                      </div>
                    </td>
                    <td className="col-grade">
                      {subjectData.isActivity ? (
                        (() => {
                          const pass = Number(subjectData.scorePercentage) >= 50;
                          return (
                            <span className={`pass-badge ${pass ? 'pass' : 'fail'}`}>
                              {pass ? 'ผ่าน' : 'ไม่ผ่าน'}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="grade-badge-table" style={{ backgroundColor: letterGrade.color }}>
                          {letterGrade.grade}
                        </span>
                      )}
                    </td>
                    <td className="col-credits">
                      {subjectData.isActivity ? (
                        <span className="credit-value">—</span>
                      ) : (
                        <span className="credit-value">{credit}</span>
                      )}
                    </td>
                    <td className="col-gpa">
                      {subjectData.isActivity ? (
                        <span className="gpa-na">—</span>
                      ) : (
                        <span className="gpa-value-table">{letterGrade.gpaValue.toFixed(1)}</span>
                      )}
                    </td>
                    <td className="col-action">
                      {subjectData.isActivity ? (
                        <button 
                          className="btn-details-icon"
                          onClick={() => {
                            setSelectedActivityData({
                              activity_subjects: subjectData.activityBreakdown,
                              total_activity_score: subjectData.totalScore,
                              total_activity_percent: subjectData.totalActivityPercent
                            });
                            setShowActivityModal(true);
                          }}
                          title="ดูรายละเอียดกิจกรรม"
                        >
                          📊
                        </button>
                      ) : (
                        <button 
                          className="btn-details-icon"
                          onClick={() => {
                            setExpandedSubject(expandedSubject === tableKey ? null : tableKey);
                          }}
                          title="ดูรายละเอียด"
                        >
                          ℹ️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )
        )}
      </div>

      {/* หมายเหตุท้าย */}
      <div className="transcript-footer">
        <div className="footer-note">
          <span className="note-icon">ℹ️</span>
          <span className="note-text">ใบแสดงผลการเรียนนี้แสดงคะแนนล่าสุดจากระบบ เป็นอิงตามข้อมูลที่ครูผู้สอนบันทึกไว้</span>
        </div>
      </div>

      {showGradeModal && (
        <div
          className="grade-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGradeModal(false)}
        >
          <div className="grade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="grade-modal-header">
              <h4>คำอธิบายเกรด</h4>
              <button
                className="grade-modal-close"
                aria-label="ปิด"
                onClick={() => setShowGradeModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="grade-modal-body">
              <table className="grade-legend-table" role="table">
                <thead>
                  <tr>
                    <th>เกรด</th>
                    <th>เปอร์เซ็นต์</th>
                    <th>คำอธิบาย</th>
                    <th>GPA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="grade-legend-badge Aplus">A+</span></td>
                    <td>95 - 100%</td>
                    <td>ดีเยี่ยม — ผลการเรียนยอดเยี่ยมทุกด้าน</td>
                    <td>4.0</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge A">A</span></td>
                    <td>80 - 94%</td>
                    <td>ดีมาก — ทำงานครบถ้วน มีความเข้าใจดี</td>
                    <td>4.0</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge Bplus">B+</span></td>
                    <td>75 - 79%</td>
                    <td>ดี — ผลการเรียนดี มีจุดที่พัฒนาได้</td>
                    <td>3.5</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge B">B</span></td>
                    <td>70 - 74%</td>
                    <td>ดี — ทำได้ตามมาตรฐาน ส่วนบางเรื่องต้องปรับ</td>
                    <td>3.0</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge Cplus">C+</span></td>
                    <td>65 - 69%</td>
                    <td>พอใจ — ทำได้พอประมาณ ต้องพัฒนาทักษะเพิ่ม</td>
                    <td>2.5</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge C">C</span></td>
                    <td>60 - 64%</td>
                    <td>พอใช้ — ผลการเรียนอยู่ระดับพื้นฐาน</td>
                    <td>2.0</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge Dplus">D+</span></td>
                    <td>55 - 59%</td>
                    <td>ผ่าน — พื้นฐานอ่อน ต้องฝึกฝนเพิ่มเติม</td>
                    <td>1.5</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge D">D</span></td>
                    <td>50 - 54%</td>
                    <td>ผ่านต่ำ — ต้องได้รับการดูแลและติดตาม</td>
                    <td>1.0</td>
                  </tr>
                  <tr>
                    <td><span className="grade-legend-badge F">F</span></td>
                    <td>&lt; 50%</td>
                    <td>ไม่ผ่าน — ต้องเรียนซ่อม/ปรับปรุงอย่างเร่งด่วน</td>
                    <td>0</td>
                  </tr>
                </tbody>
              </table>

              <div className="grade-modal-notes">
                <p><strong>หมายเหตุ:</strong> ระบบนี้รองรับการเพิ่มเครื่องหมาย "+" และค่า GPA ขั้นครึ่ง (เช่น B+ = 3.5) ยกเว้นกรณีคะแนนรวมที่ให้ค่า GPA เป็น 0 หรือ 4 ซึ่งจะไม่มีการใส่ +/-. หากต้องการรายละเอียดเพิ่มเติมเกี่ยวกับวิธีคำนวณ ให้ติดต่อครูผู้สอนหรือผู้ดูแลระบบ</p>
                <p><strong>วิธีคำนวณ GPA:</strong> ระบบจะคำนวณค่า GPA โดยคูณค่า GPA ของแต่ละวิชาด้วยหน่วยกิต (credit) ของวิชานั้น หากข้อมูลหน่วยกิตมีอยู่ (เช่น `subject.credits` หรือ `subject.credit`) แล้วนำมาหารด้วยผลรวมของหน่วยกิตทั้งหมด (weighted average). หากไม่มีข้อมูลหน่วยกิต ระบบจะใช้การเฉลี่ยน้ำหนักเท่ากัน (average แบบ simple).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ActivityDetailModal
        isOpen={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setSelectedActivityData(null);
        }}
        activityData={selectedActivityData}
        studentName={studentId}
      />

      {/* GPA Information Modal */}
      {showGPAModal && (
        <div
          className="grade-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGPAModal(false)}
        >
          <div className="grade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="grade-modal-header">
              <h4>📊 ข้อมูลเกรดเฉลี่ย (GPA)</h4>
              <button
                className="grade-modal-close"
                aria-label="ปิด"
                onClick={() => setShowGPAModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="grade-modal-body">
              <div className="gpa-info-section">
                <h5>GPA ของคุณ</h5>
                <div className="gpa-display-large">
                  <span className="gpa-value-modal">{typeof transcriptSummary.gpa === 'number' ? transcriptSummary.gpa.toFixed(2) : transcriptSummary.gpa}</span>
                  <span className="gpa-max">/ 4.0</span>
                </div>
                <p className="gpa-rating">
                  {transcriptSummary.gpa >= 3.6 && '🌟 ยอดเยี่ยม - ผลการเรียนสูงมาก'}
                  {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && '⭐ ดี - ผลการเรียนดี'}
                  {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && '👍 พอใจ - ผลการเรียนปานกลาง'}
                  {transcriptSummary.gpa < 2.0 && '📚 ต้องพยายามมากขึ้น'}
                </p>
              </div>

              <div className="gpa-notes-section">
                <h5>📌 หมายเหตุสำคัญ</h5>
                <ul className="gpa-notes-list">
                  <li>คะแนนกิจกรรม <strong>ไม่ได้นำมาคำนวณใน GPA</strong> เนื่องจากเป็นการประเมินแบบ ผ่าน/ไม่ผ่าน</li>
                  <li>GPA คำนวณจากวิชาปกติ (รายวิชา) เท่านั้น</li>
                  <li>วิธีการคำนวณคือ <strong>weighted average</strong>: (ผลรวมของ GPA × หน่วยกิต) ÷ (ผลรวมหน่วยกิตทั้งหมด)</li>
                  <li>ระบบจะใช้ค่าหน่วยกิตที่แอดมินกำหนดในแต่ละวิชา</li>
                </ul>
              </div>

              {/* removed example calculation section as requested */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

