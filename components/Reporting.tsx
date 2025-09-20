import React, { useState, useMemo } from 'react';
import type { Rack, Room, Capacities } from '../types';
import { BackIcon, DownloadIcon } from './icons';
import { getRackCapacity } from '../utils';

declare const XLSX: any;

type ReportType = 'high-power' | 'by-client' | 'inventory' | 'at-risk';

// --- Configuration copied from other components for report generation ---
const rectifierConfig = {
    A: { ITN1: ["IT.1-SWB.REC A.1", "IT.1-SWB.REC A.2", "IT.1-SWB.REC A.3", "IT.1-SWB.REC A.4"], ITN2: ["IT.2-SWB.REC A.1", "IT.2-SWB.REC A.2", "IT.2-SWB.REC A.3", "IT.2-SWB.REC A.4"], },
    B: { ITN1: ["IT.1-SWB.REC B.1", "IT.1-SWB.REC B.2", "IT.1-SWB.REC B.3", "IT.1-SWB.REC B.4"], ITN3: ["IT.3-SWB.REC B.1", "IT.3-SWB.REC B.2", "IT.3-SWB.REC B.3", "IT.3-SWB.REC B.4"], },
    C: { ITN2: ["IT.2-SWB.REC C.1", "IT.2-SWB.REC C.2", "IT.2-SWB.REC C.3", "IT.2-SWB.REC C.4"], ITN3: ["IT.3-SWB.REC C.1", "IT.3-SWB.REC C.2", "IT.3-SWB.REC C.3", "IT.3-SWB.REC C.4"], }
};
const panelConfig: { [key in 'A' | 'B' | 'C']: { name: string, prefixes: string[] }[] } = {
    A: [ { name: "TC.1.1-TDHQ.IT.A", prefixes: ["IT.1-TB.A.1", "IT.1-TB.A.2", "IT.1-TB.A.3", "IT.1-TB.A.4", "IT.1-TB.A.5"] }, { name: "TC.2.1-TDHQ.IT.A", prefixes: ["IT.2-TB.A.1", "IT.2-TB.A.2", "IT.2-TB.A.3", "IT.2-TB.A.4", "IT.2-TB.A.5"] }, ],
    B: [ { name: "TC.1.1-TDHQ.IT.B", prefixes: ["IT.1-TB.B.1", "IT.1-TB.B.2", "IT.1-TB.B.3", "IT.1-TB.B.4", "IT.1-TB.B.5"] }, { name: "TC.3.1-TDHQ.IT.B", prefixes: ["IT.3-TB.B.1", "IT.3-TB.B.2", "IT.3-TB.B.3", "IT.3-TB.B.4", "IT.3-TB.B.5"] }, ],
    C: [ { name: "TC.2.2-TDHQ.IT.C", prefixes: ["IT.2-TB.C.1", "IT.2-TB.C.2", "IT.2-TB.C.3", "IT.2-TB.C.4", "IT.2-TB.C.5"] }, { name: "TC.3.2-TDHQ.IT.C", prefixes: ["IT.3-TB.C.1", "IT.3-TB.C.2", "IT.3-TB.C.3", "IT.3-TB.C.4", "IT.3-TB.C.5"] }, ]
};
// --- End Configuration ---


const ReportCard = ({ title, description, onGenerate }: { title: string, description: string, onGenerate: () => void }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col justify-between">
        <div>
            <h3 className="text-xl font-bold text-blue-300">{title}</h3>
            <p className="text-gray-400 mt-2">{description}</p>
        </div>
        <button
            onClick={onGenerate}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 self-start"
        >
            Generate Report
        </button>
    </div>
);

