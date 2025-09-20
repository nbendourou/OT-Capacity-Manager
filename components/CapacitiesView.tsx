import React, { useState } from 'react';
import type { Capacities } from '../types';
import { SaveIcon } from './icons';
import { CAPACITY_CONFIG } from '../config';

interface CapacitiesViewProps {
    capacities: Capacities;
    onCapacitiesChange: (newCapacities: Capacities) => void;
    onSave: (newCapacities: Capacities) => void;
}

const CapacityInput: React.FC<{
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
}> = ({ label, description, value, onChange }) => {
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <label className="block text-lg font-semibold text-blue-300">{label}</label>
            <p className="text-xs text-gray-400 mt-1 mb-3">{description}</p>
            <div className="flex items-center">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                />
                <span className="ml-2 text-gray-300">kW</span>
            </div>
        </div>
    );
};


const CapacitiesView: React.FC<CapacitiesViewProps> = ({ capacities, onCapacitiesChange, onSave }) => {
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleFieldChange = (field: keyof Capacities, value: number) => {
        onCapacitiesChange({ ...capacities, [field]: value });
    };

    const handleSaveChanges = () => {
        setSaveError(null);
        setSaveSuccess(false);
        try {
            onSave(capacities);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e: any) {
            setSaveError(e.message || 'An unknown error occurred.');
        }
    };

    const capacityFields = CAPACITY_CONFIG;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                 <h2 className="text-3xl font-bold text-white">Manage Capacities</h2>
                 <div className="flex items-center gap-4">
                    {saveSuccess && <div className="text-green-400">Default capacities saved successfully!</div>}
                    {saveError && <div className="text-red-400 text-sm">{saveError}</div>}
                    <button 
                        onClick={handleSaveChanges} 
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                        <SaveIcon /> <span className="ml-2">Save as Default</span>
                    </button>
                 </div>
            </div>

            <p className="text-gray-400 mb-6 bg-gray-800 p-4 rounded-lg">
                These values define the maximum capacity limits. Changes saved here will be stored in your browser and will become the new defaults for future sessions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {capacityFields.map(({ key, label, description }) => (
                    <CapacityInput
                        key={key}
                        label={label}
                        description={description}
                        value={capacities[key]}
                        onChange={(value) => handleFieldChange(key, value)}
                    />
                ))}
            </div>
        </div>
    );
};

export default CapacitiesView;