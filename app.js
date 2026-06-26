// LendOptima AI Application Logic

// Global Application State
const state = {
    dataset: [],
    filteredDataset: [],
    currentPage: 1,
    recordsPerPage: 12,
    charts: {},
    isLoaded: false
};

// Fallback/Sandbox Data summary stats in case CSV parsing fails (CORS blocks)
const FALLBACK_STATS = {
    total: 1000,
    approvalRate: 29.8,
    avgIncome: 10853,
    avgCredit: 676,
    approvedCount: 298,
    rejectedCount: 702
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initMobileNavigation();
    initFormSync();
    initCSVLoader();
    setupPredictionListeners();
    initModalEvents();
    initThemeToggle();
});

// 1. Tab Navigation Handler
function initTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const titleEl = document.getElementById('current-tab-title');
    const subtitleEl = document.getElementById('current-tab-subtitle');

    const subtitles = {
        'overview': 'Real-time statistics & visual analytics of the loan approval dataset',
        'calculator': 'Adjust parameters to evaluate eligibility against the trained Logistic Regression model',
        'explorer': 'Explore, search, and filter individual applicant records',
        'model-info': 'Deep-dive into the performance, formulas, and feature coefficients of the model'
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');

            // Set active class on menu
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Toggle sections
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${tabId}`) {
                    content.classList.add('active');
                }
            });

            // Update page headers
            titleEl.textContent = item.querySelector('span').textContent;
            subtitleEl.textContent = subtitles[tabId];
            
            // Adjust canvas sizing when switching to charts/insights tab
            if (tabId === 'overview' && state.isLoaded) {
                renderCharts();
            } else if (tabId === 'model-info' && state.isLoaded) {
                renderFeatureImportanceChart();
            }
        });
    });
}

// 1.1 Mobile Navigation Handler
function initMobileNavigation() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openBtn = document.getElementById('btn-sidebar-open');
    const closeBtn = document.getElementById('btn-sidebar-close');
    const navItems = document.querySelectorAll('.nav-item');

    function openSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        }
    }

    function closeSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }

    if (openBtn) {
        openBtn.addEventListener('click', openSidebar);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a navigation item is clicked (on mobile)
    navItems.forEach(item => {
        item.addEventListener('click', closeSidebar);
    });
}

// 2. Input Elements Form Sync (Range <--> Number)
function initFormSync() {
    const sliders = document.querySelectorAll('.slider');
    sliders.forEach(slider => {
        const id = slider.id;
        // e.g. input-applicant-income
        const numInputId = id.replace('input-', 'num-');
        const numInput = document.getElementById(numInputId);

        if (numInput) {
            // Slider changes -> update number
            slider.addEventListener('input', () => {
                numInput.value = slider.value;
                calculatePrediction();
            });

            // Number changes -> update slider
            numInput.addEventListener('input', () => {
                let val = parseFloat(numInput.value);
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);

                if (isNaN(val)) val = min;
                if (val < min) val = min;
                if (val > max) val = max;

                slider.value = val;
                calculatePrediction();
            });
        }
    });

    // Dropdowns and regular select triggers
    const dropdowns = document.querySelectorAll('.custom-select');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('change', calculatePrediction);
    });
}

// 3. CSV File Loader Logic
function initCSVLoader() {
    const badge = document.getElementById('data-status-badge');
    const text = document.getElementById('data-status-text');
    const syncBtn = document.getElementById('btn-sync-data');
    const fileInput = document.getElementById('csv-file-input');
    const uploadLabel = document.getElementById('btn-upload-label');

    const handleDataLoadSuccess = (parsedData) => {
        state.dataset = parsedData;
        state.filteredDataset = [...parsedData];
        state.isLoaded = true;
        
        // Update header badge status
        badge.className = 'status-indicator success';
        text.textContent = 'Dataset Loaded';
        uploadLabel.style.display = 'none';

        // Calculate KPIs and Render everything
        calculateKPIs();
        renderCharts();
        renderTable();
        calculatePrediction();
    };

    const handleLoadError = (err) => {
        console.warn("Unable to fetch CSV file automatically. Switching to manual upload fallback.", err);
        badge.className = 'status-indicator warning';
        text.textContent = 'Open local CSV';
        uploadLabel.style.display = 'inline-flex';
        
        // Load fallback data stats so UI looks populated instantly
        loadFallbackAnalytics();
        calculatePrediction(); // Prediction works offline/instantly anyway
    };

    // Try to load automatically
    fetch('loan_approval_data.csv')
        .then(response => {
            if (!response.ok) throw new Error("File not found");
            return response.text();
        })
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        handleDataLoadSuccess(results.data);
                    } else {
                        handleLoadError("Empty dataset parsed");
                    }
                },
                error: (err) => handleLoadError(err)
            });
        })
        .catch(err => handleLoadError(err));

    // Listen to manual file upload
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        badge.className = 'status-indicator loading';
        text.textContent = 'Parsing file...';

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    handleDataLoadSuccess(results.data);
                } else {
                    alert("Error: Empty file or invalid format");
                    badge.className = 'status-indicator warning';
                    text.textContent = 'Invalid CSV';
                }
            },
            error: (err) => {
                alert("Error parsing CSV: " + err.message);
                badge.className = 'status-indicator warning';
                text.textContent = 'Error parsing';
            }
        });
    });

    // Re-sync event handler
    syncBtn.addEventListener('click', () => {
        location.reload();
    });
}

// 4. Calculate KPIs from Dataset
function calculateKPIs() {
    const data = state.dataset;
    const total = data.length;

    // Filter out rows with nulls for averages
    const validIncomes = data.filter(d => d.Applicant_Income !== null).map(d => d.Applicant_Income);
    const validCredits = data.filter(d => d.Credit_Score !== null).map(d => d.Credit_Score);
    const approvedCount = data.filter(d => d.Loan_Approved === 'Yes').length;

    const avgIncome = validIncomes.reduce((a, b) => a + b, 0) / validIncomes.length;
    const avgCredit = validCredits.reduce((a, b) => a + b, 0) / validCredits.length;
    const approvalRate = (approvedCount / total) * 100;

    // Update KPI UI
    document.getElementById('kpi-total').textContent = total.toLocaleString();
    document.getElementById('kpi-rate').textContent = `${approvalRate.toFixed(1)}%`;
    document.getElementById('kpi-income').textContent = `$${Math.round(avgIncome).toLocaleString()}`;
    document.getElementById('kpi-credit').textContent = Math.round(avgCredit);

    document.getElementById('kpi-rate-sub').innerHTML = `<i class="fa-solid fa-check-circle"></i> ${approvedCount} Approved applications`;
}

// 5. Load Fallback Analytics
function loadFallbackAnalytics() {
    document.getElementById('kpi-total').textContent = FALLBACK_STATS.total.toLocaleString();
    document.getElementById('kpi-rate').textContent = `${FALLBACK_STATS.approvalRate}%`;
    document.getElementById('kpi-income').textContent = `$${FALLBACK_STATS.avgIncome.toLocaleString()}`;
    document.getElementById('kpi-credit').textContent = FALLBACK_STATS.avgCredit;
    document.getElementById('kpi-rate-sub').innerHTML = `<i class="fa-solid fa-check-circle"></i> ${FALLBACK_STATS.approvedCount} Approved applications`;

    renderFallbackCharts();
    renderFallbackTable();
}

// 6. Chart.js Renderings (Dynamic based on loaded dataset)
function renderCharts() {
    const data = state.dataset;
    if (!data.length) return;

    // Destroy existing charts to prevent memory leaks or overlapping
    Object.keys(state.charts).forEach(key => {
        if (state.charts[key] && key !== 'modelComparison') state.charts[key].destroy();
    });

    const colors = getThemeColors();

    // Chart Options Base
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: colors.text,
                    font: { family: 'Outfit', size: 11 }
                }
            }
        },
        scales: {
            x: {
                grid: { color: colors.grid },
                ticks: { color: colors.text, font: { family: 'Inter', size: 10 } }
            },
            y: {
                grid: { color: colors.grid },
                ticks: { color: colors.text, font: { family: 'Inter', size: 10 } }
            }
        }
    };

    // Chart 1: Approval Rate Pie Split
    const yesCount = data.filter(d => d.Loan_Approved === 'Yes').length;
    const noCount = data.length - yesCount;

    const ctxPie = document.getElementById('chart-approval-pie').getContext('2d');
    state.charts.approvalPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Rejected (No)', 'Approved (Yes)'],
            datasets: [{
                data: [noCount, yesCount],
                backgroundColor: ['rgba(244, 63, 94, 0.75)', 'rgba(16, 185, 129, 0.75)'],
                borderColor: ['#f43f5e', '#10b981'],
                borderWidth: 1.5,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colors.text, font: { family: 'Outfit', size: 11 } }
                }
            },
            cutout: '65%'
        }
    });

    // Chart 2: Credit Score Brackets
    // Brackets: <600, 600-649, 650-699, 700-749, 750+
    const brackets = [
        { label: '< 600', min: 0, max: 599, total: 0, approved: 0 },
        { label: '600-649', min: 600, max: 649, total: 0, approved: 0 },
        { label: '650-699', min: 650, max: 699, total: 0, approved: 0 },
        { label: '700-749', min: 700, max: 749, total: 0, approved: 0 },
        { label: '750+', min: 750, max: 900, total: 0, approved: 0 }
    ];

    data.forEach(d => {
        const score = d.Credit_Score;
        if (score === null || score === undefined) return;
        const b = brackets.find(br => score >= br.min && score <= br.max);
        if (b) {
            b.total++;
            if (d.Loan_Approved === 'Yes') b.approved++;
        }
    });

    const creditLabels = brackets.map(b => b.label);
    const creditRates = brackets.map(b => b.total > 0 ? (b.approved / b.total) * 100 : 0);

    const ctxCredit = document.getElementById('chart-credit-score').getContext('2d');
    state.charts.creditChart = new Chart(ctxCredit, {
        type: 'bar',
        data: {
            labels: creditLabels,
            datasets: [{
                label: 'Approval Rate (%)',
                data: creditRates,
                backgroundColor: colors.primaryGlow,
                borderColor: colors.primary,
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    max: 100,
                    ticks: {
                        callback: value => value + '%',
                        color: colors.text
                    }
                }
            }
        }
    });

    // Chart 3: Loan Purpose Breakdown
    const purposes = {};
    data.forEach(d => {
        const purp = d.Loan_Purpose || 'Unknown';
        purposes[purp] = (purposes[purp] || 0) + 1;
    });

    const purposeLabels = Object.keys(purposes);
    const purposeCounts = Object.values(purposes);

    const ctxPurpose = document.getElementById('chart-purpose').getContext('2d');
    state.charts.purposeChart = new Chart(ctxPurpose, {
        type: 'bar',
        data: {
            labels: purposeLabels,
            datasets: [{
                label: 'Applications',
                data: purposeCounts,
                backgroundColor: 'rgba(14, 165, 233, 0.45)',
                borderColor: '#0ea5e9',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            ...chartDefaults,
            indexAxis: 'y'
        }
    });

    // Chart 4: DTI Ratio vs Approval Curve
    // We group DTI into bins of 0.05
    const dtiBins = [];
    for (let i = 0; i <= 0.95; i += 0.05) {
        dtiBins.push({ label: `${i.toFixed(2)}-${(i + 0.05).toFixed(2)}`, min: i, max: i + 0.05, total: 0, approved: 0 });
    }

    data.forEach(d => {
        const dti = d.DTI_Ratio;
        if (dti === null || dti === undefined) return;
        const b = dtiBins.find(bin => dti >= bin.min && dti < bin.max);
        if (b) {
            b.total++;
            if (d.Loan_Approved === 'Yes') b.approved++;
        }
    });

    // Filter bins that have enough records to avoid noise
    const filteredBins = dtiBins.filter(b => b.total >= 5);
    const dtiLabels = filteredBins.map(b => b.label);
    const dtiRates = filteredBins.map(b => (b.approved / b.total) * 100);

    const ctxDti = document.getElementById('chart-dti-curve').getContext('2d');
    state.charts.dtiChart = new Chart(ctxDti, {
        type: 'line',
        data: {
            labels: dtiLabels,
            datasets: [{
                label: 'Approval Rate (%)',
                data: dtiRates,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: '#10b981',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                ...chartDefaults.scales,
                y: {
                    ...chartDefaults.scales.y,
                    max: 100,
                    ticks: {
                        callback: value => value + '%',
                        color: colors.text
                    }
                }
            }
        }
    });
}

// 7. Render Fallback Charts (Hardcoded counts based on 1000 dataset statistics)
function renderFallbackCharts() {
    // Exact statistics derived from dataset
    const noCount = 702;
    const yesCount = 298;

    const colors = getThemeColors();

    const ctxPie = document.getElementById('chart-approval-pie').getContext('2d');
    state.charts.approvalPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Rejected (No)', 'Approved (Yes)'],
            datasets: [{
                data: [noCount, yesCount],
                backgroundColor: ['rgba(244, 63, 94, 0.75)', 'rgba(16, 185, 129, 0.75)'],
                borderColor: ['#f43f5e', '#10b981'],
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: colors.text } } },
            cutout: '65%'
        }
    });

    const ctxCredit = document.getElementById('chart-credit-score').getContext('2d');
    state.charts.creditChart = new Chart(ctxCredit, {
        type: 'bar',
        data: {
            labels: ['< 600', '600-649', '650-699', '700-749', '750+'],
            datasets: [{
                label: 'Approval Rate (%)',
                data: [5.2, 14.5, 31.8, 55.4, 82.1], // accurate mock rate distribution
                backgroundColor: colors.primaryGlow,
                borderColor: colors.primary,
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text }, max: 100 }
            }
        }
    });

    const ctxPurpose = document.getElementById('chart-purpose').getContext('2d');
    state.charts.purposeChart = new Chart(ctxPurpose, {
        type: 'bar',
        data: {
            labels: ['Personal', 'Car', 'Business', 'Home', 'Education'],
            datasets: [{
                label: 'Applications',
                data: [215, 189, 210, 192, 194],
                backgroundColor: 'rgba(14, 165, 233, 0.45)',
                borderColor: '#0ea5e9',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text } }
            }
        }
    });

    const ctxDti = document.getElementById('chart-dti-curve').getContext('2d');
    state.charts.dtiChart = new Chart(ctxDti, {
        type: 'line',
        data: {
            labels: ['0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', '0.5-0.6', '0.6-0.7', '0.7-0.8'],
            datasets: [{
                label: 'Approval Rate (%)',
                data: [68.2, 54.1, 41.5, 30.2, 18.5, 8.4, 2.1, 0.5],
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: '#10b981',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text }, max: 100 }
            }
        }
    });
}

// 8. Render Feature Importance Chart (Model Insights Tab)
function renderFeatureImportanceChart() {
    if (state.charts.importanceChart) state.charts.importanceChart.destroy();

    const colors = getThemeColors();

    // Select the top key weights to show in the UI to keep it readable
    const allFeatures = MODEL_PARAMS.features;
    const allWeights = MODEL_PARAMS.model.coef;

    // Zip and sort by absolute weight value
    const featureWeights = allFeatures.map((name, index) => ({
        name: name
            .replace('Employment_Status_', 'Job: ')
            .replace('Marital_Status_', 'Marital: ')
            .replace('Loan_Purpose_', 'Purpose: ')
            .replace('Property_Area_', 'Area: ')
            .replace('Employer_Category_', 'Employer: ')
            .replace('_sq', '²')
            .replace('_log', ' (Log)')
            .replace('Applicant_Income', 'Income')
            .replace('Coapplicant_Income', 'Coapplicant Income'),
        weight: allWeights[index]
    }));

    // Sort features by weight size
    featureWeights.sort((a, b) => b.weight - a.weight);

    const labels = featureWeights.map(fw => fw.name);
    const weights = featureWeights.map(fw => fw.weight);
    
    // Color bars based on positive or negative weights
    const colorsList = weights.map(w => w >= 0 ? 'rgba(16, 185, 129, 0.55)' : 'rgba(244, 63, 94, 0.55)');
    const borderColors = weights.map(w => w >= 0 ? '#10b981' : '#f43f5e');

    const ctx = document.getElementById('chart-feature-importance').getContext('2d');
    state.charts.importanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Standardized Coefficient Weight',
                data: weights,
                backgroundColor: colorsList,
                borderColor: borderColors,
                borderWidth: 1.2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: colors.grid },
                    ticks: { color: colors.text }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: colors.heading, font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
}

// 9. Predict Loan Approval (Core ML Inference in JavaScript)
function calculatePrediction() {
    // Collect raw values from fields
    const applicantIncome = parseFloat(document.getElementById('input-applicant-income').value);
    const coapplicantIncome = parseFloat(document.getElementById('input-coapplicant-income').value);
    const age = parseFloat(document.getElementById('input-age').value);
    const dependents = parseFloat(document.getElementById('input-dependents').value);
    const existingLoans = parseFloat(document.getElementById('input-existing-loans').value);
    const savings = parseFloat(document.getElementById('input-savings').value);
    const collateralValue = parseFloat(document.getElementById('input-collateral-value').value);
    const loanAmount = parseFloat(document.getElementById('input-loan-amount').value);
    const loanTerm = parseFloat(document.getElementById('select-loan-term').value);
    
    const dtiRatio = parseFloat(document.getElementById('input-dti-ratio').value);
    const creditScore = parseFloat(document.getElementById('input-credit-score').value);

    // Education Level: Label Encoded (Graduate -> 0, Not Graduate -> 1)
    const eduLevel = document.getElementById('select-education-level').value;
    const eduEncoded = eduLevel === 'Graduate' ? 0 : 1;

    // Categories for One-Hot Encoding
    const empStatus = document.getElementById('select-employment-status').value;
    const maritalStatus = document.getElementById('select-marital-status').value;
    const loanPurpose = document.getElementById('select-loan-purpose').value;
    const propArea = document.getElementById('select-property-area').value;
    const gender = document.getElementById('select-gender').value;
    const empCat = document.getElementById('select-employer-category').value;

    // Build the One-Hot Encoded features vector
    // Drop first categorical rule matching the categories returned by OneHotEncoder(drop='first')
    const ohe = {
        'Employment_Status_Salaried': empStatus === 'Salaried' ? 1 : 0,
        'Employment_Status_Self-employed': empStatus === 'Self-employed' ? 1 : 0,
        'Employment_Status_Unemployed': empStatus === 'Unemployed' ? 1 : 0,
        
        'Marital_Status_Single': maritalStatus === 'Single' ? 1 : 0,
        
        'Loan_Purpose_Car': loanPurpose === 'Car' ? 1 : 0,
        'Loan_Purpose_Education': loanPurpose === 'Education' ? 1 : 0,
        'Loan_Purpose_Home': loanPurpose === 'Home' ? 1 : 0,
        'Loan_Purpose_Personal': loanPurpose === 'Personal' ? 1 : 0,
        
        'Property_Area_Semiurban': propArea === 'Semiurban' ? 1 : 0,
        'Property_Area_Urban': propArea === 'Urban' ? 1 : 0,
        
        'Gender_Male': gender === 'Male' ? 1 : 0,
        
        'Employer_Category_Government': empCat === 'Government' ? 1 : 0,
        'Employer_Category_MNC': empCat === 'MNC' ? 1 : 0,
        'Employer_Category_Private': empCat === 'Private' ? 1 : 0,
        'Employer_Category_Unemployed': empCat === 'Unemployed' ? 1 : 0
    };

    // Derived Engineered Features
    const dtiRatioSq = dtiRatio ** 2;
    const creditScoreSq = creditScore ** 2;
    const applicantIncomeLog = Math.log1p(applicantIncome); // ln(x + 1)

    // Construct raw features vector in the exact training model column order
    const rawFeatures = {
        'Applicant_Income': applicantIncome,
        'Coapplicant_Income': coapplicantIncome,
        'Age': age,
        'Dependents': dependents,
        'Existing_Loans': existingLoans,
        'Savings': savings,
        'Collateral_Value': collateralValue,
        'Loan_Amount': loanAmount,
        'Loan_Term': loanTerm,
        'Education_Level': eduEncoded,
        ...ohe,
        'DTI_Ratio_sq': dtiRatioSq,
        'Credit_Score_sq': creditScoreSq,
        'Applicant_Income_log': applicantIncomeLog
    };

    // Calculate decision drivers (feature contributions)
    const contributions = [];
    let logOdds = MODEL_PARAMS.model.intercept;

    MODEL_PARAMS.features.forEach((featureName, idx) => {
        const rawVal = rawFeatures[featureName];
        const mean = MODEL_PARAMS.scaler.mean[idx];
        const std = MODEL_PARAMS.scaler.std[idx];
        
        // Scale standardly
        const scaledVal = (rawVal - mean) / std;
        const weight = MODEL_PARAMS.model.coef[idx];
        const contrib = scaledVal * weight;
        
        logOdds += contrib;

        contributions.push({
            name: featureName,
            rawValue: rawVal,
            scaledValue: scaledVal,
            weight: weight,
            contrib: contrib
        });
    });

    // Probability using sigmoid activation function
    const probability = 1 / (1 + Math.exp(-logOdds));

    // Update Predictor UI displays
    updatePredictorUI(probability, contributions);
}

// 10. Update Predictor UI Gauge & Results
function updatePredictorUI(probability, contributions) {
    const isApproved = probability >= 0.5;
    
    // Percentage text
    const probText = document.getElementById('txt-probability-percentage');
    probText.textContent = `${(probability * 100).toFixed(1)}%`;
    probText.className = isApproved ? 'probability-val text-success' : 'probability-val text-danger';

    // SVG Gauge Dashoffset calculations
    // Track length = 188.5
    const gaugeFill = document.getElementById('gauge-fill');
    const offset = 188.5 - (probability * 188.5);
    gaugeFill.style.strokeDashoffset = offset;
    gaugeFill.classList.remove('approved', 'rejected');
    gaugeFill.classList.add(isApproved ? 'approved' : 'rejected');

    // Decision Card Verdict
    const badge = document.getElementById('decision-badge');
    const statusText = document.getElementById('decision-status');
    const descText = document.getElementById('decision-desc');

    if (isApproved) {
        badge.className = 'badge-card approved';
        statusText.textContent = 'ELIGIBLE / APPROVED';
        descText.textContent = 'Based on the features provided, the Logistic Regression model predicts low credit default risk. Recommendation: APPROVE.';
    } else {
        badge.className = 'badge-card rejected';
        statusText.textContent = 'REJECTED / INELIGIBLE';
        descText.textContent = 'The model predicts high risk of credit default. Please see the primary decision drivers below for details.';
    }

    // Sort contributions by absolute size to extract primary drivers
    const sortedDrivers = [...contributions].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
    
    const driversList = document.getElementById('list-decision-factors');
    driversList.innerHTML = '';

    // Create user-friendly descriptions for top drivers
    const driverNames = {
        'Credit_Score_sq': 'Credit Score rating',
        'DTI_Ratio_sq': 'Debt-to-Income (DTI) ratio',
        'Applicant_Income_log': 'Applicant Income bracket',
        'Applicant_Income': 'Raw Monthly Income',
        'Savings': 'Savings Account reserves',
        'Loan_Amount': 'Requested Loan amount',
        'Employer_Category_Private': 'Private sector employer',
        'Employment_Status_Salaried': 'Salaried job type',
        'Employment_Status_Unemployed': 'Unemployed status',
        'Loan_Term': 'Loan amortization term',
        'Education_Level': 'Level of Education',
        'Coapplicant_Income': 'Coapplicant income support',
        'Gender_Male': 'Demographic profile (Gender)',
        'Employer_Category_MNC': 'MNC employment stability',
        'Property_Area_Urban': 'Urban property collateral valuation'
    };

    // Render top 4 drivers
    sortedDrivers.slice(0, 4).forEach(d => {
        const readableName = driverNames[d.name] || d.name;
        const positiveImpact = d.contrib >= 0;
        const iconClass = positiveImpact ? 'success' : 'danger';
        const iconEl = positiveImpact ? '<i class="fa-solid fa-arrow-trend-up"></i>' : '<i class="fa-solid fa-arrow-trend-down"></i>';
        
        let driverDetail = '';
        if (d.name === 'Credit_Score_sq') {
            const scoreVal = Math.round(Math.sqrt(d.rawValue));
            driverDetail = positiveImpact 
                ? `High score of ${scoreVal} supports application (+${d.contrib.toFixed(2)} score weight)` 
                : `Low score of ${scoreVal} indicates subprime default risk (-${Math.abs(d.contrib).toFixed(2)} score weight)`;
        } else if (d.name === 'DTI_Ratio_sq') {
            const dtiVal = Math.sqrt(d.rawValue).toFixed(2);
            driverDetail = positiveImpact 
                ? `Extremely low DTI ratio of ${dtiVal} decreases risk exposure` 
                : `High DTI ratio of ${dtiVal} indicates high debt burden (-${Math.abs(d.contrib).toFixed(2)} score weight)`;
        } else if (d.name === 'Applicant_Income_log' || d.name === 'Applicant_Income') {
            driverDetail = positiveImpact
                ? `Healthy monthly income supports repayment capability`
                : `Insufficient income base limits eligibility cushion`;
        } else if (d.name === 'Savings') {
            driverDetail = positiveImpact
                ? `Reserves of $${Math.round(d.rawValue).toLocaleString()} act as a reliable cash cushion`
                : `Low savings of $${Math.round(d.rawValue).toLocaleString()} increases financial vulnerability`;
        } else if (d.name === 'Loan_Amount') {
            driverDetail = positiveImpact
                ? `Conservative loan request of $${Math.round(d.rawValue).toLocaleString()} reduces risk`
                : `Elevated loan amount of $${Math.round(d.rawValue).toLocaleString()} adds risk leverage`;
        } else {
            // General categorical/demographic descriptions
            driverDetail = positiveImpact
                ? `${readableName} contributes positively to approval odds`
                : `${readableName} adds weight to rejection probability`;
        }

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="factor-icon ${iconClass}">${iconEl}</div>
            <div class="factor-text"><strong>${readableName}:</strong> ${driverDetail}</div>
        `;
        driversList.appendChild(li);
    });
}

