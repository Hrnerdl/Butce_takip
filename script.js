// --- VERİ YAPISI ---
let data = { loans: [], expenses: [], incomes: [] };

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

document.addEventListener('DOMContentLoaded', () => { loadData(); renderAll(); });

function loadData() {
    const stored = localStorage.getItem('finansProV3');
    if (stored) {
        data = JSON.parse(stored);
        if (!Array.isArray(data.incomes)) data.incomes = [];
    } else {
        data.loans = [...PRELOADED_LOANS];
        data.incomes.push({ id: 1, date: '2026-03-15', desc: 'Maaş', amount: 117000 });
        saveData();
    }
}
function saveData() { localStorage.setItem('finansProV3', JSON.stringify(data)); renderAll(); }
function resetData() { if(confirm("Tüm veriler silinsin mi?")) { localStorage.removeItem('finansProV3'); location.reload(); } }
function exportData() {
    const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const a = document.createElement('a'); a.href = str; a.download = "finans_yedek.json";
    document.body.appendChild(a); a.click(); a.remove();
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    if(viewId==='dashboard') document.querySelectorAll('.nav-btn')[0].classList.add('active');
    if(viewId==='transactions') { document.querySelectorAll('.nav-btn')[1].classList.add('active'); filterTransactions('all'); }
    if(viewId==='loans') document.querySelectorAll('.nav-btn')[2].classList.add('active');
}

function renderAll() { renderDashboard(); renderLoans(); updateCurrentStatusCard(); }

function updateCurrentStatusCard() {
    const date = new Date();
    const ym = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}`;
    const income = data.incomes.filter(i => i.date.startsWith(ym)).reduce((s,i)=>s+i.amount,0);
    const expense = data.expenses.filter(e => e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);
    let credit = 0;
    data.loans.forEach(l => { if (isLoanActiveMonth(l.date, ym)) credit += (l.total/3); });
    
    document.getElementById('current-status-title').innerText = `${date.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})} DURUM`;
    document.getElementById('grand-total').innerText = formatMoney(income - credit - expense);
    document.getElementById('status-subtitle').innerText = "Bu ayki net denge";
}

function renderDashboard() {
    const tbody = document.getElementById('dashboard-body');
    const year = document.getElementById('year-filter').value;
    tbody.innerHTML = '';
    
    for (let m = 1; m <= 12; m++) {
        const ym = `${year}-${m.toString().padStart(2,'0')}`;
        const inc = data.incomes.filter(i => i.date.startsWith(ym)).reduce((s,i)=>s+i.amount,0);
        const exp = data.expenses.filter(e => e.date.startsWith(ym)).reduce((s,e)=>s+e.amount,0);
        let credit = 0;
        data.loans.forEach(l => { if (isLoanActiveMonth(l.date, ym)) credit += (l.total/3); });
        
        const net = inc - credit - exp;
        const isNow = (new Date().getMonth()+1 === m && new Date().getFullYear() == year);
        
        tbody.innerHTML += `
            <tr style="${isNow?'background:#e3f2fd;font-weight:bold;':''}">
                <td>${getMonthName(m)}</td>
                <td class="text-right" style="color:var(--green)">${formatMoney(inc)}</td>
                <td class="text-right" style="color:var(--blue)">${formatMoney(credit)}</td>
                <td class="text-right" style="color:var(--red)">${formatMoney(exp)}</td>
                <td class="text-right" style="color:${net<0?'red':'green'}">${formatMoney(net)}</td>
            </tr>`;
    }
}

function filterTransactions(type) {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    let items = [];
    if(type!=='expense') data.incomes.forEach(i => items.push({...i, type:'income'}));
    if(type!=='income') data.expenses.forEach(e => items.push({...e, type:'expense'}));
    items.sort((a,b)=>new Date(b.date)-new Date(a.date));
    
    if(items.length===0) list.innerHTML = '<div style="text-align:center;padding:20px;color:#999">Kayıt Yok</div>';
    items.forEach(item => {
        const isInc = item.type==='income';
        list.innerHTML += `
        <div class="trans-item ${isInc?'income-tag':'expense-tag'}">
            <div class="trans-left"><h4>${item.desc}</h4><p>${formatDateTR(item.date)}</p></div>
            <div class="trans-right">
                <span class="trans-amt" style="color:${isInc?'var(--green)':'var(--red)'}">${isInc?'+':'-'}${formatMoney(item.amount)}</span>
                <div class="trans-actions">
                    <button onclick="openEditModal('${item.type}', ${item.id})"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteItem('${item.type}', ${item.id})"><i class="fas fa-trash"></i></button>
                </div>
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
let editMode = false, currentEditId = null, modalType = '';

