// --- ImporFungsi Firebase ---
// Kita mengimpor semua fungsi yang kita butuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    serverTimestamp,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Variabel Global & Konfigurasi Firebase ---

// Variabel ini akan disediakan oleh lingkungan Canvas
// const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const firebaseConfig = {
    apiKey: "AIzaSyAGtdqP2YT3J14rTfY3BXqWg3Kgzxuli_0",
    authDomain: "data-pemira-v2.firebaseapp.com",
    projectId: "data-pemira-v2",
    storageBucket: "data-pemira-v2.firebasestorage.app",
    messagingSenderId: "388029782225",
    appId: "1:388029782225:web:f33ce63f24c44ff19fcdf0",
    measurementId: "G-9W5614GKQZ"
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inisialisasi Firebase
let app, auth, db;
let userId;
let isAuthReady = false; // Flag untuk menandakan auth siap

// Path koleksi di Firestore
// Kita gunakan koleksi publik untuk memeriksa duplikat dari *semua* pemilih
const votersCollectionPath = `/artifacts/${appId}/public/data/voters`;

// --- Variabel State Aplikasi ---
let selectedCandidate = null; // Menyimpan kandidat yang dipilih (1, 2, or 3)
let voterData = {}; // Menyimpan data diri pemilih sementara
let isSubmitting = false; // Mencegah klik ganda saat submit

// --- Selektor DOM ---
// Mengambil semua elemen yang kita butuhkan dari HTML
const pageDataDiri = document.getElementById('pageDataDiri');
const pageVoting = document.getElementById('pageVoting');
const pageSelesai = document.getElementById('pageSelesai');

const formDataDiri = document.getElementById('formDataDiri');
const inputNama = document.getElementById('nama');
const inputProdi = document.getElementById('prodi');
const inputTelepon = document.getElementById('telepon');
const inputEmail = document.getElementById('email');

const btnLanjutkan = document.getElementById('btnLanjutkan');
const btnPilih1 = document.getElementById('btnPilih1');
const btnPilih2 = document.getElementById('btnPilih2');
const btnPilih3 = document.getElementById('btnPilih3');
const candidateButtons = [btnPilih1, btnPilih2, btnPilih3];

const btnKembaliKeData = document.getElementById('btnKembaliKeData');
const btnSubmitVote = document.getElementById('btnSubmitVote');
const btnKembaliKeAwal = document.getElementById('btnKembaliKeAwal');

// --- Fungsi Bantuan (Helpers) ---

/**
 * Menampilkan halaman berdasarkan ID dan menyembunyikan yang lain.
 * @param {string} pageId - ID dari elemen halaman yang ingin ditampilkan.
 */
function showPage(pageId) {
    [pageDataDiri, pageVoting, pageSelesai].forEach(page => {
        if (page) {
            page.style.display = (page.id === pageId) ? 'block' : 'none';
        }
    });
}

/**
 * Menampilkan pesan error di bawah form.
 * @param {HTMLElement} parentElement - Elemen (seperti form) tempat pesan error akan disisipkan.
 * @param {string} message - Pesan error yang ingin ditampilkan.
 */
function showError(parentElement, message) {
    clearError(parentElement); // Hapus error lama jika ada
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message'; // Anda bisa tambahkan style untuk kelas ini di HTML
    errorElement.style.color = '#F87171'; // Merah
    errorElement.style.fontSize = '14px';
    errorElement.style.marginTop = '10px';
    errorElement.textContent = message;
    parentElement.appendChild(errorElement);
}

/**
 * Menghapus pesan error dari form.
 * @param {HTMLElement} parentElement - Elemen (seperti form) tempat pesan error berada.
 */
function clearError(parentElement) {
    const oldError = parentElement.querySelector('.error-message');
    if (oldError) {
        oldError.remove();
    }
}

/**
 * Memperbarui tampilan tombol kandidat untuk menunjukkan pilihan.
 * @param {number | null} selectedIndex - Index kandidat (1, 2, atau 3) atau null.
 */
