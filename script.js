let data = { loans: [], expenses: [], incomes: [] };
let myChart = null;

const PRELOADED_LOANS = [
    { id: 101, no: 1, date: '2026-05-06', total: 151347.22 },
    { id: 102, no: 2, date: '2026-08-06', total: 146388.89 },
    { id: 103, no: 3, date: '2026-11-06', total: 140958.33 },
    { id: 104, no: 4, date: '2027-02-06', total: 136118.06 },
    { id: 105, no: 5, date: '2027-05-06', total: 129447.92 },
    { id: 106, no: 6, date: '2027-08-06', total: 124409.72 },
    { id: 107, no: 7, date: '2027-11-06', total: 120000.00 },
    { id: 108, no: 8, date: '2028-02-06', total: 115000.00 }
];

document.addEventListener('DOMContentLoaded', () => { 
    loadTheme();
    loadData(); 
    renderAll(); 
});

// --- THEME ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    renderDashboard();
}
function loadTheme() {
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
}

// --- DATA ---
function loadData() {
    const stored = localStorage.getItem('finansProFinal');
    if (stored) {
        data = JSON.parse(stored);
        if (!Array.isArray(data.incomes)) data.incomes = [];
    } else {
        // İLK AÇILIŞ - VERİ OLUŞTURMA
        data.loans = [...PRELOADED_LOANS];
        
        // KULLANICI İSTEĞİ: 2026 Şubat'tan Aralık'a kadar 67.000 TL Maaş
        for(let m = 2; m <= 12; m++) {
            let monthStr = m < 10 ? '0' + m : m;
            data.incomes.push({
                id: Date.now() + m,
                date: `2026-${monthStr}-15`, // Her ayın 15'i varsayılan
                desc: 'Maaş',
                category: 'Maaş',
                amount: 67000
            });
        }
        
        // 2027 için de örnek koyalım mı? Şimdilik sadece 2026 istendi.
        saveData();
    }
}

function saveData() { localStorage.setItem('finansProFinal', JSON.stringify(data)); renderAll(); }
function resetData() { if(confirm("TÜM VERİLER SİLİNECEK! Onaylıyor musun?")) { localStorage.removeItem('finansProFinal'); location.reload(); } }

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
                if(confirm("Mevcut veriler silinip yedek yüklenecek?")) {
                    localStorage.setItem('finansProFinal', JSON.stringify(json));
                    location.reload();
                }
            } else { alert("Hatalı dosya!"); }
        } catch(err) { alert("Dosya okunamadı!"); }
    };
    reader.readAsText(file);
}

// --- VIEW ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    const navs = document.querySelectorAll('.nav-btn');
    if(viewId==='dashboard') navs[0].classList.add('active');
    if(viewId==='transactions') { navs[1].classList.add('active'); filterTransactions('all'); }
    if(viewId==='loans') navs[2].classList.add('active');
}
function renderAll() { renderDashboard(); renderLoans(); updateCurrentStatusCard(); }

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
            scales: { 
                y: { beginAtZero: true, ticks: { color:textColor, callback: v => v/1000 + 'k' }, grid:{color:isDark?'#444':'#eee'} },
                x: { ticks: { color:textColor }, grid:{display:false} }
            }
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
    document.getElementById('status-subtitle').innerText = "Bu ayki net denge";
}

// --- TRANSACTIONS ---
function filterTransactions(type) {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    let items = [];
    if(type!=='expense') data.incomes.forEach(i => items.push({...i, type:'income'}));
    if(type!=='income') data.expenses.forEach(e => items.push({...e, type:'expense'}));
    items.sort((a,b)=>new Date(b.date)-new Date(a.date));
    
    if(items.length===0) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-sec)">Kayıt Yok</div>';
    items.forEach(item => {
        const isInc = item.type==='income';
        const catBadge = item.category ? `<span class="cat-badge">${item.category}</span>` : '';
        list.innerHTML += `
        <div class="trans-item" style="border-left:4px solid ${isInc?'var(--green)':'var(--red)'}">
            <div class="trans-left"><h4>${catBadge}${item.desc}</h4><p>${formatDateTR(item.date)}</p></div>
            <div class="trans-right">
                <span class="trans-amt" style="color:${isInc?'var(--green)':'var(--red)'}">${isInc?'+':'-'}${formatMoney(item.amount)}</span>
                <div class="trans-actions"><button onclick="deleteItem('${item.type}', ${item.id})"><i class="fas fa-trash"></i></button></div>
            </div>
        </div>`;
    });
}
function deleteItem(type, id) {
    if(!confirm("Silinsin mi?")) return;
    if(type==='income') data.incomes = data.incomes.filter(i=>i.id!==id);
    else data.expenses = data.expenses.filter(e=>e.id!==id);
    saveData(); filterTransactions(type==='income'?'income':(type==='expense'?'expense':'all'));
}

