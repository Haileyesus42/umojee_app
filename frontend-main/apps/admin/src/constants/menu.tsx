import {
  Bell,
  Calendar,
  LucideHome,
  LucideUsers,
  Plane,
  RefreshCcw,
  School,
  ShieldCheck,
  UserCircle,
  Users
} from 'lucide-react';

export const menuItems = [
  {
    label: 'Dashboard',
    to: '/',
    pathname: '/',
    icon: <LucideHome width={18} height={18} />,
  },
  {
    label: 'Announcements',
    to: '/announcements',
    pathname: 'announcements',
    icon: <Bell width={18} height={18} />,
  },
  {
    label: 'Flights',
    to: '/flights',
    pathname: 'flights',
    icon: <Plane width={18} height={18} />,
  },
  {
    label: 'Bookings',
    to: '/bookings',
    pathname: 'bookings',
    icon: <Calendar width={18} height={18} />,
  },
  {
    label: 'Passengers',
    to: '/passengers',
    pathname: 'passengers',
    icon: <LucideUsers width={18} height={18} />,
  },
  {
    label: 'Staffs',
    to: '/staffs',
    pathname: 'staffs',
    icon: <UserCircle width={18} height={18} />,
  },
  {
    label: 'Refunds',
    to: '/refunds',
    pathname: 'refunds',
    icon: <RefreshCcw width={18} height={18} />,
  },
  {
    label: 'Agencies',
    to: '/agencies',
    pathname: 'agencies',
    icon: <School width={18} height={18} />,
  },
  {
    label: 'Agents',
    to: '/agents',
    pathname: 'agents',
    icon: <Users width={18} height={18} />,
  },
  {
    label: 'Tickets',
    to: '/tickets',
    pathname: 'tickets',
    icon: <ShieldCheck width={18} height={18} />,
  },
];
