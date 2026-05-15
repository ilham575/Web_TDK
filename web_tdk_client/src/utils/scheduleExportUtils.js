const DAY_NAMES = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

const SUBJECT_PALETTES = [
  { fill: '#EFF6FF', accent: '#3B82F6', text: '#1D4ED8', chip: '#DBEAFE' },
  { fill: '#ECFDF5', accent: '#10B981', text: '#047857', chip: '#D1FAE5' },
  { fill: '#FFF7ED', accent: '#F97316', text: '#C2410C', chip: '#FFEDD5' },
  { fill: '#FDF2F8', accent: '#EC4899', text: '#BE185D', chip: '#FCE7F3' },
  { fill: '#F5F3FF', accent: '#8B5CF6', text: '#6D28D9', chip: '#EDE9FE' },
  { fill: '#ECFEFF', accent: '#06B6D4', text: '#0F766E', chip: '#CFFAFE' },
];

const BREAK_PALETTE = {
  fill: '#FEF3C7',
  accent: '#F59E0B',
  text: '#92400E',
  chip: '#FFFBEB',
};

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let html2PdfLoader;
let excelJsLoader;

const loadHtml2Pdf = async () => {
  if (!html2PdfLoader) {
    html2PdfLoader = import('html2pdf.js/dist/html2pdf.bundle.min.js')
      .then((module) => module.default || module);
  }
  return html2PdfLoader;
};