function updateCandidateButtons(selectedIndex) {
    candidateButtons.forEach((btn, index) => {
        if (btn) {
            if (index + 1 === selectedIndex) {
                btn.classList.add('btn-terpilih'); // Tambah kelas 'terpilih'
                btn.textContent = 'Terpilih';
            } else {
                btn.classList.remove('btn-terpilih'); // Hapus kelas 'terpilih'
                btn.textContent = 'Vote';
            }
        }
    });
    
    // Aktifkan tombol submit hanya jika ada kandidat yang dipilih
    if (btnSubmitVote) {
        btnSubmitVote.disabled = (selectedIndex === null);
    }
}

/**
 * Mereset seluruh state aplikasi ke awal.
 */
function resetApp() {
    voterData = {};
    selectedCandidate = null;
    isSubmitting = false;
    
    if (formDataDiri) formDataDiri.reset(); // Reset isian form
    
    updateCandidateButtons(null); // Reset tombol kandidat
    
    // Pastikan tombol tidak dalam keadaan loading/disabled
    if (btnLanjutkan) btnLanjutkan.disabled = false;
    if (btnSubmitVote) btnSubmitVote.disabled = true;
    
    clearError(formDataDiri);
    clearError(pageVoting.querySelector('.card')); // Hapus error di halaman voting
    
    showPage('pageDataDiri'); // Kembali ke halaman data diri
}

// --- Fungsi Inisialisasi Firebase ---

/**
 * Menginisialisasi Firebase dan proses otentikasi.
 */
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Aktifkan log untuk debugging
        setLogLevel('Debug');

        // Menunggu status otentikasi
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User sudah login
                userId = user.uid;
                console.log("Otentikasi berhasil, UserID:", userId);
                isAuthReady = true; // Tandai bahwa auth siap
            } else {
                // User belum login, coba login
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                        console.log("Login dengan Custom Token berhasil.");
                    } else {
                        await signInAnonymously(auth);
                        console.log("Login sebagai Anonim berhasil.");
                    }
                    // onAuthStateChanged akan ter-trigger lagi setelah ini
                } catch (authError) {
                    console.error("Gagal melakukan otentikasi:", authError);
                    showError(formDataDiri, "Gagal terhubung ke server. Coba muat ulang.");
                }
            }
        });

    } catch (e) {
        console.error("Error inisialisasi Firebase:", e);
        showError(formDataDiri, "Gagal memuat aplikasi. Coba muat ulang.");
    }
}

// --- Event Handlers ---

/**
 * Handler untuk tombol 'Lanjutkan' (Cek data diri & duplikat).
 */
