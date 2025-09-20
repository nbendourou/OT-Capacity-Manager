import React, { useMemo } from 'react';
import type { Rack, Room, Capacities } from '../types';
import { getRackCapacity } from '../utils';

interface FloorPlanViewProps {
    racks: Rack[];
    room: Room;
    onRackClick: (rack: Rack) => void;
    capacities: Capacities;
}

const FloorPlanRack: React.FC<{ rack: Rack; onClick: () => void; }> = ({ rack, onClick }) => {
    const { totalPower, capacity, utilization, bgColor } = useMemo(() => {
        const power = rack.P_Voie1_Ph1 + rack.P_Voie1_Ph2 + rack.P_Voie1_Ph3 + rack.P_Voie1_DC +
                      rack.P_Voie2_Ph1 + rack.P_Voie2_Ph2 + rack.P_Voie2_Ph3 + rack.P_Voie2_DC;
        const cap = getRackCapacity(rack);
        const util = cap > 0 ? power / cap : 0;
        
        // Check for DC power presence to override utilization colors
        const hasDC = rack.P_Voie1_DC > 0 || rack.P_Voie2_DC > 0;

        let color = 'bg-gray-700'; // Default for no load or no capacity
        
        if (hasDC) {
            // Racks with any DC component are always purple to avoid confusion with AC load colors
            color = 'bg-purple-600';
        } else if (cap > 0) {
            // For AC-only racks, color is based on utilization
            if (util > 0.9) color = 'bg-red-600';
            else if (util > 0.8) color = 'bg-orange-500';
            else if (util > 0) color = 'bg-green-600';
        }
        
        return { totalPower: power, capacity: cap, utilization: util, bgColor: color };
    }, [rack]);
    
    return (
        <div
            onClick={onClick}
            className={`w-24 h-24 p-2 rounded-md shadow-lg cursor-pointer flex flex-col justify-between items-center transition-transform hover:scale-105 ${bgColor}`}
            title={`Client: ${rack.Porteur || 'N/A'}\nPower: ${totalPower.toFixed(2)} kW\nCapacity: ${capacity.toFixed(1)} kW`}
        >
            <p className="font-bold text-sm text-center text-white truncate w-full">{rack.Rack}</p>
            <div className="text-center">
                 <p className="text-xs text-white -mb-1">{totalPower.toFixed(1)} kW</p>
                 <p className="text-base font-semibold text-white">
                    {capacity > 0 ? `${(utilization * 100).toFixed(0)}%` : '-'}
                </p>
            </div>
            <p className="text-xs text-gray-300 text-center truncate w-full">{rack.Num_Rack}</p>
        </div>
    );
};

const FloorPlanView: React.FC<FloorPlanViewProps> = ({ racks, onRackClick, capacities }) => {
    const rows = useMemo(() => {
        const grouped = racks.reduce<Record<string, Rack[]>>((acc, rack) => {
            const rowKey = rack.Rangée || 'Unassigned';
            if (!acc[rowKey]) {
                acc[rowKey] = [];
            }
            acc[rowKey].push(rack);
            return acc;
        }, {});

        Object.values(grouped).forEach(racksInRow => {
            racksInRow.sort((a, b) => a.Rack.localeCompare(b.Rack, undefined, { numeric: true }));
        });
        
        return Object.entries(grouped).sort(([rowA], [rowB]) => rowA.localeCompare(rowB));
    }, [racks]);

    return (
        <div className="space-y-8">
            {rows.map(([rowName, racksInRow]) => (
                <div key={rowName}>
                    <h3 className="text-xl font-bold text-white mb-3 pl-2">Row {rowName}</h3>
                    <div className="bg-gray-800 p-4 rounded-lg flex flex-wrap gap-3">
                        {racksInRow.map(rack => (
                            <FloorPlanRack key={rack.id} rack={rack} onClick={() => onRackClick(rack)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FloorPlanView;