// --- LOANS ---
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

// --- MODAL & PDF ---
let modalType = '';
function openModal(type) {
    modalType = type;
    document.getElementById('modal-overlay').classList.add('active');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('active-form');
    
    if (type === 'pdf') {
        title.innerText = "PDF Raporu";
        form.innerHTML = `
            <label>Dönem Seçiniz</label><input type="month" id="pdf-month-select" value="${new Date().toISOString().slice(0,7)}">
            <button type="button" class="btn btn-blue" style="width:100%; margin-top:15px;" onclick="generatePDF()"><i class="fas fa-file-pdf"></i> İndir</button>`;
    } else {
        const lbl = type==='income'?'Gelir':(type==='expense'?'Harcama':'Kredi');
        title.innerText = `${lbl} Ekle`;
        const today = new Date().toISOString().split('T')[0];
        let extra = type === 'expense' ? `<label>Kategori</label><select id="inp-cat"><option value="Market">Market</option><option value="Fatura">Fatura</option><option value="Ulaşım">Ulaşım</option><option value="Diğer">Diğer</option></select>` : (type === 'loan' ? `<label>Taksit No</label><input type="number" id="inp-no">` : '');
        
        form.innerHTML = `
            ${type!=='loan' ? `<label>Tarih</label><input type="date" id="inp-date" value="${today}">` : ''}
            ${type==='loan' ? `<label>Vade Tarihi</label><input type="date" id="inp-date" value="${today}">` : ''}
            ${extra}
            ${type!=='loan' ? `<label>Açıklama</label><input type="text" id="inp-desc" value="${type==='income'?'Maaş':''}">` : ''}
            <label>Tutar</label><input type="text" id="inp-amount" inputmode="decimal">
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
        list.push({id:Date.now(), date, desc, category: cat, amount});
        filterTransactions(modalType);
    }
    saveData(); closeModal();
}

function generatePDF() {
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
    document.getElementById('pdf-total-inc').innerText = formatMoney(totInc);
    document.getElementById('pdf-total-loan').innerText = formatMoney(lTotal);
    document.getElementById('pdf-total-exp').innerText = formatMoney(totExp);
    document.getElementById('pdf-net').innerText = formatMoney(totInc - lTotal - totExp);

    const fill = (id, arr, c1, c2, c3, c4=null) => {
        const tb = document.querySelector(`#${id} tbody`); tb.innerHTML='';
        if(arr.length===0) tb.innerHTML='<tr><td colspan="4" style="text-align:center;color:#999">Kayıt Yok</td></tr>';
        arr.forEach(x => tb.innerHTML += `<tr><td>${c1(x)}</td><td>${c2(x)}</td>${c4?`<td>${c4(x)}</td>`:''} <td class="tr">${c3(x)}</td></tr>`);
    };
    fill('pdf-table-inc', incs, i=>formatDateTR(i.date), i=>i.desc, i=>formatMoney(i.amount));
    fill('pdf-table-loan', loans, l=>`Taksit #${l.no}`, l=>formatDateTR(l.date), l=>formatMoney(l.val));
    fill('pdf-table-exp', exps, e=>formatDateTR(e.date), e=>e.category||'-', e=>formatMoney(e.amount), e=>e.desc);

    const el = document.getElementById('pdf-template');
    el.style.display = 'block';
    html2pdf().set({ margin:0, filename:`Rapor_${ym}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4'} }).from(el).save().then(()=>{ el.style.display='none'; closeModal(); });
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
function parseTrMoney(s) { return typeof s==='number'?s:parseFloat((s||'0').replace(/\./g,'').replace(',','.')); }
function formatMoney(n) { return n.toLocaleString('tr-TR',{minimumFractionDigits:2}) + ' ₺'; }
function formatDateTR(d) { return d.split('-').reverse().join('.'); }
function getMonthName(m) { return new Date(2023, m-1).toLocaleDateString('tr-TR', {month:'long'}); }
function isLoanActiveMonth(l, c) { const d1=new Date(l), d2=new Date(c+'-01'); d1.setDate(1); const df=(d1.getFullYear()*12+d1.getMonth())-(d2.getFullYear()*12+d2.getMonth()); return df>=0 && df<3; }
