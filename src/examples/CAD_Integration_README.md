# Generazione di Toolpath per Componenti in CAD/CAM

Questo documento descrive come utilizzare le nuove funzionalità di generazione di toolpath per componenti nel sistema CAD/CAM. La funzionalità consente di trattare più elementi geometrici come un'unica entità durante la generazione di G-code.

## Funzionalità Principali

- ✅ **Creazione di componenti complessi**: Combina più elementi geometrici in un unico componente
- ✅ **Toolpath unificato**: Genera un singolo percorso utensile che tratta tutti gli elementi come un'unica geometria
- ✅ **Ottimizzazione del percorso**: Minimizza i movimenti rapidi tra diversi elementi
- ✅ **Supporto per CSG (Constructive Solid Geometry)**: Quando possibile, utilizza operazioni booleane per trattare il componente come un modello 3D unificato
- ✅ **Fallback intelligente**: Se il CSG non è possibile, utilizza comunque una strategia ottimizzata per generare un toolpath unificato

## Come Utilizzare la Funzionalità

### 1. Importazione

```typescript
import { generateComponentToolpath } from 'src/lib/componentToolpathUtils';
```

### 2. Creazione di un Componente

Un componente è essenzialmente un oggetto con un array di elementi:

```typescript
const myComponent = {
  type: 'component',
  x: 0, // Posizione del componente
  y: 0,
  z: 0,
  name: 'Nome del Componente',
  id: 'component-' + Date.now(),
  elements: [
    {
      type: 'sphere',
      x: 20, // Posizione relativa al componente
      y: 0,
      z: 0,
      radius: 15,
      color: '#5555ff',
      id: 'sphere-' + Date.now()
    },
    {
      type: 'cone',
      x: -20, // Posizione relativa al componente
      y: 0,
      z: 0,
      radius: 15,
      height: 30,
      color: '#ff5555',
      id: 'cone-' + Date.now()
    }
    // Altri elementi...
  ]
};
```

### 3. Generazione del Toolpath

```typescript
const toolpathSettings = {
  toolDiameter: 6, // mm
  depth: 10, // mm
  stepdown: 1, // mm
  feedrate: 1000, // mm/min
  plungerate: 300, // mm/min
  offset: 'center', // 'inside', 'outside', 'center'
  direction: 'climb', // 'climb', 'conventional'
};

const gcode = generateComponentToolpath(myComponent, toolpathSettings);
```

## Tipi di Elementi Supportati

Il sistema supporta tutti questi tipi di elementi all'interno di un componente:

- Forme 2D:
  - `circle`
  - `rectangle`
  - `line` 
  - `polygon`
  - `arc`
  - `ellipse`
  - `text`

- Forme 3D:
  - `cube`
  - `sphere`
  - `cylinder`
  - `cone`
  - `torus`
  - `extrude`
  - `pyramid`
  - `hemisphere`
  - `prism`
  - `ellipsoid`
  - `capsule`
  - `text3d`

## Come Funziona

### Processo CSG (Quando Possibile)

1. Il sistema converte tutti gli elementi in meshes THREE.js
2. Esegue operazioni booleane di union per creare un unico modello 3D
3. Genera sezioni trasversali del modello 3D a diverse altezze Z
4. Crea percorsi di contorno per ogni sezione

### Fallback (Senza CSG)

Se il CSG non è possibile (a causa di elementi incompatibili o errori):

1. Il sistema calcola un bounding box combinato di tutti gli elementi
2. Organizza gli elementi in base alla loro posizione Z
3. Per ogni livello Z, identifica quali elementi intersecano quel livello
4. Genera percorsi ottimizzati per tutti gli elementi a quel livello Z
5. Minimizza i movimenti rapidi tra elementi a ciascun livello

## Esempi

Vedere i file di esempio:
- `src/examples/ComponentCreationExample.tsx`: Mostra come creare un componente e generare il suo toolpath
- `src/examples/ComponentCreationExampleUsage.tsx`: Mostra come integrare questa funzionalità nell'applicazione principale

## Note per gli Sviluppatori

- Le posizioni degli elementi sono sempre relative alla posizione del componente
- Il sistema gestirà automaticamente la trasformazione delle coordinate
- Per i componenti annidati, la gerarchia delle coordinate viene preservata correttamente
- L'algoritmo bilanzia automaticamente qualità e prestazioni, ma può essere ottimizzato ulteriormente con parametri più specifici 