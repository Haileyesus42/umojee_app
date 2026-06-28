'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewAgenciesModal } from '../../hooks/use-view-agencies-modal';
import { Modal } from '../ui/modal';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  ArrowUp,
  CalendarCheck,
  PlaneTakeoff,
  Star,
  User2,
  UserSquare,
} from 'lucide-react';

// const url = process.env.NEXT_PUBLIC_FRONTEND_URL;

export const ViewAgenciesModal = () => {
  const viewAgenciesModal = useViewAgenciesModal();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <Modal
        title="Beharudin Agency"
        description={
          <>
            Addis Ababa, Ethiopia .{' '}
            <span style={{ color: '#39e662' }}>Active</span>
          </>
        }
        isOpen={viewAgenciesModal.isOpen}
        onClose={viewAgenciesModal.onClose}
        className="flex flex-col z-[101] w-full sm:w-[50%] h-full sm:h-[600px] mt-5 overflow-auto"
      >
        <div className="w-full dark:bg-boxdark">
          <Separator />
          <div className="p-5 mb-2">
            <div className="flex flex-col">
              <p className=" text-lg font-semibold text-black dark:text-white">
                Assets
              </p>
              <div className="sm:grid grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 space-y-0 px-4 py-1">
                    <CardTitle className="text-md font-medium text-[#505050] dark:text-slate-200">
                      Booked
                    </CardTitle>
                    <svg
                      className="fill-muted-foreground dark:text-slate-200"
                      width="18"
                      height="18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512"
                    >
                      <path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zM329 305c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-95 95-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L329 305z" />{' '}
                    </svg>
                  </CardHeader>
                  <CardContent className="py-1">
                    <p className="text-xs text-muted-foreground flex items-center space-x-2">
                      <span className="text-lg flex items-center text-[#505050] dark:text-slate-200">
                        28
                      </span>
                    </p>
                  </CardContent>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 space-y-0 px-4 py-1">
                    <CardTitle className="text-md font-medium text-[#505050] dark:text-slate-200">
                      Agents
                    </CardTitle>
                    <svg
                      className="fill-muted-foreground dark:text-slate-200"
                      width="18"
                      height="18"
                      viewBox="0 0 640 512"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352H378.7C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7H154.7c-14.7 0-26.7-11.9-26.7-26.7z" />
                    </svg>
                  </CardHeader>
                  <CardContent className="py-1">
                    <p className="text-xs text-muted-foreground flex items-center space-x-2">
                      <span className="text-lg flex items-center text-[#505050] dark:text-slate-200">
                        180
                      </span>
                    </p>
                  </CardContent>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 space-y-0 px-4 py-1">
                    <CardTitle className="text-md font-medium text-[#505050] dark:text-slate-200">
                      Rating
                    </CardTitle>
                    {/* <Star className="dark:text-slate-200" /> */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="fill-muted-foreground dark:text-slate-200"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </CardHeader>
                  <CardContent className="py-1">
                    <p className="text-xs text-muted-foreground flex items-center space-x-2">
                      <span className="text-lg flex items-center text-[#505050] dark:text-slate-200">
                        4.5
                      </span>
                    </p>
                  </CardContent>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 mb-2">
            <div className="flex flex-col">
              <p className=" text-lg font-semibold text-black dark:text-white">
                Today
              </p>
              <div className="sm:grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 space-y-0 px-4 py-1">
                    <CardTitle className="text-md font-medium text-[#505050] dark:text-slate-200">
                      Booked
                    </CardTitle>
                    <svg
                      className="fill-muted-foreground dark:text-slate-200"
                      width="18"
                      height="18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512"
                    >
                      <path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zM329 305c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-95 95-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L329 305z" />{' '}
                    </svg>
                  </CardHeader>
                  <CardContent className="py-1">
                    <p className="text-xs text-muted-foreground flex items-center space-x-2">
                      <span className="text-lg flex items-center text-[#505050] dark:text-slate-200">
                        28
                      </span>
                    </p>
                  </CardContent>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 space-y-0 px-4 py-1">
                    <CardTitle className="text-md font-medium text-[#505050] dark:text-slate-200">
                      Agents
                    </CardTitle>
                    <svg
                      className="fill-muted-foreground dark:text-slate-200"
                      width="18"
                      height="18"
                      viewBox="0 0 640 512"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352H378.7C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7H154.7c-14.7 0-26.7-11.9-26.7-26.7z" />
                    </svg>
                  </CardHeader>
                  <CardContent className="py-1">
                    <p className="text-xs text-muted-foreground flex items-center space-x-2">
                      <span className="text-lg flex items-center text-[#505050] dark:text-slate-200">
                        180
                      </span>
                    </p>
                  </CardContent>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 mb-2">
            <div className="flex flex-col">
              <p className=" text-lg font-semibold text-black dark:text-white">
                Testimonials
              </p>
              <div className="flex sm:grid grid-cols-2 gap-4">
                <div className="flex flex-col rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800 p-3">
                  <CardTitle className="py-1">
                    <p className="text-sm text-muted-foreground flex items-center">
                      "Adipisicing tempor id irure anim est non ad incididunt
                      esse. Adipisicing tempor id irure anim est non ad
                      incididunt esse."
                    </p>
                  </CardTitle>
                  <CardContent className="py-1 text-lg font-medium text-[#505050] dark:text-slate-200 text-right">
                    Beharudin Musa
                  </CardContent>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow border-0 dark:bg-slate-800 p-3">
                  <CardTitle className="py-1">
                    <p className="text-sm text-muted-foreground flex items-center">
                      "Adipisicing tempor id irure anim est non ad incididunt
                      esse. Adipisicing tempor id irure anim est non ad
                      incididunt esse."
                    </p>
                  </CardTitle>
                  <CardContent className="py-1 text-lg font-medium text-[#505050] dark:text-slate-200 text-right">
                    Vipin
                  </CardContent>
                </div>
              </div>
            </div>
          </div>
            <div className="flex flex-col">
              <p className=" text-lg font-semibold text-black dark:text-white">
                Contacts
              </p>
              <div className="flex justify-center grid md:grid-cols-2 md:gap-x-24 px-2.5 py-3 text-muted-foreground">
                <div className="flex py-2">
                  <p className="dark:text-white font-medium px-2">Email:</p>
                  <p className="dark:text-white font-medium">bahar@gmail.com</p>
                </div>
                <div className="flex py-2">
                  <p className="dark:text-white font-medium px-2">Phone:</p>
                  <p className="dark:text-white font-medium">+251912000000</p>
                </div>
                <div className="flex py-2">
                  <p className="dark:text-white font-medium px-2">Member:</p>
                  <p className="dark:text-white font-medium">Since Jun, 2017</p>
                </div>
              </div>
            </div>
        </div>
      </Modal>
    </div>
  );
};
