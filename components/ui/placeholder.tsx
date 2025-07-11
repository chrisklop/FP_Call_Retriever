// Placeholder components for development

export const Dialog = ({ children, open, onOpenChange }: any) => 
  open ? <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">{children}</div> : null

export const DialogContent = ({ children, className }: any) => 
  <div className={`bg-white rounded-lg p-6 max-w-md w-full mx-4 ${className}`}>{children}</div>

export const DialogHeader = ({ children }: any) => <div className="mb-4">{children}</div>

export const DialogTitle = ({ children }: any) => <h2 className="text-lg font-semibold">{children}</h2>

export const Input = ({ className, ...props }: any) => 
  <input className={`w-full px-3 py-2 border rounded-md ${className}`} {...props} />

export const Label = ({ children, className, ...props }: any) => 
  <label className={`text-sm font-medium ${className}`} {...props}>{children}</label>

export const Badge = ({ children, variant, className }: any) => 
  <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 ${className}`}>{children}</span>

export const Progress = ({ value, className }: any) => 
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{width: `${value}%`}}></div>
  </div>

export const Select = ({ children, value, onValueChange }: any) => children

export const SelectTrigger = ({ children, className }: any) => 
  <div className={`w-full px-3 py-2 border rounded-md bg-white ${className}`}>{children}</div>

export const SelectValue = ({ placeholder }: any) => <span className="text-gray-500">{placeholder}</span>

export const SelectContent = ({ children }: any) => 
  <div className="absolute z-50 bg-white border rounded-md shadow-lg mt-1">{children}</div>

export const SelectItem = ({ children, value, ...props }: any) => 
  <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer" {...props}>{children}</div>

// Chart placeholders
export const CallVolumeChart = ({ data }: any) => 
  <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
    <p className="text-gray-500">Call Volume Chart ({data?.length} records)</p>
  </div>

export const TopLocationsChart = ({ data }: any) => 
  <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
    <p className="text-gray-500">Top Locations Chart</p>
  </div>

export const CallDataTable = ({ data }: any) => 
  <div className="border rounded-md">
    <div className="p-4 border-b font-medium">Call Data Table</div>
    <div className="p-4 text-sm text-gray-600">{data?.length} call legs</div>
  </div>

export const RecentCallsTable = ({ data }: any) => 
  <div className="space-y-2">
    {data?.slice(0, 5).map((call: any, i: number) => (
      <div key={i} className="text-sm p-2 border rounded">
        {call.location} - {call.status}
      </div>
    ))}
  </div>

export const DateRangePicker = ({ value, onChange }: any) => 
  <div className="flex items-center space-x-2">
    <span className="text-sm text-gray-500">Date Range:</span>
    <span className="text-sm">{value?.start?.toDateString()} - {value?.end?.toDateString()}</span>
  </div>

export const FieldSelectorModal = ({ open, onOpenChange }: any) => 
  open ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">Field Selector</h2>
        <p className="text-sm text-gray-600 mb-4">Choose which CDR fields to display</p>
        <button 
          onClick={() => onOpenChange(false)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  ) : null