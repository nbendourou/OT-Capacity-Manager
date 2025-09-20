import type { Capacities } from './types';

export const CAPACITY_CONFIG: { key: keyof Capacities; label: string; description: string }[] = [
    { key: 'UPS_A_kW', label: 'UPS Chain A', description: 'Total capacity of the entire UPS chain A.' },
    { key: 'UPS_B_kW', label: 'UPS Chain B', description: 'Total capacity of the entire UPS chain B.' },
    { key: 'UPS_C_kW', label: 'UPS Chain C', description: 'Total capacity of the entire UPS chain C.' },
    { key: 'ROW_AC_CAPACITY_kW', label: 'Row AC Capacity', description: 'Total AC power capacity for a single row in the matrix view.' },
    { key: 'ROW_DC_CAPACITY_kW', label: 'Row DC Capacity', description: 'Total DC power capacity for a single row in the matrix view.' },
    { key: 'ROOM_CAPACITY_ITN1_kW', label: 'Room ITN1 Capacity', description: 'Maximum power capacity for the ITN1 room chart.' },
    { key: 'ROOM_CAPACITY_ITN2_kW', label: 'Room ITN2 Capacity', description: 'Maximum power capacity for the ITN2 room chart.' },
    { key: 'ROOM_CAPACITY_ITN3_kW', label: 'Room ITN3 Capacity', description: 'Maximum power capacity for the ITN3 room chart.' },
];

export const keyToLabelMap = new Map(CAPACITY_CONFIG.map(item => [item.key, item.label]));
export const labelToKeyMap = new Map(CAPACITY_CONFIG.map(item => [item.label, item.key]));