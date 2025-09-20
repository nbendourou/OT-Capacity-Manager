import { useState, useCallback } from 'react';
import type { Rack, OtherConsumersStateMap } from '../types';
import { flexibleParseFloat } from '../utils';

declare const initSqlJs: any;
declare const XLSX: any;

const RACK_FIELDS: (keyof Rack)[] = [
    'Salle', 'Rack', 'Rangée', 'Num_Rack', 'Designation', 'Porteur', 'Dimensions', 'Largeur_mm',
    'Alimentation', 'Phase', 'PDU', 'Puissance_PDU', 'Moyenne_Capacitaire_Rack', 'Canalis_Redresseur_Voie1',
    'Canalis_Redresseur_Voie2', 'P_Voie1_Ph1', 'P_Voie1_Ph2', 'P_Voie1_Ph3', 'P_Voie1_DC', 'P_Voie2_Ph1',
    'P_Voie2_Ph2', 'P_Voie2_Ph3', 'P_Voie2_DC'
];
const NUMERIC_FIELDS: (keyof Rack)[] = [
    'Largeur_mm', 'Puissance_PDU', 'Moyenne_Capacitaire_Rack', 'P_Voie1_Ph1', 'P_Voie1_Ph2',
    'P_Voie1_Ph3', 'P_Voie1_DC', 'P_Voie2_Ph1', 'P_Voie2_Ph2', 'P_Voie2_Ph3', 'P_Voie2_DC'
];

const HEADER_ALIASES: { [key in keyof Partial<Rack>]?: string[] } = {
    Salle: ['salle', 'room', 'pièce'],
    Rack: ['rack', 'id', 'baie', 'bay'],
    Rangée: ['rangée', 'rangee', 'row', 'rang'],
    Num_Rack: ['num_rack', 'numrack', 'rack_number', 'n°rack', 'numéro rack'],
    Designation: ['designation', 'description', 'label', 'nom'],
    Porteur: ['porteur', 'owner', 'client'],
    Dimensions: ['dimensions', 'taille', 'size'],
    Largeur_mm: ['largeur_mm', 'largeurmm', 'widthmm', 'largeur (mm)'],
    Alimentation: ['alimentation', 'power_supply', 'alim'],
    Phase: ['phase'],
    PDU: ['pdu'],
    Puissance_PDU: ['puissance_pdu', 'puissancepdu', 'pdu_power_kw', 'pdupowerkw', 'puissance pdu (kw)'],
    Moyenne_Capacitaire_Rack: ['moyenne_capacitaire_rack', 'moyennecapacitairerack', 'avg_capacity', 'capacité_moyenne'],
    Canalis_Redresseur_Voie1: ['canalis_redresseur_voie1', 'canalisredresseurvoie1', 'source_voie_1', 'sourcevoie1', 'alimentation_voie_1'],
    Canalis_Redresseur_Voie2: ['canalis_redresseur_voie2', 'canalisredresseurvoie2', 'source_voie_2', 'sourcevoie2', 'alimentation_voie_2'],
    P_Voie1_Ph1: ['p_voie1_ph1', 'pvoie1ph1', 'power_v1_p1', 'puissance_voie1_ph1'],
    P_Voie1_Ph2: ['p_voie1_ph2', 'pvoie1ph2', 'power_v1_p2', 'puissance_voie1_ph2'],
    P_Voie1_Ph3: ['p_voie1_ph3', 'pvoie1ph3', 'power_v1_p3', 'puissance_voie1_ph3'],
    P_Voie1_DC: ['p_voie1_dc', 'pvoie1dc', 'power_v1_dc', 'puissance_voie1_dc'],
    P_Voie2_Ph1: ['p_voie2_ph1', 'pvoie2ph1', 'power_v2_p1', 'puissance_voie2_ph1'],
    P_Voie2_Ph2: ['p_voie2_ph2', 'pvoie2ph2', 'power_v2_p2', 'puissance_voie2_ph2'],
    P_Voie2_Ph3: ['p_voie2_ph3', 'pvoie2ph3', 'power_v2_p3', 'puissance_voie2_ph3'],
    P_Voie2_DC: ['p_voie2_dc', 'pvoie2dc', 'power_v2_dc', 'puissance_voie2_dc'],
};

