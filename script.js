// --- VERİ YAPISI ---
let data = {
    loans: [],
    expenses: [],
    incomes: []
};

// Eksik olan 7 ve 8. taksitleri de içeren hazır liste
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
    loadData();
    renderAll();
    updateStatusTitle(); // Yeni Başlık Fonksiyonu
});

// YENİ: Başlığı güncel ay/yıl yapma
function updateStatusTitle() {
    const date = new Date();
    const options = { year: 'numeric', month: 'long' };
    const current = date.toLocaleDateString('tr-TR', options); // Örn: Şubat 2026
    
    // Büyük harfle yazmak için
    document.getElementById('current-status-title').innerText = `${current} DURUM`;
}

function loadData() {
    const stored = localStorage.getItem('finansProV2');
    if (stored) {
        data = JSON.parse(stored);
        if (!Array.isArray(data.incomes)) {
            const newIncomes = [];
            for (const [key, value] of Object.entries(data.incomes)) {
                newIncomes.push({ id: Date.now() + Math.random(), date: key + '-01', desc: 'Gelir Girişi', amount: value });
            }
            data.incomes = newIncomes;
            saveData();
        }
    } else {
        data.loans = [...PRELOADED_LOANS];
        // Örnek Başlangıç
        data.incomes.push({ id: 1, date: '2026-03-15', desc: 'Maaş', amount: 117000 });
        saveData();
    }
}

function saveData() {
    localStorage.setItem('finansProV2', JSON.stringify(data));
    renderAll();
}

function resetData() {
    if(confirm("Tüm veriler silinecek! Onaylıyor musun?")) {
        localStorage.removeItem('finansProV2');
        location.reload();
    }
}

function exportData() {
    const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const a = document.createElement('a');
    a.href = str; a.download = "finans_yedek.json";
    document.body.appendChild(a); a.click(); a.remove();
}

// --- GÖRÜNÜM ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    if(viewId === 'dashboard') document.querySelectorAll('.nav-btn')[0].classList.add('active');
    if(viewId === 'transactions') document.querySelectorAll('.nav-btn')[1].classList.add('active');
    if(viewId === 'loans') document.querySelectorAll('.nav-btn')[2].classList.add('active');

    if(viewId === 'transactions') filterTransactions('all');
}

function renderAll() {
    renderDashboard();
    renderLoans();
}

// --- DASHBOARD ---
function renderDashboard() {
    const tbody = document.getElementById('dashboard-body');
    const selectedYear = document.getElementById('year-filter').value;
    tbody.innerHTML = '';

    let grandTotal = 0;

    for (let m = 1; m <= 12; m++) {
        const monthStr = m < 10 ? `0${m}` : `${m}`;
        const ym = `${selectedYear}-${monthStr}`;

        const monthIncomes = data.incomes.filter(i => i.date.startsWith(ym));
        const totalIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);

        const monthExpenses = data.expenses.filter(e => e.date.startsWith(ym));
        const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        let creditCut = 0;
        data.loans.forEach(l => {
            if (isLoanActiveMonth(l.date, ym)) {
                creditCut += (l.total / 3);
            }
        });

        const net = totalIncome - creditCut - totalExpense;
        grandTotal += net;

        const row = `
            <tr>
                <td>${getMonthName(m)}</td>
                <td class="text-right" style="color:var(--green)">${formatMoney(totalIncome)}</td>
                <td class="text-right" style="color:var(--blue)">${formatMoney(creditCut)}</td>
                <td class="text-right" style="color:var(--red)">${formatMoney(totalExpense)}</td>
                <td class="text-right" style="font-weight:bold; color:${net<0?'red':'green'}">${formatMoney(net)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    }
    document.getElementById('grand-total').innerText = formatMoney(grandTotal);
}

// --- HAREKET LİSTESİ ---
function filterTransactions(type) {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    let items = [];
    if (type === 'all' || type === 'income') data.incomes.forEach(i => items.push({...i, type: 'income'}));
    if (type === 'all' || type === 'expense') data.expenses.forEach(e => items.push({...e, type: 'expense'}));

    items.sort((a,b) => new Date(b.date) - new Date(a.date));

    if(items.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">Kayıt yok.</div>';
        return;
    }

    items.forEach(item => {
        const isInc = item.type === 'income';
        const cssClass = isInc ? 'income-tag' : 'expense-tag';
        const color = isInc ? 'var(--green)' : 'var(--red)';
        
        const html = `
        <div class="trans-item ${cssClass}">
            <div class="trans-left">
                <h4>${item.desc || (isInc ? 'Gelir' : 'Harcama')}</h4>
                <p>${formatDateTR(item.date)}</p>
            </div>
            <div class="trans-right">
                <span class="trans-amt" style="color:${color}">${isInc ? '+' : '-'}${formatMoney(item.amount)}</span>
                <div class="trans-actions">
                    <button onclick="openEditModal('${item.type}', ${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="del" onclick="deleteItem('${item.type}', ${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
        list.innerHTML += html;
    });
}

