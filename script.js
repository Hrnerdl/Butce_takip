// --- AYARLAR ---
// Lütfen buraya kendi JSONBin kodlarını tekrar yapıştır
const API_KEY = '$2a$10$4vZ/QQaLv1Feei70sXV03O7N.OypbKyIDmz.6khENL85GRk1ObT3u'; 
const BIN_ID = '6989e40ad0ea881f40ad271b';   
const APP_PIN = "160825"; // Sabit Şifre

// --- VERİ YAPISI ---
let data = { loans: [], expenses: [], incomes: [], recurring: [] };
let myChart = null;
let currentTransFilter = 'all'; 
let privacyMode = true; // Başlangıçta gizli

// Hazır Krediler (Excel verilerine göre güncellendi)
const PRELOADED_LOANS = [
    { id: 101, no: 1, date: '2026-05-06', total: 151347.22 },
    { id: 102, no: 2, date: '2026-08-06', total: 146388.89 },
    { id: 103, no: 3, date: '2026-11-06', total: 140958.33 },
    { id: 104, no: 4, date: '2027-02-06', total: 136118.06 },
    { id: 105, no: 5, date: '2027-05-06', total: 129447.92 }, // Excelden güncellendi
    { id: 106, no: 6, date: '2027-08-06', total: 125197.92 }, // Excelden güncellendi
    { id: 107, no: 7, date: '2027-11-08', total: 120003.47 }, // Excelden güncellendi
    { id: 108, no: 8, date: '2028-02-07', total: 114277.78 }  // Excelden güncellendi
];

document.addEventListener('DOMContentLoaded', () => { 
    loadTheme();
    // Varsayılan tarih filtresini bugünün ayı yap
    const today = new Date().toISOString().slice(0, 7);
    document.getElementById('trans-month-filter').value = today;
    
    syncFromCloud().then(() => {
        renderAll();
    });
});

// --- GİZLİLİK (PRIVACY) ---
function togglePrivacy() {
    if (privacyMode) {
        // Eğer gizliyse, şifre sor
        document.getElementById('pin-overlay').classList.add('active');
        document.getElementById('app-pin').value = '';
        document.getElementById('app-pin').focus();
    } else {
        // Açıksa, direkt gizle
        privacyMode = true;
        updatePrivacyIcon();
        renderAll();
    }
}

function verifyPin() {
    const entered = document.getElementById('app-pin').value;
    if (entered === APP_PIN) {
        privacyMode = false;
        closePinModal();
        updatePrivacyIcon();
        renderAll();
    } else {
        alert("Hatalı Şifre!");
        document.getElementById('app-pin').value = '';
    }
}

function closePinModal() {
    document.getElementById('pin-overlay').classList.remove('active');
}

function updatePrivacyIcon() {
    const icon = document.getElementById('privacy-icon');
    if (privacyMode) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Para Formatlama (Gizlilik Kontrollü)
function formatMoney(n) {
    if (privacyMode) return '**** ₺';
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

// --- BULUT ---
async function syncFromCloud() {
    updateStatusText("Bağlanıyor...", "orange");
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        
        if (response.ok) {
            const json = await response.json();
            if(json.record && (json.record.loans || json.record.incomes)) {
                data = json.record;
                localStorage.setItem('finansProFinal', JSON.stringify(data));
                updateStatusText("Bulut Aktif ✅", "green");
            } else {
                initializeData();
                saveData(); 
            }
        } else {
            throw new Error("Bağlantı Hatası");
        }
    } catch (error) {
        console.error("Bulut Hatası:", error);
        updateStatusText("Yerel Mod ⚠️", "red");
        const stored = localStorage.getItem('finansProFinal');
        if (stored) data = JSON.parse(stored);
        else initializeData();
    }
}

async function saveData() {
    localStorage.setItem('finansProFinal', JSON.stringify(data));
    renderAll();

    updateStatusText("Kaydediliyor...", "orange");
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(data)
        });

        if(response.ok) updateStatusText("Güvende ✅", "green");
        else updateStatusText("Bulut Hatası ⚠️", "red");
    } catch (e) {
        updateStatusText("İnternet Yok ⚠️", "red");
    }
}

