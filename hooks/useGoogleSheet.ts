import { useState, useCallback } from 'react';
// Hardcoded Google Apps Script URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyC5P97Mexn1Q0h6PL1deeWdjyib1G4N3XzdnfIZD-6B4LyOjSzInl3UelXtUJgZQazDA/exec";

import type { Rack, OtherConsumersStateMap, Capacities } from '../types';
import { flexibleParseFloat } from '../utils';

const RACK_FIELDS_FULL: (keyof Rack)[] = [
    'id', 'Salle', 'Rack', 'Rangée', 'Num_Rack', 'Designation', 'Porteur', 'Dimensions', 'Largeur_mm',
    'Alimentation', 'Phase', 'PDU', 'Puissance_PDU', 'Moyenne_Capacitaire_Rack', 'Canalis_Redresseur_Voie1',
    'Canalis_Redresseur_Voie2', 'P_Voie1_Ph1', 'P_Voie1_Ph2', 'P_Voie1_Ph3', 'P_Voie1_DC', 'P_Voie2_Ph1',
    'P_Voie2_Ph2', 'P_Voie2_Ph3', 'P_Voie2_DC'
];
const NUMERIC_RACK_FIELDS: (keyof Rack)[] = [
    'Largeur_mm', 'Puissance_PDU', 'Moyenne_Capacitaire_Rack', 'P_Voie1_Ph1', 'P_Voie1_Ph2',
    'P_Voie1_Ph3', 'P_Voie1_DC', 'P_Voie2_Ph1', 'P_Voie2_Ph2', 'P_Voie2_Ph3', 'P_Voie2_DC'
];

const DEFAULT_CAPACITIES: Capacities = {
    UPS_A_kW: 1000,
    UPS_B_kW: 1000,
    UPS_C_kW: 1000,
    ROOM_CAPACITY_ITN1_kW: 500,
    ROOM_CAPACITY_ITN2_kW: 500,
    ROOM_CAPACITY_ITN3_kW: 500,
    ROW_AC_CAPACITY_kW: 80,
    ROW_DC_CAPACITY_kW: 80,
};

// Key for storing capacities in the browser's local storage
const CAPACITIES_STORAGE_KEY = 'app_capacities';

