import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Agenciees } from '../constants/interface/agencies';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  // Format the time
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const meridiem = hours < 12 ? 'AM' : 'PM';
  hours = hours % 12 || 12; // Convert to 12-hour format
  const formattedTime = `${hours}:${minutes} ${meridiem}`;

  // Format the date
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const formattedDate = date.toLocaleDateString('en-US', options);

  const shortDateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  };
  const shortDate = date.toLocaleDateString('en-US', shortDateOptions);

  return {
    time: formattedTime,
    date: formattedDate,
    shortDate,
  };
};

export function storeLocallyWithExpiry(
  key: string,
  data: any,
  ttl: number = 3600000,
) {
  const now = new Date().getTime();
  const item = {
    data,
    expiry: now + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export const getLocalStorageValue = (key: string) => {
  const itemStr = localStorage.getItem(key);

  if (!itemStr) {
    return null;
  }
  const item = JSON.parse(itemStr);
  const now = new Date().getTime();

  if (now > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return item.data;
};

export const removeLocalStorageValue = (key: string) => {
  const data = localStorage.removeItem(key);
};

export const getAgencyNameById = (id: string, agencies: Agenciees[]) => {
  const agency = agencies.find((agency) => agency._id === id);
  return agency ? agency.agencyName : '';
};

export const minutesToHoursAndMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
};