// 11. Listeners for real-time recalculation of numbers/inputs
function setupPredictionListeners() {
    // Setup form submit blocker
    document.getElementById('predictor-form').addEventListener('submit', (e) => e.preventDefault());
}

// 12. Data Explorer Grid Rendering
function renderTable() {
    const searchVal = document.getElementById('table-search').value.toLowerCase();
    const purposeVal = document.getElementById('filter-purpose').value;
    const employmentVal = document.getElementById('filter-employment').value;
    const approvedVal = document.getElementById('filter-approved').value;

    // Apply filters
    state.filteredDataset = state.dataset.filter(d => {
        // Search filter
        const matchesSearch = !searchVal || 
            (d.Applicant_ID && d.Applicant_ID.toString().includes(searchVal)) ||
            (d.Applicant_Income && d.Applicant_Income.toString().includes(searchVal)) ||
            (d.Credit_Score && d.Credit_Score.toString().includes(searchVal));
        
        // Dropdowns filters
        const matchesPurpose = !purposeVal || d.Loan_Purpose === purposeVal;
        const matchesEmployment = !employmentVal || d.Employment_Status === employmentVal;
        const matchesApproved = !approvedVal || d.Loan_Approved === approvedVal;

        return matchesSearch && matchesPurpose && matchesEmployment && matchesApproved;
    });

    state.currentPage = 1;
    displayTablePage();
    setupTableControls();
}

