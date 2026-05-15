import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Loader2,
  RefreshCw,
  School,
  Trash2,
  User,
} from 'lucide-react';

import { API_BASE_URL } from '../endpoints';

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatDateInput(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatThaiDate(dateValue) {
  if (!dateValue) return '-';
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

function formatFullDateTime(dateValue) {
  return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())} ${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}:${pad(dateValue.getSeconds())}`;
}

function normalizeTime(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

function toMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized || !normalized.includes(':')) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function formatMinutes(totalMinutes) {
  let minutes = totalMinutes;
  while (minutes < 0) {
    minutes += 24 * 60;
  }

  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${pad(hours)}:${pad(mins)}`;
}

function getDateDayOfWeek(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return String(parsed.getDay());
}

function isBreakItem(item) {
  return Boolean(item?.is_break) || String(item?.display_title || item?.subject_name || '').includes('พัก');
}

function isFreePeriodItem(item) {
  return Boolean(item?.is_free_period);
}

function isHolidayItem(item) {
  return Boolean(item?.is_holiday);
}

function calculateViewerStatus(scheduledTime, actualTime, isSkipped, isEndColumn) {
  if (isSkipped && !isEndColumn) {
    return {
      status: 'skipped',
      text: 'ผ่าน (ไม่มีเรียน)',
      className: 'bg-purple-100 text-purple-700 border border-purple-200',
    };
  }

  if (!scheduledTime || !actualTime) {
    if (isSkipped && isEndColumn) {
      return {
        status: 'skipped-waiting',
        text: 'รอระบุเวลาผ่านคาบ',
        className: 'bg-purple-50 text-purple-500 border border-purple-200',
      };
    }

    return {
      status: 'waiting',
      text: 'รอระบุเวลา',
      className: 'bg-slate-100 text-slate-400 border border-slate-200',
    };
  }

  const diff = toMinutes(actualTime) - toMinutes(scheduledTime);
  const skipText = isSkipped ? ' (ผ่าน)' : '';

  if (diff > 0) {
    return {
      status: 'late',
      text: `ล่าช้า ${diff} นาที${skipText}`,
      className: 'bg-red-100 text-red-700 border border-red-200',
    };
  }

  if (diff < 0) {
    return {
      status: 'early',
      text: `เร็วกว่ากำหนด ${Math.abs(diff)} นาที${skipText}`,
      className: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
  }

  return {
    status: 'ontime',
    text: `ตรงเวลาพอดี${skipText}`,
    className: 'bg-green-100 text-green-700 border border-green-200',
  };
}

function buildDraftFromItem(item) {
  return {
    actual_start_time: normalizeTime(item.actual_start_time),
    actual_end_time: normalizeTime(item.actual_end_time),
    is_skipped: Boolean(item.is_skipped),
    note: item.note || '',
  };
}

function sortScheduleEntries(entries) {
  return [...entries].sort((left, right) => {
    const leftStart = normalizeTime(left.scheduled_start_time || left.start_time);
    const rightStart = normalizeTime(right.scheduled_start_time || right.start_time);
    if (leftStart !== rightStart) {
      return leftStart.localeCompare(rightStart);
    }

    const leftEnd = normalizeTime(left.scheduled_end_time || left.end_time);
    const rightEnd = normalizeTime(right.scheduled_end_time || right.end_time);
    if (leftEnd !== rightEnd) {
      return leftEnd.localeCompare(rightEnd);
    }

    return String(left.display_title || left.subject_name || '').localeCompare(String(right.display_title || right.subject_name || ''), 'th');
  });
}

function getAdminTimeSlotKey(item) {
  return `${normalizeTime(item?.scheduled_start_time)}|${normalizeTime(item?.scheduled_end_time)}`;
}

function buildAdminTimeSlotGroups(entries) {
  const slotMap = new Map();
    let periodCounter = 0;

    sortScheduleEntries(entries).forEach((entry) => {
    const key = getAdminTimeSlotKey(entry);
    if (!slotMap.has(key)) {
      slotMap.set(key, []);
    }
    slotMap.get(key).push(entry);
  });

    return [...slotMap.entries()].map(([key, slotEntries]) => {
      const representativeItem = slotEntries[0];
      const isBreakGroup = slotEntries.every((entry) => entry.is_break);
      if (!isBreakGroup) {
        periodCounter += 1;
      }

      return {
        key,
        periodLabel: isBreakGroup ? (representativeItem?.period_label || 'เวลาพัก') : `คาบ ${periodCounter}`,
        label: `${normalizeTime(representativeItem?.scheduled_start_time) || '-'} - ${normalizeTime(representativeItem?.scheduled_end_time) || '-'}`,
        entries: slotEntries,
        isBreakGroup,
      };
    });
}

function uniqLabels(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function buildViewerItems(trackingItems, scheduleItems, trackingDate) {
  const holidayCandidate = [...(Array.isArray(trackingItems) ? trackingItems : []), ...(Array.isArray(scheduleItems) ? scheduleItems : [])]
    .find((item) => isHolidayItem(item));

  if (holidayCandidate) {
    return [{
      tracking_id: holidayCandidate.tracking_id || null,
      subject_schedule_id: holidayCandidate.subject_schedule_id || `holiday-${holidayCandidate.holiday_id || trackingDate}`,
      break_schedule_id: null,
      holiday_id: holidayCandidate.holiday_id || null,
      tracking_date: holidayCandidate.tracking_date || trackingDate,
      subject_id: null,
      subject_name: holidayCandidate.subject_name || 'วันหยุดเรียน',
      display_title: holidayCandidate.subject_name || 'วันหยุดเรียน',
      subject_code: null,
      teacher_id: null,
      teacher_name: null,
      classroom_id: null,
      classroom_name: null,
      academic_year: holidayCandidate.academic_year || null,
      semester: holidayCandidate.semester || null,
      day_of_week: holidayCandidate.day_of_week || getDateDayOfWeek(trackingDate),
      scheduled_start_time: null,
      scheduled_end_time: null,
      actual_start_time: null,
      actual_end_time: null,
      is_skipped: false,
      note: holidayCandidate.note || 'วันหยุดเรียนเฉพาะวันที่เลือก',
      scope_label: holidayCandidate.scope_label || 'หยุดเฉพาะวันที่',
      can_edit: false,
      is_break: false,
      is_free_period: false,
      is_holiday: true,
      period_label: 'วันหยุดเรียน',
    }];
  }

  const targetDay = getDateDayOfWeek(trackingDate);
  const scheduleTrackingMap = new Map(
    (Array.isArray(trackingItems) ? trackingItems : []).map((item) => [String(item.subject_schedule_id), item])
  );

  let periodCounter = 0;
  const normalized = sortScheduleEntries(
    (Array.isArray(scheduleItems) ? scheduleItems : []).filter((item) => String(item.day_of_week) === String(targetDay))
  ).map((item) => {
    const isBreak = Boolean(item.is_break);
    const isFreePeriod = Boolean(item.is_free_period);
    const trackingKey = isBreak ? `break-${item.id}` : String(item.id);
    if (!isBreak) {
      periodCounter += 1;
    }

    const tracking = scheduleTrackingMap.get(trackingKey) || null;
    const displayTitle = isBreak
      ? tracking?.subject_name || item.note || item.subject_name || 'เวลาพัก'
      : isFreePeriod
        ? item.subject_name || item.note || 'คาบว่าง'
        : tracking?.subject_name || item.subject_name || 'ไม่ระบุชื่อวิชา';

    return {
      tracking_id: tracking?.tracking_id || null,
      subject_schedule_id: isBreak ? `break-${item.id}` : item.id,
      break_schedule_id: isBreak ? (tracking?.break_schedule_id || item.id) : null,
      tracking_date: tracking?.tracking_date || trackingDate,
      subject_id: tracking?.subject_id || item.subject_id || null,
      subject_name: tracking?.subject_name || item.subject_name || null,
      display_title: displayTitle,
      subject_code: tracking?.subject_code || item.subject_code || null,
      teacher_id: tracking?.teacher_id || item.teacher_id || null,
      teacher_name: tracking?.teacher_name || item.teacher_name || null,
      classroom_id: tracking?.classroom_id || item.classroom_id || null,
      classroom_name: tracking?.classroom_name || item.classroom_name || null,
      academic_year: tracking?.academic_year || item.academic_year || null,
      semester: tracking?.semester || item.semester || null,
      day_of_week: tracking?.day_of_week || item.day_of_week || targetDay,
      scheduled_start_time: tracking?.scheduled_start_time || item.start_time || null,
      scheduled_end_time: tracking?.scheduled_end_time || item.end_time || null,
      actual_start_time: tracking?.actual_start_time || null,
      actual_end_time: tracking?.actual_end_time || null,
      is_skipped: Boolean(tracking?.is_skipped),
      note: tracking?.note || item.note || null,
      scope_label: tracking?.scope_label || item.scope_label || null,
      can_edit: false,
      is_break: isBreak,
      is_free_period: isFreePeriod,
      is_holiday: Boolean(tracking?.is_holiday || item.is_holiday),
      period_label: isBreak ? item.note || 'เวลาพัก' : `คาบ ${periodCounter}`,
    };
  });

  const existingIds = new Set(normalized.map((item) => String(item.subject_schedule_id)));

  (Array.isArray(trackingItems) ? trackingItems : []).forEach((item, index) => {
    if (existingIds.has(String(item.subject_schedule_id))) {
      return;
    }

    normalized.push({
      ...item,
      display_title: item.subject_name || (item.is_break ? 'เวลาพัก' : item.is_free_period ? 'คาบว่าง' : 'ไม่ระบุชื่อวิชา'),
      is_break: Boolean(item.is_break),
      is_free_period: Boolean(item.is_free_period),
      is_holiday: Boolean(item.is_holiday),
      period_label: item.is_break ? 'เวลาพัก' : `คาบ ${index + 1}`,
    });
  });

  return sortScheduleEntries(normalized);
}

function buildViewerGroups(entries, combineViewerGroups = false) {
  const subjectGroups = new Map();
  const orderedEntries = sortScheduleEntries(entries);

  if (combineViewerGroups) {
    return [
      {
        groupName: 'รวมทุกชั้นที่สอน',
        entries: orderedEntries,
      },
    ];
  }

  orderedEntries.forEach((item) => {
    if (item.is_break) return;
    const key = item.classroom_name || 'ตารางประจำวัน';
    if (!subjectGroups.has(key)) {
      subjectGroups.set(key, []);
    }
  });

  if (subjectGroups.size === 0) {
    return [
      {
        groupName: orderedEntries[0]?.classroom_name || 'ตารางประจำวัน',
        entries: orderedEntries,
      },
    ];
  }

  const groupedItems = new Map([...subjectGroups.keys()].map((key) => [key, []]));
  const defaultKey = [...groupedItems.keys()][0];

  orderedEntries.forEach((item) => {
    if (item.is_break && !item.classroom_name) {
      groupedItems.forEach((value, key) => {
        value.push({ ...item, viewer_group_key: key });
      });
      return;
    }

    const key = item.classroom_name || defaultKey;
    if (!groupedItems.has(key)) {
      groupedItems.set(key, []);
    }
    groupedItems.get(key).push(item);
  });

  return [...groupedItems.entries()].map(([groupName, groupEntries]) => ({
    groupName,
    entries: sortScheduleEntries(groupEntries),
  }));
}

function getCurrentDelayMinutes(entries, lastActionIndex) {
  if (lastActionIndex < 0) {
    return 0;
  }

  const lastItem = entries[lastActionIndex];

  if (lastItem.is_skipped && lastItem.actual_end_time) {
    return toMinutes(lastItem.actual_end_time) - toMinutes(lastItem.scheduled_end_time);
  }

  if (!lastItem.is_skipped) {
    if (lastItem.actual_end_time) {
      return toMinutes(lastItem.actual_end_time) - toMinutes(lastItem.scheduled_end_time);
    }

    if (lastItem.actual_start_time) {
      return toMinutes(lastItem.actual_start_time) - toMinutes(lastItem.scheduled_start_time);
    }
  }

  return 0;
}

function getViewerLiveStatusClassroomName(item, combineViewerGroups = false) {
  if (!combineViewerGroups || !item?.classroom_name) {
    return '';
  }

  return item.classroom_name;
}

function getViewerDashboardData(entries) {
  const orderedEntries = sortScheduleEntries(entries);
  const filledItems = orderedEntries.filter((item) => item.actual_start_time || item.actual_end_time || item.is_skipped);
  const lastItem = filledItems.length > 0 ? filledItems[filledItems.length - 1] : null;
  const lastActionIndex = lastItem
    ? orderedEntries.findIndex((item) => String(item.subject_schedule_id) === String(lastItem.subject_schedule_id))
    : -1;
  const nextItem = lastActionIndex >= 0 ? orderedEntries[lastActionIndex + 1] || null : orderedEntries[0] || null;
  const isLastBreak = lastItem ? isBreakItem(lastItem) : false;
  const isNextBreak = nextItem ? isBreakItem(nextItem) : false;
  const isNextFreePeriod = nextItem ? isFreePeriodItem(nextItem) : false;
  const isActionEnd = lastItem ? Boolean(lastItem.actual_end_time) || lastItem.is_skipped : false;
  const currentDelayMinutes = getCurrentDelayMinutes(orderedEntries, lastActionIndex);

  let delayText = 'ตรงเวลา';
  let delayTone = 'success';
  let lastActionText = '-';

  if (lastItem) {
    const status = calculateViewerStatus(
      isActionEnd ? lastItem.scheduled_end_time : lastItem.scheduled_start_time,
      isActionEnd ? lastItem.actual_end_time : lastItem.actual_start_time,
      lastItem.is_skipped,
      isActionEnd,
    );

    delayText = lastItem.is_skipped && status.status === 'skipped-waiting' ? 'ผ่าน (รอระบุเวลา)' : status.text;
    delayTone = status.status === 'late'
      ? 'danger'
      : status.status === 'early'
        ? 'info'
        : status.status === 'skipped' || status.status === 'skipped-waiting'
          ? 'skip'
          : 'success';

    if (lastItem.is_skipped) {
      lastActionText = lastItem.actual_end_time ? `ผ่านคาบ ${normalizeTime(lastItem.actual_end_time)}` : 'ไม่มีการเรียนการสอน';
    } else {
      lastActionText = isActionEnd
        ? `${isLastBreak ? 'หมดพัก' : 'จบคาบ'} ${normalizeTime(lastItem.actual_end_time)}`
        : `${isLastBreak ? 'เริ่มพัก' : 'เข้าเรียน'} ${normalizeTime(lastItem.actual_start_time)}`;
    }
  }

  let currentStatusText = 'ยังไม่เริ่มเรียน';
  let currentStatusColor = 'bg-slate-400';

  if (lastItem) {
    if (isActionEnd && !nextItem) {
      currentStatusText = 'สิ้นสุดตารางเรียนวันนี้';
      currentStatusColor = 'bg-emerald-500';
    } else if (lastItem.is_skipped) {
      currentStatusText = 'สถานะ: ผ่านคาบเรียน';
      currentStatusColor = 'bg-purple-500';
    } else if (isActionEnd) {
      currentStatusText = isNextBreak ? 'รอเวลาพัก' : isNextFreePeriod ? 'รอคาบว่างถัดไป' : 'รอเรียนคาบถัดไป';
      currentStatusColor = 'bg-amber-400';
    } else {
      currentStatusText = isLastBreak ? 'กำลังพัก' : 'กำลังเรียน';
      currentStatusColor = isLastBreak ? 'bg-sky-400' : 'bg-rose-500';
    }
  }

  let card2Title = isNextBreak ? 'เวลาพักถัดไป' : isNextFreePeriod ? 'คาบว่างถัดไป' : 'คาบเรียนถัดไป';
  let card2Subject = nextItem ? nextItem.display_title || nextItem.subject_name : 'จบตารางเรียนของวันนี้';
  let card2Item = nextItem;
  let card2Time = nextItem
    ? `เวลา ${normalizeTime(nextItem.scheduled_start_time)} - ${normalizeTime(nextItem.scheduled_end_time)}`
    : 'เดินทางกลับบ้านโดยสวัสดิภาพ';
  let card2Tone = 'default';

  if (nextItem && lastItem && currentDelayMinutes !== 0) {
    const projectedStart = formatMinutes(toMinutes(nextItem.scheduled_start_time) + currentDelayMinutes);
    const projectedEnd = formatMinutes(toMinutes(nextItem.scheduled_end_time) + currentDelayMinutes);
    const delayLabel = currentDelayMinutes > 0
      ? `ช้า ${currentDelayMinutes} นาที`
      : `เร็ว ${Math.abs(currentDelayMinutes)} นาที`;
    card2Time = `เวลา ${projectedStart} - ${projectedEnd} (${delayLabel})`;
  }

  if (isActionEnd && !nextItem) {
    card2Title = 'สรุปสถานะตารางเรียน';
    card2Subject = 'สิ้นสุดการติดตามวันนี้';
    card2Item = null;
    card2Time = 'ไม่มีคาบถัดไป';
    card2Tone = 'success';
  } else if (lastItem && !isActionEnd && !isLastBreak && !lastItem.is_skipped) {
    const activeDelayMinutes = toMinutes(lastItem.actual_start_time) - toMinutes(lastItem.scheduled_start_time);
    const projectedEndTime = formatMinutes(toMinutes(lastItem.scheduled_end_time) + activeDelayMinutes);
    card2Title = 'เวลาหมดคาบนี้';
    card2Subject = lastItem.display_title || lastItem.subject_name;
    card2Item = lastItem;
    card2Time = activeDelayMinutes === 0
      ? `เวลา ${projectedEndTime}`
      : `เวลา ${projectedEndTime} (${activeDelayMinutes > 0 ? `ช้า ${activeDelayMinutes}` : `เร็ว ${Math.abs(activeDelayMinutes)}`} นาที)`;
    card2Tone = 'warning';
  }

  return {
    lastItem,
    nextItem,
    lastActionIndex,
    delayText,
    delayTone,
    lastActionText,
    currentStatusText,
    currentStatusColor,
    isActionEnd,
    isLastBreak,
    isNextBreak,
    currentDelayMinutes,
    card2: {
      title: card2Title,
      subject: card2Subject,
      item: card2Item,
      time: card2Time,
      tone: card2Tone,
    },
  };
}

function getViewerTimelineMeta(item, dashboardData) {
  if (isFreePeriodItem(item)) {
    return {
      isCompleted: false,
      isStarted: false,
      isPending: false,
      timeLabel: 'คาบว่าง',
      displayTime: normalizeTime(item.scheduled_start_time) || '-',
      statusText: item.note || 'ไม่มีคาบเรียนของครู',
      statusColor: 'text-slate-400',
      dotColorClass: 'border-slate-300',
    };
  }

  const isCompleted = Boolean(item.actual_end_time) || item.is_skipped;
  const isStarted = Boolean(item.actual_start_time) && !item.actual_end_time && !item.is_skipped;
  const isPending = !item.actual_start_time && !item.actual_end_time && !item.is_skipped;
  const endStatus = calculateViewerStatus(item.scheduled_end_time, item.actual_end_time, item.is_skipped, true);

  let timeLabel = 'กำหนดเริ่ม';
  let displayTime = normalizeTime(item.scheduled_start_time);
  let statusText = '';
  let statusColor = 'text-slate-400';
  let dotColorClass = 'border-slate-200';

  if (isCompleted) {
    if (item.is_skipped) {
      timeLabel = 'ผ่านคาบ';
      displayTime = normalizeTime(item.actual_end_time) || normalizeTime(item.scheduled_end_time) || '-';
      statusText = endStatus.status === 'waiting' || endStatus.status === 'skipped-waiting' ? 'ไม่มีการเรียน' : endStatus.text.replace(' (ผ่าน)', '');
      statusColor = endStatus.status === 'late'
        ? 'text-rose-500'
        : endStatus.status === 'early'
          ? 'text-sky-500'
          : 'text-purple-600';
      dotColorClass = 'border-purple-500';
    } else {
      timeLabel = isBreakItem(item) ? 'หมดพักจริง' : 'เลิกเรียนจริง';
      displayTime = normalizeTime(item.actual_end_time) || '-';
      statusText = endStatus.status === 'ontime' ? 'ตรงเวลา' : endStatus.text;
      statusColor = endStatus.status === 'late'
        ? 'text-rose-500'
        : endStatus.status === 'early'
          ? 'text-sky-500'
          : 'text-emerald-600';
      dotColorClass = endStatus.status === 'late'
        ? 'border-rose-500'
        : endStatus.status === 'early'
          ? 'border-sky-500'
          : 'border-emerald-500';
    }
  } else if (isStarted) {
    timeLabel = isBreakItem(item) ? 'กำลังพัก' : 'กำลังเรียน';
    const startDelay = toMinutes(item.actual_start_time) - toMinutes(item.scheduled_start_time);
    displayTime = normalizeTime(item.actual_start_time) || normalizeTime(item.scheduled_start_time) || '-';
    statusText = startDelay === 0
      ? 'เริ่มตรงเวลา'
      : startDelay > 0
        ? `เริ่มช้า ${startDelay} นาที`
        : `เริ่มเร็ว ${Math.abs(startDelay)} นาที`;
    statusColor = startDelay === 0 ? 'text-emerald-600' : startDelay > 0 ? 'text-rose-500' : 'text-sky-500';
    dotColorClass = startDelay === 0 ? 'border-emerald-500' : startDelay > 0 ? 'border-rose-500' : 'border-sky-500';
  } else if (isPending && dashboardData.lastActionIndex >= 0) {
    timeLabel = 'คาดการณ์เริ่ม';
    if (dashboardData.currentDelayMinutes !== 0) {
      displayTime = formatMinutes(toMinutes(item.scheduled_start_time) + dashboardData.currentDelayMinutes);
      statusText = dashboardData.currentDelayMinutes > 0
        ? `ช้า ${dashboardData.currentDelayMinutes} นาที`
        : `เร็ว ${Math.abs(dashboardData.currentDelayMinutes)} นาที`;
      statusColor = dashboardData.currentDelayMinutes > 0 ? 'text-rose-500' : 'text-sky-500';
    }
  }

  return {
    isCompleted,
    isStarted,
    isPending,
    timeLabel,
    displayTime,
    statusText,
    statusColor,
    dotColorClass,
  };
}

function DailySubjectTrackingBoard({
  endpointPath,
  viewerScheduleEndpointPath = '',
  combineViewerGroups = false,
  canEdit = false,
  academicYear = '',
  semester = '',
  title,
  description,
  emptyMessage,
  toolbar = null,
}) {
  const [trackingDate, setTrackingDate] = useState(() => formatDateInput());
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, slotGroup: null });
  const [holidaySaving, setHolidaySaving] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadTracking = async () => {
      if (!endpointPath || !trackingDate) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('date', trackingDate);
        if (academicYear) params.set('academic_year', academicYear);
        if (semester) params.set('semester', semester);

        if (!canEdit && viewerScheduleEndpointPath) {
          const trackingUrl = `${API_BASE_URL}${endpointPath}?${params.toString()}`;
          const scheduleUrl = `${API_BASE_URL}${viewerScheduleEndpointPath}${params.toString() ? `?${params.toString()}` : ''}`;

          const [trackingResponse, scheduleResponse] = await Promise.all([
            fetch(trackingUrl),
            fetch(scheduleUrl),
          ]);
          const [trackingData, scheduleData] = await Promise.all([
            trackingResponse.json().catch(() => []),
            scheduleResponse.json().catch(() => []),
          ]);

          if (!isActive) return;

          if (!scheduleResponse.ok || !Array.isArray(scheduleData)) {
            setItems([]);
            toast.error(scheduleData?.detail || 'โหลดตารางเรียนสำหรับหน้าผู้ดูไม่สำเร็จ');
          } else {
            if (!trackingResponse.ok && trackingData?.detail) {
              toast.error(trackingData.detail);
            }
            setItems(buildViewerItems(Array.isArray(trackingData) ? trackingData : [], scheduleData, trackingDate));
          }
        } else {
          const response = await fetch(`${API_BASE_URL}${endpointPath}?${params.toString()}`);
          const data = await response.json();

          if (!isActive) return;

          if (response.ok && Array.isArray(data)) {
            setItems(data);
          } else {
            setItems([]);
            toast.error(data?.detail || 'โหลดข้อมูลติดตามเวลาเรียนไม่สำเร็จ');
          }
        }
      } catch (error) {
        if (isActive) {
          setItems([]);
          toast.error('เชื่อมต่อข้อมูลติดตามเวลาเรียนไม่สำเร็จ');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadTracking();
    return () => {
      isActive = false;
    };
  }, [endpointPath, viewerScheduleEndpointPath, canEdit, academicYear, semester, trackingDate, refreshKey]);

  useEffect(() => {
    const nextDrafts = {};
    items.forEach((item) => {
      nextDrafts[item.subject_schedule_id] = buildDraftFromItem(item);
    });
    setDrafts(nextDrafts);
  }, [items]);

  const holidayItem = useMemo(() => items.find((item) => isHolidayItem(item)) || null, [items]);

  const summary = useMemo(() => {
    if (holidayItem) {
      return { total: 0, updated: 0, completed: 0, pending: 0 };
    }

    if (canEdit) {
      const slotGroups = buildAdminTimeSlotGroups(items);

      return {
        total: slotGroups.length,
        updated: slotGroups.filter(({ entries }) => entries.some((item) => item.actual_start_time || item.actual_end_time || item.is_skipped)).length,
        completed: slotGroups.filter(({ entries }) => entries.some((item) => item.actual_end_time || item.is_skipped)).length,
        pending: slotGroups.filter(({ entries }) => entries.every((item) => !item.actual_start_time && !item.actual_end_time && !item.is_skipped)).length,
      };
    }

    const viewerSummaryItems = items.filter((item) => !item.is_free_period);
    const total = viewerSummaryItems.length;
    const updated = viewerSummaryItems.filter((item) => item.actual_start_time || item.actual_end_time || item.is_skipped).length;
    const completed = viewerSummaryItems.filter((item) => item.actual_end_time || item.is_skipped).length;
    const pending = viewerSummaryItems.filter((item) => !item.actual_start_time && !item.actual_end_time && !item.is_skipped).length;
    return { total, updated, completed, pending };
  }, [items, canEdit, holidayItem]);

  const groupedItems = useMemo(() => {
    if (!canEdit) {
      return buildViewerGroups(items, combineViewerGroups);
    }

    const groups = new Map();

    items.forEach((item) => {
      const key = item.classroom_name || 'ไม่ระบุชั้นเรียน';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });

    return [...groups.entries()].map(([groupName, entries]) => ({ groupName, entries }));
  }, [items, canEdit, combineViewerGroups]);

  const adminTimeSlotGroups = useMemo(() => {
    if (!canEdit || holidayItem) {
      return [];
    }

    return buildAdminTimeSlotGroups(items);
  }, [items, canEdit, holidayItem]);

  const slotEntriesMap = useMemo(() => {
    const map = new Map();
    adminTimeSlotGroups.forEach((group) => {
      map.set(group.key, group.entries);
    });
    return map;
  }, [adminTimeSlotGroups]);

  const getDraft = (item) => drafts[item.subject_schedule_id] || buildDraftFromItem(item);

  const getItemsInSameSlot = (item) => slotEntriesMap.get(getAdminTimeSlotKey(item)) || [item];

  const setDraftValuesForItems = (targetItems, updates) => {
    setDrafts((current) => {
      const next = { ...current };

      targetItems.forEach((targetItem) => {
        next[targetItem.subject_schedule_id] = {
          ...buildDraftFromItem(targetItem),
          ...(next[targetItem.subject_schedule_id] || {}),
          ...updates,
        };
      });

      return next;
    });
  };

  const markSaving = (subjectScheduleIds) => {
    const normalizedIds = subjectScheduleIds.map((id) => String(id));
    setSavingIds((current) => [...new Set([...current, ...normalizedIds])]);
  };

  const clearSaving = (subjectScheduleIds) => {
    const normalizedIds = new Set(subjectScheduleIds.map((id) => String(id)));
    setSavingIds((current) => current.filter((id) => !normalizedIds.has(id)));
  };

  const applyUpdatedItems = (updatedItems) => {
    const updatedMap = new Map(updatedItems.map((entry) => [String(entry.subject_schedule_id), entry]));

    setItems((current) => current.map((entry) => updatedMap.get(String(entry.subject_schedule_id)) || entry));
    setDrafts((current) => {
      const next = { ...current };
      updatedItems.forEach((entry) => {
        next[entry.subject_schedule_id] = buildDraftFromItem(entry);
      });
      return next;
    });
  };

  const saveDraftsForItems = async (targetItems, draftOverridesById = {}) => {
    if (!canEdit) return;

    const editableItems = targetItems;
    if (editableItems.length === 0) return;

    const subjectScheduleIds = editableItems.map((item) => item.subject_schedule_id);
    markSaving(subjectScheduleIds);

    try {
      const response = await fetch(`${API_BASE_URL}/schedule/tracking/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_date: trackingDate,
          updates: editableItems.map((item) => {
            const mergedDraft = {
              ...getDraft(item),
              ...(draftOverridesById[item.subject_schedule_id] || {}),
            };

            return {
              ...(item.is_break
                ? { break_schedule_id: item.break_schedule_id }
                : { subject_schedule_id: item.subject_schedule_id }),
              actual_start_time: mergedDraft.actual_start_time || null,
              actual_end_time: mergedDraft.actual_end_time || null,
              is_skipped: Boolean(mergedDraft.is_skipped),
              note: (mergedDraft.note || '').trim() || null,
            };
          }),
        }),
      });

      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.detail || 'บันทึกเวลาเรียนไม่สำเร็จ');
      }

      applyUpdatedItems(data);
    } catch (error) {
      toast.error(error.message || 'บันทึกเวลาเรียนไม่สำเร็จ');
    } finally {
      clearSaving(subjectScheduleIds);
    }
  };

  const handleAutoSaveField = async (item, field, value, applyToSameSlot = false) => {
    const targetItems = applyToSameSlot ? getItemsInSameSlot(item) : [item];
    const overrides = Object.fromEntries(
      targetItems.map((targetItem) => [targetItem.subject_schedule_id, { [field]: value }])
    );
    setDraftValuesForItems(targetItems, { [field]: value });
    await saveDraftsForItems(targetItems, overrides);
  };

  const handleDraftChange = (item, field, value, applyToSameSlot = false) => {
    const targetItems = applyToSameSlot ? getItemsInSameSlot(item) : [item];
    setDraftValuesForItems(targetItems, { [field]: value });
  };

  const handleSetNowAndSave = async (item, field, applyToSameSlot = false) => {
    const now = new Date();
    const value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    await handleAutoSaveField(item, field, value, applyToSameSlot);
  };

  const handleDeleteSlot = async (slotGroup) => {
    if (!canEdit || !slotGroup) return;

    const editableItems = slotGroup.entries;
    if (editableItems.length === 0) return;

    const subjectScheduleIds = editableItems.map((item) => item.subject_schedule_id);
    markSaving(subjectScheduleIds);

    try {
      const response = await fetch(`${API_BASE_URL}/schedule/tracking/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_date: trackingDate,
          updates: editableItems.map((item) => ({
            ...(item.is_break
              ? { break_schedule_id: item.break_schedule_id }
              : { subject_schedule_id: item.subject_schedule_id }),
            actual_start_time: null,
            actual_end_time: null,
            is_skipped: false,
            note: null,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.detail || 'ลบเวลาไม่สำเร็จ');
      }

      applyUpdatedItems(data);
      toast.success('ลบเวลาเรียนสำเร็จ');
    } catch (error) {
      toast.error(error.message || 'ลบเวลาไม่สำเร็จ');
    } finally {
      clearSaving(subjectScheduleIds);
      setDeleteConfirm({ open: false, slotGroup: null });
    }
  };

  const handleCreateHoliday = async () => {
    if (!canEdit || holidaySaving) return;

    setHolidaySaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holiday_date: trackingDate,
          note: 'วันหยุดเรียนเฉพาะวันที่เลือก',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || 'ตั้งวันหยุดเรียนไม่สำเร็จ');
      }

      toast.success('ตั้งวันหยุดเรียนสำเร็จ');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error.message || 'ตั้งวันหยุดเรียนไม่สำเร็จ');
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!canEdit || !holidayItem?.holiday_id || holidaySaving) return;

    setHolidaySaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/holidays/${holidayItem.holiday_id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || 'ยกเลิกวันหยุดเรียนไม่สำเร็จ');
      }

      toast.success('ยกเลิกวันหยุดเรียนสำเร็จ');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error.message || 'ยกเลิกวันหยุดเรียนไม่สำเร็จ');
    } finally {
      setHolidaySaving(false);
    }
  };

  if (!canEdit) {
    return (
      <section className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-sky-700">
                <CalendarDays className="h-4 w-4" />
                Viewer Mode
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-800">{title}</h3>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">{description}</p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              {toolbar ? <div className="flex flex-wrap gap-2">{toolbar}</div> : null}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  <CalendarDays className="h-4 w-4 text-sky-600" />
                  <input
                    type="date"
                    value={trackingDate}
                    onChange={(event) => setTrackingDate(event.target.value)}
                    className="bg-transparent text-slate-700 outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6">
            {[1, 2].map((key) => (
              <div key={key} className="space-y-4 animate-pulse">
                <div className="h-56 rounded-[28px] bg-slate-100" />
                <div className="h-20 rounded-[24px] bg-slate-900/90" />
                <div className="h-96 rounded-[28px] bg-slate-100" />
              </div>
            ))}
          </div>
        ) : holidayItem ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Ban className="h-10 w-10" />
            </div>
            <h4 className="mt-5 text-xl font-black text-amber-800">วันหยุดเรียน</h4>
            <p className="mt-3 text-base font-medium text-amber-700">{formatThaiDate(trackingDate)}</p>
            <p className="mt-4 text-sm font-medium text-amber-700">{holidayItem.note || 'วันนี้เป็นวันหยุดเรียนเฉพาะวันที่เลือกไว้'}</p>
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h4 className="mt-5 text-xl font-black text-slate-700">{emptyMessage}</h4>
            <p className="mt-2 text-sm font-medium text-slate-400">ลองเปลี่ยนวันที่หรือปีการศึกษา/ภาคเรียน แล้วโหลดข้อมูลอีกครั้ง</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedItems.map(({ groupName, entries }, groupIndex) => {
              const dashboardData = getViewerDashboardData(entries);
              const representativeItem = entries.find((item) => !item.is_break) || entries[0];
              const toneClass = dashboardData.delayTone === 'danger'
                ? 'text-rose-600'
                : dashboardData.delayTone === 'info'
                  ? 'text-sky-600'
                  : dashboardData.delayTone === 'skip'
                    ? 'text-purple-600'
                    : 'text-emerald-600';
              const cardToneClass = dashboardData.card2.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
                : dashboardData.card2.tone === 'warning'
                  ? 'border-orange-200 bg-orange-50/70 text-orange-700'
                  : 'border-slate-200 bg-slate-50/60 text-slate-700';
              const liveStatusLastClassroom = getViewerLiveStatusClassroomName(dashboardData.lastItem, combineViewerGroups);
              const liveStatusNextClassroom = getViewerLiveStatusClassroomName(dashboardData.card2.item, combineViewerGroups);

              return (
                <div key={`${groupName}-${groupIndex}`} className="space-y-4">
                  <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2 font-medium">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        <span>Live Schedule Status</span>
                      </div>
                      <div className="font-mono text-xs text-slate-400">อัปเดตล่าสุด: {formatFullDateTime(currentTime)}</div>
                    </div>

                    <div className="p-6">
                      <div className="mb-6 flex flex-col items-start justify-between gap-6 border-b border-slate-100 pb-6 md:flex-row md:items-center">
                        <div>
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                            <School className="h-4 w-4" />
                            <span>{groupName}</span>
                          </div>
                          <h2 className="mb-1 text-2xl font-bold text-slate-800">{representativeItem?.academic_year ? `ปีการศึกษา ${representativeItem.academic_year}` : 'ตารางติดตามเวลาเรียน'}</h2>
                          <p className="flex items-center gap-1.5 text-sm text-slate-500">
                            <CalendarDays className="h-4 w-4" />
                            <span>ประจำวันที่ {formatShortDate(trackingDate)}{representativeItem?.semester ? ` · ภาคเรียนที่ ${representativeItem.semester}` : ''}</span>
                          </p>
                        </div>

                        <div className="w-full min-w-[240px] rounded-xl border border-slate-200 bg-slate-50 p-4 md:w-auto">
                          {dashboardData.lastItem ? (
                            <>
                              <div className={`mb-2 flex items-center gap-2 text-lg font-bold ${toneClass}`}>
                                {dashboardData.delayTone === 'danger' ? (
                                  <AlertCircle className="h-5 w-5" />
                                ) : dashboardData.delayTone === 'info' ? (
                                  <Clock className="h-5 w-5" />
                                ) : (
                                  <CheckCircle2 className="h-5 w-5" />
                                )}
                                <span>{dashboardData.delayText}</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                                <span className="relative flex h-3 w-3">
                                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dashboardData.currentStatusColor}`}></span>
                                  <span className={`relative inline-flex h-3 w-3 rounded-full ${dashboardData.currentStatusColor}`}></span>
                                </span>
                                <span>{dashboardData.currentStatusText}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 font-medium text-slate-500">
                              <Clock className="h-4 w-4" />
                              <span>รอเวลาเข้าเรียน</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className={`rounded-xl border p-6 ${dashboardData.lastItem?.is_skipped ? 'border-purple-200 bg-purple-50/50' : 'border-blue-100 bg-blue-50/40'}`}>
                          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                            <Clock className={`h-4 w-4 ${dashboardData.lastItem?.is_skipped ? 'text-purple-500' : 'text-blue-500'}`} />
                            <span>กิจกรรมล่าสุด</span>
                          </div>
                          <div className="mb-4 text-2xl font-bold text-slate-800">{dashboardData.lastItem?.display_title || 'ยังไม่เริ่มเรียน'}</div>
                          {liveStatusLastClassroom ? (
                            <div className="mb-4 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                              ชั้นเรียน {liveStatusLastClassroom}
                            </div>
                          ) : null}
                          {dashboardData.lastItem ? (
                            dashboardData.isActionEnd && !dashboardData.lastItem.is_skipped ? (
                              <div className="flex w-full items-center justify-between rounded-lg border border-blue-100/50 bg-white/60 px-4 py-2">
                                <div className="flex flex-col items-start">
                                  <span className="text-xs font-medium text-slate-500">{dashboardData.isLastBreak ? 'เริ่มพัก (จริง)' : 'เวลาเข้า (จริง)'}</span>
                                  <span className="text-lg font-bold text-blue-700">{normalizeTime(dashboardData.lastItem.actual_start_time) || '-'}</span>
                                </div>
                                <div className="h-6 w-px bg-blue-200/60"></div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-medium text-slate-500">{dashboardData.isLastBreak ? 'หมดพัก (จริง)' : 'เวลาออก (จริง)'}</span>
                                  <span className="text-lg font-bold text-blue-700">{normalizeTime(dashboardData.lastItem.actual_end_time) || '-'}</span>
                                </div>
                              </div>
                            ) : (
                              <div className={`inline-block rounded-lg border bg-white/60 px-3 py-1.5 text-base font-semibold ${dashboardData.lastItem.is_skipped ? 'border-purple-100 text-purple-700' : 'border-blue-100 text-blue-700'}`}>
                                {dashboardData.lastActionText}
                              </div>
                            )
                          ) : (
                            <div className="text-base font-semibold text-slate-400">-</div>
                          )}
                        </div>

                        <div className={`rounded-xl border p-6 ${cardToneClass}`}>
                          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            <span>{dashboardData.card2.title}</span>
                          </div>
                          <div className="mb-2 text-2xl font-bold">{dashboardData.card2.subject}</div>
                          {liveStatusNextClassroom ? (
                            <div className="mb-2 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                              ชั้นเรียน {liveStatusNextClassroom}
                            </div>
                          ) : null}
                          <div className="text-sm font-medium">{dashboardData.card2.time}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-800 bg-slate-900 px-6 py-5 text-slate-100 shadow-xl shadow-slate-950/20">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-yellow-400 p-3 text-slate-900 shadow-lg shadow-yellow-400/20">
                          <Clock className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold uppercase tracking-[0.18em] text-yellow-400 md:text-3xl">Class Schedule Board</h3>
                          <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                            <CalendarDays className="h-4 w-4" />
                            <span>ระบบติดตามเวลาเรียนเทียบตารางเวลามาตรฐาน</span>
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-indigo-900/30">
                        <Eye className="h-4 w-4" />
                        <span>โหมดผู้ดู</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 text-slate-800 shadow-lg md:p-8">
                    <div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 text-slate-800">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-xl font-bold">ไทม์ไลน์ตารางเรียน</h3>
                    </div>

                    <div className="relative pt-2 md:pl-4">

                      {entries.map((item, index) => {
                        const timelineMeta = getViewerTimelineMeta(item, dashboardData);

                        return (
                          <div key={`${item.subject_schedule_id}-${groupIndex}-${index}`} className="group flex min-h-[95px]">
                            <div className="w-24 flex-shrink-0 pr-4 pt-0.5 text-right md:w-32 md:pr-6">
                              <div className={`mb-1 text-xs font-medium uppercase tracking-wide ${timelineMeta.isStarted ? 'text-indigo-500' : 'text-slate-400'}`}>{timelineMeta.timeLabel}</div>
                              <div className={`text-2xl font-bold tracking-tight ${timelineMeta.isPending ? 'text-slate-400' : timelineMeta.isStarted ? 'text-indigo-600' : 'text-slate-700'}`}>{timelineMeta.displayTime || '-'}</div>
                              {timelineMeta.statusText ? (
                                <div className={`mt-1 text-[12px] font-bold ${timelineMeta.statusColor}`}>{timelineMeta.statusText}</div>
                              ) : null}
                            </div>

                            <div className="relative flex w-6 flex-col items-center">
                              {index !== entries.length - 1 ? (
                                <div className={`absolute top-[28px] h-[calc(100%+8px)] w-[3px] rounded-full transition-colors duration-300 ${timelineMeta.isCompleted ? 'bg-indigo-400' : 'bg-slate-100 group-hover:bg-slate-200'}`}></div>
                              ) : null}
                              <div className={`relative z-10 mt-1.5 h-[18px] w-[18px] rounded-full border-[3px] bg-white transition-colors duration-300 ${timelineMeta.dotColorClass}`}></div>
                            </div>

                            <div className="flex-grow pb-10 pl-4 pt-0.5 md:pl-8">
                              <div className="mb-1 flex flex-wrap items-center gap-3">
                                <h4 className={`text-xl font-bold ${timelineMeta.isPending ? 'text-slate-500' : 'text-slate-800'}`}>{item.display_title || item.subject_name}</h4>
                                {combineViewerGroups && item.classroom_name ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 shadow-sm">
                                    {item.classroom_name}
                                  </span>
                                ) : null}
                                {timelineMeta.isStarted ? (
                                  <span className="animate-pulse rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 shadow-sm">
                                    {isBreakItem(item) ? 'กำลังพัก / ปัจจุบัน' : 'กำลังเรียน / ปัจจุบัน'}
                                  </span>
                                ) : null}
                                {item.is_free_period ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 shadow-sm">
                                    คาบว่าง
                                  </span>
                                ) : null}
                                {item.is_skipped ? (
                                  <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-600 shadow-sm">
                                    ผ่านคาบ
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="font-medium text-slate-600">{item.period_label || (item.is_break ? 'เวลาพัก' : 'คาบเรียน')}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{normalizeTime(item.scheduled_start_time) || '-'} - {normalizeTime(item.scheduled_end_time) || '-'}</span>
                                </div>

                                {!item.is_skipped && item.actual_start_time && timelineMeta.isCompleted ? (
                                  <div className="mt-2 flex w-fit items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>เวลาเข้าจริง:</span>
                                    <span className="font-bold text-slate-700">{normalizeTime(item.actual_start_time)}</span>
                                  </div>
                                ) : null}

                                {!item.is_skipped && item.actual_start_time && timelineMeta.isStarted ? (
                                  <div className="mt-2 flex w-fit items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs text-indigo-600">
                                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>เวลาเข้าจริง:</span>
                                    <span className="font-bold">{normalizeTime(item.actual_start_time)}</span>
                                  </div>
                                ) : null}

                                {item.note ? (
                                  <div className="mt-2 flex w-fit items-center gap-1.5 rounded-lg border border-indigo-100/50 bg-indigo-50/50 px-3 py-2 text-xs font-medium text-indigo-700">
                                    <Info className="h-3.5 w-3.5 text-indigo-400" />
                                    <span>{item.note}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-sky-700">
              <CalendarDays className="h-4 w-4" />
              Daily Tracking
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-800">{title}</h3>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">{description}</p>
            <p className="mt-3 text-sm font-bold text-slate-400">วันที่เลือก: {formatThaiDate(trackingDate)}</p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            {toolbar ? <div className="flex flex-wrap gap-2">{toolbar}</div> : null}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                <CalendarDays className="h-4 w-4 text-sky-600" />
                <input
                  type="date"
                  value={trackingDate}
                  onChange={(event) => setTrackingDate(event.target.value)}
                  className="bg-transparent text-slate-700 outline-none"
                />
              </label>
              <button
                type="button"
                onClick={holidayItem ? handleDeleteHoliday : handleCreateHoliday}
                disabled={holidaySaving || loading}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${holidayItem
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Ban className={`h-4 w-4 ${holidaySaving ? 'animate-pulse' : ''}`} />
                {holidayItem ? 'ยกเลิกวันหยุด' : 'ตั้งเป็นวันหยุด'}
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
            </div>
          </div>
        </div>

        {holidayItem ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Ban className="h-4 w-4" />
              <span>วันที่ {formatThaiDate(trackingDate)} ถูกตั้งเป็นวันหยุดเรียนเฉพาะวันที่เลือก ระบบจะซ่อนคาบติดตามของวันนั้นไว้ชั่วคราวจนกว่าจะยกเลิกวันหยุด</span>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">คาบวันนี้</p>
              <p className="mt-3 text-3xl font-black text-slate-800">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-500">เริ่มบันทึกแล้ว</p>
              <p className="mt-3 text-3xl font-black text-sky-700">{summary.updated}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-500">จบหรือผ่านคาบ</p>
              <p className="mt-3 text-3xl font-black text-emerald-700">{summary.completed}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">รออัปเดต</p>
              <p className="mt-3 text-3xl font-black text-amber-700">{summary.pending}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((key) => (
            <div key={key} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-4 w-40 rounded-full bg-slate-200" />
              <div className="mt-4 h-8 w-72 rounded-full bg-slate-200" />
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="h-24 rounded-2xl bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : holidayItem ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Ban className="h-10 w-10" />
          </div>
          <h4 className="mt-5 text-xl font-black text-amber-800">วันหยุดเรียน</h4>
          <p className="mt-3 text-base font-medium text-amber-700">{formatThaiDate(trackingDate)}</p>
          <p className="mt-4 text-sm font-medium text-amber-700">{holidayItem.note || 'วันนี้เป็นวันหยุดเรียนเฉพาะวันที่เลือกไว้'}</p>
        </div>
      ) : adminTimeSlotGroups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h4 className="mt-5 text-xl font-black text-slate-700">{emptyMessage}</h4>
          <p className="mt-2 text-sm font-medium text-slate-400">ลองเปลี่ยนวันที่หรือปีการศึกษา/ภาคเรียน แล้วโหลดข้อมูลอีกครั้ง</p>
        </div>
      ) : (
        <div className="space-y-6">
          {adminTimeSlotGroups.length > 0 ? (
            <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-5 text-sm font-medium text-sky-800 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>เมื่อกรอกเวลาในคาบเดียวกัน ระบบจะบันทึกอัตโนมัติและใช้กับทุกชั้นที่อยู่ช่วงเวลาเดียวกันทันที</span>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            {adminTimeSlotGroups.map((slotGroup) => {
              const representativeItem = slotGroup.entries[0];
              const slotDraft = getDraft(representativeItem);
              const displayItem = {
                ...representativeItem,
                actual_start_time: slotDraft.actual_start_time || null,
                actual_end_time: slotDraft.actual_end_time || null,
                is_skipped: Boolean(slotDraft.is_skipped),
                note: slotDraft.note,
              };
              const status = calculateViewerStatus(
                representativeItem.actual_end_time ? representativeItem.scheduled_end_time : representativeItem.scheduled_start_time,
                representativeItem.actual_end_time ? representativeItem.actual_end_time : representativeItem.actual_start_time,
                displayItem.is_skipped,
                Boolean(representativeItem.actual_end_time),
              );
              const isSaving = slotGroup.entries.some((entry) => savingIds.includes(String(entry.subject_schedule_id)));
              const classroomLabels = uniqLabels(slotGroup.entries.map((entry) => entry.classroom_name));
              const subjectLabels = uniqLabels(slotGroup.entries.map((entry) => entry.display_title || entry.subject_name));
              const teacherLabels = uniqLabels(slotGroup.entries.map((entry) => entry.teacher_name));
              const slotScopeLabels = uniqLabels(slotGroup.entries.map((entry) => entry.scope_label));

              return (
                <article key={slotGroup.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-sky-600 px-3 py-1 text-sm font-black text-white shadow-sm">{slotGroup.periodLabel}</span>
                        <h5 className="text-xl font-black text-slate-800">{slotGroup.label}</h5>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
                          {slotGroup.isBreakGroup ? 'ช่วงเวลาพัก' : `${slotGroup.entries.length} ห้องเรียน`}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {normalizeTime(representativeItem.scheduled_start_time) || '-'} - {normalizeTime(representativeItem.scheduled_end_time) || '-'}
                        </span>
                        {teacherLabels.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                            <User className="h-4 w-4 text-slate-400" />
                            ครู {teacherLabels.length} คน
                          </span>
                        ) : null}
                        {slotScopeLabels.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                            <Info className="h-4 w-4 text-slate-400" />
                            {slotScopeLabels.join(', ')}
                          </span>
                        ) : null}
                      </div>

                      {classroomLabels.length > 0 ? (
                        <div className="mt-4">
                          <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">ชั้นเรียนในคาบนี้</div>
                          <div className="flex flex-wrap gap-2">
                            {classroomLabels.map((classroomName) => (
                              <span key={`${slotGroup.key}-${classroomName}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                                <School className="h-3.5 w-3.5 text-slate-400" />
                                {classroomName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {subjectLabels.length > 0 ? (
                        <div className="mt-3 text-sm text-slate-500">
                          <span className="font-bold text-slate-600">{slotGroup.isBreakGroup ? 'ช่วงเวลานี้:' : 'รายวิชาที่อยู่ในคาบนี้:'}</span> {subjectLabels.join(', ')}
                        </div>
                      ) : null}
                    </div>

                    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${status.className}`}>
                      {displayItem.is_skipped ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      {status.text}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    <span>Auto-save ทั้งคาบเวลาเดียวกัน</span>
                    {isSaving ? (
                      <span className="inline-flex items-center gap-2 text-sky-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังบันทึก
                      </span>
                    ) : (
                      <span className="text-emerald-600">บันทึกทันทีเมื่อเปลี่ยนค่า</span>
                    )}
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr_0.8fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">เวลาในตาราง</p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">เลขคาบ</p>
                          <p className="text-xl font-black text-slate-800">{slotGroup.periodLabel}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">ช่วงเวลา</p>
                          <p className="text-xl font-black text-slate-800">{slotGroup.label}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">เวลาเข้าจริง</p>
                      <div className="mt-4 flex gap-2">
                        <input
                          type="time"
                          value={slotDraft.actual_start_time}
                          disabled={slotDraft.is_skipped}
                          onChange={(event) => handleDraftChange(representativeItem, 'actual_start_time', event.target.value, true)}
                          onBlur={(event) => handleAutoSaveField(representativeItem, 'actual_start_time', event.target.value, true)}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-500/20 ${slotDraft.is_skipped ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-white text-slate-700'}`}
                        />
                        <button
                          type="button"
                          disabled={slotDraft.is_skipped}
                          onClick={() => handleSetNowAndSave(representativeItem, 'actual_start_time', true)}
                          className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-black text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          ตอนนี้
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">เวลาเลิกจริง</p>
                      <div className="mt-4 flex gap-2">
                        <input
                          type="time"
                          value={slotDraft.actual_end_time}
                          onChange={(event) => handleDraftChange(representativeItem, 'actual_end_time', event.target.value, true)}
                          onBlur={(event) => handleAutoSaveField(representativeItem, 'actual_end_time', event.target.value, true)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => handleSetNowAndSave(representativeItem, 'actual_end_time', true)}
                          className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-black text-sky-700 transition-colors hover:bg-sky-100"
                        >
                          ตอนนี้
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">สถานะคาบ</p>
                      <label className="mt-4 inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-black text-purple-700">
                        <input
                          type="checkbox"
                          checked={Boolean(slotDraft.is_skipped)}
                          onChange={(event) => handleAutoSaveField(representativeItem, 'is_skipped', event.target.checked, true)}
                          className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        ผ่านคาบ / ไม่มีการสอน
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">หมายเหตุของคาบนี้</label>
                    <input
                      type="text"
                      value={slotDraft.note}
                      onChange={(event) => handleDraftChange(representativeItem, 'note', event.target.value, true)}
                      onBlur={(event) => handleAutoSaveField(representativeItem, 'note', event.target.value, true)}
                      placeholder="บันทึกเหตุผลหรือรายละเอียดเพิ่มเติมของคาบนี้"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ open: true, slotGroup })}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      ลบเวลา
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-rose-100 p-4 text-rose-600">
                <AlertCircle className="h-8 w-8" />
              </div>
            </div>
            <h3 className="mt-6 text-center text-2xl font-black text-slate-800">ลบเวลาของคาบนี้</h3>
            <p className="mt-4 text-center text-sm font-medium text-slate-600">
              คุณต้องการลบเวลาเข้าและเลิกเรียนจริงของคาบนี้หรือไม่ วิธีนี้จะลบข้อมูลสำหรับทั้งชั้นเรียนที่อยู่ช่วงเวลาเดียวกัน
            </p>
            {deleteConfirm.slotGroup && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">คาบที่จะลบ:</p>
                <p className="mt-2 text-sm font-bold text-slate-700">{deleteConfirm.slotGroup.periodLabel} - {deleteConfirm.slotGroup.label}</p>
              </div>
            )}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ open: false, slotGroup: null })}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSlot(deleteConfirm.slotGroup)}
                disabled={slotEntriesMap.has(deleteConfirm.slotGroup?.key) && savingIds.some((id) => deleteConfirm.slotGroup?.entries.some((e) => String(e.subject_schedule_id) === id))}
                className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default DailySubjectTrackingBoard;
