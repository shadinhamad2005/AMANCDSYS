// ==============================================================
// FINANCIAL & COMPLIANCE REPORTS MODULE (PDF & Excel / CSV)
// ==============================================================

(function() {
    // --------------------------------------------------------------
    // 1. AMAN FINANCIAL REPORT (PDF & CSV)
    // --------------------------------------------------------------
    function handleShowFinancialReportOptions() {
        const modalContent = `
            <div class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Select export format for Aman Financial History:</p>
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-export-fin-pdf" class="p-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex flex-col items-center gap-2 text-xs font-bold shadow-sm transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Download PDF (Report)
                    </button>
                    <button id="btn-export-fin-csv" class="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center gap-2 text-xs font-bold shadow-sm transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/><path d="M10 12h-4"/><path d="M8 8l-2 4 2 4"/></svg>
                        Export Excel / CSV
                    </button>
                </div>
            </div>
        `;
        window.showModal('Aman Financial Report', modalContent, () => {
            document.getElementById('btn-export-fin-pdf')?.addEventListener('click', () => {
                window.hideModal();
                generateAmanFinancialPDF();
            });
            document.getElementById('btn-export-fin-csv')?.addEventListener('click', () => {
                window.hideModal();
                generateAmanFinancialCSV();
            });
        });
    }

    function generateAmanFinancialCSV() {
        const data = (window.amanCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);
        if (data.length === 0) return;

        let csv = "Property Number,Expiry Date,Record ID,Device ID,Serial No,Panel Health,Document Type,Install Cost (AED),Total Renewal (AED),Total Lifetime (AED)\n";
        data.forEach(item => {
            let installCost = parseFloat(item.installCost) || 0;
            let renewalCost = 0;
            (item.renewalHistory || []).forEach(r => {
                if (r.type === 'Installation' && !installCost) installCost = parseFloat(r.cost) || 0;
                else if (r.type !== 'Installation') renewalCost += parseFloat(r.cost) || 0;
            });
            const totalLifetime = installCost + renewalCost;
            csv += `"${item.propertyNumber}","${item.expiryDate || '-'}","${item.recordId || '-'}","${item.deviceId || '-'}","${item.serialNumber || '-'}","${item.panelHealth || 'Healthy'}","${item.docType || 'certificate'}","${installCost.toFixed(2)}","${renewalCost.toFixed(2)}","${totalLifetime.toFixed(2)}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `AMAN_Financial_${window.currentProject}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    function generateAmanFinancialPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        const data = (window.amanCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);

        let sumInstall = 0;
        let sumRenewal = 0;

        const body = data.map(item => {
            let installCost = parseFloat(item.installCost) || 0;
            let renewalCost = 0;
            (item.renewalHistory || []).forEach(r => {
                if (r.type === 'Installation' && !installCost) installCost = parseFloat(r.cost) || 0;
                else if (r.type !== 'Installation') renewalCost += parseFloat(r.cost) || 0;
            });
            const totalLifetime = installCost + renewalCost;
            sumInstall += installCost;
            sumRenewal += renewalCost;

            return [
                item.propertyNumber,
                item.recordId || '-',
                item.serialNumber || '-',
                window.formatDate(item.expiryDate),
                item.panelHealth || 'Healthy',
                `${installCost.toFixed(2)} AED`,
                `${renewalCost.toFixed(2)} AED`,
                `${totalLifetime.toFixed(2)} AED`
            ];
        });

        const grandTotal = sumInstall + sumRenewal;

        body.push([
            'TOTALS',
            `${data.length} Records`,
            '-',
            '-',
            '-',
            `${sumInstall.toFixed(2)} AED`,
            `${sumRenewal.toFixed(2)} AED`,
            `${grandTotal.toFixed(2)} AED`
        ]);

        doc.setFontSize(15);
        doc.text(`Government of Sharjah - AMAN Financial Summary Report`, 14, 16);
        doc.setFontSize(9);
        doc.text(`Sharjah Civil Defence Authority | Project: ${window.currentProject} | Date: ${new Date().toLocaleDateString('en-GB')} | Grand Spend: ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} AED`, 14, 23);

        doc.autoTable({
            startY: 28,
            head: [['Establishment', 'Record ID', 'Serial No', 'Expiry Date', 'Panel Health', 'Installation Fee', 'Total Renewals', 'Total Lifetime Spend']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [3, 105, 161] },
            styles: { fontSize: 8 },
            footStyles: { fillColor: [2, 132, 199], fontStyle: 'bold' }
        });

        doc.save(`AMAN_Financial_Report_${window.currentProject}.pdf`);
    }

    // --------------------------------------------------------------
    // 2. CIVIL DEFENCE FINANCIAL REPORT (PDF & CSV)
    // --------------------------------------------------------------
    function handleShowCdFinancialReportOptions() {
        const modalContent = `
            <div class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Select export format for Civil Defence Compliance & Financials (including AMC, Certificate Fees, and Re-inspection tracking):</p>
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-export-cd-fin-pdf" class="p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex flex-col items-center gap-2 text-xs font-bold shadow-sm transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Download PDF (Report)
                    </button>
                    <button id="btn-export-cd-fin-csv" class="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex flex-col items-center gap-2 text-xs font-bold shadow-sm transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/><path d="M10 12h-4"/><path d="M8 8l-2 4 2 4"/></svg>
                        Export Excel / CSV
                    </button>
                </div>
            </div>
        `;
        window.showModal('Civil Defence Financial & Compliance Report', modalContent, () => {
            document.getElementById('btn-export-cd-fin-pdf')?.addEventListener('click', () => {
                window.hideModal();
                generateCdFinancialPDF();
            });
            document.getElementById('btn-export-cd-fin-csv')?.addEventListener('click', () => {
                window.hideModal();
                generateCdFinancialCSV();
            });
        });
    }

    function generateCdFinancialCSV() {
        const data = (window.cdCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);
        if (data.length === 0) {
            alert("No Civil Defence records to export.");
            return;
        }

        let csv = "Property Number,Property Type,Phase,Expiry Date,Workflow Stage,AMC Contractor,AMC Ref No,AMC Cost (AED),Cert Fee (AED),Re-inspection Fee (AED),Total Compliance Cost (AED),Re-inspection Reason / Remarks,AMC Agreement Link,AMC Payment Receipt Link,Cert Fee Receipt Link,Re-inspection Receipt Link,Certificate Link,Notes\n";
        data.forEach(item => {
            const amcCost = parseFloat(item.amcCost) || 0;
            const certFee = parseFloat(item.certFee) || 0;
            const reinspFee = parseFloat(item.reinspectionFee) || 0;
            const totalCost = amcCost + certFee + reinspFee;

            csv += `"${item.propertyNumber}","${item.propertyType || 'Warehouse'}","${item.phase || 'Phase 1'}","${item.amcOnly ? 'AMC Only' : window.formatDate(item.expiryDate)}","${item.workflowStatus || 'Renewal Pending'}","${item.amcContractor || '-'}","${item.amcRef || '-'}","${amcCost.toFixed(2)}","${certFee.toFixed(2)}","${reinspFee.toFixed(2)}","${totalCost.toFixed(2)}","${(item.reinspectionRemarks || '').replace(/"/g, '""')}","${item.amcDocLink || '-'}","${item.amcReceiptLink || '-'}","${item.certFeeReceiptLink || '-'}","${item.reinspectionReceiptLink || '-'}","${item.certificateLink || '-'}","${(item.notes || '').replace(/"/g, '""')}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Civil_Defence_Financial_${window.currentProject}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    function generateCdFinancialPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        const data = (window.cdCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);

        let totalAmc = 0;
        let totalCert = 0;
        let totalReinsp = 0;

        const body = data.map(item => {
            const amcCost = parseFloat(item.amcCost) || 0;
            const certFee = parseFloat(item.certFee) || 0;
            const reinspFee = parseFloat(item.reinspectionFee) || 0;
            const total = amcCost + certFee + reinspFee;

            totalAmc += amcCost;
            totalCert += certFee;
            totalReinsp += reinspFee;

            return [
                item.propertyNumber,
                `${(item.propertyType || 'Warehouse').toUpperCase()} (${item.phase || 'Phase 1'})`,
                item.workflowStatus || 'Renewal Pending',
                item.amcContractor || '-',
                `${amcCost.toFixed(2)} AED`,
                `${certFee.toFixed(2)} AED`,
                `${reinspFee.toFixed(2)} AED`,
                `${total.toFixed(2)} AED`,
                item.reinspectionRemarks ? item.reinspectionRemarks : '-'
            ];
        });

        const grandTotal = totalAmc + totalCert + totalReinsp;

        body.push([
            'TOTALS',
            `${data.length} Properties`,
            '-',
            '-',
            `${totalAmc.toFixed(2)} AED`,
            `${totalCert.toFixed(2)} AED`,
            `${totalReinsp.toFixed(2)} AED`,
            `${grandTotal.toFixed(2)} AED`,
            '-'
        ]);

        doc.setFontSize(15);
        doc.text(`Sharjah Civil Defence Authority - Compliance & Financial Report`, 14, 16);
        doc.setFontSize(9);
        doc.text(`Project: ${window.currentProject} | Date: ${new Date().toLocaleDateString('en-GB')} | Total Compliance Investment: ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} AED`, 14, 23);

        doc.autoTable({
            startY: 28,
            head: [['Property', 'Type & Phase', 'Workflow Stage', 'AMC Contractor', 'AMC Cost', 'Cert Fee', 'Re-insp Fee', 'Total Cost', 'Re-inspection Notes']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [217, 119, 6] },
            styles: { fontSize: 7.5 },
            footStyles: { fillColor: [245, 158, 11], fontStyle: 'bold' }
        });

        doc.save(`Civil_Defence_Financial_Report_${window.currentProject}.pdf`);
    }

    // --------------------------------------------------------------
    // 3. AMAN STATUS REPORT & JSON IMPORT/EXPORT
    // --------------------------------------------------------------
    function handleShowCustomReportModal() {
        const modalContent = `
            <div class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Select categories to include in the generated PDF status report:</p>
                <div class="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="rep-valid" checked class="text-sky-600 rounded">
                        <span>Valid Establishments</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="rep-near" checked class="text-sky-600 rounded">
                        <span>Near Expiry (Within 30 Days)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="rep-expired" checked class="text-sky-600 rounded">
                        <span>Expired Certificates</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="rep-install" checked class="text-sky-600 rounded">
                        <span>Installation in Progress</span>
                    </label>
                </div>
                <div class="flex justify-end gap-3 pt-2">
                    <button id="rep-cancel" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                    <button id="rep-generate" class="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white">Generate PDF</button>
                </div>
            </div>
        `;

        window.showModal('Generate Status Report', modalContent, () => {
            document.getElementById('rep-generate')?.addEventListener('click', () => {
                const options = {
                    valid: document.getElementById('rep-valid').checked,
                    near: document.getElementById('rep-near').checked,
                    expired: document.getElementById('rep-expired').checked,
                    install: document.getElementById('rep-install').checked
                };
                window.hideModal();
                generateCustomPDFReport(options);
            });
            document.getElementById('rep-cancel')?.addEventListener('click', window.hideModal);
        });
    }

    function generateCustomPDFReport(options) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const data = (window.amanCerts || []).filter(c => (c.project || 'Main Project') === window.currentProject);

        doc.setFontSize(16);
        doc.text(`Government of Sharjah - AMAN Status Report`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Sharjah Civil Defence Authority | Project: ${window.currentProject} | Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 28);

        const filtered = data.filter(c => {
            const s = window.getValidityStatus(c.expiryDate).text;
            if (options.valid && s === 'Valid') return true;
            if (options.near && s === 'Near Expiry') return true;
            if (options.expired && s === 'Due / Expired') return true;
            if (options.install && c.workflowStatus === 'Installation in Progress') return true;
            return false;
        });

        const body = filtered.map(c => [
            c.propertyNumber,
            c.propertyType || 'Warehouse',
            window.formatDate(c.expiryDate),
            c.panelHealth || 'Healthy',
            c.docType === 'receipt' ? 'Receipt' : 'Certificate',
            c.serialNumber || '-'
        ]);

        doc.autoTable({
            startY: 34,
            head: [['Establishment', 'Type', 'Expiry Date', 'Panel Health', 'Document', 'Serial No']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [3, 105, 161] },
            styles: { fontSize: 8 }
        });

        doc.save(`Sharjah_AMAN_Status_Report_${window.currentProject}.pdf`);
    }

    function handleShowImportModal(type) {
        const modalContent = `
            <div class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-300">Paste JSON array of establishments / certificates to import into <b class="text-sky-600">${window.currentProject}</b>:</p>
                <textarea id="import-json" rows="8" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-sky-500" placeholder='[{"propertyNumber": "WALZ 226", "expiryDate": "2026-05-15", "panelHealth": "Healthy", ...}]'></textarea>
                <div class="flex justify-end gap-3 pt-2">
                    <button id="import-cancel" class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700">Cancel</button>
                    <button id="import-submit" class="px-5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white">Import Records</button>
                </div>
            </div>
        `;
        window.showModal('Import JSON Records', modalContent, () => {
            document.getElementById('import-submit')?.addEventListener('click', () => {
                const raw = document.getElementById('import-json').value;
                try {
                    const parsed = JSON.parse(raw);
                    if (!Array.isArray(parsed)) throw new Error("Expected JSON array");

                    const target = type === 'Civil Defence' ? window.cdCerts : window.amanCerts;
                    parsed.forEach(item => {
                        if (!item.propertyNumber) return;
                        target.push({
                            ...item,
                            id: item.id || String(Date.now()) + '-' + crypto.randomUUID().substring(0, 4),
                            project: window.currentProject,
                            panelHealth: item.panelHealth || 'Healthy',
                            panelFaults: item.panelFaults || '',
                            docType: item.docType || 'certificate',
                            installCost: item.installCost || '',
                            installDate: item.installDate || '',
                            installReceiptLink: item.installReceiptLink || '',
                            createdAt: new Date().toISOString(),
                            renewalHistory: item.renewalHistory || []
                        });
                    });

                    window.saveDataToFirebase();
                    window.hideModal();
                    window.renderAll();
                } catch (e) {
                    alert("Invalid JSON data. Please verify format.");
                }
            });
            document.getElementById('import-cancel')?.addEventListener('click', window.hideModal);
        });
    }

    function handleExportData(type, data) {
        const filtered = (data || []).filter(c => (c.project || 'Main Project') === window.currentProject);
        const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `AMAN_Export_${window.currentProject}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // Attach to window
    window.handleShowFinancialReportOptions = handleShowFinancialReportOptions;
    window.generateAmanFinancialCSV = generateAmanFinancialCSV;
    window.generateAmanFinancialPDF = generateAmanFinancialPDF;
    window.handleShowCdFinancialReportOptions = handleShowCdFinancialReportOptions;
    window.generateCdFinancialCSV = generateCdFinancialCSV;
    window.generateCdFinancialPDF = generateCdFinancialPDF;
    window.handleShowCustomReportModal = handleShowCustomReportModal;
    window.generateCustomPDFReport = generateCustomPDFReport;
    window.handleShowImportModal = handleShowImportModal;
    window.handleExportData = handleExportData;
})();