function openModal(type) {
    modalType = type; editMode = false; currentEditId = null;
    document.getElementById('modal-overlay').classList.add('active');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('active-form');
    
    if (type === 'pdf') {
        title.innerText = "PDF Raporu Oluştur";
        const today = new Date().toISOString().slice(0,7);
        form.innerHTML = `
            <label>Hangi Ayın Raporu?</label>
            <input type="month" id="pdf-month-select" value="${today}">
            <button type="button" class="btn btn-blue" style="width:100%; margin-top:15px;" onclick="generatePDF()">
                <i class="fas fa-file-pdf"></i> PDF İndir
            </button>
        `;
        return;
    }
    
    // Diğer formlar (Income/Expense/Loan)
    showFormFields(type, title, form);
}

function openEditModal(type, id) {
    modalType = type; editMode = true; currentEditId = id;
    document.getElementById('modal-overlay').classList.add('active');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('active-form');
    showFormFields(type, title, form, type==='income'?data.incomes.find(i=>i.id===id):data.expenses.find(e=>e.id===id));
}

function showFormFields(type, titleEl, formEl, item=null) {
    const lbl = type==='income'?'Gelir':(type==='expense'?'Harcama':'Kredi');
    titleEl.innerText = editMode ? `${lbl} Düzenle` : `${lbl} Ekle`;
    const dVal = item ? item.date : new Date().toISOString().split('T')[0];
    const desc = item ? item.desc : '';
    const amt = item ? item.amount.toLocaleString('tr-TR',{minimumFractionDigits:2}) : '';
    
    formEl.innerHTML = `
        ${type!=='loan' ? `<label>Tarih</label><input type="date" id="inp-date" value="${dVal}">` : ''}
        ${type==='loan' ? `<label>Taksit No</label><input type="number" id="inp-no" placeholder="9">` : ''}
        ${type==='loan' ? `<label>Vade Tarihi</label><input type="date" id="inp-date" value="${dVal}">` : ''}
        ${type!=='loan' ? `<label>Açıklama</label><input type="text" id="inp-desc" value="${desc}">` : ''}
        <label>Tutar</label><input type="text" id="inp-amount" inputmode="decimal" value="${amt}">
        <button type="button" class="btn ${type==='income'?'btn-green':(type==='expense'?'btn-red':'btn-blue')}" style="width:100%; margin-top:10px;" onclick="submitForm()">Kaydet</button>
    `;
}

function submitForm() {
    if (modalType === 'pdf') return; // PDF butonu ayrı
    const date = document.getElementById('inp-date').value;
    const amount = parseTrMoney(document.getElementById('inp-amount').value);
    const desc = document.getElementById('inp-desc') ? document.getElementById('inp-desc').value : '';
    
    if(!date || isNaN(amount)) return alert("Eksik bilgi!");
    
    if(modalType === 'loan') {
        data.loans.push({id:Date.now(), no:document.getElementById('inp-no').value, date, total:amount});
        switchView('loans');
    } else {
        const list = modalType==='income' ? data.incomes : data.expenses;
        if(editMode) {
            const i = list.find(x=>x.id===currentEditId);
            i.date=date; i.desc=desc; i.amount=amount;
        } else {
            list.push({id:Date.now(), date, desc, amount});
        }
        filterTransactions(modalType);
    }
    saveData(); closeModal();
}

