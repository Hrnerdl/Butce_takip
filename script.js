// Veri yapısı
let data = {
    loans: [],
    expenses: [],
    incomes: {}
};

// Başlangıç Ayarları
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderAll();
    
    // Varsayılan tarihleri bugüne ayarla
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('loan-date').value = today;
    document.getElementById('exp-date').value = today;
    
    // Form Event Listeners
    document.getElementById('form-home').onsubmit = (e) => { e.preventDefault(); addIncome(); };
    document.getElementById('form-loans').onsubmit = (e) => { e.preventDefault(); addLoan(); };
    document.getElementById('form-expenses').onsubmit = (e) => { e.preventDefault(); addExpense(); };
});

// --- SEKME YÖNETİMİ ---
let currentTab = 'home';

function switchTab(tabId) {
    currentTab = tabId;
    
    // Nav butonlarını güncelle
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Sayfaları güncelle
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Başlığı güncelle
    const titles = { 'home': 'Özet Durum', 'loans': 'Kredi Planı', 'expenses': 'Harcamalar' };
    document.getElementById('page-title').innerText = titles[tabId];
}

// --- VERİ İŞLEMLERİ ---

function loadData() {
    const stored = localStorage.getItem('finansAppData');
    if (stored) {
        data = JSON.parse(stored);
    } else {
        // İlk kullanım için boş veriler veya örnek veri eklenebilir
    }
}

function saveData() {
    localStorage.setItem('finansAppData', JSON.stringify(data));
    renderAll();
    closeModal();
}

// --- GELİR / KASA İŞLEMLERİ ---
function addIncome() {
    const date = document.getElementById('income-date').value; // YYYY-MM
    const amount = parseFloat(document.getElementById('income-amount').value);
    
    if (date && amount) {
        data.incomes[date] = amount;
        saveData();
    }
}

// --- KREDİ İŞLEMLERİ ---
function addLoan() {
    const no = document.getElementById('loan-no').value;
    const date = document.getElementById('loan-date').value;
    const total = parseFloat(document.getElementById('loan-total').value);

    if (no && date && total) {
        data.loans.push({ id: Date.now(), no, date, total });
        saveData();
    }
}

function deleteLoan(id) {
    if(confirm('Bu krediyi silmek istiyor musun?')) {
        data.loans = data.loans.filter(l => l.id !== id);
        saveData();
    }
}

// --- HARCAMA İŞLEMLERİ ---
function addExpense() {
    const date = document.getElementById('exp-date').value;
    const desc = document.getElementById('exp-desc').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);

    if (date && amount) {
        data.expenses.push({ id: Date.now(), date, desc, amount });
        saveData();
    }
}

function deleteExpense(id) {
    if(confirm('Harcamayı silmek istiyor musun?')) {
        data.expenses = data.expenses.filter(e => e.id !== id);
        saveData();
    }
}

// --- HESAPLAMA VE GÖRÜNTÜLEME (CORE ENGINE) ---

function renderAll() {
    renderLoans();
    renderExpenses();
    renderDashboard();
}

