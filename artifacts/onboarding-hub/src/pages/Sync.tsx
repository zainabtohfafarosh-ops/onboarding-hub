import { useState } from "react";
import { useGetSyncStatus, useSyncGoogleSheets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Database, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Sync() {
  const { data: status, isLoading, refetch } = useGetSyncStatus();
  const syncMutation = useSyncGoogleSheets();
  const { toast } = useToast();

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Hires");
  
  // Set defaults once loaded
  if (status && !spreadsheetId && status.spreadsheetId) {
    setSpreadsheetId(status.spreadsheetId);
  }
  if (status && status.sheetName && sheetName === "Hires") {
    setSheetName(status.sheetName);
  }

  const handleSync = () => {
    if (!spreadsheetId) {
      toast({ title: "Spreadsheet ID is required", variant: "destructive" });
      return;
    }

    syncMutation.mutate(
      { data: { spreadsheetId, sheetName: sheetName || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Sync initiated successfully" });
          refetch();
        },
        onError: (err: any) => {
          toast({ 
            title: "Sync failed", 
            description: err?.message || "Check your credentials and try again",
            variant: "destructive" 
          });
        }
      }
    );
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Data Synchronization</h1>
          <p className="text-muted-foreground mt-1">Connect the hub to your master Google Sheet.</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>Current connection health and history.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !status || status.status === 'never' ? (
                <div className="p-6 text-center border rounded-md bg-muted/30">
                  <Database className="size-8 mx-auto text-muted-foreground mb-2" />
                  <div className="font-medium">No sync history</div>
                  <div className="text-sm text-muted-foreground">Configure the connection below to import hires.</div>
                </div>
              ) : (
                <div className="p-6 border rounded-md relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                  
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {status.status === 'success' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="size-3 mr-1" /> Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="size-3 mr-1" /> Failed
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Calendar className="size-3 mr-1" />
                          {status.lastSyncAt ? format(parseISO(status.lastSyncAt), "MMM d, yyyy 'at' h:mm a") : 'Unknown'}
                        </span>
                      </div>
                      
                      {status.status === 'error' && status.errorMessage ? (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded font-mono">
                          {status.errorMessage}
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-2 gap-8 text-sm">
                          <div>
                            <span className="text-muted-foreground">Records Added:</span>
                            <span className="font-semibold ml-2 text-lg">{status.hiresAdded || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Records Updated:</span>
                            <span className="font-semibold ml-2 text-lg">{status.hiresUpdated || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Enter the Google Sheet details containing your new hire pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Google Spreadsheet ID</Label>
                <Input 
                  value={spreadsheetId} 
                  onChange={(e) => setSpreadsheetId(e.target.value)} 
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The long string of characters found in the sheet URL between /d/ and /edit.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Sheet Name</Label>
                <Input 
                  value={sheetName} 
                  onChange={(e) => setSheetName(e.target.value)} 
                  placeholder="Sheet1"
                />
                <p className="text-xs text-muted-foreground">
                  The specific tab name within the document. Usually "Sheet1" or "Hires".
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t pt-6 flex justify-between items-center">
              <div className="text-sm text-muted-foreground max-w-sm">
                Syncing will pull in new records and update existing ones based on email address.
              </div>
              <Button 
                onClick={handleSync} 
                disabled={syncMutation.isPending || !spreadsheetId}
                className="min-w-[140px]"
              >
                {syncMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    Run Sync Now
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
