import type { ExternalCallbacks } from './modules/ExternalCallbackHandler';
import type { ForceDirectedOptions, HierarchicalOptions, Layout, LayoutOptions, NvlOptions, NvlState } from './modules/state';
import { ForceDirectedLayoutType, FreeLayoutType, GridLayoutType, HierarchicalLayoutType, NodeBorderStyles, d3ForceLayoutType } from './modules/state';
import { drawCircleBand } from './renderers/canvasrenderer/util';
import type { Node, PartialNode, PartialRelationship, Relationship } from './types/graph-element';
import { CompatibilityError } from './utils/errors';
import type { Point } from './utils/geometry';
import type { HitTargetNode, HitTargetRelationship, HitTargets } from './utils/hittest';
/**
 * Extends the MouseEvent interface with the {@link HitTargets} property.
 * The result of a _.{@link NVL.getHits} call.
 */
interface NvlMouseEvent extends MouseEvent {
    nvlTargets: HitTargets;
}
/**
 * Class for a NVL instance.
 * @example
 * This is a basic setup for a NVL instance.
 * ```js
 * const nodes = [
 *   { id: '1', label: 'Node 1', color: '#e04141' },
 *   { id: '2', label: 'Node 2', color: '#e09c41' }
 * ]
 * const relationships = [
 *   { id: '12', from: '1', to: '2' }
 * ]
 * const options = {
 *   layout: 'hierarchical',
 *   initialZoom: 0.5
 * }
 * const callbacks = {
 *   onLayoutDone: () => console.log('Layout done')
 * }
 * const nvl = new NVL(document.getElementById('frame'), nodes, relationships, options, callbacks)
 * ```
 */
