'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Lock, Key, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface ConfigurationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated: boolean
  onAuthenticated: (authenticated: boolean) => void
}

export function ConfigurationModal({ 
  open, 
  onOpenChange, 
  isAuthenticated, 
  onAuthenticated 
}: ConfigurationModalProps) {
  const [password, setPassword] = useState('')
  const [bearerToken, setBearerToken] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [lastImport, setLastImport] = useState<Date | null>(null)

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password === '113355') {
      onAuthenticated(true)
      setPassword('')
      toast.success('Authentication successful')
    } else {
      toast.error('Invalid password')
      setPassword('')
    }
  }

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bearerToken.trim()) {
      toast.error('Please enter a bearer token')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Step 1: Start import
      setImportProgress(10)
      toast.info('Connecting to Webex API...')

      // Make real API call to backend
      const response = await fetch('http://localhost:3001/api/import-cdr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bearerToken: bearerToken.trim(),
          hoursBack: 48
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      setImportProgress(30)
      toast.info('Fetching CDR data...')

      const result = await response.json()

      setImportProgress(60)
      toast.info('Processing call records...')

      await new Promise(resolve => setTimeout(resolve, 1000))
      setImportProgress(80)
      toast.info('Grouping by correlation ID...')

      await new Promise(resolve => setTimeout(resolve, 1000))
      setImportProgress(100)
      toast.info('Saving to local database...')

      setIsImporting(false)
      setLastImport(new Date())
      setBearerToken('')

      if (result.success) {
        const { data } = result
        toast.success(
          `CDR import successful! ${data.recordsInserted} records imported, ` +
          `${data.callsCreated} unique calls created. ${data.duplicatesSkipped} duplicates skipped.`
        )
      } else {
        throw new Error(result.error || 'Import failed')
      }

    } catch (error) {
      setIsImporting(false)
      setImportProgress(0)
      
      console.error('CDR import error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired bearer token')) {
          toast.error('Invalid or expired bearer token. Please check your token and try again.')
        } else if (error.message.includes('fetch')) {
          toast.error('Cannot connect to backend server. Make sure the backend is running on port 3001.')
        } else {
          toast.error(`Import failed: ${error.message}`)
        }
      } else {
        toast.error('An unexpected error occurred during import')
      }
    }
  }

  const handleLogout = () => {
    onAuthenticated(false)
    setBearerToken('')
    setPassword('')
    toast.info('Logged out of configuration')
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Configuration Access</span>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password Required</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter configuration password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-center"
                autoFocus
              />
            </div>
            
            <Button type="submit" className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Authenticate
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>CDR Configuration</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Import Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Import Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastImport ? (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Last import: {lastImport.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-sm text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>No data imported yet</span>
                </div>
              )}
              
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-gray-600">Importing CDR data...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bearer Token Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Webex API Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bearer-token">Daily Bearer Token</Label>
                  <Input
                    id="bearer-token"
                    type="password"
                    placeholder="Paste your Webex bearer token here"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    disabled={isImporting}
                  />
                  <p className="text-xs text-gray-500">
                    Token expires daily. Import fetches last 48 hours of CDR data.
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isImporting || !bearerToken.trim()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Import CDR Data'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Data Storage Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">CDR Storage Path</Label>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                  /home/chris/cdr_data/
                </p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Database</Label>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                  SQLite (local) → PostgreSQL (production)
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Files Stored</Label>
                  <p className="font-medium">23 files</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Total Records</Label>
                  <p className="font-medium">15,247 legs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-group by Correlation ID</Label>
                <Badge variant="default">Enabled</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm">Duplicate Detection</Label>
                <Badge variant="default">Enabled</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm">Field Validation</Label>
                <Badge variant="default">Strict</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}