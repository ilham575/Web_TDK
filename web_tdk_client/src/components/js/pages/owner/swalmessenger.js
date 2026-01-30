import Swal from 'sweetalert2';

const swalMessenger = {
  alert: async ({ title = '', text = '', icon = undefined }) => {
    await Swal.fire({ title, text, icon });
  },

  confirm: async ({ title = '', text = '', confirmButtonText = 'OK', cancelButtonText = 'Cancel' } = {}) => {
    const res = await Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true
    });
    return !!res.isConfirmed;
  },

  prompt: async ({ title = '', inputPlaceholder = '', inputValue = '' } = {}) => {
    const res = await Swal.fire({
      title,
      input: 'text',
      inputPlaceholder,
      inputValue,
      showCancelButton: true
    });
    if (res.isDismissed) return null;
    return res.value;
  }
};

export default swalMessenger;