export const useGoogleSheet = () => {
    const [racks, setRacks] = useState<Rack[]>([]);
    const [otherConsumers, setOtherConsumers] = useState<OtherConsumersStateMap>({
        A: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
        B: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
        C: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
    });
    const [capacities, setCapacities] = useState<Capacities>(() => {
        // Load capacities from localStorage on initial load
        try {
            const savedCapacities = localStorage.getItem(CAPACITIES_STORAGE_KEY);
            if (savedCapacities) {
                return { ...DEFAULT_CAPACITIES, ...JSON.parse(savedCapacities) };
            }
        } catch (e) {
            console.error("Failed to parse capacities from localStorage", e);
        }
        return DEFAULT_CAPACITIES;
    });
    const [consumerHeaders, setConsumerHeaders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'read' }),
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const processedRacks = (data.racks || []).map((rawRack: any, index: number) => {
                 const newRack: Record<string, any> = { id: index + 1 };
                 for (const key in rawRack) {
                     newRack[key] = rawRack[key];
                 }
                
                RACK_FIELDS_FULL.forEach(field => {
                    const value = newRack[field];
                     if (NUMERIC_RACK_FIELDS.includes(field)) {
                        newRack[field] = flexibleParseFloat(value);
                    } else if (value === undefined || value === null) {
                        newRack[field] = '';
                    } else {
                        newRack[field] = String(value);
                    }
                });
                return newRack as Rack;
            });
            setRacks(processedRacks);
            
            const consumerData = data.otherConsumers || [];
            const consumersState: OtherConsumersStateMap = {
                A: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
                B: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
                C: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
            };

            if (consumerData.length > 0) {
                const originalHeaders = Object.keys(consumerData[0]);
                setConsumerHeaders(originalHeaders);

                const headerMap: { [key: string]: string } = {};
                originalHeaders.forEach(h => {
                    headerMap[h.toLowerCase().replace(/\s/g, '')] = h;
                });
                
                consumerData.forEach((row: any) => {
                    const chainHeader = headerMap['chain'];
                    if (!chainHeader) return;
                    
                    const chain = String(row[chainHeader] || '').toUpperCase();
                    if (chain === 'A' || chain === 'B' || chain === 'C') {
                        consumersState[chain] = {
                            acP1: flexibleParseFloat(row[headerMap['acp1']]),
                            acP2: flexibleParseFloat(row[headerMap['acp2']]),
                            acP3: flexibleParseFloat(row[headerMap['acp3']]),
                            dc:   flexibleParseFloat(row[headerMap['dc']]),
                        };
                    }
                });
            } else {
                 setConsumerHeaders([]);
            }
            setOtherConsumers(consumersState);

        } catch (e: any) {
            let errorMessage = `Failed to load data from Google Sheet. ${e.message}`;
            if (e instanceof TypeError && e.message.toLowerCase().includes('failed to fetch')) {
                errorMessage = `A network error occurred ("Failed to fetch"). This is a common issue with several possible causes:\n\n` +
                               `1. Script Deployment Error: The most likely cause. The Google Apps Script is not correctly deployed.\n` +
                               `   ▶ Please go to your script editor.\n` +
                               `   ▶ Click "Deploy" -> "New deployment".\n` +
                               `   ▶ In the dialog, ensure "Who has access" is set to "Anyone".\n` +
                               `   ▶ Click "Deploy".\n\n` +
                               `2. Internet Connection: Please verify that you are connected to the internet.\n\n` +
                               `3. Script URL Mismatch: The SCRIPT_URL in the application's code may be incorrect. Please verify it matches the URL of your deployed script.\n\n` +
                               `If the problem persists, check the script's execution logs in your Google Apps Script project for any errors.`;
            }
            setError(errorMessage);
            setRacks([]);
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const saveData = useCallback(async (racksToSave: Rack[], consumersToSave: OtherConsumersStateMap) => {
        try {
            const consumersPayload = Object.entries(consumersToSave).map(([chain, values]) => {
                const row: Record<string, string | number> = {};
                const headerMap: { [key: string]: string } = {};
                consumerHeaders.forEach(h => {
                    headerMap[h.toLowerCase().replace(/\s/g, '')] = h;
                });
                
                if (headerMap['chain']) row[headerMap['chain']] = chain;
                if (headerMap['acp1']) row[headerMap['acp1']] = values.acP1;
                if (headerMap['acp2']) row[headerMap['acp2']] = values.acP2;
                if (headerMap['acp3']) row[headerMap['acp3']] = values.acP3;
                if (headerMap['dc']) row[headerMap['dc']] = values.dc;

                return row;
            });

            const allRackKeys = new Set(racksToSave.flatMap(r => Object.keys(r)));
            allRackKeys.delete('id'); 

            const rackDataForSheet = racksToSave.map(rack => {
                const newRackObject: { [key: string]: any } = {};
                allRackKeys.forEach(key => {
                    newRackObject[key] = (rack as any)[key] ?? '';
                });
                return newRackObject;
            });


            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'write',
                    racks: rackDataForSheet,
                    otherConsumers: consumersPayload,
                }),
            });

            if (!response.ok) throw new Error(`Network response was not ok, status: ${response.status}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Unknown error occurred during save.');

        } catch (e: any) {
            let errorMessage = `Save failed: ${e.message}`;
            if (e instanceof TypeError && e.message.toLowerCase().includes('failed to fetch')) {
                errorMessage = `A network error occurred during save ("Failed to fetch").\n\n` +
                               `Please check your internet connection and ensure your Google Apps Script is correctly deployed with access for 'Anyone'.`;
            }
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [consumerHeaders]);

    const saveCapacities = useCallback((capacitiesToSave: Capacities) => {
        try {
            const capacitiesString = JSON.stringify(capacitiesToSave);
            localStorage.setItem(CAPACITIES_STORAGE_KEY, capacitiesString);
            setCapacities(capacitiesToSave); // Ensure state is in sync
        } catch (e) {
            console.error("Failed to save capacities to localStorage", e);
            throw new Error("Could not save capacities. Your browser might be configured to block local storage.");
        }
    }, []);

    const updateRack = useCallback((updatedRack: Rack) => {
        setRacks(prevRacks => {
            const rackIndex = prevRacks.findIndex(r => r.Salle === updatedRack.Salle && r.Rack === updatedRack.Rack);
            
            if (rackIndex === -1) {
                console.error("Critical: Could not find the rack to update. Aborting state change to prevent data loss.", updatedRack);
                return prevRacks;
            }
            
            const newRacks = [...prevRacks];
            newRacks[rackIndex] = updatedRack;
            return newRacks;
        });
    }, []);

    const deleteRack = useCallback((rackToDelete: Rack) => {
        setRacks(prev => prev.filter(r => !(r.Salle === rackToDelete.Salle && r.Rack === rackToDelete.Rack)));
    }, []);
    
    return {
        racks,
        otherConsumers,
        capacities,
        loading,
        error,
        loadData,
        updateRack,
        deleteRack,
        saveData,
        saveCapacities,
        setOtherConsumers,
        setCapacities,
    };
};