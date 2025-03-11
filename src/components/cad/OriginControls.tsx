import { useCADStore } from "@/src/store/cadStore";

const OriginControls: React.FC = () => {
    const { originOffset, setOriginOffset, resetOrigin, setOriginPreset } = useCADStore();
    
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Posizione Origine</h3>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-500">X</label>
            <input
              type="number"
              value={originOffset.x}
              onChange={(e) => {
                const newX = parseFloat(e.target.value) || 0;
                setOriginOffset({...originOffset, x: newX});
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Y</label>
            <input
              type="number"
              value={originOffset.y}
              onChange={(e) => {
                const newY = parseFloat(e.target.value) || 0;
                setOriginOffset({...originOffset, y: newY});
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Z</label>
            <input
              type="number"
              value={originOffset.z}
              onChange={(e) => {
                const newZ = parseFloat(e.target.value) || 0;
                setOriginOffset({...originOffset, z: newZ});
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        
        <div className="mb-2">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Preset Origine</h4>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setOriginPreset('center')}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              Centro
            </button>
            <button
              onClick={() => setOriginPreset('bottomLeft')}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              In Basso Sx
            </button>
            <button
              onClick={() => setOriginPreset('topRight')}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              In Alto Dx
            </button>
            <button
              onClick={() => setOriginPreset('topLeft')}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              In Alto Sx
            </button>
          </div>
        </div>
        
        <button
          onClick={resetOrigin}
          className="w-full px-3 py-1 mt-2 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
        >
          Reimposta Origine (0,0,0)
        </button>
      </div>
    );
  };
 export default OriginControls