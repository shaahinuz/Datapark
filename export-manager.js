// Export functionality for CSV and DOCX generation
class ExportManager {
    constructor() {
        this.storageManager = new StorageManager();
    }

    async generatePeriodTemplateCSV(result) {
        const { period1, period2 } = result;
        
        const period1Year = this.extractYear(period1.key);
        const period1Quarter = this.extractQuarter(period1.key);
        const period2Year = this.extractYear(period2.key);
        const period2Quarter = this.extractQuarter(period2.key);
        
        const allData = await this.storageManager.getAllData();
        const period1Districts = Object.keys(allData)
            .filter(key => key.startsWith('district_') && key.includes(`${period1Year}-${period1Quarter}`))
            .map(key => ({
                key,
                name: this.extractDistrictName(key.replace('district_', '')),
                data: allData[key]
            }));
        
        const period2Districts = Object.keys(allData)
            .filter(key => key.startsWith('district_') && key.includes(`${period2Year}-${period2Quarter}`))
            .map(key => ({
                key,
                name: this.extractDistrictName(key.replace('district_', '')),
                data: allData[key]
            }));
        
        let csvContent = '';
        csvContent += `,,"<b>${period2Year} йил ${this.getUzbekQuarterText(period2Quarter)}</b>",,,"<b>${period1Year} йил ${this.getUzbekQuarterText(period1Quarter)}</b>",,,,,\n`;
        
        csvContent += '"<b>Ҳудудлар</b>",';
        csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>","<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Экспорт (минг АҚШ доллари)</b>",';
        csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>",';
        csvContent += '"<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>",';
        csvContent += '"<b>Экспорт (минг АҚШ доллари)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>"\n';
        
        // Жами row
        csvContent += 'Жами:,';
        csvContent += `${period2.data.totalResidents || 0},`;
        csvContent += `${period2.data.employeeCount || 0},`;
        csvContent += `${(period2.data.totalIncome || 0).toFixed(2)},`;
        csvContent += `${(period2.data.exportVolume || 0).toFixed(2)},`;
        csvContent += `${period1.data.totalResidents || 0},`;
        csvContent += `${period1.data.employeeCount || 0},`;
        
        const incomeChange = (period1.data.totalIncome || 0) - (period2.data.totalIncome || 0);
        const incomeGrowthRate = period2.data.totalIncome ? ((incomeChange / period2.data.totalIncome) * 100) : 0;
        csvContent += `${(period1.data.totalIncome || 0).toFixed(2)},`;
        csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(2)},`;
        csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
        
        const exportChange = (period1.data.exportVolume || 0) - (period2.data.exportVolume || 0);
        const exportGrowthRate = period2.data.exportVolume ? ((exportChange / period2.data.exportVolume) * 100) : 0;
        csvContent += `${(period1.data.exportVolume || 0).toFixed(2)},`;
        csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(2)},`;
        csvContent += `${exportGrowthRate.toFixed(2)}%\n`;
        
        const allDistrictNames = new Set();
        period1Districts.forEach(d => allDistrictNames.add(d.name));
        period2Districts.forEach(d => allDistrictNames.add(d.name));
        
        const sortedDistricts = Array.from(allDistrictNames).sort();
        
        sortedDistricts.forEach(districtName => {
            const district1 = period1Districts.find(d => d.name === districtName);
            const district2 = period2Districts.find(d => d.name === districtName);
            
            csvContent += `${districtName},`;
            
            if (district2) {
                csvContent += `${district2.data.totalResidents || 0},`;
                csvContent += `${district2.data.employeeCount || 0},`;
                csvContent += `${(district2.data.totalIncome || 0).toFixed(2)},`;
                csvContent += `${(district2.data.exportVolume || 0).toFixed(2)},`;
            } else {
                csvContent += 'No data,No data,No data,No data,';
            }
            
            if (district1) {
                csvContent += `${district1.data.totalResidents || 0},`;
                csvContent += `${district1.data.employeeCount || 0},`;
                
                if (district2) {
                    const distIncomeChange = (district1.data.totalIncome || 0) - (district2.data.totalIncome || 0);
                    const distIncomeGrowthRate = district2.data.totalIncome ? ((distIncomeChange / district2.data.totalIncome) * 100) : 0;
                    csvContent += `${(district1.data.totalIncome || 0).toFixed(2)},`;
                    csvContent += `${distIncomeChange > 0 ? '+' : ''}${distIncomeChange.toFixed(2)},`;
                    csvContent += `${distIncomeGrowthRate.toFixed(2)}%,`;
                    
                    const distExportChange = (district1.data.exportVolume || 0) - (district2.data.exportVolume || 0);
                    const distExportGrowthRate = district2.data.exportVolume ? ((distExportChange / district2.data.exportVolume) * 100) : 0;
                    csvContent += `${(district1.data.exportVolume || 0).toFixed(2)},`;
                    csvContent += `${distExportChange > 0 ? '+' : ''}${distExportChange.toFixed(2)},`;
                    csvContent += `${distExportGrowthRate.toFixed(2)}%`;
                } else {
                    csvContent += `${(district1.data.totalIncome || 0).toFixed(2)},New district,New district,`;
                    csvContent += `${(district1.data.exportVolume || 0).toFixed(2)},New district,New district`;
                }
            } else {
                csvContent += 'No data,No data,No data,No data,No data,No data,No data,No data';
            }
            csvContent += '\n';
        });
        
