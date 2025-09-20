import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RoomPowerView from './components/RoomPowerView';
import RackDetailModal from './components/RackDetailModal';
import PowerChainsView from './components/TdhqPanel';
import Reporting from './components/Reporting';
import { useGoogleSheet } from './hooks/useGoogleSheet';
import type { Rack, Room, Capacities } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import CapacitiesView from './components/CapacitiesView';

type View = 'dashboard' | 'ITN1' | 'ITN2' | 'ITN3' | 'powerChains' | 'reporting' | 'capacities';

function App() {
    const { 
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
    } = useGoogleSheet();
    
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [appError, setAppError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRoom, setFilterRoom] = useState<Room | 'all'>('all');
    const [filterRow, setFilterRow] = useState('');
    
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    useEffect(() => {
        if(error) setAppError(error);
    }, [error]);

    const handleRefreshData = useCallback(async () => {
        setAppError(null);
        try {
            await loadData();
        } catch (e: any) {
            setAppError(`Refresh failed: ${e.message}`);
        }
    }, [loadData]);
    
    const handleSaveData = async () => {
        if (racks.length === 0 && Object.values(otherConsumers).every(c => c.acP1 === 0 && c.acP2 === 0 && c.acP3 === 0 && c.dc === 0)) {
            alert("There is no inventory data to save.");
            return;
        }
        setAppError(null);
        setIsSaving(true);
        try {
            await saveData(racks, otherConsumers);
            alert("Racks and Consumers data has been successfully saved to your Google Sheet!");
        } catch (e: any) {
            setAppError(`Save failed: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSelectRack = (rack: Rack) => {
        setSelectedRack(rack);
    };

    const handleCloseModal = () => {
        setSelectedRack(null);
    };

    const handleSaveRack = async (rackData: Rack) => {
        setAppError(null);
        try {
            updateRack(rackData);
            handleCloseModal();
        } catch (e: any) {
            setAppError(e.message);
        }
    };

    const handleDeleteRack = async (rack: Rack) => {
        if (window.confirm(`Are you sure you want to delete rack ${rack.Rack} from room ${rack.Salle}?`)) {
            setAppError(null);
            try {
                deleteRack(rack);
                handleCloseModal();
            } catch (e: any) {
                setAppError(e.message);
            }
        }
    };

    const filteredRacks = useMemo(() => {
        return racks.filter(rack => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchLower === '' ||
                rack.Rack.toLowerCase().includes(searchLower) ||
                rack.Designation.toLowerCase().includes(searchLower) ||
                rack.Porteur.toLowerCase().includes(searchLower);

            const matchesRoom = filterRoom === 'all' || rack.Salle === filterRoom;
            const matchesRow = filterRow === '' || rack.Rangée === filterRow;
            
            return matchesSearch && matchesRoom && matchesRow;
        });
    }, [racks, searchTerm, filterRoom, filterRow]);

    const uniqueRows = useMemo((): string[] => {
        const rows = new Set(racks.map(r => r.Rangée).filter(Boolean));
        return Array.from(rows).sort();
    }, [racks]);

    if (loading && racks.length === 0) {
        return <WelcomeScreen onReload={handleRefreshData} isLoading={true} />;
    }

    const renderView = () => {
        const roomRacks = (currentView === 'ITN1' || currentView === 'ITN2' || currentView === 'ITN3')
            ? racks.filter(r => r.Salle === currentView)
            : filteredRacks;
        
        if (racks.length === 0 && !loading && !appError) {
             return <WelcomeScreen onReload={handleRefreshData} />;
        }
        
        if (racks.length === 0 && !['dashboard', 'reporting', 'capacities'].includes(currentView)) {
             setCurrentView('dashboard');
        }

        switch (currentView) {
            case 'dashboard':
                return <Dashboard racks={filteredRacks} onRackClick={handleSelectRack} otherConsumers={otherConsumers} capacities={capacities} />;
            case 'ITN1':
            case 'ITN2':
            case 'ITN3':
                return <RoomPowerView racks={roomRacks} room={currentView} onRackClick={handleSelectRack} capacities={capacities} />;
            case 'powerChains':
                return <PowerChainsView racks={racks} otherConsumers={otherConsumers} setOtherConsumers={setOtherConsumers} saveData={saveData} setAppError={setAppError} capacities={capacities} />;
            case 'reporting':
                return <Reporting racks={racks} capacities={capacities} />;
            case 'capacities':
                return <CapacitiesView capacities={capacities} onCapacitiesChange={setCapacities} onSave={saveCapacities} />;
            default:
                return <Dashboard racks={filteredRacks} onRackClick={handleSelectRack} otherConsumers={otherConsumers} capacities={capacities} />;
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <Header
                currentView={currentView}
                onNavigate={(view) => setCurrentView(view)}
                onRefreshData={handleRefreshData}
                onSaveData={handleSaveData}
                isSaving={isSaving}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterRoom={filterRoom}
                setFilterRoom={setFilterRoom}
                filterRow={filterRow}
                setFilterRow={setFilterRow}
                uniqueRows={uniqueRows}
            />

            <main className="container mx-auto p-4">
                {(loading || isSaving) && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="text-xl">{isSaving ? 'Saving data to Google Sheet...' : 'Loading data...'}</div></div>}
                {appError && <div className="bg-red-800 border border-red-600 text-white p-4 rounded-lg mb-4 whitespace-pre-wrap" role="alert" onClick={() => setAppError(null)}>{appError}</div>}
                 
                {racks.length === 0 && !loading && appError ? (
                    <WelcomeScreen onReload={handleRefreshData} error={appError} />
                ) : (
                    renderView()
                )}
            </main>

            {selectedRack && (
                <RackDetailModal
                    rack={selectedRack}
                    onClose={handleCloseModal}
                    onSave={handleSaveRack}
                    onDelete={handleDeleteRack}
                />
            )}
        </div>
    );
}

export default App;