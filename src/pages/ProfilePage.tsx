import { useEffect, useState } from 'react';
import { useFridgeStore } from '@/store/useFridgeStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LogOut, Settings, User, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/pushNotifications';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { settings, fetchSettings, updateSettings } = useFridgeStore();
  const [expiryDays, setExpiryDays] = useState('7');
  const [notifyDays, setNotifyDays] = useState('2');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setExpiryDays(String(settings.default_expiry_days));
      setNotifyDays(String(settings.notify_days_before));
    }
  }, [settings]);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const handleTogglePush = async (checked: boolean) => {
    setPushLoading(true);
    try {
      if (checked) {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
        if (ok) toast({ title: 'Push notifications enabled' });
        else toast({ title: 'Could not enable notifications', variant: 'destructive' });
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast({ title: 'Push notifications disabled' });
      }
    } catch {
      toast({ title: 'Error toggling notifications', variant: 'destructive' });
    }
    setPushLoading(false);
  };

  const handleSave = async () => {
    const d = parseInt(expiryDays, 10);
    const n = parseInt(notifyDays, 10);
    if (isNaN(d) || isNaN(n) || d < 1 || n < 0) {
      toast({ title: 'Invalid values', variant: 'destructive' });
      return;
    }
    await updateSettings({ default_expiry_days: d, notify_days_before: n });
    toast({ title: 'Settings saved' });
  };

  return (
    <div className="page-container">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
      </header>

      {/* User info */}
      <div className="rounded-xl bg-card border p-4 mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Signed in</p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl bg-card border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-primary" />
          <h2 className="font-display font-semibold">Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="expiry-days">Default expiry (days)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Used when AI can't detect an expiry date
            </p>
            <Input
              id="expiry-days"
              type="number"
              min={1}
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notify-days">Notify before (days)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Get alerts this many days before expiry
            </p>
            <Input
              id="notify-days"
              type="number"
              min={0}
              value={notifyDays}
              onChange={(e) => setNotifyDays(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl bg-card border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-primary" />
          <h2 className="font-display font-semibold">Notifications</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Expiry alerts</p>
            <p className="text-xs text-muted-foreground">Get notified when food is about to expire</p>
          </div>
          <Switch
            checked={pushEnabled}
            onCheckedChange={handleTogglePush}
            disabled={pushLoading}
          />
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={signOut}
      >
        <LogOut size={16} />
        Sign Out
      </Button>
    </div>
  );
}