export const useDb = () => {
    const [db, setDb] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const initializeDb = useCallback(async () => {
        try {
            const SQL = await initSqlJs({
                locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
            });
            const dbInstance = new SQL.Database();
            dbInstance.run(`
                CREATE TABLE Racks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Salle TEXT, Rack TEXT, Rangée TEXT, Num_Rack TEXT, Designation TEXT,
                    Porteur TEXT, Dimensions TEXT, Largeur_mm REAL, Alimentation TEXT, Phase TEXT,
                    PDU TEXT, Puissance_PDU REAL, Moyenne_Capacitaire_Rack REAL, Canalis_Redresseur_Voie1 TEXT,
                    Canalis_Redresseur_Voie2 TEXT, P_Voie1_Ph1 REAL, P_Voie1_Ph2 REAL, P_Voie1_Ph3 REAL,
                    P_Voie1_DC REAL, P_Voie2_Ph1 REAL, P_Voie2_Ph2 REAL, P_Voie2_Ph3 REAL, P_Voie2_DC REAL,
                    UNIQUE (Salle, Rack)
                );`
            );
            setDb(dbInstance);
        } catch (err) {
            console.error("Database initialization error:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const importXlsxData = useCallback(async (file: File): Promise<{ importedConsumers: OtherConsumersStateMap | null }> => {
        if (!db) throw new Error("Database not ready.");
        if (!file) throw new Error("No file provided.");
        
        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Clear existing data
            db.exec("DELETE FROM Racks;");

            // Process Racks
            const racksSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('racks')) || workbook.SheetNames[0];
            if (!racksSheetName) throw new Error("No 'Racks' sheet found in the Excel file.");
            
            const worksheet = workbook.Sheets[racksSheetName];
            const resultData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            const stmt = db.prepare(`INSERT OR REPLACE INTO Racks (${RACK_FIELDS.join(', ')}) VALUES (${RACK_FIELDS.map(() => '?').join(', ')});`);
            const normalizeHeader = (h: string) => h ? h.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
            const xlsxHeaders = Object.keys(resultData[0] as object);
            if (!xlsxHeaders || xlsxHeaders.length === 0) throw new Error("Could not read headers from 'Racks' sheet.");
            
            const headerMap: { [key in keyof Rack]?: string } = {};
            const normalizedXlsxHeaders = xlsxHeaders.map(h => ({ original: h, normalized: normalizeHeader(h) }));

            for (const rackField of RACK_FIELDS) {
                const aliases = HEADER_ALIASES[rackField as keyof Rack] || [normalizeHeader(rackField)];
                let foundHeader = aliases.map(normalizeHeader).map(alias => normalizedXlsxHeaders.find(h => h.normalized === alias)).find(Boolean);
                if (foundHeader) headerMap[rackField as keyof Rack] = foundHeader.original;
            }
            
            const importedCompositeKeys = new Set<string>();
            db.exec("BEGIN TRANSACTION;");

            for (const row of resultData) {
                 let finalSalle = '';
                const salleHeader = headerMap['Salle'];
                if (salleHeader && typeof row[salleHeader] === 'string') {
                    const salleValue = row[salleHeader].toLowerCase().trim();
                    if (salleValue.includes('itn1')) finalSalle = 'ITN1';
                    else if (salleValue.includes('itn3')) finalSalle = 'ITN3';
                    else if (salleValue.includes('itn2')) finalSalle = 'ITN2';
                }
                if (!finalSalle) {
                    for (const key in row) {
                        if (typeof row[key] === 'string') {
                            const cellValue = row[key].toLowerCase().trim();
                             if (cellValue.includes('itn1')) { finalSalle = 'ITN1'; break; }
                             if (cellValue.includes('itn3')) { finalSalle = 'ITN3'; break; }
                             if (cellValue.includes('itn2')) { finalSalle = 'ITN2'; break; }
                        }
                    }
                }

                const rackIdHeader = headerMap['Rack'];
                const rawRackId = rackIdHeader ? row[rackIdHeader] : undefined;
                const rackId = rawRackId ? String(rawRackId).trim() : '';

                if (!rackId || !finalSalle) continue;

                const compositeKey = `${finalSalle}-${rackId}`;
                if (importedCompositeKeys.has(compositeKey)) continue;
                
                const values = RACK_FIELDS.map(field => {
                    if (field === 'Salle') return finalSalle;
                    if (field === 'Rack') return rackId;
                    const xlsxHeader = headerMap[field as keyof Rack];
                    const value = xlsxHeader ? row[xlsxHeader] : undefined;
                    return NUMERIC_FIELDS.includes(field as keyof Rack) ? flexibleParseFloat(value) : (value || '');
                });
                
                stmt.run(values);
                importedCompositeKeys.add(compositeKey);
            }

            db.exec("COMMIT;");
            stmt.free();

            // Process Other Consumers
            let importedConsumers: OtherConsumersStateMap | null = null;
            const consumersSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('consumers'));
            if (consumersSheetName) {
                const consumersSheet = workbook.Sheets[consumersSheetName];
                const consumersData = XLSX.utils.sheet_to_json(consumersSheet) as { chain: 'A' | 'B' | 'C', acP1: number, acP2: number, acP3: number, dc: number }[];
                const consumersState: Partial<OtherConsumersStateMap> = {};
                consumersData.forEach(row => {
                    if (row.chain && ['A', 'B', 'C'].includes(row.chain)) {
                        consumersState[row.chain] = {
                            acP1: flexibleParseFloat(row.acP1),
                            acP2: flexibleParseFloat(row.acP2),
                            acP3: flexibleParseFloat(row.acP3),
                            dc: flexibleParseFloat(row.dc)
                        };
                    }
                });
                if (consumersState.A && consumersState.B && consumersState.C) {
                    importedConsumers = consumersState as OtherConsumersStateMap;
                }
            }

            setError(null);
            return { importedConsumers };

        } catch (err) {
            console.error("Excel import error:", err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [db]);

    const getRacks = useCallback(async (): Promise<Rack[]> => {
        if (!db) return [];
        const res = db.exec("SELECT * FROM Racks");
        if (!res[0]) return [];
        return res[0].values.map((row: any[]) => {
            const rack: any = {};
            res[0].columns.forEach((col, i) => { rack[col] = row[i]; });
            return rack as Rack;
        });
    }, [db]);

    const addRack = useCallback(async (rack: Omit<Rack, 'id'>) => {
        if (!db) throw new Error("Database not ready.");
        try {
            const columns = RACK_FIELDS.join(', ');
            const placeholders = RACK_FIELDS.map(() => '?').join(', ');
            const stmt = db.prepare(`INSERT INTO Racks (${columns}) VALUES (${placeholders})`);
            stmt.run(RACK_FIELDS.map(field => rack[field as keyof typeof rack]));
            stmt.free();
        } catch (e: any) {
            if (e.message?.includes('UNIQUE constraint failed')) {
                 throw new Error(`Error: A rack with ID "${rack.Rack}" in room "${rack.Salle}" already exists.`);
            }
            throw e;
        }
    }, [db]);

    const updateRack = useCallback(async (rack: Rack) => {
        if (!db || !rack.Rack || !rack.Salle) throw new Error("Database not ready or rack invalid.");
        const setClause = RACK_FIELDS.filter(f => f !== 'Rack' && f !== 'Salle').map(f => `${f} = ?`).join(', ');
        const stmt = db.prepare(`UPDATE Racks SET ${setClause} WHERE Salle = ? AND Rack = ?`);
        const values = RACK_FIELDS.filter(f => f !== 'Rack' && f !== 'Salle').map(field => NUMERIC_FIELDS.includes(field as keyof Rack) ? flexibleParseFloat(rack[field as keyof Rack]) : rack[field as keyof Rack]);
        values.push(rack.Salle, rack.Rack);
        stmt.run(values);
        stmt.free();
    }, [db]);

    const deleteRack = useCallback(async (rack: Rack) => {
        if (!db || !rack.Salle || !rack.Rack) throw new Error("Database not ready or rack invalid.");
        const stmt = db.prepare("DELETE FROM Racks WHERE Salle = ? AND Rack = ?");
        stmt.run([rack.Salle, rack.Rack]);
        stmt.free();
    }, [db]);

    const exportToXlsx = useCallback(async (racks: Rack[], otherConsumers: OtherConsumersStateMap) => {
        if (racks.length === 0) return alert("No data to export.");
        
        const racksWorksheet = XLSX.utils.json_to_sheet(racks);
        
        const consumersArray = Object.entries(otherConsumers).map(([chain, values]) => ({
            chain,
            ...values
        }));
        const consumersWorksheet = XLSX.utils.json_to_sheet(consumersArray);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, racksWorksheet, "Racks");
        XLSX.utils.book_append_sheet(workbook, consumersWorksheet, "OtherConsumers");
        
        XLSX.writeFile(workbook, "database.xlsx");
    }, []);

    return { db, loading, error, initializeDb, importXlsxData, addRack, updateRack, deleteRack, exportToXlsx, getRacks };
};