async function handleLanjutkan() {
    if (!isAuthReady) {
        showError(formDataDiri, "Server belum siap, mohon tunggu sebentar...");
        return;
    }
    if (isSubmitting) return; // Mencegah klik ganda

    clearError(formDataDiri);
    isSubmitting = true;
    btnLanjutkan.disabled = true;
    btnLanjutkan.textContent = 'Memeriksa...';

    // Ambil data dari form
    const nama = inputNama.value.trim();
    const prodi = inputProdi.value;
    const telepon = inputTelepon.value.trim();
    const email = inputEmail.value.trim().toLowerCase();

    // Validasi form dasar
    if (!nama || !prodi || !telepon || !email) {
        showError(formDataDiri, "Semua data wajib diisi.");
        isSubmitting = false;
        btnLanjutkan.disabled = false;
        btnLanjutkan.textContent = 'Lanjutkan';
        return;
    }

    try {
        // 1. Cek duplikat berdasarkan Email
        const emailQuery = query(collection(db, votersCollectionPath), where("email", "==", email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            // Jika email sudah ada
            showError(formDataDiri, "Email ini sudah terdaftar untuk voting.");
            isSubmitting = false;
            btnLanjutkan.disabled = false;
            btnLanjutkan.textContent = 'Lanjutkan';
            return; // Hentikan proses
        }

        // 2. Cek duplikat berdasarkan No. Telepon
        const teleponQuery = query(collection(db, votersCollectionPath), where("telepon", "==", telepon));
        const teleponSnapshot = await getDocs(teleponQuery);

        if (!teleponSnapshot.empty) {
            // Jika telepon sudah ada
            showError(formDataDiri, "No. Telepon ini sudah terdaftar untuk voting.");
            isSubmitting = false;
            btnLanjutkan.disabled = false;
            btnLanjutkan.textContent = 'Lanjutkan';
            return; // Hentikan proses
        }

        // 3. Jika lolos cek duplikat
        console.log("Data unik. Melanjutkan ke halaman voting.");
        voterData = { nama, prodi, telepon, email }; // Simpan data untuk submit nanti
        showPage('pageVoting');

    } catch (error) {
        console.error("Error saat cek duplikat:", error);
        showError(formDataDiri, "Terjadi kesalahan. Coba lagi.");
    } finally {
        isSubmitting = false;
        btnLanjutkan.disabled = false;
        btnLanjutkan.textContent = 'Lanjutkan';
    }
}

/**
 * Handler untuk tombol 'Submit Pilihan' (Menyimpan vote).
 */
async function handleSubmitVote() {
    if (!isAuthReady) {
        showError(pageVoting.querySelector('.card'), "Server belum siap, mohon tunggu.");
        return;
    }
    if (isSubmitting) return; // Mencegah klik ganda

    if (!selectedCandidate) {
        showError(pageVoting.querySelector('.card'), "Anda harus memilih 1 kandidat.");
        return;
    }
    
    clearError(pageVoting.querySelector('.card'));
    isSubmitting = true;
    btnSubmitVote.disabled = true;
    btnSubmitVote.textContent = 'Menyimpan...';

    try {
        // Gabungkan data diri dengan pilihan vote
        const finalVoteData = {
            ...voterData,
            kandidatPilihan: selectedCandidate,
            timestamp: serverTimestamp() // Tambahkan timestamp server
        };

        // Simpan data ke Firestore
        const docRef = await addDoc(collection(db, votersCollectionPath), finalVoteData);
        
        console.log("Vote berhasil disimpan dengan ID:", docRef.id);
        
        // Pindah ke halaman selesai
        showPage('pageSelesai');

    } catch (error) {
        console.error("Error saat menyimpan vote:", error);
        showError(pageVoting.querySelector('.card'), "Gagal menyimpan vote. Coba lagi.");
    } finally {
        isSubmitting = false;
        // Tombol submit tetap disabled setelah berhasil, karena user tidak bisa vote lagi
        // Jika gagal, kita aktifkan lagi
        if (!pageSelesai.style.display || pageSelesai.style.display === 'none') {
             btnSubmitVote.disabled = false;
             btnSubmitVote.textContent = 'Submit Pilihan';
        }
    }
}

// --- Event Listeners ---

// Menjalankan kode setelah semua elemen HTML dimuat
document.addEventListener('DOMContentLoaded', () => {
    
    // Inisialisasi Firebase saat DOM siap
    initializeFirebase();

    // Tampilkan halaman data diri pertama kali
    showPage('pageDataDiri');
    // Nonaktifkan tombol submit vote di awal
    if(btnSubmitVote) btnSubmitVote.disabled = true;

    // --- Halaman Data Diri ---
    if (btnLanjutkan) {
        btnLanjutkan.addEventListener('click', handleLanjutkan);
    }

    // --- Halaman Voting ---
    if (btnPilih1) {
        btnPilih1.addEventListener('click', () => {
            selectedCandidate = 1;
            updateCandidateButtons(1);
        });
    }
    if (btnPilih2) {
        btnPilih2.addEventListener('click', () => {
            selectedCandidate = 2;
            updateCandidateButtons(2);
        });
    }
    if (btnPilih3) {
        btnPilih3.addEventListener('click', () => {
            selectedCandidate = 3;
            updateCandidateButtons(3);
        });
    }

    if (btnSubmitVote) {
        btnSubmitVote.addEventListener('click', handleSubmitVote);
    }
    
    if (btnKembaliKeData) {
        btnKembaliKeData.addEventListener('click', () => {
            // Kembali ke data diri, tapi JANGAN reset data
            // Biarkan pengguna mengedit jika perlu
            showPage('pageDataDiri');
        });
    }

    // --- Halaman Selesai ---
    if (btnKembaliKeAwal) {
        btnKembaliKeAwal.addEventListener('click', resetApp);
    }
});