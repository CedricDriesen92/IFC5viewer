"use client"

import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      Loading 3D viewer...
    </div>
  )
})

export default function Viewer3D({ selectedNode, allNodes, onSelectNode }) {
  return (
    <div className="w-full h-full">
      <Scene 
        selectedNode={selectedNode} 
        allNodes={allNodes} 
        onSelectNode={onSelectNode}
      />
    </div>
  )
}