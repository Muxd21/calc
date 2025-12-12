// Smart Finance App - Main Application
// Free APIs: OpenRouter, Inflation Data, News

// Configuration
const CONFIG = {
    DATA_URL: './data/latest.json',
    UPDATE_INTERVAL: 3600000, // 1 hour
};

// State Management
const state = {
    currentView: 'dashboard',
    userData: null,
    loans: [],
    inflationData: null,
    newsData: null,
    aiInsights: null,
    lastUpdate: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Smart Finance App...');

    // Check for imported data from QR code (Magic Link)
    checkForImport();

    // Load user data from localStorage
    loadUserData();

    // Setup event listeners
    setupEventListeners();

    // Load data
    await loadData();

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }, 1000);

    // Setup auto-refresh
    setInterval(loadData, CONFIG.UPDATE_INTERVAL);
});

// Load User Data
function loadUserData() {
    const saved = localStorage.getItem('smartFinanceUser');
    const savedLoans = localStorage.getItem('smartFinanceLoans');

    if (saved) {
        state.userData = JSON.parse(saved);
        // Populate settings inputs
        const salaryInput = document.getElementById('salary-input');
        const raiseInput = document.getElementById('raise-input');

        if (salaryInput) salaryInput.value = state.userData.salary || '';
        if (raiseInput) raiseInput.value = state.userData.yearlyRaise || '';
    } else {
        // Initialize new user
        state.userData = {
            id: generateId(),
            salary: 10000, // Default salary
            yearlyRaise: 0,
            currency: 'SAR'
        };
        saveUserData();
    }

    if (savedLoans) {
        state.loans = JSON.parse(savedLoans);
    }
}

function saveUserData() {
    localStorage.setItem('smartFinanceUser', JSON.stringify(state.userData));
}

function saveLoans() {
    localStorage.setItem('smartFinanceLoans', JSON.stringify(state.loans));
}

// Load External Data
async function loadData() {
    try {
        const response = await fetch(CONFIG.DATA_URL);
        const data = await response.json();

        state.inflationData = data.inflation;
        state.newsData = data.news;
        state.aiInsights = data.insights;
        state.lastUpdate = new Date();

        updateDashboard();
        renderInsights();
        renderNews();

        const timeEl = document.getElementById('last-update-time');
        if (timeEl) timeEl.textContent = state.lastUpdate.toLocaleTimeString('ar-SA');

    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback data if fetch fails
        state.inflationData = { current: 1.69, change: -0.64 };
        updateDashboard();
        renderInsights();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });

    // Settings
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            state.userData.salary = parseFloat(document.getElementById('salary-input').value) || 0;
            state.userData.yearlyRaise = parseFloat(document.getElementById('raise-input').value) || 0;
            state.userData.currency = 'SAR'; // Force SAR
            saveUserData();
            updateDashboard();
            renderInsights(); // Re-render insights with new salary
            alert('تم حفظ الإعدادات بنجاح!');
        });
    }

    // QR Code
    const regenQrBtn = document.getElementById('regenerate-qr');
    if (regenQrBtn) {
        regenQrBtn.addEventListener('click', generateQRCode);
    }
    // Generate on load if profile view
    generateQRCode();

    // Loans Modal
    const modal = document.getElementById('loan-modal');
    const addLoanBtn = document.getElementById('add-loan-btn');
    if (addLoanBtn && modal) {
        addLoanBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (modal) modal.classList.add('hidden');
        });
    });

    const saveLoanBtn = document.getElementById('save-loan');
    if (saveLoanBtn) {
        saveLoanBtn.addEventListener('click', handleSaveLoan);
    }
}

function switchView(viewName) {
    // Update active state
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });

    state.currentView = viewName;

    if (viewName === 'loans') {
        renderLoans();
    } else if (viewName === 'profile') {
        generateQRCode();
    }
}