declare class NVL {
    private readonly externalCallbackHandler;
    private readonly performance;
    private visState;
    private nvlController;
    private options;
    /**
     * Creates a new NVL instance.
     * @constructor
     * @param {HTMLElement} frame - The DOM element to display the graph in
     * @param {Node[]} nvlNodes - An Array of nodes
     * @param {Relationship[]} nvlRels - An Array of relationships
     * @param {NvlOptions} options - Options for the NVL instance
     * @param {ExternalCallbackHandler} callbacks - Callbacks triggered on NVL events
     */
    constructor(frame: HTMLElement, nvlNodes?: Node[], nvlRels?: Relationship[], options?: NvlOptions, callbacks?: ExternalCallbacks);
    /**
     * Restarts the NVL instance.
     * @param {NvlOptions} options - new options for the NVL instance
     * @param {boolean} retainPositions - whether or not to retain the current node positions
     * @note new options will be merged with current options
     */
    restart(options?: NvlOptions, retainPositions?: boolean): void;
    /**
     * Adds nodes and relationships to NVL and updates existing nodes and relationships.
     * @param {Node[] | PartialNode[]} nodes - An Array of nodes to be added or updated
     * @param {Relationship[] | PartialRelationship[]} relationships - An Array of relationships to be added or updated
     * @note To update nodes or relationships, they must have an id that matches the id of the
     * node or relationship to be updated.
     * @note Only the properties that are provided will be updated.
     * If an existing property is not provided, it will not be changed.
     * @example
     * Adding and updating nodes and relationships
     * ```js
     * const nodes = [
     * { id: '1', label: 'Node 1', color: '#e04141' },
     * { id: '2', label: 'Node 2', color: '#e09c41' }
     * ]
     * const relationships = [
     * { id: '12', from: '1', to: '2' }
     * ]
     * // Adds new nodes and relationships
     * nvl.addAndUpdateElementsInGraph(nodes, relationships)
     * // Updates an existing relationship
     * nvl.addAndUpdateElementsInGraph([], [{ id: '12', color: '#e0df41' }])
     * ```
     */
    addAndUpdateElementsInGraph(nodes?: Node[] | PartialNode[], relationships?: Relationship[] | PartialRelationship[]): void;
    /**
     * Gets the currently selected nodes.
     * @returns {(Node & Point)[]} An array of all currently selected nodes and their positions.
     */
    getSelectedNodes(): (Node & Point)[];
    /**
     * Gets the currently selected relationships.
     * @returns {Relationship[]} An array of all currently selected relationships.
     */
    getSelectedRelationships(): Relationship[];
    /**
     * Updates relationships in the current scene with the provided array of nodes and relationships.
     * @param {Node[] | PartialNode[]} nodes The updated nodes.
     * @param {Relationship[] | PartialRelationship[]} relationships The updated relationships.
     * @note ignores any nodes or relationships that do not exist in the current scene.
     * @note To update nodes or relationships, they must have an id that matches the id of the
     * node or relationship to be updated.
     * @note Only the properties that are provided will be updated.
     * If an existing property is not provided, it will not be changed.
     * @example
     * Updating nodes and relationships
     * ```js
     * const nodes = [
     * { id: '1', label: 'Node 1', color: '#e04141' },
     * { id: '2', label: 'Node 2', color: '#e09c41' }
     * ]
     * const relationships = [
     * { id: '12', from: '1', to: '2' }
     * ]
     * const nvl = new NVL(container, nodes, relationships)
     * // Updates an existing node and relationship
     * nvl.updateElementsInGraph([{ id: '1', selected: true }], [{ id: '12', color: '#e0df41' }])
     * ```
     */
    updateElementsInGraph(nodes: Node[] | PartialNode[], relationships: Relationship[] | PartialRelationship[]): void;
    /**
     * Adds nodes and relationships in the current scene.
     * @param {Node[]} nodes The nodes to be added.
     * @param {Relationship[]} relationships The relationships to be added.
     */
    addElementsToGraph(nodes: Node[], relationships: Relationship[]): void;
    /**
     * Removes the specified nodes from the current scene.
     * @param {string[]} nodeIds The node ids to be removed.
     * @note adjacent relationships will also be removed.
     */
    removeNodesWithIds(nodeIds: string[]): void;
    /**
     * Removes the specified relationships from the current scene.
     * @param {string[]} relationshipIds The relationship ids to be removed.
     */
    removeRelationshipsWithIds(relationshipIds: string[]): void;
    /**
     * Returns the nodes that are currently in the visualization.
     * @returns {Node[]} An array of the nodes in the visualization.
     * @deprecated Use {@link getNodes} instead.
     */
    get nodes(): Node[];
    /**
     * Returns the relationships that are currently in the visualization.
     * @returns {Relationship[]} An array of the relationships in the visualization.
     * @deprecated Use {@link getRelationships} instead.
     */
    get relationships(): Relationship[];
    /**
     * Returns the node data that is currently stored in the visualisation for a given id.
     * @param {string} id The id of the node that should be returned.
     * @returns {Node} The node or undefined if there is no node with the given id.
     */
    getNodes(): Node[];
    /**
     * Returns the relationships that are currently in the visualization.
     * @returns {Relationship[]} An array of the relationships in the visualization.
     */
    getRelationships(): Relationship[];
    /**
     * Returns the node data that is currently stored in the visualisation for a given id.
     * @param {string} id The id of the node that should be returned.
     * @returns {Node} The node or undefined if there is no node with the given id.
     */
    getNodeById(id: string): Node;
    /**
     * Returns the relationship data that is currently stored in the visualisation for a given id.
     * @param {string} id The id of the relationship that should be returned.
     * @returns {Relationship} The relationship or undefined if there is no relationship with the given id.
     */
    getRelationshipById(id: string): Relationship;
    /**
     * Returns the node position that is currently stored in the visualisation for a given id.
     * @param {string} id The id of the node position that should be returned.
     * @returns {Node} The position information for the given id, or undefined if there is no such node
     * or the layout has not yet run with that node.
     */
    getPositionById(id: string): Node;
    /**
     * Returns the current options.
     * @returns {NvlOptions} The current options.
     * @internal
     * @deprecated Use {@link getCurrentOptions} instead.
     */
    currentOptions(): NvlOptions;
    /**
     * Returns the current options.
     * @returns {NvlOptions} The current options.
     * @internal
     */
    getCurrentOptions(): NvlOptions;
    /** Removes the graph visualization from the DOM and cleans up everything. */
    destroy(): void;
    /**
     * De-selects all nodes and relationships.
     */
    deselectAll(): void;
    /**
     * Updates pan and zoom fit the specified nodes in the viewport.
     * @param {string[]} nodeIds The ids of the nodes to fit on the screen,
     * @param {NvlState['zoomOptions']} zoomOptions specific options on how to transition the zoom
     * @note If the zoom level required to fit the provided nodes is outside of the range provided by the
     * {@link NvlOptions.minZoom} and {@link NvlOptions.maxZoom} options,
     * and {@link NvlOptions.allowDynamicMinZoom} is set to `false`,
     * the zoom level will be set to the closest valid zoom level,
     * even if the given nodes do not fit the viewport yet.
     */
    fit(nodeIds: string[], zoomOptions: NvlState['zoomOptions']): void;
    /**
     * Resets the zoom of the viewport back to the default zoom level of 0.75
     */
    resetZoom(): void;
    /**
     * Toggles between the WebGL and Canvas rendering.
     * @param {boolean} enabled Whether or not WebGL renderer should be used.
     */
    setUseWebGLRenderer(enabled: boolean): void;
    /**
     * Restarts NVL with or without WebGL support.
     * @param {boolean} disabled Whether or not WebGL should be disabled.
     * @note not to be confused with {@link setUseWebGLRenderer}, which only affects the rendering method
     * @experimental
     * @internal
     */
    setDisableWebGL(disabled?: boolean): void;
    /**
     * Pins the specified node so it is not affected by layout forces.
     * @param {string} nodeId The id of the node to be pinned.
     */
    pinNode(nodeId: string): void;
    /**
     * Un-pins the specified nodes so it is affected by layout forces again.
     * @param {string[]} nodeIds The ids of the nodes to be un-pinned.
     */
    unPinNode(nodeIds: string[]): void;
    /**
     * Changes the layout type.
     * @param {Layout} layout The layout type.
     */
    setLayout(layout: Layout): void;
    /**
     * Updates the configuration of the current layout.
     * @param {LayoutOptions} options The layout configuration.
     */
    setLayoutOptions(options: LayoutOptions): void;
    /**
     * Returns the nodes that are currently in the visualization.
     * @note The `rels` property of the returned object is always empty.
     * @returns {{ nodes: Node[], rels: Relationship [] }} An array of the nodes in the visualization.
     */
    getNodesOnScreen(): {
        nodes: Node[];
        rels: Relationship[];
    };
    /**
     * Fetches and returns the current positions of all nodes as an array of coordinates.
     * @returns {(Node & Point)[]} An array of node positions.
     */
    getNodePositions(): (Node & Point)[];
    /**
     * Sets the node positions based on data provided
     * @param {Node[]} data The positions that the nodes should be set to.
     * @param {boolean} updateLayout whether or not the current layout algorithm
     * should update the graph after setting the node positions.
     * False by default.
     */
    setNodePositions(data: Node[], updateLayout?: boolean): void;
    /**
     * Checks and returns whether the current layout is still in flux.
     * @returns {boolean} Whether or not the layout is moving.
     */
    isLayoutMoving(): boolean;
    /**
     * Saves the current view of the graph visualization canvas as a png to the client.
     * @param {{ filename: string, backgroundColor: string }} options The filename and background color of the png.
     * @param {string} options.filename The filename of the png file.
     * @param {string} options.backgroundColor - The background color of the png file.
     * @note The size of the png file will be the size of the canvas in the DOM.
     */
    saveToFile(options: {
        filename?: string;
        backgroundColor?: string;
    }): void;
    /**
     * Saves the entire graph visualization canvas as a png to the client.
     * @param {{ filename: string, backgroundColor: string }} options The filename and background color of the png.
     * @param {string} options.filename The filename of the png file.
     * @param {string} options.backgroundColor - The background color of the png file.
     * @note The size of the png file will be as large as the entire graph at the default zoom level.
     * Can result in a very large file.
     * @example
     * // Save the entire graph visualization canvas as a png to the client.
     * graphVisualization.saveFullGraphToFile({ filename: 'graph.png', backgroundColor: '#fff' })
     */
    saveFullGraphToLargeFile(options: {
        filename?: string;
        backgroundColor?: string;
    }): void;
    /**
     * Sets the zoom of the viewport to a specific value.
     * @param {number} absolute The desired zoom level.
     * @note When updating both the zoom level and pan coordinates,
     * use {@link setZoomAndPan} instead of calling {@link setZoom} and {@link setPan}
     * separately to avoid jittering.
     * @note If the zoom level is outside of the range provided by the
     * {@link NvlOptions.minZoom} and {@link NvlOptions.maxZoom} options,
     * the zoom level will be set to the closest valid zoom level.
     * @note If {@link NvlOptions.allowDynamicMinZoom} is set to true,
     * the {@link NvlOptions.minZoom} option will be ignored of the current graph does not fit the viewport.
     */
    setZoom(absolute: number): void;
    /**
     * Sets the zoom of the viewport to a specific value.
     * @param {number} panX The desired panX value.
     * @param {number} panY The desired panY value.
     * @note When updating both the zoom level and pan coordinates,
     * use {@link setZoomAndPan} instead of calling {@link setZoom} and {@link setPan}
     * separately to avoid jittering.
     */
    setPan(panX: number, panY: number): void;
    /**
     * Sets the zoom and pan of the viewport to specific values.
     * @param {number} zoom The desired zoom level.
     * @param {number} panX The desired panX value.
     * @param {number} panY The desired panY value.
     * @note When only updating the zoom level or pan coordinates, use {@link setZoom} or {@link setPan} instead.
     * @note If the zoom level is outside of the range provided by the
     * {@link NvlOptions.minZoom} and {@link NvlOptions.maxZoom} options,
     * the zoom level will be set to the closest valid zoom level.
     * @note If {@link NvlOptions.allowDynamicMinZoom} is set to true,
     * the {@link NvlOptions.minZoom} option will be ignored of the current graph does not fit the viewport.
     */
    setZoomAndPan(zoom: number, panX: number, panY: number): void;
    /**
     * Get the current zoom level of the viewport.
     * @returns {number} The current zoom level
     */
    getScale(): number;
    /**
     * Returns the current pan of the viewport.
     * @returns {Point} The current pan of the viewport.
     */
    getPan(): Point;
    /**
     * Gets the nodes and relationships that have been hit by a pointer event.
     * @param evt The mouse event.
     * @param targets The graph elements to check for hits. Defaults to ['node', 'relationship'].
     * @param hitOptions - Options for the hit test.
     * @returns A {@link NvlMouseEvent} with the {@link HitTargets} property
     * containing the nodes and relationships that have been hit by the pointer event.
     *
     * @example
     * ```js
     * const container = document.getElementById('frame')
     * const nvl = new NVL(container, nodes, relationships)
     *
     * // Get the nodes and relationships that have been hit by a pointer event.
     * container.addEventListener('click', (evt) => {
     *   const { nvlTargets } = nvl.getHits(evt)
     *   console.log('clicked elements:', nvlTargets)
     * })
     * ```
     */
    getHits(evt: MouseEvent, targets?: ('node' | 'relationship')[], hitOptions?: {
        hitNodeMarginWidth: number;
    }): NvlMouseEvent;
    /**
     * Provides the container DOM element the graph is rendered in.
     * @returns The container element of the NVL instance.
     */
    getContainer(): HTMLElement;
    private initialise;
    private setupLogging;
    private nodeRemoval;
    private edgeRemoval;
    private update;
    private validateNodes;
    private validateRelationships;
    private checkWebGLCompatibility;
}
/**
 * Functions for mapping colors.
 * @internal
 */
declare const colorMapperFunctions: {
    textColorForBackground: (color: string) => string;
};
export default NVL;
export type { NvlOptions, Node, Relationship, PartialNode, PartialRelationship, Layout, LayoutOptions, ForceDirectedOptions, HierarchicalOptions, ExternalCallbacks, HitTargets, HitTargetNode, HitTargetRelationship, Point, NvlMouseEvent, NodeBorderStyles };
export { NVL, colorMapperFunctions, CompatibilityError, ForceDirectedLayoutType, HierarchicalLayoutType, GridLayoutType, FreeLayoutType, d3ForceLayoutType, drawCircleBand };