const loadExcelJs = async () => {
  if (!excelJsLoader) {
    excelJsLoader = import('exceljs')
      .then((module) => module.default || module);
  }
  return excelJsLoader;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const normalizeText = (...values) => values
  .map((value) => (typeof value === 'string' ? value.trim() : value != null ? String(value) : ''))
  .find(Boolean) || '';

const formatTime = (value) => {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
};

const timeToMinutes = (value) => {
  const normalized = formatTime(value);
  if (!normalized) return Number.POSITIVE_INFINITY;
  const [hoursText, minutesText] = normalized.split(':');
  return (parseInt(hoursText, 10) * 60) + parseInt(minutesText, 10);
};

const normalizeDay = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const sortDayValue = (day) => {
  if (day === 0) return 7;
  return day ?? 99;
};

const hashSeed = (value) => {
  let hash = 0;
  const text = String(value || 'schedule');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickPalette = (seed, isBreak = false) => {
  if (isBreak) return BREAK_PALETTE;
  return SUBJECT_PALETTES[hashSeed(seed) % SUBJECT_PALETTES.length];
};

const toArgb = (hexColor) => `FF${String(hexColor || '#FFFFFF').replace('#', '').toUpperCase()}`;

const formatSemesterLabel = (semester, emptyLabel = 'Semua Penggal') => {
  if (semester === null || semester === undefined || semester === '') {
    return emptyLabel;
  }
  return `Penggal ${semester}`;
};

const sanitizeFileName = (value) => String(value || 'schedule')
  .replace(/[\\/:*?"<>|]/g, '_')
  .replace(/\s+/g, '_');

const sanitizeSheetName = (value, fallback = 'Sheet') => {
  const sanitized = String(value || fallback)
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim();
  return (sanitized || fallback).slice(0, 31);
};

const sortSchedules = (left, right) => {
  const dayCompare = sortDayValue(left.dayOfWeek) - sortDayValue(right.dayOfWeek);
  if (dayCompare !== 0) return dayCompare;
  const timeCompare = left.startMinutes - right.startMinutes;
  if (timeCompare !== 0) return timeCompare;
  return left.subjectName.localeCompare(right.subjectName, 'th');
};

const chunkItems = (items, chunkSize) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (!chunkSize || chunkSize <= 0) return [items];

  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const getOverviewRowsPerPage = (periodCount) => {
  if (periodCount >= 10) return 5;
  if (periodCount >= 8) return 6;
  return 7;
};

const isGlobalBreakEntry = (entry) => {
  if (!entry?.isBreak) return false;
  if (entry.classroomId !== null && entry.classroomId !== undefined && entry.classroomId !== '') {
    return false;
  }

  const normalizedScope = normalizeText(entry.scopeLabel).toLowerCase();
  if (!normalizedScope) return true;
  return ['semua kelas', 'all classes', 'ทุกชั้นเรียน'].includes(normalizedScope);
};

const filterTeacherExportEntries = (entries = []) => entries.filter(
  (entry) => !entry.isBreak || isGlobalBreakEntry(entry)
);

const normalizeSchedules = (schedules = []) => (
  schedules
    .map((item, index) => {
      const dayOfWeek = normalizeDay(item.day_of_week ?? item.day);
      const startTime = formatTime(item.start_time ?? item.startTime ?? item.start);
      const endTime = formatTime(item.end_time ?? item.endTime ?? item.end);
      const isBreak = Boolean(item?.is_break);
      const subjectName = isBreak
        ? normalizeText(item.subject_name, 'Rehat')
        : normalizeText(item.subject_name, item.subject?.name, item.name, 'Tiada Subjek');
      const teacherName = normalizeText(item.teacher_name, item.teacher?.name, item.teacher, item.teacher_full_name);
      const classroomName = normalizeText(item.classroom_name, item.classroom?.name, item.classroom);
      const note = normalizeText(item.note, item.remark, item.description, isBreak ? 'Rehat Semua Kelas' : '');
      const palette = pickPalette(`${subjectName}-${teacherName}-${classroomName}-${index}`, isBreak);

      return {
        id: item.id ?? `schedule-${index}`,
        dayOfWeek,
        dayName: dayOfWeek !== null ? (DAY_NAMES[dayOfWeek] || `Hari ${dayOfWeek}`) : 'Tiada Hari',
        startTime,
        endTime,
        startMinutes: timeToMinutes(startTime),
        endMinutes: timeToMinutes(endTime),
        timeLabel: startTime && endTime ? `${startTime} - ${endTime}` : '-',
        subjectName,
        teacherName,
        classroomName,
        classroomId: item.classroom_id ?? item.classroom?.id ?? null,
        note,
        isBreak,
        teacherId: item.teacher_id ?? null,
        subjectId: item.subject_id ?? null,
        palette,
        scopeLabel: normalizeText(item.scope_label, item.scope_name, isBreak ? 'Semua Kelas' : ''),
      };
    })
    .filter((item) => item.dayOfWeek !== null && item.startTime && item.endTime)
    .sort(sortSchedules)
);

const groupSchedulesByDay = (entries) => {
  const grouped = new Map();
  entries.forEach((entry) => {
    const key = entry.dayOfWeek;
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: entry.dayName,
        key,
        items: [],
      });
    }
    grouped.get(key).items.push(entry);
  });

  return [...grouped.values()].sort((left, right) => sortDayValue(left.key) - sortDayValue(right.key));
};

const buildTeacherGroups = (entries) => {
  const breakEntries = entries.filter((entry) => isGlobalBreakEntry(entry));
  const grouped = new Map();

  entries.filter((entry) => !entry.isBreak).forEach((entry) => {
    const teacherName = normalizeText(entry.teacherName, 'Tiada Guru');
    if (!grouped.has(teacherName)) {
      grouped.set(teacherName, {
        title: teacherName,
        key: teacherName,
        items: [],
      });
    }
    grouped.get(teacherName).items.push(entry);
  });

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      items: [...group.items, ...breakEntries].sort(sortSchedules),
    }))
    .sort((left, right) => left.title.localeCompare(right.title, 'th'));
};

