import { useState, useCallback } from 'react';
import type { Rack, OtherConsumersStateMap } from '../types';

// Hardcoded Google Apps Script URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyC5P97Mexn1Q0h6PL1deeWdjyib1G4N3XzdnfIZD-6B4LyOjSzInl3UelXtUJgZQazDA/exec";

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

const flexibleParseFloat = (value: any): number => {
    if (value === null || value === undefined) return 0;
    let strValue = String(value).trim();
    if (strValue === '') return 0;
    
    // Handles French format ("1.234,56") and American ("1,234.56")
    const hasComma = strValue.includes(',');
    const hasDot = strValue.includes('.');
    
    if (hasComma && hasDot) { // e.g., "1.234,56" or "1,234.56"
      // Assume comma is decimal if it appears after the last dot
      if (strValue.lastIndexOf(',') > strValue.lastIndexOf('.')) {
        strValue = strValue.replace(/\./g, '').replace(',', '.');
      } else {
        strValue = strValue.replace(/,/g, '');
      }
    } else if (hasComma) { // Only comma, assume it's the decimal separator
      strValue = strValue.replace(',', '.');
    }

    const num = parseFloat(strValue);
    return isNaN(num) ? 0 : num;
};


export const useGoogleSheet = () => {
    const [racks, setRacks] = useState<Rack[]>([]);
    const [otherConsumers, setOtherConsumers] = useState<OtherConsumersStateMap>({
        A: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
        B: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
        C: { acP1: 0, acP2: 0, acP3: 0, dc: 0 },
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

            const processedRacks = data.racks.map((rawRack: any, index: number) => {
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
            const errorMessage = `Failed to connect to Google Sheet. Please check the following: 1. Is the Google Apps Script URL correct in the source code? 2. Did you DEPLOY a NEW VERSION of the script after pasting the latest code? 3. In deployment settings, is "Who has access" set to "Anyone"? 4. Have you authorized the script to access your Google account? Original error: ${e.message}`;
            setError(errorMessage);
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

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'write',
                    racks: racksToSave.map(({ id, ...rest }) => rest), // Remove client-side id before saving
                    otherConsumers: consumersPayload,
                }),
            });

            if (!response.ok) throw new Error(`Network response was not ok, status: ${response.status}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Unknown error occurred during save.');

        } catch (e: any) {
            setError(`Save failed: ${e.message}`);
            throw e;
        }
    }, [consumerHeaders]);

    const addRack = useCallback((rack: Omit<Rack, 'id'>) => {
        const newId = racks.length > 0 ? Math.max(...racks.map(r => r.id)) + 1 : 1;
        const newRack = { ...rack, id: newId } as Rack;
        setRacks(prev => [...prev, newRack]);
    }, [racks]);

    const updateRack = useCallback((updatedRack: Rack) => {
        setRacks(prev => prev.map(r => r.id === updatedRack.id ? updatedRack : r));
    }, []);

    const deleteRack = useCallback((rackToDelete: Rack) => {
        setRacks(prev => prev.filter(r => r.id !== rackToDelete.id));
    }, []);
    
    return {
        racks,
        otherConsumers,
        loading,
        error,
        loadData,
        addRack,
        updateRack,
        deleteRack,
        saveData,
        setOtherConsumers,
    };
};
