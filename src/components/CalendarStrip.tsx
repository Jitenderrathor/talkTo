'use client';

import React, { useRef, useEffect } from 'react';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  activityDates: Set<string>; // Set of dates with recorded conversations
}

export default function CalendarStrip({
  selectedDate,
  onSelectDate,
  activityDates,
}: CalendarStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate date list: 10 days ago to 3 days from now
  const dates = React.useMemo(() => {
    const list = [];
    const today = new Date();
    
    for (let i = -10; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., Mon
      const dayNumber = d.getDate();
      const isToday = i === 0;

      list.push({
        formattedDate,
        dayName,
        dayNumber,
        isToday,
      });
    }
    return list;
  }, []);

  // Format month and year header (e.g., "May 2026")
  const headerText = React.useMemo(() => {
    const selected = new Date(selectedDate);
    if (isNaN(selected.getTime())) {
      return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return selected.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  // Center the selected date on load
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const selectedEl = container.querySelector('[data-selected="true"]');
      if (selectedEl) {
        const containerWidth = container.offsetWidth;
        const selectedLeft = (selectedEl as HTMLElement).offsetLeft;
        const selectedWidth = (selectedEl as HTMLElement).offsetWidth;
        container.scrollTo({
          left: selectedLeft - containerWidth / 2 + selectedWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedDate]);

  return (
    <div className="flex flex-col bg-gray-900/40 border-b border-white/5 py-3 shrink-0">
      {/* Month/Year title */}
      <div className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
        {headerText}
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 pb-1.5 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((dateObj) => {
          const isSelected = dateObj.formattedDate === selectedDate;
          const hasActivity = activityDates.has(dateObj.formattedDate);

          return (
            <button
              key={dateObj.formattedDate}
              data-selected={isSelected}
              onClick={() => onSelectDate(dateObj.formattedDate)}
              className={`flex flex-col items-center justify-between shrink-0 w-12 py-2.5 rounded-xl transition-all relative ${
                isSelected
                  ? 'bg-violet-600 text-white font-semibold shadow-md shadow-violet-600/35 scale-105'
                  : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
              }`}
            >
              {/* Day Name (e.g. Mon) */}
              <span className={`text-[10px] tracking-wide uppercase ${isSelected ? 'text-violet-100' : 'text-gray-500'}`}>
                {dateObj.dayName}
              </span>

              {/* Day Number (e.g. 26) */}
              <span className="text-sm font-medium mt-1 leading-none">
                {dateObj.dayNumber}
              </span>

              {/* Activity Dot & Today Marker */}
              <div className="flex gap-1 items-center justify-center mt-1.5 h-1">
                {dateObj.isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-violet-400" />
                )}
                {hasActivity && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500 animate-pulse'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
