import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Building2,
  Clock3,
  KeyRound,
  Mail,
  PlusCircle
} from 'lucide-react';

function OwnerTabs({ activeTab, setActiveTab, counts = {}, orientation = 'horizontal' }) {
  const { t } = useTranslation();
  const isVertical = orientation === 'vertical';

  const tabs = [
    {
      id: 'schools',
      label: t('owner.manageSchools'),
      description: 'จัดการข้อมูลโรงเรียน',
      icon: Building2
    },
    {
      id: 'activities',
      label: t('owner.recentActivities'),
      description: 'ติดตามกิจกรรมล่าสุด',
      icon: Activity
    },
    {
      id: 'create_admin',
      label: t('owner.addAdmin'),
      description: 'สร้างผู้ดูแลโรงเรียน',
      icon: PlusCircle
    },
    {
      id: 'admin_requests',
      label: t('owner.adminRequests'),
      description: 'คำขอที่รออนุมัติ',
      icon: Mail
    },
    {
      id: 'token_settings',
      label: 'Token Settings',
      description: 'ปรับอายุการใช้งาน token',
      icon: Clock3
    },
    {
      id: 'password_reset_requests',
      label: t('owner.passwordResetRequests'),
      description: 'ตอบกลับคำขอรีเซ็ตทันที',
      icon: KeyRound
    }
  ];

  return (
    <nav className={isVertical ? 'space-y-2' : 'flex gap-3 overflow-x-auto pb-1'}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const badgeCount = counts[tab.id] || 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'group relative transition-all',
              isVertical
                ? 'flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left'
                : 'min-w-[15rem] rounded-2xl border px-4 py-3 text-left',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            ].join(' ')}
            aria-pressed={isActive}
          >
            <span
              className={[
                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors',
                isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{tab.label}</span>
                {badgeCount > 0 ? (
                  <span
                    className={[
                      'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                      isActive ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
                    ].join(' ')}
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </span>
              <span
                className={[
                  'mt-1 block truncate text-xs',
                  isActive ? 'text-white/80' : 'text-slate-500'
                ].join(' ')}
              >
                {tab.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default OwnerTabs;
