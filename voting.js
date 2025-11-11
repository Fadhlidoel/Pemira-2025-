/* =================================
   BAGIAN 0: KONEKSI FIREBASE
   (Ini adalah "kunci" Firebase-mu yang sudah benar)
   ================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// KITA TAMBAHKAN 'setDoc' dan 'doc' untuk validasi
import { getFirestore, setDoc, doc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAMniwHKZMz1Vxtfk6U7-yN2nGi_i_KjY",
  authDomain: "data-pemira-2025.firebaseapp.com",
  projectId: "data-pemira-2025",
  storageBucket: "data-pemira-2025.firebasestorage.app",
  messagingSenderId: "138250571821",
  appId: "1:138250571821:web:505c345b1106f4c34528a4"
};

// Variabel global untuk database (akan diisi setelah konek)
let db;

// --- FUNGSI UNTUK KONEKSI KE FIREBASE ---
async function hubungkanKeFirebase() {
  setLogLevel('Debug');
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    db = getFirestore(app); // Isi variabel 'db'
    
    await signInAnonymously(auth);
    
    console.log("Firebase berhasil terhubung! (Mode Aman)");
    return true; // Beri sinyal sukses
    
  } catch (error) {
    console.error("GAGAL KONEK FIREBASE:", error);
    alert("FATAL ERROR: Gagal terhubung ke server. Silakan muat ulang.");
    return false; // Beri sinyal gagal
  }
}


// --- BAGIAN 1: PERSIAPAN ALAT (AMBIL SEMUA ELEMEN HTML) ---
const pageDataDiri = document.getElementById('pageDataDiri');
const pageVoting = document.getElementById('pageVoting');
const pageSelesai = document.getElementById('pageSelesai');
const formDataDiri = document.getElementById('formDataDiri');
const btnLanjutkan = document.getElementById('btnLanjutkan');
const btnKembaliKeData = document.getElementById('btnKembaliKeData');
const btnSubmitVote = document.getElementById('btnSubmitVote'); 
const btnKembaliKeAwal = document.getElementById('btnKembaliKeAwal');
const btnPilih1 = document.getElementById('btnPilih1');
// Ini perbaikan typo dari file-mu yang lama: 'btnPilihan2' -> 'btnPilih2'
const btnPilih2 = document.getElementById('btnPilih2'); 
const btnPilih3 = document.getElementById('btnPilih3');
const semuaTombolVote = [btnPilih1, btnPilih2, btnPilih3];

// --- BAGIAN 2: KOTAK PENYIMPANAN DATA (VARIABEL) ---
let dataPemilih = {};
let pilihanKandidat = null; 

// --- BAGIAN 3: FUNGSI BANTUAN (GULIR KE ATAS) ---
function scrollToTop() {
    window.scrollTo(0, 0);
}

// --- BAGIAN 4: LOGIKA NAVIGASI (Halaman 1 -> 2) ---
btnLanjutkan.addEventListener('click', () => {
    // 0. Cek form-nya valid atau tidak
    if(!formDataDiri.checkValidity()) {
        alert('Harap isi semua data dengan format yang benar');
        return; // Hentikan fungsi
    }
    
    // 1. Ambil semua data dari form
    dataPemilih = {
        nama: document.getElementById('nama').value,
        prodi: document.getElementById('prodi').value,
        telepon: document.getElementById('telepon').value,
        email: document.getElementById('email').value, // Ini perbaikan typo 'email'
    };
    
    // 2. Cek di console (untuk debug)
    console.log('Data Pemilih Tersimpan', dataPemilih);

    // 3. Pindah halaman
    pageDataDiri.style.display = 'none';
    pageVoting.style.display = 'block';
    pageSelesai.style.display = 'none';

    scrollToTop();
});

// --- BAGIAN 5: LOGIKA NAVIGASI (Halaman 2 -> 1) ---
btnKembaliKeData.addEventListener('click', () => {
    pageDataDiri.style.display = 'block';
    pageVoting.style.display = 'none';
    pageSelesai.style.display = 'none';
    scrollToTop();
});

// --- BAGIAN 6: LOGIKA INTI VOTING (Resep Vote) ---
function handleVote(pilihan, tombolYangDipilih) {
    pilihanKandidat = pilihan;
    console.log('Pilihan Anda Terkunci:', pilihanKandidat); 
    
    // Loop semua tombol dan nonaktifkan
    semuaTombolVote.forEach(tombol => {
        // Ini perbaikan typo 'btn' -> 'tombol'
        tombol.disabled = true; 
    });

    // Ubah tombol yang diklik
    tombolYangDipilih.innerText = 'Telah Dipilih ✔';
    tombolYangDipilih.classList.add('btn-terpilih');
}
// Pasang 'telinga' ke tombol
btnPilih1.addEventListener('click', () => handleVote('Kandidat 1', btnPilih1));
btnPilih2.addEventListener('click', () => handleVote('Kandidat 2', btnPilih2));
btnPilih3.addEventListener('click', () => handleVote('Kandidat 3',btnPilih3));

// --- BAGIAN 7: LOGIKA SUBMIT (KIRIM KE FIREBASE) ---
btnSubmitVote.addEventListener('click', async () => {
    
    // 1. Gerbang Validasi: Pastikan sudah memilih
    if (pilihanKandidat === null) {
        alert('Silahkan pilih salah satu kandidat');
        return; // Hentikan fungsi
    }

    // 2. Siapkan data lengkap yang akan dikirim
    const dataLengkapVote = {
        ...dataPemilih, // Salin data pemilih (nama, prodi, dll)
        pilihan: pilihanKandidat, // Tambahkan pilihan kandidat
        waktuVote: new Date().toISOString() // Waktu vote
    };

    // 3. KIRIM KE FIREBASE (dengan try...catch)
    try {
        // (UI Loading) Nonaktifkan tombol saat mengirim
        btnSubmitVote.disabled = true;
        btnSubmitVote.innerText = 'Mengirim...';

        // INI ADALAH LOGIKA AMAN:
        // Kita gunakan 'email' sebagai ID dokumen.
        // Jika email yang sama voting 2x, data lama akan DITIMPA (bukan nambah baru).
        // Ini adalah cara validasi 1 orang = 1 vote.
        const idUnikPemilih = dataLengkapVote.email; 
        
        // Perintah "set" dokumen di koleksi 'votes' dengan ID 'idUnikPemilih'
        await setDoc(doc(db, "votes", idUnikPemilih), dataLengkapVote);
        
        console.log("Vote berhasil disimpan/diupdate dengan ID: ", idUnikPemilih);

        // 4. Pindah halaman HANYA JIKA berhasil kirim
        pageDataDiri.style.display = 'none';
        pageVoting.style.display = 'none';
        pageSelesai.style.display = 'block';
        scrollToTop();

    } catch (error) {
        // Jika 'await setDoc' GAGAL
        console.error("Error saat mengirim vote ke Firebase: ", error);
        alert("GAGAL MENGIRIM VOTE! Silakan coba lagi.");
        
        // Aktifkan lagi tombolnya jika gagal
        btnSubmitVote.disabled = false;
        btnSubmitVote.innerText = 'Submit Pilihan';
    }
});

// --- BAGIAN 8: LOGIKA RESET ---
btnKembaliKeAwal.addEventListener('click', () => {
    
    // 1. Reset Form (kosongkan input nama, prodi, dll)
    formDataDiri.reset();
    
    // 2. Reset variabel data di JavaScript
    dataPemilih = {};
    pilihanKandidat = null;
    
    // 3. Reset tombol-tombol vote
    semuaTombolVote.forEach(tombol => {
        tombol.disabled = false;
        tombol.innerText = 'vote';
        tombol.classList.remove('btn-terpilih');
    });

    // 4. Aktifkan kembali tombol submit
    btnSubmitVote.disabled = false;
    btnSubmitVote.innerText = 'Submit Pilihan';
    
    // 5. Pindah halaman kembali ke awal
    pageDataDiri.style.display = 'block';
    pageVoting.style.display = 'none';
    pageSelesai.style.display = 'none';
    
    scrollToTop();
});

// --- BAGIAN 9: JALANKAN KONEKSI FIREBASE ---
// Kita panggil fungsi koneksi saat skrip pertama kali dimuat
hubungkanKeFirebase();