        return csvContent;
    }

    async generateTemplateCSV(result) {
        const { period1, period2 } = result;
        
        const districtName = this.extractDistrictName(period1.key);
        const period1Year = this.extractYear(period1.key);
        const period1Quarter = this.extractQuarter(period1.key);
        const period2Year = this.extractYear(period2.key);
        const period2Quarter = this.extractQuarter(period2.key);
        
        const regionPeriod1Key = `period_${period1Year}-${period1Quarter}`;
        const regionPeriod2Key = `period_${period2Year}-${period2Quarter}`;
        
        const storedData = await this.storageManager.getData([regionPeriod1Key, regionPeriod2Key]);
        const regionData1 = storedData[regionPeriod1Key];
        const regionData2 = storedData[regionPeriod2Key];
        
        let csvContent = '';
        csvContent += `,,"<b>${period2Year} йил ${this.getUzbekQuarterText(period2Quarter)}</b>",,,"<b>${period1Year} йил ${this.getUzbekQuarterText(period1Quarter)}</b>",,,,,\n`;
        
        csvContent += '"<b>Ҳудудлар</b>",';
        csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>","<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Экспорт (минг АҚШ доллари)</b>",';
        csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>",';
        csvContent += '"<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>",';
        csvContent += '"<b>Экспорт (минг АҚШ доллари)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>"\n';
        
        // Жами row
        csvContent += 'Жами:,';
        if (regionData2) {
            csvContent += `${regionData2.totalResidents || 0},`;
            csvContent += `${regionData2.employeeCount || 0},`;
            csvContent += `${(regionData2.totalIncome || 0).toFixed(2)},`;
            csvContent += `${(regionData2.exportVolume || 0).toFixed(2)},`;
        } else {
            csvContent += 'Data not saved,Data not saved,Data not saved,Data not saved,';
        }
        
        if (regionData1) {
            csvContent += `${regionData1.totalResidents || 0},`;
            csvContent += `${regionData1.employeeCount || 0},`;
            
            if (regionData2 && regionData1) {
                const incomeChange = (regionData1.totalIncome || 0) - (regionData2.totalIncome || 0);
                const incomeGrowthRate = regionData2.totalIncome ? ((incomeChange / regionData2.totalIncome) * 100) : 0;
                csvContent += `${(regionData1.totalIncome || 0).toFixed(2)},`;
                csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(2)},`;
                csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
                
                const exportChange = (regionData1.exportVolume || 0) - (regionData2.exportVolume || 0);
                const exportGrowthRate = regionData2.exportVolume ? ((exportChange / regionData2.exportVolume) * 100) : 0;
                csvContent += `${(regionData1.exportVolume || 0).toFixed(2)},`;
                csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(2)},`;
                csvContent += `${exportGrowthRate.toFixed(2)}%`;
            } else {
                csvContent += `${(regionData1.totalIncome || 0).toFixed(2)},Data not saved,Data not saved,`;
                csvContent += `${(regionData1.exportVolume || 0).toFixed(2)},Data not saved,Data not saved`;
            }
        } else {
            csvContent += 'Data not saved,Data not saved,Data not saved,Data not saved,Data not saved,Data not saved';
        }
        csvContent += '\n';
        
        // District row
        csvContent += `${districtName},`;
        csvContent += `${period2.data.totalResidents || 0},`;
        csvContent += `${period2.data.employeeCount || 0},`;
        csvContent += `${(period2.data.totalIncome || 0).toFixed(2)},`;
        csvContent += `${(period2.data.exportVolume || 0).toFixed(2)},`;
        csvContent += `${period1.data.totalResidents || 0},`;
        csvContent += `${period1.data.employeeCount || 0},`;
        
        const incomeChange = (period1.data.totalIncome || 0) - (period2.data.totalIncome || 0);
        const incomeGrowthRate = period2.data.totalIncome ? ((incomeChange / period2.data.totalIncome) * 100) : 0;
        csvContent += `${(period1.data.totalIncome || 0).toFixed(2)},`;
        csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(2)},`;
        csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
        
        const exportChange = (period1.data.exportVolume || 0) - (period2.data.exportVolume || 0);
        const exportGrowthRate = period2.data.exportVolume ? ((exportChange / period2.data.exportVolume) * 100) : 0;
        csvContent += `${(period1.data.exportVolume || 0).toFixed(2)},`;
        csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(2)},`;
        csvContent += `${exportGrowthRate.toFixed(2)}%`;
        
        return csvContent;
    }

    async generateUzbekReportDOCX(result) {
        const { period1, period2 } = result;
        const data1 = period1.data;
        const data2 = period2.data;
        
        const year1 = this.extractYear(period1.key);
        const quarter1 = this.extractQuarter(period1.key);
        const year2 = this.extractYear(period2.key);
        const quarter2 = this.extractQuarter(period2.key);
        
        const getQuarterText = (quarter) => {
            switch(quarter) {
                case 'Q1': return '1-чорак';
                case 'Q2': return '2-чорак';
                case 'Q3': return '3-чорак';
                case 'Q4': return '4-чорак';
                default: return quarter;
            }
        };
        
        const residentsOld = data2.totalResidents || 0;
        const residentsNew = data1.totalResidents || 0;
        const employeesOld = data2.employeeCount || 0;
        const employeesNew = data1.employeeCount || 0;
        const incomeOld = data2.totalIncome || 0;
        const incomeNew = data1.totalIncome || 0;
        const exportOld = data2.exportVolume || 0;
        const exportNew = data1.exportVolume || 0;
        
        const residentsGrowthPercent = residentsOld ? ((residentsNew / residentsOld) * 100).toFixed(2) : '0.00';
        const employeesGrowthPercent = employeesOld ? ((employeesNew / employeesOld) * 100).toFixed(2) : '0.00';
        const incomeGrowthPercent = incomeOld ? ((incomeNew / incomeOld) * 100).toFixed(2) : '0.00';
        const exportGrowthPercent = exportOld ? ((exportNew / exportOld) * 100).toFixed(2) : '0.00';
        
        let report = `1. АйТи Парк резидентлари сони ${year2} йил ${getQuarterText(quarter2)} ${residentsOld} тани ташкил этган бўлса, ${year1} йил ${getQuarterText(quarter1)} ${residentsNew} тага етказилди (ўсиш суръати ${residentsGrowthPercent} фоизни ташкил этди) 

2. АйТи парк резидентлари томонидан иш билан таъминланганлар сони ${year2} йил ${getQuarterText(quarter2)} ${employeesOld} нафарни ташкил этган бўлса, ушбу кўрсаткич ${year1} йил ${getQuarterText(quarter1)} ${employeesNew} нафарга етди (ўсиш суръати ${employeesGrowthPercent} фоизни ташкил этди).

3. Кўрсатилган хизматлар ҳажми ${year2} йил ${getQuarterText(quarter2)} ${incomeOld.toFixed(2)} млрд.сўм ни ташкил этган бўлса ${year1} йил ${getQuarterText(quarter1)} ${incomeNew.toFixed(2)} млрд.сўмга етиб, ${incomeGrowthPercent} фоизга ошди.

4. Шунингдек, ${year2} йил ${getQuarterText(quarter2)} резидентлар томонидан хизматлар экспорт ҳажми ${exportOld.toFixed(2)} млн.долларни ни ташкил этган бўлса, ушбу кўрсаткич ${year1} йил ${getQuarterText(quarter1)} ${exportNew.toFixed(2)} млн долларлик хизматлар экспорт қилинди.(ўсиш суръати ${exportGrowthPercent} фоизни ташкил этди)`;
        
        return report;
    }

    downloadCSV(csvContent, filename) {
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, filename);
    }

    downloadWordDocument(textContent, filename) {
        let formattedContent = textContent
            .replace(/(\d+(?:\.\d+)?)/g, '<span style="color: red; font-weight: bold;">$1</span>')
            .replace(/(фоиз[^\s]*)/g, '<span style="color: blue; font-weight: bold;">$1</span>')
            .replace(/(%)/g, '<span style="color: blue; font-weight: bold;">$1</span>')
            .replace(/(млрд\.сўм|млн\.доллар)/g, '<span style="color: blue; font-weight: bold;">$1</span>');

        const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word">
<meta name="Originator" content="Microsoft Word">
<style>
@page { margin: 2cm; }
body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.6; }
p { margin: 0; margin-bottom: 15pt; text-align: justify; text-indent: 1.25cm; }
.header { text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 20pt; text-indent: 0; }
</style>
</head>
<body>
<p class="header">Datapark - АйТи Парк Ҳисоботи</p>
${formattedContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>').join('')}
</body>
</html>`;
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + htmlContent], { type: 'application/msword;charset=utf-8;' });
        this.downloadFile(blob, filename.replace('.rtf', '.doc'));
    }

    downloadFile(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Helper functions
    extractDistrictName(key) {
        const parts = key.split('_');
        return parts[0];
    }

    extractPeriod(key) {
        const parts = key.split('_');
        return parts.slice(1).join('_');
    }

    extractYear(key) {
        const match = key.match(/(\d{4})/);
        return match ? match[1] : 'YYYY';
    }

    extractQuarter(key) {
        const match = key.match(/Q(\d)/);
        return match ? `Q${match[1]}` : 'Q1';
    }

    getUzbekQuarterText(quarter) {
        switch(quarter) {
            case 'Q1': return '1-чорак';
            case 'Q2': return '2-чорак';
            case 'Q3': return '3-чорак';
            case 'Q4': return '4-чорак';
            default: return quarter;
        }
    }
}

// Make available globally
window.ExportManager = ExportManager;