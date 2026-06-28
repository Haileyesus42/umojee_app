import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Bot, Headset } from "lucide-react";
import { cookies } from "../..";
import { getLocalStorageValue, removeLocalStorageValue } from "../../lib/utils";
import { logout } from "../../store/auth/authSlice";
import { IMAGES } from "../../assets";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationItem } from '../../types/types';

const backendUrl = process.env.REACT_APP_BACKEND_URL;

type DropdownUserProps = {
  showArrow?: boolean;
};

const DropdownUser: React.FC<DropdownUserProps> = ({ showArrow = true }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsTop, setNotificationsTop] = useState(0);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useDispatch();

  const containerRef = useRef<HTMLDivElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);

  const user = getLocalStorageValue("user");
  const { notifications: rawNotifications, markAsSeen } = useNotifications();

  const isRouteActive = (paths: string[]) => {
    return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  };

  const menuItemClass = (isActive: boolean) =>
    `flex items-center gap-3.5 rounded-md px-3 py-2 text-sm font-medium duration-300 ease-in-out lg:text-base ${
      isActive
        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        : "text-slate-700 hover:bg-slate-100 hover:text-primary dark:text-slate-100 dark:hover:bg-slate-600"
    }`;

  const actionButtonClass =
    "flex w-full items-center gap-3.5 rounded-md px-3 py-2 text-left text-sm font-medium duration-300 ease-in-out hover:bg-slate-100 hover:text-primary dark:text-slate-100 dark:hover:bg-slate-600 lg:text-base";

  // --- 1. AGGRESSIVE URL CLEANER ---
  // This function ensures we NEVER pass a full URL to navigate(), only the path.
  const getSafePath = (rawRoute: string): string => {
    if (!rawRoute) return "#";

    try {
      // If it's a full URL (http...), extract just the pathname
      if (rawRoute.startsWith("http")) {
        const urlObj = new URL(rawRoute);
        return urlObj.pathname + urlObj.search + urlObj.hash;
      }
    } catch (e) {
      // If URL parsing fails, fall back to string manipulation
      console.warn("Could not parse URL, using fallback", e);
    }

    // If it's already a path, ensure it starts with /
    if (!rawRoute.startsWith("/")) {
      return `/${rawRoute}`;
    }

    return rawRoute;
  };

  const notifications = ((rawNotifications as unknown as NotificationItem[]) || []).map((n) => ({
    id: n._id,
    title: "Notification",
    description: n.message,
    date: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "",
    seen: n.seen,
    route: getSafePath(n.route), // Clean it immediately during mapping
  }));

  // --- 2. SIMPLE CLICK OUTSIDE (No Focus/Blur races) ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownOpen) return;
      const target = event.target as Node;
      
      // If clicking inside the menu, let the buttons work
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }

      // If clicking outside, close it
      setDropdownOpen(false);
      setShowNotifications(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // --- 3. NAVIGATION HANDLER ---
  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (notification.route && notification.route !== "#") {
        // Log to verify we are passing a clean path
        console.log("Navigating to:", notification.route);
        navigate(notification.route);
    }

    setDropdownOpen(false);
    setShowNotifications(false);

    if (!notification.seen) {
        markAsSeen(notification.id).catch(console.error);
    }
  };

  const positionNotificationsPanel = () => {
    if (notificationTriggerRef.current && containerRef.current) {
        const triggerRect = notificationTriggerRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setNotificationsTop(triggerRect.top - containerRect.top);
    }
  };

  const hasUnreadNotifications = notifications.some((n) => !n.seen);
  const shouldShowBubble = hasUnreadNotifications && pathname.startsWith("/chat/mobile");

  return (
    <div className="relative" ref={containerRef}>
      
      {/* TRIGGER BUTTON (No Link) */}
      <button
        type="button"
        className="flex items-center gap-4 bg-transparent border-none cursor-pointer"
        onClick={() => setDropdownOpen((prev) => !prev)}
      >
        <span className="relative h-10 w-10 flex items-center justify-center">
          {shouldShowBubble && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500/60 animate-ping" />
            </>
          )}
          <span className="h-10 w-10 rounded-full overflow-hidden">
            <img
              src={user?.photo ? `${backendUrl}${user.photo}` : IMAGES.africanGirlProfile}
              alt="User"
              className="w-full h-full object-cover"
            />
          </span>
        </span>
        {showArrow && (
           <svg className={`hidden fill-current sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} width="12" height="8" viewBox="0 0 12 8" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z" fill="" /></svg>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 flex w-64 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-slate-500 shadow-xl z-[1000]">
          <ul className="flex flex-col gap-2 pb-5 border-b border-stroke px-6 py-7 dark:border-strokedark">
            <li>
              <Link 
                to="/profile" 
                className={menuItemClass(isRouteActive(["/profile"]))}
                onClick={() => setDropdownOpen(false)}
              >
                 <svg className="fill-current" width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z" fill="" /><path d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z" fill="" /></svg>
                  My Profile
              </Link>
            </li>
            <li>
              <Link 
                to="/support" 
                className={menuItemClass(isRouteActive(["/support", "/chat/support"]))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDropdownOpen(false)}
              >
                 <Headset className="h-[22px] w-[22px]" />
                  Support
              </Link>
            </li>
            <li>
              <Link 
                to="/journey" 
                className={menuItemClass(isRouteActive(["/journey"]))}
                onClick={() => setDropdownOpen(false)}
              >
                 <Bot className="h-[22px] w-[22px]" />
                  Umojee
              </Link>
            </li>
            <li>
              <button
                type="button"
                ref={notificationTriggerRef}
                className={actionButtonClass}
                onClick={(e) => {
                  e.stopPropagation();
                  positionNotificationsPanel();
                  setShowNotifications((prev) => !prev);
                }}
              >
                <Bell className="h-5 w-5" />
                Notifications
                {hasUnreadNotifications && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-red-500" />}
              </button>
            </li>
          </ul>
          <button
            className="flex items-center gap-3.5 px-6 py-4 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base w-full text-left"
            onClick={() => {
              dispatch(logout() as any);
              removeLocalStorageValue("isLoggedIn");
              removeLocalStorageValue("user");
              removeLocalStorageValue("redirectPath");
              removeLocalStorageValue("token");
              cookies.remove("token");
              navigate("/login", { replace: true });
            }}
          >
            <svg className="fill-current" width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M15.5375 0.618744H11.6531C10.7594 0.618744 10.0031 1.37499 10.0031 2.26874V4.64062C10.0031 5.05312 10.3469 5.39687 10.7594 5.39687C11.1719 5.39687 11.55 5.05312 11.55 4.64062V2.23437C11.55 2.16562 11.5844 2.13124 11.6531 2.13124H15.5375C16.3625 2.13124 17.0156 2.78437 17.0156 3.60937V18.3562C17.0156 19.1812 16.3625 19.8344 15.5375 19.8344H11.6531C11.5844 19.8344 11.55 19.8 11.55 19.7312V17.3594C11.55 16.9469 11.2062 16.6031 10.7594 16.6031C10.3125 16.6031 10.0031 16.9469 10.0031 17.3594V19.7312C10.0031 20.625 10.7594 21.3812 11.6531 21.3812H15.5375C17.2219 21.3812 18.5625 20.0062 18.5625 18.3562V3.64374C18.5625 1.95937 17.1875 0.618744 15.5375 0.618744Z" fill="" /><path d="M6.05001 11.7563H12.2031C12.6156 11.7563 12.9594 11.4125 12.9594 11C12.9594 10.5875 12.6156 10.2438 12.2031 10.2438H6.08439L8.21564 8.07813C8.52501 7.76875 8.52501 7.2875 8.21564 6.97812C7.90626 6.66875 7.42501 6.66875 7.11564 6.97812L3.67814 10.4844C3.36876 10.7938 3.36876 11.275 3.67814 11.5844L7.11564 15.0906C7.25314 15.2281 7.45939 15.3312 7.66564 15.3312C7.87189 15.3312 8.04376 15.2625 8.21564 15.125C8.52501 14.8156 8.52501 14.3344 8.21564 14.025L6.05001 11.7563Z" fill="" /></svg>
            Log Out
          </button>
        </div>
      )}

      {/* NOTIFICATIONS SUB-MENU */}
      {showNotifications && dropdownOpen && (
        <div
          className="absolute right-[calc(100%+12px)] mt-2.5 z-[1002] flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-slate-500 sm:w-80"
          style={{ top: notificationsTop }}
        >
          <div className="px-4.5 py-3 border-b border-stroke dark:border-strokedark">
            <h5 className="text-sm font-medium text-black dark:text-white">Notifications</h5>
          </div>
          {notifications.length ? (
            <ul className="flex max-h-80 flex-col overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex flex-col gap-2.5 border-b border-stroke px-4.5 py-3 hover:bg-gray-100 cursor-pointer dark:border-strokedark dark:hover:bg-slate-600"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="text-sm">
                      <span className={`block ${notification.seen ? "font-medium text-black dark:text-white" : "font-bold text-black dark:text-white"}`}>
                        {notification.title}
                      </span>
                      <span className={`block mt-1 ${notification.seen ? "text-gray-500 dark:text-gray-300" : "text-gray-700 dark:text-gray-200"}`}>
                        {notification.description}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-400">{notification.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4.5 py-5 text-sm text-gray-500 dark:text-gray-300">No notifications</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownUser;