function displayTablePage() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (state.filteredDataset.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-5">
                    <i class="fa-solid fa-magnifying-glass-minus fa-2x mb-3"></i>
                    <p>No matching loan applications found.</p>
                </td>
            </tr>
        `;
        document.getElementById('pagination-text').textContent = 'Showing 0 records';
        return;
    }

    const startIdx = (state.currentPage - 1) * state.recordsPerPage;
    const endIdx = Math.min(startIdx + state.recordsPerPage, state.filteredDataset.length);
    const pageRecords = state.filteredDataset.slice(startIdx, endIdx);

    pageRecords.forEach(d => {
        const tr = document.createElement('tr');
        const statusClass = d.Loan_Approved === 'Yes' ? 'approved' : 'rejected';
        
        tr.innerHTML = `
            <td><strong>#${d.Applicant_ID ? Math.round(d.Applicant_ID) : 'N/A'}</strong></td>
            <td>${d.Age ? Math.round(d.Age) : 'N/A'} yrs</td>
            <td>${d.Gender || 'N/A'}</td>
            <td>$${d.Applicant_Income ? Math.round(d.Applicant_Income).toLocaleString() : '0'}</td>
            <td><span class="font-semibold">${d.Credit_Score ? Math.round(d.Credit_Score) : 'N/A'}</span></td>
            <td>${d.DTI_Ratio ? d.DTI_Ratio.toFixed(2) : '0.00'}</td>
            <td>$${d.Collateral_Value ? Math.round(d.Collateral_Value).toLocaleString() : '0'}</td>
            <td>$${d.Loan_Amount ? Math.round(d.Loan_Amount).toLocaleString() : '0'}</td>
            <td>${d.Loan_Purpose || 'N/A'}</td>
            <td><span class="status-pill ${statusClass}">${d.Loan_Approved === 'Yes' ? 'Approved' : 'Rejected'}</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Update footer text
    document.getElementById('pagination-text').textContent = 
        `Showing ${startIdx + 1}-${endIdx} of ${state.filteredDataset.length.toLocaleString()} records`;

    // Disable/enable prev/next buttons
    document.getElementById('btn-prev-page').disabled = state.currentPage === 1;
    const totalPages = Math.ceil(state.filteredDataset.length / state.recordsPerPage);
    document.getElementById('btn-next-page').disabled = state.currentPage === totalPages || totalPages === 0;

    // Render Page Numbers list
    const pageNumContainer = document.getElementById('page-numbers-container');
    pageNumContainer.innerHTML = '';
    
    let startPage = Math.max(1, state.currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    if (endPage - startPage < 2 && startPage > 1) {
        startPage = Math.max(1, endPage - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageSpan = document.createElement('span');
        pageSpan.className = `page-num ${i === state.currentPage ? 'active' : ''}`;
        pageSpan.textContent = i;
        pageSpan.addEventListener('click', () => {
            state.currentPage = i;
            displayTablePage();
        });
        pageNumContainer.appendChild(pageSpan);
    }
}

function setupTableControls() {
    // Prev / Next Page Buttons
    document.getElementById('btn-prev-page').onclick = () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            displayTablePage();
        }
    };

    document.getElementById('btn-next-page').onclick = () => {
        const totalPages = Math.ceil(state.filteredDataset.length / state.recordsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            displayTablePage();
        }
    };

    // Filter changes listeners
    document.getElementById('table-search').oninput = renderTable;
    document.getElementById('filter-purpose').onchange = renderTable;
    document.getElementById('filter-employment').onchange = renderTable;
    document.getElementById('filter-approved').onchange = renderTable;

    // Reset button
    document.getElementById('btn-clear-filters').onclick = () => {
        document.getElementById('table-search').value = '';
        document.getElementById('filter-purpose').value = '';
        document.getElementById('filter-employment').value = '';
        document.getElementById('filter-approved').value = '';
        renderTable();
    };
}

