const Toast = {
    show(msg, type = 'success') {
        const toast = document.getElementById('toast');
        document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '✕';
        document.getElementById('toastMsg').textContent = msg;
        toast.className = 'toast show ' + type;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

const Modal = {
    open(id) { document.getElementById(id).classList.add('open'); },
    close(id) { document.getElementById(id).classList.remove('open'); },
    confirmCallback: null,
    confirm(title, msg, cb) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMsg').textContent = msg;
        this.confirmCallback = cb;
        this.open('confirmModal');
    }
};