const buildPageShell = (innerHtml) => `
  <div style="font-family:'Mali','Tajawal','Tahoma','Segoe UI','Arial Unicode MS',sans-serif; color:#1f2937;">
    <style>
      @page { margin: 8mm; }
      body { margin: 0; padding: 0; }
      .schedule-export-page { page-break-after: always; padding: 10px 8px 2px; }
      .schedule-export-page:last-child { page-break-after: auto; }
      .schedule-export-card { border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 16px 50px -40px rgba(15,23,42,0.4); background: #ffffff; }
      .schedule-export-card, .schedule-export-table tr, .schedule-export-table th, .schedule-export-table td { page-break-inside: avoid; break-inside: avoid; }
      .schedule-export-header { padding: 20px 24px; color: #ffffff; }
      .schedule-export-meta { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
      .schedule-export-chip { border-radius: 999px; padding: 6px 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
      .schedule-export-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .schedule-export-table thead { display: table-header-group; }
      .schedule-export-table th, .schedule-export-table td { padding: 12px 14px; vertical-align: top; border-bottom: 1px solid #e5e7eb; }
      .schedule-export-table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .schedule-export-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; }
      .schedule-export-section { border-radius: 18px; padding: 14px 16px; margin-bottom: 12px; }
      .schedule-export-row { border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; display: flex; gap: 14px; align-items: flex-start; }
      .schedule-export-row:last-child { margin-bottom: 0; }
      .schedule-export-time { min-width: 104px; border-radius: 14px; padding: 10px 12px; font-size: 12px; font-weight: 800; text-align: center; }
      .schedule-export-subtitle { font-size: 12px; color: rgba(255,255,255,0.82); margin-top: 6px; }
    </style>
    ${innerHtml}
  </div>
`;

const createPdfContainer = (html, width = '800px') => {
  const host = document.createElement('div');
  host.style.position = 'absolute';
  host.style.left = '-15000px';
  host.style.top = '0';
  host.style.width = width;
  host.style.zIndex = '-9999';

  const container = document.createElement('div');
  container.style.width = width;
  container.style.background = '#ffffff';
  container.innerHTML = html;
  
  // Force table layout fixed to prevent cell stretching past width
  const style = document.createElement('style');
  style.innerHTML = `
    .schedule-export-table { table-layout: fixed; width: 100%; }
    .schedule-export-table th, .schedule-export-table td { word-wrap: break-word; overflow-wrap: break-word; }
  `;
  container.appendChild(style);

  host.appendChild(container);
  document.body.appendChild(host);
  return { host, container };
};

const savePdfFromHtml = async ({ html, filename, orientation = 'portrait' }) => {
  const html2pdf = await loadHtml2Pdf();
  const preparedHtml = buildPageShell(html);
  if (!String(html || '').trim()) {
    throw new Error('No schedule content available for PDF export');
  }

  // ปรับลดความกว้างในแนวนอนลงเพื่อไม่ให้เสี่ยงต่อการล้น
  const containerWidth = orientation === 'landscape' ? '1040px' : '780px';
  const { host, container } = createPdfContainer(preparedHtml, containerWidth);
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // หน่วงเวลาเล็กน้อยเพื่อให้เบราว์เซอร์เรนเดอร์ DOM ได้สมบูรณ์ก่อน capture
    await new Promise((resolve) => setTimeout(resolve, 500));

    await html2pdf().set({
      margin: [8, 6, 8, 6],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: container.scrollWidth,
        windowHeight: Math.max(container.scrollHeight, container.offsetHeight, 1),
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { orientation, unit: 'mm', format: 'a4' },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(container).save();
  } finally {
    document.body.removeChild(host);
  }
};

const downloadBuffer = async (bufferPromise, filename) => {
  const buffer = await bufferPromise;
  const blob = new Blob([buffer], { type: EXCEL_MIME });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const createWorkbook = async () => {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TDK Web Client';
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
};

const applyCellBorder = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };
};

const applyTitleRow = (worksheet, title, subtitle, color) => {
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(color) } };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = subtitle;
  worksheet.getCell('A2').font = { bold: true, size: 11, color: { argb: 'FF475569' } };
  worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
};

const applyMetaRows = (worksheet, rows, startIndex = 3) => {
  rows.forEach((rowValue, rowOffset) => {
    const row = worksheet.getRow(startIndex + rowOffset);
    row.values = rowValue;
    row.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: 'FF475569' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });
};

const applyHeaderRow = (row, color) => {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(color) } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    applyCellBorder(cell);
  });
};

const applyScheduleDataRow = (row, entry, rowIndex) => {
  const fillColor = entry.isBreak
    ? BREAK_PALETTE.fill
    : rowIndex % 2 === 0 ? entry.palette.fill : '#FFFFFF';

  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(fillColor) } };
    cell.font = {
      size: 10,
      bold: Boolean(entry.isBreak && cell.col === 2),
      color: { argb: toArgb(entry.isBreak ? BREAK_PALETTE.text : '#334155') },
    };
    cell.alignment = { vertical: 'top', horizontal: cell.col === 1 ? 'center' : 'left', wrapText: true };
    applyCellBorder(cell);
  });
};