// Dashboard Updates
function updateDashboard() {
    if (!state.inflationData) return;

    // 1. Inflation Card
    const inflationEl = document.getElementById('current-inflation');
    if (inflationEl) inflationEl.textContent = `${state.inflationData.current}%`;

    const changeEl = document.getElementById('inflation-change');
    if (changeEl) {
        const change = state.inflationData.change;
        changeEl.textContent = `${change > 0 ? '+' : ''}${change}% عن العام الماضي`;
        changeEl.className = `stat-change ${change > 0 ? 'negative' : 'positive'}`; // High inflation is negative
    }

    // 2. Loans Card
    const totalLoans = state.loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
    const totalLoansEl = document.getElementById('total-loans');
    if (totalLoansEl) totalLoansEl.textContent = formatCurrency(totalLoans);

    const loansDetailEl = document.getElementById('loans-detail');
    if (loansDetailEl) loansDetailEl.textContent = `${state.loans.length} قروض نشطة`;

    // 3. Purchasing Power Loss (Real Money Truth)
    const salary = state.userData.salary || 0;
    const inflationRate = state.inflationData.current / 100;
    const annualLoss = salary * inflationRate * 12; // Annual loss based on monthly salary

    const powerLossEl = document.getElementById('power-loss');
    if (powerLossEl) powerLossEl.textContent = formatCurrency(annualLoss);

    const powerLossDetailEl = document.getElementById('power-loss-detail');
    if (powerLossDetailEl) powerLossDetailEl.textContent = 'خسارة سنوية متوقعة من الراتب';

    // 4. Next Payment
    const nextPaymentEl = document.getElementById('next-payment');
    const nextPaymentDetailEl = document.getElementById('next-payment-detail');

    if (nextPaymentEl && nextPaymentDetailEl) {
        if (state.loans.length > 0) {
            const totalMonthly = state.loans.reduce((sum, loan) => sum + (parseFloat(loan.monthlyPayment) || 0), 0);
            nextPaymentEl.textContent = formatCurrency(totalMonthly);
            nextPaymentDetailEl.textContent = 'إجمالي الدفعات الشهرية';
        } else {
            nextPaymentEl.textContent = '--';
            nextPaymentDetailEl.textContent = 'لا توجد دفعات';
        }
    }
}

