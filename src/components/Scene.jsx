"use client"

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const RENDERABLE_ELEMENTS = [
  'IfcWall',
  'IfcWindow',
  'IfcDoor',
  'IfcSlab',
  'IfcRoof',
  'IfcStair',
  'IfcRailing',
  'IfcColumn',
  'IfcBeam'
];

function findTransform(node, allNodes) {
  // Check if node has direct transform
  if (node.attributes?.xformOp?.transform) {
    return node.attributes.xformOp.transform;
  }

  // Check inherited transforms
  if (node.inherits) {
    for (const inheritPath of node.inherits) {
      // Extract name from path (remove </> characters)
      const inheritedName = inheritPath.replace(/[</>]/g, '');
      const inheritedNode = allNodes.find(n => n.name === inheritedName);
      
      if (inheritedNode) {
        const inheritedTransform = findTransform(inheritedNode, allNodes);
        if (inheritedTransform) {
          return inheritedTransform;
        }
      }
    }
  }

  // Return identity matrix if no transform found
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

function getMeshNodes(allNodes) {
  console.log('getAllNodes received:', allNodes?.length, 'nodes');
  
  if (!allNodes) {
    console.warn('allNodes is null or undefined');
    return [];
  }

  const meshNodes = [];
  
  // First find all IFC nodes
  const ifcNodes = allNodes.filter(node => 
    node.attributes?.['ifc5:class']?.code && 
    RENDERABLE_ELEMENTS.includes(node.attributes['ifc5:class'].code)
  );
  
  console.log('Found matching IFC nodes:', ifcNodes.map(n => ({
    name: n.name,
    class: n.attributes['ifc5:class'].code
  })));

  // For each IFC node, find and merge all its body nodes
  ifcNodes.forEach(ifcNode => {
    const bodyNodes = allNodes.filter(n => n.name === `${ifcNode.name}_Body`);
    
    if (bodyNodes.length === 0) {
      console.warn(`No body nodes found for IFC node: ${ifcNode.name}`);
      return;
    }

    // Merge all attributes from body nodes
    const mergedAttributes = bodyNodes.reduce((acc, node) => {
      return { ...acc, ...node.attributes };
    }, {});

    const geometry = mergedAttributes['UsdGeom:Mesh'];

    console.log('Looking for body of:', ifcNode.name, {
      found: bodyNodes.length > 0,
      hasGeometry: !!geometry,
      points: geometry?.points?.length,
      indices: geometry?.faceVertexIndices?.length,
      rawGeometry: geometry // Debug the raw geometry object
    });

    if (geometry?.points && geometry?.faceVertexIndices) {
      // Find transformation by traversing inheritance chain
      const transform = findTransform(ifcNode, allNodes);
      
      console.log('Found transform for:', ifcNode.name, {
        transform,
        inheritedFrom: ifcNode.inherits
      });

      // Transform points using both coordinate system correction and position transform
      const transformedPoints = geometry.points.map(point => {
        // First swap Y and Z for correct orientation
        const [x, y, z] = point;
        const reorientedPoint = [x, z, -y, 1]; // Add homogeneous coordinate

        // Apply transformation matrix
        const transformed = [
          reorientedPoint[0] * transform[0][0] + reorientedPoint[1] * transform[0][1] + 
          reorientedPoint[2] * transform[0][2] + transform[0][3],
          reorientedPoint[0] * transform[1][0] + reorientedPoint[1] * transform[1][1] + 
          reorientedPoint[2] * transform[1][2] + transform[1][3],
          reorientedPoint[0] * transform[2][0] + reorientedPoint[1] * transform[2][1] + 
          reorientedPoint[2] * transform[2][2] + transform[2][3]
        ];

        return transformed;
      });

      meshNodes.push({
        ...ifcNode,
        bodyGeometry: {
          ...geometry,
          points: transformedPoints
        }
      });
      
      console.log('Added mesh node:', ifcNode.name, {
        hasTransform: !!transform,
        transformMatrix: transform,
        pointCount: transformedPoints.length,
        indicesCount: geometry.faceVertexIndices.length
      });
    } else {
      console.warn(`Geometry data incomplete for IFC node: ${ifcNode.name}`);
    }
  });

  console.log('Final mesh nodes:', meshNodes.length);
  console.log('Mesh nodes details:', meshNodes.map(node => ({
    name: node.name,
    ifcClass: node.attributes?.['ifc5:class']?.code,
    hasGeometry: !!node.bodyGeometry,
    pointsCount: node.bodyGeometry?.points?.length,
    indicesCount: node.bodyGeometry?.faceVertexIndices?.length
  })));

  return meshNodes;
}

function Mesh({ node, isSelected, onClick }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  if (!node.bodyGeometry?.points) {
    console.warn('No points in geometry data for node:', node.name)
    return null
  }

  const geometry = useMemo(() => {
    const vertices = node.bodyGeometry.points.map(point => 
      new THREE.Vector3(point[0], point[1], point[2])
    )
    
    const positions = new Float32Array(vertices.length * 3)
    vertices.forEach((vertex, i) => {
      positions[i * 3] = vertex.x
      positions[i * 3 + 1] = vertex.y
      positions[i * 3 + 2] = vertex.z
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    if (node.bodyGeometry.faceVertexIndices) {
      geometry.setIndex(node.bodyGeometry.faceVertexIndices)
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [node.bodyGeometry])

  // Apply transform if available
  useMemo(() => {
    if (node.attributes?.['xformOp']?.transform) {
      const matrix = new THREE.Matrix4()
      matrix.fromArray(node.attributes['xformOp'].transform.flat())
      geometry.applyMatrix4(matrix)
    }
  }, [geometry, node.attributes])

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial 
        color={isSelected ? "#ff4444" : hovered ? "#dddddd" : "#cccccc"} 
        side={THREE.DoubleSide} 
      />
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-white px-2 py-1 rounded shadow text-sm">
            {node.name} ({node.attributes['ifc5:class'].code})
          </div>
        </Html>
      )}
    </mesh>
  )
}

export default function Scene({ selectedNode, allNodes, onSelectNode }) {
  console.log('Scene received allNodes:', allNodes?.length);
  
  const meshNodes = useMemo(() => {
    console.log('Running getMeshNodes...');
    return getMeshNodes(allNodes);
  }, [allNodes]);

  // Debug render count
  const renderCount = useRef(0);
  renderCount.current++;
  console.log('Scene render count:', renderCount.current);

  if (meshNodes.length === 0) {
    console.log('No mesh nodes to render. RENDERABLE_ELEMENTS:', RENDERABLE_ELEMENTS);
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        style={{ background: '#f0f0f0' }}
        onClick={() => onSelectNode(null)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        <axesHelper args={[5]} />
        <gridHelper args={[20, 20]} />
        
        {meshNodes.length === 0 && (
          <Html position={[0, 0, 0]}>
            <div className="text-red-500">No mesh nodes to display.</div>
          </Html>
        )}
        
        {meshNodes.map((node, index) => (
          <Mesh 
            key={node.name || index}
            node={node}
            isSelected={node === selectedNode}
            onClick={() => onSelectNode(node)}
          />
        ))}
      </Canvas>
    </div>
  )
}