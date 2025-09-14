import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RoomPowerView from './components/RoomPowerView';
import RackDetailModal from './components/RackDetailModal';
import PowerChainsView from './components/TdhqPanel';
import Reporting from './components/Reporting';
import { useDb } from './hooks/useDb';
import type { Rack, Room, OtherConsumersStateMap } from './types';
import WelcomeScreen from './components/WelcomeScreen';

type View = 'dashboard' | 'ITN1' | 'ITN2' | 'ITN3' | 'powerChains' | 'reporting';

function App() {
    const { 
        db, loading, error, initializeDb, importXlsxData, 
        addRack, updateRack, deleteRack, exportToXlsx, getRacks 
    } = useDb();
    
    const [racks, setRacks] = useState<Rack[]>([]);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isDbReady, setIsDbReady] = useState(false);
    const [appError, setAppError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
    const [isAddingRack, setIsAddingRack] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRoom, setFilterRoom] = useState<Room | 'all'>('all');
    const [filterRow, setFilterRow] = useState('');
    
    const [otherConsumers, setOtherConsumers] = useState<OtherConsumersStateMap>({
        A: { acP1: 8.28, acP2: 8.28, acP3: 8.28, dc: 5 },
        B: { acP1: 6.29, acP2: 6.29, acP3: 6.29, dc: 5 },
        C: { acP1: 7.31, acP2: 7.31, acP3: 7.31, dc: 5 },
    });

    const refreshRacks = useCallback(async () => {
        if (db) {
            const data = await getRacks();
            setRacks(data);
        }
    }, [db, getRacks]);

    useEffect(() => {
        initializeDb().then(() => {
            setIsDbReady(true);
        });
    }, [initializeDb]);

    useEffect(() => {
        if (isDbReady) {
            refreshRacks();
        }
    }, [isDbReady, refreshRacks]);

    useEffect(() => {
        if(error) setAppError(error);
    }, [error]);

    const handleLoadData = async (file: File) => {
        setAppError(null);
        setIsProcessing(true);
        try {
            const { importedConsumers } = await importXlsxData(file);
            if (importedConsumers) {
                setOtherConsumers(importedConsumers);
            }
            await refreshRacks();
        } catch (e: any) {
            setAppError(`Load failed: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSaveData = async () => {
        if (racks.length === 0) {
            alert("There is no data to save.");
            return;
        }
        setAppError(null);
        setIsProcessing(true);
        try {
            await exportToXlsx(racks, otherConsumers);
        } catch (e: any) {
            setAppError(`Save failed: ${e.message}`);
        } finally {
            setIsProcessing(false);
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
                await updateRack(rackData as Rack);
            } else {
                await addRack(rackData);
            }
            await refreshRacks();
            handleCloseModal();
        } catch (e: any) {
            setAppError(e.message);
        }
    };

    const handleDeleteRack = async (rack: Rack) => {
        if (window.confirm(`Are you sure you want to delete rack ${rack.Rack} from room ${rack.Salle}?`)) {
            setAppError(null);
            try {
                await deleteRack(rack);
                await refreshRacks();
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

    const uniqueRows = useMemo(() => {
        const rows = new Set(racks.map(r => r.Rangée).filter(Boolean));
        return Array.from(rows).sort();
    }, [racks]);

    if (loading || !isDbReady) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Initializing Application...</div>;
    }

    const renderView = () => {
        const roomRacks = (currentView === 'ITN1' || currentView === 'ITN2' || currentView === 'ITN3')
            ? racks.filter(r => r.Salle === currentView)
            : filteredRacks;
        
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
                return <PowerChainsView racks={racks} otherConsumers={otherConsumers} setOtherConsumers={setOtherConsumers} />;
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
                onLoadData={handleLoadData}
                onSaveData={handleSaveData}
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
                {isProcessing && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="text-xl">Processing data...</div></div>}
                {appError && <div className="bg-red-800 border border-red-600 text-white p-4 rounded-lg mb-4" role="alert" onClick={() => setAppError(null)}>{appError}</div>}
                 
                {racks.length === 0 && !isProcessing ? (
                    <WelcomeScreen />
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