const addDaySheet = ({ workbook, sheetName, title, subtitle, metadata, entries }) => {
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  worksheet.columns = [
    { header: 'Masa', key: 'time', width: 15 },
    { header: 'Subjek', key: 'subject', width: 28 },
    { header: 'Guru', key: 'teacher', width: 24 },
    { header: 'Kelas', key: 'classroom', width: 20 },
    { header: 'Catatan', key: 'note', width: 28 },
  ];

  applyTitleRow(worksheet, title, subtitle, '#4338CA');
  applyMetaRows(worksheet, metadata, 3);

  const headerRow = worksheet.getRow(6);
  headerRow.values = ['Masa', 'Subjek', 'Guru', 'Kelas', 'Catatan'];
  applyHeaderRow(headerRow, '#4338CA');

  entries.forEach((entry, index) => {
    const row = worksheet.addRow([
      entry.timeLabel,
      entry.subjectName,
      entry.isBreak ? 'Rehat Semua Kelas ' : (entry.teacherName || '-'),
      entry.isBreak ? (entry.scopeLabel || 'Semua Kelas') : (entry.classroomName || '-'),
      entry.note || '-',
    ]);
    applyScheduleDataRow(row, entry, index);
  });

  worksheet.views = [{ state: 'frozen', ySplit: 6 }];
};

const addPersonSheet = ({ workbook, sheetName, title, subtitle, metadata, entries, accentColor }) => {
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  worksheet.columns = [
    { header: 'Hari', key: 'day', width: 16 },
    { header: 'Masa', key: 'time', width: 15 },
    { header: 'Subjek', key: 'subject', width: 28 },
    { header: 'Kelas', key: 'classroom', width: 20 },
    { header: 'Catatan', key: 'note', width: 28 },
  ];

  applyTitleRow(worksheet, title, subtitle, accentColor);
  applyMetaRows(worksheet, metadata, 3);

  let currentRow = 6;
  const groupedDays = groupSchedulesByDay(entries);
  groupedDays.forEach((group) => {
    const sectionRow = worksheet.getRow(currentRow);
    sectionRow.values = [group.title, '', '', '', ''];
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const sectionCell = worksheet.getCell(`A${currentRow}`);
    sectionCell.font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
    sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    sectionCell.alignment = { vertical: 'middle', horizontal: 'left' };
    applyCellBorder(sectionCell);
    currentRow += 1;

    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = ['Hari', 'Masa', 'Subjek', 'Kelas', 'Catatan'];
    applyHeaderRow(headerRow, accentColor);
    currentRow += 1;

    group.items.forEach((entry, index) => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        entry.dayName,
        entry.timeLabel,
        entry.subjectName,
        entry.isBreak ? (entry.scopeLabel || 'Semua Kelas') : (entry.classroomName || '-'),
        entry.note || '-',
      ];
      applyScheduleDataRow(row, entry, index);
      currentRow += 1;
    });

    currentRow += 1;
  });

  worksheet.views = [{ state: 'frozen', ySplit: 6 }];
};

const renderMetadataChips = (chips) => chips.map((chip) => `
  <div class="schedule-export-chip" style="background:${chip.background}; color:${chip.color};">
    ${escapeHtml(chip.label)}
  </div>
`).join('');

