import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Rack, Room, OtherConsumersStateMap } from '../types';
import { PowerIcon, RackIcon, RowIcon, WarningIcon } from './icons';
import Modal from './common/Modal';

interface DashboardProps {
    racks: Rack[];
    onRackClick: (rack: Rack) => void;
    otherConsumers: OtherConsumersStateMap;
}

const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: JSX.Element;
    subtitle?: string;
    colorClass?: string;
    onClick?: () => void;
}> = ({ title, value, icon, subtitle, colorClass = 'bg-gray-700', onClick }) => (
    <div
        onClick={onClick}
        className={`bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4 transition-colors duration-200 ${onClick ? 'cursor-pointer hover:bg-gray-700/50' : ''}`}
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


const Dashboard: React.FC<DashboardProps> = ({ racks, onRackClick, otherConsumers }) => {
    const [isHighPowerModalOpen, setIsHighPowerModalOpen] = useState(false);

    const stats = useMemo(() => {
        const totalRacks = racks.length;
        
        const totalRackPower = racks.reduce((acc, rack) => {
            return acc + rack.P_Voie1_Ph1 + rack.P_Voie1_Ph2 + rack.P_Voie1_Ph3 + rack.P_Voie1_DC +
                   rack.P_Voie2_Ph1 + rack.P_Voie2_Ph2 + rack.P_Voie2_Ph3 + rack.P_Voie2_DC;
        }, 0);

        const otherConsumersAC = Object.values(otherConsumers).reduce((acc, chain) => acc + chain.acP1 + chain.acP2 + chain.acP3, 0);
        const otherConsumersDC = Object.values(otherConsumers).reduce((acc, chain) => acc + chain.dc, 0);
        const totalOtherConsumersPower = otherConsumersAC + otherConsumersDC;
        
        const totalPower = totalRackPower + totalOtherConsumersPower;
        
        const powerByRoom: { [key in Room | string]: { ac: number, dc: number, total: number } } = {
            ITN1: { ac: 0, dc: 0, total: 0 },
            ITN2: { ac: 0, dc: 0, total: 0 },
            ITN3: { ac: 0, dc: 0, total: 0 },
        };

        const highPowerRacksList: Rack[] = [];
        racks.forEach(rack => {
            const rackAC = rack.P_Voie1_Ph1 + rack.P_Voie1_Ph2 + rack.P_Voie1_Ph3 + rack.P_Voie2_Ph1 + rack.P_Voie2_Ph2 + rack.P_Voie2_Ph3;
            const rackDC = rack.P_Voie1_DC + rack.P_Voie2_DC;
            const rackTotal = rackAC + rackDC;

            if (rack.Salle === 'ITN1' || rack.Salle === 'ITN2' || rack.Salle === 'ITN3') {
                powerByRoom[rack.Salle].ac += rackAC;
                powerByRoom[rack.Salle].dc += rackDC;
                powerByRoom[rack.Salle].total += rackTotal;
            }
            
            if (rack.Puissance_PDU > 0 && (rackTotal / rack.Puissance_PDU) > 0.8) {
                highPowerRacksList.push(rack);
            }
        });

        const chartData = [
            { name: 'ITN1', 'Consumed Power': parseFloat(powerByRoom.ITN1.total.toFixed(1)), 'Max Capacity': 500 },
            { name: 'ITN2', 'Consumed Power': parseFloat(powerByRoom.ITN2.total.toFixed(1)), 'Max Capacity': 500 },
            { name: 'ITN3', 'Consumed Power': parseFloat(powerByRoom.ITN3.total.toFixed(1)), 'Max Capacity': 500 },
        ];

        return { totalRacks, totalPower, totalOtherConsumersPower, chartData, itn1Load: powerByRoom.ITN1, itn2Load: powerByRoom.ITN2, itn3Load: powerByRoom.ITN3, highPowerRacks: highPowerRacksList.length, highPowerRacksList };
    }, [racks, otherConsumers]);

    const highPowerCount = stats.highPowerRacksList.length;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Global Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    colorClass="bg-blue-600/30"
                />
                 <StatCard 
                    title="ITN2 Power Load" 
                    value={`${stats.itn2Load.total.toFixed(1)} kW`}
                    subtitle={`AC: ${stats.itn2Load.ac.toFixed(1)}kW | DC: ${stats.itn2Load.dc.toFixed(1)}kW`}
                    icon={<RowIcon className="text-purple-300"/>} 
                    colorClass="bg-purple-600/30"
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
                                    const utilization = (totalPower / rack.Puissance_PDU) * 100;
                                    return (
                                        <tr key={rack.id} onClick={() => { onRackClick(rack); setIsHighPowerModalOpen(false); }} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 cursor-pointer">
                                            <td className="px-6 py-4">{rack.Salle}</td>
                                            <td className="px-6 py-4 font-medium text-white">{rack.Rack}</td>
                                            <td className="px-6 py-4">{rack.Porteur}</td>
                                            <td className="px-6 py-4">{totalPower.toFixed(2)}</td>
                                            <td className="px-6 py-4">{rack.Puissance_PDU.toFixed(2)}</td>
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