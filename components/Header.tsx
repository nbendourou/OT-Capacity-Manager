import React from 'react';
import type { Room } from '../types';
import { GoogleSheetIcon, PowerChainIcon, DashboardIcon, SaveIcon, RoomIcon, RefreshIcon, ReportIcon, SettingsIcon } from './icons';

// FIXME: Replace with your actual Google Sheet URL
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZ-VlvSj3ofI0V2GRwpjgBXRMnZRcp1Hotwg8F-NrvAvaLG2FNbdH5xQs3CjYTgdkLC06gIfJQbHe4/pubhtml";

interface HeaderProps {
    currentView: string;
    onNavigate: (view: 'dashboard' | 'ITN1' | 'ITN2' | 'ITN3' | 'powerChains' | 'reporting' | 'capacities') => void;
    onRefreshData: () => void;
    onSaveData: () => void;
    isSaving: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterRoom: Room | 'all';
    setFilterRoom: (room: Room | 'all') => void;
    filterRow: string;
    setFilterRow: (row: string) => void;
    uniqueRows: string[];
}

const Header: React.FC<HeaderProps> = ({
    currentView, onNavigate, onRefreshData, onSaveData, isSaving,
    searchTerm, setSearchTerm, filterRoom, setFilterRoom, filterRow, setFilterRow, uniqueRows
}) => {

    const NavButton = ({ view, label, icon }: { view: 'dashboard' | 'ITN1' | 'ITN2' | 'ITN3' | 'powerChains' | 'reporting' | 'capacities', label: string, icon: JSX.Element }) => (
        <button
            onClick={() => onNavigate(view)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                currentView === view
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </button>
    );

    return (
        <header className="bg-gray-800 shadow-lg sticky top-0 z-10">
            <div className="container mx-auto px-4 py-3 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-xl font-bold text-white whitespace-nowrap">Capacity Manager</h1>
                        <nav className="flex items-center space-x-1 bg-gray-900/50 p-1 rounded-lg">
                            <NavButton view="dashboard" label="Dashboard" icon={<DashboardIcon />} />
                            <NavButton view="ITN1" label="ITN1" icon={<RoomIcon />} />
                            <NavButton view="ITN2" label="ITN2" icon={<RoomIcon />} />
                            <NavButton view="ITN3" label="ITN3" icon={<RoomIcon />} />
                            <NavButton view="powerChains" label="Power Chains" icon={<PowerChainIcon />} />
                            <NavButton view="reporting" label="Reporting" icon={<ReportIcon />} />
                            <NavButton view="capacities" label="Capacities" icon={<SettingsIcon />} />
                        </nav>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a href={GOOGLE_SHEET_URL} target="_blank" rel="noopener noreferrer" className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                           <GoogleSheetIcon /> <span className="ml-2 hidden sm:inline">Open Sheet</span>
                        </a>
                        <button onClick={onRefreshData} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                           <RefreshIcon /> <span className="ml-2 hidden sm:inline">Refresh Data</span>
                        </button>
                        <button onClick={onSaveData} disabled={isSaving} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                           <SaveIcon /> <span className="ml-2 hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <input
                        type="text"
                        placeholder="Search by Rack, Designation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                    <select
                        value={filterRoom}
                        onChange={(e) => setFilterRoom(e.target.value as Room | 'all')}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                        <option value="all">All Rooms</option>
                        <option value="ITN1">ITN1</option>
                        <option value="ITN2">ITN2</option>
                        <option value="ITN3">ITN3</option>
                    </select>
                    <select
                        value={filterRow}
                        onChange={(e) => setFilterRow(e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                        <option value="">All Rows</option>
                        {uniqueRows.map(row => (
                            <option key={row} value={row}>{row}</option>
                        ))}
                    </select>
                </div>
            </div>
        </header>
    );
};

export default Header;