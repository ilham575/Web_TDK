import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Clock3, Coffee, School, UserRound } from "lucide-react";
import ScheduleDetailModal from "./ScheduleDetailModal";

const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const DAY_SHORT_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const ROLE_META = {
  student: {
    badge: "Student timetable",
    title: "ตารางเรียนประจำสัปดาห์",
    subtitle: "วันและเวลาอ้างอิงจากช่วงเวลาเรียนที่ผู้ดูแลระบบกำหนดไว้ในฐานข้อมูล",
    countLabel: "รายวิชาที่แสดง",
    emptyTitle: "ยังไม่มีข้อมูลตารางเรียน",
    emptySubtitle: "เมื่อครูหรือผู้ดูแลระบบกำหนดคาบเรียนแล้ว ตารางจะปรากฏที่นี่ทันที",
    heroBackground: "linear-gradient(135deg, rgba(239,246,255,0.98) 0%, rgba(240,249,255,0.96) 48%, rgba(236,253,245,0.94) 100%)",
    glowColor: "rgba(56, 189, 248, 0.28)",
  },
  teacher: {
    badge: "Teacher timetable",
    title: "ภาพรวมคาบสอนรายสัปดาห์",
    subtitle: "ตารางแสดงตามช่วงเวลาเรียนของโรงเรียนและรายการสอนที่บันทึกไว้แล้ว",
    countLabel: "คาบสอนที่แสดง",
    emptyTitle: "ยังไม่มีคาบสอนในช่วงที่เลือก",
    emptySubtitle: "กดปุ่มกำหนดเวลาสอนเพื่อเพิ่มคาบเรียนใหม่ได้ทันที",
    heroBackground: "linear-gradient(135deg, rgba(236,253,245,0.98) 0%, rgba(240,253,250,0.96) 48%, rgba(255,247,237,0.94) 100%)",
    glowColor: "rgba(16, 185, 129, 0.24)",
  },
  admin: {
    badge: "Admin preview",
    title: "ภาพรวมตารางเรียนของโรงเรียน",
    subtitle: "ใช้ช่วงเวลาเรียนจากข้อมูลที่แอดมินกำหนดไว้ และจัดวางรายการที่เวลาเดียวกันให้อ่านง่ายขึ้น",
    countLabel: "รายการตาราง",
    emptyTitle: "ยังไม่มีรายการตารางเรียน",
    emptySubtitle: "เพิ่มตารางเรียนใหม่เพื่อดูภาพรวมรายสัปดาห์ของครูและนักเรียน",
    heroBackground: "linear-gradient(135deg, rgba(238,242,255,0.98) 0%, rgba(245,243,255,0.96) 48%, rgba(255,247,237,0.94) 100%)",
    glowColor: "rgba(99, 102, 241, 0.26)",
  },
};

const DAY_THEMES = {
  0: { background: "#fef2f2", border: "#fecaca", text: "#dc2626", ribbon: "#ef4444" },
  1: { background: "#eef2ff", border: "#c7d2fe", text: "#4f46e5", ribbon: "#6366f1" },
  2: { background: "#ecfdf5", border: "#a7f3d0", text: "#059669", ribbon: "#10b981" },
  3: { background: "#fffbeb", border: "#fde68a", text: "#d97706", ribbon: "#f59e0b" },
  4: { background: "#faf5ff", border: "#d8b4fe", text: "#9333ea", ribbon: "#a855f7" },
  5: { background: "#fff1f2", border: "#fecdd3", text: "#e11d48", ribbon: "#f43f5e" },
  6: { background: "#f0f9ff", border: "#bae6fd", text: "#0284c7", ribbon: "#0ea5e9" },
};

