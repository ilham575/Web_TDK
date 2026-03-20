import React from 'react';

export const ONBOARDING_KEYS = {
  login: 'tdk_onboarding_login_v1',
  admin: 'tdk_onboarding_admin_v1',
  teacher: 'tdk_onboarding_teacher_v1',
  student: 'tdk_onboarding_student_v1',
  owner: 'tdk_onboarding_owner_v1'
};

export function shouldShowOnboarding(key) {
  try {
    return window.localStorage.getItem(key) !== 'seen';
  } catch (error) {
    return true;
  }
}

export function markOnboardingSeen(key) {
  try {
    window.localStorage.setItem(key, 'seen');
  } catch (error) {
    // Ignore storage errors so onboarding never blocks usage.
  }
}

const ACCENT_STYLES = {
  emerald: {
    banner: 'from-emerald-500 to-teal-500',
    panel: 'from-emerald-50 via-teal-50 to-white',
    badge: 'bg-emerald-100 text-emerald-700',
    chip: 'bg-white/80 border-emerald-100 text-emerald-700',
    icon: 'bg-emerald-500 text-white',
    button: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
  },
  blue: {
    banner: 'from-blue-500 to-cyan-500',
    panel: 'from-blue-50 via-cyan-50 to-white',
    badge: 'bg-blue-100 text-blue-700',
    chip: 'bg-white/80 border-blue-100 text-blue-700',
    icon: 'bg-blue-500 text-white',
    button: 'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
  },
  violet: {
    banner: 'from-violet-500 to-fuchsia-500',
    panel: 'from-violet-50 via-fuchsia-50 to-white',
    badge: 'bg-violet-100 text-violet-700',
    chip: 'bg-white/80 border-violet-100 text-violet-700',
    icon: 'bg-violet-500 text-white',
    button: 'from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700'
  },
  amber: {
    banner: 'from-amber-500 to-orange-500',
    panel: 'from-amber-50 via-orange-50 to-white',
    badge: 'bg-amber-100 text-amber-700',
    chip: 'bg-white/80 border-amber-100 text-amber-700',
    icon: 'bg-amber-500 text-white',
    button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
  }
};

function FirstVisitOnboarding({
  open,
  onClose,
  badge,
  title,
  description,
  highlights = [],
  steps = [],
  buttonLabel = 'เริ่มใช้งาน',
  accent = 'emerald'
}) {
  if (!open) {
    return null;
  }

  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.emerald;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm sm:items-center sm:p-4 lg:p-6">
      <div className="relative my-2 flex max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl shadow-slate-900/20 sm:my-4 sm:max-h-[calc(100vh-2rem)] sm:rounded-[32px] lg:max-h-[min(880px,calc(100vh-3rem))]">
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${styles.banner}`}></div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700 sm:right-4 sm:top-4"
          aria-label="Close onboarding"
        >
          ✕
        </button>

        <div className="grid flex-1 overflow-y-auto overscroll-contain lg:grid-cols-[1.15fr_0.85fr]">
          <div className={`bg-gradient-to-br ${styles.panel} p-5 pt-14 sm:p-7 sm:pt-16 lg:p-10 lg:pt-10`}>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${styles.badge}`}>
              {badge}
            </span>

            <h2 className="mt-4 max-w-2xl text-2xl font-black leading-tight text-slate-900 sm:mt-5 sm:text-3xl lg:text-4xl">
              {title}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-4 sm:text-base sm:leading-7">
              {description}
            </p>

            {highlights.length > 0 && (
              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
                {highlights.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${styles.chip} sm:py-4`}
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      จุดสำคัญ {index + 1}
                    </div>
                    <div className="mt-2 text-slate-700">{item}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col bg-slate-50/90 p-5 sm:p-7 lg:p-10">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 sm:text-sm">เริ่มต้นอย่างไร</div>

            <div className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">
              {steps.map((step, index) => (
                <div key={`${step.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-black sm:text-lg ${styles.icon}`}>
                      {step.icon || index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-800">{step.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{step.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 mt-6 bg-slate-50/95 pt-3 backdrop-blur-sm sm:mt-8">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r px-5 py-3.5 text-sm font-black text-white shadow-lg transition ${styles.button}`}
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirstVisitOnboarding;