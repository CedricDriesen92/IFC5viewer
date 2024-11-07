import IFC5Viewer from '../components/IFC5Viewer'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-4">IFC5 Viewer</h1>
        <IFC5Viewer />
      </div>
    </main>
  )
}