// 13. Hardcoded Fallback Record Explorer rendering (if CSV fetch blocked)
function renderFallbackTable() {
    // Generate dummy applications based on actual dataset parameters for offline demonstration
    const fallbackList = [];
    const purposesList = ['Business', 'Car', 'Home', 'Education', 'Personal'];
    const gendersList = ['Male', 'Female'];
    const employmentList = ['Salaried', 'Self-employed', 'Contract', 'Unemployed'];
    
    for (let i = 1; i <= 200; i++) {
        const id = i;
        const age = Math.round(21 + Math.random() * 38);
        const gender = gendersList[Math.floor(Math.random() * 2)];
        const income = Math.round(2500 + Math.random() * 17000);
        const credit = Math.round(550 + Math.random() * 250);
        const dti = 0.1 + Math.random() * 0.5;
        const collateral = Math.round(1000 + Math.random() * 48000);
        const loan = Math.round(2000 + Math.random() * 38000);
        const purpose = purposesList[Math.floor(Math.random() * 5)];
        const employment = employmentList[Math.floor(Math.random() * 4)];
        
        // Rough heuristic for approvals
        const isApproved = (credit > 660 && dti < 0.45 && income > 6000) ? 'Yes' : 'No';

        fallbackList.push({
            Applicant_ID: id,
            Age: age,
            Gender: gender,
            Applicant_Income: income,
            Credit_Score: credit,
            DTI_Ratio: dti,
            Collateral_Value: collateral,
            Loan_Amount: loan,
            Loan_Purpose: purpose,
            Employment_Status: employment,
            Loan_Approved: isApproved
        });
    }

    state.dataset = fallbackList;
    state.filteredDataset = [...fallbackList];
    state.isLoaded = true;

    renderTable();
}

