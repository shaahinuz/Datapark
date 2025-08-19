// Export functionality matching the exact template format from PDF
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

        return this.createPeriodCSV(period1, period2, period1Districts, period2Districts);
    }

    createPeriodCSV(period1, period2, period1Districts, period2Districts) {
        const period1Year = this.extractYear(period1.key);
        const period1Quarter = this.extractQuarter(period1.key);
        const period2Year = this.extractYear(period2.key);
        const period2Quarter = this.extractQuarter(period2.key);

        // Calculate totals
        const period1Totals = this.calculateTotals(period1Districts);
        const period2Totals = this.calculateTotals(period2Districts);
        
        const totalResidents1 = period1.data.totalResidents || period1Totals.residents;
        const totalEmployees1 = period1.data.employeeCount || period1Totals.employees;
        const totalIncome1 = period1.data.totalIncome || period1Totals.income;
        const totalExport1 = period1.data.exportVolume || period1Totals.export;
        
        const totalResidents2 = period2.data.totalResidents || period2Totals.residents;
        const totalEmployees2 = period2.data.employeeCount || period2Totals.employees;
        const totalIncome2 = period2.data.totalIncome || period2Totals.income;
        const totalExport2 = period2.data.exportVolume || period2Totals.export;
        
        const incomeChange = totalIncome1 - totalIncome2;
        const incomeGrowthRate = totalIncome2 ? ((totalIncome1 / totalIncome2) * 100) : 0;
        const exportChange = totalExport1 - totalExport2;
        const exportGrowthRate = totalExport2 ? ((totalExport1 / totalExport2) * 100) : 0;

        // Generate district rows
        const allDistrictNames = new Set();
        period1Districts.forEach(d => allDistrictNames.add(d.name));
        period2Districts.forEach(d => allDistrictNames.add(d.name));
        const sortedDistricts = Array.from(allDistrictNames).sort();
        
        // Create CSV content
        let csvContent = '';
        
        // Title only
        csvContent += `"${period1Year} йил ${this.getUzbekQuarterText(period1Quarter)} чорагининг IT-Park резидентларининг ҳудудлар кесимида хизматлар ҳажми ва экспорт кўрсаткичлари тўғрисида маълумот"\n`;
        
        // Period headers (first row)
        csvContent += '"","",';  // Empty cells for # and Ҳудудлар
        csvContent += `"${period2Year} йил ${this.getUzbekQuarterText(period2Quarter)}-чорак","","","",`;  // 4 columns for period2
        csvContent += `"${period1Year} йил ${this.getUzbekQuarterText(period1Quarter)}-чорак","","","","","","",""\n`;
        
        // Column headers (second row)
        csvContent += '"#","Ҳудудлар","Резидентлар сони","Ходимлар сони","Хизматлар ҳажми (млрд. сўм)","Экспорт (минг АҚШ доллари)","Резидентлар сони","Ходимлар сони","Хизматлар ҳажми (млрд. сўм)","Хизматлар ўсиши (+/-)","Хизматлар ўсиш суръати (%)","Экспорт (минг АҚШ доллари)","Экспорт ўсиши (+/-)","Экспорт ўсиш суръати (%)"\n';
        
        // Total row
        csvContent += ',"Жами:",';
        csvContent += `${totalResidents2},${totalEmployees2},${totalIncome2.toFixed(3)},${totalExport2.toFixed(3)},`;
        csvContent += `${totalResidents1},${totalEmployees1},${totalIncome1.toFixed(3)},`;
        csvContent += `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(3)},${incomeGrowthRate.toFixed(1)}%,`;
        csvContent += `${totalExport1.toFixed(3)},${exportChange >= 0 ? '+' : ''}${exportChange.toFixed(3)},${exportGrowthRate.toFixed(1)}%\n`;
        
        // District rows
        sortedDistricts.forEach((districtName, index) => {
            const district1 = period1Districts.find(d => d.name === districtName);
            const district2 = period2Districts.find(d => d.name === districtName);
            csvContent += this.generatePeriodDistrictCSVRow(districtName, district1, district2, index + 1);
        });
        
        return csvContent;
    }

    generatePeriodDistrictCSVRow(districtName, district1, district2, rowNumber) {
        let row = `${rowNumber},"${districtName}",`;
        
        // Period 2 data (older) first
        if (district2) {
            row += `${district2.data.totalResidents || 0},`;
            row += `${district2.data.employeeCount || 0},`;
            row += `${(district2.data.totalIncome || 0).toFixed(3)},`;
            row += `${(district2.data.exportVolume || 0).toFixed(3)},`;
        } else {
            row += `0,0,0.000,0.000,`;
        }
        
        // Period 1 data (newer) and calculations
        if (district1) {
            const income1 = district1.data.totalIncome || 0;
            const export1 = district1.data.exportVolume || 0;
            
            row += `${district1.data.totalResidents || 0},`;
            row += `${district1.data.employeeCount || 0},`;
            row += `${income1.toFixed(3)},`;
            
            if (district2) {
                const income2 = district2.data.totalIncome || 0;
                const export2 = district2.data.exportVolume || 0;
                
                const incomeChange = income1 - income2;
                const incomeGrowthRate = income2 !== 0 ? ((income1 / income2) * 100) : (income1 > 0 ? 100 : 0);
                const exportChange = export1 - export2;
                const exportGrowthRate = export2 !== 0 ? ((export1 / export2) * 100) : (export1 > 0 ? 100 : 0);
                
                row += `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(3)},`;
                row += `${incomeGrowthRate.toFixed(1)}%,`;
                row += `${export1.toFixed(3)},`;
                row += `${exportChange >= 0 ? '+' : ''}${exportChange.toFixed(3)},`;
                row += `${exportGrowthRate.toFixed(1)}%`;
            } else {
                row += `+${income1.toFixed(3)},`;
                row += `∞%,`;
                row += `${export1.toFixed(3)},`;
                row += `+${export1.toFixed(3)},`;
                row += `∞%`;
            }
        } else {
            if (district2) {
                const income2 = district2.data.totalIncome || 0;
                const export2 = district2.data.exportVolume || 0;
                row += `0,0,0.000,`;
                row += `-${income2.toFixed(3)},`;
                row += `-100.0%,`;
                row += `0.000,`;
                row += `-${export2.toFixed(3)},`;
                row += `-100.0%`;
            } else {
                row += `0,0,0.000,0.000,0.0%,0.000,0.000,0.0%`;
            }
        }
        
        row += `\n`;
        return row;
    }

    async generateDistrictTemplateCSV(result) {
        // For district comparison, use CSV format
        const { period1, period2 } = result;
        
        const districtName = this.extractDistrictName(period1.key);
        const period1Year = this.extractYear(period1.key);
        const period1Quarter = this.extractQuarter(period1.key);
        const period2Year = this.extractYear(period2.key);
        const period2Quarter = this.extractQuarter(period2.key);
        
        // Calculate changes
        const incomeChange = (period1.data.totalIncome || 0) - (period2.data.totalIncome || 0);
        const incomeGrowthRate = period2.data.totalIncome ? (((period1.data.totalIncome || 0) / period2.data.totalIncome) * 100) : 0;
        const exportChange = (period1.data.exportVolume || 0) - (period2.data.exportVolume || 0);
        const exportGrowthRate = period2.data.exportVolume ? (((period1.data.exportVolume || 0) / period2.data.exportVolume) * 100) : 0;
        
        // Generate CSV content
        let csvContent = '';
        csvContent += `"${period1Year} йил ${this.getUzbekQuarterText(period1Quarter)} чорагининг IT-Park резидентларининг ҳудудлар кесимида хизматлар ҳажми ва экспорт кўрсаткичлари тўғрисида маълумот"\n`;
        
        // Period headers (first row)
        csvContent += '"",';  // Empty cell for Ҳудуд
        csvContent += `"${period2Year} йил ${this.getUzbekQuarterText(period2Quarter)}-чорак","","","",`;  // 4 columns for period2
        csvContent += `"${period1Year} йил ${this.getUzbekQuarterText(period1Quarter)}-чорак","","","","","","",""\n`;  // 8 columns for period1
        
        // Column headers (second row)
        csvContent += '"Ҳудуд",';
        csvContent += '"Резидентлар сони","Ходимлар сони","Хизматлар ҳажми (млрд. сўм)","Экспорт (минг АҚШ доллари)",';
        csvContent += '"Резидентлар сони","Ходимлар сони","Хизматлар ҳажми (млрд. сўм)","Хизматлар ўсиши (+/-)","Хизматлар ўсиш суръати (%)","Экспорт (минг АҚШ доллари)","Экспорт ўсиши (+/-)","Экспорт ўсиш суръати (%)"\n';
        
        // Data row (older period first, then newer period with calculations)
        csvContent += `"${districtName}",`;
        csvContent += `${period2.data.totalResidents || 0},${period2.data.employeeCount || 0},${(period2.data.totalIncome || 0).toFixed(3)},${(period2.data.exportVolume || 0).toFixed(3)},`;
        csvContent += `${period1.data.totalResidents || 0},${period1.data.employeeCount || 0},${(period1.data.totalIncome || 0).toFixed(3)},`;
        csvContent += `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(3)},${incomeGrowthRate.toFixed(1)}%,`;
        csvContent += `${(period1.data.exportVolume || 0).toFixed(3)},${exportChange >= 0 ? '+' : ''}${exportChange.toFixed(3)},${exportGrowthRate.toFixed(1)}%\n`;
        
        return csvContent;
    }

    // Keep existing CSV method for backward compatibility
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
        csvContent += '"<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш суръати (%)</b>",';
        csvContent += '"<b>Экспорт (минг АҚШ доллари)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш суръати (%)</b>"\n';
        
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
                csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(3)},`;
                csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
                
                const exportChange = (regionData1.exportVolume || 0) - (regionData2.exportVolume || 0);
                const exportGrowthRate = regionData2.exportVolume ? ((exportChange / regionData2.exportVolume) * 100) : 0;
                csvContent += `${(regionData1.exportVolume || 0).toFixed(2)},`;
                csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(3)},`;
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
        csvContent += `${(period2.data.totalIncome || 0).toFixed(3)},`;
        csvContent += `${(period2.data.exportVolume || 0).toFixed(3)},`;
        csvContent += `${period1.data.totalResidents || 0},`;
        csvContent += `${period1.data.employeeCount || 0},`;
        
        const incomeChange = (period1.data.totalIncome || 0) - (period2.data.totalIncome || 0);
        const incomeGrowthRate = period2.data.totalIncome ? ((incomeChange / period2.data.totalIncome) * 100) : 0;
        csvContent += `${(period1.data.totalIncome || 0).toFixed(3)},`;
        csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(3)},`;
        csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
        
        const exportChange = (period1.data.exportVolume || 0) - (period2.data.exportVolume || 0);
        const exportGrowthRate = period2.data.exportVolume ? ((exportChange / period2.data.exportVolume) * 100) : 0;
        csvContent += `${(period1.data.exportVolume || 0).toFixed(3)},`;
        csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(3)},`;
        csvContent += `${exportGrowthRate.toFixed(2)}%`;
        
        return csvContent;
    }

    // Helper methods (keep existing ones)
    calculateTotals(districts) {
        return districts.reduce((totals, district) => {
            totals.residents += district.data.totalResidents || 0;
            totals.employees += district.data.employeeCount || 0;
            totals.income += district.data.totalIncome || 0;
            totals.export += district.data.exportVolume || 0;
            return totals;
        }, { residents: 0, employees: 0, income: 0, export: 0 });
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
        
        // Calculate changes
        const residentsChange = residentsNew - residentsOld;
        const employeesChange = employeesNew - employeesOld;
        const incomeChange = incomeNew - incomeOld;
        const exportChange = exportNew - exportOld;
        
        const residentsGrowthPercent = residentsOld ? ((residentsNew / residentsOld) * 100).toFixed(1) : '0.0';
        const employeesGrowthPercent = employeesOld ? ((employeesNew / employeesOld) * 100).toFixed(1) : '0.0';
        const incomeGrowthPercent = incomeOld ? ((incomeNew / incomeOld) * 100).toFixed(1) : '0.0';
        const exportGrowthPercent = exportOld ? ((exportNew / exportOld) * 100).toFixed(1) : '0.0';
        
        // Format changes with signs
        const formatChange = (change) => change >= 0 ? `+${change}` : `${change}`;
        const formatChangeFloat = (change) => change >= 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`;
        
        let report = `${year1} йил ${getQuarterText(quarter1)} чорагининг IT-Park резидентларининг ҳудудлар кесимида хизматлар ҳажми ва экспорт кўрсаткичлари тўғрисида МАЪЛУМОТ

АСОСИЙ КЎРСАТКИЧЛАР ТАҚҚОСЛАНМАСИ:

1. РЕЗИДЕНТЛАР СОНИ:
   - ${year2} йил ${getQuarterText(quarter2)}: ${residentsOld} та
   - ${year1} йил ${getQuarterText(quarter1)}: ${residentsNew} та
   - Ўзгариш: ${formatChange(residentsChange)} та (${residentsGrowthPercent}%)

2. ХОДИМЛАР СОНИ:
   - ${year2} йил ${getQuarterText(quarter2)}: ${employeesOld} нафар
   - ${year1} йил ${getQuarterText(quarter1)}: ${employeesNew} нафар
   - Ўзгариш: ${formatChange(employeesChange)} нафар (${employeesGrowthPercent}%)

3. ХИЗМАТЛАР ҲАЖМИ:
   - ${year2} йил ${getQuarterText(quarter2)}: ${incomeOld.toFixed(1)} млрд.сўм
   - ${year1} йил ${getQuarterText(quarter1)}: ${incomeNew.toFixed(1)} млрд.сўм
   - Ўзгариш: ${formatChangeFloat(incomeChange)} млрд.сўм (${incomeGrowthPercent}%)

4. ЭКСПОРТ ҲАЖМИ:
   - ${year2} йил ${getQuarterText(quarter2)}: ${exportOld.toFixed(1)} минг АҚШ доллари
   - ${year1} йил ${getQuarterText(quarter1)}: ${exportNew.toFixed(1)} минг АҚШ доллари
   - Ўзгариш: ${formatChangeFloat(exportChange)} минг АҚШ доллари (${exportGrowthPercent}%)

ХУЛОСА:

АйТи Парк резидентларининг фаолияти таҳлили кўрсатдики:
• Резидентлар сони ${residentsGrowthPercent}% ${residentsChange >= 0 ? 'ўсиш' : 'камайиш'} кўрсатди
• Ходимлар сони ${employeesGrowthPercent}% ${employeesChange >= 0 ? 'ўсиш' : 'камайиш'} кўрсатди  
• Хизматлар ҳажми ${incomeGrowthPercent}% ${incomeChange >= 0 ? 'ўсиш' : 'камайиш'} кўрсатди
• Экспорт ҳажми ${exportGrowthPercent}% ${exportChange >= 0 ? 'ўсиш' : 'камайиш'} кўрсатди`;

        // Add company data section
        if (result.companyChanges) {
            const { added, removed, changed } = result.companyChanges;
            
            report += `\n\nКОМПАНИЯЛАР БЎЙИЧА ТАҲЛИЛ:`;
            
            if (added.length > 0) {
                report += `\n\nЯНГИ ҚЎШИЛГАН КОМПАНИЯЛАР (${added.length} та):`;
                added.forEach((company, index) => {
                    report += `\n${index + 1}. ${company.name}`;
                    if (company.employees) {
                        report += ` - ${company.employees} нафар ходим`;
                    }
                    if (company.direction) {
                        report += ` (${company.direction})`;
                    }
                });
            }
            
            if (removed.length > 0) {
                report += `\n\nЧИҚИБ КЕТГАН КОМПАНИЯЛАР (${removed.length} та):`;
                removed.forEach((company, index) => {
                    report += `\n${index + 1}. ${company.name}`;
                    if (company.employees) {
                        report += ` - ${company.employees} нафар ходим`;
                    }
                    if (company.direction) {
                        report += ` (${company.direction})`;
                    }
                });
            }
            
            if (changed.length > 0) {
                report += `\n\nХОДИМЛАР СОНИДА ЎЗГАРИШ БЎЛГАН КОМПАНИЯЛАР (${changed.length} та):`;
                changed.forEach((company, index) => {
                    const changeText = company.change >= 0 ? `+${company.change}` : `${company.change}`;
                    report += `\n${index + 1}. ${company.name}: ${company.employeesOld} → ${company.employeesNew} нафар (${changeText})`;
                    if (company.direction) {
                        report += ` (${company.direction})`;
                    }
                });
            }
            
            // Summary of company changes
            const totalCompaniesOld = (data2.companies || []).length;
            const totalCompaniesNew = (data1.companies || []).length;
            const companyChange = totalCompaniesNew - totalCompaniesOld;
            
            report += `\n\nКОМПАНИЯЛАР СОНИ ЎЗГАРИШИ:`;
            report += `\n- ${year2} йил ${getQuarterText(quarter2)}: ${totalCompaniesOld} та компания`;
            report += `\n- ${year1} йил ${getQuarterText(quarter1)}: ${totalCompaniesNew} та компания`;
            report += `\n- Ўзгариш: ${formatChange(companyChange)} та компания`;
        }
        
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
            .replace(/(млрд\.сўм|минг АҚШ доллари)/g, '<span style="color: blue; font-weight: bold;">$1</span>');

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
<p class="header">IT-Park ҳисоботи - Datapark</p>
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
        const match = key.match(/(Q\d|ALL)/);
        return match ? match[1] : 'Q1';
    }

    getUzbekQuarterText(quarter) {
        switch(quarter) {
            case 'Q1': return '1';
            case 'Q2': return '2';
            case 'Q3': return '3';
            case 'Q4': return '4';
            case 'ALL': return 'бутун йил';
            default: return quarter;
        }
    }
}

// Make available globally
window.ExportManager = ExportManager;