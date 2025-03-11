# Component Documentation

## Core Components

### CADEditor
The main CAD editing interface component.

**Props:**
```typescript
interface CADEditorProps {
  modelId?: string;
  initialData?: ModelData;
  readOnly?: boolean;
  onSave?: (data: ModelData) => void;
  onError?: (error: Error) => void;
}
```

**Usage:**
```tsx
<CADEditor
  modelId="model-123"
  readOnly={false}
  onSave={handleSave}
  onError={handleError}
/>
```

### CAMEditor
The main CAM editing interface component.

**Props:**
```typescript
interface CAMEditorProps {
  modelId: string;
  machineConfig: MachineConfig;
  toolingConfig: ToolingConfig;
  onGenerateGCode?: (gcode: string) => void;
}
```

**Usage:**
```tsx
<CAMEditor
  modelId="model-123"
  machineConfig={machineConfig}
  toolingConfig={toolingConfig}
  onGenerateGCode={handleGCode}
/>
```

### ModelViewer
3D model viewer component.

**Props:**
```typescript
interface ModelViewerProps {
  modelData: string;
  viewerConfig?: ViewerConfig;
  controls?: ViewerControls;
  onViewerReady?: () => void;
}
```

### ToolpathSimulator
Simulate CNC toolpaths.

**Props:**
```typescript
interface ToolpathSimulatorProps {
  gcode: string;
  machineConfig: MachineConfig;
  simulationSpeed?: number;
  onSimulationComplete?: () => void;
}
```

## UI Components

### MaterialSelector
Material selection component with search and filtering.

**Props:**
```typescript
interface MaterialSelectorProps {
  selectedMaterial?: Material;
  onChange: (material: Material) => void;
  filter?: MaterialFilter;
}
```

### ToolLibrary
Tool management component.

**Props:**
```typescript
interface ToolLibraryProps {
  tools: Tool[];
  onToolSelect: (tool: Tool) => void;
  onToolCreate: (tool: Tool) => void;
  onToolUpdate: (tool: Tool) => void;
  onToolDelete: (toolId: string) => void;
}
```

## Layout Components

### WorkspaceLayout
Main application layout with sidebar and toolbars.

**Props:**
```typescript
interface WorkspaceLayoutProps {
  sidebar?: React.ReactNode;
  toolbar?: React.ReactNode;
  statusBar?: React.ReactNode;
  children: React.ReactNode;
}
```

### ProjectNavigator
Project file and component navigation.

**Props:**
```typescript
interface ProjectNavigatorProps {
  projectId: string;
  onFileSelect: (fileId: string) => void;
  onFolderCreate: (name: string) => void;
}
```

## Form Components

### MachineConfigForm
Machine configuration form component.

**Props:**
```typescript
interface MachineConfigFormProps {
  initialConfig?: MachineConfig;
  onSubmit: (config: MachineConfig) => void;
  onValidate?: (config: MachineConfig) => boolean;
}
```

### ToolpathSettingsForm
Toolpath generation settings form.

**Props:**
```typescript
interface ToolpathSettingsFormProps {
  defaultSettings?: ToolpathSettings;
  machineCapabilities: string[];
  onSettingsChange: (settings: ToolpathSettings) => void;
}
```

## Context Providers

### ProjectContext
Provides project-related data and functions.

```typescript
interface ProjectContextValue {
  projectId: string;
  projectData: ProjectData;
  updateProject: (data: Partial<ProjectData>) => Promise<void>;
  // ... other project-related functions
}
```

### WorkspaceContext
Provides workspace state and functions.

```typescript
interface WorkspaceContextValue {
  activeFile: FileData | null;
  openFiles: FileData[];
  openFile: (fileId: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  // ... other workspace-related functions
}
```

## Custom Hooks

### useCADOperations
Hook for CAD operations.

```typescript
const useCADOperations = (modelId: string) => {
  return {
    saveModel: (data: ModelData) => Promise<void>,
    exportModel: (format: string) => Promise<Blob>,
    // ... other CAD operations
  };
};
```

### useToolpathGeneration
Hook for toolpath generation.

```typescript
const useToolpathGeneration = (modelId: string, machineConfig: MachineConfig) => {
  return {
    generateToolpath: (settings: ToolpathSettings) => Promise<string>,
    validateToolpath: (gcode: string) => Promise<ValidationResult>,
    // ... other toolpath operations
  };
};
```

## Component Best Practices

1. **State Management**
   - Use local state for UI-only state
   - Use context for shared state
   - Use Zustand for global state

2. **Performance**
   - Implement proper memoization
   - Use virtualization for large lists
   - Optimize re-renders

3. **Error Handling**
   - Implement error boundaries
   - Provide meaningful error messages
   - Handle edge cases

4. **Accessibility**
   - Follow WCAG guidelines
   - Implement keyboard navigation
   - Provide proper ARIA attributes

5. **Testing**
   - Write unit tests for complex logic
   - Write integration tests for user flows
   - Test edge cases and error states