function deleteItem(type, id) {
    if(!confirm("Silinsin mi?")) return;
    if(type === 'income') data.incomes = data.incomes.filter(i => i.id !== id);
    if(type === 'expense') data.expenses = data.expenses.filter(e => e.id !== id);
    saveData();
    filterTransactions(type === 'income' ? 'income' : (type === 'expense' ? 'expense' : 'all'));
}

// --- KREDİLER ---
function renderLoans() {
    const container = document.getElementById('loan-list-full');
    container.innerHTML = '';
    data.loans.sort((a,b) => new Date(a.date) - new Date(b.date));

    data.loans.forEach(l => {
        const monthly = l.total / 3;
        const html = `
        <div class="loan-card">
            <div class="loan-header">
                <span>Taksit #${l.no}</span>
                <span>${formatDateTR(l.date)}</span>
            </div>
            <div class="loan-body">
                <h3>${formatMoney(l.total)}</h3>
                <small style="color:var(--blue)">Ayda: ${formatMoney(monthly)}</small>
            </div>
            <div class="loan-footer">
                <button class="btn-text" onclick="editLoan(${l.id})"><i class="fas fa-edit"></i> Düzenle</button>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

function editLoan(id) {
    const loan = data.loans.find(l => l.id === id);
    if(!loan) return;
    const newTotal = prompt(`Taksit #${loan.no} yeni tutar:`, loan.total);
    if(newTotal !== null) {
        loan.total = parseTrMoney(newTotal);
        saveData();
    }
}

// --- MODAL ---
let editMode = false;
let currentEditId = null;

function openModal(type) {
    editMode = false;
    currentEditId = null;
    showModalForm(type);
}

function openEditModal(type, id) {
    editMode = true;
    currentEditId = id;
    let item;
    if(type === 'income') item = data.incomes.find(i => i.id === id);
    if(type === 'expense') item = data.expenses.find(e => e.id === id);
    showModalForm(type, item);
}

function showModalForm(type, item = null) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('active-form');
    overlay.classList.add('active');
    
    const dateVal = item ? item.date : new Date().toISOString().split('T')[0];
    const descVal = item ? item.desc : '';
    const amountVal = item ? item.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2}) : '';

    let typeLabel = type === 'income' ? 'Gelir' : (type === 'expense' ? 'Harcama' : 'Kredi');
    title.innerText = editMode ? `${typeLabel} Düzenle` : `${typeLabel} Ekle`;

    form.innerHTML = `
        <input type="hidden" id="form-type" value="${type}">
        ${type !== 'loan' ? `<label>Tarih</label><input type="date" id="inp-date" value="${dateVal}">` : ''}
        ${type === 'loan' ? `<label>Taksit No</label><input type="number" id="inp-no" placeholder="9">` : ''}
        ${type === 'loan' ? `<label>Vade Tarihi</label><input type="date" id="inp-date" value="${dateVal}">` : ''}
        ${type !== 'loan' ? `<label>Açıklama</label><input type="text" id="inp-desc" value="${descVal}">` : ''}
        <label>Tutar</label>
        <input type="text" id="inp-amount" inputmode="decimal" placeholder="0,00" value="${amountVal}">
        <button type="button" class="btn ${type==='income'?'btn-green':(type==='expense'?'btn-red':'btn-blue')}" style="width:100%; margin-top:10px;" onclick="submitForm()">Kaydet</button>
    `;
}

function submitForm() {
    const type = document.getElementById('form-type').value;
    const date = document.getElementById('inp-date').value;
    const desc = document.getElementById('inp-desc') ? document.getElementById('inp-desc').value : '';
    const amount = parseTrMoney(document.getElementById('inp-amount').value);

    if(!date || isNaN(amount)) return alert("Hata: Tarih veya tutar eksik");

    if(type === 'income' || type === 'expense') {
        const list = type === 'income' ? data.incomes : data.expenses;
        if(editMode) {
            const item = list.find(i => i.id === currentEditId);
            item.date = date; item.desc = desc; item.amount = amount;
        } else {
            list.push({ id: Date.now(), date, desc, amount });
        }
        filterTransactions(type);
    } 
    else if(type === 'loan') {
        const no = document.getElementById('inp-no').value;
        data.loans.push({ id: Date.now(), no, date, total: amount });
        switchView('loans');
    }
    saveData();
    closeModal();
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

function parseTrMoney(str) {
    if(typeof str === 'number') return str;
    if(!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}
function formatMoney(amount) {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
function formatDateTR(dateStr) {
    const parts = dateStr.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
function getMonthName(m) {
    return new Date(2023, m - 1).toLocaleString('tr-TR', { month: 'long' });
}
function isLoanActiveMonth(loanDateStr, currentMonthStr) {
    const dLimit = new Date(loanDateStr); dLimit.setDate(1);
    const dCheck = new Date(currentMonthStr + "-01");
    const diff = (dLimit.getFullYear()*12 + dLimit.getMonth()) - (dCheck.getFullYear()*12 + dCheck.getMonth());
    return diff >= 0 && diff < 3;
}