// Render Insights (The Core AI Logic)
function renderInsights() {
    const container = document.getElementById('full-insights-container');
    if (!container) return;

    const salary = state.userData.salary || 10000;
    const inflation = state.inflationData ? state.inflationData.current : 1.69;
    const annualLoss = (salary * (inflation / 100) * 12).toFixed(0);

    // Calculate weighted average interest if loans exist
    let loanWisdomHTML = '';
    if (state.loans.length > 0) {
        const totalLoanAmount = state.loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);

        let weightedInterest = 0;
        if (totalLoanAmount > 0) {
            weightedInterest = state.loans.reduce((sum, loan) => {
                const amount = parseFloat(loan.amount) || 0;
                const interest = parseFloat(loan.interest) || 0;
                return sum + (interest * amount);
            }, 0) / totalLoanAmount;
        }

        const realInterest = weightedInterest - inflation;

        loanWisdomHTML = `
            <div class="insight-card">
                <div class="insight-icon">🏦</div>
                <div class="insight-content">
                    <h3>حكمة القروض (بناءً على قروضك)</h3>
                    <p>متوسط فائدة قروضك هو <strong>${weightedInterest.toFixed(2)}%</strong>.</p>
                    <p>الفائدة الحقيقية بعد التضخم هي <strong>${realInterest.toFixed(2)}%</strong>.</p>
                    <p class="small-note">${realInterest < 0 ? 'أنت "تربح" من التضخم لأن قيمة القرض تنخفض أسرع من الفائدة!' : 'حاول تقليل الفائدة لتقترب من معدل التضخم.'}</p>
                </div>
            </div>
        `;
    } else {
        loanWisdomHTML = `
            <div class="insight-card">
                <div class="insight-icon">🏦</div>
                <div class="insight-content">
                    <h3>حكمة القروض</h3>
                    <p>الفائدة الحقيقية = الفائدة الاسمية - ${inflation}%. <br>
                    مثال: إذا أخذت قرضاً بفائدة 5%، فالتكلفة الحقيقية هي <strong>${(5 - inflation).toFixed(2)}%</strong> فقط.</p>
                </div>
            </div>
        `;
    }

    // Dynamic HTML generation based on user data
    const insightsHTML = `
        <div class="insight-card">
            <div class="insight-icon">📉</div>
            <div class="insight-content">
                <h3>حقيقة أموالك</h3>
                <p>راتب <strong>${formatCurrency(salary)}</strong> يخسر <strong>${formatCurrency(annualLoss)}</strong> سنوياً من قيمته الحقيقية بسبب التضخم (${inflation}%).</p>
            </div>
        </div>

        <div class="insight-card">
            <div class="insight-icon">💡</div>
            <div class="insight-content">
                <h3>الإجراء الفوري</h3>
                <p>فعّل مفتاح AI للحصول على نصيحة ذكية مخصصة لتقليل هذه الخسارة.</p>
            </div>
        </div>

        <div class="insight-card">
            <div class="insight-icon">🔮</div>
            <div class="insight-content">
                <h3>نظرة المستقبل</h3>
                <p>التضخم <strong>${inflation}%</strong> يتطلب حماية مدخراتك بأصول حقيقية (ذهب، عقار، أسهم) بدلاً من النقد.</p>
            </div>
        </div>

        ${loanWisdomHTML}
        
        <div class="insight-card special">
            <div class="insight-icon">🧮</div>
            <div class="insight-content">
                <h3>حاسبة المصاريف والتضخم</h3>
                <p>أدخل مصاريفك الشهرية لترى كيف ستزيد خلال فترة القرض.</p>
                <div class="expense-calc">
                    <input type="number" id="monthly-expenses" placeholder="مصاريفك الشهرية" value="${(salary * 0.6).toFixed(0)}" style="width: 100%; padding: 8px; margin: 10px 0; border-radius: 6px; border: 1px solid #ddd;">
                    <div id="expense-projection" class="projection-result" style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                        <!-- Results will go here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = insightsHTML;

    // Attach listener for expense calculator
    const expenseInput = document.getElementById('monthly-expenses');
    if (expenseInput) {
        expenseInput.addEventListener('input', updateExpenseProjection);
        updateExpenseProjection(); // Initial run
    }
}

function updateExpenseProjection() {
    const expenseInput = document.getElementById('monthly-expenses');
    if (!expenseInput) return;

    const expenses = parseFloat(expenseInput.value) || 0;
    const inflation = state.inflationData ? state.inflationData.current : 1.69;
    const years = 5; // Standard projection

    const futureExpenses = expenses * Math.pow(1 + (inflation / 100), years);
    const difference = futureExpenses - expenses;

    const resultDiv = document.getElementById('expense-projection');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <p style="margin: 0 0 5px 0;">بعد ${years} سنوات، ستحتاج إلى <strong>${formatCurrency(futureExpenses)}</strong> لشراء نفس الأشياء.</p>
            <p class="small-note" style="font-size: 0.8em; opacity: 0.8; margin: 0;">زيادة قدرها ${formatCurrency(difference)} شهرياً.</p>
        `;
    }
}

function renderNews() {
    // Optional: Render news if needed in a specific container
}

// Loan Management
function handleSaveLoan() {
    const loan = {
        id: generateId(),
        type: document.getElementById('loan-type').value,
        amount: parseFloat(document.getElementById('loan-amount').value),
        interest: parseFloat(document.getElementById('loan-interest').value),
        duration: parseInt(document.getElementById('loan-duration').value),
        monthlyPayment: parseFloat(document.getElementById('loan-payment').value),
        createdAt: new Date().toISOString()
    };

    if (!loan.amount || !loan.monthlyPayment) {
        alert('الرجاء تعبئة البيانات الأساسية للقرض');
        return;
    }

    state.loans.push(loan);
    saveLoans();
    updateDashboard();
    renderLoans();

    const modal = document.getElementById('loan-modal');
    if (modal) modal.classList.add('hidden');

    // Reset form
    document.getElementById('loan-amount').value = '';
    document.getElementById('loan-payment').value = '';
}

