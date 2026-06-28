import { useState } from 'react';

import { MenuOverlay } from '../layout/MenuOverlay';
import { Footer } from './Footer';

type FooterWithMenuProps = {
  notificationUnreadCount?: number;
  onLogout?: () => void;
  onOpenChat: () => void;
  onOpenFlow?: () => void;
  onOpenHome?: () => void;
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenTrips?: () => void;
  onOpenWallet?: () => void;
  profileImageUri?: string | null;
  source?: string;
};

export function FooterWithMenu({
  notificationUnreadCount = 0,
  onLogout,
  onOpenChat,
  onOpenFlow,
  onOpenHome,
  onOpenMenu,
  onOpenNotifications,
  onOpenProfile,
  onOpenTrips,
  onOpenWallet,
  profileImageUri,
  source,
}: FooterWithMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const openMenu = onOpenMenu ?? (() => setIsMenuOpen(true));

  return (
    <>
      <Footer
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenFlow}
        onOpenHome={onOpenHome}
        onOpenMenu={openMenu}
        onOpenTrips={onOpenTrips}
        source={source}
      />
      {onOpenMenu ? null : (
        <MenuOverlay
          notificationUnreadCount={notificationUnreadCount}
          onClose={() => setIsMenuOpen(false)}
          onLogout={onLogout}
          onOpenChat={onOpenChat}
          onOpenHome={onOpenHome}
          onOpenJourneys={onOpenTrips}
          onOpenNotifications={onOpenNotifications}
          onOpenProfile={onOpenProfile}
          onOpenTravelSupport={onOpenFlow}
          onOpenWallet={onOpenWallet}
          profileImageUri={profileImageUri}
          visible={isMenuOpen}
        />
      )}
    </>
  );
}
