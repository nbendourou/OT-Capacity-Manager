import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Rack, Room, OtherConsumersStateMap, Capacities } from '../types';
import { PowerIcon, RackIcon, RowIcon, WarningIcon } from './icons';
import Modal from './common/Modal';
import { getRackCapacity } from '../utils';

interface DashboardProps {
    racks: Rack[];
    onRackClick: (rack: Rack) => void;
    otherConsumers: OtherConsumersStateMap;
    capacities: Capacities;
}

// Configuration copied from TdhqPanel for consistency
const rectifierConfig = {
    A: {
        ITN1: ["IT.1-SWB.REC A.1", "IT.1-SWB.REC A.2", "IT.1-SWB.REC A.3", "IT.1-SWB.REC A.4"],
        ITN2: ["IT.2-SWB.REC A.1", "IT.2-SWB.REC A.2", "IT.2-SWB.REC A.3", "IT.2-SWB.REC A.4"],
    },
    B: {
        ITN1: ["IT.1-SWB.REC B.1", "IT.1-SWB.REC B.2", "IT.1-SWB.REC B.3", "IT.1-SWB.REC B.4"],
        ITN3: ["IT.3-SWB.REC B.1", "IT.3-SWB.REC B.2", "IT.3-SWB.REC B.3", "IT.3-SWB.REC B.4"],
    },
    C: {
        ITN2: ["IT.2-SWB.REC C.1", "IT.2-SWB.REC C.2", "IT.2-SWB.REC C.3", "IT.2-SWB.REC C.4"],
        ITN3: ["IT.3-SWB.REC C.1", "IT.3-SWB.REC C.2", "IT.3-SWB.REC C.3", "IT.3-SWB.REC C.4"],
    }
};

