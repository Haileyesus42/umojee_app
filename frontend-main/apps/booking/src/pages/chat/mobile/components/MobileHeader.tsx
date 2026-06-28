import React from "react";
import { RxHamburgerMenu } from "react-icons/rx";
import DropdownUser from "../../../Header/DropdownUser";
import Logo from "../../../../common/Logo";

type MobileHeaderProps = {
  isMenuOpen: boolean;
  onMenuClick: () => void;
  isLoggedIn: boolean;
};

const MobileHeader: React.FC<MobileHeaderProps> = ({
  isMenuOpen,
  onMenuClick,
  isLoggedIn,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur shadow-sm">
      <div className="relative flex items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-label="Toggle sidebar"
          aria-expanded={isMenuOpen}
          onClick={onMenuClick}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground shadow-sm transition-colors hover:bg-muted ${
            isMenuOpen ? "ring-2 ring-primary/50" : ""
          }`}
        >
          <RxHamburgerMenu className="text-lg" />
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="scale-90">
            <Logo />
          </div>
        </div>
        <div className="flex items-center">
          {isLoggedIn ? <DropdownUser showArrow={false} /> : null}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
