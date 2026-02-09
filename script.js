// --- VERİ YAPISI ---
let data = {
    loans: [],
    expenses: [],
    incomes: [] // ARTIK ARRAY OLARAK TUTULUYOR (Çoklu giriş ve düzenleme için)
};

// Excelden Eksik Olan 7 ve 8. Taksitleri Tahmini Ekledim (Kullanıcı düzeltebilir)
const PRELOADED_LOANS = [
    { id: 101, no: 1, date: '2026-05-06', total: 151347.22 },
    { id: 102, no: 2, date: '2026-08-06', total: 146388.89 },
    { id: 103, no: 3, date: '2026-11-06', total: 140958.33 },
    { id: 104, no: 4, date: '2027-02-06', total: 136118.06 },
    { id: 105, no: 5, date: '2027-05-06', total: 129447.92 },
    { id: 106, no: 6, date: '2027-08-06', total: 124409.72 },
    // EKLENEN YENİ TAKSİTLER (Tahmini/Boş)
    { id: 107, no: 7, date: '2027-11-06', total: 120000.00 }, // Kullanıcı düzenlesin
    { id: 108, no: 8, date: '2028-02-06', total: 115000.00 }  // Kullanıcı düzenlesin
];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderAll();
});

function loadData() {
    const stored = localStorage.getItem('finansProV2');
    if (stored) {
        data = JSON.parse(stored);
        // Eski veri yapısından (income object) yeniye (income array) geçiş kontrolü
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
        data.incomes.push({ id: 1, date: '2026-03-15', desc: 'Maaş+Ek', amount: 117000 });
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

// --- GÖRÜNÜM YÖNETİMİ ---
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // Buton aktifliği
    if(viewId === 'dashboard') document.querySelectorAll('.nav-btn')[0].classList.add('active');
    if(viewId === 'transactions') document.querySelectorAll('.nav-btn')[1].classList.add('active');
    if(viewId === 'loans') document.querySelectorAll('.nav-btn')[2].classList.add('active');

    if(viewId === 'transactions') filterTransactions('all');
}

function renderAll() {
    renderDashboard();
    renderLoans();
    // Transaction listesi talep edildiğinde render edilir
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

        // Gelir Toplamı
        const monthIncomes = data.incomes.filter(i => i.date.startsWith(ym));
        const totalIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);

        // Gider Toplamı
        const monthExpenses = data.expenses.filter(e => e.date.startsWith(ym));
        const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Kredi Kesintisi (1/3 Kuralı)
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

// --- HAREKET LİSTESİ (TRANSACTIONS) ---
function filterTransactions(type) {
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';
    
    // Tab butonlarını güncelle
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    let items = [];
    
    if (type === 'all' || type === 'income') {
        data.incomes.forEach(i => items.push({...i, type: 'income'}));
    }
    if (type === 'all' || type === 'expense') {
        data.expenses.forEach(e => items.push({...e, type: 'expense'}));
    }

    // Tarihe göre sırala (En yeni en üstte)
    items.sort((a,b) => new Date(b.date) - new Date(a.date));

    if(items.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">Kayıt bulunamadı.</div>';
        return;
    }

    items.forEach(item => {
        const isInc = item.type === 'income';
        const cssClass = isInc ? 'income-tag' : 'expense-tag';
        const icon = isInc ? 'fa-arrow-up' : 'fa-arrow-down';
        const color = isInc ? 'var(--green)' : 'var(--red)';
        
        const html = `
        <div class="trans-item ${cssClass}">
            <div class="trans-left">
                <h4>${item.desc || (isInc ? 'Gelir' : 'Harcama')}</h4>
                <p><i class="far fa-calendar"></i> ${formatDateTR(item.date)}</p>
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
    if(!confirm("Silmek istiyor musunuz?")) return;
    
    if(type === 'income') data.incomes = data.incomes.filter(i => i.id !== id);
    if(type === 'expense') data.expenses = data.expenses.filter(e => e.id !== id);
    
    saveData();
    filterTransactions(type === 'income' ? 'income' : (type === 'expense' ? 'expense' : 'all'));
}

// --- KREDİ LİSTESİ ---
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
                <small style="color:var(--blue)">Aylık Ayrılan: ${formatMoney(monthly)}</small>
            </div>
            <div class="loan-footer">
                <div class="loan-actions" style="display:block; position:static; text-align:right;">
                     <button class="btn-text" onclick="editLoan(${l.id})"><i class="fas fa-edit"></i> Düzenle</button>
                </div>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

function editLoan(id) {
    const loan = data.loans.find(l => l.id === id);
    if(!loan) return;
    
    const newTotal = prompt(`Taksit #${loan.no} için yeni tutarı girin:`, loan.total);
    if(newTotal !== null) {
        loan.total = parseTrMoney(newTotal);
        saveData();
    }
}

// --- MODAL VE FORM ---
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
    
    // Default Değerler
    const dateVal = item ? item.date : new Date().toISOString().split('T')[0];
    const descVal = item ? item.desc : '';
    const amountVal = item ? item.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2}) : '';

    if (type === 'income') {
        title.innerText = editMode ? "Gelir Düzenle" : "Gelir Ekle";
        form.innerHTML = `
            <input type="hidden" id="form-type" value="income">
            <label>Tarih</label>
            <input type="date" id="inp-date" value="${dateVal}">
            <label>Açıklama</label>
            <input type="text" id="inp-desc" placeholder="Örn: Maaş" value="${descVal}">
            <label>Tutar</label>
            <input type="text" id="inp-amount" inputmode="decimal" placeholder="10.000,00" value="${amountVal}">
            <button type="button" class="btn btn-green" style="width:100%; margin-top:10px;" onclick="submitForm()">Kaydet</button>
        `;
    } 
    else if (type === 'expense') {
        title.innerText = editMode ? "Harcama Düzenle" : "Harcama Ekle";
        form.innerHTML = `
            <input type="hidden" id="form-type" value="expense">
            <label>Tarih</label>
            <input type="date" id="inp-date" value="${dateVal}">
            <label>Açıklama</label>
            <input type="text" id="inp-desc" placeholder="Örn: Market" value="${descVal}">
            <label>Tutar</label>
            <input type="text" id="inp-amount" inputmode="decimal" placeholder="1.000,50" value="${amountVal}">
            <button type="button" class="btn btn-red" style="width:100%; margin-top:10px;" onclick="submitForm()">Kaydet</button>
        `;
    }
    else if (type === 'loan') {
        title.innerText = "Yeni Kredi Taksiti";
        form.innerHTML = `
            <input type="hidden" id="form-type" value="loan">
            <label>Taksit No</label>
            <input type="number" id="inp-no" placeholder="Örn: 9">
            <label>Vade Tarihi</label>
            <input type="date" id="inp-date" value="${dateVal}">
            <label>Tutar</label>
            <input type="text" id="inp-amount" inputmode="decimal" placeholder="100.000,00">
            <button type="button" class="btn btn-blue" style="width:100%; margin-top:10px;" onclick="submitForm()">Kaydet</button>
        `;
    }
}

