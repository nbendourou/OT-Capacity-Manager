import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RoomPowerView from './components/RoomPowerView';
import RackDetailModal from './components/RackDetailModal';
import PowerChainsView from './components/TdhqPanel';
import Reporting from './components/Reporting';
import { useGoogleSheet } from './hooks/useGoogleSheet';
import type { Rack, Room } from './types';
import WelcomeScreen from './components/WelcomeScreen';

type View = 'dashboard' | 'ITN1' | 'ITN2' | 'ITN3' | 'powerChains' | 'reporting';

function App() {
    const { 
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
    } = useGoogleSheet();
    
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [appError, setAppError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
    const [isAddingRack, setIsAddingRack] = useState(false);

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
        if (racks.length === 0) {
            alert("There is no data to save.");
            return;
        }
        setAppError(null);
        setIsSaving(true);
        try {
            await saveData(racks, otherConsumers);
            alert("Data has been successfully saved to your Google Sheet!");
        } catch (e: any) {
            setAppError(`Save failed: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddRack = () => {
        setIsAddingRack(true);
        setSelectedRack(null);
    };

    const handleSelectRack = (rack: Rack) => {
        setSelectedRack(rack);
        setIsAddingRack(false);
    };

    const handleCloseModal = () => {
        setSelectedRack(null);
        setIsAddingRack(false);
    };

    const handleSaveRack = async (rackData: Rack | Omit<Rack, 'id'>) => {
        setAppError(null);
        try {
            if ('id' in rackData) {
                updateRack(rackData as Rack);
            } else {
                addRack(rackData);
            }
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
        
        if (racks.length === 0 && !loading && !error) {
             return <WelcomeScreen onReload={handleRefreshData} />;
        }
        
        if (racks.length === 0 && !['dashboard', 'reporting'].includes(currentView)) {
             setCurrentView('dashboard');
        }

        switch (currentView) {
            case 'dashboard':
                return <Dashboard racks={filteredRacks} onRackClick={handleSelectRack} otherConsumers={otherConsumers} />;
            case 'ITN1':
            case 'ITN2':
            case 'ITN3':
                return <RoomPowerView racks={roomRacks} room={currentView} onRackClick={handleSelectRack} />;
            case 'powerChains':
                return <PowerChainsView racks={racks} otherConsumers={otherConsumers} setOtherConsumers={setOtherConsumers} saveData={saveData} setAppError={setAppError} />;
            case 'reporting':
                return <Reporting racks={racks} />;
            default:
                return <Dashboard racks={filteredRacks} onRackClick={handleSelectRack} otherConsumers={otherConsumers} />;
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
                onAddRack={handleAddRack}
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
                {appError && <div className="bg-red-800 border border-red-600 text-white p-4 rounded-lg mb-4" role="alert" onClick={() => setAppError(null)}>{appError}</div>}
                 
                {racks.length === 0 && !loading && error ? (
                    <WelcomeScreen onReload={handleRefreshData} error={error} />
                ) : (
                    renderView()
                )}
            </main>

            {(selectedRack || isAddingRack) && (
                <RackDetailModal
                    rack={selectedRack}
                    isAdding={isAddingRack}
                    onClose={handleCloseModal}
                    onSave={handleSaveRack}
                    onDelete={handleDeleteRack}
                />
            )}
        </div>
    );
}

export default App;