const CARD_PALETTES = [
  {
    background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
    border: "#60a5fa",
    text: "#1d4ed8",
    shadow: "rgba(37, 99, 235, 0.22)",
    chip: "rgba(255, 255, 255, 0.84)",
    ribbon: "#3b82f6",
  },
  {
    background: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
    border: "#34d399",
    text: "#047857",
    shadow: "rgba(16, 185, 129, 0.22)",
    chip: "rgba(255, 255, 255, 0.84)",
    ribbon: "#10b981",
  },
  {
    background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
    border: "#fb923c",
    text: "#c2410c",
    shadow: "rgba(249, 115, 22, 0.22)",
    chip: "rgba(255, 255, 255, 0.84)",
    ribbon: "#f97316",
  },
  {
    background: "linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)",
    border: "#f472b6",
    text: "#be185d",
    shadow: "rgba(236, 72, 153, 0.2)",
    chip: "rgba(255, 255, 255, 0.84)",
    ribbon: "#ec4899",
  },
  {
    background: "linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)",
    border: "#a78bfa",
    text: "#6d28d9",
    shadow: "rgba(124, 58, 237, 0.2)",
    chip: "rgba(255, 255, 255, 0.84)",
    ribbon: "#8b5cf6",
  },
  {
    background: "linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)",
    border: "#22d3ee",
    text: "#0f766e",
    shadow: "rgba(6, 182, 212, 0.2)",
    chip: "rgba(255, 255, 255, 0.84)",
    ribbon: "#06b6d4",
  },
];

const BREAK_CARD_PALETTE = {
  background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
  border: "#f59e0b",
  text: "#92400e",
  shadow: "rgba(217, 119, 6, 0.24)",
  chip: "rgba(255, 255, 255, 0.88)",
  ribbon: "#f59e0b",
};

const normalizeSortDay = (day) => (day === 0 ? 7 : day);

const toText = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const firstText = (...values) => values.map(toText).find(Boolean) || "";

const normalizeDay = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeTime = (value) => {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
};

const timeToFloat = (value) => {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours + (minutes / 60);
};

const formatHourValue = (value) => `${String(value).padStart(2, "0")}:00`;

