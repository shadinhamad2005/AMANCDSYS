// ==============================================================
// AMAN SAFETY SYSTEM MODULE (Dashboard, Establishments, Alerts)
// ==============================================================

(function() {
    let fireHealthChartInstance = null;
    let subscriptionChartInstance = null;

    // --------------------------------------------------------------
    // 1. DASHBOARD CHARTS & STATISTICS
    // --------------------------------------------------------------
    function renderCharts() {
        const currentAman = (window.amanCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);
        
        // Panel Health counts
        const healthyCount = currentAman.filter(c => c.panelHealth === 'Healthy').length;
        const notHealthyCount = currentAman.filter(c => c.panelHealth === 'Not Healthy').length;

        // 3-Way Subscription Status Counts
        const validCount = currentAman.filter(c => window.getValidityStatus(c.expiryDate).text === 'Valid').length;
        const nearExpiryCount = currentAman.filter(c => window.getValidityStatus(c.expiryDate).text === 'Near Expiry').length;
        const dueExpiredCount = currentAman.filter(c => window.getValidityStatus(c.expiryDate).text === 'Due / Expired').length;

        const hHealthyEl = document.getElementById('chart-health-healthy-val');
        const hUnhealthyEl = document.getElementById('chart-health-unhealthy-val');
        const sValidEl = document.getElementById('chart-sub-valid-val');
        const sNearEl = document.getElementById('chart-sub-near-val');
        const sDueEl = document.getElementById('chart-sub-due-val');

        if (hHealthyEl) hHealthyEl.textContent = healthyCount;
        if (hUnhealthyEl) hUnhealthyEl.textContent = notHealthyCount;
        if (sValidEl) sValidEl.textContent = validCount;
        if (sNearEl) sNearEl.textContent = nearExpiryCount;
        if (sDueEl) sDueEl.textContent = dueExpiredCount;

        const isDark = document.documentElement.classList.contains('dark');
        const borderColor = isDark ? '#1e293b' : '#ffffff';

        // Chart 1: Fire System Health
        const ctxHealth = document.getElementById('chart-fire-health');
        if (ctxHealth && window.Chart) {
            if (fireHealthChartInstance) fireHealthChartInstance.destroy();
            fireHealthChartInstance = new Chart(ctxHealth, {
                type: 'doughnut',
                data: {
                    labels: ['Healthy', 'Not Healthy'],
                    datasets: [{
                        data: [healthyCount, notHealthyCount],
                        backgroundColor: ['#059669', '#dc2626'],
                        borderColor: borderColor,
                        borderWidth: 3,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: { display: false }
                    },
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const idx = elements[0].index;
                            filterEstablishmentsByStatus(idx === 0 ? 'healthy' : 'unhealthy');
                        }
                    }
                }
            });
        }

        // Chart 2: Subscription Status (3 Slices)
        const ctxSub = document.getElementById('chart-subscription-status');
        if (ctxSub && window.Chart) {
            if (subscriptionChartInstance) subscriptionChartInstance.destroy();
            subscriptionChartInstance = new Chart(ctxSub, {
                type: 'doughnut',
                data: {
                    labels: ['Valid', 'Near Expiry', 'Due / Expired'],
                    datasets: [{
                        data: [validCount, nearExpiryCount, dueExpiredCount],
                        backgroundColor: ['#059669', '#f59e0b', '#dc2626'],
                        borderColor: borderColor,
                        borderWidth: 3,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: { display: false }
                    },
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const idx = elements[0].index;
                            const statuses = ['valid', 'near-expiry', 'due-expired'];
                            filterEstablishmentsByStatus(statuses[idx]);
                        }
                    }
                }
            });
        }
    }

    function filterEstablishmentsByStatus(filterKey) {
        if (window.switchView) window.switchView('Establishments');
        const statusSelect = document.getElementById('estbl-status-filter');
        if (statusSelect) {
            statusSelect.value = filterKey;
            renderEstablishmentsView(window.amanCerts.filter(c => (c.project || 'Main Project') === window.currentProject));
        }
    }

    // --------------------------------------------------------------
    // 2. ESTABLISHMENTS VIEW RENDERING (Grid & List)
    // --------------------------------------------------------------
    function renderEstablishmentsView(data) {
        const sortVal = document.getElementById('estbl-sort-select')?.value || 'name-asc';
        const statusFilter = document.getElementById('estbl-status-filter')?.value || 'All';
        const typeFilter = document.getElementById('estbl-type-filter')?.value || 'All';
        const searchQuery = (document.getElementById('estbl-search-input')?.value || '').toLowerCase().trim();
        const dateFrom = document.getElementById('estbl-date-from')?.value;
        const dateTo = document.getElementById('estbl-date-to')?.value;
        const filterBanner = document.getElementById('estbl-active-filter-banner');
        const filterBannerText = document.getElementById('estbl-active-filter-text');

        if (filterBanner && filterBannerText) {
            if (statusFilter !== 'All') {
                filterBanner.classList.remove('hidden');
                const labels = {
                    'monitored': '🟢 Showing Monitored Establishments (Panel Healthy & Valid Subscription)',
                    'installing': '🟡 Showing Installation in Progress Establishments',
                    'valid': '🟩 Showing Valid Subscriptions (> 30 Days Remaining)',
                    'near-expiry': '🟨 Showing Near Expiry Subscriptions (Within 30 Days)',
                    'due-expired': '🟥 Showing Due / Expired Subscriptions',
                    'healthy': '💚 Showing Establishments with Healthy Fire Alarm Panel',
                    'unhealthy': '💔 Showing Establishments with Unhealthy Fire Alarm Panel (Faults Present)'
                };
                filterBannerText.textContent = labels[statusFilter] || `Filter: ${statusFilter}`;
            } else {
                filterBanner.classList.add('hidden');
            }
        }

        let filtered = data.filter(item => {
            const validity = window.getValidityStatus(item.expiryDate).text;
            const isMonitored = item.panelHealth === 'Healthy' && validity === 'Valid';
            const isInstalling = item.workflowStatus === 'Installation in Progress';

            if (statusFilter === 'monitored' && !isMonitored) return false;
            if (statusFilter === 'installing' && !isInstalling) return false;
            if (statusFilter === 'valid' && validity !== 'Valid') return false;
            if (statusFilter === 'near-expiry' && validity !== 'Near Expiry') return false;
            if (statusFilter === 'due-expired' && validity !== 'Due / Expired') return false;
            if (statusFilter === 'healthy' && item.panelHealth !== 'Healthy') return false;
            if (statusFilter === 'unhealthy' && item.panelHealth !== 'Not Healthy') return false;

            if (typeFilter !== 'All') {
                const t = String(item.propertyType || '').toLowerCase();
                if (typeFilter === 'warehouse' && !t.includes('warehouse')) return false;
                if (typeFilter === 'opy' && !t.includes('opy') && !t.includes('openyard')) return false;
                if (typeFilter === 'admin' && !t.includes('admin')) return false;
                if (typeFilter === 'others' && (t.includes('warehouse') || t.includes('opy') || t.includes('admin'))) return false;
            }

            if (searchQuery) {
                const match = (
                    (item.propertyNumber && item.propertyNumber.toLowerCase().includes(searchQuery)) ||
                    (item.accountId && item.accountId.toLowerCase().includes(searchQuery)) ||
                    (item.recordId && item.recordId.toLowerCase().includes(searchQuery)) ||
                    (item.deviceId && item.deviceId.toLowerCase().includes(searchQuery)) ||
                    (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery)) ||
                    (item.panelFaults && item.panelFaults.toLowerCase().includes(searchQuery)) ||
                    (item.notes && item.notes.toLowerCase().includes(searchQuery))
                );
                if (!match) return false;
            }

            if (dateFrom && item.expiryDate && new Date(item.expiryDate) < new Date(dateFrom)) return false;
            if (dateTo && item.expiryDate && new Date(item.expiryDate) > new Date(dateTo)) return false;
            return true;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortVal === 'name-asc') return String(a.propertyNumber).localeCompare(String(b.propertyNumber), undefined, { numeric: true });
            if (sortVal === 'name-desc') return String(b.propertyNumber).localeCompare(String(a.propertyNumber), undefined, { numeric: true });
            if (sortVal === 'expiry-asc') return new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31');
            if (sortVal === 'expiry-desc') return new Date(b.expiryDate || '1970-01-01') - new Date(a.expiryDate || '1970-01-01');
            return 0;
        });

        const estblGridContainer = document.getElementById('estbl-grid-container');
        const tableBody = document.getElementById('estbl-table-body');

        // Render Grid Cards
        if (estblGridContainer) {
            if (filtered.length === 0) {
                estblGridContainer.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">No establishments found matching your filter criteria.</div>`;
            } else {
                estblGridContainer.innerHTML = filtered.map(item => {
                    const recordCode = item.recordId ? item.recordId : '-';
                    const dateBadge = window.parseDateBadge(item.expiryDate);
                    const statusText = item.workflowStatus || (window.getValidityStatus(item.expiryDate).text === 'Valid' ? 'Monitored' : 'Installation in Progress');
                    const isHealthy = item.panelHealth === 'Healthy';
                    const hasReceipt = item.docType === 'receipt';

                    return `
                    <div class="estbl-card cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-sky-400 dark:hover:border-sky-500 transition flex flex-col justify-between" data-id="${item.id}">
                        <div>
                            <!-- Top Header: Icon + Record ID + Health Badge -->
                            <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                                <div class="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/></svg>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">${recordCode}</span>
                                </div>
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${isHealthy ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'}" title="${item.panelFaults ? 'Faults: ' + item.panelFaults : (isHealthy ? 'Panel Healthy' : 'Panel Unhealthy')}">
                                    ${isHealthy ? '● Healthy' : '● Not Healthy'}
                                </span>
                            </div>

                            <!-- Mid Info -->
                            <div class="space-y-1 mb-4 text-center">
                                <p class="text-xs font-bold text-slate-800 dark:text-white">Estbl. Name: <span class="text-sky-700 dark:text-sky-400 font-extrabold">${item.propertyNumber}</span></p>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400">Devices: <span class="text-slate-700 dark:text-slate-300 font-medium">Paid: 1 / Required: 1</span></p>
                                ${item.serialNumber ? `<p class="text-[10px] text-slate-400 font-mono">SN: ${item.serialNumber}</p>` : ''}
                                ${!isHealthy && item.panelFaults ? `<p class="text-[10px] font-semibold text-red-600 dark:text-red-400 truncate px-2 py-0.5 bg-red-50 dark:bg-red-900/30 rounded" title="${item.panelFaults}">Fault: ${item.panelFaults}</p>` : ''}
                            </div>
                        </div>

                        <div>
                            <!-- Date & Status Row -->
                            <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-3 text-xs">
                                <div class="flex items-center gap-2">
                                    <div class="text-center leading-none">
                                        <span class="block text-[9px] font-bold text-slate-400 uppercase">${dateBadge.month} ${dateBadge.year}</span>
                                        <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-100">${dateBadge.day}</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1.5 text-[11px] font-semibold ${isHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}">
                                    <span>${statusText}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div class="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                                <span class="inline-flex items-center gap-1 text-[11px] font-bold ${hasReceipt ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}">
                                    ${hasReceipt ? '🧾 Receipt' : '📜 Certificate'}
                                </span>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        }

        // Render Table Rows
        if (tableBody) {
            if (filtered.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400">No matching establishments found.</td></tr>`;
            } else {
                tableBody.innerHTML = filtered.map(item => {
                    const recordCode = item.recordId ? item.recordId : '-';
                    const statusText = item.workflowStatus || (window.getValidityStatus(item.expiryDate).text === 'Valid' ? 'Monitored' : 'Installation in Progress');
                    const isHealthy = item.panelHealth === 'Healthy';
                    const hasReceipt = item.docType === 'receipt';

                    return `
                    <tr class="estbl-row group cursor-pointer hover:bg-sky-50/60 dark:hover:bg-slate-700/60 transition" data-id="${item.id}">
                        <td class="px-5 py-3.5 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/></svg>
                                <span class="font-mono font-bold text-xs text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">${recordCode}</span>
                            </div>
                        </td>
                        <td class="px-5 py-3.5 whitespace-nowrap">
                            <div class="font-bold text-xs text-slate-900 dark:text-slate-100">${item.propertyNumber}</div>
                            <div class="text-[10px] text-slate-400 font-medium">1 Device ${item.serialNumber ? `&bull; SN: ${item.serialNumber}` : ''}</div>
                        </td>
                        <td class="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">${window.formatDate(item.expiryDate)}</td>
                        <td class="px-5 py-3.5 whitespace-nowrap">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg ${isHealthy ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'}">
                                <span class="w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                                <span>${statusText}</span>
                            </span>
                        </td>
                        <td class="px-5 py-3.5 whitespace-nowrap">
                            <div class="flex flex-col gap-0.5">
                                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full w-fit ${isHealthy ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}">
                                    ${isHealthy ? '🟢 Healthy' : '🔴 Not Healthy'}
                                </span>
                                ${!isHealthy && item.panelFaults ? `<span class="text-[9px] text-red-500 font-medium truncate max-w-[140px]" title="${item.panelFaults}">${item.panelFaults}</span>` : ''}
                            </div>
                        </td>
                        <td class="px-5 py-3.5 whitespace-nowrap text-center">
                            <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border ${hasReceipt ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'}">
                                ${hasReceipt ? '🧾 Receipt' : '📜 Certificate'}
                            </span>
                        </td>
                    </tr>
                    `;
                }).join('');
            }
        }
    }

    // --------------------------------------------------------------
    // 3. ALERTS VIEW RENDERING
    // --------------------------------------------------------------
    function generateAlerts(amanList, cdList) {
        const alerts = [];
        const now = new Date();
        const thirtyDays = new Date();
        thirtyDays.setDate(now.getDate() + 30);

        const check = (list, type) => {
            list.forEach(c => {
                if (!c.expiryDate) return;
                const exp = new Date(c.expiryDate);
                if (exp < now) {
                    alerts.push({
                        id: c.id,
                        alertKind: 'expiry',
                        type: type,
                        property: c.propertyNumber,
                        severity: 'critical',
                        message: `${type} Certificate for "${c.propertyNumber}" Expired on ${window.formatDate(c.expiryDate)}. Immediate Renewal Required.`,
                        date: c.expiryDate
                    });
                } else if (exp <= thirtyDays) {
                    alerts.push({
                        id: c.id,
                        alertKind: 'expiry',
                        type: type,
                        property: c.propertyNumber,
                        severity: 'warning',
                        message: `${type} Certificate for "${c.propertyNumber}" is Near Expiry (${window.formatDate(c.expiryDate)}). Please initiate compliance review.`,
                        date: c.expiryDate
                    });
                }
                if (c.panelHealth === 'Not Healthy') {
                    alerts.push({
                        id: c.id,
                        alertKind: 'panel-fault',
                        type: 'Fire Alarm Panel',
                        property: c.propertyNumber,
                        severity: 'warning',
                        message: `Panel Unhealthy on "${c.propertyNumber}"${c.panelFaults ? ': ' + c.panelFaults : ''}. Certificate blocked.`,
                        date: c.expiryDate
                    });
                }
            });
        };

        check(amanList, 'Aman');
        check(cdList, 'Civil Defence');
        return alerts;
    }

    function renderAlertsView(alerts) {
        const container = document.getElementById('alerts-container');
        if (!container) return;
        if (alerts.length === 0) {
            container.innerHTML = `<div class="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400">No active alerts. All systems are operational and compliant.</div>`;
            return;
        }

        container.innerHTML = alerts.map(alert => {
            const isPanelFault = alert.alertKind === 'panel-fault';

            return `
            <div class="p-4 rounded-xl border ${alert.severity === 'critical' ? 'bg-red-50/70 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-amber-50/70 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="flex items-start sm:items-center gap-3">
                    <div class="p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'} flex-shrink-0 mt-0.5 sm:mt-0">
                        ${isPanelFault ? `
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        ` : `
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        `}
                    </div>
                    <div>
                        <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${alert.message}</p>
                        <p class="text-[11px] text-slate-500 mt-0.5">Category: <b class="text-slate-700 dark:text-slate-300 font-semibold">${alert.type}</b> &bull; Expiry / Due Date: ${window.formatDate(alert.date)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-center">
                    ${isPanelFault ? `
                    <button class="btn-action-resolve-panel px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition" data-id="${alert.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        <span>Resolve Fault / Clear Panel</span>
                    </button>
                    ` : `
                    <button class="btn-action-renew px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition" data-id="${alert.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/></svg>
                        <span>Renew Certificate</span>
                    </button>
                    `}
                </div>
            </div>
            `;
        }).join('');
    }

    // --------------------------------------------------------------
    // 4. ESTABLISHMENT 360° DETAILS MODAL
    // --------------------------------------------------------------
    function handleShowDetailsModal(id) {
        const cert = window.amanCerts.find(c => c.id === id) || window.cdCerts.find(c => c.id === id);
        if (!cert) return;
        const isAman = window.amanCerts.some(c => c.id === id);
        const isHealthy = cert.panelHealth === 'Healthy';
        const hasReceipt = cert.docType === 'receipt';
        const recordCode = cert.recordId ? cert.recordId : '-';
        const validity = window.getValidityStatus(cert.expiryDate);
        const currentWorkflow = cert.workflowStatus || (isAman ? 'Installation in Progress' : 'Renewal Pending');

        let totalInstall = parseFloat(cert.installCost) || 0;
        let totalRenewal = 0;
        (cert.renewalHistory || []).forEach(r => {
            if (r.type === 'Installation' && !totalInstall) totalInstall = parseFloat(r.cost) || 0;
            else if (r.type !== 'Installation') totalRenewal += parseFloat(r.cost) || 0;
        });

        const modalContent = `
            <div class="space-y-6">
                <!-- Top Overview Banner -->
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Record ID: <b class="text-slate-700 dark:text-slate-200 font-mono">${recordCode}</b></span>
                        <h2 class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">${cert.propertyNumber}</h2>
                        <p class="text-xs text-slate-500">${cert.propertyType ? cert.propertyType.toUpperCase() : 'ESTABLISHMENT'} &bull; ${cert.phase || 'Phase 1'} &bull; Project: <b class="text-slate-700 dark:text-slate-200">${cert.project || window.currentProject}</b></p>
                    </div>
                    
                    <!-- 1-Click Workflow Status Selector & Expiry Badge -->
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-sm">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Workflow Status:</span>
                            <select id="detail-workflow-status" class="bg-transparent font-bold text-xs outline-none cursor-pointer ${currentWorkflow === 'Installation in Progress' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
                                <option value="Installation in Progress" ${currentWorkflow === 'Installation in Progress' ? 'selected' : ''}>🟡 Installation in Progress</option>
                                <option value="Pending Renewal" ${currentWorkflow === 'Pending Renewal' ? 'selected' : ''}>🟠 Pending Renewal</option>
                                <option value="Certificate ready" ${currentWorkflow === 'Certificate ready' ? 'selected' : ''}>🟢 Certificate ready / Monitored</option>
                            </select>
                        </div>
                        <span class="px-3 py-1.5 text-xs font-bold rounded-full ${validity.bg}">${validity.text} (${window.formatDate(cert.expiryDate)})</span>
                    </div>
                </div>

                <!-- Initial Installation Payment & Setup Box -->
                <div class="p-4 rounded-xl bg-sky-50/70 dark:bg-slate-900 border border-sky-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <span class="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">🛠️ AMAN Initial Installation (One-Time Setup)</span>
                        <div class="flex items-center gap-4 mt-1 text-xs">
                            <div><span class="text-slate-400">Date:</span> <b class="text-slate-800 dark:text-slate-100 font-mono">${window.formatDate(cert.installDate)}</b></div>
                            <div><span class="text-slate-400">Fee:</span> <b class="text-emerald-600 font-bold">${cert.installCost ? parseFloat(cert.installCost).toFixed(2) + ' AED' : '-'}</b></div>
                            <div><span class="text-slate-400">Receipt:</span> ${cert.installReceiptLink ? `<a href="${cert.installReceiptLink}" target="_blank" class="text-amber-600 font-bold underline">View Receipt</a>` : `<span class="text-slate-400">-</span>`}</div>
                        </div>
                    </div>
                    <button id="btn-log-install-pay" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm">
                        ${cert.installCost ? '✏️ Edit Installation Fee' : '➕ Log Installation Payment'}
                    </button>
                </div>

                <!-- Panel Health & Document State Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <!-- Card 1: Fire Alarm Panel Health -->
                    <div class="p-4 rounded-xl border ${isHealthy ? 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50/60 dark:bg-red-900/20 border-red-200 dark:border-red-800'} flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Fire Alarm Panel Health</span>
                                <span class="px-2.5 py-0.5 text-xs font-extrabold rounded-full ${isHealthy ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}">
                                    ${isHealthy ? '● Healthy' : '● Not Healthy'}
                                </span>
                            </div>
                            <p class="text-xs text-slate-600 dark:text-slate-300">
                                ${isHealthy ? 'The fire alarm control panel is verified online with no active trouble signals.' : `<b>Faults Reported:</b> ${cert.panelFaults || 'Unhealthy status recorded from portal'}`}
                            </p>
                        </div>
                        <div class="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button id="btn-quick-toggle-health" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition">
                                ${isHealthy ? '⚠️ Mark Panel as Faulty / Not Healthy' : '✅ Clear Fault & Mark Healthy'}
                            </button>
                        </div>
                    </div>

                    <!-- Card 2: Document Release State -->
                    <div class="p-4 rounded-xl border ${hasReceipt ? 'bg-amber-50/60 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-sky-50/60 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800'} flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Document Release Status</span>
                                <span class="px-2.5 py-0.5 text-xs font-extrabold rounded-full ${hasReceipt ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'}">
                                    ${hasReceipt ? '🧾 Payment Receipt' : '📜 Compliance Certificate'}
                                </span>
                            </div>
                            <p class="text-xs text-slate-600 dark:text-slate-300">
                                ${hasReceipt ? 'Government issued Payment Receipt. Official Compliance Certificate is held pending Panel Health resolution.' : 'Official Civil Defence Compliance Certificate issued.'}
                            </p>
                        </div>
                        <div class="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            ${cert.certificateLink ? `
                            <a href="${cert.certificateLink}" target="_blank" class="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
                                <span>Open Attached Document</span>
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                            ` : `<span class="text-xs text-slate-400 italic">No document link uploaded</span>`}
                            <button id="btn-switch-doc-type" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition">
                                Switch to ${hasReceipt ? 'Certificate' : 'Receipt'}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Device Identifiers & Hardware Info -->
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Hardware & Device Identifiers</span>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><span class="text-slate-400 block text-[10px]">RECORD ID</span><b class="font-mono text-slate-800 dark:text-slate-100">${cert.recordId || '-'}</b></div>
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><span class="text-slate-400 block text-[10px]">DEVICE ID</span><b class="font-mono text-slate-800 dark:text-slate-100">${cert.deviceId || '-'}</b></div>
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><span class="text-slate-400 block text-[10px]">SERIAL NUMBER</span><b class="font-mono text-slate-800 dark:text-slate-100">${cert.serialNumber || '-'}</b></div>
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><span class="text-slate-400 block text-[10px]">ACCOUNT ID</span><b class="font-mono text-slate-800 dark:text-slate-100">${cert.accountId || '-'}</b></div>
                    </div>
                </div>

                <!-- Renewal & Financial Ledger History -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Subscription Renewal & Payment History</h4>
                        <button id="btn-detail-add-renewal" class="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                            <span>+ Record New Renewal</span>
                        </button>
                    </div>
                    <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
                        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left">
                            <thead class="bg-slate-50 dark:bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase">
                                <tr>
                                    <th class="px-4 py-2">Payment Event</th>
                                    <th class="px-4 py-2">Transaction Date</th>
                                    <th class="px-4 py-2">Expiry Date</th>
                                    <th class="px-4 py-2">Cost (AED)</th>
                                    <th class="px-4 py-2">Document</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                                <!-- Current Active Row -->
                                <tr class="bg-sky-50/40 dark:bg-slate-800/40 font-medium">
                                    <td class="px-4 py-2 font-bold text-sky-700 dark:text-sky-400">Current Active Cycle</td>
                                    <td class="px-4 py-2 font-mono">${window.formatDate(cert.createdAt || cert.installDate)}</td>
                                    <td class="px-4 py-2 font-mono font-bold">${window.formatDate(cert.expiryDate)}</td>
                                    <td class="px-4 py-2 font-mono">${cert.installCost ? parseFloat(cert.installCost).toFixed(2) : '-'}</td>
                                    <td class="px-4 py-2">
                                        ${cert.certificateLink ? `<a href="${cert.certificateLink}" target="_blank" class="text-sky-600 underline">View PDF</a>` : '-'}
                                    </td>
                                </tr>
                                <!-- Renewal History Logs -->
                                ${(cert.renewalHistory || []).map(r => `
                                    <tr>
                                        <td class="px-4 py-2">${r.type || 'Annual Renewal'}</td>
                                        <td class="px-4 py-2 font-mono">${window.formatDate(r.date)}</td>
                                        <td class="px-4 py-2 font-mono">${window.formatDate(r.expiryDate)}</td>
                                        <td class="px-4 py-2 font-mono font-bold text-emerald-600">${r.cost ? parseFloat(r.cost).toFixed(2) : '-'}</td>
                                        <td class="px-4 py-2">
                                            ${r.receiptLink ? `<a href="${r.receiptLink}" target="_blank" class="text-sky-600 underline">Receipt</a>` : '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Bottom Modal Action Bar -->
                <div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button id="btn-detail-amend" class="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition">
                        ✏️ Amend Establishment Details
                    </button>
                    <div class="flex items-center gap-3">
                        <button id="btn-detail-history" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">View History Archive</button>
                        <button id="btn-detail-renew" class="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/></svg>
                            <span>Renew Subscription</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        window.showModal(`Establishment 360°: ${cert.propertyNumber}`, modalContent, () => {
            const wfSelect = document.getElementById('detail-workflow-status');
            if (wfSelect) {
                wfSelect.addEventListener('change', (e) => {
                    cert.workflowStatus = e.target.value;
                    window.saveDataToFirebase();
                    window.hideModal();
                    handleShowDetailsModal(id);
                    window.renderAll();
                });
            }

            document.getElementById('btn-log-install-pay')?.addEventListener('click', () => {
                window.hideModal();
                handleShowInstallationPaymentModal(id);
            });

            document.getElementById('btn-quick-toggle-health')?.addEventListener('click', () => {
                const newHealth = cert.panelHealth === 'Healthy' ? 'Not Healthy' : 'Healthy';
                cert.panelHealth = newHealth;
                if (newHealth === 'Not Healthy' && !cert.panelFaults) {
                    const fault = prompt("Please enter panel fault reason (e.g. Trouble signal, Loop fault, Battery error):");
                    if (fault) cert.panelFaults = fault;
                    cert.docType = 'receipt';
                } else if (newHealth === 'Healthy') {
                    cert.panelFaults = '';
                    cert.docType = 'certificate';
                }
                window.saveDataToFirebase();
                window.hideModal();
                handleShowDetailsModal(id);
                window.renderAll();
            });

            document.getElementById('btn-switch-doc-type')?.addEventListener('click', () => {
                cert.docType = (cert.docType === 'receipt' ? 'certificate' : 'receipt');
                window.saveDataToFirebase();
                window.hideModal();
                handleShowDetailsModal(id);
                window.renderAll();
            });

            document.getElementById('btn-detail-amend')?.addEventListener('click', () => {
                window.hideModal();
                window.handleShowForm('Aman Certificate', id);
            });

            document.getElementById('btn-detail-renew')?.addEventListener('click', () => {
                window.hideModal();
                window.handleShowRenewalModal(id);
            });

            document.getElementById('btn-detail-add-renewal')?.addEventListener('click', () => {
                window.hideModal();
                window.handleShowRenewalModal(id);
            });

            document.getElementById('btn-detail-history')?.addEventListener('click', () => {
                window.hideModal();
                window.handleShowHistoryModal(id);
            });
        });
    }

    // --------------------------------------------------------------
    // 5. INITIAL INSTALLATION PAYMENT MODAL
    // --------------------------------------------------------------
    function handleShowInstallationPaymentModal(id) {
        const cert = window.amanCerts.find(c => c.id === id);
        if (!cert) return;

        const modalContent = `
            <form id="gov-install-pay-form" class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Log initial one-time AMAN installation payment for: <b class="text-sky-600 dark:text-sky-400 font-bold">${cert.propertyNumber}</b></p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Installation Date *</label>
                        <input type="date" id="inputInstallDate" value="${cert.installDate || ''}" required class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Installation Amount (AED) *</label>
                        <input type="number" step="0.01" id="inputInstallCost" value="${cert.installCost || ''}" placeholder="e.g. 5400.00" required class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Installation Receipt / Invoice URL</label>
                    <input type="text" id="inputInstallReceiptLink" value="${cert.installReceiptLink || ''}" placeholder="https://... or C:/Receipts/Invoice.pdf" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" id="install-cancel" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
                    <button type="submit" class="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm">Save Installation Payment</button>
                </div>
            </form>
        `;

        window.showModal(`AMAN Installation Payment: ${cert.propertyNumber}`, modalContent, () => {
            document.getElementById('gov-install-pay-form').addEventListener('submit', (e) => {
                e.preventDefault();
                cert.installDate = document.getElementById('inputInstallDate').value;
                cert.installCost = document.getElementById('inputInstallCost').value;
                cert.installReceiptLink = document.getElementById('inputInstallReceiptLink').value;

                if (!cert.renewalHistory) cert.renewalHistory = [];
                const instIdx = cert.renewalHistory.findIndex(r => r.type === 'Installation');
                const instRecord = {
                    id: instIdx !== -1 ? cert.renewalHistory[instIdx].id : crypto.randomUUID(),
                    type: 'Installation',
                    date: cert.installDate,
                    cost: parseFloat(cert.installCost) || 0
                };
                if (instIdx !== -1) cert.renewalHistory[instIdx] = instRecord;
                else cert.renewalHistory.unshift(instRecord);

                window.saveDataToFirebase();
                window.hideModal();
                handleShowDetailsModal(id);
                window.renderAll();
            });
            document.getElementById('install-cancel').addEventListener('click', () => {
                window.hideModal();
                handleShowDetailsModal(id);
            });
        });
    }

    // Attach to window
    window.renderCharts = renderCharts;
    window.filterEstablishmentsByStatus = filterEstablishmentsByStatus;
    window.renderEstablishmentsView = renderEstablishmentsView;
    window.generateAlerts = generateAlerts;
    window.renderAlertsView = renderAlertsView;
    window.handleShowDetailsModal = handleShowDetailsModal;
    window.handleShowInstallationPaymentModal = handleShowInstallationPaymentModal;
})();