function updateStatusText(msg, color) {
    const el = document.getElementById('status-subtitle');
    if(el) {
        el.innerText = msg;
        el.style.color = color === 'green' ? '#2ecc71' : (color === 'red' ? '#e74c3c' : '#f1c40f');
        el.style.fontWeight = 'bold';
    }
}

function initializeData() {
    data.loans = [...PRELOADED_LOANS];
    for(let m = 2; m <= 12; m++) {
        let monthStr = m < 10 ? '0' + m : m;
        data.incomes.push({ 
            id: Date.now() + m, 
            date: `2026-${monthStr}-15`, 
            desc: 'Maaş', 
            category: 'Maaş', 
            amount: 67000 
        });
    }
}

// --- TEMA ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    renderDashboard();
}
function loadTheme() { if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode'); }

// --- RESET/EXPORT/IMPORT ---
function resetData() { 
    if(confirm("TÜM VERİLER SİLİNECEK! Emin misin?")) { 
        localStorage.removeItem('finansProFinal'); 
        data = { loans: [], expenses: [], incomes: [], recurring: [] };
        initializeData();
        saveData();
        location.reload(); 
    } 
}

function exportData() {
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    a.download = `finans_yedek_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
}

function importData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if(json.loans && json.expenses) {
                if(confirm("Yedek yüklenecek, onaylıyor musun?")) {
                    data = json;
                    saveData();
                    location.reload();
                }
            } else { alert("Hatalı dosya!"); }
        } catch(err) { alert("Dosya okunamadı!"); }
    };
    reader.readAsText(file);
}

// --- GÖRÜNÜM ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    const navs = document.querySelectorAll('.nav-btn');
    if(viewId==='dashboard') navs[0].classList.add('active');
    if(viewId==='transactions') { 
        navs[1].classList.add('active'); 
        renderTransactions(); 
    }
    if(viewId==='loans') navs[2].classList.add('active');
}
function renderAll() { renderDashboard(); renderLoans(); updateCurrentStatusCard(); renderTransactions(); }

// --- DASHBOARD ---
function renderDashboard() {
    const tbody = document.getElementById('dashboard-body');
    const year = document.getElementById('year-filter').value;
    tbody.innerHTML = '';
    let labels=[], incData=[], expData=[];
    const isDark = document.body.classList.contains('dark-mode');
    
    for (let m = 1; m <= 12; m++) {
        const ym = `${year}-${m.toString().padStart(2,'0')}`;
        const inc = data.incomes.filter(i => i.date.startsWith(ym)).reduce((s,i)=>s+i.amount,0);
        const exp = data.expenses.filter(e => e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);
        let credit = 0;
        data.loans.forEach(l => { if (isLoanActiveMonth(l.date, ym)) credit += (l.total/3); });
        
        const net = inc - credit - exp;
        const isNow = (new Date().getMonth()+1 === m && new Date().getFullYear() == year);
        const hlColor = isDark ? '#333' : '#e3f2fd';

        tbody.innerHTML += `
            <tr style="${isNow?`background:${hlColor};font-weight:bold;`:''}">
                <td>${getMonthName(m)}</td>
                <td class="text-right" style="color:var(--green)">${formatMoney(inc)}</td>
                <td class="text-right" style="color:var(--blue)">${formatMoney(credit)}</td>
                <td class="text-right" style="color:var(--red)">${formatMoney(exp)}</td>
                <td class="text-right" style="color:${net<0?'var(--red)':'var(--green)'}">${formatMoney(net)}</td>
            </tr>`;
        labels.push(getMonthName(m).substring(0,3));
        incData.push(inc);
        expData.push(exp + credit);
    }
    updateChart(labels, incData, expData, year, isDark);
}

function updateChart(labels, inc, exp, year, isDark) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if(myChart) myChart.destroy();
    const textColor = isDark ? '#e0e0e0' : '#666';
    
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Gelir', data: inc, backgroundColor: '#00b894', borderRadius:4 },
                { label: 'Gider', data: exp, backgroundColor: '#d63031', borderRadius:4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: {labels:{color:textColor}, position:'bottom'}, title: {display:true, text:`${year} Özeti`, color:textColor} },
            scales: { y: { beginAtZero: true, ticks: { color:textColor, callback: v => v/1000 + 'k' }, grid:{color:isDark?'#444':'#eee'} }, x: { ticks: { color:textColor }, grid:{display:false} } }
        }
    });
}

function updateCurrentStatusCard() {
    const date = new Date();
    const ym = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}`;
    const income = data.incomes.filter(i => i.date.startsWith(ym)).reduce((s,i)=>s+i.amount,0);
    const expense = data.expenses.filter(e => e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);
    let credit = 0;
    data.loans.forEach(l => { if (isLoanActiveMonth(l.date, ym)) credit += (l.total/3); });
    document.getElementById('current-status-title').innerText = `${date.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})} DURUM`.toUpperCase();
    document.getElementById('grand-total').innerText = formatMoney(income - credit - expense);
}

// --- HAREKETLER (Transactions) ---
function setTransFilter(type) {
    currentTransFilter = type;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderTransactions();
}

function renderTransactions() {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    const dateFilter = document.getElementById('trans-month-filter').value; // YYYY-MM
    
    let items = [];
    if(currentTransFilter !== 'expense') data.incomes.forEach(i => items.push({...i, type:'income'}));
    if(currentTransFilter !== 'income') data.expenses.forEach(e => items.push({...e, type:'expense'}));
    
    // Tarih Filtresi
    if (dateFilter) {
        items = items.filter(item => item.date.startsWith(dateFilter));
    }
    
    items.sort((a,b)=>new Date(b.date)-new Date(a.date));
    
    if(items.length===0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-sec)">Kayıt Yok</div>';
        return;
    }
    
    items.forEach(item => {
        const isInc = item.type==='income';
        const catBadge = item.category ? `<span class="cat-badge">${item.category}</span>` : '';
        // Para miktarı formatMoney ile gizlenir
        const amountDisplay = formatMoney(item.amount); 
        
        list.innerHTML += `
        <div class="trans-item" style="border-left:4px solid ${isInc?'var(--green)':'var(--red)'}">
            <div class="trans-left"><h4>${catBadge}${item.desc}</h4><p>${formatDateTR(item.date)}</p></div>
            <div class="trans-right">
                <span class="trans-amt" style="color:${isInc?'var(--green)':'var(--red)'}">
                    ${isInc?'+':'-'}${amountDisplay}
                </span>
                <div class="trans-actions">
                    <button class="edit" onclick="openEditTransaction('${item.type}', ${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="del" onclick="deleteItem('${item.type}', ${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    });
}

function deleteItem(type, id) {
    if(!confirm("Silinsin mi?")) return;
    if(type==='income') data.incomes = data.incomes.filter(i=>i.id!==id);
    else data.expenses = data.expenses.filter(e=>e.id!==id);
    saveData(); 
    renderTransactions(); // Filtreyi bozmadan yenile
}

// --- KREDİLER ---
function renderLoans() {
    const c = document.getElementById('loan-list-full'); c.innerHTML='';
    data.loans.sort((a,b)=>new Date(a.date)-new Date(b.date));
    data.loans.forEach(l => {
        c.innerHTML += `<div class="loan-card"><div class="loan-header"><span>Taksit #${l.no}</span><span>${formatDateTR(l.date)}</span></div>
        <div class="loan-body"><h3>${formatMoney(l.total)}</h3><small style="color:var(--blue)">Ayda: ${formatMoney(l.total/3)}</small></div>
        <div class="loan-footer"><button class="btn-text" onclick="editLoan(${l.id})"><i class="fas fa-edit"></i> Düzenle</button></div></div>`;
    });
}
function editLoan(id) {
    const l = data.loans.find(x=>x.id===id);
    const val = prompt(`Taksit #${l.no} yeni tutar:`, l.total);
    if(val) { l.total = parseTrMoney(val); saveData(); }
}

// --- MODAL & DÜZENLEME ---
let modalType = '';
let editMode = false;
let editId = null;

function openModal(type) {
    modalType = type;
    editMode = false;
    editId = null;
    document.getElementById('modal-overlay').classList.add('active');
    renderModalContent(type, "Ekle");
}

function openEditTransaction(type, id) {
    modalType = type;
    editMode = true;
    editId = id;
    document.getElementById('modal-overlay').classList.add('active');
    
    let item;
    if(type === 'income') item = data.incomes.find(i => i.id === id);
    else item = data.expenses.find(e => e.id === id);
    
    renderModalContent(type, "Düzenle", item);
}

function renderModalContent(type, actionText, item = null) {
    const title = document.getElementById('modal-title');
    const form = document.getElementById('active-form');
    const today = new Date().toISOString().split('T')[0];
    
    if (type === 'pdf') {
        title.innerText = "PDF Raporu";
        form.innerHTML = `
            <label>Dönem Seçiniz</label><input type="month" id="pdf-month-select" value="${new Date().toISOString().slice(0,7)}">
            <button type="button" class="btn btn-blue" style="width:100%; margin-top:15px;" onclick="generatePDF()"><i class="fas fa-file-pdf"></i> İndir</button>`;
    } else {
        const lbl = type==='income'?'Gelir':(type==='expense'?'Harcama':'Kredi');
        title.innerText = `${lbl} ${actionText}`;
        
        let valDate = item ? item.date : today;
        let valDesc = item ? item.desc : (type==='income'?'Maaş':'');
        let valAmt = item ? item.amount.toLocaleString('tr-TR',{minimumFractionDigits:2}) : '';
        let valCat = item ? item.category : '';
        let valLoanNo = type==='loan' && item ? item.no : '';

        let extra = type === 'expense' ? `
            <label>Kategori</label>
            <select id="inp-cat">
                <option value="Market" ${valCat==='Market'?'selected':''}>Market</option>
                <option value="Fatura" ${valCat==='Fatura'?'selected':''}>Fatura</option>
                <option value="Ulaşım" ${valCat==='Ulaşım'?'selected':''}>Ulaşım</option>
                <option value="Diğer" ${valCat==='Diğer'?'selected':''}>Diğer</option>
            </select>` : (type === 'loan' ? `<label>Taksit No</label><input type="number" id="inp-no" value="${valLoanNo}">` : '');
        
        form.innerHTML = `
            ${type!=='loan' ? `<label>Tarih</label><input type="date" id="inp-date" value="${valDate}">` : ''}
            ${type==='loan' ? `<label>Vade Tarihi</label><input type="date" id="inp-date" value="${valDate}">` : ''}
            ${extra}
            ${type!=='loan' ? `<label>Açıklama</label><input type="text" id="inp-desc" value="${valDesc}">` : ''}
            <label>Tutar</label><input type="text" id="inp-amount" inputmode="decimal" value="${valAmt}">
            <button type="button" class="btn ${type==='income'?'btn-green':(type==='expense'?'btn-red':'btn-blue')}" style="width:100%; margin-top:10px;" onclick="submitForm()">Kaydet</button>`;
    }
}

function submitForm() {
    if (modalType === 'pdf') return;
    const date = document.getElementById('inp-date').value;
    const amount = parseTrMoney(document.getElementById('inp-amount').value);
    const desc = document.getElementById('inp-desc') ? document.getElementById('inp-desc').value : '';
    const cat = document.getElementById('inp-cat') ? document.getElementById('inp-cat').value : '';
    
    if(!date || isNaN(amount)) return alert("Eksik bilgi!");
    
    if(modalType === 'loan') {
        data.loans.push({id:Date.now(), no:document.getElementById('inp-no').value, date, total:amount});
        switchView('loans');
    } else {
        const list = modalType==='income' ? data.incomes : data.expenses;
        
        if (editMode && editId) {
            // Düzenleme
            const existingItem = list.find(i => i.id === editId);
            if (existingItem) {
                existingItem.date = date;
                existingItem.desc = desc;
                existingItem.amount = amount;
                if(modalType==='expense') existingItem.category = cat;
            }
        } else {
            // Yeni Ekleme
            list.push({id:Date.now(), date, desc, category: cat, amount});
        }
        renderTransactions(); // Filtreyi bozmadan yenile
    }
    saveData(); closeModal();
}

function generatePDF() {
    // Gizlilik modundaysa PDF'te de gizli çıkar, o yüzden önce şifre sorulabilir ama şimdilik doğrudan basıyoruz
    const ym = document.getElementById('pdf-month-select').value;
    if(!ym) return alert("Ay seçiniz");
    const [y, m] = ym.split('-');
    const incs = data.incomes.filter(i => i.date.startsWith(ym));
    const exps = data.expenses.filter(e => e.date.startsWith(ym));
    let loans = [], lTotal = 0;
    data.loans.forEach(l => { if(isLoanActiveMonth(l.date, ym)) { loans.push({no:l.no, date:l.date, val:l.total/3}); lTotal+=l.total/3; } });
    const totInc = incs.reduce((s,i)=>s+i.amount,0);
    const totExp = exps.reduce((s,e)=>s+e.amount,0);

    document.getElementById('pdf-month-title').innerText = `Dönem: ${getMonthName(m)} ${y}`;
    document.getElementById('pdf-date').innerText = new Date().toLocaleDateString('tr-TR');
    // PDF'te paralar GÖRÜNSÜN istiyorsak privacyMode'u geçici kapatıp geri açabiliriz veya formatMoney kullanmayız.
    // Şimdilik PDF özel rapor olduğu için rakamları AÇIK gösterelim:
    const fmt = n => n.toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' ₺';

    document.getElementById('pdf-total-inc').innerText = fmt(totInc);
    document.getElementById('pdf-total-loan').innerText = fmt(lTotal);
    document.getElementById('pdf-total-exp').innerText = fmt(totExp);
    document.getElementById('pdf-net').innerText = fmt(totInc - lTotal - totExp);

    const fill = (id, arr, c1, c2, c3, c4=null) => {
        const tb = document.querySelector(`#${id} tbody`); tb.innerHTML='';
        if(arr.length===0) tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:#999">Kayıt Yok</td></tr>';
        arr.forEach(x => tb.innerHTML += `<tr><td>${c1(x)}</td><td>${c2(x)}</td>${c4?`<td>${c4(x)}</td>`:''} <td class="tr">${c3(x)}</td></tr>`);
    };
    fill('pdf-table-inc', incs, i=>formatDateTR(i.date), i=>i.desc, i=>fmt(i.amount));
    fill('pdf-table-loan', loans, l=>`Taksit #${l.no}`, l=>formatDateTR(l.date), l=>fmt(l.val));
    fill('pdf-table-exp', exps, e=>formatDateTR(e.date), e=>e.category||'-', e=>fmt(e.amount), e=>e.desc);

    const el = document.getElementById('pdf-template');
    el.style.display = 'block';
    html2pdf().set({ margin:0, filename:`Rapor_${ym}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4'} }).from(el).save().then(()=>{ el.style.display='none'; closeModal(); });
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
function parseTrMoney(s) { return typeof s==='number'?s:parseFloat((s||'0').replace(/\./g,'').replace(',','.')); }
function formatDateTR(d) { return d.split('-').reverse().join('.'); }
function getMonthName(m) { return new Date(2023, m-1).toLocaleDateString('tr-TR', {month:'long'}); }
function isLoanActiveMonth(l, c) { const d1=new Date(l), d2=new Date(c+'-01'); d1.setDate(1); const df=(d1.getFullYear()*12+d1.getMonth())-(d2.getFullYear()*12+d2.getMonth()); return df>=0 && df<3; }