const panelConfig: { [key in 'A' | 'B' | 'C']: { name: string, prefixes: string[] }[] } = {
    A: [
        { name: "TC.1.1-TDHQ.IT.A", prefixes: ["IT.1-TB.A.1", "IT.1-TB.A.2", "IT.1-TB.A.3", "IT.1-TB.A.4", "IT.1-TB.A.5"] },
        { name: "TC.2.1-TDHQ.IT.A", prefixes: ["IT.2-TB.A.1", "IT.2-TB.A.2", "IT.2-TB.A.3", "IT.2-TB.A.4", "IT.2-TB.A.5"] },
    ],
    B: [
        { name: "TC.1.1-TDHQ.IT.B", prefixes: ["IT.1-TB.B.1", "IT.1-TB.B.2", "IT.1-TB.B.3", "IT.1-TB.B.4", "IT.1-TB.B.5"] },
        { name: "TC.3.1-TDHQ.IT.B", prefixes: ["IT.3-TB.B.1", "IT.3-TB.B.2", "IT.3-TB.B.3", "IT.3-TB.B.4", "IT.3-TB.B.5"] },
    ],
    C: [
        { name: "TC.2.2-TDHQ.IT.C", prefixes: ["IT.2-TB.C.1", "IT.2-TB.C.2", "IT.2-TB.C.3", "IT.2-TB.C.4", "IT.2-TB.C.5"] },
        { name: "TC.3.2-TDHQ.IT.C", prefixes: ["IT.3-TB.C.1", "IT.3-TB.C.2", "IT.3-TB.C.3", "IT.3-TB.C.4", "IT.3-TB.C.5"] },
    ]
};

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: JSX.Element;
    subtitle?: string;
    colorClass?: string;
    onClick?: () => void;
    animationClass?: string;
}> = ({ title, value, icon, subtitle, colorClass = 'bg-gray-700', onClick, animationClass }) => (
    <div
        onClick={onClick}
        className={`bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4 transition-colors duration-200 ${onClick ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${animationClass || ''}`}
        role={onClick ? "button" : "figure"}
        aria-label={title}
    >
        <div className={`p-3 rounded-lg ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    </div>
);

const getRoomLoadStyle = (load: number, capacity: number, defaultColor: string) => {
    if (capacity === 0) {
        return { colorClass: 'bg-gray-700', animationClass: '' };
    }
    const utilization = load / capacity;
    if (utilization >= 0.9) {
        return { colorClass: 'bg-red-900/40', animationClass: 'animate-pulse-border' };
    }
    if (utilization >= 0.8) {
        return { colorClass: 'bg-orange-600/30', animationClass: 'animate-pulse-border' };
    }
    return { colorClass: defaultColor, animationClass: '' };
};


const Dashboard: React.FC<DashboardProps> = ({ racks, onRackClick, otherConsumers, capacities }) => {
    const [isHighPowerModalOpen, setIsHighPowerModalOpen] = useState(false);

    const stats = useMemo(() => {
        const totalRacks = racks.length;

        const powerByRoom: { [key in Room | string]: { ac: number, dc: number, total: number } } = {
            ITN1: { ac: 0, dc: 0, total: 0 },
            ITN2: { ac: 0, dc: 0, total: 0 },
            ITN3: { ac: 0, dc: 0, total: 0 },
        };
        const highPowerRacksList: Rack[] = [];

        const prefixesByRoom: { [key in Room]: { ac: string[], dc: string[] } } = {
            ITN1: { ac: [], dc: [] },
            ITN2: { ac: [], dc: [] },
            ITN3: { ac: [], dc: [] },
        };
        
        for (const room of ['ITN1', 'ITN2', 'ITN3'] as const) {
            const roomNumber = room.slice(-1);
            const roomPanelPrefix = `tc.${roomNumber}.`;
        
            prefixesByRoom[room].ac = (['A', 'B', 'C'] as const)
                .flatMap(chain => panelConfig[chain])
                .filter(panel => panel.name.toLowerCase().startsWith(roomPanelPrefix))
                .flatMap(panel => panel.prefixes)
                .map(p => p.trim().toLowerCase());
            
            prefixesByRoom[room].dc = (['A', 'B', 'C'] as const)
                .flatMap(chain => rectifierConfig[chain][room] || [])
                .map(p => p.trim().toLowerCase());
        }
        
        let totalRackPower = 0;
        
        racks.forEach(rack => {
            let rackAC = 0;
            let rackDC = 0;
            const room = rack.Salle as Room;

            if (room !== 'ITN1' && room !== 'ITN2' && room !== 'ITN3') return;
        
            const validAcPrefixesForRoom = prefixesByRoom[room].ac;
            const validDcPrefixesForRoom = prefixesByRoom[room].dc;

            const processVoie = (source: string, p1: number, p2: number, p3: number, dc: number) => {
                if (!source) return;
                const s = source.trim().toLowerCase();
                if (validAcPrefixesForRoom.some(p => s.startsWith(p))) {
                    rackAC += p1 + p2 + p3;
                }
                if (validDcPrefixesForRoom.some(p => s.startsWith(p))) {
                    rackDC += dc;
                }
            };
            
            processVoie(rack.Canalis_Redresseur_Voie1, rack.P_Voie1_Ph1, rack.P_Voie1_Ph2, rack.P_Voie1_Ph3, rack.P_Voie1_DC);
            processVoie(rack.Canalis_Redresseur_Voie2, rack.P_Voie2_Ph1, rack.P_Voie2_Ph2, rack.P_Voie2_Ph3, rack.P_Voie2_DC);
            
            const rackTotal = rackAC + rackDC;
            totalRackPower += rackTotal;

            powerByRoom[room].ac += rackAC;
            powerByRoom[room].dc += rackDC;
            powerByRoom[room].total += rackTotal;
            
            const capacity = getRackCapacity(rack);
            if (capacity > 0 && (rackTotal / capacity) > 0.8) {
                highPowerRacksList.push(rack);
            }
        });

        const otherConsumersAC = Object.values(otherConsumers).reduce((acc, chain) => acc + chain.acP1 + chain.acP2 + chain.acP3, 0);
        const otherConsumersDC = Object.values(otherConsumers).reduce((acc, chain) => acc + chain.dc, 0);
        const totalOtherConsumersPower = otherConsumersAC + otherConsumersDC;
        
        const totalPower = totalRackPower + totalOtherConsumersPower;

        const chartData = [
            { name: 'ITN1', 'Consumed Power': parseFloat(powerByRoom.ITN1.total.toFixed(1)), 'Max Capacity': capacities.ROOM_CAPACITY_ITN1_kW },
            { name: 'ITN2', 'Consumed Power': parseFloat(powerByRoom.ITN2.total.toFixed(1)), 'Max Capacity': capacities.ROOM_CAPACITY_ITN2_kW },
            { name: 'ITN3', 'Consumed Power': parseFloat(powerByRoom.ITN3.total.toFixed(1)), 'Max Capacity': capacities.ROOM_CAPACITY_ITN3_kW },
        ];
        
        const itn1Style = getRoomLoadStyle(powerByRoom.ITN1.total, capacities.ROOM_CAPACITY_ITN1_kW, 'bg-blue-600/30');
        const itn2Style = getRoomLoadStyle(powerByRoom.ITN2.total, capacities.ROOM_CAPACITY_ITN2_kW, 'bg-purple-600/30');
        const itn3Style = getRoomLoadStyle(powerByRoom.ITN3.total, capacities.ROOM_CAPACITY_ITN3_kW, 'bg-orange-600/30');


        return { totalRacks, totalPower, totalOtherConsumersPower, chartData, itn1Load: powerByRoom.ITN1, itn2Load: powerByRoom.ITN2, itn3Load: powerByRoom.ITN3, highPowerRacks: highPowerRacksList.length, highPowerRacksList, itn1Style, itn2Style, itn3Style };
    }, [racks, otherConsumers, capacities]);

    const highPowerCount = stats.highPowerRacksList.length;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Global Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard 
                    title="Total Racks" 
                    value={stats.totalRacks} 
                    icon={<RackIcon />} 
                    colorClass="bg-blue-600/30"
                />
                <StatCard
                    title="High Power Racks (>80%)"
                    value={highPowerCount}
                    icon={<WarningIcon className={highPowerCount > 0 ? 'text-red-400' : 'text-gray-400'} />}
                    colorClass={highPowerCount > 0 ? 'bg-red-500/30' : 'bg-gray-700'}
                    onClick={() => highPowerCount > 0 && setIsHighPowerModalOpen(true)}
                />
                 <StatCard 
                    title="Total ITN Power" 
                    value={`${stats.totalPower.toFixed(1)} kW`} 
                    icon={<PowerIcon className="text-green-400"/>} 
                    colorClass="bg-green-600/30"
                />
                <StatCard 
                    title="Power (Other Consumers)" 
                    value={`${stats.totalOtherConsumersPower.toFixed(1)} kW`} 
                    icon={<PowerIcon className="text-yellow-400"/>} 
                    colorClass="bg-yellow-600/30"
                />
                <StatCard 
                    title="ITN1 Power Load" 
                    value={`${stats.itn1Load.total.toFixed(1)} kW`}
                    subtitle={`AC: ${stats.itn1Load.ac.toFixed(1)}kW | DC: ${stats.itn1Load.dc.toFixed(1)}kW`}
                    icon={<RowIcon className="text-blue-300"/>} 
                    colorClass={stats.itn1Style.colorClass}
                    animationClass={stats.itn1Style.animationClass}
                />
                 <StatCard 
                    title="ITN2 Power Load" 
                    value={`${stats.itn2Load.total.toFixed(1)} kW`}
                    subtitle={`AC: ${stats.itn2Load.ac.toFixed(1)}kW | DC: ${stats.itn2Load.dc.toFixed(1)}kW`}
                    icon={<RowIcon className="text-purple-300"/>} 
                    colorClass={stats.itn2Style.colorClass}
                    animationClass={stats.itn2Style.animationClass}
                />
                 <StatCard 
                    title="ITN3 Power Load" 
                    value={`${stats.itn3Load.total.toFixed(1)} kW`}
                    subtitle={`AC: ${stats.itn3Load.ac.toFixed(1)}kW | DC: ${stats.itn3Load.dc.toFixed(1)}kW`}
                    icon={<RowIcon className="text-orange-500"/>} 
                    colorClass={stats.itn3Style.colorClass}
                    animationClass={stats.itn3Style.animationClass}
                />
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-80">
                 <h3 className="text-xl font-bold text-blue-400 mb-4">Power Consumption by Room</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={stats.chartData}
                        margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" unit="kW" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#E5E7EB' }}
                            cursor={{ fill: 'rgba(55, 65, 81, 0.5)' }}
                        />
                        <Legend />
                        <Bar dataKey="Consumed Power" fill="#3B82F6" name="Consumed Power (kW)" />
                        <Bar dataKey="Max Capacity" fill="#164e63" name="Max Capacity (kW)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

             {isHighPowerModalOpen && (
                <Modal title={`High Power Racks (${highPowerCount})`} onClose={() => setIsHighPowerModalOpen(false)}>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-100 uppercase bg-gray-700 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Room</th>
                                    <th scope="col" className="px-6 py-3">Rack</th>
                                    <th scope="col" className="px-6 py-3">Client</th>
                                    <th scope="col" className="px-6 py-3">Power (kW)</th>
                                    <th scope="col" className="px-6 py-3">Capacity (kW)</th>
                                    <th scope="col" className="px-6 py-3">Utilization</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.highPowerRacksList.map(rack => {
                                    const totalPower = rack.P_Voie1_Ph1 + rack.P_Voie1_Ph2 + rack.P_Voie1_Ph3 + rack.P_Voie1_DC +
                                                       rack.P_Voie2_Ph1 + rack.P_Voie2_Ph2 + rack.P_Voie2_Ph3 + rack.P_Voie2_DC;
                                    const capacity = getRackCapacity(rack);
                                    const utilization = (totalPower / capacity) * 100;
                                    return (
                                        <tr key={rack.id} onClick={() => { onRackClick(rack); setIsHighPowerModalOpen(false); }} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 cursor-pointer">
                                            <td className="px-6 py-4">{rack.Salle}</td>
                                            <td className="px-6 py-4 font-medium text-white">{rack.Rack}</td>
                                            <td className="px-6 py-4">{rack.Porteur}</td>
                                            <td className="px-6 py-4">{totalPower.toFixed(2)}</td>
                                            <td className="px-6 py-4">{capacity.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-red-400">{utilization.toFixed(1)}%</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Dashboard;