import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../../endpoints';
import { toast } from 'react-toastify';
import ActivityDetailModal from '../../ActivityDetailModal';
import { hasSessionMarker } from '../../../../utils/authUtils';
import { 
  Award, 
  BookOpen, 
  GraduationCap, 
  Activity, 
  Clock, 
  Info, 
  X, 
  Expand, 
  Minimize,
  Trophy,
  Target,
  BarChart2,
  Calendar,
  ChevronDown
} from 'lucide-react';

export default function AcademicTranscript({ studentId, studentSubjects, onGradesNotAnnounced }) {
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
  const [rankingInfo, setRankingInfo] = useState(null); 
  const [schoolRankingInfo, setSchoolRankingInfo] = useState(null); 
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

  const [availableSemesters, setAvailableSemesters] = useState([]);  
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [academicYearInitialized, setAcademicYearInitialized] = useState(false);          
  const rankingRequestRef = useRef(0);

  const getSemestersForYear = (academicYear) => {
    if (!academicYear) return [];

    const merged = new Map();
    availableSemesters
      .filter(s => String(s.academic_year) === String(academicYear))
      .forEach(s => {
        const sem = Number(s.semester);
        if (!Number.isFinite(sem)) return;

        const allowGrades = s.allow_student_view_grades !== false;
        const allowRanking = s.allow_student_view_ranking === true;
        const existing = merged.get(sem);
        if (!existing) {
          merged.set(sem, {
            semester: sem,
            allow_student_view_grades: allowGrades,
            allow_student_view_ranking: allowRanking
          });
        } else {
          merged.set(sem, {
            semester: sem,
            allow_student_view_grades: existing.allow_student_view_grades && allowGrades,
            allow_student_view_ranking: existing.allow_student_view_ranking && allowRanking
          });
        }
      });

    return Array.from(merged.values()).sort((a, b) => a.semester - b.semester);
  };

  const selectedYearSemesters = getSemestersForYear(selectedAcademicYear);
  const selectedYearAllowedSemesters = selectedYearSemesters.filter(s => s.allow_student_view_grades);
  const canShowCombinedOption = selectedYearAllowedSemesters.length >= 2;
  const selectedSemesterNumber = Number(selectedSemester);
  const selectedSemesterMeta = selectedYearSemesters.find(s => s.semester === selectedSemesterNumber);
  const isSelectedPeriodRankingVisible = selectedSemester
    ? Boolean(selectedSemesterMeta?.allow_student_view_ranking)
    : canShowCombinedOption
      && selectedYearAllowedSemesters.length > 0
      && selectedYearAllowedSemesters.every(s => s.allow_student_view_ranking);

  const allAcademicYears = [...new Set(availableSemesters.map(s => s.academic_year))].sort((a, b) => b - a);
  const allowedAcademicYears = [...new Set(
    availableSemesters
      .filter(s => s.allow_student_view_grades !== false)
      .map(s => s.academic_year)
  )].sort((a, b) => b - a);
  const visibleAcademicYears = allowedAcademicYears.length > 0 ? allowedAcademicYears : allAcademicYears;

  useEffect(() => {
    if (!selectedAcademicYear) return;

    if (!selectedSemester) {
      if (!canShowCombinedOption) {
        const firstAllowedSemester = selectedYearAllowedSemesters[0];
        if (firstAllowedSemester) {
          setSelectedSemester(String(firstAllowedSemester.semester));
        }
      }
      return;
    }

    const selectedSemesterNumber = Number(selectedSemester);
    const selectedSemesterMeta = selectedYearSemesters.find(s => s.semester === selectedSemesterNumber);
    if (!selectedSemesterMeta || !selectedSemesterMeta.allow_student_view_grades) {
      const firstAllowedSemester = selectedYearAllowedSemesters[0];
      if (firstAllowedSemester) {
        setSelectedSemester(String(firstAllowedSemester.semester));
      } else {
        setSelectedSemester('');
      }
    }
  }, [selectedAcademicYear, selectedSemester, selectedYearSemesters, selectedYearAllowedSemesters, canShowCombinedOption]);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    // Wait until semester permissions are loaded so we don't request a blocked default period.
    if (!academicYearInitialized) {
      return;
    }

    if (availableSemesters.length > 0) {
      if (!selectedAcademicYear) {
        return;
      }

      const yearSemesters = getSemestersForYear(selectedAcademicYear);
      const allowedYearSemesters = yearSemesters.filter(s => s.allow_student_view_grades);
      const combinedAllowed = allowedYearSemesters.length >= 2;

      if (!selectedSemester && !combinedAllowed) {
        // Auto-selection effect will choose a concrete allowed semester shortly.
        return;
      }
    }

    const loadGrades = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
          const transcriptRes = await fetch(`${API_BASE_URL}/grades/student/${studentId}/transcript${queryStr}`);

        if (!transcriptRes.ok) {
          if (transcriptRes.status === 403) {
            const errorData = await transcriptRes.json();
            const errorMsg = errorData.detail;
            if (errorMsg && errorMsg.includes('ยังไม่เปิดให้เข้าดูผลการเรียน')) {
              toast.warning(errorMsg);
              const hasAnyAllowedSemester = availableSemesters.some(s => s.allow_student_view_grades !== false);
              if (onGradesNotAnnounced && !hasAnyAllowedSemester) {
                onGradesNotAnnounced();
              }
              setLoading(false);
              return;
            }
          }
          throw new Error('Failed to load transcript');
        }

        const transcriptData = await transcriptRes.json();

        const processedGrades = transcriptData.map(entry => {
          if (entry.subject_type === 'activity') {
            // Merge activity subjects with the same name (can occur when showing merged 2-semester view)
            const rawBreakdown = entry.breakdown || [];
            const groupedByName = {};
            rawBreakdown.forEach(activity => {
              const name = activity.subject_name;
              if (!groupedByName[name]) groupedByName[name] = [];
              groupedByName[name].push(activity);
            });

            const mergedBreakdown = Object.entries(groupedByName).map(([name, items]) => {
              if (items.length === 1) return items[0];
              // When merging from multiple semesters, sum raw scores and max scores, then recalculate percentage
              const totalRawScore = items.reduce((sum, s) => sum + (s.raw_score || 0), 0);
              const totalMaxScore = items.reduce((sum, s) => sum + (s.max_score || 0), 0);
              const mergedNormalized = totalMaxScore > 0 ? Number(((totalRawScore / totalMaxScore) * 100).toFixed(2)) : 0;
              const percentage = Math.max(...items.map(s => s.percentage || 0));
              const mergedContribution = Number(((mergedNormalized * percentage) / 100).toFixed(2));
              return {
                ...items[0],
                subject_name: name,
                raw_score: totalRawScore,
                max_score: totalMaxScore,
                normalized_score: mergedNormalized,
                contribution: mergedContribution,
                percentage: percentage,
                _isMerged: true,
                _mergedCount: items.length
              };
            });

            const mergedTotal = Math.min(mergedBreakdown.reduce((sum, s) => sum + (s.contribution || 0), 0), 100);
            const mergedPercent = mergedBreakdown.reduce((sum, s) => sum + (s.percentage || 0), 0);

            return {
              subject: { 
                id: null,
                name: 'กิจกรรม (Activity)',
                subject_type: 'activity'
              },
              grades: mergedBreakdown,
              totalScore: Number(mergedTotal.toFixed(2)),
              totalMaxScore: 100,
              scorePercentage: Number(mergedTotal.toFixed(2)),
              isActivity: true,
              activityBreakdown: mergedBreakdown,
              totalActivityPercent: Number(mergedPercent.toFixed(2))
            };
          } else {
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

        // Group subjects by NAME to merge duplicate subjects across semesters
        // (using name instead of id because subject_id may differ between semesters)
        const groupedBySubjectName = {};
        processedGrades.forEach(grade => {
          if (grade.isActivity) return; // Activities are not grouped
          const subjectName = grade.subject.name;
          if (!groupedBySubjectName[subjectName]) {
            groupedBySubjectName[subjectName] = [];
          }
          groupedBySubjectName[subjectName].push(grade);
        });

        // Merge duplicate subjects and average their scores
        const mergedGrades = Object.values(groupedBySubjectName).map(subjectGroup => {
          if (subjectGroup.length === 1) {
            return subjectGroup[0];
          }
          // Multiple entries for same subject (different semesters) - merge them
          const firstGrade = subjectGroup[0];
          const avgPercentage = Number((subjectGroup.reduce((sum, g) => sum + Number(g.scorePercentage || 0), 0) / subjectGroup.length).toFixed(2));
          return {
            ...firstGrade,
            scorePercentage: avgPercentage,
            _isMerged: true,
            _mergedCount: subjectGroup.length
          };
        });

        // Add activity grades
        const allGrades = [...mergedGrades, ...processedGrades.filter(g => g.isActivity)];

        setGrades(allGrades);

        let totalScore = 0;
        let totalMaxScore = 0;
        let completedSubjects = 0;
        let totalCredits = 0;
        let regularSubjectsCount = 0;
        let activitySubjectsCount = 0;

        allGrades.forEach(gradeData => {
          if (gradeData.isActivity) {
            activitySubjectsCount++;
            completedSubjects++;
            totalScore += Number(gradeData.totalScore) || 0;
            totalMaxScore += Number(gradeData.totalMaxScore) || 0;
            return;
          }

          const hasTotalMax = Number(gradeData.totalMaxScore) > 0;
          const hasNormalized = gradeData.scorePercentage !== undefined && gradeData.scorePercentage !== null && String(gradeData.scorePercentage).trim() !== '';
          if (!hasTotalMax && !hasNormalized) return; 

          regularSubjectsCount++;
          completedSubjects++;

          if (hasTotalMax) {
            totalScore += Number(gradeData.totalScore) || 0;
            totalMaxScore += Number(gradeData.totalMaxScore) || 0;
          } else if (hasNormalized) {
            totalScore += Number(gradeData.scorePercentage) || 0;
            totalMaxScore += 100;
          }

          const credit = gradeData.subject?.credits || 1;
          totalCredits += credit;
        });

        const overallPercentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0;
        const gpa = calculateGPA(allGrades);

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
  }, [studentId, academicYearInitialized, availableSemesters, selectedAcademicYear, selectedSemester]);

  useEffect(() => {
    if (!studentId) return;
    const loadSemesters = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/grades/student/${studentId}/semester-list`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAvailableSemesters(data);

            // Auto-select latest academic year/semester that student is allowed to view
            if (data.length > 0 && !academicYearInitialized) {
              const normalized = data.map(s => ({
                ...s,
                allow_student_view_grades: s.allow_student_view_grades !== false,
                allow_student_view_ranking: s.allow_student_view_ranking === true
              }));

              const allowedYears = [...new Set(
                normalized
                  .filter(s => s.allow_student_view_grades)
                  .map(s => s.academic_year)
              )].sort((a, b) => b - a);

              const allYears = [...new Set(normalized.map(s => s.academic_year))].sort((a, b) => b - a);
              const defaultYear = allowedYears[0] || allYears[0];

              if (defaultYear) {
                setSelectedAcademicYear(defaultYear);

                const allowedSemestersInYear = [...new Set(
                  normalized
                    .filter(s => String(s.academic_year) === String(defaultYear) && s.allow_student_view_grades)
                    .map(s => Number(s.semester))
                    .filter(v => Number.isFinite(v))
                )].sort((a, b) => a - b);

                if (allowedSemestersInYear.length === 1) {
                  setSelectedSemester(String(allowedSemestersInYear[0]));
                } else {
                  setSelectedSemester('');
                }
              }

              setAcademicYearInitialized(true);
            }
          }
        }
      } catch (err) {
      } finally {
        // Unblock transcript loading even when list is empty or request fails.
        setAcademicYearInitialized(true);
      }
    };
    loadSemesters();
  }, [studentId]);

  useEffect(() => {
    const loadRanking = async () => {
      if (!studentId || !gradesAnnounced || !isSelectedPeriodRankingVisible) {
        setRankingInfo(null);
        setSchoolRankingInfo(null);
        return;
      }

      const requestId = ++rankingRequestRef.current;
      
      try {
        const params = new URLSearchParams();
        if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
        if (selectedSemester) params.set('semester', selectedSemester);
        const queryStr = params.toString() ? `?${params.toString()}` : '';

        let schoolId = localStorage.getItem('school_id');
        
        if (!schoolId && hasSessionMarker()) {
          const userRes = await fetch(`${API_BASE_URL}/users/me`);
          if (userRes.ok) {
            const userData = await userRes.json();
            schoolId = userData.school_id;
          }
        }

        const classroomRes = await fetch(`${API_BASE_URL}/classrooms/my-classrooms`);

        if (classroomRes.ok) {
          const classrooms = await classroomRes.json();
          if (classrooms && classrooms.length > 0) {
            const normalizedYear = selectedAcademicYear ? String(selectedAcademicYear) : '';
            const normalizedSemester = selectedSemester ? Number(selectedSemester) : null;

            const matchesAcademicYear = (classroomYear, selectedYear) => {
              if (!selectedYear) return true;
              const cy = String(classroomYear ?? '').trim();
              const sy = String(selectedYear ?? '').trim();
              if (!cy || !sy) return false;
              if (cy === sy) return true;
              return cy.slice(-2) === sy.slice(-2);
            };

            const classroomsInYear = normalizedYear
              ? classrooms.filter(c => matchesAcademicYear(c.academic_year, normalizedYear))
              : classrooms;

            const classroomsInSemester = normalizedSemester
              ? classrooms.filter(c => Number(c.semester) === normalizedSemester)
              : classrooms;

            const classroomsInPeriod = normalizedSemester
              ? classroomsInYear.filter(c => Number(c.semester) === normalizedSemester)
              : classroomsInYear;

            const currentClassroom = classroomsInPeriod[0] || classroomsInSemester[0] || classroomsInYear[0] || classrooms[0];

              const rankingRes = await fetch(`${API_BASE_URL}/grades/classroom/${currentClassroom.id}/ranking${queryStr}`);
            
            if (rankingRes.ok) {
              const rankingData = await rankingRes.json();
              if (requestId !== rankingRequestRef.current) return;
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
              } else {
                setRankingInfo(null);
              }
            }
          }
        }

        if (schoolId) {
          const schoolRankingRes = await fetch(`${API_BASE_URL}/grades/school/${schoolId}/ranking${queryStr}`);
          
          if (schoolRankingRes.ok) {
            const schoolRankingData = await schoolRankingRes.json();
            if (requestId !== rankingRequestRef.current) return;
            const mySchoolRank = schoolRankingData.find(r => r.student_id === studentId);
            if (mySchoolRank) {
              setSchoolRankingInfo({
                rank: mySchoolRank.rank,
                total: schoolRankingData.length,
                totalScore: mySchoolRank.total_score,
                totalMaxScore: mySchoolRank.total_max_score,
                average: mySchoolRank.average_score
              });
            } else {
              setSchoolRankingInfo(null);
            }
          }
        }
      } catch (err) {
        if (requestId === rankingRequestRef.current) {
          console.error('Error loading ranking:', err);
        }
      }
    };
    
    if (gradesAnnounced) {
      loadRanking();
    }
  }, [studentId, gradesAnnounced, selectedAcademicYear, selectedSemester, isSelectedPeriodRankingVisible]);

  useEffect(() => {
    const checkGradeAnnouncement = async () => {
      if (!studentId) return;
      try {
        let schoolId = localStorage.getItem('school_id');
        if (!schoolId && hasSessionMarker()) {
          const userRes = await fetch(`${API_BASE_URL}/users/me`);
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
      }
    };
    checkGradeAnnouncement();
  }, [studentId]);

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
    if (percentage >= 95) return { grade: 'A+', baseGrade: 'A', gpaValue: 4.0, color: '#059669' };
    if (percentage >= 80) return { grade: 'A', baseGrade: 'A', gpaValue: 4.0, color: '#10b981' };
    if (percentage >= 75) return { grade: 'B+', baseGrade: 'B', gpaValue: 3.5, color: '#34d399' };
    if (percentage >= 70) return { grade: 'B', baseGrade: 'B', gpaValue: 3.0, color: '#6ee7b7' };
    if (percentage >= 65) return { grade: 'C+', baseGrade: 'C', gpaValue: 2.5, color: '#d97706' };
    if (percentage >= 60) return { grade: 'C', baseGrade: 'C', gpaValue: 2.0, color: '#f59e0b' };
    if (percentage >= 55) return { grade: 'D+', baseGrade: 'D', gpaValue: 1.5, color: '#f97316' };
    if (percentage >= 50) return { grade: 'D', baseGrade: 'D', gpaValue: 1.0, color: '#ea580c' };
    return { grade: 'F', baseGrade: 'F', gpaValue: 0, color: '#dc2626' };
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

  const gradeLegendItems = [
    { grade: 'A+', range: '95 - 100%', desc: 'ดีเยี่ยม (Excellent)', gpa: '4.0', sampleScore: 97 },
    { grade: 'A', range: '80 - 94%', desc: 'ดีมาก (Very Good)', gpa: '4.0', sampleScore: 85 },
    { grade: 'B+', range: '75 - 79%', desc: 'ดี (Good)', gpa: '3.5', sampleScore: 77 },
    { grade: 'B', range: '70 - 74%', desc: 'ค่อนข้างดี (Above Average)', gpa: '3.0', sampleScore: 72 },
    { grade: 'C+', range: '65 - 69%', desc: 'ปานกลาง (Average)', gpa: '2.5', sampleScore: 67 },
    { grade: 'C', range: '60 - 64%', desc: 'พอใช้ (Fair)', gpa: '2.0', sampleScore: 62 },
    { grade: 'D+', range: '55 - 59%', desc: 'ผ่าน (Pass)', gpa: '1.5', sampleScore: 57 },
    { grade: 'D', range: '50 - 54%', desc: 'ผ่านเกณฑ์ขั้นต่ำ (Poor)', gpa: '1.0', sampleScore: 52 },
    { grade: 'F', range: '< 50%', desc: 'ไม่ผ่าน (Fail)', gpa: '0.0', sampleScore: 40 }
  ];

  const transcriptGradeItems = grades.map((subjectData, index) => {
    const letterGrade = getLetterGrade(subjectData.scorePercentage);
    const isActivity = subjectData.isActivity;
    const credit = subjectData.subject?.credits || 1;
    const numericPercentage = Number(subjectData.scorePercentage);
    const roundedPercentage = Number.isFinite(numericPercentage) ? Math.round(numericPercentage) : 0;

    return {
      key: isActivity
        ? `activity-${subjectData.subject?.name || 'item'}-${index}`
        : subjectData.subject?.id || `subject-${subjectData.subject?.name || 'item'}-${index}`,
      subjectData,
      letterGrade,
      isActivity,
      credit,
      roundedPercentage,
      isPassingActivity: numericPercentage >= 50,
      scoreLabel: `${roundedPercentage}%`
    };
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold animate-pulse">กำลังโหลดข้อมูลการเรียน...</p>
      </div>
    );
  }

  if (!gradesAnnounced) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
               <GraduationCap className="w-6 h-6" />
            </div>
            <div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">ใบแสดงผลการเรียน</h3>
                 <p className="text-sm font-medium text-slate-400">ข้อมูลคะแนนและผลการเรียนของคุณ</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="mt-1 p-2 bg-amber-100 text-amber-600 rounded-full">
                    <Clock className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-lg font-black text-amber-800 mb-1">ยังไม่ถึงเวลาประกาศผลคะแนน</h4>
                    <p className="text-amber-700 font-medium mb-3">
                      ผลคะแนนจะเปิดดูได้ในวันที่: <br/>
                      <span className="font-bold text-amber-900 text-lg">
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
                      </span>
                    </p>
                    {countdown && (
                       <div className="inline-flex max-w-full items-center gap-2 px-4 py-2 bg-white/50 rounded-xl">
                         <span className="text-amber-800 font-black text-sm sm:text-lg break-words">
                           นับถอยหลัง: {countdown}
                         </span>
                      </div>
                    )}
                </div>
            </div>
          </div>

          <div className="text-center py-12">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart2 className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold text-lg">ข้อมูลใบแสดงผลจะปรากฏเมื่อครูประกาศผลคะแนนแล้ว</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-0 sm:px-2">
         <div className="flex items-center gap-3">
           <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                <GraduationCap className="w-8 h-8" />
             </div>
             <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">ใบแสดงผลการเรียน</h3>
                <p className="text-sm font-medium text-slate-400">ตรวจสอบคะแนน GPA และอันดับของคุณ</p>
             </div>
         </div>
         
         {/* Semester Filter */}
         {availableSemesters.length > 0 && (
            <div className="flex w-full flex-col items-stretch gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100/60 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:flex-none">
                    <select
                  className="w-full py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
                        value={selectedAcademicYear}
                        onChange={e => { setSelectedAcademicYear(e.target.value); setSelectedSemester(''); }}
                    >
                      {visibleAcademicYears.map(y => (
                        <option key={y} value={y}>ปี {y}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                
                {selectedAcademicYear && (
                    <div className="relative flex-1 sm:flex-none">
                        <select
                        className="w-full py-2 pl-4 pr-10 bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl text-slate-700 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
                            value={selectedSemester}
                            onChange={e => setSelectedSemester(e.target.value)}
                        >
                      {canShowCombinedOption && <option value="">รวม 2 ภาค</option>}
                          {selectedYearAllowedSemesters.map(({ semester }) => (
                        <option key={semester} value={semester}>ภาค {semester} เท่านั้น</option>
                      ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                )}

                {(selectedAcademicYear || selectedSemester) && (
                    <button
                        onClick={() => { setSelectedAcademicYear(''); setSelectedSemester(''); }}
                        className="flex h-10 items-center justify-center rounded-xl p-2 text-rose-500 hover:bg-rose-50 transition-all sm:h-auto"
                        title="ล้างตัวกรอง"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
         )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* GPA Card */}
          <div 
            onClick={() => setShowGPAModal(true)}
            className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-blue-600">
                <Award className="w-24 h-24" />
             </div>
             <div className="relative z-10">
               <div className="mb-4 flex items-center justify-between">
                 <div>
                   <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-2">เกรดเฉลี่ย (GPA)</p>
                   <div className="flex items-baseline gap-2">
                     <h2 className="text-5xl font-black tracking-tight text-slate-800">{typeof transcriptSummary.gpa === 'number' ? transcriptSummary.gpa.toFixed(2) : transcriptSummary.gpa}</h2>
                     <span className="text-slate-400 font-bold">/ 4.00</span>
                   </div>
                 </div>
                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                   <Award className="w-6 h-6" />
                 </div>
               </div>
               <div className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 w-fit px-3 py-1 rounded-full">
                 {transcriptSummary.gpa >= 3.0 ? <Trophy className="w-4 h-4 text-blue-600" /> : <BookOpen className="w-4 h-4 text-blue-600" />}
                 <span>
                    {transcriptSummary.gpa >= 3.6 && 'ยอดเยี่ยม'}
                    {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && 'ดีมาก'}
                    {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && 'พอใช้'}
                    {transcriptSummary.gpa < 2.0 && 'พยายามอีกนิด'}
                 </span>
               </div>
             </div>
          </div>

          {/* Regular Score Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative group overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <BarChart2 className="w-24 h-24 text-blue-600" />
             </div>
             <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">คะแนนรวมภาพรวม (รวมกิจกรรม)</p>
             <div className="flex items-center gap-3 mb-4">
                 <div className="text-3xl font-black text-blue-600">
                    {Math.round(transcriptSummary.scorePercentage)}%
                 </div>
                 <div 
                    className="px-2 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: getLetterGrade(transcriptSummary.scorePercentage).color }}
                  >
                    เกรด {getLetterGrade(transcriptSummary.scorePercentage).grade}
                  </div>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${transcriptSummary.scorePercentage}%` }}
                ></div>
             </div>
             <p className="text-xs text-slate-400 font-medium mt-2 text-right">
                {Math.round(transcriptSummary.totalScore)} / {Math.round(transcriptSummary.totalMaxScore)} คะแนน
             </p>
          </div>

          {/* Ranking Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-blue-50 to-transparent"></div>
                  <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">อันดับในห้องเรียน</p>
                       {!isSelectedPeriodRankingVisible ? (
                         <span className="text-slate-300 font-bold italic text-sm">ยังไม่ประกาศ</span>
                       ) : rankingInfo ? (
                         <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-blue-600">{rankingInfo.rank}</span>
                            <span className="text-xs font-bold text-slate-400">/{rankingInfo.total}</span>
                         </div>
                      ) : <span className="text-slate-300 font-bold italic text-sm">รอผล...</span>}
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Target className="w-5 h-5" />
                  </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-amber-50 to-transparent"></div>
                  <div>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">อันดับทั้งโรงเรียน</p>
                       {!isSelectedPeriodRankingVisible ? (
                         <span className="text-slate-300 font-bold italic text-sm">ยังไม่ประกาศ</span>
                       ) : schoolRankingInfo ? (
                         <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-amber-600">{schoolRankingInfo.rank}</span>
                            <span className="text-xs font-bold text-slate-400">/{schoolRankingInfo.total}</span>
                         </div>
                      ) : <span className="text-slate-300 font-bold italic text-sm">รอผล...</span>}
                  </div>
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                      <Trophy className="w-5 h-5" />
                  </div>
              </div>
          </div>
          
           {/* Summary Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600">
                <Activity className="w-32 h-32" />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase">วิชาเรียนทั้งหมด</span>
                  <span className="text-xl font-black text-slate-800">{transcriptSummary.totalSubjects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase">หน่วยกิตรวม</span>
                  <span className="text-xl font-black text-blue-600">{transcriptSummary.totalCredits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase">ผ่าน/ไม่ผ่าน</span>
                  <span className="text-xl font-black text-slate-800">{transcriptSummary.activitySubjectsCount}</span>
                </div>
              </div>
              <button 
               onClick={() => setShowGradeModal(true)}
               className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-700 transition-all flex items-center justify-center gap-2"
              >
               <Info className="w-3 h-3" /> ดูเกณฑ์การให้คะแนน
              </button>
            </div>
      </div>

      {/* Grades Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
             <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
             <BookOpen className="w-5 h-5 text-blue-500" />
                 รายละเอียดคะแนนรายวิชา
             </h4>
         </div>

         {grades.length === 0 ? (
             <div className="p-12 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <BookOpen className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-slate-400 font-bold">ไม่พบข้อมูลรายวิชา</p>
             </div>
         ) : (
             <>
               <div className="space-y-3 p-4 sm:p-6 lg:hidden">
                 {transcriptGradeItems.map(({ key, subjectData, letterGrade, isActivity, credit, scoreLabel, isPassingActivity }) => (
                   <div key={key} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                     <div className="flex items-start gap-3">
                       <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold flex-shrink-0 ${
                         isActivity ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                       }`}>
                         {isActivity ? '🎯' : '📚'}
                       </div>
                       <div className="min-w-0 flex-1">
                         <div className="flex flex-wrap items-center gap-2">
                           <h5 className="text-sm font-black text-slate-800 break-words">{subjectData.subject.name}</h5>
                           {subjectData._isMerged && (
                             <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-600">(รวม {subjectData._mergedCount} ภาค)</span>
                           )}
                         </div>
                         {!isActivity && (
                           <p className="mt-1 text-xs font-medium text-slate-400">รหัสวิชา: {subjectData.subject.code || '-'}</p>
                         )}
                       </div>
                       {isActivity && (
                         <button
                           onClick={() => {
                             setSelectedActivityData({
                               activity_subjects: subjectData.activityBreakdown,
                               total_activity_score: subjectData.totalScore,
                               total_activity_percent: subjectData.totalActivityPercent
                             });
                             setShowActivityModal(true);
                           }}
                           className="rounded-xl p-2 text-purple-500 transition-all hover:bg-purple-50 hover:text-purple-600"
                         >
                           <Info className="w-5 h-5" />
                         </button>
                       )}
                     </div>

                     <div className="mt-4 grid grid-cols-2 gap-3">
                       <div className="rounded-xl bg-slate-50 p-3">
                         <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ประเภท</p>
                         <div className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                           isActivity ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                         }`}>
                           {isActivity ? 'กิจกรรม' : 'วิชาการ'}
                         </div>
                       </div>
                       <div className="rounded-xl bg-slate-50 p-3">
                         <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">คะแนน</p>
                         <p className="mt-2 text-lg font-black text-slate-800">{scoreLabel}</p>
                         <p className="text-xs font-medium text-slate-400">
                           {Math.round(Number(subjectData.totalScore) || 0)} / {Math.round(Number(subjectData.totalMaxScore) || 0)}
                         </p>
                       </div>
                       <div className="rounded-xl bg-slate-50 p-3">
                         <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">เกรด</p>
                         <div className="mt-2">
                           {isActivity ? (
                             <span className={`inline-block rounded-lg px-3 py-1 text-xs font-bold text-white ${
                               isPassingActivity ? 'bg-blue-500' : 'bg-rose-500'
                             }`}>
                               {isPassingActivity ? 'ผ่าน' : 'ไม่ผ่าน'}
                             </span>
                           ) : (
                             <span
                               className="inline-block rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm"
                               style={{ backgroundColor: letterGrade.color }}
                             >
                               {letterGrade.grade}
                             </span>
                           )}
                         </div>
                       </div>
                       <div className="rounded-xl bg-slate-50 p-3">
                         <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">GPA</p>
                         <p className="mt-2 text-lg font-black text-slate-800">{isActivity ? '-' : letterGrade.gpaValue.toFixed(1)}</p>
                       </div>
                       <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                         <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">หน่วยกิต</p>
                         <p className="mt-2 text-lg font-black text-slate-800">{isActivity ? '-' : credit}</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="hidden overflow-x-auto lg:block">
                 <table className="min-w-[880px] w-full">
                   <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-100">
                       <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">รายวิชา</th>
                       <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">ประเภท</th>
                       <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">หน่วยกิต</th>
                       <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">คะแนน</th>
                       <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">เกรด</th>
                       <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">GPA</th>
                       <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {transcriptGradeItems.map(({ key, subjectData, letterGrade, isActivity, credit, scoreLabel, isPassingActivity }) => (
                       <tr key={key} className="group hover:bg-slate-50/50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${
                               isActivity ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                             }`}>
                               {isActivity ? '🎯' : '📚'}
                             </div>
                             <div>
                               <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                 {subjectData.subject.name}
                                 {subjectData._isMerged && (
                                   <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">(รวม {subjectData._mergedCount} ภาค)</span>
                                 )}
                               </div>
                               {!isActivity && (
                                 <div className="text-xs text-slate-400 font-medium mt-0.5">รหัสวิชา: {subjectData.subject.code || '-'}</div>
                               )}
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-center">
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                             isActivity ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                           }`}>
                             {isActivity ? 'กิจกรรม' : 'วิชาการ'}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-center text-sm font-bold text-slate-600">{isActivity ? '-' : credit}</td>
                         <td className="px-6 py-4 text-center">
                           <div className="font-black text-slate-700">{scoreLabel}</div>
                         </td>
                         <td className="px-6 py-4 text-center">
                           {isActivity ? (
                             <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs text-white ${
                               isPassingActivity ? 'bg-blue-500' : 'bg-rose-500'
                             }`}>
                               {isPassingActivity ? 'ผ่าน' : 'ไม่ผ่าน'}
                             </span>
                           ) : (
                             <span
                               className="inline-block px-3 py-1 rounded-lg font-bold text-xs text-white shadow-sm"
                               style={{ backgroundColor: letterGrade.color }}
                             >
                               {letterGrade.grade}
                             </span>
                           )}
                         </td>
                         <td className="px-6 py-4 text-center font-bold text-slate-700">{isActivity ? '-' : letterGrade.gpaValue.toFixed(1)}</td>
                         <td className="px-6 py-4 text-right">
                           <button
                             onClick={() => {
                               if (isActivity) {
                                 setSelectedActivityData({
                                   activity_subjects: subjectData.activityBreakdown,
                                   total_activity_score: subjectData.totalScore,
                                   total_activity_percent: subjectData.totalActivityPercent
                                 });
                                 setShowActivityModal(true);
                               }
                             }}
                             className={`p-2 rounded-xl transition-all ${
                               isActivity
                                 ? 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'
                                 : 'text-slate-300 cursor-default'
                             }`}
                             disabled={!isActivity}
                           >
                             <Info className="w-5 h-5" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </>
         )}
      </div>

        {/* Grade Legend Modal */}
        {showGradeModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
                <div className="absolute inset-0 bg-slate-900/60 animate-in fade-in duration-300" onClick={() => setShowGradeModal(false)}></div>
                <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[92vh] sm:max-h-[85vh]">
                    <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-lg sm:text-xl font-black text-slate-800">เกณฑ์การให้คะแนน</h3>
                        <button onClick={() => setShowGradeModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-73px)] sm:max-h-[70vh]">
                        <div className="space-y-3 sm:hidden">
                          {gradeLegendItems.map((item) => (
                            <div key={item.grade} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <span
                                  className="inline-block rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm"
                                  style={{ backgroundColor: getLetterGrade(item.sampleScore).color }}
                                >
                                  {item.grade}
                                </span>
                                <span className="text-sm font-black text-slate-700">GPA {item.gpa}</span>
                              </div>
                              <p className="mt-3 text-sm font-bold text-slate-700">{item.range}</p>
                              <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                        <table className="hidden w-full sm:table">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-3 font-black text-slate-500 text-xs uppercase">เกรด</th>
                                    <th className="text-left py-3 font-black text-slate-500 text-xs uppercase">ช่วงคะแนน</th>
                                    <th className="text-left py-3 font-black text-slate-500 text-xs uppercase">ความหมาย</th>
                                    <th className="text-right py-3 font-black text-slate-500 text-xs uppercase">GPA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {gradeLegendItems.map((item) => (
                                <tr key={item.grade} className="hover:bg-slate-50/50">
                                        <td className="py-3">
                                            <span 
                                                className="inline-block px-3 py-1 rounded-lg font-bold text-xs text-white shadow-sm"
                                      style={{ backgroundColor: getLetterGrade(item.sampleScore).color }}
                                            >
                                                {item.grade}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm font-bold text-slate-600">{item.range}</td>
                                        <td className="py-3 text-sm font-medium text-slate-500">{item.desc}</td>
                                        <td className="py-3 text-right font-black text-slate-700">{item.gpa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      {/* GPA Modal */}
      {showGPAModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
           <div className="absolute inset-0 bg-slate-900/60 animate-in fade-in duration-300" onClick={() => setShowGPAModal(false)}></div>
             <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[92vh] sm:max-h-[85vh]">
               <div className="bg-slate-50 p-5 sm:p-8 text-center relative overflow-hidden border-b border-slate-100">
                 <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-600"><Award className="w-32 h-32" /></div>
                 <button onClick={() => setShowGPAModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                      <X className="w-6 h-6" />
                   </button>
                   
                 <p className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2">เกรดเฉลี่ยสะสม</p>
                 <h2 className="text-5xl sm:text-7xl font-black text-slate-800 tracking-tighter mb-2">
                       {typeof transcriptSummary.gpa === 'number' ? transcriptSummary.gpa.toFixed(2) : transcriptSummary.gpa}
                   </h2>
                 <div className="inline-flex max-w-full items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full text-blue-700 font-bold text-sm">
                   {transcriptSummary.gpa >= 3.0 ? <Trophy className="w-4 h-4 text-blue-600" /> : <BookOpen className="w-4 h-4 text-blue-600" />}
                       <span className="break-words">
                            {transcriptSummary.gpa >= 3.6 && 'ผลการเรียนยอดเยี่ยม'}
                            {transcriptSummary.gpa >= 3.0 && transcriptSummary.gpa < 3.6 && 'ผลการเรียนดีมาก'}
                            {transcriptSummary.gpa >= 2.0 && transcriptSummary.gpa < 3.0 && 'ผลการเรียนพอใช้'}
                            {transcriptSummary.gpa < 2.0 && 'ต้องพยายามเพิ่มอีกนิด'}
                        </span>
                   </div>
               </div>
               
               <div className="overflow-y-auto p-5 sm:p-8 max-h-[calc(92vh-213px)] sm:max-h-none">
                   <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                     <BarChart2 className="w-5 h-5 text-blue-500" />
                       สถิติการเรียน
                   </h4>
                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase">หน่วยกิตรวม</p>
                           <p className="text-2xl font-black text-slate-700">{transcriptSummary.totalCredits}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase">วิชาที่เรียน</p>
                           <p className="text-2xl font-black text-slate-700">{transcriptSummary.totalSubjects}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase">วิชาปกติ</p>
                           <p className="text-2xl font-black text-slate-700">{transcriptSummary.regularSubjectsCount}</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase">วิชากิจกรรม</p>
                           <p className="text-2xl font-black text-slate-700">{transcriptSummary.activitySubjectsCount}</p>
                       </div>
                   </div>
                   
                     <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-800 font-medium leading-relaxed">
                       💡 เคล็ดลับ: รักษาเกรดเฉลี่ยให้สูงกว่า 3.00 เพื่อโอกาสใรการศึกษาต่อและทุนการศึกษาที่มากขึ้น
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && selectedActivityData && (
        <ActivityDetailModal
          isOpen={showActivityModal}
          activityData={selectedActivityData}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedActivityData(null);
          }}
        />
      )}
    </div>
  );
}
