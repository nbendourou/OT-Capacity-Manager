import React, { useState, useEffect, useMemo } from 'react';
import type { Rack, Room } from '../types';
import Modal from './common/Modal';
import { DeleteIcon, SaveIcon } from './icons';
import { flexibleParseFloat } from '../utils';

interface RackDetailModalProps {
    rack: Rack;
    onClose: () => void;
    onSave: (rack: Rack) => void;
    onDelete: (rack: Rack) => void;
}

// Define which fields should be treated as numbers.
const NUMERIC_FIELDS: (keyof Rack)[] = [
    'Largeur_mm', 'Puissance_PDU', 'Moyenne_Capacitaire_Rack', 'P_Voie1_Ph1', 'P_Voie1_Ph2',
    'P_Voie1_Ph3', 'P_Voie1_DC', 'P_Voie2_Ph1', 'P_Voie2_Ph2', 'P_Voie2_Ph3', 'P_Voie2_DC'
];

const RackDetailModal: React.FC<RackDetailModalProps> = ({ rack, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState<Rack>({ ...rack });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        // Use a copy of the rack data to prevent direct state mutation.
        setFormData({ ...rack });
        setIsEditing(false);
    }, [rack]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        // Create a copy to sanitize before saving.
        const dataToSave = { ...formData };

        // Ensure all numeric fields are actual numbers, not strings.
        for (const key in dataToSave) {
            if (NUMERIC_FIELDS.includes(key as keyof Rack)) {
                (dataToSave as any)[key] = flexibleParseFloat((dataToSave as any)[key]);
            }
        }

        onSave(dataToSave);
    };
    
    const renderField = (label: string, name: keyof Rack, type = 'text') => {
        const value = formData[name as keyof typeof formData] as string | number;
        return (
            <div className="grid grid-cols-3 gap-4 items-center">
                <label htmlFor={name} className="text-sm font-medium text-gray-400">{label}</label>
                {isEditing ? (
                    type === 'select' ? (
                        <select
                            id={name} name={name} 
                            value={String(value)} onChange={handleChange}
                            className="col-span-2 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                             <option value="ITN1">ITN1</option>
                             <option value="ITN2">ITN2</option>
                             <option value="ITN3">ITN3</option>
                        </select>
                    ) : (
                    <input
                        type={type} id={name} name={name} value={value} onChange={handleChange}
                        disabled={name === 'Rack' || name === 'Salle'}
                        className={`col-span-2 bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 ${(name === 'Rack' || name === 'Salle') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />)
                ) : (
                    <p className="col-span-2 text-sm text-white bg-gray-900/50 p-2 rounded-md">{String(value)}</p>
                )}
            </div>
        );
    };

    const title = `Rack Details: ${rack.Rack}`;

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                 <div className="flex justify-end -mt-2 mb-2">
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition">
                            Edit
                        </button>
                    )}
                </div>

                <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-600 pb-2">General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('Salle', 'Salle', 'select')}
                    {renderField('Rack (ID)', 'Rack')}
                    {renderField('Rangée', 'Rangée')}
                    {renderField('Num Rack', 'Num_Rack')}
                    {renderField('Designation', 'Designation')}
                    {renderField('Porteur', 'Porteur')}
                    {renderField('Dimensions', 'Dimensions')}
                    {renderField('Largeur (mm)', 'Largeur_mm', 'number')}
                </div>
                
                <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-600 pb-2 mt-4">Power Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('Alimentation', 'Alimentation')}
                    {renderField('Phase', 'Phase')}
                    {renderField('PDU', 'PDU')}
                    {renderField('Puissance PDU (kW)', 'Puissance_PDU', 'number')}
                    {renderField('Moyenne Capacitaire Rack', 'Moyenne_Capacitaire_Rack', 'number')}
                </div>
                
                <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-600 pb-2 mt-4">Voie 1</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('Canalis Redresseur Voie 1', 'Canalis_Redresseur_Voie1')}
                    {renderField('P Voie1 Ph1 (kW)', 'P_Voie1_Ph1', 'number')}
                    {renderField('P Voie1 Ph2 (kW)', 'P_Voie1_Ph2', 'number')}
                    {renderField('P Voie1 Ph3 (kW)', 'P_Voie1_Ph3', 'number')}
                    {renderField('P Voie1 DC (kW)', 'P_Voie1_DC', 'number')}
                </div>
                 <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-600 pb-2 mt-4">Voie 2</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {renderField('Canalis Redresseur Voie 2', 'Canalis_Redresseur_Voie2')}
                    {renderField('P Voie2 Ph1 (kW)', 'P_Voie2_Ph1', 'number')}
                    {renderField('P Voie2 Ph2 (kW)', 'P_Voie2_Ph2', 'number')}
                    {renderField('P Voie2 Ph3 (kW)', 'P_Voie2_Ph3', 'number')}
                    {renderField('P Voie2 DC (kW)', 'P_Voie2_DC', 'number')}
                </div>

            </div>
            <div className="mt-6 pt-4 border-t border-gray-600 flex justify-between items-center">
                <div>
                     <button onClick={() => onDelete(rack)} className="flex items-center text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition">
                        <DeleteIcon /> <span className="ml-2">Delete</span>
                    </button>
                </div>
                <div className="flex items-center space-x-4">
                
                {isEditing && (
                    <>
                        <button onClick={() => { 
                            setIsEditing(false);
                            setFormData({ ...rack }); // Revert changes using a fresh copy
                        }} className="text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition">
                            <SaveIcon /> <span className="ml-2">Save</span>
                        </button>
                    </>
                )}
                </div>
            </div>
        </Modal>
    );
};

export default RackDetailModal;