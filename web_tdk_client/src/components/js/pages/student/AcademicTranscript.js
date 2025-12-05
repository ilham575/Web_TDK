import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';
import '../../../css/pages/student/academic-transcript.css';

export default function AcademicTranscript({ studentId, studentSubjects }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [transcriptSummary, setTranscriptSummary] = useState({
    totalSubjects: 0,
    totalScore: 0,
    totalMaxScore: 0,
    totalCredits: 0,
    gpa: 0,
    scorePercentage: 0,
    completedSubjects: 0
  });

  // โหลดเกรดของนักเรียนจากทุกวิชา
  useEffect(() => {
    if (!studentId || !studentSubjects.length) {
      setLoading(false);
      return;
    }

    const loadGrades = async () => {
      try {
        const token = localStorage.getItem('token');
        // Request grades for each subject, include `student_id` so server returns only this student's records
        const gradePromises = studentSubjects.map(subject =>
          fetch(`${API_BASE_URL}/grades?subject_id=${subject.id}&student_id=${studentId}`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          }).then(res => res.json())
        );

        const allGradesArrays = await Promise.all(gradePromises);
        const allGrades = allGradesArrays.flat();

        // จัดกลุ่มเกรดตามวิชา
        const gradesBySubject = {};
        studentSubjects.forEach(subject => {
          // Ensure we only keep grades for this student. Some APIs return grades for all students
          // when queried by subject; include common student id fields as fallback filter.
          gradesBySubject[subject.id] = {
            subject: subject,
            grades: allGrades.filter(g => g.subject_id === subject.id && (
              g.student_id === studentId || g.user_id === studentId || g.userId === studentId
            )),
            totalScore: 0,
            totalMaxScore: 0,
            scorePercentage: 0
          };
        });

        // คำนวณคะแนนแต่ละวิชา
        Object.values(gradesBySubject).forEach(subjectData => {
          if (subjectData.grades.length > 0) {
            // รวมคะแนนจากงานที่ชื่อเดียวกัน (เอาเพียงชุดแรก)
            const gradesByTitle = {};
            subjectData.grades.forEach(g => {
              const title = g.title || 'no-title';
              if (!gradesByTitle[title]) {
                gradesByTitle[title] = { score: 0, maxScore: 0, count: 0 };
              }
              gradesByTitle[title].score += (g.grade || 0);
              gradesByTitle[title].maxScore += (g.max_score || 0);
              gradesByTitle[title].count++;
            });
            
            // เอาเฉพาะชุดแรก (งานชื่อแรกที่พบ)
            const firstTitle = Object.keys(gradesByTitle)[0];
            if (firstTitle) {
              subjectData.totalScore = gradesByTitle[firstTitle].score;
              subjectData.totalMaxScore = gradesByTitle[firstTitle].maxScore;
            }
            
            if (subjectData.totalMaxScore > 0) {
              subjectData.scorePercentage = ((subjectData.totalScore / subjectData.totalMaxScore) * 100).toFixed(2);
            }
          }
        });

        setGrades(Object.values(gradesBySubject));

        // คำนวณสรุปสถิติรวม (จากงานแรกเท่านั้น)
        let totalScore = 0;
        let totalMaxScore = 0;
        let completedSubjects = 0;
        let totalCredits = 0;

        Object.values(gradesBySubject).forEach(subjectData => {
          if (subjectData.grades.length > 0) {
            totalScore += subjectData.totalScore;
            totalMaxScore += subjectData.totalMaxScore;
            completedSubjects++;
            // accumulate credits if available (fall back to 1)
            const subj = subjectData.subject || {};
            let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? subjectData.credits ?? subjectData.credit ?? 1);
            if (!isFinite(credit) || credit <= 0) credit = 1;
            totalCredits += credit;
          }
        });

        const overallPercentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0;
        const gpa = calculateGPA(Object.values(gradesBySubject));

        setTranscriptSummary({
          totalSubjects: studentSubjects.length,
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
  }, [studentId, studentSubjects]);

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

    // Consider only subjects that have grades and a valid max score
    const graded = subjectDataArray.filter(s => s.grades.length > 0 && s.totalMaxScore > 0);
    if (graded.length === 0) return 0;

    // Try to fetch credit value from the subject metadata (common field names),
    // fall back to 1 if not provided. Then compute weighted GPA: sum(gpa*credit)/sum(credit).
    let totalWeighted = 0;
    let totalCredits = 0;

    graded.forEach(s => {
      const percentage = (s.totalScore / s.totalMaxScore) * 100;
      const gpaValue = getLetterGrade(percentage).gpaValue;

      const subj = s.subject || {};
      // common credit field names: credits, credit, unit, weight
      let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? s.credits ?? s.credit ?? 1);
      if (!isFinite(credit) || credit <= 0) credit = 1;

      totalWeighted += gpaValue * credit;
      totalCredits += credit;
    });

    if (totalCredits === 0) return 0;
    return (totalWeighted / totalCredits).toFixed(2);
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

        <div className="summary-card gpa-card">
          <div className="summary-card-title">เกรดเฉลี่ย (GPA)</div>
          <div className="summary-card-value">{transcriptSummary.gpa}</div>
          <div className="summary-card-detail">โครงการระดับ 4.0</div>
          <div className="summary-card-desc">
            {transcriptSummary.gpa >= 3.6 && '🌟 ยอดเยี่ยม'}
            {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && '⭐ ดี'}
            {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && '👍 พอใจ'}
            {transcriptSummary.gpa < 2.0 && '📚 พยายามเพิ่มเติม'}
          </div>
        </div>

        <div className="summary-card subjects-card">
          <div className="summary-card-title">รายวิชา</div>
          <div className="summary-card-value">{transcriptSummary.completedSubjects}</div>
          <div className="summary-card-detail">จาก {transcriptSummary.totalSubjects} วิชา</div>
          <div className="summary-card-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(transcriptSummary.completedSubjects / transcriptSummary.totalSubjects) * 100}%` }}
              ></div>
            </div>
          </div>
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

      {/* ส่วนรายละเอียด */}
      <div className="transcript-details-section">
        <h3 className="section-title">📚 รายละเอียดคะแนนแต่ละวิชา</h3>

        {grades.length === 0 ? (
          <div className="empty-transcript">
            <div className="empty-icon">📭</div>
            <div className="empty-text">ยังไม่มีข้อมูลคะแนน</div>
            <div className="empty-subtitle">รอดูคะแนนจากครูผู้สอน</div>
          </div>
        ) : (
          <div className="subjects-list">
            {grades.map(subjectData => {
                const letterGrade = getLetterGrade(subjectData.scorePercentage);
                const subj = subjectData.subject || {};
                let credit = Number(subj.credits ?? subj.credit ?? subj.unit ?? subj.weight ?? subjectData.credits ?? subjectData.credit ?? 1);
                if (!isFinite(credit) || credit <= 0) credit = 1;
              return (
                <div key={subjectData.subject.id} className="subject-card">
                  <div 
                    className="subject-card-header"
                    onClick={() => setExpandedSubject(
                      expandedSubject === subjectData.subject.id ? null : subjectData.subject.id
                    )}
                  >
                    <div className="subject-card-title-section">
                      <h4 className="subject-name">{subjectData.subject.name}</h4>
                    </div>
                    <div className="subject-card-score-section">
                      <div className="score-display">
                        <div className="score-percentage">{subjectData.scorePercentage}%</div>
                        <div 
                          className="grade-badge" 
                          style={{ backgroundColor: letterGrade.color }}
                        >
                          {letterGrade.grade}
                        </div>
                      </div>
                      <div className="expand-icon">
                        {expandedSubject === subjectData.subject.id ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>

                  {expandedSubject === subjectData.subject.id && (
                    <div className="subject-card-body">
                      <div className="subject-score-summary">
                        <div className="score-item">
                          <span className="score-label">คะแนนรวม</span>
                          <span className="score-value">{subjectData.totalScore} / {subjectData.totalMaxScore}</span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">เปอร์เซ็นต์</span>
                          <span className="score-value">{subjectData.scorePercentage}%</span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">จำนวนงาน</span>
                          <span className="score-value">{subjectData.grades.length} งาน</span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">เกรด GPA</span>
                          <span className="score-value" style={{ color: letterGrade.color }}>
                            {letterGrade.gpaValue.toFixed(1)}
                          </span>
                        </div>
                        <div className="score-item">
                          <span className="score-label">หน่วยกิต</span>
                          <span className="score-value">{credit}</span>
                        </div>
                      </div>

                      {subjectData.grades.length > 0 && (
                        <div className="subject-assignments">
                          <h5 className="assignments-title">📋 คะแนนรวมทั้งหมด</h5>
                          <div className="total-score-display">
                            <span className="total-label">รวมคะแนนทั้งหมด:</span>
                            <span className="total-value">{subjectData.totalScore} / {subjectData.totalMaxScore} คะแนน</span>
                          </div>
                        </div>
                      )}

                      <div className="subject-progress-bar">
                        <div className="progress-label">ความก้าวหน้า</div>
                        <div className="progress-container">
                          <div className="progress-track">
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${subjectData.scorePercentage}%`,
                                backgroundColor: letterGrade.color
                              }}
                            ></div>
                          </div>
                          <span className="progress-value">{subjectData.scorePercentage}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                    <td>A+</td>
                    <td>95 - 100%</td>
                    <td>ดีเยี่ยม — ผลการเรียนยอดเยี่ยมทุกด้าน</td>
                    <td>4.0</td>
                  </tr>
                  <tr>
                    <td>A</td>
                    <td>80 - 94%</td>
                    <td>ดีมาก — ทำงานครบถ้วน มีความเข้าใจดี</td>
                    <td>4.0</td>
                  </tr>
                  <tr>
                    <td>B+</td>
                    <td>75 - 79%</td>
                    <td>ดี — ผลการเรียนดี มีจุดที่พัฒนาได้</td>
                    <td>3.5</td>
                  </tr>
                  <tr>
                    <td>B</td>
                    <td>70 - 74%</td>
                    <td>ดี — ทำได้ตามมาตรฐาน ส่วนบางเรื่องต้องปรับ</td>
                    <td>3.0</td>
                  </tr>
                  <tr>
                    <td>C+</td>
                    <td>65 - 69%</td>
                    <td>พอใจ — ทำได้พอประมาณ ต้องพัฒนาทักษะเพิ่ม</td>
                    <td>2.5</td>
                  </tr>
                  <tr>
                    <td>C</td>
                    <td>60 - 64%</td>
                    <td>พอใช้ — ผลการเรียนอยู่ระดับพื้นฐาน</td>
                    <td>2.0</td>
                  </tr>
                  <tr>
                    <td>D+</td>
                    <td>55 - 59%</td>
                    <td>ผ่าน — พื้นฐานอ่อน ต้องฝึกฝนเพิ่มเติม</td>
                    <td>1.5</td>
                  </tr>
                  <tr>
                    <td>D</td>
                    <td>50 - 54%</td>
                    <td>ผ่านต่ำ — ต้องได้รับการดูแลและติดตาม</td>
                    <td>1.0</td>
                  </tr>
                  <tr>
                    <td>F</td>
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
    </div>
  );
}
