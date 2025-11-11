/* =================================
   BAGIAN 0: KONEKSI FIREBASE
   ================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// KITA TAMBAH getDocs, query, where, collection untuk pengecekan data
import { getFirestore, addDoc, collection, getDocs, query, where, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAMniwHKZMz1Vxtfk6U7-yN2nGi_i_KjY",
  authDomain: "data-pemira-2025.firebaseapp.com",
  projectId: "data-pemira-2025",
  storageBucket: "data-pemira-2025.firebasestorage.app",
  messagingSenderId: "138250571821",
  appId: "1:138250571821:web:505c345b1106f4c34528a4"
};

let db;

async function hubungkanKeFirebase() {
  setLogLevel('Debug');
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    db = getFirestore(app);
    
    await signInAnonymously(auth);
    
    console.log("Firebase berhasil terhubung! (Mode Pengecekan Duplikat)");
    return true; 
    
  } catch (error) {
    console.error("GAGAL KONEK FIREBASE:", error);
    alert("FATAL ERROR: Gagal terhubung ke server. Silakan muat ulang.");
    return false;
  }
}


// --- BAGIAN 1-6 (ALAT DAN LOGIKA LAMA) ---
const pageDataDiri = document.getElementById('pageDataDiri');
const pageVoting = document.getElementById('pageVoting');
const pageSelesai = document.getElementById('pageSelesai');
const formDataDiri = document.getElementById('formDataDiri');
const btnLanjutkan = document.getElementById('btnLanjutkan');
const btnKembaliKeData = document.getElementById('btnKembaliKeData');
const btnSubmitVote = document.getElementById('btnSubmitVote'); 
const btnKembaliKeAwal = document.getElementById('btnKembaliKeAwal');
const btnPilih1 = document.getElementById('btnPilih1');
const btnPilih2 = document.getElementById('btnPilih2'); 
const btnPilih3 = document.getElementById('btnPilih3');
const semuaTombolVote = [btnPilih1, btnPilih2, btnPilih3];

let dataPemilih = {};
let pilihanKandidat = null; 

function scrollToTop() {
    window.scrollTo(0, 0);
}

btnLanjutkan.addEventListener('click', () => {
    if(!formDataDiri.checkValidity()) {
        alert('Harap isi semua data dengan format yang benar');
        return;
    }
    
    dataPemilih = {
        nama: document.getElementById('nama').value,
        prodi: document.getElementById('prodi').value,
        telepon: document.getElementById('telepon').value,
        email: document.getElementById('email').value,
    };
    
    console.log('Data Pemilih Tersimpan', dataPemilih);

    pageDataDiri.style.display = 'none';
    pageVoting.style.display = 'block';
    pageSelesai.style.display = 'none';

    scrollToTop();
});

btnKembaliKeData.addEventListener('click', () => {
    pageDataDiri.style.display = 'block';
    pageVoting.style.display = 'none';
    pageSelesai.style.display = 'none';
    scrollToTop();
});

function handleVote(pilihan, tombolYangDipilih) {
    pilihanKandidat = pilihan;
    console.log('Pilihan Anda Terkunci:', pilihanKandidat); 
    
    semuaTombolVote.forEach(tombol => {
        tombol.disabled = true; 
    });

    tombolYangDipilih.innerText = 'Telah Dipilih ✔';
    tombolYangDipilih.classList.add('btn-terpilih');
}
btnPilih1.addEventListener('click', () => handleVote('Kandidat 1', btnPilih1));
btnPilih2.addEventListener('click', () => handleVote('Kandidat 2', btnPilih2));
btnPilih3.addEventListener('click', () => handleVote('Kandidat 3',btnPilih3));


// --- BAGIAN 7: LOGIKA SUBMIT (KIRIM KE FIREBASE DENGAN VALIDASI) ---
btnSubmitVote.addEventListener('click', async () => {
    
    if (pilihanKandidat === null) {
        alert('Silahkan pilih salah satu kandidat');
        return;
    }

    const dataLengkapVote = {
        ...dataPemilih, 
        pilihan: pilihanKandidat,
        waktuVote: new Date().toISOString()
    };

    try {
        btnSubmitVote.disabled = true;
        btnSubmitVote.innerText = 'Memvalidasi...';
        
        const koleksiVotes = collection(db, "votes");
        const emailPemilih = dataLengkapVote.email;

        // 1. TAHAP VALIDASI: CEK APAKAH EMAIL SUDAH ADA?
        const q = query(koleksiVotes, where("email", "==", emailPemilih));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // JIKA snapshot TIDAK kosong (email ditemukan)
            alert('PERINGATAN! Alamat email ini sudah pernah digunakan untuk voting. Vote tidak dapat dilakukan dua kali.');
            btnSubmitVote.disabled = false;
            btnSubmitVote.innerText = 'Submit Pilihan';
            return; // Hentikan proses vote
        }
        
        // 2. TAHAP PENYIMPANAN: JIKA LOLOS, TAMBAHKAN DOKUMEN BARU
        btnSubmitVote.innerText = 'Mengirim...';
        const docRef = await addDoc(koleksiVotes, dataLengkapVote);
        
        console.log("Vote berhasil disimpan dengan ID acak: ", docRef.id);

        // 3. Pindah halaman
        pageDataDiri.style.display = 'none';
        pageVoting.style.display = 'none';
        pageSelesai.style.display = 'block';
        scrollToTop();

    } catch (error) {
        console.error("FATAL ERROR saat mengirim vote:", error);
        alert("GAGAL MENGIRIM VOTE! Terjadi kesalahan pada server. Silakan coba lagi.");
        
        btnSubmitVote.disabled = false;
        btnSubmitVote.innerText = 'Submit Pilihan';
    }
});

// --- BAGIAN 8: LOGIKA RESET ---
btnKembaliKeAwal.addEventListener('click', () => {
    
    formDataDiri.reset();
    dataPemilih = {};
    pilihanKandidat = null;
    
    semuaTombolVote.forEach(tombol => {
        tombol.disabled = false;
        tombol.innerText = 'vote';
        tombol.classList.remove('btn-terpilih');
    });

    btnSubmitVote.disabled = false;
    btnSubmitVote.innerText = 'Submit Pilihan';
    
    pageDataDiri.style.display = 'block';
    pageVoting.style.display = 'none';
    pageSelesai.style.display = 'none';
    
    scrollToTop();
});

// --- BAGIAN 9: JALANKAN KONEKSI FIREBASE ---
hubungkanKeFirebase();