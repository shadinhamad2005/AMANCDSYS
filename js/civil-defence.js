// ==============================================================
// SHARJAH CIVIL DEFENCE (SCD) SYSTEM MODULE
// ==============================================================

(function() {
    const CD_WORKFLOW_STEPS = ['Renewal Pending', 'Informed Fire team', 'AMC ready', 'Awaiting inspection', 'Inspection Date', 'Certificate ready'];

    // --------------------------------------------------------------
    // 1. CIVIL DEFENCE VIEW RENDERING (Grid & List)
    // --------------------------------------------------------------
    function renderCivilDefenceView(data) {
        const tableBody = document.getElementById('cd-table-body');
        const gridContainer = document.getElementById('cd-grid-container');
        const tableContainer = document.getElementById('cd-table-container');

        // 1. Calculate & Render Statistics Counters Banner
        const total = data.length;
        const valid = data.filter(c => window.getValidityStatus(c.expiryDate).text === 'Valid' && !c.amcOnly).length;
        const near = data.filter(c => window.getValidityStatus(c.expiryDate).text === 'Near Expiry' && !c.amcOnly).length;
        const expired = data.filter(c => window.getValidityStatus(c.expiryDate).text === 'Due / Expired' && !c.amcOnly).length;
        const inspection = data.filter(c => c.workflowStatus === 'Awaiting inspection' || c.workflowStatus === 'Inspection Date' || c.inspectionDate).length;
        
        let totalCostVal = 0;
        data.forEach(item => {
            const amc = parseFloat(item.amcCost) || 0;
            const cert = parseFloat(item.certFee) || 0;
            const reinsp = parseFloat(item.reinspectionFee) || 0;
            totalCostVal += (amc + cert + reinsp);
        });

        const statTotalEl = document.getElementById('cd-stat-total');
        const statValidEl = document.getElementById('cd-stat-valid');
        const statNearEl = document.getElementById('cd-stat-near');
        const statExpiredEl = document.getElementById('cd-stat-expired');
        const statInspectionEl = document.getElementById('cd-stat-inspection');
        const costEl = document.getElementById('cd-stat-cost');

        if (statTotalEl) statTotalEl.textContent = total;
        if (statValidEl) statValidEl.textContent = valid;
        if (statNearEl) statNearEl.textContent = near;
        if (statExpiredEl) statExpiredEl.textContent = expired;
        if (statInspectionEl) statInspectionEl.textContent = inspection;
        if (costEl) costEl.textContent = totalCostVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

        // 2. Read Filters & Sorters
        const searchQ = (document.getElementById('cd-search-input')?.value || '').toLowerCase().trim();
        const statusFilter = document.getElementById('cd-status-filter')?.value || 'All';
        const workflowFilter = document.getElementById('cd-workflow-filter')?.value || 'All';
        const phaseFilter = document.getElementById('cd-phase-filter')?.value || 'All';
        const typeFilter = document.getElementById('cd-type-filter')?.value || 'All';
        const sortBy = document.getElementById('cd-sort-select')?.value || 'property-asc';

        // Active Filter Banner check
        const filterBanner = document.getElementById('cd-active-filter-banner');
        const filterText = document.getElementById('cd-active-filter-text');
        const isFiltered = (statusFilter !== 'All' || workflowFilter !== 'All' || phaseFilter !== 'All' || typeFilter !== 'All' || searchQ !== '');
        if (filterBanner) {
            filterBanner.classList.toggle('hidden', !isFiltered);
            if (filterText && isFiltered) {
                filterText.textContent = `Active Filters: Status [${statusFilter}], Workflow [${workflowFilter}], Phase [${phaseFilter}]`;
            }
        }

        // 3. Filter Dataset
        let filtered = data.filter(c => {
            const vStatus = window.getValidityStatus(c.expiryDate).text;
            const currentWorkflow = c.workflowStatus || (c.amcOnly ? 'AMC ready' : 'Renewal Pending');

            if (statusFilter !== 'All') {
                if (statusFilter === 'Valid' && (vStatus !== 'Valid' || c.amcOnly)) return false;
                if (statusFilter === 'Near Expiry' && (vStatus !== 'Near Expiry' || c.amcOnly)) return false;
                if (statusFilter === 'Due / Expired' && (vStatus !== 'Due / Expired' || c.amcOnly)) return false;
                if (statusFilter === 'AMC Only' && !c.amcOnly) return false;
            }

            if (workflowFilter !== 'All' && currentWorkflow !== workflowFilter) return false;
            if (phaseFilter !== 'All' && (c.phase || 'Phase 1') !== phaseFilter) return false;
            if (typeFilter !== 'All' && (c.propertyType || 'warehouse') !== typeFilter) return false;

            if (searchQ) {
                const matches = (
                    (c.propertyNumber && c.propertyNumber.toLowerCase().includes(searchQ)) ||
                    (c.amcContractor && c.amcContractor.toLowerCase().includes(searchQ)) ||
                    (c.inspectorName && c.inspectorName.toLowerCase().includes(searchQ)) ||
                    (c.notes && c.notes.toLowerCase().includes(searchQ)) ||
                    (c.reinspectionRemarks && c.reinspectionRemarks.toLowerCase().includes(searchQ))
                );
                if (!matches) return false;
            }
            return true;
        });

        // 4. Sort Dataset
        filtered.sort((a, b) => {
            if (sortBy === 'property-asc') return String(a.propertyNumber).localeCompare(String(b.propertyNumber), undefined, { numeric: true });
            if (sortBy === 'property-desc') return String(b.propertyNumber).localeCompare(String(a.propertyNumber), undefined, { numeric: true });
            if (sortBy === 'expiry-asc') {
                if (a.amcOnly) return 1;
                if (b.amcOnly) return -1;
                return new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31');
            }
            if (sortBy === 'expiry-desc') {
                if (a.amcOnly) return 1;
                if (b.amcOnly) return -1;
                return new Date(b.expiryDate || '1970-01-01') - new Date(a.expiryDate || '1970-01-01');
            }
            return 0;
        });

        // 5. Render Grid / Table Views
        if (window.cdViewMode === 'grid') {
            if (tableContainer) tableContainer.classList.add('hidden');
            if (gridContainer) gridContainer.classList.remove('hidden');

            if (gridContainer) {
                if (filtered.length === 0) {
                    gridContainer.innerHTML = `<div class="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">No Civil Defence records found matching the current filters.</div>`;
                } else {
                    gridContainer.innerHTML = filtered.map(item => {
                        const vStatus = window.getValidityStatus(item.expiryDate);
                        const currentWorkflow = item.workflowStatus || (item.amcOnly ? 'AMC ready' : 'Renewal Pending');
                        const wfBadge = window.getWorkflowBadge(currentWorkflow);
                        const isAmcOnly = !!item.amcOnly;
                        const stepIdx = CD_WORKFLOW_STEPS.indexOf(currentWorkflow);
                        const stepNum = stepIdx !== -1 ? stepIdx + 1 : 1;
                        const itemTotal = (parseFloat(item.amcCost) || 0) + (parseFloat(item.certFee) || 0) + (parseFloat(item.reinspectionFee) || 0);

                        return `
                        <div class="cd-card cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between" data-id="${item.id}">
                            <div>
                                <!-- Header: Property & Phase -->
                                <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">${(item.propertyType || 'Warehouse').toUpperCase()}</span>
                                    <h3 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        <span>${item.propertyNumber}</span>
                                    </h3>
                                </div>
                                <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full ${isAmcOnly ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : vStatus.bg}">
                                    ${isAmcOnly ? '🏢 AMC Only' : vStatus.text}
                                </span>
                            </div>

                            <!-- Dates & Contractor Info -->
                            <div class="grid grid-cols-2 gap-2 py-3 text-xs border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <span class="text-[10px] text-slate-400 font-semibold block uppercase">Issue Date</span>
                                    <b class="font-mono text-slate-700 dark:text-slate-200">${window.formatDate(item.issueDate)}</b>
                                </div>
                                <div>
                                    <span class="text-[10px] text-slate-400 font-semibold block uppercase">Expiry Date</span>
                                    <b class="font-mono text-slate-700 dark:text-slate-200">${isAmcOnly ? 'Lifetime (AMC)' : window.formatDate(item.expiryDate)}</b>
                                </div>
                                <div class="col-span-2 pt-1">
                                    <span class="text-[10px] text-slate-400 font-semibold block uppercase">Approved Fire Co. (AMC)</span>
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-800 dark:text-slate-200 font-medium truncate">${item.amcContractor || 'Not Assigned'}</span>
                                        ${itemTotal > 0 ? `<span class="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">${itemTotal.toFixed(2)} AED</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 6-Stage Progress Stepper Bar -->
                        <div class="pt-3 space-y-1.5">
                            <div class="flex items-center justify-between text-[11px]">
                                <span class="text-slate-400">Milestone (Step ${stepNum}/6):</span>
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${wfBadge.bg} ${wfBadge.text}">${currentWorkflow}</span>
                            </div>
                            <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div class="bg-amber-500 h-full rounded-full transition-all" style="width: ${(stepNum / 6) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                    `;
                    }).join('');
                }
            }
        } else {
            if (gridContainer) gridContainer.classList.add('hidden');
            if (tableContainer) tableContainer.classList.remove('hidden');

            if (tableBody) {
                if (filtered.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No Civil Defence records match the current filter criteria.</td></tr>`;
                } else {
                    tableBody.innerHTML = filtered.map(item => {
                        const vStatus = window.getValidityStatus(item.expiryDate);
                        const currentWorkflow = item.workflowStatus || (item.amcOnly ? 'AMC ready' : 'Renewal Pending');
                        const wfBadge = window.getWorkflowBadge(currentWorkflow);
                        const isAmcOnly = !!item.amcOnly;
                        const itemTotal = (parseFloat(item.amcCost) || 0) + (parseFloat(item.certFee) || 0) + (parseFloat(item.reinspectionFee) || 0);

                        return `
                        <tr class="cd-row group cursor-pointer hover:bg-amber-50/40 dark:hover:bg-slate-700/50 transition" data-id="${item.id}">
                            <td class="px-4 py-3 whitespace-nowrap">
                                <div class="flex items-center gap-2">
                                    <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                    </div>
                                    <div>
                                        <span class="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">${item.propertyNumber}</span>
                                        <span class="text-[10px] text-slate-400 block">${(item.propertyType || 'Warehouse').toUpperCase()} &bull; ${item.phase || 'Phase 1'}</span>
                                    </div>
                                </div>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">${window.formatDate(item.issueDate)}</td>
                            <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">${isAmcOnly ? 'Lifetime (AMC)' : window.formatDate(item.expiryDate)}</td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <span class="px-2.5 py-1 text-[11px] font-bold rounded-full ${isAmcOnly ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : vStatus.bg}">
                                    ${isAmcOnly ? '🏢 AMC Only' : vStatus.text}
                                </span>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <span class="px-2.5 py-1 text-[11px] font-bold rounded-lg ${wfBadge.bg} ${wfBadge.text}">
                                    ${currentWorkflow}
                                </span>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">${item.amcContractor || '-'}</div>
                                ${item.amcRef ? `<span class="text-[10px] text-slate-400 font-mono">Ref: ${item.amcRef}</span>` : ''}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                                ${itemTotal > 0 ? `${itemTotal.toFixed(2)} AED` : '-'}
                            </td>
                        </tr>
                        `;
                    }).join('');
                }
            }
        }
    }

    // --------------------------------------------------------------
    // 2. CIVIL DEFENCE 360° DETAILS MODAL
    // --------------------------------------------------------------
    function handleShowCdDetailsModal(id) {
        const cert = window.cdCerts.find(c => c.id === id);
        if (!cert) return;

        const currentWorkflow = cert.workflowStatus || (cert.amcOnly ? 'AMC ready' : 'Renewal Pending');
        const validity = window.getValidityStatus(cert.expiryDate);
        const currentStepIdx = CD_WORKFLOW_STEPS.indexOf(currentWorkflow) !== -1 ? CD_WORKFLOW_STEPS.indexOf(currentWorkflow) : 0;
        const amcCostVal = parseFloat(cert.amcCost) || 0;
        const certFeeVal = parseFloat(cert.certFee) || 0;
        const reinspectionFeeVal = parseFloat(cert.reinspectionFee) || 0;
        const totalComplianceSpend = amcCostVal + certFeeVal + reinspectionFeeVal;

        const modalContent = `
            <div class="space-y-5 text-slate-800 dark:text-slate-100">
                <!-- Top Header Summary Bar -->
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sharjah Civil Defence Compliance Certificate</span>
                        <h3 class="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span>${cert.propertyNumber}</span>
                        </h3>
                        <p class="text-xs text-slate-500">${(cert.propertyType || 'Warehouse').toUpperCase()} &bull; ${cert.phase || 'Phase 1'} &bull; Approved Contractor: <b class="text-slate-700 dark:text-slate-200">${cert.amcContractor || 'Not Assigned'}</b></p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1.5 text-xs font-bold rounded-full ${cert.amcOnly ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : validity.bg}">
                            ${cert.amcOnly ? '🏢 Lifetime AMC Contract' : `${validity.text} (${window.formatDate(cert.expiryDate)})`}
                        </span>
                    </div>
                </div>

                <!-- 6-Stage Visual Milestone Progress Stepper -->
                <div class="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Civil Defence Renewal & Inspection Milestone Stepper</h4>
                        <span class="text-xs font-bold text-amber-600 dark:text-amber-400">Step ${currentStepIdx + 1} of 6</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        ${CD_WORKFLOW_STEPS.map((step, idx) => {
                            const isPassed = idx <= currentStepIdx;
                            const isCurrent = idx === currentStepIdx;
                            return `
                            <div class="cd-stepper-item p-2.5 rounded-lg border text-center transition cursor-pointer ${isCurrent ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm' : isPassed ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 border-slate-200 dark:border-slate-800'}" data-step="${step}">
                                <div class="text-[10px] uppercase font-bold tracking-wider mb-0.5 opacity-80">Step ${idx + 1}</div>
                                <div class="text-[11px] leading-tight">${step}</div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Inspection Schedule Card -->
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Civil Defence Site Inspection</span>
                        <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400">${cert.inspectionDate ? 'Scheduled' : 'Not Set'}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                            <label class="text-[10px] text-slate-400 block font-bold uppercase mb-1">Scheduled Date</label>
                            <input type="date" id="detail-cd-inspection-date" value="${cert.inspectionDate || ''}" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-400 block font-bold uppercase mb-1">Inspector / Officer Name</label>
                            <input type="text" id="detail-cd-inspector-name" value="${cert.inspectorName || ''}" placeholder="e.g. Lt. Ahmed / CD Team" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                    </div>
                    <button id="btn-save-inspection" class="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition">
                        💾 Update Inspection Details
                    </button>
                </div>

                <!-- Document & Receipts Vault (5 Files / Links) -->
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">📁 Document & Receipts Vault</span>
                        <span class="text-[10px] text-slate-400">Click to open attached file / folder link</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        <!-- 1. AMC Agreement -->
                        <div class="p-3 rounded-lg border bg-white dark:bg-slate-800 ${cert.amcDocLink ? 'border-sky-300 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between">
                            <div class="truncate mr-2">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">📄 AMC Agreement</div>
                                <div class="text-[10px] text-slate-400 truncate">${cert.amcContractor || 'Fire Contractor'}</div>
                            </div>
                            ${cert.amcDocLink ? `
                            <a href="${cert.amcDocLink}" target="_blank" class="px-2.5 py-1 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded shadow-2xs transition">Open</a>
                            ` : `<span class="text-[10px] text-slate-400 italic">Not Attached</span>`}
                        </div>

                        <!-- 2. AMC Payment Receipt -->
                        <div class="p-3 rounded-lg border bg-white dark:bg-slate-800 ${cert.amcReceiptLink ? 'border-emerald-300 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between">
                            <div class="truncate mr-2">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">🧾 AMC Payment Receipt</div>
                                <div class="text-[10px] text-slate-400 font-mono">${amcCostVal ? amcCostVal.toFixed(2) + ' AED' : 'Amount not set'}</div>
                            </div>
                            ${cert.amcReceiptLink ? `
                            <a href="${cert.amcReceiptLink}" target="_blank" class="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition">Open</a>
                            ` : `<span class="text-[10px] text-slate-400 italic">Not Attached</span>`}
                        </div>

                        <!-- 3. Certificate Fee Receipt -->
                        <div class="p-3 rounded-lg border bg-white dark:bg-slate-800 ${cert.certFeeReceiptLink ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between">
                            <div class="truncate mr-2">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">🧾 Cert Fee Receipt</div>
                                <div class="text-[10px] text-slate-400 font-mono">${certFeeVal ? certFeeVal.toFixed(2) + ' AED' : 'Govt Issuance Fee'}</div>
                            </div>
                            ${cert.certFeeReceiptLink ? `
                            <a href="${cert.certFeeReceiptLink}" target="_blank" class="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded shadow-2xs transition">Open</a>
                            ` : `<span class="text-[10px] text-slate-400 italic">Not Attached</span>`}
                        </div>

                        <!-- 4. Re-inspection Fee Receipt -->
                        <div class="p-3 rounded-lg border bg-white dark:bg-slate-800 ${cert.reinspectionReceiptLink ? 'border-purple-300 dark:border-purple-800' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between">
                            <div class="truncate mr-2">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">🧾 Re-inspection Receipt</div>
                                <div class="text-[10px] text-slate-400 font-mono">${reinspectionFeeVal ? reinspectionFeeVal.toFixed(2) + ' AED' : 'No Re-inspection'}</div>
                            </div>
                            ${cert.reinspectionReceiptLink ? `
                            <a href="${cert.reinspectionReceiptLink}" target="_blank" class="px-2.5 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded shadow-2xs transition">Open</a>
                            ` : `<span class="text-[10px] text-slate-400 italic">Not Attached</span>`}
                        </div>

                        <!-- 5. SCD Compliance Certificate -->
                        <div class="p-3 rounded-lg border bg-white dark:bg-slate-800 ${cert.certificateLink ? 'border-emerald-400 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between sm:col-span-2 lg:col-span-2">
                            <div class="truncate mr-2">
                                <div class="text-[11px] font-bold text-slate-800 dark:text-white truncate">📜 SCD Compliance Certificate</div>
                                <div class="text-[10px] text-slate-400">Official Safety Certificate Document</div>
                            </div>
                            ${cert.certificateLink ? `
                            <a href="${cert.certificateLink}" target="_blank" class="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition">Open Certificate PDF</a>
                            ` : `<span class="text-[10px] text-slate-400 italic">Not Attached</span>`}
                        </div>
                    </div>
                </div>

                <!-- Financials & Cost Breakdown -->
                <div class="p-4 rounded-xl bg-amber-50/40 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-700 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">💰 Compliance Cost Breakdown & Expenses</span>
                        <div class="text-xs font-bold text-amber-950 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/60 px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-700">
                            Total Spend: <span class="font-mono text-sm">${totalComplianceSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span class="text-[10px] font-bold text-slate-400 uppercase block">1. AMC Maintenance Cost</span>
                            <b class="text-sm font-mono text-slate-800 dark:text-slate-100">${amcCostVal.toFixed(2)} AED</b>
                            <div class="text-[10px] text-slate-400 truncate mt-0.5">${cert.amcContractor || 'Contractor not set'}</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span class="text-[10px] font-bold text-slate-400 uppercase block">2. CD Certificate Fee</span>
                            <b class="text-sm font-mono text-slate-800 dark:text-slate-100">${certFeeVal.toFixed(2)} AED</b>
                            <div class="text-[10px] text-slate-400 truncate mt-0.5">Govt Issuance Fee</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span class="text-[10px] font-bold text-slate-400 uppercase block">3. Re-inspection Fee (If any)</span>
                            <b class="text-sm font-mono ${reinspectionFeeVal ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}">${reinspectionFeeVal ? reinspectionFeeVal.toFixed(2) + ' AED' : '0.00 AED'}</b>
                            <div class="text-[10px] text-slate-400 truncate mt-0.5">${reinspectionFeeVal ? 'Penalty / Re-visit Fee' : 'None'}</div>
                        </div>
                    </div>
                </div>

                <!-- Re-inspection Reason / Remarks Tab -->
                <div class="p-4 rounded-xl bg-purple-50/40 dark:bg-slate-900 border border-purple-200/80 dark:border-slate-700 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wide">🔍 Re-inspection Reason & Remarks</span>
                        <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400">${cert.reinspectionFee || cert.reinspectionRemarks ? 'Re-inspection Logged' : 'Standard Inspection'}</span>
                    </div>
                    <div>
                        <textarea id="detail-cd-reinspection-remarks" rows="2" placeholder="Note down why reinspection was done for this property (e.g. Emergency light battery failure, exit blockage, smoke detector replacement required)..." class="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500">${cert.reinspectionRemarks || ''}</textarea>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                            <label class="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Re-inspection Fee (AED):</label>
                            <input type="number" id="detail-cd-reinspection-fee" step="0.01" value="${cert.reinspectionFee || ''}" placeholder="0.00" class="w-32 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-purple-700 dark:text-purple-300 outline-none">
                        </div>
                        <button id="btn-save-reinspection" class="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition">
                            💾 Save Re-inspection Notes
                        </button>
                    </div>
                </div>

                <!-- Dates & Overview Info -->
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div><span class="text-slate-400 block text-[10px] uppercase font-bold">ISSUE DATE</span><b class="text-slate-800 dark:text-slate-100 font-mono">${window.formatDate(cert.issueDate)}</b></div>
                        <div><span class="text-slate-400 block text-[10px] uppercase font-bold">EXPIRY DATE</span><b class="text-slate-800 dark:text-slate-100 font-mono">${cert.amcOnly ? 'AMC Only (No Expiry)' : window.formatDate(cert.expiryDate)}</b></div>
                        <div><span class="text-slate-400 block text-[10px] uppercase font-bold">GENERAL NOTES</span><span class="text-slate-700 dark:text-slate-300">${cert.notes || '-'}</span></div>
                    </div>
                </div>

                <!-- Renewal & Expiry History Archive -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Civil Defence Certificate History</h4>
                        <button id="btn-cd-detail-renew" class="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                            <span>+ Log New CD Renewal</span>
                        </button>
                    </div>
                    <div class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
                        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left">
                            <thead class="bg-slate-50 dark:bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase">
                                <tr>
                                    <th class="px-4 py-2">Record</th>
                                    <th class="px-4 py-2">Issue Date</th>
                                    <th class="px-4 py-2">Expiry Date</th>
                                    <th class="px-4 py-2">Workflow / AMC</th>
                                    <th class="px-4 py-2">Total Cost</th>
                                    <th class="px-4 py-2">Document</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                                <!-- Current Active Row -->
                                <tr class="bg-amber-50/40 dark:bg-slate-800/40">
                                    <td class="px-4 py-2 font-bold text-amber-700 dark:text-amber-400">Current Certificate</td>
                                    <td class="px-4 py-2 font-mono">${window.formatDate(cert.issueDate)}</td>
                                    <td class="px-4 py-2 font-mono">${cert.amcOnly ? 'AMC Only' : window.formatDate(cert.expiryDate)}</td>
                                    <td class="px-4 py-2 font-semibold text-slate-700 dark:text-slate-200">${currentWorkflow}</td>
                                    <td class="px-4 py-2 font-mono text-amber-700 dark:text-amber-300 font-bold">${totalComplianceSpend.toFixed(2)} AED</td>
                                    <td class="px-4 py-2">
                                        ${cert.certificateLink ? `<a href="${cert.certificateLink}" target="_blank" class="text-sky-600 font-bold underline">View PDF</a>` : '-'}
                                    </td>
                                </tr>
                                <!-- Archived Rows -->
                                ${(window.historyData[id] || []).map(h => `
                                    <tr>
                                        <td class="px-4 py-2 text-slate-400">Archived Record</td>
                                        <td class="px-4 py-2 font-mono">${window.formatDate(h.issueDate)}</td>
                                        <td class="px-4 py-2 font-mono">${window.formatDate(h.expiryDate)}</td>
                                        <td class="px-4 py-2 text-slate-400">${h.workflowStatus || 'Expired'}</td>
                                        <td class="px-4 py-2 font-mono text-slate-400">${((parseFloat(h.amcCost) || 0) + (parseFloat(h.certFee) || 0) + (parseFloat(h.reinspectionFee) || 0)).toFixed(2)} AED</td>
                                        <td class="px-4 py-2">
                                            ${h.certificateLink ? `<a href="${h.certificateLink}" target="_blank" class="text-sky-600 underline">Archived PDF</a>` : '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Bottom Modal Actions -->
                <div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button id="btn-cd-detail-amend" class="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition">
                        ✏️ Amend Certificate Details
                    </button>
                    <div class="flex items-center gap-3">
                        <button id="btn-cd-detail-close" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Close</button>
                        <button id="btn-cd-detail-renew-action" class="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/></svg>
                            <span>Renew Civil Defence</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        window.showModal(`Civil Defence 360°: ${cert.propertyNumber}`, modalContent, () => {
            // Clickable Stepper items
            document.querySelectorAll('.cd-stepper-item').forEach(el => {
                el.addEventListener('click', () => {
                    cert.workflowStatus = el.dataset.step;
                    window.saveDataToFirebase();
                    window.hideModal();
                    handleShowCdDetailsModal(id);
                    window.renderAll();
                });
            });

            // Update Inspection
            document.getElementById('btn-save-inspection')?.addEventListener('click', () => {
                cert.inspectionDate = document.getElementById('detail-cd-inspection-date').value;
                cert.inspectorName = document.getElementById('detail-cd-inspector-name').value.trim();
                if (cert.inspectionDate && cert.workflowStatus === 'Renewal Pending') {
                    cert.workflowStatus = 'Inspection Date';
                }
                window.saveDataToFirebase();
                window.renderAll();
                alert("Inspection details updated!");
            });

            // Save Re-inspection Notes & Fee
            document.getElementById('btn-save-reinspection')?.addEventListener('click', () => {
                cert.reinspectionRemarks = document.getElementById('detail-cd-reinspection-remarks').value.trim();
                cert.reinspectionFee = document.getElementById('detail-cd-reinspection-fee').value;
                window.saveDataToFirebase();
                window.hideModal();
                handleShowCdDetailsModal(id);
                window.renderAll();
                alert("Re-inspection notes & fee saved!");
            });

            // Amend & Renew
            document.getElementById('btn-cd-detail-amend')?.addEventListener('click', () => {
                window.hideModal();
                handleShowForm('Civil Defence', id);
            });

            document.getElementById('btn-cd-detail-renew')?.addEventListener('click', () => {
                window.hideModal();
                handleShowRenewalModal(id);
            });

            document.getElementById('btn-cd-detail-renew-action')?.addEventListener('click', () => {
                window.hideModal();
                handleShowRenewalModal(id);
            });

            document.getElementById('btn-cd-detail-close')?.addEventListener('click', window.hideModal);
        });
    }

    // --------------------------------------------------------------
    // 3. RENEWAL MODAL (For both AMAN and CD)
    // --------------------------------------------------------------
    function handleShowRenewalModal(id) {
        const cert = window.amanCerts.find(c => c.id === id) || window.cdCerts.find(c => c.id === id);
        if (!cert) return;
        const isCD = window.cdCerts.some(c => c.id === id);

        const today = new Date().toISOString().split('T')[0];
        const defaultExp = new Date();
        defaultExp.setFullYear(defaultExp.getFullYear() + 1);
        const defaultExpStr = defaultExp.toISOString().split('T')[0];

        const modalContent = `
            <form id="gov-renewal-form" class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Log official renewal cycle for: <b class="text-sky-600 dark:text-sky-400 font-bold">${cert.propertyNumber}</b></p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Payment / Transaction Date *</label>
                        <input type="date" id="inputRenewalDate" value="${today}" required class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">New Expiry Date *</label>
                        <input type="date" id="inputNewExpiry" value="${defaultExpStr}" required class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">${isCD ? 'AMC Maintenance Cost (AED)' : 'Renewal Fee (AED)'}</label>
                        <input type="number" step="0.01" id="inputRenewalCost" placeholder="e.g. 1500.00" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Payment Receipt / Certificate Link</label>
                        <input type="text" id="inputRenewalReceipt" placeholder="https://... or C:/Path/To/Receipt.pdf" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" id="renewal-cancel" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
                    <button type="submit" class="px-5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm">Save & Update Expiry</button>
                </div>
            </form>
        `;

        window.showModal(`Record Renewal: ${cert.propertyNumber}`, modalContent, () => {
            document.getElementById('gov-renewal-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const date = document.getElementById('inputRenewalDate').value;
                const newExpiry = document.getElementById('inputNewExpiry').value;
                const cost = document.getElementById('inputRenewalCost').value;
                const link = document.getElementById('inputRenewalReceipt').value;

                // Archive old record
                if (!window.historyData[id]) window.historyData[id] = [];
                window.historyData[id].push({
                    ...cert,
                    archivedAt: new Date().toISOString()
                });

                // Update main record
                cert.expiryDate = newExpiry;
                if (isCD) {
                    cert.workflowStatus = 'Certificate ready';
                    if (link) cert.certificateLink = link;
                    if (cost) cert.amcCost = cost;
                } else {
                    cert.workflowStatus = 'Certificate ready';
                    if (link) cert.certificateLink = link;
                    if (!cert.renewalHistory) cert.renewalHistory = [];
                    cert.renewalHistory.unshift({
                        id: crypto.randomUUID(),
                        type: 'Annual Renewal',
                        date: date,
                        expiryDate: newExpiry,
                        cost: parseFloat(cost) || 0,
                        receiptLink: link
                    });
                }

                window.saveDataToFirebase();
                window.hideModal();
                if (isCD) handleShowCdDetailsModal(id);
                else window.handleShowDetailsModal(id);
                window.renderAll();
            });
            document.getElementById('renewal-cancel').addEventListener('click', window.hideModal);
        });
    }

    // --------------------------------------------------------------
    // 4. ADD / EDIT MODAL FORM
    // --------------------------------------------------------------
    function handleShowForm(type, id = null) {
        const isEdit = !!id;
        const dataArray = type === 'Civil Defence' ? window.cdCerts : window.amanCerts;
        const cert = isEdit ? dataArray.find(c => c.id === id) : {};
        const isCD = type === 'Civil Defence';

        const formContent = `
            <form id="gov-cert-form" class="space-y-4">
                <input type="hidden" name="id" value="${cert.id || ''}">
                <input type="hidden" name="project" value="${cert.project || window.currentProject}">

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Establishment / Property No. *</label>
                        <input type="text" name="propertyNumber" value="${cert.propertyNumber || ''}" required class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-sky-500" placeholder="e.g. WALZ 226 or OPY 04">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Property Type</label>
                        <select name="propertyType" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                            <option value="warehouse" ${cert.propertyType === 'warehouse' ? 'selected' : ''}>Warehouse</option>
                            <option value="opy" ${cert.propertyType === 'opy' ? 'selected' : ''}>OPY (Open Yard)</option>
                            <option value="admin building" ${cert.propertyType === 'admin building' ? 'selected' : ''}>Admin Building</option>
                            <option value="others" ${cert.propertyType === 'others' ? 'selected' : ''}>Others</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Phase / Sector</label>
                        <input type="text" name="phase" value="${cert.phase || 'Phase 1'}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" placeholder="e.g. Phase 1">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Workflow Status</label>
                        <select name="workflowStatus" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                            ${isCD ? `
                            <option value="Renewal Pending" ${cert.workflowStatus === 'Renewal Pending' ? 'selected' : ''}>Renewal Pending</option>
                            <option value="Informed Fire team" ${cert.workflowStatus === 'Informed Fire team' ? 'selected' : ''}>Informed Fire team</option>
                            <option value="AMC ready" ${cert.workflowStatus === 'AMC ready' ? 'selected' : ''}>AMC ready</option>
                            <option value="Awaiting inspection" ${cert.workflowStatus === 'Awaiting inspection' ? 'selected' : ''}>Awaiting inspection</option>
                            <option value="Inspection Date" ${cert.workflowStatus === 'Inspection Date' ? 'selected' : ''}>Inspection Date</option>
                            <option value="Certificate ready" ${cert.workflowStatus === 'Certificate ready' ? 'selected' : ''}>Certificate ready</option>
                            ` : `
                            <option value="Installation in Progress" ${cert.workflowStatus === 'Installation in Progress' ? 'selected' : ''}>Installation in Progress</option>
                            <option value="Pending Renewal" ${cert.workflowStatus === 'Pending Renewal' ? 'selected' : ''}>Pending Renewal</option>
                            <option value="Certificate ready" ${cert.workflowStatus === 'Certificate ready' ? 'selected' : ''}>Certificate ready / Monitored</option>
                            `}
                        </select>
                    </div>
                </div>

                ${!isCD ? `
                <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">🔥 Fire Alarm Panel & Document Release</span>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Panel Health Status</label>
                            <select id="form-panel-health" name="panelHealth" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                                <option value="Healthy" ${cert.panelHealth === 'Healthy' ? 'selected' : ''}>🟢 Healthy (No Faults)</option>
                                <option value="Not Healthy" ${cert.panelHealth === 'Not Healthy' ? 'selected' : ''}>🔴 Not Healthy (Faults Reported)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Document Release Type</label>
                            <select id="form-doc-type" name="docType" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                                <option value="certificate" ${cert.docType === 'certificate' ? 'selected' : ''}>📜 Compliance Certificate</option>
                                <option value="receipt" ${cert.docType === 'receipt' ? 'selected' : ''}>🧾 Payment Receipt (Panel Pending)</option>
                            </select>
                        </div>
                        <div id="form-faults-container" class="${cert.panelHealth === 'Not Healthy' ? '' : 'hidden'} sm:col-span-2">
                            <label class="block text-[11px] font-bold text-red-600 uppercase mb-1">Reported Panel Faults / Trouble Signals</label>
                            <input type="text" name="panelFaults" value="${cert.panelFaults || ''}" placeholder="e.g. Trouble signal, Main loop short, Battery disconn." class="w-full bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg px-2.5 py-1.5 text-xs text-red-900 dark:text-red-200 outline-none">
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${isCD ? `
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Issue Date</label>
                        <input type="date" name="issueDate" value="${cert.issueDate || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                    ` : ''}
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Expiry Date</label>
                        <input type="date" name="expiryDate" value="${cert.expiryDate || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">
                    </div>
                </div>

                ${!isCD ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Record ID / Code</label>
                        <input type="text" name="recordId" value="${cert.recordId || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" placeholder="e.g. ADBD-0825-001488">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Device ID</label>
                        <input type="text" name="deviceId" value="${cert.deviceId || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" placeholder="Device Identifier">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Serial Number</label>
                        <input type="text" name="serialNumber" value="${cert.serialNumber || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" placeholder="Device Serial No.">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Account ID</label>
                        <input type="text" name="accountId" value="${cert.accountId || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" placeholder="Account Reference">
                    </div>
                </div>
                ` : ''}

                ${isCD ? `
                <!-- 1. Maintenance & Inspection Section -->
                <div class="p-3 bg-amber-50/50 dark:bg-slate-900/60 rounded-xl border border-amber-200 dark:border-slate-700 space-y-3">
                    <span class="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">🛡️ Fire Protection Maintenance (AMC) & Inspection</span>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Approved Fire Company (AMC)</label>
                            <input type="text" name="amcContractor" value="${cert.amcContractor || ''}" placeholder="e.g. Bristol Fire / NAFFCO" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">AMC Contract / Ref No.</label>
                            <input type="text" name="amcRef" value="${cert.amcRef || ''}" placeholder="e.g. AMC-2026-08" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Scheduled Inspection Date</label>
                            <input type="date" name="inspectionDate" value="${cert.inspectionDate || ''}" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Inspector / Contact Person</label>
                            <input type="text" name="inspectorName" value="${cert.inspectorName || ''}" placeholder="e.g. Lt. Ahmed / CD Team" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-slate-700">
                        <input type="checkbox" id="amcOnly" name="amcOnly" ${cert.amcOnly ? 'checked' : ''} class="w-4 h-4 text-amber-600 rounded border-slate-300">
                        <label for="amcOnly" class="text-xs font-semibold text-slate-700 dark:text-slate-300">AMC Only / Lifetime Contract (No Expiry Date)</label>
                    </div>
                </div>

                <!-- 2. Financials & Cost Tracking (AED) -->
                <div class="p-3 bg-amber-50/70 dark:bg-slate-900/80 rounded-xl border border-amber-300 dark:border-slate-700 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">💰 Compliance Financials & Fees (AED)</span>
                        <div class="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/50 px-2.5 py-0.5 rounded">
                            Total: <span id="form-total-cost-display" class="font-mono">0.00</span> AED
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">AMC Amount (AED)</label>
                            <input type="number" step="0.01" id="form-amc-cost" name="amcCost" value="${cert.amcCost || ''}" placeholder="0.00" class="form-cost-input w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Certificate Fee (AED)</label>
                            <input type="number" step="0.01" id="form-cert-fee" name="certFee" value="${cert.certFee || ''}" placeholder="0.00" class="form-cost-input w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Re-inspection Fee (AED)</label>
                            <input type="number" step="0.01" id="form-reinspection-fee" name="reinspectionFee" value="${cert.reinspectionFee || ''}" placeholder="0.00" class="form-cost-input w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none">
                        </div>
                    </div>
                </div>

                <!-- 3. Re-inspection Reason / Remarks Tab -->
                <div class="p-3 bg-purple-50/50 dark:bg-slate-900/60 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2">
                    <label class="block text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase">🔍 Re-inspection Reason & Remarks (If any)</label>
                    <textarea name="reinspectionRemarks" rows="2" placeholder="Note down reasons why reinspection was required, points failed, and corrective actions taken..." class="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500">${cert.reinspectionRemarks || ''}</textarea>
                </div>

                <!-- 4. Document & Receipts Vault (Links / Folder Paths) -->
                <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">📁 Document Links & Receipts (Paste File/Folder Path or URL)</span>
                    <div class="space-y-2 text-xs">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">1. AMC Maintenance Agreement File / URL Link</label>
                            <input type="text" name="amcDocLink" value="${cert.amcDocLink || ''}" placeholder="e.g. C:/CivilDefence/Docs/AMC_Contract.pdf or https://..." class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">2. AMC Payment Receipt File / URL Link</label>
                            <input type="text" name="amcReceiptLink" value="${cert.amcReceiptLink || ''}" placeholder="e.g. C:/CivilDefence/Receipts/AMC_Payment_Receipt.pdf or https://..." class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">3. Certificate Fee Receipt File / URL Link</label>
                            <input type="text" name="certFeeReceiptLink" value="${cert.certFeeReceiptLink || ''}" placeholder="e.g. C:/CivilDefence/Receipts/Govt_Fee_Receipt.pdf or https://..." class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">4. Re-inspection Fee Receipt File / URL Link</label>
                            <input type="text" name="reinspectionReceiptLink" value="${cert.reinspectionReceiptLink || ''}" placeholder="e.g. C:/CivilDefence/Receipts/Reinspection_Receipt.pdf or https://..." class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">5. Official SCD Compliance Certificate PDF Link</label>
                            <input type="text" name="certificateLink" value="${cert.certificateLink || ''}" placeholder="e.g. C:/CivilDefence/Certs/Certificate.pdf or https://..." class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white outline-none">
                        </div>
                    </div>
                </div>
                ` : `
                <div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Document URL / PDF Link (Certificate or Receipt)</label>
                    <input type="text" name="certificateLink" value="${cert.certificateLink || ''}" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" placeholder="https://... or C:/Path/To/File.pdf">
                </div>
                `}

                <div>
                    <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">General Notes & Remarks</label>
                    <textarea name="notes" rows="2" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none">${cert.notes || ''}</textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" id="form-cancel" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Cancel</button>
                    <button type="submit" class="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm">${isEdit ? 'Update Record' : 'Save Record'}</button>
                </div>
            </form>
        `;

        window.showModal(`${isEdit ? 'Amend' : 'Add'} ${type}`, formContent, () => {
            const form = document.getElementById('gov-cert-form');
            const panelHealthSelect = document.getElementById('form-panel-health');
            const faultsContainer = document.getElementById('form-faults-container');
            const docTypeSelect = document.getElementById('form-doc-type');

            // Live total calculator in CD form
            if (isCD) {
                const updateTotalDisplay = () => {
                    const amc = parseFloat(document.getElementById('form-amc-cost')?.value) || 0;
                    const fee = parseFloat(document.getElementById('form-cert-fee')?.value) || 0;
                    const reinsp = parseFloat(document.getElementById('form-reinspection-fee')?.value) || 0;
                    const totalEl = document.getElementById('form-total-cost-display');
                    if (totalEl) totalEl.textContent = (amc + fee + reinsp).toFixed(2);
                };
                document.querySelectorAll('.form-cost-input').forEach(inp => {
                    inp.addEventListener('input', updateTotalDisplay);
                });
                updateTotalDisplay();
            }

            if (panelHealthSelect) {
                panelHealthSelect.addEventListener('change', (e) => {
                    const isFault = e.target.value === 'Not Healthy';
                    if (faultsContainer) faultsContainer.classList.toggle('hidden', !isFault);
                    if (isFault && docTypeSelect) {
                        docTypeSelect.value = 'receipt';
                    }
                });
            }

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());

                if (isCD) {
                    payload.amcOnly = document.getElementById('amcOnly')?.checked || false;
                }

                if (isEdit) {
                    const idx = dataArray.findIndex(c => c.id === id);
                    if (idx !== -1) {
                        const old = dataArray[idx];
                        if (old.expiryDate !== payload.expiryDate || old.certificateLink !== payload.certificateLink) {
                            if (!window.historyData[id]) window.historyData[id] = [];
                            window.historyData[id].push({
                                ...old,
                                archivedAt: new Date().toISOString()
                            });
                        }
                        dataArray[idx] = {
                            ...old,
                            ...payload,
                            lastUpdated: new Date().toISOString()
                        };
                    }
                } else {
                    const newId = String(Date.now()) + '-' + crypto.randomUUID().substring(0, 4);
                    const newObj = {
                        ...payload,
                        id: newId,
                        createdAt: new Date().toISOString(),
                        renewalHistory: []
                    };
                    if (payload.installCost || payload.installDate) {
                        newObj.renewalHistory.push({
                            id: crypto.randomUUID(),
                            type: 'Installation',
                            date: payload.installDate || new Date().toISOString().split('T')[0],
                            cost: parseFloat(payload.installCost) || 0
                        });
                    }
                    dataArray.push(newObj);
                }

                window.saveDataToFirebase();
                window.hideModal();
                window.renderAll();
            });

            document.getElementById('form-cancel')?.addEventListener('click', window.hideModal);
        });
    }

    // --------------------------------------------------------------
    // 5. HISTORY & CERTIFICATE POPUP MODALS
    // --------------------------------------------------------------
    function handleShowHistoryModal(id) {
        const cert = window.amanCerts.find(c => c.id === id) || window.cdCerts.find(c => c.id === id);
        if (!cert) return;

        const modalContent = `
            <div class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Historical archive & compliance certificates for: <b class="text-slate-800 dark:text-white">${cert.propertyNumber}</b></p>
                <div class="space-y-3 max-h-72 overflow-y-auto">
                    ${(window.historyData[id] && window.historyData[id].length > 0) ? window.historyData[id].map(h => `
                        <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs">
                            <div class="flex justify-between font-bold">
                                <span>Archived Expiry: <b class="text-red-500">${window.formatDate(h.expiryDate)}</b></span>
                                <span class="text-slate-400 text-[10px]">${h.archivedAt ? new Date(h.archivedAt).toLocaleDateString('en-GB') : ''}</span>
                            </div>
                            ${h.certificateLink ? `<a href="${h.certificateLink}" target="_blank" class="text-sky-600 underline mt-1 inline-block">View Archived PDF</a>` : ''}
                        </div>
                    `).join('') : '<p class="text-xs text-slate-400 text-center py-4">No archived previous records.</p>'}
                </div>
            </div>
        `;
        window.showModal(`History & Archives: ${cert.propertyNumber}`, modalContent);
    }

    function handleShowCertificateModal(id) {
        const cert = window.amanCerts.find(c => c.id === id) || window.cdCerts.find(c => c.id === id);
        if (!cert) return;
        const isReceipt = cert.docType === 'receipt';

        const modalContent = `
            <div class="text-center space-y-4">
                <div class="w-16 h-16 rounded-full ${isReceipt ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'} mx-auto flex items-center justify-center">
                    ${isReceipt ? `
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M12 16h-4"/></svg>
                    ` : `
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    `}
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-800 dark:text-white">${isReceipt ? 'Payment Receipt Proof' : 'Sharjah Civil Defence Compliance Certificate'}</h4>
                    <p class="text-xs text-slate-500 mt-1">Establishment: <b class="text-slate-700 dark:text-slate-200">${cert.propertyNumber}</b></p>
                    <p class="text-xs text-slate-500">Expiry Date: <b class="text-slate-700 dark:text-slate-200 font-mono">${window.formatDate(cert.expiryDate)}</b></p>
                    ${isReceipt ? `<p class="text-xs text-amber-600 font-semibold mt-1">⚠️ Certificate release pending Fire Alarm Panel clearance.</p>` : ''}
                </div>
                ${cert.certificateLink ? `
                <div class="pt-2">
                    <a href="${cert.certificateLink}" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Open ${isReceipt ? 'Payment Receipt PDF' : 'Official Certificate PDF'}
                    </a>
                </div>
                ` : `
                <p class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">No external document URL uploaded for this record.</p>
                `}
            </div>
        `;
        window.showModal(`${isReceipt ? 'Payment Receipt' : 'Compliance Certificate'}: ${cert.propertyNumber}`, modalContent);
    }

    // Attach to window
    window.renderCivilDefenceView = renderCivilDefenceView;
    window.handleShowCdDetailsModal = handleShowCdDetailsModal;
    window.handleShowRenewalModal = handleShowRenewalModal;
    window.handleShowForm = handleShowForm;
    window.handleShowHistoryModal = handleShowHistoryModal;
    window.handleShowCertificateModal = handleShowCertificateModal;
})();
