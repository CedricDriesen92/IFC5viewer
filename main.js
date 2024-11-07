import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import _ from 'lodash';

const IFC5Viewer = () => {
  const [data, setData] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await window.fs.readFile('paste.txt', { encoding: 'utf8' });
        const parsed = JSON.parse(response);
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
        <div key="ifc-class" className="mb-2">
          <div className="font-semibold">IFC Class:</div>
          <div className="ml-2">
            <div>{node.attributes['ifc5:class'].code}</div>
            <div className="text-sm text-gray-500">{node.attributes['ifc5:class'].uri}</div>
          </div>
        </div>
      );
    }

    // Handle IFC properties
    if (node.attributes['ifc5:properties']) {
      properties.push(
        <div key="ifc-props" className="mb-2">
          <div className="font-semibold">Properties:</div>
          {Object.entries(node.attributes['ifc5:properties']).map(([key, value]) => (
            <div key={key} className="ml-2">
              {key}: {value.toString()}
            </div>
          ))}
        </div>
      );
    }

    // Handle transform
    if (node.attributes['xformOp']) {
      properties.push(
        <div key="transform" className="mb-2">
          <div className="font-semibold">Transform:</div>
          <div className="ml-2 font-mono text-sm">
            {node.attributes['xformOp'].transform.map((row, i) => (
              <div key={i}>[{row.map(v => v.toFixed(2)).join(', ')}]</div>
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
  };

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
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filter out the disclaimer and find the root nodes
  const rootNodes = data.filter(node => 
    node.def !== "over" && 
    !node.name?.startsWith("disclaimer") &&
    node.type?.startsWith("UsdGeom")
  );

  return (
    <div className="flex h-screen max-h-[600px]">
      <Card className="w-1/2 overflow-auto border-r">
        <CardHeader>
          <CardTitle>IFC5 Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tree-view">
            {rootNodes.map(node => renderNode(node))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="w-1/2 overflow-auto">
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedNode ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">{selectedNode.name}</h3>
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
  );
};

export default IFC5Viewer;