const renderOverviewPage = ({ schoolName, academicYear, semesterLabel, dayGroup, periodHeaders, bodyRows, pageIndex = 0, pageCount = 1 }) => `
  <section class="schedule-export-page">
    <div class="schedule-export-card">
      <div class="schedule-export-header" style="background:linear-gradient(135deg, #4338CA 0%, #6366F1 100%);">
        <div style="font-size:22px; font-weight:800; text-align:center;">Jadual Waktu Keseluruhan Sekolah</div>
        <div class="schedule-export-subtitle" style="text-align:center;">Hari ${escapeHtml(dayGroup.title)} | Tahun Akademik ${academicYear || '-'} | ${semesterLabel}${pageCount > 1 ? ` | Halaman ${pageIndex + 1}/${pageCount}` : ''}</div>
      </div>
      <div style="padding:18px 22px 22px;">
        <table class="schedule-export-table" style="text-align:center; border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:#EEF2FF; color:#3730A3;">
              <th style="width:10%; border:1px solid #e5e7eb;">Kelas \\ Masa</th>
              ${periodHeaders.map(p => `<th style="border:1px solid #e5e7eb;">${p.colTitle}<br/><span style="font-size:10px;font-weight:400;">${p.timeLabel}</span></th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${bodyRows.map((row) => `
              <tr>
                <td style="font-weight:800; background:#f8fafc; border:1px solid #e5e7eb;">${escapeHtml(row.classroomName)}</td>
                ${row.cells.map(cell => {
                  if (cell.isPlaceholder) return '';
                  if (cell.isEmpty) return `<td style="border:1px solid #e5e7eb;">-</td>`;
                  return `
                    <td colspan="${cell.colspan || 1}" style="background:${cell.entry.isBreak ? BREAK_PALETTE.fill : cell.entry.palette.fill}; color:${cell.entry.isBreak ? BREAK_PALETTE.text : '#334155'}; border:1px solid #e5e7eb; vertical-align:middle;">
                      <div style="font-weight:800; color:${cell.entry.isBreak ? BREAK_PALETTE.text : cell.entry.palette.text}; margin-bottom:4px;">${escapeHtml(cell.entry.subjectName)}</div>
                      ${!cell.entry.isBreak ? `<div style="font-size:10px;">${escapeHtml(cell.entry.teacherName || '-')}</div>` : ''}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </section>
`;

const renderPersonTimetablePage = ({ schoolName, academicYear, semesterLabel, title, subtitle, entries, themeColor, isStudent }) => {
  const timeSet = new Set();
  entries.forEach(e => {
     timeSet.add(e.startMinutes);
     timeSet.add(e.endMinutes);
  });
  const timePoints = Array.from(timeSet).sort((a,b) => a - b);
  const periods = [];
  for(let i = 0; i < timePoints.length - 1; i++) {
      periods.push({ start: timePoints[i], end: timePoints[i+1] });
  }

  const periodHeaders = periods.map((p, i) => {
      const sTime = `${String(Math.floor(p.start / 60)).padStart(2, '0')}.${String(p.start % 60).padStart(2, '0')}`;
      const eTime = `${String(Math.floor(p.end / 60)).padStart(2, '0')}.${String(p.end % 60).padStart(2, '0')}`;
      return {
         startMinutes: p.start,
         endMinutes: p.end,
         colTitle: i + 1,
         timeLabel: `${sTime} - ${eTime}`
      };
  });

  const dayGroups = groupSchedulesByDay(entries);

  return `
    <section class="schedule-export-page">
      <div class="schedule-export-card">
        <div class="schedule-export-header" style="background:linear-gradient(135deg, ${themeColor} 0%, ${isStudent ? '#F97316' : '#0EA5E9'} 100%);">
          <div style="font-size:22px; font-weight:800; text-align:center;">${escapeHtml(title)}</div>
          <div class="schedule-export-subtitle" style="text-align:center;">${escapeHtml(subtitle)} | Tahun Akademik ${academicYear || '-'} | ${semesterLabel}</div>
        </div>
        <div style="padding:18px 22px 22px;">
          <table class="schedule-export-table" style="text-align:center; border:1px solid #e5e7eb;">
            <thead>
              <tr style="background:#EEF2FF; color:#3730A3;">
                <th style="width:12%; border:1px solid #e5e7eb;">Hari \\ Masa</th>
                ${periodHeaders.length > 0 ? periodHeaders.map(p => `<th style="border:1px solid #e5e7eb;">${p.colTitle}<br/><span style="font-size:10px;font-weight:400;">${p.timeLabel}</span></th>`).join('') : '<th style="border:1px solid #e5e7eb;">-</th>'}
              </tr>
            </thead>
            <tbody>
              ${dayGroups.length > 0 ? dayGroups.map((group) => {
                const cells = [];
                let currentPeriodIdx = 0;
                
                while(currentPeriodIdx < periodHeaders.length) {
                   const p = periodHeaders[currentPeriodIdx];
                   const entry = group.items.find(e => e.startMinutes <= p.startMinutes && e.endMinutes >= p.endMinutes);
                   
                   if(entry) {
                      let span = 1;
                      while(currentPeriodIdx + span < periodHeaders.length && entry.endMinutes >= periodHeaders[currentPeriodIdx + span].endMinutes) {
                         span++;
                      }
                      cells.push({ isEmpty: false, isPlaceholder: false, colspan: span, entry });
                      for(let k = 1; k < span; k++) {
                         cells.push({ isEmpty: true, isPlaceholder: true });
                      }
                      currentPeriodIdx += span;
                   } else {
                      cells.push({ isEmpty: true, isPlaceholder: false, colspan: 1 });
                      currentPeriodIdx++;
                   }
                }

                return `
                <tr>
                  <td style="font-weight:800; background:#f8fafc; border:1px solid #e5e7eb; vertical-align:middle;">${escapeHtml(group.title)}</td>
                  ${cells.map(cell => {
                    if (cell.isPlaceholder) return '';
                    if (cell.isEmpty) return `<td style="border:1px solid #e5e7eb;">-</td>`;
                    
                    let subtitleText = '';
                    if (!cell.entry.isBreak) {
                        if (isStudent) {
                            subtitleText = cell.entry.teacherName || '-';
                        } else {
                            subtitleText = cell.entry.classroomName || '-';
                        }
                    }

                    return `
                      <td colspan="${cell.colspan || 1}" style="background:${cell.entry.isBreak ? BREAK_PALETTE.fill : cell.entry.palette.fill}; color:${cell.entry.isBreak ? BREAK_PALETTE.text : '#334155'}; border:1px solid #e5e7eb; vertical-align:middle;">
                        <div style="font-weight:800; color:${cell.entry.isBreak ? BREAK_PALETTE.text : cell.entry.palette.text}; margin-bottom:4px;">${escapeHtml(cell.entry.subjectName)}</div>
                        ${!cell.entry.isBreak ? `<div style="font-size:10px;">${escapeHtml(subtitleText)}</div>` : ''}
                      </td>
                    `;
                  }).join('')}
                </tr>
                `;
              }).join('') : `<tr><td colspan="${periodHeaders.length + 1}" style="padding: 20px;">Tiada Jadual</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

export const exportAdminOverviewPdf = async ({ schoolName, academicYear, semester, schedules }) => {
  const entries = normalizeSchedules(schedules);
  const dayGroups = groupSchedulesByDay(entries);
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  
  const html = dayGroups.map((group) => {
    const timeSet = new Set();
    group.items.forEach(e => {
       timeSet.add(e.startMinutes);
       timeSet.add(e.endMinutes);
    });
    const timePoints = Array.from(timeSet).sort((a,b) => a - b);
    const periods = [];
    for(let i = 0; i < timePoints.length - 1; i++) {
        periods.push({ start: timePoints[i], end: timePoints[i+1] });
    }

    if(periods.length === 0) return '';

    const periodHeaders = periods.map((p, i) => {
        const sTime = `${String(Math.floor(p.start / 60)).padStart(2, '0')}.${String(p.start % 60).padStart(2, '0')}`;
        const eTime = `${String(Math.floor(p.end / 60)).padStart(2, '0')}.${String(p.end % 60).padStart(2, '0')}`;
        return {
           startMinutes: p.start,
           endMinutes: p.end,
           colTitle: i + 1,
           timeLabel: `${sTime} - ${eTime}`
        };
    });

    const classroomsSet = new Set();
    group.items.forEach(e => {
        if (!e.isBreak && e.classroomName && e.classroomName !== 'Tiada Kelas') {
            classroomsSet.add(e.classroomName);
        }
    });
    let classrooms = Array.from(classroomsSet).sort((a,b) => a.localeCompare(b, 'th'));
    if (classrooms.length === 0) classrooms = ['Semua Kelas'];

    const bodyRows = classrooms.map(cls => {
       const classEntries = group.items.filter(e => e.classroomName === cls || (e.isBreak && (e.scopeLabel === 'Semua Kelas' || !e.classroomName)));
       
       const cells = [];
       let currentPeriodIdx = 0;
       
       while(currentPeriodIdx < periodHeaders.length) {
          const p = periodHeaders[currentPeriodIdx];
          const entry = classEntries.find(e => e.startMinutes <= p.startMinutes && e.endMinutes >= p.endMinutes);
          
          if(entry) {
             let span = 1;
             while(currentPeriodIdx + span < periodHeaders.length && entry.endMinutes >= periodHeaders[currentPeriodIdx + span].endMinutes) {
                span++;
             }
             cells.push({ isEmpty: false, isPlaceholder: false, colspan: span, entry });
             for(let k = 1; k < span; k++) {
                cells.push({ isEmpty: true, isPlaceholder: true });
             }
             currentPeriodIdx += span;
          } else {
             cells.push({ isEmpty: true, isPlaceholder: false, colspan: 1 });
             currentPeriodIdx++;
          }
       }
       
       return { classroomName: cls, cells };
    });

    const pageRows = chunkItems(bodyRows, getOverviewRowsPerPage(periodHeaders.length));

    return pageRows.map((rows, pageIndex) => renderOverviewPage({
      schoolName,
      academicYear,
      semesterLabel,
      dayGroup: group,
      periodHeaders,
      bodyRows: rows,
      pageIndex,
      pageCount: pageRows.length,
    })).join('');
  }).join('');

  await savePdfFromHtml({
    html,
    filename: `${sanitizeFileName(`Jadual_Sekolah_${academicYear || 'Semua'}_${semesterLabel}`)}.pdf`,
    orientation: 'landscape',
  });
};

export const exportAdminOverviewExcel = async ({ schoolName, academicYear, semester, schedules }) => {
  const workbook = await createWorkbook();
  const entries = normalizeSchedules(schedules);
  const dayGroups = groupSchedulesByDay(entries);
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const printedAt = new Date().toLocaleDateString('ms-MY');

  dayGroups.forEach((group) => {
    addDaySheet({
      workbook,
      sheetName: group.title,
      title: `Jadual Waktu Keseluruhan - ${group.title}`,
      subtitle: `${schoolName || 'Sekolah'} | Tahun Akademik ${academicYear || '-'} | ${semesterLabel}`,
      metadata: [
        ['Sekolah', schoolName || '-', 'Hari', group.title, 'Dicetak pada'],
        ['Tahun Akademik', academicYear || '-', 'Penggal', semesterLabel, printedAt],
      ],
      entries: group.items,
    });
  });

  await downloadBuffer(
    workbook.xlsx.writeBuffer(),
    `${sanitizeFileName(`Jadual_Sekolah_${academicYear || 'Semua'}_${semesterLabel}`)}.xlsx`
  );
};

export const exportAdminTeacherSchedulesPdf = async ({ schoolName, academicYear, semester, schedules }) => {
  const entries = normalizeSchedules(schedules);
  const teacherGroups = buildTeacherGroups(entries);
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const html = teacherGroups.map((group) => renderPersonTimetablePage({
    schoolName,
    academicYear,
    semesterLabel,
    title: `Jadual Waktu Guru: ${group.title}`,
    subtitle: schoolName || 'Sekolah',
    entries: group.items,
    themeColor: '#2563EB',
    isStudent: false,
  })).join('');

  await savePdfFromHtml({
    html,
    filename: `${sanitizeFileName(`Jadual_Semua_Guru_${academicYear || 'Semua'}_${semesterLabel}`)}.pdf`,
    orientation: 'landscape',
  });
};

export const exportAdminTeacherSchedulesExcel = async ({ schoolName, academicYear, semester, schedules }) => {
  const workbook = await createWorkbook();
  const entries = normalizeSchedules(schedules);
  const teacherGroups = buildTeacherGroups(entries);
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const printedAt = new Date().toLocaleDateString('ms-MY');

  teacherGroups.forEach((group) => {
    addPersonSheet({
      workbook,
      sheetName: group.title,
      title: `Jadual Waktu Guru - ${group.title}`,
      subtitle: `${schoolName || 'Sekolah'} | Tahun Akademik ${academicYear || '-'} | ${semesterLabel}`,
      metadata: [
        ['Guru', group.title, 'Dicetak pada', printedAt, ''],
        ['Tahun Akademik', academicYear || '-', 'Penggal', semesterLabel, ''],
      ],
      entries: group.items,
      accentColor: '#2563EB',
    });
  });

  await downloadBuffer(
    workbook.xlsx.writeBuffer(),
    `${sanitizeFileName(`Jadual_Semua_Guru_${academicYear || 'Semua'}_${semesterLabel}`)}.xlsx`
  );
};

export const exportTeacherSchedulePdf = async ({ schoolName, academicYear, semester, schedules, teacherName }) => {
  const entries = filterTeacherExportEntries(normalizeSchedules(schedules));
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const html = renderPersonTimetablePage({
    schoolName,
    academicYear,
    semesterLabel,
    title: `Jadual Waktu Guru: ${teacherName || 'Guru'}`,
    subtitle: schoolName || 'Sekolah',
    entries,
    themeColor: '#2563EB',
    isStudent: false,
  });

  await savePdfFromHtml({
    html,
    filename: `${sanitizeFileName(`Jadual_Guru_${teacherName || 'guru'}_${academicYear || 'Semua'}_${semesterLabel}`)}.pdf`,
    orientation: 'landscape',
  });
};

export const exportTeacherScheduleExcel = async ({ schoolName, academicYear, semester, schedules, teacherName }) => {
  const workbook = await createWorkbook();
  const entries = filterTeacherExportEntries(normalizeSchedules(schedules));
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const printedAt = new Date().toLocaleDateString('ms-MY');

  addPersonSheet({
    workbook,
    sheetName: teacherName || 'Jadual Waktu',
    title: `Jadual Waktu Guru ${teacherName || ''}`.trim(),
    subtitle: `${schoolName || 'Sekolah'} | Tahun Akademik ${academicYear || '-'} | ${semesterLabel}`,
    metadata: [
      ['Guru', teacherName || '-', 'Dicetak pada', printedAt, ''],
      ['Tahun Akademik', academicYear || '-', 'Penggal', semesterLabel, ''],
    ],
    entries,
    accentColor: '#2563EB',
  });

  await downloadBuffer(
    workbook.xlsx.writeBuffer(),
    `${sanitizeFileName(`Jadual_Guru_${teacherName || 'guru'}_${academicYear || 'Semua'}_${semesterLabel}`)}.xlsx`
  );
};

export const exportStudentSchedulePdf = async ({ schoolName, academicYear, semester, schedules, studentName }) => {
  const entries = normalizeSchedules(schedules);
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const html = renderPersonTimetablePage({
    schoolName,
    academicYear,
    semesterLabel,
    title: `Jadual Waktu Pelajar: ${studentName || 'Pelajar'}`,
    subtitle: schoolName || 'Sekolah',
    entries,
    themeColor: '#EC4899',
    isStudent: true,
  });

  await savePdfFromHtml({
    html,
    filename: `${sanitizeFileName(`Jadual_Pelajar_${studentName || 'pelajar'}_${academicYear || 'Semua'}_${semesterLabel}`)}.pdf`,
    orientation: 'landscape',
  });
};

export const exportStudentScheduleExcel = async ({ schoolName, academicYear, semester, schedules, studentName }) => {
  const workbook = await createWorkbook();
  const entries = normalizeSchedules(schedules);
  const semesterLabel = formatSemesterLabel(semester, 'Semua Penggal');
  const printedAt = new Date().toLocaleDateString('ms-MY');

  addPersonSheet({
    workbook,
    sheetName: studentName || 'Jadual Waktu',
    title: `Jadual Waktu Pelajar ${studentName || 'Pelajar'}`,
    subtitle: `${schoolName || 'Sekolah'} | Tahun Akademik ${academicYear || '-'} | ${semesterLabel}`,
    metadata: [
      ['Pelajar', studentName || '-', 'Dicetak pada', printedAt, ''],
      ['Tahun Akademik', academicYear || '-', 'Penggal', semesterLabel, ''],
    ],
    entries,
    accentColor: '#EC4899',
  });

  await downloadBuffer(
    workbook.xlsx.writeBuffer(),
    `${sanitizeFileName(`Jadual_Pelajar_${studentName || 'pelajar'}_${academicYear || 'Semua'}_${semesterLabel}`)}.xlsx`
  );
};