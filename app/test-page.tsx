export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">CDR Analytics Test Page</h1>
      <p>Frontend is working! Backend API: http://localhost:3001</p>
      <button 
        onClick={() => fetch('http://localhost:3001/api/health').then(r => r.json()).then(console.log)}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Test Backend Connection
      </button>
    </div>
  )
}