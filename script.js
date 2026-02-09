// --- VERİ YAPISI VE AYARLAR ---
let data = {
    loans: [],
    expenses: [],
    incomes: {}
};

// Excelden aldığım hazır veriler (Senin için buraya gömdüm)
const PRELOADED_LOANS = [
    { id: 101, no: 1, date: '2026-05-06', total: 151347.22 },
    { id: 102, no: 2, date: '2026-08-06', total: 146388.89 },
    { id: 103, no: 3, date: '2026-11-06', total: 140958.33 },
    { id: 104, no: 4, date: '2027-02-06', total: 136118.06 },
    { id: 105, no: 5, date: '2027-05-06', total: 129447.92 },
    { id: 106, no: 6, date: '2027-08-06', total: 124409.72 }
];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderDashboard();
    renderLoanTags();
});

// --- VERİ YÖNETİMİ ---
function loadData() {
    const stored = localStorage.getItem('finansTekEkran');
    if (stored) {
        data = JSON.parse(stored);
    } else {
        // İlk açılışta veriler boşsa kredileri yükle
        data.loans = [...PRELOADED_LOANS];
        // Örnek bir kasa geliri de atalım
        data.incomes['2026-03'] = 117000;
        saveData();
    }
}

function saveData() {
    localStorage.setItem('finansTekEkran', JSON.stringify(data));
    renderDashboard();
    renderLoanTags();
}

