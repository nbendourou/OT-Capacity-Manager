import React, { useState, useMemo, CSSProperties, useEffect } from 'react';
import type { Rack, Room } from '../types';
import { PowerIcon } from './icons';

interface RoomPowerViewProps {
    racks: Rack[];
    room: Room;
    onRackClick: (rack: Rack) => void;
}

const getUtilizationColor = (value: number, capacity: number) => {
    if (capacity === 0) return 'bg-gray-600';
    const utilization = value / capacity;
    if (utilization > 0.9) return 'bg-red-600';
    if (utilization > 0.7) return 'bg-orange-600';
    if (utilization > 0) return 'bg-green-600';
    return 'bg-gray-600';
};

const getBorderColor = (value: number, capacity: number) => {
    if (capacity <= 0) return 'border-gray-700';
    const utilization = value / capacity;
    if (utilization > 0.9) return 'border-red-500';
    if (utilization > 0.7) return 'border-orange-500';
    if (utilization > 0) return 'border-green-500';
    return 'border-gray-700';
};

const UtilizationBar: React.FC<{
    value: number;
    capacity: number;
    colorValue?: number;
    colorCapacity?: number;
}> = ({ value, capacity, colorValue, colorCapacity }) => {
    const displayValue = colorValue !== undefined ? colorValue : value;
    const displayCapacity = colorCapacity !== undefined ? colorCapacity : capacity;
    const percentage = capacity > 0 ? (value / capacity) * 100 : 0;
    const colorClass = getUtilizationColor(displayValue, displayCapacity);

    return (
        <div className="w-full bg-gray-700 rounded-full h-5 relative">
            <div
                className={`h-5 rounded-full ${colorClass} transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white text-shadow-sm">
                    {value.toFixed(1)} / {capacity.toFixed(1)} kW ({percentage.toFixed(0)}%)
                </span>
            </div>
        </div>
    );
};

const RackCard: React.FC<{
    rack: Rack;
    onClick: () => void;
}> = ({ rack, onClick }) => {
    const [powerType, setPowerType] = useState<string>('N/A');
    const [totalPower, setTotalPower] = useState(0);
    const [borderColor, setBorderColor] = useState('border-gray-700');
    const [badgeColor, setBadgeColor] = useState('bg-gray-600');

    useEffect(() => {
        const hasAC = rack.P_Voie1_Ph1 > 0 || rack.P_Voie1_Ph2 > 0 || rack.P_Voie1_Ph3 > 0 ||
                      rack.P_Voie2_Ph1 > 0 || rack.P_Voie2_Ph2 > 0 || rack.P_Voie2_Ph3 > 0 ||
                      rack.Alimentation.toLowerCase().includes('tri') || rack.Alimentation.toLowerCase().includes('mono') ||
                      rack.Phase.toLowerCase().includes('tri') || rack.Phase.toLowerCase().includes('mono');
        
        const hasDC = rack.P_Voie1_DC > 0 || rack.P_Voie2_DC > 0;
        const isTri = rack.Alimentation.toLowerCase().includes('tri') || rack.Phase.toLowerCase().includes('tri');
        
        let type = 'N/A';
        let color = 'bg-gray-600';

        if (rack.Alimentation === "RIEN") {
            type = 'A définir';
            color = 'bg-gray-500';
        } else if (hasDC && hasAC) {
            type = 'DC + AC';
            color = 'bg-purple-600';
        } else if (hasDC) {
            type = 'DC';
            color = 'bg-purple-600';
        } else if (hasAC) {
            if (isTri) {
                type = 'AC-TRI';
                color = 'bg-orange-600';
            } else {
                type = 'AC-MONO';
                color = 'bg-blue-600';
            }
        }
        
        setPowerType(type);
        setBadgeColor(color);
        
        const currentTotalPower = rack.P_Voie1_Ph1 + rack.P_Voie1_Ph2 + rack.P_Voie1_Ph3 + rack.P_Voie1_DC +
                                  rack.P_Voie2_Ph1 + rack.P_Voie2_Ph2 + rack.P_Voie2_Ph3 + rack.P_Voie2_DC;
        setTotalPower(currentTotalPower);

        let border = 'border-gray-700';
        if (rack.Puissance_PDU > 0) {
            if (isTri) {
                const allPhasePower = [rack.P_Voie1_Ph1, rack.P_Voie1_Ph2, rack.P_Voie1_Ph3, rack.P_Voie2_Ph1, rack.P_Voie2_Ph2, rack.P_Voie2_Ph3];
                const maxPhasePower = Math.max(...allPhasePower);
                border = getBorderColor(maxPhasePower, rack.Puissance_PDU / 3);
            } else {
                border = getBorderColor(currentTotalPower, rack.Puissance_PDU);
            }
        }
        setBorderColor(border);

    }, [rack]);
    
    return (
        <div onClick={onClick} className={`bg-gray-800 rounded-lg p-3 shadow-md cursor-pointer hover:bg-gray-700/50 transition border-2 ${borderColor}`}>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-base text-white truncate pr-2">{rack.Rack}</h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white whitespace-nowrap ${badgeColor}`}>{powerType}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate h-8">{rack.Designation || 'No Designation'}</p>
            <div className="mt-2 text-center">
                {rack.Alimentation === "RIEN" ? (
                    <span className="text-sm font-bold text-gray-500">A définir</span>
                ) : (
                    <span className="text-sm font-bold text-white">{totalPower.toFixed(2)} kW</span>
                )}
            </div>
        </div>
    );
};

