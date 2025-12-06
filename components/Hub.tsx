import React from 'react';
import { Gate } from '../types';
import { Map, Compass, Anchor, Scissors, Eye } from 'lucide-react';

interface Props {
  onSelectGate: (gate: Gate) => void;
}

export const Hub: React.FC<Props> = ({ onSelectGate }) => {
  return (
    <div className="h-full flex flex-col p-6 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
      <header className="text-center mt-8 mb-12 relative z-20">
        <h1 className="text-4xl font-bold text-[#9b2226] font-deco mb-2 tracking-wider">VŨ TRỤ ĐỒNG XUÂN</h1>
        <p className="text-[#ca8a04] italic font-serif">Ký sự bốn cổng thành</p>
      </header>

      <div className="flex-1 relative isolate">
        {/* Map Visualization Abstract */}
        <div className="absolute inset-0 border-4 border-[#ca8a04]/30 rounded-lg transform rotate-1 pointer-events-none z-0"></div>
        <div className="absolute inset-0 border-4 border-[#9b2226]/20 rounded-lg transform -rotate-1 pointer-events-none z-0"></div>
        
        <div className="grid grid-cols-2 gap-4 h-full content-center p-4 relative z-10">
          <button 
            onClick={() => onSelectGate(Gate.NORTH)}
            className="aspect-square bg-[#fdfbf7] border-2 border-[#0f766e] rounded-sm p-4 flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:bg-[#0f766e]/10 transition-all group cursor-pointer"
          >
            <Compass className="w-10 h-10 text-[#0f766e] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-wide">Cổng Bắc</span>
            <span className="text-xs text-gray-500 font-serif">Người Bẻ Ghi</span>
          </button>

          <button 
            onClick={() => onSelectGate(Gate.EAST)}
            className="aspect-square bg-[#fdfbf7] border-2 border-[#9b2226] rounded-sm p-4 flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:bg-[#9b2226]/10 transition-all group cursor-pointer"
          >
            <Anchor className="w-10 h-10 text-[#9b2226] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-wide">Cổng Đông</span>
            <span className="text-xs text-gray-500 font-serif">Cai Thầu</span>
          </button>

          <button 
            onClick={() => onSelectGate(Gate.SOUTH)}
            className="aspect-square bg-[#fdfbf7] border-2 border-[#ca8a04] rounded-sm p-4 flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:bg-[#ca8a04]/10 transition-all group cursor-pointer"
          >
            <Eye className="w-10 h-10 text-[#ca8a04] group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-wide">Cổng Nam</span>
            <span className="text-xs text-gray-500 font-serif">Nghệ Nhân</span>
          </button>

          <button 
            onClick={() => onSelectGate(Gate.WEST)}
            className="aspect-square bg-[#fdfbf7] border-2 border-gray-800 rounded-sm p-4 flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:bg-gray-100 transition-all group cursor-pointer"
          >
            <Scissors className="w-10 h-10 text-gray-800 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-wide">Cổng Tây</span>
            <span className="text-xs text-gray-500 font-serif">Tiệm May</span>
          </button>
        </div>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 z-0">
          <Map size={200} />
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-gray-400 font-mono relative z-20">
        HANOI 1946-1980
      </footer>
    </div>
  );
};