const formatHourSummary = (value) => {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const formatDurationLabel = (duration) => {
  if (!Number.isFinite(duration) || duration <= 0) return "";
  const totalMinutes = Math.round(duration * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${minutes} นาที`;
};

const getCardPalette = (seed) => {
  const text = seed || "schedule";
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return CARD_PALETTES[Math.abs(hash) % CARD_PALETTES.length];
};

const layoutDaySchedules = (items) => {
  if (!items.length) return [];

  const sorted = [...items].sort((left, right) => {
    if (left._start !== right._start) return left._start - right._start;
    if (left._end !== right._end) return left._end - right._end;
    return String(left.subject_name).localeCompare(String(right.subject_name));
  });

  const clusters = [];
  let currentCluster = [];
  let currentClusterEnd = -Infinity;

  sorted.forEach((item) => {
    if (!currentCluster.length || item._start < currentClusterEnd) {
      currentCluster.push(item);
      currentClusterEnd = Math.max(currentClusterEnd, item._end);
      return;
    }

    clusters.push(currentCluster);
    currentCluster = [item];
    currentClusterEnd = item._end;
  });

  if (currentCluster.length) {
    clusters.push(currentCluster);
  }

  return clusters.flatMap((cluster) => {
    const columnEndTimes = [];
    const placed = cluster.map((item) => {
      let columnIndex = 0;
      while (columnIndex < columnEndTimes.length && columnEndTimes[columnIndex] > item._start) {
        columnIndex += 1;
      }
      columnEndTimes[columnIndex] = item._end;
      return {
        ...item,
        _column: columnIndex,
      };
    });

    const columnCount = Math.max(columnEndTimes.length, 1);
    return placed.map((item) => ({
      ...item,
      _columnCount: columnCount,
    }));
  });
};

export default function ScheduleGrid({ operatingHours = [], schedules = [], role = "student", onActionDelete, onActionEdit }) {
  const meta = ROLE_META[role] || ROLE_META.student;
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));
  const [selectedMobileDay, setSelectedMobileDay] = useState(null);

  const normalizedOperatingHours = useMemo(() => (
    operatingHours
      .map((slot) => ({
        ...slot,
        day_of_week: normalizeDay(slot.day_of_week),
        start_time: normalizeTime(slot.start_time),
        end_time: normalizeTime(slot.end_time),
        is_break: Boolean(slot.is_break),
      }))
      .filter((slot) => slot.day_of_week !== null && slot.start_time && slot.end_time)
  ), [operatingHours]);

  const normalizedSubjectSchedules = useMemo(() => (
    schedules
      .map((item, index) => {
        const dayOfWeek = normalizeDay(item.day_of_week ?? item.day ?? item.schedule_day);
        const startTime = normalizeTime(item.start_time ?? item.startTime ?? item.slot_start_time ?? item.start);
        const endTime = normalizeTime(item.end_time ?? item.endTime ?? item.slot_end_time ?? item.end);
        const startValue = timeToFloat(startTime);
        const endValue = timeToFloat(endTime);
        const subjectName = firstText(
          item.subject_name,
          item.subject?.name,
          item.subject?.title,
          item.subject,
          item.name,
          item.title,
          item.subject_code,
        ) || "วิชาไม่ระบุ";
        const teacherName = firstText(
          item.teacher_name,
          item.teacher_full_name,
          item.teacher_fullname,
          item.teacher?.name,
          item.teacher,
          item.instructor_name,
        );
        const classroomName = firstText(
          item.classroom_display,
          item.classroom_name,
          item.classroom?.name,
          item.classroom,
          item.room_name,
        );
        const roomName = firstText(item.room, item.room_name, item.room_number);
        const subjectCode = firstText(item.subject_code, item.subject?.code, item.code);
        const note = firstText(item.note, item.remark, item.description);

        return {
          ...item,
          id: item.id ?? `${dayOfWeek}-${startTime}-${endTime}-${subjectName}-${index}`,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          subject_name: subjectName,
          teacher_name: teacherName,
          classroom_name: classroomName,
          room: roomName,
          subject_code: subjectCode,
          note,
          is_break: Boolean(item.is_break),
          scope_label: firstText(item.scope_label, item.scope, item.scope_name),
          _start: startValue,
          _end: endValue,
          _duration: startValue !== null && endValue !== null ? Math.max(endValue - startValue, 0) : 0,
        };
      })
      .filter((item) => item.day_of_week !== null && item._start !== null && item._end !== null && item._end > item._start)
      .sort((left, right) => {
        const dayCompare = normalizeSortDay(left.day_of_week) - normalizeSortDay(right.day_of_week);
        if (dayCompare !== 0) return dayCompare;
        if (left._start !== right._start) return left._start - right._start;
        return left._end - right._end;
      })
  ), [schedules]);

  const normalizedBreakSchedules = useMemo(() => (
    normalizedOperatingHours
      .filter((slot) => slot.is_break)
      .map((slot, index) => {
        const startValue = timeToFloat(slot.start_time);
        const endValue = timeToFloat(slot.end_time);

        return {
          ...slot,
          id: slot.id != null ? `break-slot-${slot.id}` : `break-slot-${slot.day_of_week}-${slot.start_time}-${slot.end_time}-${index}`,
          subject_name: "เวลาพัก",
          teacher_name: "",
          classroom_name: "",
          room: "",
          subject_code: "",
          note: "ช่วงเวลาพักของทั้งโรงเรียน ระบบจะไม่อนุญาตให้ลงวิชาทับช่วงเวลานี้",
          is_break: true,
          scope_label: "ทุกชั้นเรียน",
          _start: startValue,
          _end: endValue,
          _duration: startValue !== null && endValue !== null ? Math.max(endValue - startValue, 0) : 0,
        };
      })
      .filter((item) => item.day_of_week !== null && item._start !== null && item._end !== null && item._end > item._start)
  ), [normalizedOperatingHours]);

  const normalizedSchedules = useMemo(() => (
    [...normalizedSubjectSchedules, ...normalizedBreakSchedules].sort((left, right) => {
      const dayCompare = normalizeSortDay(left.day_of_week) - normalizeSortDay(right.day_of_week);
      if (dayCompare !== 0) return dayCompare;
      if (left._start !== right._start) return left._start - right._start;
      return left._end - right._end;
    })
  ), [normalizedSubjectSchedules, normalizedBreakSchedules]);

  const days = useMemo(() => {
    const source = normalizedOperatingHours.length > 0 ? normalizedOperatingHours : normalizedSchedules;
    const dayMap = new Map();

    source.forEach((item) => {
      const dayKey = normalizeDay(item.day_of_week);
      if (dayKey === null || dayMap.has(dayKey)) return;
      dayMap.set(dayKey, {
        key: dayKey,
        label: DAY_NAMES[dayKey] || "ไม่ระบุ",
        shortLabel: DAY_SHORT_NAMES[dayKey] || String(dayKey),
        theme: DAY_THEMES[dayKey] || DAY_THEMES[1],
      });
    });

    return [...dayMap.values()].sort((left, right) => normalizeSortDay(left.key) - normalizeSortDay(right.key));
  }, [normalizedOperatingHours, normalizedSchedules]);

  const dayCounts = useMemo(() => {
    const counts = {};
    normalizedSchedules.filter((item) => !item.is_break).forEach((item) => {
      counts[item.day_of_week] = (counts[item.day_of_week] || 0) + 1;
    });
    return counts;
  }, [normalizedSchedules]);

  const timeBounds = useMemo(() => {
    const source = [...normalizedOperatingHours, ...normalizedSchedules];
    let minHour = 24;
    let maxHour = 0;

    source.forEach((item) => {
      const startValue = item._start ?? timeToFloat(item.start_time);
      const endValue = item._end ?? timeToFloat(item.end_time);
      if (startValue !== null) minHour = Math.min(minHour, Math.floor(startValue));
      if (endValue !== null) maxHour = Math.max(maxHour, Math.ceil(endValue));
    });

    if (minHour === 24 || maxHour === 0) {
      return { minHour: 8, maxHour: 18 };
    }

    return {
      minHour,
      maxHour: Math.max(maxHour, minHour + 1),
    };
  }, [normalizedOperatingHours, normalizedSchedules]);

  const hours = useMemo(() => (
    Array.from({ length: timeBounds.maxHour - timeBounds.minHour }, (_, index) => timeBounds.minHour + index)
  ), [timeBounds]);

  const operatingWindowByDay = useMemo(() => {
    const grouped = {};
    normalizedOperatingHours.filter((slot) => !slot.is_break).forEach((slot) => {
      const key = slot.day_of_week;
      if (key === null) return;

      const current = grouped[key] || { start: slot.start_time, end: slot.end_time };
      grouped[key] = {
        start: current.start <= slot.start_time ? current.start : slot.start_time,
        end: current.end >= slot.end_time ? current.end : slot.end_time,
      };
    });
    return grouped;
  }, [normalizedOperatingHours]);

  const isPhone = viewportWidth < 640;
  const isSingleDayView = viewportWidth < 960;
  const isTablet = viewportWidth >= 960 && viewportWidth < 1280;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isSingleDayView || !days.length) return;
    const dayStillExists = days.some((day) => day.key === selectedMobileDay);
    if (dayStillExists) return;

    const today = new Date().getDay();
    const fallbackDay = days.find((day) => day.key === today)?.key ?? days[0].key;
    setSelectedMobileDay(fallbackDay);
  }, [days, isSingleDayView, selectedMobileDay]);

  const visibleDays = useMemo(() => {
    if (!isSingleDayView) return days;
    if (!days.length) return [];

    const fallbackDay = selectedMobileDay ?? (days.find((day) => day.key === new Date().getDay())?.key ?? days[0].key);
    const filtered = days.filter((day) => day.key === fallbackDay);
    return filtered.length ? filtered : [days[0]];
  }, [days, isSingleDayView, selectedMobileDay]);

  const visibleDayKeys = useMemo(() => new Set(visibleDays.map((day) => day.key)), [visibleDays]);

  const visibleSchedules = useMemo(() => (
    normalizedSchedules.filter((item) => visibleDayKeys.has(item.day_of_week))
  ), [normalizedSchedules, visibleDayKeys]);

  const visibleTeachingSchedules = useMemo(() => (
    visibleSchedules.filter((item) => !item.is_break)
  ), [visibleSchedules]);

  const visibleSchedulesByDay = useMemo(() => {
    const grouped = {};
    visibleSchedules.forEach((item) => {
      const dayKey = String(item.day_of_week);
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(item);
    });
    return grouped;
  }, [visibleSchedules]);

  const laidOutSchedulesByDay = useMemo(() => {
    const grouped = {};
    visibleSchedules.forEach((item) => {
      const dayKey = String(item.day_of_week);
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(item);
    });

    Object.keys(grouped).forEach((dayKey) => {
      grouped[dayKey] = layoutDaySchedules(grouped[dayKey]);
    });

    return grouped;
  }, [visibleSchedules]);

  const scheduleCount = useMemo(() => {
    if (role === "student") {
      return new Set(visibleTeachingSchedules.map((item) => item.subject_id ?? item.subject_code ?? item.subject_name)).size;
    }
    return visibleTeachingSchedules.length;
  }, [role, visibleTeachingSchedules]);

  const totalHours = useMemo(() => (
    visibleTeachingSchedules.reduce((sum, item) => sum + item._duration, 0)
  ), [visibleTeachingSchedules]);

  const openDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setShowDetailModal(false);
  };

  const handleEdit = (item) => {
    if (!item) return;
    if (item.is_break && role !== "admin") return;
    if (onActionEdit) onActionEdit(item);
  };

  const handleDelete = (item) => {
    if (onActionDelete) onActionDelete(item);
  };

  if (!days.length) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl" style={{ backgroundColor: meta.glowColor }} />
        <div className="relative flex flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/70 bg-slate-50 text-slate-300 shadow-sm">
            <CalendarDays className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-black text-slate-800">ยังไม่ได้กำหนดเวลาเปิดเรียน</h3>
          <p className="mt-2 max-w-lg text-sm font-medium text-slate-500">กรุณาตั้งค่าช่วงเวลาเรียนในระบบก่อน ตารางเรียนของทั้งนักเรียน ครู และแอดมินจึงจะแสดงผลได้ครบถ้วน</p>
        </div>
      </div>
    );
  }

  const PIXELS_PER_HOUR = isSingleDayView ? 66 : isTablet ? 68 : 72;
  const HEADER_HEIGHT = isSingleDayView ? 74 : isTablet ? 78 : 82;
  const TIME_COLUMN_WIDTH = isSingleDayView ? 72 : isTablet ? 76 : 84;
  const DAY_MIN_WIDTH = isSingleDayView ? 276 : isTablet ? 136 : 168;
  const gridMinWidth = TIME_COLUMN_WIDTH + (visibleDays.length * DAY_MIN_WIDTH);
  const gridHeight = HEADER_HEIGHT + (hours.length * PIXELS_PER_HOUR);
  const singleVisibleDay = visibleDays.length === 1 ? visibleDays[0] : null;
  const singleVisibleWindow = singleVisibleDay ? operatingWindowByDay[singleVisibleDay.key] : null;

  return (
    <div className="space-y-4">
      {isSingleDayView && days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => {
            const isSelected = selectedMobileDay === day.key;
            const count = dayCounts[day.key] || 0;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedMobileDay(day.key)}
                className="relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200"
                style={{
                  borderColor: isSelected ? day.theme.border : "#e2e8f0",
                  backgroundColor: isSelected ? day.theme.background : "rgba(255, 255, 255, 0.92)",
                  color: isSelected ? day.theme.text : "#64748b",
                  boxShadow: isSelected ? `0 14px 30px -22px ${day.theme.ribbon}` : "none",
                }}
              >
                <span>{day.label}</span>
                {count > 0 && (
                  <span
                    className="inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black"
                    style={{
                      backgroundColor: isSelected ? day.theme.ribbon : "#e2e8f0",
                      color: "#ffffff",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="relative overflow-hidden border-b border-white/70 px-5 py-6 sm:px-7" style={{ background: meta.heroBackground }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl" style={{ backgroundColor: meta.glowColor }} />
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                {meta.badge}
              </div>
              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-800 sm:text-3xl">{meta.title}</h3>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{meta.subtitle}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  {meta.countLabel}
                </div>
                <div className="mt-3 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">{scheduleCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  ชั่วโมง/สัปดาห์
                </div>
                <div className="mt-3 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">{formatHourSummary(totalHours)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
          {isPhone ? (
            <div className="space-y-4">
              {singleVisibleDay && singleVisibleWindow && (
                <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">วันเรียนที่เลือก</p>
                      <h4 className="mt-1 text-lg font-black text-slate-800">{singleVisibleDay.label}</h4>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-black"
                      style={{
                        backgroundColor: singleVisibleDay.theme.background,
                        color: singleVisibleDay.theme.text,
                      }}
                    >
                      {dayCounts[singleVisibleDay.key] || 0} คาบ
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    <Clock3 className="h-3.5 w-3.5" />
                    ช่วงเวลาเรียน {singleVisibleWindow.start} - {singleVisibleWindow.end}
                  </div>
                </div>
              )}

              {visibleDays.map((day) => {
                const items = visibleSchedulesByDay[String(day.key)] || [];

                return (
                  <div key={day.key} className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: day.theme.text }}>
                          {day.shortLabel}
                        </div>
                        <h4 className="text-lg font-black text-slate-800">{day.label}</h4>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-black"
                        style={{
                          backgroundColor: day.theme.background,
                          color: day.theme.text,
                        }}
                      >
                        {items.length} คาบ
                      </span>
                    </div>

                    {items.length > 0 ? (
                      <div className="space-y-3">
                        {items.map((item) => {
                          const palette = item.is_break ? BREAK_CARD_PALETTE : getCardPalette(`${item.subject_name}-${item.classroom_name}-${item.teacher_name}`);
                          const durationLabel = formatDurationLabel(item._duration);
                          const locationText = item.is_break
                            ? (item.scope_label || "ทุกชั้นเรียน")
                            : [item.classroom_name, item.room].filter(Boolean).join(" · ");

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openDetail(item)}
                              className="w-full overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all duration-200 active:scale-[0.99]"
                              style={{
                                background: palette.background,
                                borderColor: palette.border,
                                color: palette.text,
                                boxShadow: `0 16px 36px -28px ${palette.shadow}`,
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black" style={{ backgroundColor: palette.chip, color: palette.text }}>
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {item.start_time} - {item.end_time}
                                  </div>
                                  <h5 className="mt-3 text-base font-black leading-tight text-slate-800">{item.subject_name}</h5>
                                  {item.is_break && (
                                    <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-amber-700">
                                      <Coffee className="h-3.5 w-3.5" />
                                      <span className="truncate">{item.scope_label || "ทุกชั้นเรียน"}</span>
                                    </div>
                                  )}
                                  {item.subject_code && (
                                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.subject_code}</div>
                                  )}
                                </div>
                                {durationLabel && (
                                  <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-600">
                                    {durationLabel}
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                                {locationText && (
                                  <div className="flex items-center gap-2">
                                    {item.is_break ? <Coffee className="h-4 w-4 shrink-0" /> : <School className="h-4 w-4 shrink-0" />}
                                    <span className="truncate">{locationText}</span>
                                  </div>
                                )}
                                {item.teacher_name && role !== "teacher" && (
                                  <div className="flex items-center gap-2">
                                    <UserRound className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{item.teacher_name}</span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-slate-50/90 px-5 py-8 text-center">
                        <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-3 text-sm font-black text-slate-600">ยังไม่มีคาบเรียนในวันนี้</p>
                        <p className="mt-1 text-xs font-medium text-slate-400">เลือกวันอื่นจากแท็บด้านบน หรือรอรายการคาบเรียนสำหรับวันนี้</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="relative rounded-[1.75rem] border border-slate-200/70 bg-white/75 p-3 shadow-inner shadow-slate-200/30 sm:p-5">
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.10),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_40%)]" />

                {singleVisibleDay && singleVisibleWindow && (
                  <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: singleVisibleDay.theme.text }}>
                        มุมมองรายวัน
                      </div>
                      <div className="mt-1 text-base font-black text-slate-800">{singleVisibleDay.label}</div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      <Clock3 className="h-3.5 w-3.5" />
                      ช่วงเวลาเรียน {singleVisibleWindow.start} - {singleVisibleWindow.end}
                    </div>
                  </div>
                )}

                <div className="relative" style={{ minWidth: `${gridMinWidth}px`, height: `${gridHeight}px` }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, 1fr)`,
                      gridTemplateRows: `${HEADER_HEIGHT}px repeat(${hours.length}, ${PIXELS_PER_HOUR}px)`,
                      height: "100%",
                    }}
                  >
                    <div className="flex items-end justify-end rounded-tl-[1.4rem] border-b border-slate-200/80 bg-slate-50/80 px-3 pb-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 sm:px-4">
                      เวลา
                    </div>

                    {visibleDays.map((day, index) => (
                      <div
                        key={day.key}
                        className="border-b border-slate-200/80 px-1.5 pb-3 pt-2 sm:px-2"
                        style={{ borderLeft: index === 0 ? "1px solid rgba(226, 232, 240, 0.8)" : "1px solid rgba(226, 232, 240, 0.8)" }}
                      >
                        <div
                          className="flex h-full flex-col items-center justify-center rounded-[1.2rem] border px-2 py-3 text-center shadow-sm sm:rounded-[1.35rem] sm:px-3"
                          style={{
                            backgroundColor: day.theme.background,
                            borderColor: day.theme.border,
                            color: day.theme.text,
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.24em] sm:text-[11px]">{day.shortLabel}</div>
                          <div className="mt-1 text-xs font-bold sm:text-sm">{day.label}</div>
                          <div className="mt-1 text-[10px] font-semibold opacity-75 sm:text-[11px]">{dayCounts[day.key] || 0} คาบ</div>
                        </div>
                      </div>
                    ))}

                    {hours.map((hour, rowIndex) => (
                      <React.Fragment key={hour}>
                        <div
                          className="flex items-start justify-end bg-slate-50/70 px-2 pt-2 text-[11px] font-black text-slate-400 sm:px-3 sm:text-xs"
                          style={{
                            borderTop: rowIndex === 0 ? "none" : "1px solid rgba(226, 232, 240, 0.65)",
                            borderRight: "1px solid rgba(226, 232, 240, 0.8)",
                          }}
                        >
                          {formatHourValue(hour)}
                        </div>
                        {visibleDays.map((day, dayIndex) => (
                          <div
                            key={`${day.key}-${hour}`}
                            style={{
                              borderTop: rowIndex === 0 ? "none" : "1px solid rgba(226, 232, 240, 0.55)",
                              borderLeft: "1px solid rgba(226, 232, 240, 0.7)",
                              background: rowIndex % 2 === 0
                                ? "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.78) 100%)"
                                : "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.72) 100%)",
                              boxShadow: dayIndex === visibleDays.length - 1 ? "inset -1px 0 0 rgba(226, 232, 240, 0.55)" : "none",
                            }}
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      top: `${HEADER_HEIGHT}px`,
                      left: `${TIME_COLUMN_WIDTH}px`,
                      right: 0,
                      bottom: 0,
                      pointerEvents: "none",
                    }}
                  >
                    {visibleDays.map((day, dayIndex) => {
                      const daySchedules = laidOutSchedulesByDay[String(day.key)] || [];
                      const dayWidthPercent = 100 / visibleDays.length;

                      return daySchedules.map((item) => {
                        const palette = item.is_break ? BREAK_CARD_PALETTE : getCardPalette(`${item.subject_name}-${item.classroom_name}-${item.teacher_name}`);
                        const columnWidthPercent = dayWidthPercent / item._columnCount;
                        const leftPercent = (dayIndex * dayWidthPercent) + (item._column * columnWidthPercent);
                        const top = ((item._start - timeBounds.minHour) * PIXELS_PER_HOUR) + 6;
                        const height = Math.max(((item._end - item._start) * PIXELS_PER_HOUR) - 12, 38);
                        const isCompact = height < 86;
                        const isDense = columnWidthPercent < (isSingleDayView ? 42 : 16);
                        const showMeta = !isCompact && !isDense && height >= (isSingleDayView ? 92 : 112);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openDetail(item)}
                            className="group absolute overflow-hidden rounded-[1.1rem] border text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:rounded-[1.35rem]"
                            style={{
                              top: `${top}px`,
                              left: `calc(${leftPercent}% + 6px)`,
                              width: `calc(${columnWidthPercent}% - 12px)`,
                              height: `${height}px`,
                              background: palette.background,
                              borderColor: palette.border,
                              color: palette.text,
                              boxShadow: `0 18px 40px -30px ${palette.shadow}`,
                              pointerEvents: "auto",
                            }}
                          >
                            <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: palette.ribbon }} />
                            <div className="flex h-full flex-col gap-2 px-2.5 pb-2.5 pt-4 sm:px-3.5 sm:pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="font-black leading-tight tracking-tight"
                                    style={{
                                      fontSize: isCompact ? "10px" : isSingleDayView ? "13px" : "14px",
                                      display: "-webkit-box",
                                      WebkitLineClamp: isCompact ? 2 : 3,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {item.subject_name}
                                  </div>
                                </div>

                                {item.subject_code && !isDense && (
                                  <span
                                    className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black sm:text-[10px]"
                                    style={{ backgroundColor: palette.chip, color: palette.text }}
                                  >
                                    {item.subject_code}
                                  </span>
                                )}
                              </div>

                              {item.is_break && !isDense && (
                                <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[9px] font-black text-amber-700 sm:text-[10px]">
                                  <Coffee className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.scope_label || "ทุกชั้นเรียน"}</span>
                                </div>
                              )}

                              {showMeta && item.is_break && (
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-80 sm:text-[11px]">
                                  <Coffee className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{item.scope_label || "ทุกชั้นเรียน"}</span>
                                </div>
                              )}

                              {showMeta && !item.is_break && item.classroom_name && (
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-80 sm:text-[11px]">
                                  <School className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{item.classroom_name}</span>
                                </div>
                              )}

                              {showMeta && !item.is_break && item.teacher_name && role !== "teacher" && (
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-75 sm:text-[11px]">
                                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{item.teacher_name}</span>
                                </div>
                              )}

                              <div className="mt-auto flex items-center justify-between gap-2">
                                <span
                                  className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black sm:px-2.5 sm:text-[10px]"
                                  style={{ backgroundColor: palette.chip, color: palette.text }}
                                >
                                  <Clock3 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.start_time} - {item.end_time}</span>
                                </span>

                                {!isCompact && !isDense && item.room && (
                                  <span className="truncate text-[9px] font-bold opacity-70 sm:text-[10px]">{item.room}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      });
                    })}
                  </div>

                  {visibleSchedules.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                      <div className="max-w-md rounded-[1.75rem] border border-dashed border-slate-300 bg-white/82 px-8 py-10 text-center shadow-lg backdrop-blur">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-slate-100 text-slate-300">
                          <BookOpen className="h-8 w-8" />
                        </div>
                        <h4 className="text-lg font-black text-slate-700">{meta.emptyTitle}</h4>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{meta.emptySubtitle}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduleDetailModal
        isOpen={showDetailModal}
        item={selectedItem}
        onClose={closeDetail}
        role={role}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