function renderLoans() {
    const container = document.getElementById('loans-container');
    if (!container) return; // Might not be in view

    if (state.loans.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <h3>لا توجد قروض بعد</h3>
                <p>ابدأ بإضافة قرضك الأول لتتبع تكلفته الحقيقية</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.loans.map(loan => {
        const progress = calculateLoanProgress(loan);
        const inflation = state.inflationData ? state.inflationData.current : 1.69;
        const realInterest = loan.interest - inflation;

        return `
        <div class="loan-card">
            <div class="loan-header">
                <span class="loan-type">${getLoanTypeLabel(loan.type)}</span>
                <span class="loan-amount">${formatCurrency(loan.amount)}</span>
            </div>
            <div class="loan-details">
                <div class="detail-item">
                    <label>القسط الشهري</label>
                    <span>${formatCurrency(loan.monthlyPayment)}</span>
                </div>
                <div class="detail-item">
                    <label>الفائدة الحقيقية</label>
                    <span class="${realInterest < 0 ? 'positive' : 'negative'}">
                        ${realInterest.toFixed(2)}%
                    </span>
                </div>
            </div>
            <div class="progress-bar">
                <div class="fill" style="width: ${progress}%"></div>
            </div>
            <div class="loan-footer">
                <span>متبقي ${Math.max(0, loan.duration - Math.floor((new Date() - new Date(loan.createdAt)) / (1000 * 60 * 60 * 24 * 30)))} شهر</span>
                <button onclick="deleteLoan('${loan.id}')" class="btn-text text-red">حذف</button>
            </div>
        </div>
    `}).join('');
}

window.deleteLoan = function (id) {
    if (confirm('هل أنت متأكد من حذف هذا القرض؟')) {
        state.loans = state.loans.filter(l => l.id !== id);
        saveLoans();
        renderLoans();
        updateDashboard();
    }
};

// QR Code - Magic Link Generator
function generateQRCode() {
    const qrContainer = document.getElementById('qr-code');
    if (!qrContainer) return;

    // Create a "Magic Link" containing the data
    const data = {
        id: state.userData.id,
        salary: state.userData.salary,
        currency: state.userData.currency,
        yearlyRaise: state.userData.yearlyRaise
    };

    const jsonString = JSON.stringify(data);
    const encodedData = encodeURIComponent(jsonString);

    // Construct the full URL
    // We use window.location.origin + window.location.pathname to get the base app URL
    const magicLink = `${window.location.origin}${window.location.pathname}?import=${encodedData}`;

    // Generate QR code pointing to the Magic Link
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(magicLink)}&color=6366f1`;

    qrContainer.innerHTML = `
        <img src="${qrUrl}" alt="QR Code" style="border-radius: 8px; border: 2px solid #eee;">
        <p style="font-size: 0.8em; margin-top: 10px; color: #666;">امسح الرمز بكاميرا الجوال لنقل بياناتك فوراً</p>
    `;
}

// Check for Import Data
function checkForImport() {
    const urlParams = new URLSearchParams(window.location.search);
    const importData = urlParams.get('import');

    if (importData) {
        try {
            const data = JSON.parse(decodeURIComponent(importData));

            if (data.id && data.salary) {
                if (confirm('هل تريد استيراد البيانات المالية من الرمز الممسوح؟\n(سيتم استبدال البيانات الحالية)')) {
                    state.userData = {
                        ...state.userData, // Keep defaults if missing
                        ...data
                    };
                    saveUserData();
                    alert('تم استيراد البيانات بنجاح! 🎉');

                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        } catch (e) {
            console.error('Error importing data:', e);
        }
    }
}

// Utilities
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    // Use custom symbol ⃁ (U+20C1) as requested
    const formatter = new Intl.NumberFormat('ar-SA', {
        style: 'decimal',
        numberingSystem: 'latn', // Force Latin numerals (0-9)
        maximumFractionDigits: 0
    });
    return formatter.format(amount) + ' ⃁';
}

function getLoanTypeLabel(type) {
    const labels = {
        car: 'سيارة',
        rent: 'إيجار',
        installment: 'تقسيط',
        bnpl: 'تمارا/تابي',
        custom: 'مخصص'
    };
    return labels[type] || type;
}

function calculateLoanProgress(loan) {
    const monthsSinceStart = Math.floor(
        (new Date() - new Date(loan.createdAt)) / (1000 * 60 * 60 * 24 * 30)
    );
    return Math.min((monthsSinceStart / loan.duration) * 100, 100);
}
