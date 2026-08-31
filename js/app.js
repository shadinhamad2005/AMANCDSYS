// ==============================================================
// MAIN APPLICATION CONTROLLER & PORTAL ROUTER
// ==============================================================

(function() {
    // --------------------------------------------------------------
    // GLOBAL STATE VARIABLES
    // --------------------------------------------------------------
    window.amanCerts = window.amanCerts || [];
    window.cdCerts = window.cdCerts || [];
    window.historyData = window.historyData || {};
    window.projectsList = window.projectsList || new Set(['Main Project']);
    window.currentProject = window.currentProject || 'Main Project';
    window.currentView = window.currentView || 'Portal-Hub';
    window.estblViewMode = window.estblViewMode || 'grid';
    window.cdViewMode = window.cdViewMode || 'grid';
    window.currentLanguage = window.currentLanguage || 'ENGLISH';

    // --------------------------------------------------------------
    // GLOBAL UTILITY HELPERS
    // --------------------------------------------------------------
    window.getValidityStatus = (expiryDate) => {
        if (!expiryDate) return { text: 'Due / Expired', color: 'red', bg: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' };
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        const thirtyDays = new Date(now);
        thirtyDays.setDate(now.getDate() + 30);

        if (expiry < now) return { text: 'Due / Expired', color: 'red', bg: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' };
        if (expiry <= thirtyDays) return { text: 'Near Expiry', color: 'yellow', bg: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' };
        return { text: 'Valid', color: 'green', bg: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' };
    };

    window.formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date)) return '-';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    window.parseDateBadge = (dateString) => {
        if (!dateString) return { month: '-', year: '', day: '-' };
        const date = new Date(dateString);
        if (isNaN(date)) return { month: '-', year: '', day: '-' };
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return {
            month: months[date.getMonth()],
            year: date.getFullYear(),
            day: String(date.getDate()).padStart(2, '0')
        };
    };

    window.getWorkflowBadge = (status) => {
        switch (status) {
            case 'Certificate ready':
                return { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' };
            case 'Inspection Date':
                return { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800' };
            case 'Awaiting inspection':
                return { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' };
            case 'AMC ready':
                return { bg: 'bg-sky-100 dark:bg-sky-950/60', text: 'text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800' };
            case 'Informed Fire team':
                return { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800' };
            case 'Pending Renewal':
            case 'Renewal Pending':
            default:
                return { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' };
        }
    };

    // --------------------------------------------------------------
    // MODAL SYSTEM
    // --------------------------------------------------------------
    let isModalFullscreen = false;

    window.showModal = (title, content, onOpen = null) => {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        
        isModalFullscreen = false;
        modalContainer.innerHTML = `
            <div id="modal-wrapper" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-150">
                <div class="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
                    <h3 class="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>${title}</span>
                    </h3>
                    <div class="flex items-center gap-1.5">
                        <button id="modal-fullscreen-btn" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-lg transition" title="Toggle Fullscreen Mode">
                            <svg id="modal-fullscreen-icon" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                        </button>
                        <button id="modal-close-btn" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-lg font-bold leading-none">&times;</button>
                    </div>
                </div>
                <div class="p-6 overflow-y-auto flex-1">${content}</div>
            </div>`;
        modalContainer.classList.remove('hidden');
        
        const modalWrapper = document.getElementById('modal-wrapper');
        const fsBtn = document.getElementById('modal-fullscreen-btn');
        
        if (fsBtn && modalWrapper) {
            fsBtn.addEventListener('click', () => {
                isModalFullscreen = !isModalFullscreen;
                if (isModalFullscreen) {
                    modalWrapper.className = 'bg-white dark:bg-slate-800 fixed inset-0 w-full h-full max-w-none max-h-none rounded-none shadow-none flex flex-col z-50';
                    fsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
                    fsBtn.title = "Restore Normal Window";
                } else {
                    modalWrapper.className = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-150';
                    fsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
                    fsBtn.title = "Expand to Fullscreen";
                }
            });
        }

        document.getElementById('modal-close-btn')?.addEventListener('click', window.hideModal);
        if (onOpen) onOpen();
    };

    window.hideModal = () => {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = '';
            modalContainer.classList.add('hidden');
        }
    };

    // --------------------------------------------------------------
    // NAVIGATION & VIEW ROUTING
    // --------------------------------------------------------------
    function switchView(viewName) {
        window.currentView = viewName;
        const headerTitle = document.getElementById('portal-header-title');
        if (headerTitle) {
            headerTitle.textContent = viewName === 'Portal-Hub' ? 'System Portal Selection' : viewName.replace('-', ' ');
        }

        const amanGroup = document.getElementById('sidebar-aman-group');
        const cdGroup = document.getElementById('sidebar-cd-group');

        if (viewName === 'Dashboard' || viewName === 'Establishments' || viewName === 'Alerts') {
            window.activePortal = 'AMAN';
            if (amanGroup) amanGroup.classList.remove('hidden');
            if (cdGroup) cdGroup.classList.add('hidden');
        } else if (viewName === 'Civil-Defence') {
            window.activePortal = 'CD';
            if (cdGroup) cdGroup.classList.remove('hidden');
            if (amanGroup) amanGroup.classList.add('hidden');
        } else if (viewName === 'Portal-Hub') {
            window.activePortal = 'HUB';
            if (amanGroup) amanGroup.classList.add('hidden');
            if (cdGroup) cdGroup.classList.add('hidden');
        }

        document.querySelectorAll('.portal-nav-btn').forEach(b => {
            if (b.dataset.navTarget === viewName) {
                b.classList.add('bg-sky-50', 'dark:bg-sky-900/40', 'text-sky-700', 'dark:text-sky-300');
                b.classList.remove('text-slate-600', 'dark:text-slate-300');
            } else {
                b.classList.remove('bg-sky-50', 'dark:bg-sky-900/40', 'text-sky-700', 'dark:text-sky-300');
                b.classList.add('text-slate-600', 'dark:text-slate-300');
            }
        });

        document.querySelectorAll('.portal-page').forEach(p => {
            p.classList.remove('active');
        });
        const activePage = document.getElementById(`view-${viewName}`);
        if (activePage) activePage.classList.add('active');

        if (viewName === 'Dashboard') {
            if (window.renderCharts) window.renderCharts();
        } else if (viewName === 'Portal-Hub') {
            renderPortalHubView();
        }
    }
    window.switchView = switchView;

    // --------------------------------------------------------------
    // PORTAL HUB CHOOSER VIEW RENDERER
    // --------------------------------------------------------------
    function renderPortalHubView() {
        const currentAman = (window.amanCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);
        const currentCD = (window.cdCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);

        // Aman KPIs
        const amanValid = currentAman.filter(c => window.getValidityStatus(c.expiryDate).text === 'Valid').length;
        const amanFaults = currentAman.filter(c => c.panelHealth === 'Not Healthy').length;

        // CD KPIs
        const cdValid = currentCD.filter(c => window.getValidityStatus(c.expiryDate).text === 'Valid' && !c.amcOnly).length;
        let cdTotalSpend = 0;
        currentCD.forEach(c => {
            cdTotalSpend += (parseFloat(c.amcCost) || 0) + (parseFloat(c.certFee) || 0) + (parseFloat(c.reinspectionFee) || 0);
        });

        const hubAmanTotal = document.getElementById('hub-kpi-aman-total');
        const hubAmanValid = document.getElementById('hub-kpi-aman-valid');
        const hubAmanFaults = document.getElementById('hub-kpi-aman-faults');
        const hubCdTotal = document.getElementById('hub-kpi-cd-total');
        const hubCdValid = document.getElementById('hub-kpi-cd-valid');
        const hubCdSpend = document.getElementById('hub-kpi-cd-spend');

        if (hubAmanTotal) hubAmanTotal.textContent = currentAman.length;
        if (hubAmanValid) hubAmanValid.textContent = amanValid;
        if (hubAmanFaults) hubAmanFaults.textContent = amanFaults;

        if (hubCdTotal) hubCdTotal.textContent = currentCD.length;
        if (hubCdValid) hubCdValid.textContent = cdValid;
        if (hubCdSpend) hubCdSpend.textContent = cdTotalSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    window.renderPortalHubView = renderPortalHubView;

    // --------------------------------------------------------------
    // MAIN RENDER ALL
    // --------------------------------------------------------------
    function renderAll() {
        const currentAman = (window.amanCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);
        const currentCD = (window.cdCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);

        // Badges
        const badgeEst = document.getElementById('badge-establishments-count');
        const badgeCd = document.getElementById('badge-cd-count');
        const badgeAlerts = document.getElementById('badge-alerts-count');

        if (badgeEst) badgeEst.textContent = currentAman.length;
        if (badgeCd) badgeCd.textContent = currentCD.length;
        
        const alertsList = window.generateAlerts ? window.generateAlerts(currentAman, currentCD) : [];
        if (badgeAlerts) badgeAlerts.textContent = alertsList.length;

        // Dashboard Stats
        const dashAll = document.getElementById('dash-all-estbl');
        const monitoredCount = currentAman.filter(c => c.panelHealth === 'Healthy' && window.getValidityStatus(c.expiryDate).text === 'Valid').length;
        const installingCount = currentAman.filter(c => c.workflowStatus === 'Installation in Progress').length;
        const dashMonitored = document.getElementById('dash-monitored-estbl');
        const dashInstalling = document.getElementById('dash-installing-estbl');

        if (dashAll) dashAll.textContent = currentAman.length;
        if (dashMonitored) dashMonitored.textContent = monitoredCount;
        if (dashInstalling) dashInstalling.textContent = installingCount;

        // Render Sub-Views
        renderPortalHubView();
        if (window.renderEstablishmentsView) window.renderEstablishmentsView(currentAman);
        if (window.renderAlertsView) window.renderAlertsView(alertsList);
        if (window.renderCivilDefenceView) window.renderCivilDefenceView(currentCD);
        if (window.renderCharts) window.renderCharts();
    }
    window.renderAll = renderAll;

    // --------------------------------------------------------------
    // PROJECT MANAGEMENT
    // --------------------------------------------------------------
    function updateProjectDropdown() {
        const projectSelect = document.getElementById('project-select');
        if (!projectSelect) return;

        projectSelect.innerHTML = '';
        window.projectsList.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            if (p === window.currentProject) opt.selected = true;
            projectSelect.appendChild(opt);
        });
        const createOpt = document.createElement('option');
        createOpt.value = '__CREATE_NEW__';
        createOpt.textContent = '+ Create New Project';
        createOpt.className = 'font-bold text-sky-600';
        projectSelect.appendChild(createOpt);

        const dashProj = document.getElementById('dash-project-name');
        if (dashProj) dashProj.textContent = window.currentProject;
    }
    window.updateProjectDropdown = updateProjectDropdown;

    // --------------------------------------------------------------
    // INITIALIZATION & EVENT LISTENERS
    // --------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        // Setup Firebase auth state listener once ready
        const setupAuth = () => {
            if (window.firebaseAuth) {
                window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, (user) => {
                    const loginScreen = document.getElementById('login-screen');
                    const appContainer = document.getElementById('app-container');
                    const userDisplay = document.getElementById('user-display');

                    if (user) {
                        if (userDisplay) userDisplay.textContent = (user.email ? user.email.split('@')[0].toUpperCase() : 'SANU KARUMALIL');
                        if (loginScreen) loginScreen.style.display = 'none';
                        if (appContainer) appContainer.classList.remove('hidden');
                        if (window.listenToFirebase) window.listenToFirebase();
                        switchView('Portal-Hub');
                    } else {
                        if (loginScreen) loginScreen.style.display = 'flex';
                        if (appContainer) appContainer.classList.add('hidden');
                    }
                });
            }
        };

        window.addEventListener('firebase-ready', setupAuth);
        if (window.firebaseAuth) setupAuth();

        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;
                const loginError = document.getElementById('login-error');
                if (loginError) loginError.classList.add('hidden');

                if (window.firebaseAuth) {
                    window.firebaseAuth.signInWithEmailAndPassword(window.firebaseAuth.auth, email, password).catch((error) => {
                        if (loginError) {
                            let msg = "Invalid Email or Password. Please try again.";
                            if (error.code === 'auth/invalid-email') {
                                msg = "Invalid email format. Please check the email entered.";
                            } else if (error.code === 'auth/user-not-found') {
                                msg = "Account not found for this email address.";
                            } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                                msg = "Incorrect password. Please verify your password.";
                            } else if (error.code === 'auth/too-many-requests') {
                                msg = "Too many failed attempts. Please wait a moment and try again.";
                            } else if (error.code === 'auth/network-request-failed') {
                                msg = "Network connection issue. Please check your internet connection.";
                            } else if (error.message) {
                                msg = error.message;
                            }
                            loginError.textContent = msg;
                            loginError.classList.remove('hidden');
                        }
                    });
                }
            });
        }

        // Logout Button
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            window.showModal("Confirm Sign Out", `
                <p class="text-sm text-slate-600 dark:text-slate-300">Are you sure you want to sign out of the Sharjah Civil Defence AMAN Portal?</p>
                <div class="flex justify-end gap-3 mt-6">
                    <button id="cancel-logout" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
                    <button id="confirm-logout" class="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white">Sign Out</button>
                </div>
            `, () => {
                document.getElementById('confirm-logout')?.addEventListener('click', () => {
                    if (window.firebaseAuth) {
                        window.firebaseAuth.signOut(window.firebaseAuth.auth).then(() => window.location.reload());
                    }
                });
                document.getElementById('cancel-logout')?.addEventListener('click', window.hideModal);
            });
        });

        // Navigation Click
        document.getElementById('portal-nav')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.portal-nav-btn');
            if (btn) {
                switchView(btn.dataset.navTarget);
            }
        });

        // Header Portal Hub Button
        document.getElementById('btn-header-portal-hub')?.addEventListener('click', () => {
            switchView('Portal-Hub');
        });

        // Portal Chooser Hub Card Launches
        document.getElementById('btn-launch-aman-portal')?.addEventListener('click', () => {
            switchView('Dashboard');
        });
        document.getElementById('btn-launch-cd-portal')?.addEventListener('click', () => {
            switchView('Civil-Defence');
        });

        // Project Dropdown Change
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                if (e.target.value === '__CREATE_NEW__') {
                    window.showModal('Create New Project', `
                        <div class="space-y-4">
                            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Project Name</label>
                            <input type="text" id="newProjectName" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white" placeholder="e.g. Industrial Area Phase 2" required>
                            <div class="flex justify-end gap-3 pt-2">
                                <button id="cancel-new-proj" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
                                <button id="save-new-proj" class="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white">Create Project</button>
                            </div>
                        </div>
                    `, () => {
                        document.getElementById('save-new-proj')?.addEventListener('click', () => {
                            const name = document.getElementById('newProjectName').value.trim();
                            if (name) {
                                window.projectsList.add(name);
                                window.currentProject = name;
                                updateProjectDropdown();
                                renderAll();
                                window.hideModal();
                            }
                        });
                        document.getElementById('cancel-new-proj')?.addEventListener('click', window.hideModal);
                    });
                } else {
                    window.currentProject = e.target.value;
                    const dashProj = document.getElementById('dash-project-name');
                    if (dashProj) dashProj.textContent = window.currentProject;
                    renderAll();
                }
            });
        }

        // View Toggles on Establishments View
        const btnViewGrid = document.getElementById('btn-view-grid');
        const btnViewList = document.getElementById('btn-view-list');
        const estblGridContainer = document.getElementById('estbl-grid-container');
        const estblListContainer = document.getElementById('estbl-list-container');

        if (btnViewGrid && btnViewList) {
            btnViewGrid.addEventListener('click', () => {
                window.estblViewMode = 'grid';
                btnViewGrid.className = 'p-1.5 rounded text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-800 shadow-sm';
                btnViewList.className = 'p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
                if (estblGridContainer) estblGridContainer.classList.remove('hidden');
                if (estblListContainer) estblListContainer.classList.add('hidden');
            });

            btnViewList.addEventListener('click', () => {
                window.estblViewMode = 'list';
                btnViewList.className = 'p-1.5 rounded text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-800 shadow-sm';
                btnViewGrid.className = 'p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
                if (estblListContainer) estblListContainer.classList.remove('hidden');
                if (estblGridContainer) estblGridContainer.classList.add('hidden');
            });
        }

        // Theme Switcher Pill
        const themePill = document.getElementById('theme-pill');
        const themePillText = document.getElementById('theme-pill-text');
        if (themePill && themePillText) {
            themePill.addEventListener('click', () => {
                const isDark = document.documentElement.classList.toggle('dark');
                themePillText.textContent = isDark ? 'DARK' : 'LIGHT';
                if (window.renderCharts) window.renderCharts();
            });
        }

        // Language Switcher Pill
        const languagePill = document.getElementById('language-pill');
        if (languagePill) {
            languagePill.addEventListener('click', () => {
                window.currentLanguage = (window.currentLanguage === 'ENGLISH' ? 'العربية' : 'ENGLISH');
                const span = languagePill.querySelector('span');
                if (span) span.textContent = window.currentLanguage;
            });
        }

        // Fullscreen Toggle
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen();
            }
        });

        // Quick Add Dropdown Menu Toggle
        const quickAddBtn = document.getElementById('quick-add-dropdown-btn');
        const quickAddMenu = document.getElementById('quick-add-menu');
        if (quickAddBtn && quickAddMenu) {
            quickAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickAddMenu.classList.toggle('hidden');
            });
            document.addEventListener('click', () => quickAddMenu.classList.add('hidden'));
        }

        document.getElementById('btn-quick-add-single')?.addEventListener('click', () => window.handleShowForm('Aman Certificate'));
        document.getElementById('btn-quick-add-multiple')?.addEventListener('click', () => window.handleShowImportModal('Aman Certificate'));

        // Dashboard Service Button Bindings
        document.getElementById('dash-service-add-single')?.addEventListener('click', () => window.handleShowForm('Aman Certificate'));
        document.getElementById('dash-service-add-multiple')?.addEventListener('click', () => window.handleShowImportModal('Aman Certificate'));
        document.getElementById('dash-service-pdf')?.addEventListener('click', window.handleShowCustomReportModal);
        document.getElementById('dash-service-financial')?.addEventListener('click', window.handleShowFinancialReportOptions);

        // Bindings for Dashboard Stat Cards
        document.getElementById('card-stat-all')?.addEventListener('click', () => window.filterEstablishmentsByStatus('All'));
        document.getElementById('card-stat-monitored')?.addEventListener('click', () => window.filterEstablishmentsByStatus('monitored'));
        document.getElementById('card-stat-installing')?.addEventListener('click', () => window.filterEstablishmentsByStatus('installing'));

        // Bindings for Chart Legends
        document.getElementById('btn-filter-healthy')?.addEventListener('click', () => window.filterEstablishmentsByStatus('healthy'));
        document.getElementById('btn-filter-unhealthy')?.addEventListener('click', () => window.filterEstablishmentsByStatus('unhealthy'));
        document.getElementById('btn-filter-valid')?.addEventListener('click', () => window.filterEstablishmentsByStatus('valid'));
        document.getElementById('btn-filter-near')?.addEventListener('click', () => window.filterEstablishmentsByStatus('near-expiry'));
        document.getElementById('btn-filter-due')?.addEventListener('click', () => window.filterEstablishmentsByStatus('due-expired'));
        document.getElementById('estbl-clear-filter-btn')?.addEventListener('click', () => window.filterEstablishmentsByStatus('All'));

        // AMAN Establishments Button Bindings
        document.getElementById('estbl-add-btn')?.addEventListener('click', () => window.handleShowForm('Aman Certificate'));
        document.getElementById('estbl-import-btn')?.addEventListener('click', () => window.handleShowImportModal('Aman Certificate'));
        document.getElementById('estbl-export-btn')?.addEventListener('click', () => window.handleExportData('Aman Certificate', window.amanCerts));

        // AMAN Filters Event Listeners
        const bindAmanFilters = (id, event) => {
            document.getElementById(id)?.addEventListener(event, () => window.renderEstablishmentsView(window.amanCerts.filter(c => (c.project || 'Main Project') === window.currentProject)));
        };
        bindAmanFilters('estbl-sort-select', 'change');
        bindAmanFilters('estbl-status-filter', 'change');
        bindAmanFilters('estbl-type-filter', 'change');
        bindAmanFilters('estbl-search-input', 'input');
        bindAmanFilters('estbl-date-from', 'change');
        bindAmanFilters('estbl-date-to', 'change');

        // Civil Defence Event Listeners
        document.getElementById('cd-import-btn')?.addEventListener('click', () => window.handleShowImportModal('Civil Defence'));
        document.getElementById('cd-export-btn')?.addEventListener('click', () => window.handleExportData('Civil Defence', window.cdCerts));
        document.getElementById('cd-fin-report-btn')?.addEventListener('click', window.handleShowCdFinancialReportOptions);

        // CD Filters & Sorters
        const bindCdFilters = (id, event) => {
            document.getElementById(id)?.addEventListener(event, () => window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject)));
        };
        bindCdFilters('cd-search-input', 'input');
        bindCdFilters('cd-status-filter', 'change');
        bindCdFilters('cd-workflow-filter', 'change');
        bindCdFilters('cd-phase-filter', 'change');
        bindCdFilters('cd-type-filter', 'change');
        bindCdFilters('cd-sort-select', 'change');

        document.getElementById('cd-clear-filter-btn')?.addEventListener('click', () => {
            const sInp = document.getElementById('cd-search-input');
            const sStat = document.getElementById('cd-status-filter');
            const sWf = document.getElementById('cd-workflow-filter');
            const sPh = document.getElementById('cd-phase-filter');
            const sTp = document.getElementById('cd-type-filter');
            if (sInp) sInp.value = '';
            if (sStat) sStat.value = 'All';
            if (sWf) sWf.value = 'All';
            if (sPh) sPh.value = 'All';
            if (sTp) sTp.value = 'All';
            window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        });

        // CD Grid / List Toggle
        const cdViewGridBtn = document.getElementById('cd-view-grid-btn');
        const cdViewListBtn = document.getElementById('cd-view-list-btn');
        if (cdViewGridBtn && cdViewListBtn) {
            cdViewGridBtn.addEventListener('click', () => {
                window.cdViewMode = 'grid';
                cdViewGridBtn.className = 'p-1.5 rounded bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold transition';
                cdViewListBtn.className = 'p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white transition';
                window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
            });
            cdViewListBtn.addEventListener('click', () => {
                window.cdViewMode = 'list';
                cdViewListBtn.className = 'p-1.5 rounded bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold transition';
                cdViewGridBtn.className = 'p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white transition';
                window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
            });
        }

        // CD Quick Stat Card Filters
        const bindClickIfExist = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bindClickIfExist('cd-card-stat-all', () => {
            const sStat = document.getElementById('cd-status-filter');
            const sWf = document.getElementById('cd-workflow-filter');
            if (sStat) sStat.value = 'All';
            if (sWf) sWf.value = 'All';
            window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        });
        bindClickIfExist('cd-card-stat-valid', () => {
            const sStat = document.getElementById('cd-status-filter');
            if (sStat) sStat.value = 'Valid';
            window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        });
        bindClickIfExist('cd-card-stat-near', () => {
            const sStat = document.getElementById('cd-status-filter');
            if (sStat) sStat.value = 'Near Expiry';
            window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        });
        bindClickIfExist('cd-card-stat-expired', () => {
            const sStat = document.getElementById('cd-status-filter');
            if (sStat) sStat.value = 'Due / Expired';
            window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        });
        bindClickIfExist('cd-card-stat-inspection', () => {
            const sWf = document.getElementById('cd-workflow-filter');
            if (sWf) sWf.value = 'Inspection Date';
            window.renderCivilDefenceView(window.cdCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        });
        bindClickIfExist('cd-card-stat-cost', () => {
            window.handleShowCdFinancialReportOptions();
        });

        // Global Click Delegation for Card & Table clicks
        document.addEventListener('click', (e) => {
            const btnResolvePanel = e.target.closest('.btn-action-resolve-panel');
            const btnRenew = e.target.closest('.btn-action-renew');
            const estblCard = e.target.closest('.estbl-card');
            const estblRow = e.target.closest('.estbl-row');
            const cdCard = e.target.closest('.cd-card');
            const cdRow = e.target.closest('.cd-row');

            if (btnResolvePanel) {
                e.stopPropagation();
                const id = btnResolvePanel.dataset.id;
                const cert = window.amanCerts.find(c => c.id === id);
                if (cert) {
                    const fault = prompt(`Current Fault: "${cert.panelFaults || 'Unhealthy'}".\nEnter new fault description, or leave blank to mark Healthy & resolve:`, cert.panelFaults || '');
                    if (fault !== null) {
                        if (fault.trim() === '') {
                            cert.panelHealth = 'Healthy';
                            cert.panelFaults = '';
                            cert.docType = 'certificate';
                            alert(`Panel on "${cert.propertyNumber}" marked as Healthy! Compliance certificate released.`);
                        } else {
                            cert.panelHealth = 'Not Healthy';
                            cert.panelFaults = fault.trim();
                            cert.docType = 'receipt';
                        }
                        if (window.saveDataToFirebase) window.saveDataToFirebase();
                        renderAll();
                    }
                }
                return;
            }

            if (btnRenew) {
                e.stopPropagation();
                if (window.handleShowRenewalModal) window.handleShowRenewalModal(btnRenew.dataset.id);
                return;
            }

            if (estblCard || estblRow) {
                const el = estblCard || estblRow;
                if (window.handleShowDetailsModal) window.handleShowDetailsModal(el.dataset.id);
                return;
            }

            if (cdCard || cdRow) {
                const el = cdCard || cdRow;
                if (window.handleShowCdDetailsModal) window.handleShowCdDetailsModal(el.dataset.id);
                return;
            }
        });
    });
})();