const RoomPowerView: React.FC<RoomPowerViewProps> = ({ racks, room, onRackClick }) => {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const validVoies: { [key in Room]: ('A' | 'B' | 'C')[] } = {
        ITN1: ['A', 'B'],
        ITN2: ['A', 'C'],
        ITN3: ['B', 'C'],
    };

    const getVoieLetter = (source: string): 'A' | 'B' | 'C' | null => {
        if (!source) return null;
        const match = source.match(/[.-]([ABC])[.-]/i);
        if (match && match[1]) {
            return match[1].toUpperCase() as 'A' | 'B' | 'C';
        }
        return null;
    };

    const powerByRow = useMemo(() => {
        const rows = 'ABCDEFGHIJ'.split('').map(r => ({
            row: r,
            ac: { p1: 0, p2: 0, p3: 0, total: 0 },
            dc: { total: 0 },
            racks: [] as Rack[],
        }));

        const rowMap = new Map(rows.map(r => [r.row, r]));

        racks.forEach(rack => {
            const rowData = rowMap.get(rack.Rangée);
            if (!rowData) return;

            rowData.racks.push(rack);

            const processVoie = (source: string, p1: number, p2: number, p3: number, dc: number) => {
                if (!source) return;

                // AC Power
                const voie = getVoieLetter(source);
                if (voie && validVoies[room].includes(voie)) {
                    if (!source.toLowerCase().includes('rec')) {
                         rowData.ac.p1 += p1;
                         rowData.ac.p2 += p2;
                         rowData.ac.p3 += p3;
                         rowData.ac.total += p1 + p2 + p3;
                    }
                }
                
                // DC Power
                 if (source.toLowerCase().includes('rec')) {
                    rowData.dc.total += dc;
                 }
            };
            
            processVoie(rack.Canalis_Redresseur_Voie1, rack.P_Voie1_Ph1, rack.P_Voie1_Ph2, rack.P_Voie1_Ph3, rack.P_Voie1_DC);
            processVoie(rack.Canalis_Redresseur_Voie2, rack.P_Voie2_Ph1, rack.P_Voie2_Ph2, rack.P_Voie2_Ph3, rack.P_Voie2_DC);
        });

        return Array.from(rowMap.values());
    }, [racks, room]);

    return (
        <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white mb-4">{room} Power Matrix</h2>
            {powerByRow.map(({ row, ac, dc, racks }) => {
                const maxAcPhase = Math.max(ac.p1, ac.p2, ac.p3);
                return (
                    <div key={row} className="bg-gray-800 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 cursor-pointer" onClick={() => setExpandedRow(expandedRow === row ? null : row)}>
                            <div className="flex items-center space-x-4">
                                <div className="bg-blue-600 w-16 h-16 rounded-lg flex items-center justify-center">
                                    <span className="text-3xl font-bold"> {row} </span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Row {row}</h3>
                                    <p className="text-sm text-gray-400">{racks.length} Racks</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-300">
                                    <div>P1: {ac.p1.toFixed(1)}kW</div>
                                    <div>P2: {ac.p2.toFixed(1)}kW</div>
                                    <div>P3: {ac.p3.toFixed(1)}kW</div>
                                </div>
                                <UtilizationBar value={ac.total} capacity={80} colorValue={maxAcPhase} colorCapacity={80/3} />
                            </div>
                            <div className="space-y-2">
                                <div className="text-center text-xs text-gray-300">DC Total: {dc.total.toFixed(1)}kW</div>
                                <UtilizationBar value={dc.total} capacity={80} />
                            </div>
                        </div>

                        {expandedRow === row && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                 <div className="grid grid-cols-fill-140 gap-3">
                                    {racks.sort((a,b) => a.Rack.localeCompare(b.Rack)).map(rack => (
                                        <RackCard key={rack.id} rack={rack} onClick={() => onRackClick(rack)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
};

export default RoomPowerView;
