// ================= SISTEM DATABASE =================
let db = {
    students: JSON.parse(localStorage.getItem("students")) || [],
    attendance: JSON.parse(localStorage.getItem("attendance")) || [],
    masterCard: JSON.parse(localStorage.getItem("masterCard")) || null,
    activeStudentId: JSON.parse(localStorage.getItem("activeStudentId")) || null,
    settings: JSON.parse(localStorage.getItem("settings")) || {
        autoConnect: true,
        baudRate: 115200,
        autoRefresh: true,
        autoRefreshInterval: 30000,
    },
};

// ================= VARIABLES =================
let serialPort = null;
let reader = null;
let isConnected = false;
let currentDetectedUID = "";
let readerActive = false;
let autoRefreshTimer = null;
let lastUpdateTime = new Date();
let autoRefreshActive = false;
let refreshCountdown = 30;
let currentEditStudentId = null;
let lastAttendanceTime = null;

// ================= INITIALIZE =================
document.addEventListener("DOMContentLoaded", function () {
    // Load saved settings
    document.getElementById("baudRateSelect").value = db.settings.baudRate || "115200";
    document.getElementById("autoRefreshInterval").value = db.settings.autoRefreshInterval || "30000";

    loadData();
    renderStudents();
    renderAttendance();
    updateStats();
    updateActiveStudentDisplay();
    updateTodayStats();

    // Auto-load master card if exists
    if (db.masterCard) {
        document.getElementById("masterCardUID").textContent = db.masterCard.uid;
        updateScanText();
    }

    // Update last updated time
    updateLastUpdatedTime();

    // Start auto-refresh if enabled
    if (db.settings.autoRefresh) {
        startAutoRefresh();
    }
});

// ================= FUNGSI UTAMA 1 KARTU UNTUK SEMUA =================

// Fungsi untuk update teks scan berdasarkan status
function updateScanText() {
    const scanText = document.getElementById("scanText");
    const activeStudent = db.students.find((s) => s.id === db.activeStudentId);

    if (activeStudent) {
        scanText.textContent = `${activeStudent.name} siap absen. Tempelkan kartu!`;
    } else {
        scanText.textContent = "Pilih siswa aktif, lalu tempelkan kartu untuk absensi";
    }
}

// Fungsi untuk mencatat absensi dari Arduino
function processAttendanceFromRFID(uid) {
    const activeStudent = db.students.find((s) => s.id === db.activeStudentId);

    if (!activeStudent) {
        showNotification("Pilih siswa aktif terlebih dahulu!", "error");
        return;
    }

    if (!db.masterCard || uid !== db.masterCard.uid) {
        showNotification(`Kartu tidak valid. Gunakan kartu master!`, "error");
        return;
    }

    // Catat sebagai HADIR secara otomatis
    recordAttendance(uid, activeStudent.name, activeStudent.class, "HADIR");

    // Update last attendance info
    lastAttendanceTime = new Date();
    updateLastAttendanceInfo();

    // Tampilkan notifikasi sukses
    showNotification(`${activeStudent.name} berhasil absen dengan kartu master!`, "success");

    // Update scan text
    updateScanText();

    // Auto-refresh display
    refreshActiveStudent();
}