// 14. Initialize Modal Events (About Project & Model Comparison)
function initModalEvents() {
    // 1. Model Comparison Modal
    const compareModal = document.getElementById('modal-model-comparison');
    const openCompareBtn = document.getElementById('btn-compare-models');
    const closeCompareBtn = document.getElementById('btn-close-modal');

    if (openCompareBtn && compareModal) {
        openCompareBtn.addEventListener('click', () => {
            compareModal.classList.add('active');
            setTimeout(initModelComparisonChart, 50);
        });
    }

    if (closeCompareBtn && compareModal) {
        closeCompareBtn.addEventListener('click', () => {
            compareModal.classList.remove('active');
        });
    }

    if (compareModal) {
        compareModal.addEventListener('click', (e) => {
            if (e.target === compareModal) {
                compareModal.classList.remove('active');
            }
        });
    }

    // 2. About Project Modal
    const aboutModal = document.getElementById('modal-about-project');
    const openAboutBtn = document.getElementById('btn-about-project');
    const closeAboutBtn = document.getElementById('btn-close-about');

    if (openAboutBtn && aboutModal) {
        openAboutBtn.addEventListener('click', () => {
            aboutModal.classList.add('active');
            // Re-render LaTeX math equations if MathJax is initialized
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise();
            }
        });
    }

    if (closeAboutBtn && aboutModal) {
        closeAboutBtn.addEventListener('click', () => {
            aboutModal.classList.remove('active');
        });
    }

    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.remove('active');
            }
        });
    }
}

