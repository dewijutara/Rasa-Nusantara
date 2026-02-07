
const firebaseConfig = {
    apiKey: "AIzaSyBIQRukk23C7VPrYljmJGTMYY4tPFV_B34",
    authDomain: "rasa-nusantara-dapur.firebaseapp.com",
    databaseURL: "https://rasa-nusantara-dapur-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "rasa-nusantara-dapur",
    storageBucket: "rasa-nusantara-dapur.firebasestorage.app",
    messagingSenderId: "713324395000",
    appId: "1:713324395000:web:8800abbd837f546f66fe0d"
};

// Cek agar tidak inisialisasi ganda
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
let cart = [];
let listIdLama = [];

// 2. LOGIKA MONITOR DAPUR (SUARA & RENDER)
// Bagian ini hanya berjalan jika elemen 'container-pesanan' ada di HTML (Monitor Dapur)
const containerPesanan = document.getElementById('container-pesanan');
if (containerPesanan) {
    database.ref('pesanan_masuk').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            containerPesanan.innerHTML = "";
            listIdLama = [];
            return;
        }

        const idSekarang = Object.keys(data);
        const adaPesananBaru = idSekarang.some(id => !listIdLama.includes(id));

        if (adaPesananBaru && listIdLama.length > 0) {
            const sound = document.getElementById('notif-sound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Interaksi diperlukan untuk suara"));
            }
        }

        listIdLama = idSekarang;
        containerPesanan.innerHTML = "";
        idSekarang.reverse().forEach(id => {
            if (typeof tampilkanPesanan === "function") tampilkanPesanan(id, data[id]);
        });
    });
}

// 3. EVENT LISTENER DASAR
document.addEventListener('DOMContentLoaded', () => {
    reveal();

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerIcon = document.getElementById('hamburger-icon');

    if (hamburgerBtn) {
        hamburgerBtn.onclick = (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('hidden');
            if (hamburgerIcon) {
                const isHidden = mobileMenu.classList.contains('hidden');
                hamburgerIcon.classList.toggle('fa-bars', isHidden);
                hamburgerIcon.classList.toggle('fa-times', !isHidden);
            }
        };
    }

    const cartTrigger = document.getElementById('cart-icon-trigger');
    if (cartTrigger) cartTrigger.onclick = () => toggleCart();

    const closeCart = document.getElementById('close-cart');
    if (closeCart) closeCart.onclick = () => toggleCart();

    // Pasang listener pembayaran
    const payMethod = document.getElementById('payment-method');
    if (payMethod) {
        payMethod.onchange = handlePaymentChange;
    }
});

// 4. FUNGSI KERANJANG (CUSTOMER)
function updateUI() {
    const list = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    let total = 0;

    if (list) {
        list.innerHTML = '';
        cart.forEach((item, i) => {
            total += item.harga;
            list.innerHTML += `
                <li class="flex justify-between text-xs border-b border-gray-50 pb-1 mb-1">
                    <span class="font-semibold">${item.nama}</span>
                    <div class="flex items-center gap-2">
                        <span>Rp ${item.harga.toLocaleString()}</span>
                        <button onclick="removeItem(${i})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </li>`;
        });
    }
    if (totalEl) totalEl.innerText = `Rp ${total.toLocaleString()}`;
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.innerText = cart.length;
}

function addToCart(nama, harga) {
    cart.push({ nama, harga });
    updateUI();
}

function buyNow(nama, harga) {
    cart = [{ nama, harga }];
    updateUI();
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    const nameInput = document.getElementById('buyer-name');
    if (nameInput) nameInput.focus();
}

