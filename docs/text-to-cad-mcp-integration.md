# Text to CAD with Model Context Protocol

Questo documento descrive l'integrazione del protocollo Model Context Protocol (MCP) nel componente TextToCAD, che migliora l'interazione dell'IA con il sistema CAD, consentendo un approccio strutturato alla generazione di modelli 3D.

## Panoramica

L'implementazione MCP fornisce un'interfaccia strutturata che permette ai modelli di intelligenza artificiale di:

1. Accedere a informazioni dettagliate sui tipi di elementi CAD disponibili
2. Comprendere le proprietà e i vincoli degli elementi
3. Generare componenti 3D complessi con una comprensione approfondita del contesto
4. Interagire con il sistema in modo più controllato e ripetibile

## Nuovi File Aggiunti

1. `src/lib/modelcontextprotocol/client.ts`: Client per interagire con il server MCP
2. `src/components/ai/ai-new/TextToCADPanelMCP.tsx`: Versione MCP del pannello TextToCAD
3. `src/pages/api/mcp.ts`: API endpoint per gestire le richieste MCP

## Come Usare il Nuovo Componente

### Importazione

```tsx
import TextToCADPanelMCP from '@/src/components/ai/ai-new/TextToCADPanelMCP';
```

### Esempio di Utilizzo di Base

```tsx
<TextToCADPanelMCP 
  onSuccess={(elements) => {
    console.log('Elementi generati:', elements);
    // Logica per gestire gli elementi generati
  }}
  className="my-4" 
/>
```

### Integrazione nella Dashboard

```tsx
import TextToCADPanelMCP from '@/src/components/ai/ai-new/TextToCADPanelMCP';
import { useElementsStore } from '@/src/store/elementsStore';

export function Dashboard() {
  const { elements } = useElementsStore();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        {/* Canvas e altri elementi dell'interfaccia */}
      </div>
      <div>
        <TextToCADPanelMCP 
          onSuccess={(generatedElements) => {
            // Gestisci gli elementi generati se necessario
          }}
        />
      </div>
    </div>
  );
}
```

## Vantaggi dell'Uso di MCP

1. **Interazione strutturata**: L'IA utilizza un protocollo definito per richiedere informazioni e eseguire azioni
2. **Comprensione contestuale**: L'IA può accedere a informazioni dettagliate sui tipi di elementi e sui materiali
3. **Generazione di codice migliore**: La struttura aiuta l'IA a generare elementi CAD più accurati
4. **Sessioni stateful**: Le interazioni possono mantenere il contesto attraverso più richieste
5. **Scalabilità**: È più facile estendere il sistema con nuovi strumenti e risorse

## Confronto con la Versione Precedente

La versione precedente di TextToCAD utilizzava un approccio più diretto ma meno strutturato per comunicare con l'IA. La nuova versione MCP offre i seguenti miglioramenti:

| Funzionalità | Versione Precedente | Versione MCP |
|--------------|---------------------|--------------|
| Contestualizzazione | Limitata al prompt | Accesso a risorse dettagliate |
| Comprensione elementi | Basata solo su testo | Accesso a schema completo |
| Vincoli | Specificati manualmente | Integrati nel protocollo |
| Transazioni | Richiesta singola | Sessioni multi-richiesta |
| Fallback | Non disponibile | Supportato automaticamente |

## Considerazioni Tecniche

### Sessioni

Il protocollo MCP implementa un sistema di sessioni per mantenere il contesto tra più interazioni. Ogni sessione ha un tempo massimo di vita di 30 minuti e verrà automaticamente eliminata se inattiva.

### Estensibilità

È possibile aggiungere facilmente nuove risorse e strumenti al sistema MCP modificando il file `src/pages/api/mcp.ts`. Ad esempio, per aggiungere un nuovo strumento:

```typescript
// Aggiungi alla sezione tools
{
  name: 'my-new-tool',
  description: 'Description of the new tool',
  parameters: {
    // Definizione dei parametri
  },
  handler: async (params) => {
    // Implementazione
  }
}
```

### Fallback

Il componente implementa un sistema di fallback al metodo tradizionale in caso di problemi con MCP:

```typescript
// Se MCP fallisce
if (!result.success) {
  console.log('MCP generation failed, falling back to traditional method');
  const fallbackResult = await textToCAD(description, constraints);
  // Continua con il risultato del fallback
}
```

## Note sull'Implementazione

L'integrazione è progettata per essere compatibile con le API e gli hook esistenti. Utilizza lo stesso store (`elementsStore`) e gli stessi servizi AI, aggiungendo uno strato di protocollo strutturato per migliorare l'interazione.

---

### Sviluppato da:
Team CAD/CAM - Marzo 2025