import React, { useState, useMemo, useEffect } from 'react';
import type { Rack, Room, OtherConsumersState, OtherConsumersStateMap } from '../types';
import { UPSIcon } from './icons';

interface PowerChainsViewProps {
    racks: Rack[];
    otherConsumers: OtherConsumersStateMap;
    setOtherConsumers: React.Dispatch<React.SetStateAction<OtherConsumersStateMap>>;
    saveData: (racks: Rack[], consumers: OtherConsumersStateMap) => Promise<void>;
    setAppError: (error: string | null) => void;
}

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

const OtherConsumersCard: React.FC<{
    chain: 'A' | 'B' | 'C';
    values: OtherConsumersState;
    onApply: (newValues: OtherConsumersState) => void;
    disabled: boolean;
    isSaving: boolean;
}> = ({ chain, values, onApply, disabled, isSaving }) => {
    const [localState, setLocalState] = useState(values);

    useEffect(() => {
        setLocalState(values);
    }, [values]);

    const handleChange = (field: keyof OtherConsumersState, value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        setLocalState(prev => ({ ...prev, [field]: numValue }));
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <h4 className="font-semibold text-lg text-yellow-400 mb-3">Other Consumers</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                {(['acP1', 'acP2', 'acP3', 'dc'] as const).map((field) => (
                    <div key={field}>
                        <label className="text-gray-400 text-xs block mb-1">{field.startsWith('ac') ? `AC Ph ${field.slice(-1)}` : 'DC'}</label>
                        <input
                            type="text"
                            value={localState[field].toFixed(2)}
                            onChange={(e) => handleChange(field, e.target.value)}
                            disabled={disabled}
                            className={`bg-gray-700 text-white font-semibold w-full p-1 rounded-md text-right border border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end mt-4">
                <button
                    onClick={() => onApply(localState)}
                    disabled={disabled}
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isSaving ? 'Saving...' : 'Apply Changes'}
                </button>
            </div>
        </div>
    );
};

const PhaseCard: React.FC<{ label: string; load: number; capacity: number }> = ({ label, load, capacity }) => {
    const utilization = capacity > 0 ? load / capacity : 0;
    const colorClass =
        utilization > 0.9 ? 'bg-red-800' :
        utilization > 0.7 ? 'bg-orange-500' : 'bg-green-600';

    return (
        <div className={`p-4 rounded-lg flex flex-col justify-center items-center text-white shadow-md ${colorClass}`}>
            <span className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</span>
            <span className="text-3xl font-bold mt-1 tracking-tight">{load.toFixed(1)} <span className="text-lg">kW</span></span>
            <span className="text-base font-semibold opacity-90 mt-1">{(utilization * 100).toFixed(1)}%</span>
        </div>
    );
};


const PowerChainsView: React.FC<PowerChainsViewProps> = ({ racks, otherConsumers, setOtherConsumers, saveData, setAppError }) => {
    const [efficiency, setEfficiency] = useState(96);
    const [failedChains, setFailedChains] = useState<Set<'A' | 'B' | 'C'>>(new Set());
    const [isSavingConsumers, setIsSavingConsumers] = useState(false);

    const handleToggleChain = (chain: 'A' | 'B' | 'C') => {
        setFailedChains(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chain)) {
                newSet.delete(chain);
            } else if (newSet.size === 0) {
                newSet.add(chain);
            }
            return newSet;
        });
    };

    const simulatedOtherConsumers = useMemo(() => {
        if (failedChains.size === 0) {
            return otherConsumers;
        }

        const newConsumersState = JSON.parse(JSON.stringify(otherConsumers)) as OtherConsumersStateMap;
        const allChains: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
        const activeChains = allChains.filter(c => !failedChains.has(c));
        const failedChainList = Array.from(failedChains);

        if (activeChains.length > 0) {
            failedChainList.forEach(failedChain => {
                const loadToRedistribute = otherConsumers[failedChain];
                activeChains.forEach(activeChain => {
                    newConsumersState[activeChain].acP1 += loadToRedistribute.acP1 / activeChains.length;
                    newConsumersState[activeChain].acP2 += loadToRedistribute.acP2 / activeChains.length;
                    newConsumersState[activeChain].acP3 += loadToRedistribute.acP3 / activeChains.length;
                    newConsumersState[activeChain].dc   += loadToRedistribute.dc / activeChains.length;
                });
            });
        }
        
        failedChainList.forEach(failedChain => {
            newConsumersState[failedChain] = { acP1: 0, acP2: 0, acP3: 0, dc: 0 };
        });

        return newConsumersState;
    }, [otherConsumers, failedChains]);

    const calculationResults = useMemo(() => {
        const getChainFromSource = (source: string): 'A' | 'B' | 'C' | null => {
            if (!source) return null;
            const s = source.trim().toUpperCase();
            const match = s.match(/(?:[.-]|\s)([ABC])(?:[.-]|\s|$)/); 
            if (match && match[1]) {
                return match[1] as 'A' | 'B' | 'C';
            }
            const matchRec = s.match(/REC\s([ABC])/);
            if (matchRec && matchRec[1]) {
                return matchRec[1] as 'A' | 'B' | 'C';
            }
            return null;
        };

        const simulatedRacks = racks.map(rack => {
            if (failedChains.size === 0) return rack;

            const chain1 = getChainFromSource(rack.Canalis_Redresseur_Voie1);
            const chain2 = getChainFromSource(rack.Canalis_Redresseur_Voie2);

            const is_v1_active = chain1 && !failedChains.has(chain1);
            const is_v2_active = chain2 && !failedChains.has(chain2);

            if ((is_v1_active && is_v2_active) || (!is_v1_active && !is_v2_active)) {
                return rack;
            }

            const finalRack = { ...rack };
            const v1_power = { p1: rack.P_Voie1_Ph1, p2: rack.P_Voie1_Ph2, p3: rack.P_Voie1_Ph3, dc: rack.P_Voie1_DC };
            const v2_power = { p1: rack.P_Voie2_Ph1, p2: rack.P_Voie2_Ph2, p3: rack.P_Voie2_Ph3, dc: rack.P_Voie2_DC };
        
            if (is_v1_active && !is_v2_active) { // V1 ok, V2 failed or absent
                finalRack.P_Voie1_Ph1 += v2_power.p1;
                finalRack.P_Voie1_Ph2 += v2_power.p2;
                finalRack.P_Voie1_Ph3 += v2_power.p3;
                finalRack.P_Voie1_DC  += v2_power.dc;
                finalRack.P_Voie2_Ph1 = 0; finalRack.P_Voie2_Ph2 = 0; finalRack.P_Voie2_Ph3 = 0; finalRack.P_Voie2_DC = 0;
            } else if (!is_v1_active && is_v2_active) { // V1 failed or absent, V2 ok
                finalRack.P_Voie2_Ph1 += v1_power.p1;
                finalRack.P_Voie2_Ph2 += v1_power.p2;
                finalRack.P_Voie2_Ph3 += v1_power.p3;
                finalRack.P_Voie2_DC  += v1_power.dc;
                finalRack.P_Voie1_Ph1 = 0; finalRack.P_Voie1_Ph2 = 0; finalRack.P_Voie1_Ph3 = 0; finalRack.P_Voie1_DC = 0;
            } else { // Both voies are inactive (logically unreachable due to first if, but kept for safety)
                finalRack.P_Voie1_Ph1 = 0; finalRack.P_Voie1_Ph2 = 0; finalRack.P_Voie1_Ph3 = 0; finalRack.P_Voie1_DC = 0;
                finalRack.P_Voie2_Ph1 = 0; finalRack.P_Voie2_Ph2 = 0; finalRack.P_Voie2_Ph3 = 0; finalRack.P_Voie2_DC = 0;
            }
            
            return finalRack;
        });


        const results: { [key in 'A' | 'B' | 'C']: {
            totalLoad: { p1: number, p2: number, p3: number };
            loadByRoom: { [key in Room | string]: { ac: number, dc: number, equivAc: number } }
        }} = {
            A: { totalLoad: { p1: 0, p2: 0, p3: 0 }, loadByRoom: {} },
            B: { totalLoad: { p1: 0, p2: 0, p3: 0 }, loadByRoom: {} },
            C: { totalLoad: { p1: 0, p2: 0, p3: 0 }, loadByRoom: {} },
        };

        const safeEfficiency = efficiency > 0 ? efficiency / 100 : 0.96;

        for (const chain of ['A', 'B', 'C'] as const) {
            const chainAcPanelPrefixes = panelConfig[chain].flatMap(p => p.prefixes.map(prefix => prefix.trim().toLowerCase()));
            const chainDcRectifierPrefixes = Object.values(rectifierConfig[chain] || {}).flat().map(prefix => prefix.trim().toLowerCase());
            
            const roomContributions: { [key in Room | string]: { ac: { p1: number, p2: number, p3: number }, dc: number } } = {};

            simulatedRacks.forEach(rack => {
                const roomName = rack.Salle as Room;
                
                const sources = [rack.Canalis_Redresseur_Voie1, rack.Canalis_Redresseur_Voie2];
                const acPowers = [
                    {p1: rack.P_Voie1_Ph1, p2: rack.P_Voie1_Ph2, p3: rack.P_Voie1_Ph3},
                    {p1: rack.P_Voie2_Ph1, p2: rack.P_Voie2_Ph2, p3: rack.P_Voie2_Ph3}
                ];
                const dcPowers = [rack.P_Voie1_DC, rack.P_Voie2_DC];
            
                sources.forEach((source, index) => {
                    if (!source) return;
                    const s = source.trim().toLowerCase();
                    
                    if (chainAcPanelPrefixes.some(p => s.startsWith(p))) {
                        if (!roomContributions[roomName]) roomContributions[roomName] = { ac: { p1: 0, p2: 0, p3: 0 }, dc: 0 };
                        roomContributions[roomName].ac.p1 += acPowers[index].p1;
                        roomContributions[roomName].ac.p2 += acPowers[index].p2;
                        roomContributions[roomName].ac.p3 += acPowers[index].p3;
                    }
            
                    if (chainDcRectifierPrefixes.some(p => s.startsWith(p))) {
                        if (!roomContributions[roomName]) roomContributions[roomName] = { ac: { p1: 0, p2: 0, p3: 0 }, dc: 0 };
                        roomContributions[roomName].dc += dcPowers[index];
                    }
                });
            });

            Object.entries(roomContributions).forEach(([roomName, contrib]) => {
                const totalAc = contrib.ac.p1 + contrib.ac.p2 + contrib.ac.p3;
                const equivAc = contrib.dc / safeEfficiency;
                
                results[chain].loadByRoom[roomName] = { ac: totalAc, dc: contrib.dc, equivAc: equivAc };
                
                results[chain].totalLoad.p1 += contrib.ac.p1 + (equivAc / 3);
                results[chain].totalLoad.p2 += contrib.ac.p2 + (equivAc / 3);
                results[chain].totalLoad.p3 += contrib.ac.p3 + (equivAc / 3);
            });

            const consumer = simulatedOtherConsumers[chain];
            results[chain].totalLoad.p1 += consumer.acP1;
            results[chain].totalLoad.p2 += consumer.acP2;
            results[chain].totalLoad.p3 += consumer.acP3;
            const consumerEquivAc = consumer.dc / safeEfficiency;
            results[chain].totalLoad.p1 += consumerEquivAc / 3;
            results[chain].totalLoad.p2 += consumerEquivAc / 3;
            results[chain].totalLoad.p3 += consumerEquivAc / 3;
        }
        return results;
    }, [racks, efficiency, failedChains, simulatedOtherConsumers]);
    
    const handleApplyConsumers = async (chain: 'A' | 'B' | 'C', newValues: OtherConsumersState) => {
        const newConsumersState = { ...otherConsumers, [chain]: newValues };
        const originalConsumers = otherConsumers;
        setOtherConsumers(newConsumersState); // Optimistic update

        setIsSavingConsumers(true);
        setAppError(null);
        try {
            await saveData(racks, newConsumersState);
        } catch (e: any) {
            setAppError(`Save failed: ${e.message}`);
            setOtherConsumers(originalConsumers); // Revert on failure
        } finally {
            setIsSavingConsumers(false);
        }
    };

    const capacityPerPhase = 1000 / 3;

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Power Chain Analysis</h2>
            <div className="space-y-8">
                {(['A', 'B', 'C'] as const).map(chain => {
                    const { totalLoad, loadByRoom } = calculationResults[chain];
                    const phases = [totalLoad.p1, totalLoad.p2, totalLoad.p3];
                    const isOverloaded = phases.some(p => p / capacityPerPhase > 0.9);
                    const isFailed = failedChains.has(chain);
                    const isAnotherChainFailed = failedChains.size > 0 && !isFailed;
                    const contributions = Object.entries(loadByRoom).filter(([, loads]) => loads.ac > 0.01 || loads.dc > 0.01);

                    return (
                        <div key={chain} className="bg-gray-800 p-6 rounded-lg shadow-xl">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-2xl font-bold transition-colors ${isFailed ? 'text-gray-500' : 'text-white'}`}>Power Chain {chain}</h3>
                                <button
                                    onClick={() => handleToggleChain(chain)}
                                    disabled={isAnotherChainFailed}
                                    className={`px-4 py-2 rounded-md font-bold text-white transition-colors text-sm ${
                                        isFailed
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    } ${isAnotherChainFailed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isFailed ? 'Restart Chain' : 'Stop Chain'}
                                </button>
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${isFailed ? 'opacity-40' : 'opacity-100'}`}>
                                <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4">
                                     <div className={`relative ${isOverloaded && !isFailed ? 'animate-pulse-border rounded-full' : ''}`}>
                                        <UPSIcon className="w-20 h-20 text-blue-300" />
                                     </div>
                                    <div className="w-full">
                                        <label htmlFor={`efficiency-${chain}`} className="text-sm text-gray-400 mb-1 block text-center">Rectifier Efficiency</label>
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="number"
                                                id={`efficiency-${chain}`}
                                                value={efficiency}
                                                onChange={(e) => setEfficiency(parseFloat(e.target.value) || 0)}
                                                className="bg-gray-700 w-24 p-1 rounded-md text-center font-semibold border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <span className="ml-2 text-lg font-semibold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {phases.map((load, index) => (
                                        <PhaseCard key={index} label={`Phase ${index + 1}`} load={load} capacity={capacityPerPhase} />
                                    ))}
                                </div>
                            </div>
                            
                            <div className={`mt-6 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${isFailed ? 'opacity-40' : 'opacity-100'}`}>
                                <div>
                                    <h4 className="font-semibold text-lg text-blue-400 mb-2">Load Contribution by Room</h4>
                                    <div className="space-y-2 bg-gray-900/50 p-4 rounded-lg min-h-[4rem]">
                                        {contributions.length > 0 ? (
                                            contributions.map(([room, loads]) => (
                                                <div key={room} className="text-sm">
                                                    <strong className="text-white">{room}:</strong> 
                                                    <span className="ml-2 text-blue-300">{loads.ac.toFixed(1)} kW (AC)</span>
                                                    <span className="ml-2 text-purple-400">{loads.dc.toFixed(1)} kW (DC)</span>
                                                    <span className="ml-2 text-gray-400 text-xs">({loads.equivAc.toFixed(1)} kW AC eq.)</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-gray-500 text-center pt-3">
                                                No rack load contribution from any room for this chain.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <OtherConsumersCard 
                                    chain={chain} 
                                    values={simulatedOtherConsumers[chain]} 
                                    onApply={(newValues) => handleApplyConsumers(chain, newValues)} 
                                    disabled={failedChains.size > 0 || isSavingConsumers}
                                    isSaving={isSavingConsumers}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PowerChainsView;