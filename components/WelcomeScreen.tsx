import React from 'react';
import { UploadIcon } from './icons';

const WelcomeScreen = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center h-[calc(100vh-200px)]">
            <h1 className="text-4xl font-bold mb-4 text-white">Welcome to Capacity Manager</h1>
            <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                This tool helps you manage and visualize power capacity for your IT infrastructure.
                To get started, please load your data from an XLSX file.
            </p>
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 animate-fade-in-up">
                <p className="text-gray-300 flex items-center justify-center">
                    <UploadIcon />
                    <span className="ml-3">Click on <span className="font-semibold text-blue-400">Load Data</span> in the header to import your file.</span>
                </p>
            </div>
        </div>
    );
};

export default WelcomeScreen;
