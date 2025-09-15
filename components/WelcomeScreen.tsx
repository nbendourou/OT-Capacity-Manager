import React from 'react';
import { RefreshIcon, WarningIcon } from './icons';

interface WelcomeScreenProps {
    onReload: () => void;
    error?: string | null;
    isLoading?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onReload, error, isLoading }) => {
     if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                <h1 className="text-3xl font-bold text-white">Connecting to Google Sheet...</h1>
                <p className="text-lg text-gray-400 mt-4">Loading data, please wait.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center text-center h-[calc(100vh-200px)]">
            {error ? (
                <div className="bg-red-900/40 p-8 rounded-lg shadow-lg border border-red-500/50">
                    <div className="flex items-center justify-center mb-4">
                        <WarningIcon className="text-red-400 h-8 w-8" />
                        <h1 className="text-3xl font-bold ml-3 text-red-300">Data Loading Failed</h1>
                    </div>
                    <p className="text-base text-gray-300 mb-6 max-w-2xl whitespace-pre-wrap">{error}</p>
                    <button
                        onClick={onReload}
                        className="flex items-center mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
                    >
                        <RefreshIcon />
                        <span className="ml-2">Try Again</span>
                    </button>
                </div>
            ) : (
                <>
                    <h1 className="text-4xl font-bold mb-4 text-white">Welcome to Capacity Manager</h1>
                    <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                        No data found. You can start by adding racks manually or check your connected Google Sheet.
                    </p>
                    <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
                        <p className="text-gray-300 flex items-center justify-center">
                            <span className="ml-3">Click on <span className="font-semibold text-blue-400">Add Rack</span> to begin or <span className="font-semibold text-blue-400">Refresh Data</span> to try again.</span>
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default WelcomeScreen;