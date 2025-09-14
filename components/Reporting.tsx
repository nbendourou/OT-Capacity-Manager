import React, { useState, useMemo } from 'react';
import type { Rack } from '../types';
import { BackIcon, DownloadIcon } from './icons';

declare const XLSX: any;

type ReportType = 'high-power' | 'by-client' | 'inventory';

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

const Reporting = ({ racks }: { racks: Rack[] }) => {
    const [activeReport, setActiveReport] = useState<{ type: ReportType, title: string } | null>(null);

    const reports = {
        'high-power': {
            title: 'High Power Racks',
            description: "Lists all racks currently operating at over 80% of their PDU's rated power capacity.",
            columns: ['Room', 'Rack', 'Client', 'Power (kW)', 'Capacity (kW)', 'Utilization'],
            generate: () => racks
                .map(r => {
                    const totalPower = r.P_Voie1_Ph1 + r.P_Voie1_Ph2 + r.P_Voie1_Ph3 + r.P_Voie1_DC +
                                       r.P_Voie2_Ph1 + r.P_Voie2_Ph2 + r.P_Voie2_Ph3 + r.P_Voie2_DC;
                    const capacity = r.Puissance_PDU;
                    const utilization = capacity > 0 ? (totalPower / capacity) : 0;
                    return { ...r, totalPower, utilization };
                })
                .filter(r => r.utilization > 0.8 && r.Puissance_PDU > 0)
                .map(r => [
                    r.Salle,
                    r.Rack,
                    r.Porteur,
                    r.totalPower.toFixed(2),
                    r.Puissance_PDU.toFixed(2),
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
        }
    };

    const generatedData = useMemo(() => {
        if (!activeReport) return null;
        return reports[activeReport.type].generate();
    }, [activeReport, racks]);

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
                                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">{cell}</td>
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