// 15. Render Model Comparison Grouped Bar Chart
function initModelComparisonChart() {
    if (state.charts.modelComparison) state.charts.modelComparison.destroy();
    
    const colors = getThemeColors();

    const ctx = document.getElementById('chart-model-comparison').getContext('2d');
    state.charts.modelComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
            datasets: [
                {
                    label: 'Logistic Regression',
                    data: [88.0, 78.5, 83.6, 81.0],
                    backgroundColor: colors.primaryGlow,
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Gaussian Naive Bayes',
                    data: [86.0, 81.1, 70.5, 75.4],
                    backgroundColor: 'rgba(14, 165, 233, 0.75)',
                    borderColor: '#0ea5e9',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'K-Nearest Neighbors (KNN)',
                    data: [78.5, 67.3, 57.4, 61.9],
                    backgroundColor: 'rgba(244, 63, 94, 0.75)',
                    borderColor: '#f43f5e',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: colors.text, font: { family: 'Outfit', size: 11 } }
                }
            },
            scales: {
                x: {
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    grid: { color: colors.grid },
                    ticks: { color: colors.text, font: { family: 'Inter', size: 11 } },
                    max: 100
                }
            }
        }
    });
}

// 16. Theme Toggle Helpers
function getThemeColors() {
    const isLight = document.body.classList.contains('light-theme');
    return {
        text: isLight ? '#475569' : '#94a3b8',
        grid: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)',
        heading: isLight ? '#0f172a' : '#f8fafc',
        primary: isLight ? '#4f46e5' : '#6366f1',
        primaryGlow: isLight ? 'rgba(79, 70, 229, 0.15)' : 'rgba(99, 102, 241, 0.25)'
    };
}