// Fungsi untuk update info absensi terakhir
function updateLastAttendanceInfo() {
    const lastAttendanceInfo = document.getElementById("lastAttendanceInfo");
    const lastAttendanceDetails = document.getElementById("lastAttendanceDetails");

    if (lastAttendanceTime && db.activeStudentId) {
        const activeStudent = db.students.find((s) => s.id === db.activeStudentId);
        const timeString = lastAttendanceTime.toLocaleTimeString("id-ID");

        lastAttendanceDetails.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${activeStudent.name}</strong><br/>
                    <small>${activeStudent.class}</small>
                </div>
                <div class="last-attendance-time">
                    ${timeString}
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
                <i class="fas fa-check-circle" style="color: #4ade80;"></i> 
                Absensi terakhir berhasil
            </div>
        `;
        lastAttendanceInfo.style.display = "block";
    }
}

// ================= LOAD/SAVE DATA =================
function loadData() {
    if (db.masterCard) {
        document.getElementById("masterCardUID").textContent = db.masterCard.uid;
    }
}

function saveData() {
    localStorage.setItem("students", JSON.stringify(db.students));
    localStorage.setItem("attendance", JSON.stringify(db.attendance));
    localStorage.setItem("masterCard", JSON.stringify(db.masterCard));
    localStorage.setItem("activeStudentId", JSON.stringify(db.activeStudentId));
    localStorage.setItem("settings", JSON.stringify(db.settings));

    lastUpdateTime = new Date();
    updateLastUpdatedTime();
}

// ================= REFRESH FUNCTIONS =================

function refreshActiveStudent() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshActiveStudent()"] i');
    if (refreshBtn) refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui siswa aktif...", "info");

    updateActiveStudentDisplay();
    updateScanText();
    showNotification("Siswa aktif diperbarui", "success");

    setTimeout(() => {
        if (refreshBtn) refreshBtn.classList.remove("refreshing");
    }, 1000);
}

function updateAttendanceSummary() {
    const activeStudent = db.students.find((s) => s.id === db.activeStudentId);

    if (activeStudent) {
        // Hitung hadir, tidak hadir, dan izin untuk siswa aktif
        const studentAttendance = db.attendance.filter((a) => a.studentName === activeStudent.name && a.className === activeStudent.class);

        const hadirCount = studentAttendance.filter((a) => a.status === "HADIR").length;
        const tidakHadirCount = studentAttendance.filter((a) => a.status === "TIDAK HADIR" || a.status === "TIDAK_HADIR").length;
        const izinCount = studentAttendance.filter((a) => a.status === "IZIN").length;

        // Update ringkasan
        document.getElementById("summaryHadir").textContent = hadirCount;
        document.getElementById("summaryTidakHadir").textContent = tidakHadirCount;
        document.getElementById("summaryIzin").textContent = izinCount;

        // Tampilkan ringkasan
        document.getElementById("attendanceSummary").style.display = "flex";

        // Update teks kehadiran di info siswa
        const attendanceText = `${hadirCount} hadir, ${tidakHadirCount} tidak hadir, ${izinCount} izin`;
        document.getElementById("activeStudentAttendance").textContent = "Statistik: " + attendanceText;

        // Update status kesiapan
        document.getElementById("attendanceReadyStatus").innerHTML = `
            <i class="fas fa-check-circle" style="color: #4ade80;"></i>
            Siap absen dengan kartu master
        `;
    } else {
        // Sembunyikan ringkasan jika tidak ada siswa aktif
        document.getElementById("attendanceSummary").style.display = "none";
        document.getElementById("activeStudentAttendance").textContent = "";

        // Update status kesiapan
        document.getElementById("attendanceReadyStatus").innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>
            Pilih siswa untuk mulai absensi
        `;
    }
}

function updateTodayStats() {
    const today = new Date().toLocaleDateString("id-ID");
    const todayAttendance = db.attendance.filter((a) => a.date === today);

    const todayPresent = todayAttendance.filter((a) => a.status === "HADIR").length;
    const todayAbsent = todayAttendance.filter((a) => a.status === "TIDAK HADIR" || a.status === "TIDAK_HADIR").length;
    const todayIzin = todayAttendance.filter((a) => a.status === "IZIN").length;

    document.getElementById("todayPresent").textContent = todayPresent;
    document.getElementById("todayAbsent").textContent = todayAbsent;
    document.getElementById("todayIzin").textContent = todayIzin;
    document.getElementById("todayAttendance").textContent = todayAttendance.length;
}

function updateActiveStudentDisplay() {
    const student = db.students.find((s) => s.id === db.activeStudentId);

    if (student) {
        document.getElementById("activeStudentName").textContent = student.name;
        document.getElementById("activeStudentClass").textContent = student.class;
        document.getElementById("activeStudentNIS").textContent = "NIS: " + student.nis;

        // Update ringkasan kehadiran
        updateAttendanceSummary();
        updateScanText();
    } else {
        document.getElementById("activeStudentName").textContent = "Belum ada siswa aktif";
        document.getElementById("activeStudentClass").textContent = "Pilih siswa terlebih dahulu untuk absensi";
        document.getElementById("activeStudentNIS").textContent = "";
        document.getElementById("activeStudentAttendance").textContent = "";

        // Sembunyikan ringkasan
        document.getElementById("attendanceSummary").style.display = "none";
        updateScanText();
    }

    updateLastUpdatedTime();
}