function submitForm() {
    const type = document.getElementById('form-type').value;
    const date = document.getElementById('inp-date').value;
    const desc = document.getElementById('inp-desc') ? document.getElementById('inp-desc').value : '';
    const amountStr = document.getElementById('inp-amount').value;
    const amount = parseTrMoney(amountStr);

    if(!date || isNaN(amount)) return alert("Lütfen tarih ve tutarı kontrol edin.");

    if(type === 'income') {
        if(editMode) {
            const item = data.incomes.find(i => i.id === currentEditId);
            item.date = date; item.desc = desc; item.amount = amount;
        } else {
            data.incomes.push({ id: Date.now(), date, desc, amount });
        }
        filterTransactions('income');
    }
    else if(type === 'expense') {
        if(editMode) {
            const item = data.expenses.find(e => e.id === currentEditId);
            item.date = date; item.desc = desc; item.amount = amount;
        } else {
            data.expenses.push({ id: Date.now(), date, desc, amount });
        }
        filterTransactions('expense');
    }
    else if(type === 'loan') {
        const no = document.getElementById('inp-no').value;
        data.loans.push({ id: Date.now(), no, date, total: amount });
        switchView('loans');
    }

    saveData();
    closeModal();
    if(document.getElementById('view-transactions').classList.contains('active')) {
        // Liste görünümündeysek listeyi yenile
        const activeFilter = document.querySelector('.filter-tab.active').innerText;
        if(activeFilter === 'Tümü') filterTransactions('all');
        else if(activeFilter === 'Gelirler') filterTransactions('income');
        else filterTransactions('expense');
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// --- UTILS ---
function parseTrMoney(str) {
    if(typeof str === 'number') return str;
    if(!str) return 0;
    // 15.000,50 -> 15000.50
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
    const date = new Date(2023, m - 1);
    return date.toLocaleString('tr-TR', { month: 'long' });
}

function isLoanActiveMonth(loanDateStr, currentMonthStr) {
    const dLimit = new Date(loanDateStr); dLimit.setDate(1);
    const dCheck = new Date(currentMonthStr + "-01");
    const diff = (dLimit.getFullYear()*12 + dLimit.getMonth()) - (dCheck.getFullYear()*12 + dCheck.getMonth());
    return diff >= 0 && diff < 3;
}
