import React, { ReactNode, useState } from "react";
import ChatBot from "../components/chatbot/ChatBotMain";
import Footer from "../pages/landing/Footer";
import Header from "../pages/Header/index";
import Sidebar from "../pages/Sidebar/index";

const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dark:bg-slate-900 dark:text-bodydark bg-slate-100">
      {/* <!-- ===== Page Wrapper Start ===== --> */}
      <div className=" flex h-screen overflow-hidden">
        {/* <!-- ===== Sidebar Start ===== --> */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* <!-- ===== Sidebar End ===== --> */}

        {/* <!-- ===== Content Area Start ===== --> */}
        <div className="absolute flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden w-screen h-screen">
          <main>
            {/* <!-- ===== Header Start ===== --> */}
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            {/* <!-- ===== Header End ===== --> */}

            {/* <!-- ===== Main Content Start ===== --> */}
            <div className="mx-auto max-w-screen">{children}</div>
          </main>
          {/* <!-- ===== Main Content End ===== --> */}
          <Footer />
        </div>
        {/* <!-- ===== Content Area End ===== --> */}
      </div>
      {/* <!-- ===== Page Wrapper End ===== --> */}

      {/* ChatBot */}
      <div className="fixed z-[999] right-3 bottom-3 sm:right-5 sm:bottom-6 lg:bottom-14 lg:right-16">
        <ChatBot />
      </div>
    </div>
  );
};

export default DefaultLayout;
