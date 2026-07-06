import { signOut } from '@asterism/db';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@asterism/ui';
import { LoaderCircleIcon, LogInIcon, LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGitHubReconnect } from '../auth/use-github-reconnect';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';

export function UserMenu() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { reconnectPending, requiresReconnect, reconnect } = useGitHubReconnect();
  const user = session?.user;
  const name =
    (user?.user_metadata?.user_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = name.slice(0, 1).toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('topbar.account')}
        >
          <Avatar className="size-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {requiresReconnect ? (
          <DropdownMenuItem disabled={reconnectPending} onClick={() => void reconnect()}>
            {reconnectPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <LogInIcon className="size-4" />
            )}
            {reconnectPending ? t('sync.reconnecting') : t('sync.reconnectAction')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem variant="destructive" onClick={() => void signOut(supabase)}>
          <LogOutIcon className="size-4" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
