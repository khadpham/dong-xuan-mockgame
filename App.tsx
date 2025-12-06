import React, { useState } from 'react';
import { Gate } from './types';
import { Hub } from './components/Hub';
import { NorthGate } from './components/NorthGate';
import { EastGate } from './components/EastGate';
import { SouthGate } from './components/SouthGate';
import { WestGate } from './components/WestGate';

export default function App() {
  const [currentGate, setCurrentGate] = useState<Gate>(Gate.HUB);

  const renderGate = () => {
    switch (currentGate) {
      case Gate.NORTH:
        return <NorthGate onBack={() => setCurrentGate(Gate.HUB)} />;
      case Gate.EAST:
        return <EastGate onBack={() => setCurrentGate(Gate.HUB)} />;
      case Gate.SOUTH:
        return <SouthGate onBack={() => setCurrentGate(Gate.HUB)} />;
      case Gate.WEST:
        return <WestGate onBack={() => setCurrentGate(Gate.HUB)} />;
      default:
        return <Hub onSelectGate={setCurrentGate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-900 overflow-hidden relative selection:bg-yellow-200">
       <div className="max-w-md mx-auto h-[100dvh] relative shadow-2xl bg-[#fdfbf7]">
        {renderGate()}
       </div>
    </div>
  );
}