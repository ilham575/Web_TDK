import Swal from 'sweetalert2';

// Create a reusable Toast mixin for standard notifications
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    popup: 'rounded-3xl border border-slate-200 shadow-xl bg-white text-slate-800',
    title: 'text-slate-800 font-semibold'
  }
});

const swalMessenger = {
  // Toast notifications (using library's built-in toast mixin)
  success: (title, text = '') => Toast.fire({ icon: 'success', title, text }),
  error: (title, text = '') => Toast.fire({ icon: 'error', title, text }),
  warning: (title, text = '') => Toast.fire({ icon: 'warning', title, text }),
  info: (title, text = '') => Toast.fire({ icon: 'info', title, text }),

  // Full dialog alerts
  alert: async ({ title = '', text = '', icon = undefined }) => {
    await Swal.fire({ title, text, icon });
  },

  confirm: async ({ title = '', text = '', confirmButtonText = 'OK', cancelButtonText = 'Cancel', icon = 'question' } = {}) => {
    const res = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#cbd5e1',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-[2rem] border border-slate-200 shadow-2xl p-8 bg-white',
        title: 'text-2xl font-semibold text-slate-900',
        htmlContainer: 'text-slate-500 font-medium',
        confirmButton: 'rounded-2xl px-6 py-3 font-semibold transition-all shadow-sm',
        cancelButton: 'rounded-2xl px-6 py-3 font-semibold transition-all text-slate-700'
      }
    });
    return !!res.isConfirmed;
  },

  prompt: async ({ title = '', text = '', inputPlaceholder = '', inputValue = '', input = 'text' } = {}) => {
    const res = await Swal.fire({
      title,
      text,
      input,
      inputPlaceholder,
      inputValue,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#cbd5e1',
      customClass: {
        popup: 'rounded-[2rem] border border-slate-200 shadow-2xl p-8 bg-white',
        title: 'text-2xl font-semibold text-slate-900',
        input: 'rounded-2xl border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium py-3 px-4',
        confirmButton: 'rounded-2xl px-6 py-3 font-semibold transition-all shadow-sm',
        cancelButton: 'rounded-2xl px-6 py-3 font-semibold transition-all text-slate-700'
      }
    });
    if (res.isDismissed) return null;
    return res.value;
  }
};

export default swalMessenger;