const Reporting = ({ racks, capacities }: { racks: Rack[], capacities: Capacities }) => {
    const [activeReport, setActiveReport] = useState<{ type: ReportType, title: string } | null>(null);

    const reports = {
        'high-power': {
            title: 'High Power Racks',
            description: "Lists all racks currently operating at over 80% of their rated power capacity.",
            columns: ['Room', 'Rack', 'Client', 'Power (kW)', 'Capacity (kW)', 'Utilization'],
            generate: () => racks
                .map(r => {
                    const totalPower = r.P_Voie1_Ph1 + r.P_Voie1_Ph2 + r.P_Voie1_Ph3 + r.P_Voie1_DC +
                                       r.P_Voie2_Ph1 + r.P_Voie2_Ph2 + r.P_Voie2_Ph3 + r.P_Voie2_DC;
                    const capacity = getRackCapacity(r);
                    const utilization = capacity > 0 ? (totalPower / capacity) : 0;
                    return { ...r, totalPower, capacity, utilization };
                })
                .filter(r => r.utilization > 0.8 && r.capacity > 0)
                .map(r => [
                    r.Salle,
                    r.Rack,
                    r.Porteur,
                    r.totalPower.toFixed(2),
                    r.capacity.toFixed(2),
                    `${(r.utilization * 100).toFixed(1)}%`
                ])
        },
        'by-client': {
            title: 'Power by Client',
            description: 'Provides a summary of total power consumption and rack count for each client.',
            columns: ['Client', 'Total Power (kW)', 'Rack Count'],
            generate: () => {
                const clientMap = new Map<string, { power: number, count: number }>();
                racks.forEach(r => {
                    const client = r.Porteur || 'N/A';
                    const clientData = clientMap.get(client) || { power: 0, count: 0 };
                    const totalPower = r.P_Voie1_Ph1 + r.P_Voie1_Ph2 + r.P_Voie1_Ph3 + r.P_Voie1_DC +
                                       r.P_Voie2_Ph1 + r.P_Voie2_Ph2 + r.P_Voie2_Ph3 + r.P_Voie2_DC;
                    clientData.power += totalPower;
                    clientData.count += 1;
                    clientMap.set(client, clientData);
                });
                return Array.from(clientMap.entries())
                    .sort((a, b) => b[1].power - a[1].power)
                    .map(([client, data]) => [
                        client,
                        data.power.toFixed(2),
                        data.count
                    ]);
            }
        },
        'inventory': {
            title: 'Full Inventory',
            description: 'Generates a detailed inventory of all racks, organized by room and then by row.',
            columns: ['Room', 'Row', 'Rack', 'Designation', 'Client', 'Total Power (kW)'],
            generate: () => racks
                .sort((a, b) => {
                    const salleCompare = a.Salle.localeCompare(b.Salle);
                    if (salleCompare !== 0) return salleCompare;
                    const rangeeCompare = a.Rangée.localeCompare(b.Rangée);
                    if (rangeeCompare !== 0) return rangeeCompare;
                    return a.Rack.localeCompare(b.Rack);
                })
                .map(r => {
                    const totalPower = r.P_Voie1_Ph1 + r.P_Voie1_Ph2 + r.P_Voie1_Ph3 + r.P_Voie1_DC +
                                       r.P_Voie2_Ph1 + r.P_Voie2_Ph2 + r.P_Voie2_Ph3 + r.P_Voie2_DC;
                    return [
                        r.Salle,
                        r.Rangée,
                        r.Rack,
                        r.Designation,
                        r.Porteur,
                        totalPower.toFixed(2)
                    ];
                })
        },
        'at-risk': {
            title: 'At-Risk Capacities',
            description: 'Identifies all components operating at high capacity (Warning >= 80%, Critical >= 90%).',
            columns: ['Item Type', 'Item Name', 'Location', 'Load (kW)', 'Capacity (kW)', 'Utilization (%)', 'Status'],
            generate: () => {
                const atRiskItems: (string | number)[][] = [];
                const efficiency = 0.96; 

                // 1. Check Racks
                racks.forEach(r => {
                    const totalPower = r.P_Voie1_Ph1 + r.P_Voie1_Ph2 + r.P_Voie1_Ph3 + r.P_Voie1_DC + r.P_Voie2_Ph1 + r.P_Voie2_Ph2 + r.P_Voie2_Ph3 + r.P_Voie2_DC;
                    const capacity = getRackCapacity(r);
                    if (capacity > 0) {
                        const utilization = totalPower / capacity;
                        if (utilization >= 0.8) {
                            atRiskItems.push(['Rack', r.Rack, r.Salle, totalPower.toFixed(2), capacity.toFixed(2), `${(utilization * 100).toFixed(1)}%`, utilization >= 0.9 ? 'Critical' : 'Warning']);
                        }
                    }
                });

                // 2. Check Rooms (Accurate calculation)
                const powerByRoom: { [key in Room | string]: number } = { ITN1: 0, ITN2: 0, ITN3: 0 };
                const prefixesByRoom: { [key in Room]: { ac: string[], dc: string[] } } = { ITN1: { ac: [], dc: [] }, ITN2: { ac: [], dc: [] }, ITN3: { ac: [], dc: [] } };

                for (const room of ['ITN1', 'ITN2', 'ITN3'] as const) {
                    const roomNumber = room.slice(-1);
                    const roomPanelPrefix = `tc.${roomNumber}.`;
                    prefixesByRoom[room].ac = (['A', 'B', 'C'] as const).flatMap(chain => panelConfig[chain]).filter(panel => panel.name.toLowerCase().startsWith(roomPanelPrefix)).flatMap(panel => panel.prefixes).map(p => p.trim().toLowerCase());
                    prefixesByRoom[room].dc = (['A', 'B', 'C'] as const).flatMap(chain => rectifierConfig[chain][room] || []).map(p => p.trim().toLowerCase());
                }

                racks.forEach(rack => {
                    const room = rack.Salle as Room;
                    if (powerByRoom[room] === undefined) return;
                    let rackTotalForRoom = 0;
                    const processVoie = (source: string, p1: number, p2: number, p3: number, dc: number) => {
                        if (!source) return;
                        const s = source.trim().toLowerCase();
                        if (prefixesByRoom[room].ac.some(p => s.startsWith(p))) { rackTotalForRoom += p1 + p2 + p3; }
                        if (prefixesByRoom[room].dc.some(p => s.startsWith(p))) { rackTotalForRoom += dc; }
                    };
                    processVoie(rack.Canalis_Redresseur_Voie1, rack.P_Voie1_Ph1, rack.P_Voie1_Ph2, rack.P_Voie1_Ph3, rack.P_Voie1_DC);
                    processVoie(rack.Canalis_Redresseur_Voie2, rack.P_Voie2_Ph1, rack.P_Voie2_Ph2, rack.P_Voie2_Ph3, rack.P_Voie2_DC);
                    powerByRoom[room] += rackTotalForRoom;
                });

                const roomCapacities = { ITN1: capacities.ROOM_CAPACITY_ITN1_kW, ITN2: capacities.ROOM_CAPACITY_ITN2_kW, ITN3: capacities.ROOM_CAPACITY_ITN3_kW };
                (['ITN1', 'ITN2', 'ITN3'] as const).forEach(room => {
                    const totalPower = powerByRoom[room];
                    const capacity = roomCapacities[room];
                    if (capacity > 0) {
                        const utilization = totalPower / capacity;
                        if (utilization >= 0.8) {
                            atRiskItems.push(['Room', room, room, totalPower.toFixed(2), capacity.toFixed(2), `${(utilization * 100).toFixed(1)}%`, utilization >= 0.9 ? 'Critical' : 'Warning']);
                        }
                    }
                });
                
                // 3. Check Rows
                (['ITN1', 'ITN2', 'ITN3'] as const).forEach(room => {
                    const roomRacks = racks.filter(r => r.Salle === room);
                    const rowsData = new Map<string, { ac: {p1:number,p2:number,p3:number,total:number}, dc: {total:number} }>();
                    const validVoies: ('A'|'B'|'C')[] = room === 'ITN1' ? ['A', 'B'] : room === 'ITN2' ? ['A', 'C'] : ['B', 'C'];
                    
                    roomRacks.forEach(rack => {
                        let rowData = rowsData.get(rack.Rangée);
                        if (!rowData) {
                            rowData = { ac: { p1: 0, p2: 0, p3: 0, total: 0 }, dc: { total: 0 }};
                            rowsData.set(rack.Rangée, rowData);
                        }
                        [rack.Canalis_Redresseur_Voie1, rack.Canalis_Redresseur_Voie2].forEach((sourceStr, i) => {
                            if (!sourceStr) return;
                            const voieMatch = sourceStr.match(/[.-]([ABC])[.-]/i) || sourceStr.match(/REC\s([ABC])/i);
                            const voie = voieMatch ? voieMatch[1].toUpperCase() as 'A'|'B'|'C' : null;
                            if (voie && validVoies.includes(voie)) {
                                if (panelConfig[voie].flatMap(p => p.prefixes).some(p => sourceStr.trim().toLowerCase().startsWith(p.trim().toLowerCase()))) {
                                    const ac = i === 0 ? {p1:rack.P_Voie1_Ph1, p2:rack.P_Voie1_Ph2, p3:rack.P_Voie1_Ph3} : {p1:rack.P_Voie2_Ph1, p2:rack.P_Voie2_Ph2, p3:rack.P_Voie2_Ph3};
                                    rowData.ac.p1 += ac.p1; rowData.ac.p2 += ac.p2; rowData.ac.p3 += ac.p3; rowData.ac.total += ac.p1+ac.p2+ac.p3;
                                }
                                if ((rectifierConfig[voie]?.[room] || []).some(p => sourceStr.trim().toLowerCase().startsWith(p.trim().toLowerCase()))) {
                                    rowData.dc.total += i === 0 ? rack.P_Voie1_DC : rack.P_Voie2_DC;
                                }
                            }
                        });
                    });

                    rowsData.forEach((data, rowName) => {
                        const maxAcPhaseLoad = Math.max(data.ac.p1, data.ac.p2, data.ac.p3);
                        const acCapacityPerPhase = capacities.ROW_AC_CAPACITY_kW / 3;
                        if (acCapacityPerPhase > 0) {
                            const util = maxAcPhaseLoad / acCapacityPerPhase;
                            if (util >= 0.8) atRiskItems.push(['Row AC (Canalis)', `Row ${rowName}`, room, data.ac.total.toFixed(2), capacities.ROW_AC_CAPACITY_kW.toFixed(2), `${(util*100).toFixed(1)}%`, util >= 0.9 ? 'Critical' : 'Warning']);
                        }
                        if (capacities.ROW_DC_CAPACITY_kW > 0) {
                            const util = data.dc.total / capacities.ROW_DC_CAPACITY_kW;
                            if (util >= 0.8) atRiskItems.push(['Row DC (Redresseur)', `Row ${rowName}`, room, data.dc.total.toFixed(2), capacities.ROW_DC_CAPACITY_kW.toFixed(2), `${(util*100).toFixed(1)}%`, util >= 0.9 ? 'Critical' : 'Warning']);
                        }
                    });
                });
                
                // 4. Check UPS
                const upsLoads: { [key in 'A' | 'B' | 'C']: { p1: number, p2: number, p3: number } } = { A: {p1:0,p2:0,p3:0}, B: {p1:0,p2:0,p3:0}, C: {p1:0,p2:0,p3:0} };
                racks.forEach(rack => {
                    [rack.Canalis_Redresseur_Voie1, rack.Canalis_Redresseur_Voie2].forEach((sourceStr, i) => {
                        if (!sourceStr) return;
                        const voieMatch = sourceStr.match(/[.-]([ABC])[.-]/i) || sourceStr.match(/REC\s([ABC])/i);
                        const voie = voieMatch ? voieMatch[1].toUpperCase() as 'A'|'B'|'C' : null;
                        if (voie) {
                            const ac = i === 0 ? {p1:rack.P_Voie1_Ph1, p2:rack.P_Voie1_Ph2, p3:rack.P_Voie1_Ph3} : {p1:rack.P_Voie2_Ph1, p2:rack.P_Voie2_Ph2, p3:rack.P_Voie2_Ph3};
                            const dc = i === 0 ? rack.P_Voie1_DC : rack.P_Voie2_DC;
                            const dcEquivAc = dc / efficiency / 3;
                            upsLoads[voie].p1 += ac.p1 + dcEquivAc;
                            upsLoads[voie].p2 += ac.p2 + dcEquivAc;
                            upsLoads[voie].p3 += ac.p3 + dcEquivAc;
                        }
                    });
                });
                const upsCapacities = { A: capacities.UPS_A_kW, B: capacities.UPS_B_kW, C: capacities.UPS_C_kW };
                (['A', 'B', 'C'] as const).forEach(chain => {
                    const capacityPerPhase = upsCapacities[chain] / 3;
                    if (capacityPerPhase > 0) {
                        [upsLoads[chain].p1, upsLoads[chain].p2, upsLoads[chain].p3].forEach((load, i) => {
                             const util = load / capacityPerPhase;
                             if (util >= 0.8) atRiskItems.push([`UPS Chain ${chain}`, `Phase ${i+1}`, 'Global', load.toFixed(2), capacityPerPhase.toFixed(2), `${(util*100).toFixed(1)}%`, util >= 0.9 ? 'Critical' : 'Warning']);
                        });
                    }
                });

                return atRiskItems.sort((a,b) => String(a[6]).localeCompare(String(b[6])) * -1 || String(a[0]).localeCompare(String(b[0])));
            }
        }
    };

    const generatedData = useMemo(() => {
        if (!activeReport) return null;
        return reports[activeReport.type].generate();
    }, [activeReport, racks, capacities]);

    const handleGenerate = (type: ReportType, title: string) => {
        setActiveReport({ type, title });
    };

    const handleExport = () => {
        if (!activeReport || !generatedData) return;

        const reportConfig = reports[activeReport.type];
        const dataToExport = [
            reportConfig.columns,
            ...generatedData
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

        const fileName = `${activeReport.title.replace(/\s+/g, '_')}_Report.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (activeReport && generatedData) {
        return (
            <div>
                <div className="flex justify-between items-center mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
                    <button onClick={() => setActiveReport(null)} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                        <BackIcon />
                        <span className="ml-2">Back to Reports</span>
                    </button>
                    <button onClick={handleExport} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                        <DownloadIcon />
                        <span className="ml-2">Export to Excel</span>
                    </button>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-white mb-4 text-center">{activeReport.title}</h2>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-100 uppercase bg-gray-700 sticky top-0">
                                <tr>
                                    {reports[activeReport.type].columns.map(col => (
                                        <th key={col} scope="col" className="px-6 py-3">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {generatedData.length === 0 ? (
                                    <tr>
                                       <td colSpan={reports[activeReport.type].columns.length} className="text-center p-6 text-gray-400">
                                            No data available for this report.
                                        </td>
                                    </tr>
                                ) : (
                                    generatedData.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className={`px-6 py-4 whitespace-nowrap ${cellIndex === 6 && (cell==='Critical' ? 'text-red-400 font-bold' : cell==='Warning' ? 'text-orange-400 font-bold' : '')}`}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Reporting Module</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportCard
                    title={reports['at-risk'].title}
                    description={reports['at-risk'].description}
                    onGenerate={() => handleGenerate('at-risk', reports['at-risk'].title)}
                />
                <ReportCard
                    title={reports['high-power'].title}
                    description={reports['high-power'].description}
                    onGenerate={() => handleGenerate('high-power', reports['high-power'].title)}
                />
                <ReportCard
                    title={reports['by-client'].title}
                    description={reports['by-client'].description}
                    onGenerate={() => handleGenerate('by-client', reports['by-client'].title)}
                />
                <ReportCard
                    title={reports['inventory'].title}
                    description={reports['inventory'].description}
                    onGenerate={() => handleGenerate('inventory', reports['inventory'].title)}
                />
            </div>
        </div>
    );
};

export default Reporting;