function resetData() {
    if(confirm("Tüm veriler silinecek ve başlangıç ayarlarına dönülecek. Emin misin?")) {
        localStorage.removeItem('finansTekEkran');
        location.reload();
    }
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "finans_yedek.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// --- GÖRÜNÜM (RENDER) FONKSİYONLARI ---

function renderDashboard() {
    const tbody = document.getElementById('dashboard-body');
    const selectedYear = document.getElementById('year-filter').value;
    tbody.innerHTML = '';

    // Aylar listesi oluştur (Seçili yılın tüm ayları)
    let grandTotal = 0;

    for (let m = 1; m <= 12; m++) {
        const monthStr = m < 10 ? `0${m}` : `${m}`;
        const ym = `${selectedYear}-${monthStr}`;
        
        // Hesaplamalar
        const income = data.incomes[ym] || 0;
        const expenseDetails = data.expenses.filter(e => e.date.startsWith(ym));
        const totalExpense = expenseDetails.reduce((sum, e) => sum + e.amount, 0);
        
        // Kredi Hesaplama (Vade tarihi o ay veya önceki 2 ay ise)
        let creditCut = 0;
        data.loans.forEach(l => {
            if (isLoanActiveMonth(l.date, ym)) {
                creditCut += (l.total / 3);
            }
        });

        const net = income - creditCut - totalExpense;
        grandTotal += net;

        // Satır Oluşturma
        const monthName = new Date(`${ym}-01`).toLocaleString('tr-TR', { month: 'long' });
        
        // Eğer o ayda hiç hareket yoksa ve gelecekteyse gri gösterilebilir ama şimdilik hepsini gösterelim
        const rowColor = net < 0 ? 'color:#d63031; font-weight:bold;' : 'color:#00b894; font-weight:bold;';

        const tr = `
            <tr>
                <td>${monthName} ${selectedYear}</td>
                <td class="text-right">${formatMoney(income)}</td>
                <td class="text-right" style="color:#e17055">${formatMoney(creditCut)}</td>
                <td class="text-right" onclick="showExpenseDetail('${ym}')" style="cursor:pointer; text-decoration:underline;">
                    ${formatMoney(totalExpense)}
                </td>
                <td class="text-right" style="${rowColor}">${formatMoney(net)}</td>
                <td>
                    <button class="btn-text" onclick="editMonth('${ym}', ${income})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += tr;
    }
    
    document.getElementById('grand-total').innerText = formatMoney(grandTotal);
}

function renderLoanTags() {
    const container = document.getElementById('loan-tags');
    container.innerHTML = '';
    data.loans.sort((a,b) => new Date(a.date) - new Date(b.date));
    
    data.loans.forEach(l => {
        const tag = `
        <div class="loan-tag">
            <div>
                <div><small>Taksit ${l.no}</small></div>
                <span>${formatMoney(l.total)}</span>
                <div style="font-size:10px; color:#666">${formatDateTR(l.date)}</div>
            </div>
            <button onclick="deleteLoan(${l.id})"><i class="fas fa-trash"></i></button>
        </div>`;
        container.innerHTML += tag;
    });
}

// --- MODAL VE FORM İŞLEMLERİ ---

let currentModalType = '';
let editingMonth = '';

function openModal(type, extraData = null) {
    currentModalType = type;
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('active-form');
    
    overlay.classList.add('active');
    form.innerHTML = ''; // Temizle

    if (type === 'income') {
        title.innerText = "Gelir / Kasa Girişi";
        form.innerHTML = `
            <label>Dönem (Ay seçiniz)</label>
            <input type="month" id="inp-date" required value="${new Date().toISOString().slice(0,7)}">
            <label>Tutar</label>
            <input type="text" inputmode="decimal" id="inp-amount" placeholder="Örn: 15.000,50" oninput="formatInput(this)">
            <button type="button" class="btn btn-green" style="width:100%" onclick="submitForm()">Kaydet</button>
        `;
    } 
    else if (type === 'expense') {
        title.innerText = "Harcama Ekle";
        form.innerHTML = `
            <label>Tarih</label>
            <input type="date" id="inp-date" required value="${new Date().toISOString().slice(0,10)}">
            <label>Açıklama</label>
            <input type="text" id="inp-desc" placeholder="Örn: Market">
            <label>Tutar</label>
            <input type="text" inputmode="decimal" id="inp-amount" placeholder="Örn: 1.250,90" oninput="formatInput(this)">
            <button type="button" class="btn btn-red" style="width:100%" onclick="submitForm()">Kaydet</button>
        `;
    }
    else if (type === 'loan') {
        title.innerText = "Yeni Kredi Taksiti";
        form.innerHTML = `
            <label>Taksit No</label>
            <input type="number" id="inp-no" placeholder="Örn: 7">
            <label>Vade Tarihi</label>
            <input type="date" id="inp-date" required>
            <label>Toplam Tutar</label>
            <input type="text" inputmode="decimal" id="inp-amount" placeholder="Örn: 150.000,00" oninput="formatInput(this)">
            <button type="button" class="btn btn-blue" style="width:100%" onclick="submitForm()">Kaydet</button>
        `;
    }
}

function editMonth(ym, currentIncome) {
    // Hızlı gelir düzenleme
    const newIncomeStr = prompt(`${ym} dönemi için Kasa Geliri:`, currentIncome);
    if (newIncomeStr !== null) {
        // Virgül/Nokta temizliği yapıp kaydet
        const cleanVal = parseTrMoney(newIncomeStr);
        if (!isNaN(cleanVal)) {
            data.incomes[ym] = cleanVal;
            saveData();
        }
    }
}

function showExpenseDetail(ym) {
    const exps = data.expenses.filter(e => e.date.startsWith(ym));
    let msg = `${ym} Harcamaları:\n\n`;
    if(exps.length === 0) msg += "Harcama bulunamadı.";
    
    exps.forEach(e => {
        msg += `- ${e.desc}: ${formatMoney(e.amount)} (Tarih: ${e.date})\n`;
    });
    
    if(exps.length > 0) msg += `\nSilmek için 'Harcamalar' menüsünü kullanın (Sonraki güncellemede eklenecek)`;
    alert(msg);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function submitForm() {
    const amountStr = document.getElementById('inp-amount').value;
    const amount = parseTrMoney(amountStr);
    
    if (isNaN(amount) || amount === 0) {
        alert("Lütfen geçerli bir tutar giriniz");
        return;
    }

    if (currentModalType === 'income') {
        const date = document.getElementById('inp-date').value; // YYYY-MM
        if(!date) return alert("Tarih seçiniz");
        data.incomes[date] = amount;
    }
    else if (currentModalType === 'expense') {
        const date = document.getElementById('inp-date').value;
        const desc = document.getElementById('inp-desc').value;
        if(!date) return alert("Tarih seçiniz");
        data.expenses.push({ id: Date.now(), date, desc, amount });
    }
    else if (currentModalType === 'loan') {
        const date = document.getElementById('inp-date').value;
        const no = document.getElementById('inp-no').value;
        if(!date) return alert("Tarih seçiniz");
        data.loans.push({ id: Date.now(), no, date, total: amount });
    }

    saveData();
    closeModal();
}

function deleteLoan(id) {
    if(confirm("Bu kredi taksitini silmek istediğine emin misin?")) {
        data.loans = data.loans.filter(l => l.id !== id);
        saveData();
    }
}

// --- YARDIMCI (UTILITY) FONKSİYONLAR ---

// 3 Ayda bir ödeme mantığı kontrolü
function isLoanActiveMonth(loanDateStr, currentMonthStr) {
    // loanDate: 2026-05-06 -> Vade Ayı: 2026-05
    // Bu kredi için 2026-03, 2026-04 ve 2026-05 aylarında para ayrılır.
    
    const dLimit = new Date(loanDateStr);
    dLimit.setDate(1); // Ayın ilk günü yapalım karşılaştırma kolay olsun
    
    // Kontrol edilen ay
    const dCheck = new Date(currentMonthStr + "-01");
    
    // Ay farkını hesapla (Yaklaşık)
    const diffTime = dLimit.getTime() - dCheck.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24); 
    
    // Eğer vade ayı ile şimdiki ay arasında 0 ile 95 gün fark varsa (yaklaşık 3 ay)
    // Daha kesin mantık:
    // Vade ayı: 5. Check: 5 -> Eşit (1. taksit)
    // Vade ayı: 5. Check: 4 -> 1 ay önce (2. taksit)
    // Vade ayı: 5. Check: 3 -> 2 ay önce (3. taksit)
    // Vade ayı: 5. Check: 2 -> HAYIR.
    
    // Basitçe ayları integer'a çevirip fark alalım (Yıl farkını da katarak)
    const monthIndexLoan = dLimit.getFullYear() * 12 + dLimit.getMonth();
    const monthIndexCheck = dCheck.getFullYear() * 12 + dCheck.getMonth();
    
    const diff = monthIndexLoan - monthIndexCheck;
    
    return diff >= 0 && diff < 3;
}

// Para Formatlama (Türk Lirası ve Virgül)
function formatMoney(amount) {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

// Tarih Formatlama
function formatDateTR(dateStr) {
    const parts = dateStr.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// Kullanıcı 15.000,50 yazdığında bunu JS float'a (15000.50) çevirir
function parseTrMoney(str) {
    if (!str) return 0;
    // Eğer sadece sayı ise direkt döndür
    if (typeof str === 'number') return str;
    
    // Noktaları (binlik ayracı) sil, Virgülü noktaya çevir
    // Örn: "15.000,50" -> "15000,50" -> "15000.50"
    let clean = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean);
}

// Input alanına yazarken virgül kontrolü (Opsiyonel UX)
function formatInput(input) {
    // Sadece rakam, nokta ve virgül'e izin ver
    // Bu basit bir UX iyileştirmesidir, esas çeviri parseTrMoney'de yapılır.
}