function renderStudents() {
    const container = document.getElementById("studentList");
    const selectContainer = document.getElementById("selectStudentList");

    document.getElementById("studentCount").textContent = db.students.length;

    if (db.students.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Belum ada siswa terdaftar</div>';
        selectContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Belum ada siswa terdaftar</div>';
        return;
    }

    let html = "";
    let selectHtml = "";

    db.students.forEach((student, index) => {
        const isActive = db.activeStudentId === student.id;

        // Hitung statistik kehadiran untuk setiap siswa
        const studentAttendance = db.attendance.filter((a) => a.studentName === student.name && a.className === student.class);

        const hadirCount = studentAttendance.filter((a) => a.status === "HADIR").length;
        const tidakHadirCount = studentAttendance.filter((a) => a.status === "TIDAK HADIR" || a.status === "TIDAK_HADIR").length;
        const izinCount = studentAttendance.filter((a) => a.status === "IZIN").length;

        html += `
            <div class="student-item ${isActive ? "active" : ""}">
                <div class="student-item-info" onclick="setActiveStudent(${student.id})" style="cursor: pointer; flex: 1;">
                    <h4>${student.name} ${isActive ? '<i class="fas fa-play-circle" style="color: var(--success); font-size: 0.8rem;" title="Sedang aktif"></i>' : ""}</h4>
                    <p>${student.class} | NIS: ${student.nis}</p>
                    
                    <!-- Statistik Kehadiran -->
                    <div class="student-stats">
                        <div class="stat-hadir">
                            <i class="fas fa-check-circle"></i>
                            <span>${hadirCount} hadir</span>
                        </div>
                        <div class="stat-tidak-hadir">
                            <i class="fas fa-times-circle"></i>
                            <span>${tidakHadirCount} t.hadir</span>
                        </div>
                        <div class="stat-hadir" style="color: #f59e0b;">
                            <i class="fas fa-user-clock"></i>
                            <span>${izinCount} izin</span>
                        </div>
                    </div>
                    
                    <small style="color: #999;">
                        Ditambahkan: ${new Date(student.createdAt).toLocaleDateString("id-ID")}
                    </small>
                </div>
                <div style="text-align: right; display: flex; align-items: center; gap: 10px;">
                    <div style="text-align: center;">
                        <div style="color: #666; font-size: 0.9rem;">
                            ${student.attendanceCount || 0} absensi
                        </div>
                        <div style="font-size: 0.8rem; margin-top: 3px;">
                            ${student.arduinoSynced ? '<i class="fas fa-check-circle" style="color: green;" title="Tersinkron dengan Arduino"></i>' : '<i class="fas fa-times-circle" style="color: red;" title="Belum tersinkron"></i>'}
                        </div>
                    </div>
                    <div class="student-actions" style="display: flex; gap: 5px;">
                        <button class="btn" style="padding: 5px 10px;" 
                                onclick="editStudent(${student.id})" title="Edit siswa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" style="padding: 5px 10px;" 
                                onclick="deleteStudent(${student.id})" title="Hapus siswa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        selectHtml += `
            <div class="student-item ${isActive ? "active" : ""}" onclick="selectActiveStudent(${student.id})">
                <div class="student-item-info">
                    <h4>${student.name}</h4>
                    <p>${student.class} | NIS: ${student.nis}</p>
                    <small style="color: #666;">
                        ${hadirCount} hadir, ${tidakHadirCount} t.hadir, ${izinCount} izin
                    </small>
                </div>
                ${isActive ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : ""}
            </div>
        `;
    });

    container.innerHTML = html;
    selectContainer.innerHTML = selectHtml;

    // Update statistik hari ini
    updateTodayStats();
}

// ================= RECORD ATTENDANCE (MODIFIED FOR 1 CARD) =================
function recordAttendance(uid, name, className, status) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("id-ID");
    const dateString = now.toLocaleDateString("id-ID");

    const attendance = {
        id: Date.now(),
        uid: uid,
        studentName: name,
        className: className,
        status: status,
        time: timeString,
        date: dateString,
        timestamp: now.toISOString(),
    };

    db.attendance.unshift(attendance);

    // Update student attendance count
    const student = db.students.find((s) => s.name === name && s.class === className);
    if (student) {
        student.attendanceCount = (student.attendanceCount || 0) + 1;
    }

    if (db.attendance.length > 100) {
        db.attendance = db.attendance.slice(0, 100);
    }

    saveData();
    renderStudents();
    renderAttendance();
    updateStats();
    updateTodayStats();

    // Update ringkasan kehadiran untuk siswa aktif
    updateAttendanceSummary();

    // Update last attendance info
    lastAttendanceTime = now;
    updateLastAttendanceInfo();

    // Show appropriate notification
    if (status === "HADIR") {
        showNotification(`${name} berhasil absen!`, "success");
    } else if (status === "TIDAK HADIR") {
        showNotification(`${name} dicatat tidak hadir`, "warning");
    } else if (status === "IZIN") {
        showNotification(`${name} dicatat izin`, "info");
    }

    refreshActiveStudent();
}

// ================= FUNGSI ABSENSI MANUAL =================
function markAttendanceManual(status) {
    const activeStudent = db.students.find((s) => s.id === db.activeStudentId);

    if (!activeStudent) {
        showNotification("Pilih siswa aktif terlebih dahulu!", "error");
        return;
    }

    if (!db.masterCard || !db.masterCard.uid) {
        showNotification("Kartu master belum diatur!", "error");
        return;
    }

    // Record attendance
    recordAttendance(db.masterCard.uid, activeStudent.name, activeStudent.class, status);

    // If using Arduino, send command
    if (isConnected) {
        sendCommand(`ATTENDANCE,${db.masterCard.uid},${activeStudent.name},${activeStudent.class},${status}`);
    }
}

// ================= SET ACTIVE STUDENT =================
function setActiveStudent(studentId) {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
        showNotification("Siswa tidak ditemukan", "error");
        return;
    }

    db.activeStudentId = studentId;
    saveData();

    // Send to Arduino
    if (isConnected) {
        const index = db.students.findIndex((s) => s.id === studentId) + 1;
        sendCommand(`SET_ACTIVE,${index}`);
    }

    updateActiveStudentDisplay();
    renderStudents();

    showNotification(`Siswa aktif: ${student.name} - Siap absen dengan kartu master`, "success");
}

function selectActiveStudent(studentId) {
    setActiveStudent(studentId);
    closeSelectStudentModal();
}

// ================= STUDENT MANAGEMENT =================
function showAddStudentModal() {
    resetAddStudentModal();
    document.getElementById("addStudentModal").style.display = "flex";
    document.getElementById("newStudentName").focus();
}

function resetAddStudentModal() {
    document.getElementById("addStudentModalTitle").innerHTML = '<i class="fas fa-user-plus"></i> Tambah Siswa Baru';

    const saveBtn = document.getElementById("saveStudentBtn");
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Siswa';
    saveBtn.onclick = addStudent;

    currentEditStudentId = null;

    document.getElementById("newStudentName").value = "";
    document.getElementById("newStudentClass").value = "";
    document.getElementById("newStudentNIS").value = "";
}

function closeAddStudentModal() {
    document.getElementById("addStudentModal").style.display = "none";
    resetAddStudentModal();
}

function addStudent() {
    const name = document.getElementById("newStudentName").value.trim();
    const className = document.getElementById("newStudentClass").value.trim();
    const nis = document.getElementById("newStudentNIS").value.trim();

    if (!name || !className) {
        showNotification("Nama dan kelas harus diisi!", "error");
        return;
    }

    // Cek apakah siswa sudah ada
    const existingStudent = db.students.find((s) => s.name.toLowerCase() === name.toLowerCase() && s.class.toLowerCase() === className.toLowerCase());

    if (existingStudent) {
        showNotification(`Siswa ${name} sudah terdaftar di kelas ${className}`, "warning");
        return;
    }

    const student = {
        id: Date.now(),
        name: name,
        class: className,
        nis: nis || "-",
        createdAt: new Date().toISOString(),
        attendanceCount: 0,
        arduinoSynced: false,
    };

    db.students.push(student);

    // Jika ini siswa pertama, jadikan sebagai siswa aktif
    if (db.students.length === 1) {
        setActiveStudent(student.id);
    }

    // Jika Arduino terhubung, sinkronkan
    if (isConnected) {
        sendCommand(`ADD_SISWA,${name},${className},${nis || "-"}`);
        student.arduinoSynced = true;
    }

    saveData();
    renderStudents();
    updateStats();

    showNotification(`Siswa ${name} berhasil ditambahkan!`, "success");
    closeAddStudentModal();

    // Scroll ke siswa baru
    setTimeout(() => {
        const studentList = document.getElementById("studentList");
        const studentItems = studentList.querySelectorAll(".student-item");
        if (studentItems.length > 0) {
            const lastItem = studentItems[studentItems.length - 1];
            lastItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, 100);
}

function editStudent(studentId) {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) return;

    currentEditStudentId = studentId;

    document.getElementById("newStudentName").value = student.name;
    document.getElementById("newStudentClass").value = student.class;
    document.getElementById("newStudentNIS").value = student.nis;

    document.getElementById("addStudentModalTitle").innerHTML = '<i class="fas fa-user-edit"></i> Edit Data Siswa';

    const saveBtn = document.getElementById("saveStudentBtn");
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Data';
    saveBtn.onclick = function () {
        updateStudent(studentId);
    };

    document.getElementById("addStudentModal").style.display = "flex";
    document.getElementById("newStudentName").focus();
}

function updateStudent(studentId) {
    const name = document.getElementById("newStudentName").value.trim();
    const className = document.getElementById("newStudentClass").value.trim();
    const nis = document.getElementById("newStudentNIS").value.trim();

    if (!name || !className) {
        showNotification("Nama dan kelas harus diisi!", "error");
        return;
    }

    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
        showNotification("Siswa tidak ditemukan", "error");
        return;
    }

    const oldName = student.name;
    const oldClass = student.class;

    student.name = name;
    student.class = className;
    student.nis = nis || "-";
    student.arduinoSynced = false;

    db.attendance.forEach((attendance) => {
        if (attendance.studentName === oldName && attendance.className === oldClass) {
            attendance.studentName = name;
            attendance.className = className;
        }
    });

    if (isConnected) {
        const index = db.students.findIndex((s) => s.id === studentId) + 1;
        sendCommand(`UPDATE_SISWA,${index},${name},${className},${nis || "-"}`);
    }

    saveData();
    refreshStudentList();
    renderAttendance();
    closeAddStudentModal();

    showNotification(`Data ${oldName} berhasil diperbarui`, "success");
}

function deleteStudent(studentId) {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
        showNotification("Siswa tidak ditemukan", "error");
        return;
    }

    const studentAttendance = db.attendance.filter((a) => a.studentName === student.name && a.className === student.class).length;

    const message = `
        <p>Apakah Anda yakin ingin menghapus siswa ini?</p>
        <p><strong>${student.name} - ${student.class}</strong></p>
        <p>NIS: ${student.nis}</p>
        <p style="color: var(--danger); margin-top: 10px;">
            <i class="fas fa-exclamation-circle"></i> 
            Aksi ini akan menghapus ${studentAttendance} data absensi terkait.
        </p>
        <p style="font-size: 0.9rem; color: #666; margin-top: 10px;">
            Tindakan ini tidak dapat dibatalkan.
        </p>
    `;

    showDeleteConfirmModal(message, function () {
        performDeleteStudent(studentId);
    });
}

function performDeleteStudent(studentId) {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) return;

    const studentIndex = db.students.findIndex((s) => s.id === studentId);

    db.students.splice(studentIndex, 1);

    db.attendance = db.attendance.filter((a) => !(a.studentName === student.name && a.className === student.class));

    if (db.activeStudentId === studentId) {
        db.activeStudentId = null;
        if (db.students.length > 0) {
            setActiveStudent(db.students[0].id);
        }
    }

    if (isConnected) {
        const arduinoIndex = studentIndex + 1;
        sendCommand(`DEL_SISWA,${arduinoIndex}`);
    }

    saveData();
    refreshStudentList();
    renderAttendance();
    updateStats();
    updateActiveStudentDisplay();

    showNotification(`Siswa ${student.name} berhasil dihapus`, "success");
    closeDeleteConfirmModal();
}

function clearAllStudents() {
    if (db.students.length === 0) {
        showNotification("Tidak ada siswa untuk dihapus", "warning");
        return;
    }

    const message = `
        <p>Apakah Anda yakin ingin menghapus SEMUA siswa?</p>
        <p style="color: var(--danger); margin: 15px 0;">
            <i class="fas fa-exclamation-triangle"></i> 
            <strong>PERINGATAN:</strong> Aksi ini akan menghapus:
        </p>
        <ul style="text-align: left; margin: 15px 0; padding-left: 20px;">
            <li>${db.students.length} data siswa</li>
            <li>${db.attendance.length} data absensi</li>
            <li>Kartu master akan tetap tersimpan</li>
        </ul>
        <p style="font-size: 0.9rem; color: #666;">
            Tindakan ini tidak dapat dibatalkan!
        </p>
    `;

    showDeleteConfirmModal(message, function () {
        performClearAllStudents();
    });
}

function performClearAllStudents() {
    db.students = [];
    db.attendance = [];
    db.activeStudentId = null;

    if (isConnected) {
        sendCommand("RESET_ALL");
    }

    saveData();
    refreshStudentList();
    renderAttendance();
    updateStats();
    updateActiveStudentDisplay();

    showNotification("Semua siswa dan data absensi telah dihapus", "warning");
    closeDeleteConfirmModal();
}

function showDeleteConfirmModal(message, confirmCallback) {
    document.getElementById("deleteConfirmContent").innerHTML = message;

    const confirmBtn = document.getElementById("confirmDeleteBtn");
    confirmBtn.onclick = confirmCallback;

    document.getElementById("deleteConfirmModal").style.display = "flex";
}

function closeDeleteConfirmModal() {
    document.getElementById("deleteConfirmModal").style.display = "none";
}

function syncStudentsToArduino() {
    if (!isConnected) return;

    db.students.forEach((student, index) => {
        if (!student.arduinoSynced) {
            setTimeout(() => {
                sendCommand(`ADD_SISWA,${student.name},${student.class},${student.nis}`);
                student.arduinoSynced = true;
            }, index * 500);
        }
    });

    saveData();
}

function showSelectStudentModal() {
    document.getElementById("selectStudentModal").style.display = "flex";
}

function closeSelectStudentModal() {
    document.getElementById("selectStudentModal").style.display = "none";
}

// ================= MASTER CARD FUNCTIONS =================
function showSetMasterModal() {
    document.getElementById("setMasterModal").style.display = "flex";
    document.getElementById("manualUID").value = "";

    if (isConnected) {
        sendCommand("MODE_SET_MASTER");
        showNotification("Tempelkan kartu untuk dijadikan master", "info");
    } else {
        showNotification("Hubungkan Arduino terlebih dahulu", "warning");
    }
}

function closeSetMasterModal() {
    document.getElementById("setMasterModal").style.display = "none";
    document.getElementById("detectedUID").textContent = "-";
    currentDetectedUID = "";

    if (isConnected) {
        sendCommand("MODE_NORMAL");
    }
}

function setMasterManual() {
    document.getElementById("setMasterManualModal").style.display = "flex";
    document.getElementById("manualMasterUID").focus();
}

function closeSetMasterManualModal() {
    document.getElementById("setMasterManualModal").style.display = "none";
    document.getElementById("manualMasterUID").value = "";
}

function saveMasterCardManual() {
    const uid = document.getElementById("manualMasterUID").value.trim().toUpperCase();

    if (!uid) {
        showNotification("UID tidak boleh kosong", "error");
        return;
    }

    db.masterCard = {
        uid: uid,
        registeredAt: new Date().toISOString(),
        source: "manual",
    };

    saveData();
    document.getElementById("masterCardUID").textContent = uid;

    if (isConnected) {
        sendCommand(`SET_MASTER,${uid}`);
        sendCommand(`MASTER_SET_MANUAL,${uid.replace(/ /g, "")}`);
    }

    showNotification("Kartu master manual berhasil disimpan!", "success");
    closeSetMasterManualModal();
}

function scanMasterCard() {
    showSetMasterModal();
}

function saveMasterCard() {
    let uid = currentDetectedUID;

    const manualUID = document.getElementById("manualUID").value.trim().toUpperCase();
    if (manualUID && !uid) {
        uid = manualUID;
    }

    if (!uid) {
        showNotification("Belum ada kartu yang terdeteksi atau dimasukkan", "error");
        return;
    }

    db.masterCard = {
        uid: uid,
        registeredAt: new Date().toISOString(),
        source: currentDetectedUID ? "scan" : "manual",
    };

    saveData();
    document.getElementById("masterCardUID").textContent = uid;

    if (isConnected) {
        sendCommand(`SET_MASTER,${uid}`);
    }

    showNotification("Kartu master berhasil disimpan!", "success");
    closeSetMasterModal();
}

function clearMasterCard() {
    if (confirm("Apakah Anda yakin ingin menghapus kartu master?")) {
        db.masterCard = null;
        saveData();

        document.getElementById("masterCardUID").textContent = "Belum diatur";

        if (isConnected) {
            sendCommand("RESET");
        }

        showNotification("Kartu master telah direset", "warning");
    }
}

function refreshMasterCard() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshMasterCard()"] i');
    refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui status kartu master...", "info");

    if (isConnected) {
        sendCommand("GET_MASTER");
    }

    if (db.masterCard) {
        document.getElementById("masterCardUID").textContent = db.masterCard.uid;
    }

    showNotification("Status kartu master diperbarui", "success");

    setTimeout(() => {
        refreshBtn.classList.remove("refreshing");
    }, 1000);
}

// ================= ATTENDANCE LOG FUNCTIONS =================
function renderAttendance() {
    const tbody = document.getElementById("attendanceTableBody");

    if (db.attendance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    Belum ada data absensi
                </td>
            </tr>
        `;
        return;
    }

    let html = "";

    db.attendance.forEach((record, index) => {
        let badgeClass = "badge-success";
        if (record.status === "TIDAK HADIR" || record.status === "TIDAK_HADIR") {
            badgeClass = "badge-danger";
        } else if (record.status === "IZIN") {
            badgeClass = "badge-warning";
        }

        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${record.date} ${record.time}</td>
                <td><strong>${record.studentName}</strong></td>
                <td>${record.className}</td>
                <td>
                    <span class="badge ${badgeClass}">
                        ${record.status}
                    </span>
                </td>
                <td><code>${record.uid}</code></td>
                <td>
                    <button class="btn" style="padding: 5px 10px; font-size: 0.8rem;" 
                            onclick="deleteAttendance(${record.id})" title="Hapus absensi">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function deleteAttendance(id) {
    if (confirm("Apakah Anda yakin ingin menghapus absensi ini?")) {
        const index = db.attendance.findIndex((a) => a.id === id);
        if (index !== -1) {
            db.attendance.splice(index, 1);
            saveData();
            renderStudents();
            renderAttendance();
            updateStats();
            updateTodayStats();
            showNotification("Absensi berhasil dihapus", "success");
        }
    }
}

function clearAttendanceLog() {
    if (confirm("Apakah Anda yakin ingin menghapus semua riwayat absensi?")) {
        db.attendance = [];
        saveData();
        renderStudents();
        renderAttendance();
        updateStats();
        updateTodayStats();
        showNotification("Riwayat absensi telah dihapus", "warning");
    }
}

// ================= STATS FUNCTIONS =================
function updateStats() {
    document.getElementById("totalStudents").textContent = db.students.length;
    document.getElementById("totalAttendance").textContent = db.attendance.length;

    const today = new Date().toLocaleDateString("id-ID");
    const todayCount = db.attendance.filter((a) => a.date === today).length;
    document.getElementById("todayAttendance").textContent = todayCount;
}

function refreshStudents() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshStudents()"] i');
    refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui data siswa...", "info");

    if (isConnected) {
        sendCommand("LIST_SISWA");
    }

    updateStats();
    renderStudents();
    updateTodayStats();
    showNotification("Data siswa diperbarui", "success");

    setTimeout(() => {
        refreshBtn.classList.remove("refreshing");
    }, 1000);
}

function refreshStudentList() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshStudentList()"] i');
    refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui daftar siswa...", "info");

    renderStudents();
    updateStats();
    updateTodayStats();

    if (isConnected) {
        sendCommand("LIST_SISWA");
    }

    showNotification("Daftar siswa diperbarui", "success");

    setTimeout(() => {
        refreshBtn.classList.remove("refreshing");
    }, 1000);
}

function refreshAttendance() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshAttendance()"] i');
    refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui data absensi...", "info");

    renderAttendance();
    updateStats();
    updateTodayStats();

    if (isConnected) {
        sendCommand("GET_LOG");
    }

    showNotification("Data absensi diperbarui", "success");

    setTimeout(() => {
        refreshBtn.classList.remove("refreshing");
    }, 1000);
}

function refreshAttendanceLog() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshAttendanceLog()"] i');
    refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui riwayat absensi...", "info");

    renderAttendance();

    if (isConnected) {
        sendCommand("GET_LOG");
    }

    showNotification("Riwayat absensi diperbarui", "success");

    setTimeout(() => {
        refreshBtn.classList.remove("refreshing");
    }, 1000);
}

function refreshAllData() {
    const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshAllData()"] i');
    refreshBtn.classList.add("refreshing");

    showNotification("Memperbarui semua data...", "