import Swal from 'sweetalert2';

// Create a reusable Toast mixin for standard notifications
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    popup: 'rounded-2xl border-none shadow-xl backdrop-blur-md bg-white/90 font-bold',
    title: 'text-slate-800'
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
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-3xl border-none shadow-2xl p-8',
        title: 'text-2xl font-black text-slate-800',
        htmlContainer: 'text-slate-500 font-medium',
        confirmButton: 'rounded-2xl px-6 py-3 font-bold transition-all shadow-lg shadow-indigo-500/30',
        cancelButton: 'rounded-2xl px-6 py-3 font-bold transition-all'
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
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'rounded-3xl border-none shadow-2xl p-8',
        title: 'text-2xl font-black text-slate-800',
        input: 'rounded-2xl border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium py-3 px-4',
        confirmButton: 'rounded-2xl px-6 py-3 font-bold transition-all shadow-lg shadow-indigo-500/30',
        cancelButton: 'rounded-2xl px-6 py-3 font-bold transition-all'
      }
    });
    if (res.isDismissed) return null;
    return res.value;
  }
};

export default swalMessenger;