function renderLoans() {
    const list = document.getElementById('loans-list');
    list.innerHTML = '';
    
    data.loans.sort((a,b) => new Date(a.date) - new Date(b.date));

    data.loans.forEach(l => {
        const monthly = (l.total / 3).toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'});
        const dateStr = new Date(l.date).toLocaleDateString('tr-TR', {day:'numeric', month:'long', year:'numeric'});
        
        list.innerHTML += `
        <div class="item-card">
            <div class="item-left">
                <h3>${l.no}. Taksit</h3>
                <p>Vade: ${dateStr}</p>
            </div>
            <div class="item-right">
                <span class="amount text-danger">${l.total.toLocaleString('tr-TR')} ₺</span>
                <span class="sub-info">Aylık Ayrılan: ${monthly}</span>
            </div>
            <button class="delete-btn" onclick="deleteLoan(${l.id})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
}

function renderExpenses() {
    const list = document.getElementById('expenses-list');
    list.innerHTML = '';
    
    data.expenses.sort((a,b) => new Date(b.date) - new Date(a.date)); // En yeni en üstte

    data.expenses.forEach(e => {
        const dateStr = new Date(e.date).toLocaleDateString('tr-TR', {day:'numeric', month:'long'});
        
        list.innerHTML += `
        <div class="item-card">
            <div class="item-left">
                <h3>${e.desc}</h3>
                <p>${dateStr}</p>
            </div>
            <div class="item-right">
                <span class="amount text-danger">-${e.amount.toLocaleString('tr-TR')} ₺</span>
            </div>
            <button class="delete-btn" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
}

function renderDashboard() {
    const list = document.getElementById('dashboard-list');
    list.innerHTML = '';

    // Tüm tarihleri topla (ay bazında)
    let months = new Set(Object.keys(data.incomes));
    data.expenses.forEach(e => months.add(e.date.substring(0, 7)));
    
    // Kredi dönemleri (Vade - 3 ay)
    data.loans.forEach(l => {
        let d = new Date(l.date);
        for(let i=0; i<3; i++) {
            months.add(d.toISOString().substring(0,7));
            d.setMonth(d.getMonth() - 1);
        }
    });

    const sortedMonths = Array.from(months).sort();
    let latestBalance = 0;

    sortedMonths.forEach(ym => {
        const income = data.incomes[ym] || 0;
        
        // Harcamalar
        const totalExp = data.expenses
            .filter(e => e.date.startsWith(ym))
            .reduce((sum, e) => sum + e.amount, 0);

        // Kredi Kesintisi (Excel Mantığı: Vade tarihine denk gelen veya önceki 2 ay)
        let creditCut = 0;
        data.loans.forEach(l => {
            const dueDate = new Date(l.date);
            const checkDate = new Date(ym + "-01");
            
            // Ay farkını bul
            // Vade tarihi ile o ay arasındaki fark
            // Eğer vade Mayıs ise; Mayıs, Nisan, Mart aylarında kesinti olur.
            // Yani vade tarihinden ay çıkarınca (0,1,2 ay) şimdiki aya eşit mi?
            
            // Basit kontrol:
            const m1 = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
            const m2 = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, 1);
            const m3 = new Date(dueDate.getFullYear(), dueDate.getMonth() - 2, 1);
            
            if (checkDate.getTime() === m1.getTime() || 
                checkDate.getTime() === m2.getTime() || 
                checkDate.getTime() === m3.getTime()) {
                creditCut += (l.total / 3);
            }
        });

        const net = income - creditCut - totalExp;
        latestBalance = net; // Son ayın bakiyesi dashboard'a yazılabilir veya kümülatif gidilebilir. 
        // Ancak excelde her ay "Kalan" sütunu o aya ait. Biz de o ayı gösterelim.
        
        // Ay İsimlendirmesi
        const [y, m] = ym.split('-');
        const monthName = new Date(y, m-1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

        const balanceColor = net >= 0 ? 'text-success' : 'text-danger';

        list.innerHTML += `
        <div class="item-card">
            <div class="item-left">
                <h3>${monthName}</h3>
                <p>Gelir: ${income.toLocaleString()} ₺</p>
            </div>
            <div class="item-right">
                <span class="amount ${balanceColor}">${net.toLocaleString('tr-TR', {minimumFractionDigits: 2})} ₺</span>
                <span class="sub-info">Kredi Kesintisi: ${creditCut.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</span>
                <span class="sub-info">Harcama: ${totalExp.toLocaleString('tr-TR', {maximumFractionDigits:0})} ₺</span>
            </div>
        </div>`;
    });

    // En üstteki büyük bakiye (Son işlem yapılan ayın bakiyesi veya bugünün bakiyesi)
    // Şu anlık en son hesaplanan ayın bakiyesini yazalım.
    document.getElementById('total-balance').innerText = latestBalance.toLocaleString('tr-TR', {style: 'currency', currency: 'TRY'});
}

// --- MODAL YÖNETİMİ ---
function openModal() {
    document.getElementById('modal-overlay').classList.add('active');
    
    // Hangi formun açılacağını sekmeye göre belirle
    document.querySelectorAll('.modal-form').forEach(f => f.style.display = 'none');
    document.getElementById('form-' + currentTab).style.display = 'block';
    
    // Başlık
    const titles = { 'home': 'Gelir / Kasa Güncelle', 'loans': 'Yeni Kredi Taksiti', 'expenses': 'Harcama Ekle' };
    document.getElementById('modal-title').innerText = titles[currentTab];
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    // Formları resetle
    document.querySelectorAll('form').forEach(f => f.reset());
    // Tarihleri tekrar bugüne al
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('loan-date').value = today;
    document.getElementById('exp-date').value = today;
}

// Modal dışına tıklayınca kapatma
document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});