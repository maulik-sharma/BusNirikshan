import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass, X, CaretUp, CaretDown, MapPin, Trash } from '@phosphor-icons/react';

export const StopSelector = ({ availableStops, selectedStopIds, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStops = availableStops.filter(stop => {
    const term = searchTerm.toLowerCase();
    return stop.name.toLowerCase().includes(term) || stop.city.toLowerCase().includes(term);
  });

  const handleSelect = (stopId) => {
    onChange([...selectedStopIds, stopId]);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemove = (index) => {
    const newStops = [...selectedStopIds];
    newStops.splice(index, 1);
    onChange(newStops);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newStops = [...selectedStopIds];
    const temp = newStops[index - 1];
    newStops[index - 1] = newStops[index];
    newStops[index] = temp;
    onChange(newStops);
  };

  const handleMoveDown = (index) => {
    if (index === selectedStopIds.length - 1) return;
    const newStops = [...selectedStopIds];
    const temp = newStops[index + 1];
    newStops[index + 1] = newStops[index];
    newStops[index] = temp;
    onChange(newStops);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e9bb0]" size={16} />
          <input
            type="text"
            placeholder="Search stops by name or city to add..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e9bb0] hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isDropdownOpen && (searchTerm || filteredStops.length > 0) && (
          <div className="absolute z-10 w-full mt-2 bg-[#0d111b] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
            {filteredStops.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8e9bb0]">No stops found.</div>
            ) : (
              <ul className="py-2">
                {filteredStops.slice(0, 50).map(stop => (
                  <li 
                    key={stop._id}
                    onClick={() => handleSelect(stop._id)}
                    className="px-4 py-2 hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{stop.name}</span>
                      <span className="text-[10px] text-[#8e9bb0] uppercase">{stop.city}, {stop.state}</span>
                    </div>
                    <button 
                      type="button"
                      className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                    >
                      ADD
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected Stops Sequence */}
      {selectedStopIds.length > 0 && (
        <div className="bg-[#07090e] border border-white/5 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin size={14} />
            Route Sequence ({selectedStopIds.length} stops)
          </h4>
          <div className="space-y-2 h-64 overflow-y-auto pr-2 custom-scrollbar">
            {selectedStopIds.map((id, index) => {
              const stop = availableStops.find(s => s._id === id);
              return (
                <div key={`${id}-${index}`} className="flex items-center justify-between p-3 bg-[#0d111b] border border-white/5 rounded-lg group hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-[#8e9bb0] font-mono border border-white/5">
                      {index + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{stop ? stop.name : 'Unknown Stop'}</span>
                      {stop && <span className="text-[10px] text-[#8e9bb0] uppercase">{stop.city}</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col gap-0.5 mr-2">
                      <button 
                        type="button" 
                        onClick={() => handleMoveUp(index)} 
                        disabled={index === 0}
                        className="p-0.5 rounded text-[#8e9bb0] hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <CaretUp size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleMoveDown(index)} 
                        disabled={index === selectedStopIds.length - 1}
                        className="p-0.5 rounded text-[#8e9bb0] hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <CaretDown size={14} />
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 bg-red-500/10 transition-colors"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {selectedStopIds.length === 0 && (
        <div className="text-center p-6 bg-[#07090e] border border-white/5 rounded-xl text-xs text-[#8e9bb0]">
          No stops added yet. Use the search bar above to build your route.
        </div>
      )}
    </div>
  );
};
