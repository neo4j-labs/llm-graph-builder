import { OptionType, NodeSpec, RelSpec, PatternSpec, PropertySpec, SchemaSpec, SchemaPropertyType } from '../types';

const DEFAULT_PROPERTY_TYPE: SchemaPropertyType = 'STRING';

const toPropertySpec = (name: string): PropertySpec => ({ name, type: DEFAULT_PROPERTY_TYPE });

/**
 * Build a typed SchemaSpec from the current FileContext state. Property types are
 * defaulted to STRING; the typed-property channel will be richer once Phase 7 of
 * the migration switches the extractor to neo4j-graphrag's GraphSchema.
 */
export const buildSchemaSpec = (
  selectedNodes: OptionType[],
  selectedRels: OptionType[],
  combinedPatterns: string[],
  dbNodeProperties: Record<string, string[]>,
  dbRelProperties: Record<string, string[]>
): SchemaSpec | null => {
  if (!selectedNodes.length && !selectedRels.length && !combinedPatterns.length) {
    return null;
  }

  const nodeLabels = new Set<string>();
  selectedNodes.forEach((n) => n.value && nodeLabels.add(n.value));

  const relLabels = new Set<string>();
  selectedRels.forEach((r) => {
    const parts = r.value.split(',');
    if (parts.length >= 2 && parts[1]) {
      relLabels.add(parts[1]);
    }
  });

  const patterns: PatternSpec[] = [];
  for (const p of combinedPatterns) {
    const m = p.match(/^(.+?) -\[:(.+?)\]-> (.+)$/);
    if (!m) continue;
    const [, sourceLabel, relLabel, targetLabel] = m;
    nodeLabels.add(sourceLabel);
    nodeLabels.add(targetLabel);
    relLabels.add(relLabel);
    patterns.push({ sourceLabel, relLabel, targetLabel });
  }

  const nodes: NodeSpec[] = Array.from(nodeLabels)
    .sort()
    .map((label) => ({
      label,
      properties: (dbNodeProperties[label] ?? []).map(toPropertySpec),
    }));

  const relationships: RelSpec[] = Array.from(relLabels)
    .sort()
    .map((label) => ({
      label,
      properties: (dbRelProperties[label] ?? []).map(toPropertySpec),
    }));

  return {
    source: 'db',
    nodes,
    relationships,
    patterns,
  };
};
