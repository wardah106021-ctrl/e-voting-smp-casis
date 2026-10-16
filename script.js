// ===================================================
// HUBUNGAN DATABASE ONLINE GOOGLE FIREBASE REALTIME
// ===================================================
const firebaseConfig = {
    databaseURL: "https://voting-smp-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Mulai jalankan modul koneksi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variabel Global Sistem
let siswaAktifNama = "";
let siswaAktifKelas = "";
const PASSWORD_ADMIN_RAHASIA = "adminrpl123"; 

// ===================================================
// SISTEM PEMILIHAN SISWA (CLIENT VOTE)
// ===================================================

function prosesLogin(event) {
    event.preventDefault();
    const namaInput = document.getElementById("input-nama").value.trim();
    const kelasInput = document.getElementById("input-kelas").value;

    // CEK RIWAYAT DOUBLE NYOBLOS KE SERVER GOOGLE FIREBASE
    database.ref('logDaftarPemilih/' + namaInput).once('value', function(snapshot) {
        if (snapshot.exists()) {
            alert("Sistem Menolak! Atas nama " + namaInput + " terdeteksi sudah pernah melakukan voting di HP/perangkat lain.");
        } else {
            // Berhasil lolos skrining
            siswaAktifNama = namaInput;
            siswaAktifKelas = kelasInput;

            document.getElementById("user-aktif").innerHTML = siswaAktifNama;
            document.getElementById("kelas-aktif").innerHTML = siswaAktifKelas;

            // Buka tirai bilik suara
            document.getElementById("layar-login").classList.add("sembunyi");
            document.getElementById("layar-voting").classList.remove("sembunyi");
        }
    });
}

function kirimSuara(idKandidat) {
    // Matikan interaksi tombol untuk mencegah klik spamming data
    document.getElementById("btn-01").disabled = true;
    document.getElementById("btn-02").disabled = true;

    // 1. Tembak data siswa ke log audit online di Firebase
    let dataPemilihBaru = {};
    dataPemilihBaru['logDaftarPemilih/' + siswaAktifNama] = {
        kelas: siswaAktifKelas,
        status: "Sudah Memilih"
    };
    database.ref().update(dataPemilihBaru);

    // 2. Tambahkan total perolehan suara paslon secara aman (Atomic Transaction)
    database.ref('dataSuara/' + idKandidat).transaction(function(suaraSekarang) {
        return (suaraSekarang || 0) + 1;
    }, function(error, committed, snapshot) {
        if (committed) {
            alert("Suara dari " + siswaAktifNama + " (" + siswaAktifKelas + ") BERHASIL dikirim secara online!");
        } else {
            alert("Koneksi internet bermasalah, silakan ulangi kembali.");
        }
        
        // Hidupkan tombol kembali dan reset layar ke antrean semula
        document.getElementById("btn-01").disabled = false;
        document.getElementById("btn-02").disabled = false;
        risetUlangFormKeAwal();
    });
}

function risetUlangFormKeAwal() {
    document.getElementById("input-nama").value = "";
    document.getElementById("input-kelas").value = "";
    document.getElementById("layar-voting").classList.add("sembunyi");
    document.getElementById("layar-login").classList.remove("sembunyi");
    siswaAktifNama = "";
    siswaAktifKelas = "";
}

// ===================================================
// SISTEM INTEGRASI LIVE MONITORING PANEL ADMIN
// ===================================================

function aksesPanelAdmin() {
    const inputPassword = prompt("Masukkan Kata Sandi Otoritas Admin OSIS:");

    if (inputPassword === null) return; 

    if (inputPassword.trim() === "adminrpl123") {
        alert("Akses Diterima! Menghubungkan ke sinkronisasi online.");
        
        document.getElementById("layar-login").classList.add("sembunyi");
        document.getElementById("layar-voting").classList.add("sembunyi");
        document.getElementById("layar-admin").classList.remove("sembunyi");

        database.ref().on('value', function(snapshot) {
            const semuaData = snapshot.val() || {};
            const dataSuaraServer = semuaData.dataSuara || { kandidat1: 0, kandidat2: 0 };
            const logPemilihServer = semuaData.logDaftarPemilih || {};

            renderGrafikLive(dataSuaraServer);
            renderTabelLive(logPemilihServer);
        });

    } else {
        alert("Akses Ditolak! Kata sandi salah.");
    }
}

function tutupPanelAdmin() {
    // Matikan fungsi radar (.off) demi kestabilan data internal laptop
    database.ref().off();
    document.getElementById("layar-admin").classList.add("sembunyi");
    document.getElementById("layar-login").classList.remove("sembunyi");
}

function renderGrafikLive(dataSuara) {
    let vote01 = dataSuara.kandidat1 || 0;
    let vote02 = dataSuara.kandidat2 || 0;
    let totalSuara = vote01 + vote02;
    
    document.getElementById("suara-01").innerHTML = vote01;
    document.getElementById("suara-02").innerHTML = vote02;

    let persen01 = totalSuara > 0 ? Math.round((vote01 / totalSuara) * 100) : 0;
    let persen02 = totalSuara > 0 ? Math.round((vote02 / totalSuara) * 100) : 0;

    const bar01 = document.getElementById("bar-01");
    bar01.style.width = persen01 + "%";
    bar01.innerHTML = persen01 + "%";

    const bar02 = document.getElementById("bar-02");
    bar02.style.width = persen02 + "%";
    bar02.innerHTML = persen02 + "%";
}

function renderTabelLive(logDaftarPemilih) {
    const tbody = document.getElementById("isiTabelAudit");
    tbody.innerHTML = ""; 

    for (let namaSiswa in logDaftarPemilih) {
        const data = logDaftarPemilih[namaSiswa];
        const barisHTML = `
            <tr>
                <td><strong>${namaSiswa}</strong></td>
                <td>${data.kelas}</td>
                <td><span class="badge-success">${data.status}</span></td>
            </tr>
        `;
        tbody.innerHTML += barisHTML;
    }
}