function removeItem(i) {
    cart.splice(i, 1);
    updateUI();
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleOrderDetails() {
    const tipe = document.getElementById('order-type').value;
    const areaMeja = document.getElementById('area-meja');
    const areaAlamat = document.getElementById('area-alamat');
    if (areaMeja) areaMeja.classList.toggle('hidden', tipe !== "Makan di Tempat");
    if (areaAlamat) areaAlamat.classList.toggle('hidden', tipe === "Makan di Tempat");
}

function handlePaymentChange() {
    const metode = document.getElementById('payment-method').value;
    const areaQris = document.getElementById('qris-payment-area');
    const areaRekening = document.getElementById('rekening-area');
    const areaBukti = document.getElementById('bukti-pembayaran-area');

    if (areaQris) areaQris.classList.add('hidden');
    if (areaRekening) areaRekening.classList.add('hidden');
    if (areaBukti) areaBukti.classList.add('hidden');

    if (metode === "QRIS") {
        if (areaQris) areaQris.classList.remove('hidden');
        if (areaBukti) areaBukti.classList.remove('hidden');
    } else if (metode === "Transfer") {
        if (areaRekening) areaRekening.classList.remove('hidden');
        if (areaBukti) areaBukti.classList.remove('hidden');
    }
}

// 5. FUNGSI KIRIM (WA & FIREBASE)
function sendToWA() {
    const namaField = document.getElementById('buyer-name');
    const tipeField = document.getElementById('order-type');
    const noMejaField = document.getElementById('nomorMeja');
    const alamatField = document.getElementById('buyer-address');
    const metodeField = document.getElementById('payment-method');

    const nama = namaField ? namaField.value.trim() : "";
    const tipe = tipeField ? tipeField.value : "Makan di Tempat";
    const noMeja = noMejaField ? noMejaField.value : "-";
    const alamat = alamatField ? alamatField.value : "-";
    const metode = metodeField ? metodeField.value : "Tunai";

    if (!nama) return alert("Masukkan Nama Anda!");
    if (cart.length === 0) return alert("Keranjang masih kosong!");

    const inputBukti = document.getElementById('input-bukti');
    const adaBukti = inputBukti && inputBukti.files && inputBukti.files.length > 0;
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Kirim Firebase
    const dataPesanan = {
        nama: nama.toUpperCase(),
        tipe: tipe,
        meja: (tipe === "Makan di Tempat") ? noMeja : "-",
        alamat: (tipe === "Bawa Pulang") ? alamat : "-",
        metode: metode,
        items: cart,
        waktu: waktu + " WIB",
        status: "Baru"
    };

    database.ref('pesanan_masuk').push(dataPesanan);

    // Struk WA
    let pesan = `*HALO ADMIN RASA NUSANTARA*\n\n`;
    pesan += `👤 *Nama:* ${nama}\n`;
    pesan += `🍴 *Tipe:* ${tipe}\n`;
    pesan += (tipe === "Makan di Tempat") ? `🪑 *Nomor Meja:* ${noMeja}\n` : `📍 *Alamat:* ${alamat}\n`;
    pesan += `💳 *Pembayaran:* ${metode}\n`;

    if (metode === "QRIS" || metode === "Transfer") {
        pesan += `✅ *Bukti Bayar:* ${adaBukti ? "(Sudah dilampirkan)" : "(Akan segera dikirim)"}\n`;
    }

    pesan += `⏰ *Waktu Pesan:* ${waktu} WIB\n\n*PESANAN:* \n`;
    let total = 0;
    cart.forEach((item, i) => {
        pesan += `${i + 1}. ${item.nama} (Rp ${item.harga.toLocaleString()})\n`;
        total += item.harga;
    });
    pesan += `\n*TOTAL: Rp ${total.toLocaleString()}*`;
    pesan += `\n--------------------------------\n_Mohon lampirkan screenshot bukti transfer jika menggunakan QRIS/Transfer_`;

    window.open(`https://wa.me/6283812556281?text=${encodeURIComponent(pesan)}`, '_blank');

    cart = [];
    updateUI();
    toggleCart();
}

function checkout() { sendToWA(); }

function reveal() {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        if (elementTop < windowHeight - 150) el.classList.add("active");
    });
}
window.addEventListener("scroll", reveal);