'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  isElectron, 
  getAppVersion, 
  getPlatform, 
  getUserDataPath,
  showMessageBox 
} from '@/lib/electron';

export default function DebugPage() {
  const [electronInfo, setElectronInfo] = useState<{
    isElectron: boolean;
    version: string | null;
    platform: string | null;
    userDataPath: string | null;
  }>({
    isElectron: false,
    version: null,
    platform: null,
    userDataPath: null,
  });

  useEffect(() => {
    async function loadElectronInfo() {
      const inElectron = isElectron();
      if (inElectron) {
        const [version, platform, userDataPath] = await Promise.all([
          getAppVersion(),
          getPlatform(),
          getUserDataPath(),
        ]);
        setElectronInfo({
          isElectron: true,
          version,
          platform,
          userDataPath,
        });
      } else {
        setElectronInfo({ isElectron: false, version: null, platform: null, userDataPath: null });
      }
    }
    loadElectronInfo();
  }, []);

  const testDialog = async () => {
    const result = await showMessageBox({
      type: 'info',
      title: 'Test Dialog',
      message: 'This is a test dialog from Electron!',
      buttons: ['OK', 'Cancel'],
    });
    console.log('Dialog result:', result);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Electron Debug Panel</h1>
        <p className="text-muted-foreground">Test Electron IPC bridge and APIs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
          <CardDescription>Current runtime environment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Running in Electron:</span>
            <Badge variant={electronInfo.isElectron ? 'default' : 'secondary'}>
              {electronInfo.isElectron ? 'Yes' : 'No (Browser)'}
            </Badge>
          </div>

          {electronInfo.isElectron && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">App Version:</span>
                <code className="text-sm">{electronInfo.version}</code>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Platform:</span>
                <code className="text-sm">{electronInfo.platform}</code>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-medium">User Data Path:</span>
                <code className="text-xs bg-muted p-2 rounded break-all">
                  {electronInfo.userDataPath}
                </code>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {electronInfo.isElectron && (
        <Card>
          <CardHeader>
            <CardTitle>IPC Tests</CardTitle>
            <CardDescription>Test Electron IPC communication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button onClick={testDialog}>Test Message Dialog</Button>
              <p className="text-sm text-muted-foreground mt-2">
                Opens a native dialog via Electron IPC
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!electronInfo.isElectron && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>⚠️ Browser Mode</CardTitle>
            <CardDescription>
              This page is running in a browser. To test Electron features, run:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="bg-muted p-4 rounded block">pnpm dev:desktop</code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
