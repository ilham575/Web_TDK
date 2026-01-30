import React from 'react';

function Loading({ message = "กำลังโหลดข้อมูล..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] w-full p-8">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-emerald-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-slate-600 font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
}

export default Loading;