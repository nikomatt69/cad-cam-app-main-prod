import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, ChevronLeft, ChevronRight, FastForward } from 'react-feather';

interface SimulationControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  currentPointIndex: number;
  totalPoints: number;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: number) => void;
  onProgressChange: (percent: number) => void;
}

/**
 * Professional media-player style controls for toolpath simulation
 */
export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  playbackSpeed,
  currentPointIndex,
  totalPoints,
  progress,
  onPlay,
  onPause,
  onStop,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  onProgressChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Update drag progress when actual progress changes (if not dragging)
  useEffect(() => {
    if (!isDragging) {
      setDragProgress(progress);
    }
  }, [progress, isDragging]);
  
  // Format time display as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate estimated time based on feedrates (very simplified)
  const calculateEstimatedTime = () => {
    // In a real implementation, this would be more precise
    // For now, we'll just use a placeholder simulation of 5 minutes per 1000 points
    const totalTimeSeconds = (totalPoints / 1000) * 300;
    const elapsedTimeSeconds = (currentPointIndex / totalPoints) * totalTimeSeconds;
    
    return {
      elapsed: formatTime(elapsedTimeSeconds),
      total: formatTime(totalTimeSeconds)
    };
  };
  
  const { elapsed, total } = calculateEstimatedTime();
  
  // Handle click on progress bar
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const clickPercentage = (clickPosition / rect.width) * 100;
    
    // Update progress
    setDragProgress(clickPercentage);
    onProgressChange(clickPercentage);
  };
  
  // Handle mouse down on progress handle
  const handleMouseDown = () => {
    setIsDragging(true);
  };
  
  // Handle mouse move while dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const movePosition = e.clientX - rect.left;
    const movePercentage = Math.max(0, Math.min(100, (movePosition / rect.width) * 100));
    
    setDragProgress(movePercentage);
  };
  
  // Handle mouse up after dragging
  const handleMouseUp = () => {
    if (isDragging) {
      onProgressChange(dragProgress);
      setIsDragging(false);
    }
  };
  
  // Add global mouse event listeners for dragging
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  return (
    <div className="w-full space-y-2">
      {/* Progress Bar */}
      <div 
        ref={progressBarRef}
        className="h-2 bg-gray-700 rounded-full cursor-pointer"
        onClick={handleProgressBarClick}
      >
        <div 
          className="h-full bg-blue-500 rounded-full relative"
          style={{ width: `${dragProgress}%` }}
        >
          <div 
            className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-blue-500 cursor-pointer"
            onMouseDown={handleMouseDown}
          ></div>
        </div>
      </div>
      
      {/* Controls and info */}
      <div className="flex items-center justify-between">
        {/* Time display */}
        <div className="text-xs font-mono">
          {elapsed} / {total}
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center space-x-2">
          <button
            className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
            onClick={onStop}
            title="Go to Start"
          >
            <SkipBack size={16} />
          </button>
          
          <button
            className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
            onClick={onStepBackward}
            title="Step Backward"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button
            className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none"
            onClick={isPlaying ? onPause : onPlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button
            className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
            onClick={onStepForward}
            title="Step Forward"
          >
            <ChevronRight size={16} />
          </button>
          
          {/* Playback speed dropdown */}
          <div className="relative group">
            <button
              className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none flex items-center"
              title="Playback Speed"
            >
              <FastForward size={16} />
              <span className="ml-1 text-xs">{playbackSpeed}×</span>
            </button>
            
            <div className="absolute hidden group-hover:block right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 py-1">
              {[0.25, 0.5, 1, 2, 4, 8].map((speed) => (
                <button
                  key={speed}
                  className={`block w-full text-left px-4 py-1 text-xs ${
                    playbackSpeed === speed ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => onSpeedChange(speed)}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Progress info */}
        <div className="text-xs font-mono">
          {currentPointIndex} / {totalPoints}
        </div>
      </div>
    </div>
  );
};