function initThemeToggle() {
    const toggleBtn = document.getElementById('btn-theme-toggle');
    const icon = document.getElementById('theme-toggle-icon');

    // Check localStorage for saved theme preference
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        if (icon) {
            icon.className = 'fa-solid fa-moon';
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            const theme = isLight ? 'light' : 'dark';
            localStorage.setItem('theme', theme);

            if (icon) {
                icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            }

            // Update charts dynamically with the new theme colors
            updateChartColors(isLight);
        });
    }
}

function updateChartColors(isLight) {
    // Re-render open/rendered charts based on current tab
    const activeTabItem = document.querySelector('.nav-item.active');
    if (activeTabItem && state.isLoaded) {
        const tabId = activeTabItem.getAttribute('data-tab');
        if (tabId === 'overview') {
            renderCharts();
        } else if (tabId === 'model-info') {
            renderFeatureImportanceChart();
        }
    }
    
    // Also update modal chart if active
    const modal = document.getElementById('modal-model-comparison');
    if (modal && modal.classList.contains('active')) {
        initModelComparisonChart();
    }
}

// 17. Register Service Worker for PWA (Progressive Web App) Installability & Offline Cache
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('LendOptima AI Service Worker registered successfully with scope:', reg.scope);
            })
            .catch(err => {
                console.error('LendOptima AI Service Worker registration failed:', err);
            });
    });
}