// --- PDF OLUŞTURMA MOTORU ---
function generatePDF() {
    const ym = document.getElementById('pdf-month-select').value;
    if(!ym) return alert("Ay seçiniz");
    
    // 1. Verileri Hazırla
    const [year, month] = ym.split('-');
    const monthName = new Date(year, month-1).toLocaleDateString('tr-TR', {month:'long', year:'numeric'});
    
    const incomes = data.incomes.filter(i => i.date.startsWith(ym));
    const expenses = data.expenses.filter(e => e.date.startsWith(ym));
    
    // Kredi (3 Ay kuralı)
    let loanItems = [];
    let totalLoanCut = 0;
    data.loans.forEach(l => {
        if(isLoanActiveMonth(l.date, ym)) {
            const cut = l.total/3;
            totalLoanCut += cut;
            loanItems.push({ no: l.no, date: l.date, amount: cut });
        }
    });

    const totalInc = incomes.reduce((s,i)=>s+i.amount,0);
    const totalExp = expenses.reduce((s,e)=>s+e.amount,0);
    const net = totalInc - totalLoanCut - totalExp;

    // 2. HTML Şablonunu Doldur
    document.getElementById('pdf-month-title').innerText = `Dönem: ${monthName}`;
    document.getElementById('pdf-gen-date').innerText = new Date().toLocaleDateString('tr-TR');
    
    document.getElementById('pdf-total-inc').innerText = formatMoney(totalInc);
    document.getElementById('pdf-total-loan').innerText = formatMoney(totalLoanCut);
    document.getElementById('pdf-total-exp').innerText = formatMoney(totalExp);
    document.getElementById('pdf-net').innerText = formatMoney(net);

    // Tabloları Doldur
    const fillTable = (id, items, col1Func, col2Func, col3Func) => {
        const tb = document.querySelector(`#${id} tbody`);
        tb.innerHTML = '';
        if(items.length === 0) tb.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999">Kayıt Yok</td></tr>';
        items.forEach(item => {
            tb.innerHTML += `<tr><td>${col1Func(item)}</td><td>${col2Func(item)}</td><td class="tr">${col3Func(item)}</td></tr>`;
        });
    };

    fillTable('pdf-table-inc', incomes, i=>formatDateTR(i.date), i=>i.desc, i=>formatMoney(i.amount));
    fillTable('pdf-table-exp', expenses, e=>formatDateTR(e.date), e=>e.desc, e=>formatMoney(e.amount));
    fillTable('pdf-table-loan', loanItems, l=>`Taksit #${l.no}`, l=>formatDateTR(l.date), l=>formatMoney(l.amount));

    // 3. PDF'e Çevir ve İndir
    const element = document.getElementById('pdf-template');
    element.style.display = 'block'; // Geçici olarak görünür yap
    
    const opt = {
        margin: 0,
        filename: `Finans_Raporu_${ym}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, // Yüksek çözünürlük
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none'; // Tekrar gizle
        closeModal();
    });
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
function parseTrMoney(s) { return typeof s==='number'?s:parseFloat((s||'0').replace(/\./g,'').replace(',','.')); }
function formatMoney(n) { return n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ₺'; }
function formatDateTR(d) { return d.split('-').reverse().join('.'); }
function getMonthName(m) { return new Date(2023, m-1).toLocaleDateString('tr-TR', {month:'long'}); }
function isLoanActiveMonth(lDate, cDate) {
    const d1=new Date(lDate), d2=new Date(cDate+'-01'); d1.setDate(1);
    const diff = (d1.getFullYear()*12+d1.getMonth())-(d2.getFullYear()*12+d2.getMonth());
    return diff>=0 && diff<3;
}
