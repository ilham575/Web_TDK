import React, { useEffect } from 'react';

function ActivityDetailModal({ isOpen, onClose, activityData, studentName }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow || ''; };
  }, [isOpen]);

  if (!isOpen || !activityData) return null;

  const { activity_subjects = [], total_activity_score = 0, total_activity_percent = 0 } = activityData;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl shadow-inner">
                📊
              </div>
              <div>
                <h2 className="text-xl font-black">รายละเอียดคะแนนกิจกรรม</h2>
                {studentName && (
                  <p className="text-indigo-100 text-xs font-medium mt-0.5">นักเรียน: {studentName}</p>
                )}
              </div>
            </div>
            <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-xl leading-none"
            >
                ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
          {activity_subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="text-6xl mb-4 opacity-20">😶‍🌫️</div>
              <p className="font-bold text-lg">ยังไม่มีคะแนนกิจกรรม</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">ชื่อวิชากิจกรรม</th>
                        <th className="px-4 py-4 text-center">คะแนนดิบ</th>
                        <th className="px-4 py-4 text-center">คะแนนเต็ม</th>
                        <th className="px-4 py-4 text-center">เปอร์เซ็นต์</th>
                        <th className="px-6 py-4 text-right">คะแนนที่ได้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activity_subjects.map((subject, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700">{subject.subject_name}</div>
                          </td>
                          <td className="px-4 py-4 text-center font-medium text-slate-600">{subject.raw_score}</td>
                          <td className="px-4 py-4 text-center font-medium text-slate-400">{subject.max_score}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black">
                              {subject.percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-base font-black text-indigo-600">
                              {subject.contribution}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">รวมเปอร์เซ็นต์</div>
                        <div className="text-2xl font-black text-slate-700">{total_activity_percent}%</div>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl text-slate-400">📈</div>
                </div>

                <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-between text-white">
                    <div>
                        <div className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">รวมคะแนนกิจกรรมคั้นเสร็จ</div>
                        <div className="text-3xl font-black">{total_activity_score}</div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl">🏆</div>
                </div>
              </div>

              {total_activity_score > 100 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-700">
                  <span className="text-xl">⚠️</span>
                  <p className="text-sm font-bold">
                    คะแนนรวมถูก Cap ที่ 100 (เดิม: <span className="underline">{total_activity_score}</span>)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
          >
            ปิดหน้าต่างนี้
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActivityDetailModal;

