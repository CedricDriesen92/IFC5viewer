"use client"

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import _ from 'lodash';
import Viewer3D from './Viewer3D'

const IFC5Viewer = () => {
  const [data, setData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/ifc5-example.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const parsed = await response.json();
        console.log('Data loaded successfully:', {
          totalNodes: parsed.length,
          sampleNodes: parsed.slice(0, 3).map(node => ({
            name: node.name,
            def: node.def,
            hasIFCClass: !!node.attributes?.['ifc5:class'],
            ifcClass: node.attributes?.['ifc5:class']?.code,
            hasGeometry: !!node.attributes?.['UsdGeom:Mesh']
          }))
        });
        setData(parsed);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderProperties = (node) => {
    if (!node.attributes) return null;
    
    const properties = [];
    
    // Handle IFC class
    if (node.attributes['ifc5:class']) {
      properties.push(
        <div key="ifc-class" className="mb-4 bg-blue-50 p-3 rounded-lg">
          <div className="font-bold text-blue-800">IFC Class</div>
          <div className="ml-2">
            <div className="text-blue-700">{node.attributes['ifc5:class'].code}</div>
            <div className="text-sm text-blue-500">{node.attributes['ifc5:class'].uri}</div>
          </div>
        </div>
      );
    }

    // Handle NLSFB class (if applicable)
    if (node.attributes['nlsfb:class']) {
      properties.push(
        <div key="nlsfb-class" className="mb-4 bg-green-50 p-3 rounded-lg">
          <div className="font-bold text-green-800">NLSFB Class</div>
          <div className="ml-2">
            <div className="text-green-700">{node.attributes['nlsfb:class'].code}</div>
            <div className="text-sm text-green-500">{node.attributes['nlsfb:class'].uri}</div>
          </div>
        </div>
      );
    }

    // Handle IFC properties
    if (node.attributes['ifc5:properties']) {
      properties.push(
        <div key="ifc-props" className="mb-4 bg-purple-50 p-3 rounded-lg">
          <div className="font-bold text-purple-800">Properties</div>
          {Object.entries(node.attributes['ifc5:properties']).map(([key, value]) => (
            <div key={key} className="ml-2 text-purple-700">
              <span className="font-medium">{key}:</span> {value.toString()}
            </div>
          ))}
        </div>
      );
    }

    // Handle transform
    if (node.attributes['xformOp']) {
      properties.push(
        <div key="transform" className="mb-4 bg-amber-50 p-3 rounded-lg">
          <div className="font-bold text-amber-800">Transform Matrix</div>
          <div className="ml-2 font-mono text-sm text-amber-700">
            {node.attributes['xformOp'].transform.map((row, i) => (
              <div key={i}>[{row.map(v => v.toFixed(3)).join(', ')}]</div>
            ))}
          </div>
        </div>
      );
    }

    return properties.length > 0 ? (
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        {properties}
      </div>
    ) : null;
  }

  // Function to render each node in the tree
  const renderNode = (node, level = 0) => {
    if (!node) return null;

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.name);
    const isSelected = selectedNode?.name === node.name;

    return (
      <div key={node.name} className="select-none">
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100' : ''
          }`}
          style={{ paddingLeft: `${level * 20}px` }}
          onClick={() => {
            setSelectedNode(node);
            if (hasChildren) toggleNode(node.name);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1" />
            )
          ) : (
            <span className="w-4 mr-1" />
          )}
          <span className="font-medium">{node.name}</span>
          {node.type && (
            <span className="ml-2 text-sm text-gray-500">({node.type})</span>
          )}
          {node.def && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 rounded-full">
              {node.def}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 ml-4">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  // Function to filter root nodes
  const rootNodes = data.filter(node => 
    node.def !== "over" && 
    !node.name?.startsWith("disclaimer") &&
    node.type?.startsWith("UsdGeom")
  );

  // Handler for node selection
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };

  return (
    <div className="flex flex-col h-screen gap-4 p-4">
      {/* 3D Viewer Section */}
      <Card className="w-full h-[400px]">
        <CardHeader>
          <CardTitle>3D View</CardTitle>
        </CardHeader>
        <CardContent className="h-full">
          <Viewer3D 
            selectedNode={selectedNode} 
            allNodes={data} 
            onSelectNode={handleNodeSelect}
          />
        </CardContent>
      </Card>

      {/* Existing Tree and Properties Section */}
      <div className="flex gap-4 flex-1">
        <Card className="w-1/2 overflow-auto border-r">
          <CardHeader className="sticky top-0 bg-white z-10">
            <CardTitle>IFC5 Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tree-view">
              {rootNodes.map(node => renderNode(node))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-1/2 overflow-auto">
          <CardHeader className="sticky top-0 bg-white z-10">
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">{selectedNode.name}</h3>
                  {selectedNode.type && (
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedNode.type}
                    </span>
                  )}
                </div>
                {renderProperties(selectedNode)}
                {selectedNode.attributes && (
                  <pre className="mt-4 p-4 bg-gray-50 rounded-md overflow-auto text-sm">
                    {JSON.stringify(selectedNode.attributes, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Select a node to view its properties</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IFC5Viewer;